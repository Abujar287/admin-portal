import { AgentUser, DateFilterType, OrderItem, FollowupHistoryItem } from '../types';
import { INITIAL_AGENTS, INITIAL_ORDERS } from '../data/mockOrders';
import * as XLSX from 'xlsx';

export const DEFAULT_SCRIPT_URL =
  (import.meta.env?.VITE_GOOGLE_SCRIPT_URL as string) ||
  'https://script.google.com/macros/s/AKfycbznJBoaggkUhg0ztkcmJpEyeaiuJRVRJX7oItiIgzWqhNPkYIbG3zjnEe2Hn1voDFFg/exec';

const STORAGE_KEYS = {
  ORDERS: 'agent_portal_orders_v3',
  AGENTS: 'agentUsers_v3',
  TEAMS: 'agent_portal_teams_v3',
  SCRIPT_URL: 'agent_portal_script_url',
  LAST_SYNC: 'agent_portal_last_sync',
  FOLLOWUP_HISTORY: 'agent_portal_followup_history_v3'
};

export interface SyncStatus {
  lastSyncTime: string | null;
  source: 'google_sheets' | 'local_storage';
  totalOrders: number;
  error?: string;
  isLive: boolean;
}

let memoryOrders: OrderItem[] | null = null;

// IndexedDB storage for full 5,000+ orders cache
const IDB_NAME = 'admin_portal_db_v1';
const IDB_STORE = 'orders_store';

function openOrdersDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbSaveOrders(orders: OrderItem[]): Promise<void> {
  try {
    const db = await openOrdersDb();
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(orders, 'cached_orders');
  } catch (e) {
    console.warn('idbSaveOrders error:', e);
  }
}

async function idbGetOrders(): Promise<OrderItem[] | null> {
  try {
    const db = await openOrdersDb();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get('cached_orders');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export class OrderService {
  static getScriptUrl(): string {
    const saved = localStorage.getItem(STORAGE_KEYS.SCRIPT_URL);
    if (!saved) {
      localStorage.setItem(STORAGE_KEYS.SCRIPT_URL, DEFAULT_SCRIPT_URL);
      return DEFAULT_SCRIPT_URL;
    }
    return saved;
  }

  static setScriptUrl(url: string): void {
    localStorage.setItem(STORAGE_KEYS.SCRIPT_URL, url.trim());
  }

  static async fetchSheetTabsAndOrders(scriptUrl?: string): Promise<{ tabs: string[]; orders: OrderItem[]; source: 'google_sheets' | 'local_storage'; error?: string }> {
    const url = scriptUrl || this.getScriptUrl();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const res = await fetch(`/api/fetch-orders?url=${encodeURIComponent(url || DEFAULT_SCRIPT_URL)}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json, text/csv, */*' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const jsonRes = await res.json();
      if (!jsonRes.success || jsonRes.error) {
        throw new Error(jsonRes.error || `HTTP ${res.status}`);
      }
      const data = jsonRes.data;

      const tabs: string[] = Array.isArray(jsonRes.tabs) && jsonRes.tabs.length > 0
        ? jsonRes.tabs
        : ['orders', 'Sheet5', 'Followup'];

      let rawOrders = data;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        if (Array.isArray(data.orders)) rawOrders = data.orders;
        else if (Array.isArray(data.rows)) rawOrders = data.rows;
        else if (Array.isArray(data.data)) rawOrders = data.data;
        else if (Array.isArray(data.values)) rawOrders = data.values;
      }

      const parsed = this.parseGoogleSheetRows(rawOrders);
      if (parsed.length > 0) {
        this.saveLocalOrders(parsed);
        try {
          this.syncAgentsFromOrders(parsed);
        } catch {}
      }
      const local = await this.getLocalOrders();
      return { tabs, orders: parsed.length > 0 ? parsed : local, source: 'google_sheets' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { tabs: ['orders', 'Sheet5', 'Followup'], orders: await this.getLocalOrders(), source: 'local_storage', error: msg };
    }
  }

  private static resolveAgentName(aId: string, sheetNm?: string): string {
    if (sheetNm !== undefined && sheetNm !== null) {
      return String(sheetNm).trim();
    }
    return '';
  }

  static getAgents(): AgentUser[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.AGENTS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    localStorage.setItem(STORAGE_KEYS.AGENTS, JSON.stringify(INITIAL_AGENTS));
    return INITIAL_AGENTS;
  }

  static saveAgents(agents: AgentUser[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.AGENTS, JSON.stringify(agents));
    } catch (e) {
      console.warn('LocalStorage quota limit reached for agents:', e);
    }
  }

  static getTeams(): { name: string; teamLeaderName?: string; teamLeaderId?: string }[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TEAMS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    const defaultTeams = [
      { name: 'Acquisition', teamLeaderName: 'Manager (Admin)', teamLeaderId: 'manager' },
      { name: 'Sales', teamLeaderName: 'Manager (Admin)', teamLeaderId: 'manager' },
      { name: 'Support', teamLeaderName: 'Manager (Admin)', teamLeaderId: 'manager' }
    ];
    localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(defaultTeams));
    return defaultTeams;
  }

  static saveTeams(teams: { name: string; teamLeaderName?: string; teamLeaderId?: string }[]): void {
    localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(teams));
  }

  static async getLocalOrders(): Promise<OrderItem[]> {
    if (memoryOrders && memoryOrders.length > 0) {
      return memoryOrders;
    }
    const idbOrders = await idbGetOrders();
    if (idbOrders && idbOrders.length > 0) {
      memoryOrders = idbOrders;
      return idbOrders;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ORDERS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          memoryOrders = parsed;
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return INITIAL_ORDERS;
  }

  static saveLocalOrders(orders: OrderItem[]): void {
    memoryOrders = orders;
    idbSaveOrders(orders);
    try {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders.slice(0, 100)));
    } catch (e) {
      console.warn('LocalStorage quota limit reached (safely stored in IndexedDB):', e);
    }
  }

  static resetOrdersToMock(): OrderItem[] {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(INITIAL_ORDERS));
    return INITIAL_ORDERS;
  }

  /**
   * Fetches orders directly from Google Sheet orders tab via server proxy
   */
  static async fetchOrders(forceRefresh = false): Promise<{ orders: OrderItem[]; source: 'google_sheets' | 'local_storage'; error?: string }> {
    const scriptUrl = this.getScriptUrl();
    const localOrders = await this.getLocalOrders();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const res = await fetch(`/api/fetch-orders?url=${encodeURIComponent(scriptUrl || DEFAULT_SCRIPT_URL)}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const jsonRes = await res.json();
      let rawData = jsonRes.data;
      if (rawData && typeof rawData === 'object' && !Array.isArray(rawData)) {
        if (Array.isArray(rawData.orders)) rawData = rawData.orders;
        else if (Array.isArray(rawData.rows)) rawData = rawData.rows;
        else if (Array.isArray(rawData.data)) rawData = rawData.data;
        else if (Array.isArray(rawData.values)) rawData = rawData.values;
      }

      if (Array.isArray(rawData) && rawData.length > 0) {
        const parsed = this.parseGoogleSheetRows(rawData);
        if (parsed.length > 0) {
          // Sync agents dynamically discovered in the Google Sheet
          try {
            this.syncAgentsFromOrders(parsed);
          } catch (e) {
            console.warn('Agent sync skipped:', e);
          }

          // Strictly use parsed sheet orders as source of truth
          this.saveLocalOrders(parsed);
          try {
            localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
          } catch (e) {}

          return { orders: parsed, source: 'google_sheets' };
        }
      }
      return { orders: localOrders, source: 'local_storage' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('Google Sheet fetch failed (checking IndexedDB cache):', msg);
      const idbOrders = await idbGetOrders();
      if (idbOrders && idbOrders.length > 0) {
        memoryOrders = idbOrders;
        return { orders: idbOrders, source: 'local_storage', error: msg };
      }
      return { orders: localOrders, source: 'local_storage', error: msg };
    }
  }

  /**
   * Automatically extracts and updates agents based on orders present in the Google Sheet.
   */
  static syncAgentsFromOrders(orders: OrderItem[]): void {
    const currentAgents = this.getAgents();
    const agentMap = new Map<string, AgentUser>();

    // Seed existing
    currentAgents.forEach(a => agentMap.set(a.user.toLowerCase(), a));

    // Extract from sheet orders
    orders.forEach(o => {
      const cleanId = String(o.agent_id || (o as any).agentId || '').trim();
      if (!cleanId) return;

      if (!agentMap.has(cleanId.toLowerCase())) {
        agentMap.set(cleanId.toLowerCase(), {
          user: cleanId,
          pass: cleanId, // default pass same as user id
          name: o.agent_name || (o as any).agentName || `Agent ${cleanId}`,
          team: o.order_channel || (o as any).orderChannel || 'Acquisition',
          email: `${cleanId.toLowerCase()}@portal.local`
        });
      }
    });

    const updated = Array.from(agentMap.values());
    this.saveAgents(updated);
  }

  /**
   * Parses 2D array from Google Apps Script doGet(e):
   * var rows = sheet.getDataRange().getValues();
   */
  private static parseGoogleSheetRows(data: any): OrderItem[] {
    if (!data) return [];

    let rowsData = data;
    if (typeof data === 'string') {
      try {
        const workbook = XLSX.read(data, { type: 'string' });
        let targetSheetName = workbook.SheetNames[0];
        const foundOrdersSheet = workbook.SheetNames.find(name => {
          const lower = name.toLowerCase().trim();
          return lower === 'orders' || lower === 'order';
        });
        if (foundOrdersSheet) {
          targetSheetName = foundOrdersSheet;
        }
        const worksheet = workbook.Sheets[targetSheetName];
        rowsData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      } catch {
        rowsData = data.split('\n').map((r: string) => r.split(','));
      }
    }

    // If data is an array of JSON objects (e.g. [{ order_id: '1', ... }])
    if (Array.isArray(rowsData) && rowsData.length > 0 && typeof rowsData[0] === 'object' && !Array.isArray(rowsData[0])) {
      return rowsData.map((o: any, i: number) => {
        const oId = String(o.order_id || o.orderId || o.id || (i + 1));
        const cId = String(o.customer_id || o.customerId || '1');
        const cMobile = String(o.customer_mobile || o.customerContact || o.phone || o.mobile || '-');
        const cName = String(o.customer_name || o.customerName || o.customer || 'Customer');
        const gen = String(o.gender || 'Other');
        const crDt = String(o.create_date || o.createDate || o.createdAt || new Date().toISOString().replace('T', ' ').slice(0, 19));
        const ch = String(o.order_channel || o.orderChannel || o.channel || 'Website');
        const aId = String(o.agent_id || o.agentId || o.agent || '1');
        const aName = String(o.agent_name || o.agentName || `Agent ${aId}`);
        const pCat = String(o.product_category || o.productCategory || o.category || 'Electronics');
        const pNm = String(o.product_name || o.productName || o.product || 'Product Item');
        const ct = String(o.city || 'Dhaka');
        const dArea = String(o.delivery_area || o.deliveryArea || o.area || 'Gulshan');
        const addr = String(o.address_details || o.addressDetails || o.address || '-');
        const scDt = String(o.schedule_date || o.scheduleDate || '');
        const scTm = String(o.schedule_time || o.scheduledTime || o.scheduleTime || '11AM to 12PM');
        const oVal = Number(o.order_value ?? o.orderValue ?? o.amount ?? o.price ?? 0);
        const oSt = String(o.order_status || o.orderStatus || o.status || 'Pending');
        const foSt = String(o.followup_status || o.followupStatus || o.followup || 'Pending');
        const pr = Number(o.profit ?? Math.round(oVal * 0.20));

        return {
          order_id: oId,
          id: oId,
          customer_id: cId,
          customerId: cId,
          customer_mobile: cMobile,
          customerContact: cMobile,
          customer_name: cName,
          customerName: cName,
          gender: gen,
          create_date: crDt,
          createDate: crDt,
          order_channel: ch,
          orderChannel: ch,
          agent_id: aId,
          agentId: aId,
          agent_name: aName,
          agentName: aName,
          product_category: pCat,
          productCategory: pCat,
          product_name: pNm,
          productName: pNm,
          city: ct,
          delivery_area: dArea,
          deliveryArea: dArea,
          address_details: addr,
          addressDetails: addr,
          schedule_date: scDt,
          scheduleDate: scDt,
          schedule_time: scTm,
          scheduledTime: scTm,
          order_value: oVal,
          orderValue: oVal,
          order_status: oSt,
          orderStatus: oSt,
          followup_status: foSt,
          followupStatus: foSt,
          profit: pr,
          delivered_date: String(o.delivered_date || o.deliveredDate || ''),
          deliveredDate: String(o.delivered_date || o.deliveredDate || ''),
          cancelled_date: String(o.cancelled_date || o.cancelledDate || ''),
          cancelledDate: String(o.cancelled_date || o.cancelledDate || '')
        };
      });
    }

    if (!Array.isArray(rowsData) || rowsData.length === 0) return [];

    let hasHeader = false;
    const firstRow = rowsData[0].map(h => String(h || '').trim().toLowerCase());

    if (firstRow.some(col => col.includes('order') || col.includes('customer') || col.includes('agent') || col.includes('date'))) {
      hasHeader = true;
    }

    const headers = hasHeader ? firstRow : [];
    const rows = hasHeader ? rowsData.slice(1) : rowsData;

    const findCol = (...candidates: string[]): number => {
      for (const candidate of candidates) {
        const normCand = candidate.toLowerCase().replace(/[\s_-]+/g, '');
        const idx = headers.findIndex((h) => {
          const normH = String(h || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
          return normH === normCand || String(h || '').trim().toLowerCase() === candidate.toLowerCase();
        });
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const idxOrder    = findCol('order_id', 'order id', 'orderid', 'id', 'order #');
    const idxCustId   = findCol('customer_id', 'customer id', 'customerid', 'cust id');
    const idxCustCont = findCol('customer_mobile', 'customer contact', 'customer phone', 'mobile', 'phone', 'contact');
    const idxCustName = findCol('customer_name', 'customer name', 'customer', 'name');
    const idxGender   = findCol('gender', 'sex');
    const idxCreateDt = findCol('create_date', 'create date', 'created at', 'created_at', 'order date', 'date');
    const idxChannel  = findCol('order_channel', 'order channel', 'channel', 'team');
    const idxAgentId  = findCol('agent_id', 'agent id', 'agentid', 'agent code', 'agent user', 'agent');
    const idxAgentNm  = findCol('agent_name', 'agent name', 'agentname');
    const idxProdCat  = findCol('product_category', 'product category', 'category');
    const idxProdNm   = findCol('product_name', 'product name', 'product', 'item');
    const idxCity     = findCol('city', 'district');
    const idxArea     = findCol('delivery_area', 'delivery area', 'area', 'zone');
    const idxAddress  = findCol('address_details', 'address details', 'address');
    const idxSchedDt  = findCol('schedule_date', 'schedule date', 'delivery date');
    const idxSchedTm  = findCol('schedule_time', 'schedule time', 'time slot', 'delivery time');
    const idxValue    = findCol('order_value', 'order value', 'amount', 'total', 'price', 'value');
    const idxStatus   = findCol('order_status', 'order status', 'status');
    const idxFollowup = findCol('followup_status', 'followup status', 'followup');
    const idxProfit   = findCol('profit', 'net profit', 'margin');
    const idxDelivDt  = findCol('delivered_date', 'delivered date');
    const idxCancDt   = findCol('cancelled_date', 'cancelled date');
    const idxFollowDt = findCol('followup_date', 'followup date');

    return rows
      .filter((row, rowIndex) => {
        if (!row || !Array.isArray(row) || row.length === 0) return false;
        const hasContent = row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== '');
        if (!hasContent) return false;

        const targetIdx = idxOrder !== -1 ? idxOrder : 0;
        const rawId = row[targetIdx] !== undefined && row[targetIdx] !== null
          ? String(row[targetIdx]).trim()
          : '';
        const lower = rawId.toLowerCase();
        if (lower === 'order id' || lower === 'order_id' || lower.includes('total') || (rowIndex === 0 && (lower.includes('name') || lower.includes('customer')))) {
          return false;
        }
        return true;
      })
      .map((row, index) => {
        const valOrEmpty = (idx: number, fallback = '', positionalIdx = -1) => {
          if (idx !== -1 && row[idx] !== undefined && row[idx] !== null) {
            const s = String(row[idx]).trim();
            if (s !== '') return s;
          }
          if (positionalIdx !== -1 && row[positionalIdx] !== undefined && row[positionalIdx] !== null) {
            const s = String(row[positionalIdx]).trim();
            if (s !== '') return s;
          }
          return fallback;
        };

        const numOrZero = (idx: number, positionalIdx = -1) => {
          const raw = valOrEmpty(idx, '', positionalIdx);
          if (!raw) return 0;
          const val = parseFloat(raw.replace(/[^0-9.-]+/g, ''));
          return isNaN(val) ? 0 : val;
        };

        const rawOrderId = valOrEmpty(idxOrder, '', 0);
        const orderId = rawOrderId && rawOrderId !== '-' && rawOrderId.toLowerCase() !== 'null' && rawOrderId.toLowerCase() !== 'undefined'
          ? rawOrderId
          : String(1001 + index);
        const orderVal = numOrZero(idxValue, 16);
        const profitVal = idxProfit !== -1 && row[idxProfit] !== undefined && row[idxProfit] !== ''
          ? numOrZero(idxProfit, 19)
          : Math.round(orderVal * 0.20);

        const cId = valOrEmpty(idxCustId, '1', 1);
        const cMobile = valOrEmpty(idxCustCont, '-', 2);
        const cName = valOrEmpty(idxCustName, 'Customer', 3);
        const gen = valOrEmpty(idxGender, 'Other', 4);
        const crDt = valOrEmpty(idxCreateDt, new Date().toISOString().replace('T', ' ').slice(0, 19), 5);
        const ch = valOrEmpty(idxChannel, 'Acquisition', 6);
        const aId = valOrEmpty(idxAgentId, '', 7);
        const rawANm = valOrEmpty(idxAgentNm, '', 8);
        const aNm = this.resolveAgentName(aId, rawANm);
        const pCat = valOrEmpty(idxProdCat, 'Electronics', 9);
        const pNm = valOrEmpty(idxProdNm, 'Product Item', 10);
        const ct = valOrEmpty(idxCity, 'Dhaka', 11);
        const dArea = valOrEmpty(idxArea, 'Gulshan', 12);
        const addr = valOrEmpty(idxAddress, '-', 13);
        const scDt = valOrEmpty(idxSchedDt, new Date().toISOString().split('T')[0], 14);
        const scTm = valOrEmpty(idxSchedTm, '11AM to 12PM', 15);
        const oSt = valOrEmpty(idxStatus, 'Pending', 17);
        const foSt = valOrEmpty(idxFollowup, 'Pending', 18);
        const delivDt = valOrEmpty(idxDelivDt, '', 20);
        const cancDt = valOrEmpty(idxCancDt, '', 21);
        const followDt = valOrEmpty(idxFollowDt, '', 22);

        return {
          order_id: orderId,
          id: orderId,
          customer_id: cId,
          customerId: cId,
          customer_mobile: cMobile,
          customerContact: cMobile,
          customer_name: cName,
          customerName: cName,
          gender: gen,
          create_date: crDt,
          createDate: crDt,
          order_channel: ch,
          orderChannel: ch,
          agent_id: aId,
          agentId: aId,
          agent_name: aNm,
          agentName: aNm,
          product_category: pCat,
          productCategory: pCat,
          product_name: pNm,
          productName: pNm,
          city: ct,
          delivery_area: dArea,
          deliveryArea: dArea,
          address_details: addr,
          addressDetails: addr,
          schedule_date: scDt,
          scheduleDate: scDt,
          schedule_time: scTm,
          scheduledTime: scTm,
          order_value: orderVal,
          orderValue: orderVal,
          order_status: oSt,
          orderStatus: oSt,
          followup_status: foSt,
          followupStatus: foSt,
          profit: profitVal,
          delivered_date: delivDt,
          deliveredDate: delivDt,
          cancelled_date: cancDt,
          cancelledDate: cancDt,
          followup_date: followDt,
          followupDate: followDt
        };
      });
  }

  /**
   * Creates a new order.
   * Dispatches to Google Apps Script doPost(e) and saves locally.
   */
  static async createOrder(
    newOrder: any
  ): Promise<{ success: boolean; order: OrderItem; remoteSynced: boolean }> {
    const localOrders = await this.getLocalOrders();

    let nextNum = 1;
    if (localOrders.length > 0) {
      const ids = localOrders.map(o => Number(o.order_id || o.id)).filter(n => !isNaN(n));
      if (ids.length > 0) {
        nextNum = Math.max(...ids) + 1;
      } else {
        nextNum = 1 + localOrders.length;
      }
    }
    const orderId = String(newOrder.order_id || newOrder.id || nextNum);

    // Customer Id management
    const customerMap: Record<string, string> = JSON.parse(localStorage.getItem('customer_id_map') || '{}');
    const contactPhone = String(newOrder.customer_mobile || newOrder.customerContact || '').trim();
    let customerId = String(newOrder.customer_id || newOrder.customerId || '');
    if (!customerId && contactPhone) {
      customerId = customerMap[contactPhone] || '';
      if (!customerId) {
        const existingIds = Object.values(customerMap).map(Number).filter(n => !isNaN(n));
        const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
        customerId = String(maxId + 1);
        customerMap[contactPhone] = customerId;
        localStorage.setItem('customer_id_map', JSON.stringify(customerMap));
      }
    }
    if (!customerId) customerId = '1';

    const numOrderValue = Number(newOrder.order_value ?? newOrder.orderValue ?? 0);
    const calculatedProfit = newOrder.profit !== undefined ? Number(newOrder.profit) : Math.round(numOrderValue * 0.20);
    const cName = String(newOrder.customer_name || newOrder.customerName || 'Customer');
    const gen = String(newOrder.gender || 'Other');
    const crDate = String(newOrder.create_date || newOrder.createDate || new Date().toISOString().replace('T', ' ').slice(0, 19));
    const ch = String(newOrder.order_channel || newOrder.orderChannel || 'Acquisition');
    const agId = String(newOrder.agent_id || newOrder.agentId || '1');
    const rawAgNm = String(newOrder.agent_name || newOrder.agentName || '');
    const agNm = this.resolveAgentName(agId, rawAgNm);
    const pCat = String(newOrder.product_category || newOrder.productCategory || 'Electronics');
    const pNm = String(newOrder.product_name || newOrder.productName || 'Product Item');
    const ct = String(newOrder.city || 'Dhaka');
    const dArea = String(newOrder.delivery_area || newOrder.deliveryArea || 'Gulshan');
    const addr = String(newOrder.address_details || newOrder.addressDetails || '-');
    const scDate = String(newOrder.schedule_date || newOrder.scheduleDate || new Date().toISOString().split('T')[0]);
    const scTime = String(newOrder.schedule_time || newOrder.scheduledTime || '11AM to 12PM');
    const ordStatus = String(newOrder.order_status || newOrder.orderStatus || 'Pending');
    const folStatus = String(newOrder.followup_status || newOrder.followupStatus || 'Pending');

    let fullOrder: OrderItem = {
      order_id: orderId,
      id: orderId,
      customer_id: customerId,
      customerId: customerId,
      customer_mobile: contactPhone || '-',
      customerContact: contactPhone || '-',
      customer_name: cName,
      customerName: cName,
      gender: gen,
      create_date: crDate,
      createDate: crDate,
      order_channel: ch,
      orderChannel: ch,
      agent_id: agId,
      agentId: agId,
      agent_name: agNm,
      agentName: agNm,
      product_category: pCat,
      productCategory: pCat,
      product_name: pNm,
      productName: pNm,
      city: ct,
      delivery_area: dArea,
      deliveryArea: dArea,
      address_details: addr,
      addressDetails: addr,
      schedule_date: scDate,
      scheduleDate: scDate,
      schedule_time: scTime,
      scheduledTime: scTime,
      order_value: numOrderValue,
      orderValue: numOrderValue,
      order_status: ordStatus,
      orderStatus: ordStatus,
      followup_status: folStatus,
      followupStatus: folStatus,
      profit: calculatedProfit,
      delivered_date: '',
      deliveredDate: '',
      cancelled_date: '',
      cancelledDate: ''
    };

    // Save locally immediately
    const updated = [fullOrder, ...localOrders];
    this.saveLocalOrders(updated);

    // Dispatch to Google Apps Script doPost(e)
    let remoteSynced = false;
    const scriptUrl = this.getScriptUrl();

    if (scriptUrl) {
      try {
        const bodyData = {
          url: scriptUrl,
          order_id: fullOrder.order_id,
          customer_id: fullOrder.customer_id,
          customer_mobile: fullOrder.customer_mobile,
          customer_name: fullOrder.customer_name,
          gender: fullOrder.gender,
          create_date: fullOrder.create_date,
          order_channel: fullOrder.order_channel,
          agent_id: fullOrder.agent_id,
          agent_name: fullOrder.agent_name,
          product_category: fullOrder.product_category,
          product_name: fullOrder.product_name,
          city: fullOrder.city,
          delivery_area: fullOrder.delivery_area,
          address_details: fullOrder.address_details,
          schedule_date: fullOrder.schedule_date,
          schedule_time: fullOrder.schedule_time,
          order_value: String(fullOrder.order_value),
          order_status: fullOrder.order_status,
          followup_status: fullOrder.followup_status,
          profit: String(fullOrder.profit),
          delivered_date: fullOrder.delivered_date || '',
          cancelled_date: fullOrder.cancelled_date || ''
        };

        await fetch('/api/proxy-script', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(bodyData)
        });
        remoteSynced = true;
      } catch (err) {
        console.warn('Google Apps Script doPost proxy error:', err);
      }
    }

    return {
      success: true,
      order: fullOrder,
      remoteSynced
    };
  }

  static getFollowupHistory(): FollowupHistoryItem[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.FOLLOWUP_HISTORY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    const defaultHistory: FollowupHistoryItem[] = [
      {
        id: '1',
        followupId: 1,
        orderId: '1001',
        customerName: 'Rahim Ahmed',
        customerContact: '01712345678',
        previousStatus: 'Pending',
        newStatus: 'Confirmed',
        orderStatus: 'In Progress',
        orderValue: 1500,
        scheduleDate: new Date().toISOString().split('T')[0],
        scheduledTime: '11AM to 12PM',
        updatedBy: '1',
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        action: 'Status Change',
        notes: 'Customer confirmed delivery schedule.'
      },
      {
        id: '2',
        followupId: 2,
        orderId: '1002',
        customerName: 'Fatema Begum',
        customerContact: '01898765432',
        previousStatus: 'Confirmed',
        newStatus: 'Delivered',
        orderStatus: 'Delivered',
        orderValue: 2400,
        scheduleDate: new Date().toISOString().split('T')[0],
        scheduledTime: '2PM to 3PM',
        updatedBy: 'manager',
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        action: 'Status Change',
        notes: 'Order successfully delivered & paid.'
      }
    ];
    localStorage.setItem(STORAGE_KEYS.FOLLOWUP_HISTORY, JSON.stringify(defaultHistory));
    return defaultHistory;
  }

  static saveFollowupHistory(history: FollowupHistoryItem[]): void {
    localStorage.setItem(STORAGE_KEYS.FOLLOWUP_HISTORY, JSON.stringify(history));
  }

  static async updateOrderStatus(
    orderId: string,
    updates: Partial<OrderItem>,
    updatedBy: string = 'manager',
    notes: string = ''
  ): Promise<{ updatedOrders: OrderItem[]; historyItem?: FollowupHistoryItem; remoteSynced: boolean }> {
    console.log('Update Order Payload:', JSON.stringify(updates));
    const orders = (await this.getLocalOrders()) || [];
    const existingOrder = orders.find((ord) => String(ord.order_id || ord.id) === String(orderId));

    let finalOrderStatus = updates.order_status || updates.orderStatus || existingOrder?.order_status || existingOrder?.orderStatus || 'Pending';
    const finalFollowupStatus = updates.followup_status || updates.followupStatus;
    const currentTimestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const isCancelled = (finalFollowupStatus || '').toLowerCase() === 'cancelled';
    const isDelivered = (finalFollowupStatus || '').toLowerCase() === 'delivered';

    // Mutually exclusive dates for delivered, cancelled, and followup
    let newDeliveredDate = '';
    if (isDelivered) {
      newDeliveredDate = updates.delivered_date || updates.deliveredDate || currentTimestamp;
    }

    let newCancelledDate = '';
    if (isCancelled) {
      newCancelledDate = updates.cancelled_date || updates.cancelledDate || currentTimestamp;
    }

    let newFollowupDate = '';
    if (!isDelivered && !isCancelled && finalFollowupStatus) {
      newFollowupDate = updates.followup_date || updates.followupDate || currentTimestamp;
    }

    const updated = (orders || []).map((ord) => {
      if (String(ord.order_id || ord.id) === String(orderId)) {
        const orderVal = updates.order_value !== undefined 
          ? Number(updates.order_value) 
          : (updates.orderValue !== undefined ? Number(updates.orderValue) : Number(ord.order_value || ord.orderValue || 0));
        
        // Profit only when Delivered, else 0 / faka
        const profit = isDelivered 
          ? (updates.profit !== undefined && updates.profit !== null && String(updates.profit) !== ''
            ? Number(updates.profit) 
            : (ord.profit && Number(ord.profit) > 0 ? Number(ord.profit) : Math.round(orderVal * 0.20)))
          : 0;

        // Preserve schedule date & time if not explicitly provided in updates
        const schedDate = (updates.schedule_date !== undefined && updates.schedule_date !== null && String(updates.schedule_date).trim() !== '')
          ? String(updates.schedule_date)
          : ((updates.scheduleDate !== undefined && updates.scheduleDate !== null && String(updates.scheduleDate).trim() !== '')
            ? String(updates.scheduleDate)
            : (ord.schedule_date || ord.scheduleDate || ''));

        const schedTime = (updates.schedule_time !== undefined && updates.schedule_time !== null && String(updates.schedule_time).trim() !== '')
          ? String(updates.schedule_time)
          : ((updates.scheduledTime !== undefined && updates.scheduledTime !== null && String(updates.scheduledTime).trim() !== '')
            ? String(updates.scheduledTime)
            : (ord.schedule_time || ord.scheduledTime || ''));

        const fStatus = finalFollowupStatus || ord.followup_status || ord.followupStatus || 'Pending';

        return {
          ...ord,
          order_id: ord.order_id || ord.id,
          id: ord.order_id || ord.id,
          order_value: orderVal,
          orderValue: orderVal,
          profit: profit,
          order_status: isDelivered ? 'Delivered' : (isCancelled ? 'Cancelled' : 'Pending'),
          orderStatus: isDelivered ? 'Delivered' : (isCancelled ? 'Cancelled' : 'Pending'),
          followup_status: updates.followup_status || updates.followupStatus || ord.followup_status || ord.followupStatus || 'Pending',
          followupStatus: updates.followup_status || updates.followupStatus || ord.followup_status || ord.followupStatus || 'Pending',
          schedule_date: schedDate,
          scheduleDate: schedDate,
          schedule_time: schedTime,
          scheduledTime: schedTime,
          delivered_date: newDeliveredDate || (isDelivered ? '' : (ord.delivered_date || ord.deliveredDate || '')),
          deliveredDate: newDeliveredDate || (isDelivered ? '' : (ord.delivered_date || ord.deliveredDate || '')),
          cancelled_date: newCancelledDate || (isCancelled ? '' : (ord.cancelled_date || ord.cancelledDate || '')),
          cancelledDate: newCancelledDate || (isCancelled ? '' : (ord.cancelled_date || ord.cancelledDate || '')),
          followup_date: newFollowupDate || (isDelivered || isCancelled ? '' : (ord.followup_date || ord.followupDate || '')),
          followupDate: newFollowupDate || (isDelivered || isCancelled ? '' : (ord.followup_date || ord.followupDate || ''))
        };
      }
      return ord;
    });
    this.saveLocalOrders(updated);

    // Record Historical Log for Followup Sheet with sequential ID and detected Action
    let historyItem: FollowupHistoryItem | undefined;
    let actionStr = 'Follow-up Update';
    let nextFollowupId = 1;

    if (existingOrder) {
      const orderVal = updates.order_value !== undefined 
        ? Number(updates.order_value) 
        : (updates.orderValue !== undefined ? Number(updates.orderValue) : Number(existingOrder.order_value || existingOrder.orderValue || 0));
      const schedDate = updates.schedule_date !== undefined ? updates.schedule_date : (updates.scheduleDate !== undefined ? updates.scheduleDate : (existingOrder.schedule_date || existingOrder.scheduleDate || ''));
      const schedTime = updates.schedule_time !== undefined ? updates.schedule_time : (updates.scheduledTime !== undefined ? updates.scheduledTime : (existingOrder.schedule_time || existingOrder.scheduledTime || ''));

      const existingHistory = this.getFollowupHistory();
      nextFollowupId = existingHistory.length + 1;
      const nextId = String(nextFollowupId);

      // Detect changes to generate Action name
      const prevFo = existingOrder.followup_status || existingOrder.followupStatus || 'Pending';
      const statusChanged = finalFollowupStatus !== undefined && finalFollowupStatus !== prevFo;
      const prevVal = Number(existingOrder.order_value || existingOrder.orderValue || 0);
      const priceChanged = (updates.order_value !== undefined || updates.orderValue !== undefined) && orderVal !== prevVal;
      const profitChanged = updates.profit !== undefined && Number(updates.profit) !== Number(existingOrder.profit);
      const prevScDate = existingOrder.schedule_date || existingOrder.scheduleDate || '';
      const prevScTime = existingOrder.schedule_time || existingOrder.scheduledTime || '';
      const schedDateChanged = schedDate !== prevScDate;
      const schedTimeChanged = schedTime !== prevScTime;

      const changedParts: string[] = [];
      if (priceChanged) changedParts.push('price');
      if (profitChanged) changedParts.push('profit');
      if (schedDateChanged && schedTimeChanged) changedParts.push('schedule date & time');
      else if (schedDateChanged) changedParts.push('schedule');
      else if (schedTimeChanged) changedParts.push('schedule time');
      if (statusChanged) changedParts.push('status');

      if (changedParts.length === 0) {
        actionStr = 'Follow-up Update';
      } else if (changedParts.length === 1) {
        const p = changedParts[0];
        if (p === 'schedule') actionStr = 'Schedule Change';
        else if (p === 'schedule time') actionStr = 'Schedule Time Change';
        else if (p === 'status') actionStr = 'Status Change';
        else if (p === 'price') actionStr = 'Price Change';
        else if (p === 'profit') actionStr = 'Profit Add';
        else actionStr = `${p} Change`;
      } else {
        actionStr = `(${changedParts.join(', ')}) change`;
      }

      // Generate status change string capturing ALL changes
      const changeDescriptions: string[] = [];
      if (statusChanged) changeDescriptions.push(`${prevFo} -> ${finalFollowupStatus || prevFo}`);
      if (schedDateChanged) changeDescriptions.push(`Schedule Date updated to ${schedDate}`);
      if (schedTimeChanged) changeDescriptions.push(`Schedule Time updated to ${schedTime}`);
      if (priceChanged) changeDescriptions.push(`Price updated to ${orderVal}`);
      
      let statusChangeText = changeDescriptions.length > 0 ? changeDescriptions.map(d => `(${d})`).join(' ') : 'No Status Change';

      historyItem = {
        id: nextId,
        followupId: nextFollowupId,
        orderId: String(orderId),
        customerName: existingOrder.customer_name || existingOrder.customerName,
        customerContact: existingOrder.customer_mobile || existingOrder.customerContact,
        previousStatus: prevFo,
        newStatus: finalFollowupStatus || prevFo,
        orderStatus: finalOrderStatus,
        orderValue: orderVal,
        scheduleDate: schedDate,
        scheduledTime: schedTime,
        updatedBy: updatedBy || 'Manager',
        timestamp: currentTimestamp,
        action: actionStr,
        notes: notes || ''
      };

      this.saveFollowupHistory([historyItem, ...existingHistory]);
    }

    let remoteSynced = false;
    const scriptUrl = this.getScriptUrl();

    if (scriptUrl) {
      try {
        const prevFo = existingOrder?.followup_status || existingOrder?.followupStatus || 'Pending';
        const statusChanged = finalFollowupStatus !== undefined && finalFollowupStatus !== prevFo;
        const scDtToSync = updates.schedule_date !== undefined ? updates.schedule_date : updates.scheduleDate;
        const scTmToSync = updates.schedule_time !== undefined ? updates.schedule_time : updates.scheduledTime;
        const schedDateChanged = scDtToSync !== undefined && scDtToSync !== (existingOrder?.schedule_date || existingOrder?.scheduleDate || '');
        const schedTimeChanged = scTmToSync !== undefined && scTmToSync !== (existingOrder?.schedule_time || existingOrder?.scheduledTime || '');
        const schedDate = scDtToSync || (existingOrder?.schedule_date || existingOrder?.scheduleDate || '');
        const schedTime = scTmToSync || (existingOrder?.schedule_time || existingOrder?.scheduledTime || '');
        const orderValToSync = updates.order_value !== undefined ? updates.order_value : updates.orderValue;
        const priceChanged = orderValToSync !== undefined && Number(orderValToSync) !== Number(existingOrder?.order_value || existingOrder?.orderValue || 0);

        const prevSchedDate = existingOrder?.schedule_date || existingOrder?.scheduleDate || '';
        const prevSchedTime = existingOrder?.schedule_time || existingOrder?.scheduledTime || '';
        const prevOrderVal = Number(existingOrder?.order_value || existingOrder?.orderValue || 0);

        const changeDescriptions: string[] = [];
        if (statusChanged) changeDescriptions.push(`Status: ${prevFo} -> ${finalFollowupStatus || prevFo}`);
        if (schedDateChanged) changeDescriptions.push(`Schedule Date: ${prevSchedDate} -> ${schedDate}`);
        if (schedTimeChanged) changeDescriptions.push(`Schedule Time: ${prevSchedTime} -> ${schedTime}`);
        if (priceChanged) changeDescriptions.push(`Price: ${prevOrderVal} -> ${orderValToSync}`);
        
        const statusChangeText = changeDescriptions.length > 0 ? changeDescriptions.map(d => `(${d})`).join(' ') : 'No Status Change';

        const finalProfitParam = isCancelled ? 0 : (updates.profit !== undefined ? updates.profit : (orderValToSync !== undefined ? Number(orderValToSync) * 0.20 : undefined));

        const bodyData: Record<string, string> = {
          url: scriptUrl,
          action: 'updateFollowup',
          'Log Timestamp': currentTimestamp,
          'followup_id': String(nextFollowupId),
          'order_id': String(orderId),
          'customer_name': existingOrder.customer_name || existingOrder.customerName || '',
          'customer_mobile': existingOrder.customer_mobile || existingOrder.customerContact || '',
          'previous_followup_status': prevFo,
          'order_value': orderValToSync !== undefined ? String(orderValToSync) : String(existingOrder.order_value || existingOrder.orderValue || 0),
          'schedule_date': schedDate,
          'schedule_time': schedTime,
          'updated_by': updatedBy,
          'status_change': statusChangeText,
          'change_description': actionStr,
          'notes': notes
        };
        if (updates.order_status || updates.orderStatus) {
          bodyData['order_status'] = updates.order_status || updates.orderStatus || '';
        }
        if (updates.followup_status || updates.followupStatus) {
          bodyData['new_followup_status'] = updates.followup_status || updates.followupStatus || '';
        }

        await fetch('/api/proxy-script', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(bodyData)
        });
        remoteSynced = true;
      } catch (err) {
        console.warn('Google Apps Script status update proxy error:', err);
      }
    }

    return { updatedOrders: updated, historyItem, remoteSynced };
  }

  /**
   * Reverts an order's followup status back to its previous status in Sheet1 (Orders),
   * clears profit & dates if applicable, and records a dedicated "Undo" audit log in history.
   * As requested: Records "from status" (e.g. Delivered) and "to status" (e.g. Confirmed/Pending).
   */
  static async revertFollowup(
    historyId: string,
    orderId: string,
    previousStatus: string,
    undoneBy?: string
  ): Promise<{ updatedOrders: OrderItem[]; updatedHistory: FollowupHistoryItem[] }> {
    const orders = await this.getLocalOrders();
    const history = this.getFollowupHistory();
    const targetItem = history.find((h) => String(h.id) === String(historyId));
    const existingOrder = orders.find((ord) => String(ord.order_id || ord.id) === String(orderId));

    // Determine the status before undo (what it was changed to)
    const currentStatusBeforeUndo = targetItem?.newStatus || existingOrder?.followup_status || existingOrder?.order_status || 'Delivered';
    // Determine the target status to restore to
    const restoredStatus = previousStatus || targetItem?.previousStatus || 'Pending';

    const isDeliv = restoredStatus.toLowerCase() === 'delivered';
    const isCanc = restoredStatus.toLowerCase() === 'cancelled';

    const updatedOrders = orders.map((ord) => {
      if (String(ord.order_id || ord.id) === String(orderId)) {
        const orderVal = Number(ord.order_value || ord.orderValue || 0);
        return {
          ...ord,
          followup_status: restoredStatus,
          followupStatus: restoredStatus,
          order_status: isDeliv ? 'Delivered' : (isCanc ? 'Cancelled' : restoredStatus),
          orderStatus: isDeliv ? 'Delivered' : (isCanc ? 'Cancelled' : restoredStatus),
          profit: isDeliv ? Math.round(orderVal * 0.20) : 0,
          delivered_date: isDeliv ? (ord.delivered_date || ord.deliveredDate || '') : '',
          deliveredDate: isDeliv ? (ord.delivered_date || ord.deliveredDate || '') : '',
          cancelled_date: isCanc ? (ord.cancelled_date || ord.cancelledDate || '') : '',
          cancelledDate: isCanc ? (ord.cancelled_date || ord.cancelledDate || '') : '',
          followup_date: ''
        };
      }
      return ord;
    });

    this.saveLocalOrders(updatedOrders);

    const nowTimestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const nextFollowupId = history.length + 1;

    // Create the new UNDO history audit record (recording from which status to which status)
    const undoHistoryItem: FollowupHistoryItem = {
      id: String(Date.now()),
      followupId: nextFollowupId,
      orderId: String(orderId),
      customerName: targetItem?.customerName || existingOrder?.customer_name || existingOrder?.customerName || '-',
      customerContact: targetItem?.customerContact || existingOrder?.customer_mobile || existingOrder?.customerContact || '-',
      previousStatus: currentStatusBeforeUndo, // From which status it came (e.g. Delivered)
      newStatus: restoredStatus,             // To which status it arrived (e.g. Confirmed/Pending)
      orderStatus: isDeliv ? 'Delivered' : (isCanc ? 'Cancelled' : restoredStatus),
      orderValue: targetItem?.orderValue ?? Number(existingOrder?.order_value || existingOrder?.orderValue || 0),
      scheduleDate: targetItem?.scheduleDate || existingOrder?.schedule_date || existingOrder?.scheduleDate || '',
      scheduledTime: targetItem?.scheduledTime || existingOrder?.schedule_time || existingOrder?.scheduledTime || '',
      updatedBy: undoneBy || 'Manager',
      timestamp: nowTimestamp,
      action: `Undo (${currentStatusBeforeUndo} → ${restoredStatus})`,
      notes: `Order status reverted via Undo from "${currentStatusBeforeUndo}" back to "${restoredStatus}"`,
      isUndo: true
    };

    // Keep history intact, mark the target item as undone, and prepend the new Undo audit record
    const updatedHistory = [
      undoHistoryItem,
      ...history.map((h) => 
        String(h.id) === String(historyId) 
          ? { 
              ...h, 
              isUndone: true, 
              notes: (h.notes ? `${h.notes} | ` : '') + `[Undone → ${restoredStatus}]` 
            } 
          : h
      )
    ];

    this.saveFollowupHistory(updatedHistory);

    // Sync revert and undo log to remote Google Sheet if URL configured
    const scriptUrl = this.getScriptUrl();
    if (scriptUrl) {
      try {
        const params = new URLSearchParams();
        params.append('action', 'revertFollowup');
        params.append('order_id', String(orderId));
        params.append('orderId', String(orderId));
        params.append('previousStatus', restoredStatus);
        params.append('currentStatus', currentStatusBeforeUndo);
        params.append('updated_by', undoneBy || 'Manager');
        params.append('updatedBy', undoneBy || 'Manager');
        params.append('actionName', `Undo (${currentStatusBeforeUndo} → ${restoredStatus})`);
        params.append('customerName', undoHistoryItem.customerName || '');
        params.append('customerMobile', undoHistoryItem.customerContact || '');
        params.append('orderValue', String(undoHistoryItem.orderValue || ''));
        params.append('scheduleDate', undoHistoryItem.scheduleDate || '');
        params.append('scheduledTime', undoHistoryItem.scheduledTime || '');

        fetch(scriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString()
        }).catch(() => {});
      } catch (err) {
        console.warn('Google Apps Script revert error:', err);
      }
    }

    return { updatedOrders, updatedHistory };
  }

  static getUpdatedAppsScriptCode(): string {
    return `// ==========================================
// Google Apps Script for Agent & Manager Portal
// Supports:
// 1. Reading all orders (doGet)
// 2. Creating orders with 20% profit (doPost - default)
// 3. Updating Followup Status, Order Status, Order Value,
//    Schedule Date & Time in Sheet1 (action: 'updateFollowup')
// 4. Reverting followups: restores previous status, clears profit & dates (action: 'revertFollowup')
// 5. Storing complete audit trail in 'Followup' historical sheet with exact 14 columns:
//    Log Timestamp | followup_id | order_id | customer_name | customer_mobile | previous_followup_status | new_followup_status | order_status | order_value | schedule_date | schedule_time | updated_by | status_change | action
// ==========================================

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("orders") || ss.getSheets()[0];
  var rows = sheet.getDataRange().getValues();
  
  return ContentService.createTextOutput(JSON.stringify(rows))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var mainSheet = ss.getSheetByName("orders") || ss.getSheetByName("Sheet1") || ss.getSheets()[0];
  var sheetName = mainSheet.getName();
  var data = (e && e.parameter) ? e.parameter : {};
  
  // Also parse JSON payload if sent via application/json
  if (e && e.postData && e.postData.contents) {
    try {
      var json = JSON.parse(e.postData.contents);
      for (var k in json) {
        data[k] = json[k];
      }
    } catch (err) {}
  }

  var action = data.action;

  // 1. REVERT FOLLOWUP: Revert status in Sheet1, clear profit and dates
  if (action === 'revertFollowup') {
    var orderIdToFind = String(data.orderId || data.order_id || '').trim();
    var prevStatus = data.previousStatus || data.previous_status || 'Pending';
    var rows = mainSheet.getDataRange().getValues();
    var foundRowIndex = -1;
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).trim() === orderIdToFind) {
        foundRowIndex = i + 1;
        break;
      }
    }
    if (foundRowIndex > 0) {
      var stat = prevStatus === 'Delivered' ? 'Delivered' : (prevStatus === 'Cancelled' ? 'Cancelled' : 'Pending');
      var ordVal = parseFloat(rows[foundRowIndex - 1][16]) || 0;

      // Order Status (Col 18)
      mainSheet.getRange(foundRowIndex, 18).setValue(stat);
      // Followup Status (Col 19)
      mainSheet.getRange(foundRowIndex, 19).setValue(prevStatus);
      // Profit (Col 20)
      if (prevStatus === 'Delivered') {
        mainSheet.getRange(foundRowIndex, 20).setValue(Math.round(ordVal * 0.20));
      } else {
        mainSheet.getRange(foundRowIndex, 20).setValue('');
      }
      // Delivered Date (Col 21)
      if (prevStatus !== 'Delivered') {
        mainSheet.getRange(foundRowIndex, 21).setValue('');
      }
      // Cancelled Date (Col 22)
      if (prevStatus !== 'Cancelled') {
        mainSheet.getRange(foundRowIndex, 22).setValue('');
      }
      // Followup Date (Col 23)
      mainSheet.getRange(foundRowIndex, 23).setValue('');

      // Also record Undo Audit Row into 'Followup' sheet
      var followupSheet = ss.getSheetByName("Followup");
      if (followupSheet) {
        var lastFollowupRow = followupSheet.getLastRow();
        var nextFupId = lastFollowupRow > 1 ? (lastFollowupRow - 1) : 1;
        var custName = data.customerName || data.customer_name || rows[foundRowIndex - 1][3] || '';
        var custMob = data.customerMobile || data.customer_mobile || rows[foundRowIndex - 1][2] || '';
        var scDate = data.scheduleDate || data.schedule_date || rows[foundRowIndex - 1][14] || '';
        var scTime = data.scheduledTime || data.scheduled_time || rows[foundRowIndex - 1][15] || '';
        var currStat = data.currentStatus || data.current_status || 'Delivered';
        var uBy = data.updatedBy || data.updated_by || 'Manager';
        var actName = data.actionName || data.action_name || ("Undo (" + currStat + " -> " + prevStatus + ")");

        followupSheet.appendRow([
          new Date(),
          nextFupId,
          orderIdToFind,
          custName,
          custMob,
          currStat,
          prevStatus,
          stat,
          ordVal,
          scDate,
          scTime,
          uBy,
          currStat + " -> " + prevStatus + " (Undone)",
          actName
        ]);
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Order #' + orderIdToFind + ' reverted',
        sheet: sheetName
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  // 2. UPDATE FOLLOWUP
  if (action === 'updateFollowup' || action === 'updateStatus' || action === 'updateOrder' || action === 'update') {
      var orderIdToFind = String(data.orderId || data.order_id || '').trim();
    var newFollowupStatus = data.followupStatus || data.followup_status || '';
    var newOrderStatus = data.orderStatus || data.order_status || (newFollowupStatus === 'Delivered' ? 'Delivered' : '');
    var updatedBy = data.updatedBy || data.updated_by || 'Manager';
    var note = data.notes || data.remarks || '';
    var timestamp = new Date();

    var rows = mainSheet.getDataRange().getValues();
    var foundRowIndex = -1;
    var prevFollowupStatus = '';
    var prevOrderStatus = '';
    var prevOrderVal = '';
    var prevScheduleDate = '';
    var prevScheduleTime = '';
    var customerName = data.customerName || data.customer_name || '';
    var customerContact = data.customerContact || data.customer_mobile || data.customer_contact || '';

    for (var r = 1; r < rows.length; r++) {
      if (String(rows[r][0]).trim() === orderIdToFind) {
        foundRowIndex = r + 1; // 1-indexed row in sheet
        customerName = rows[r][3] || rows[r][1] || customerName;
        customerContact = rows[r][2] || customerContact;
        prevScheduleDate = rows[r][14] || rows[r][13] || '';
        prevScheduleTime = rows[r][15] || rows[r][14] || '';
        prevOrderVal = rows[r][16] || rows[r][15] || '';
        prevOrderStatus = rows[r][17] || rows[r][16] || '';
        prevFollowupStatus = rows[r][18] || rows[r][17] || '';
        break;
      }
    }

    if (foundRowIndex > 0) {
      // (a) Update Followup Status (Col 19)
      if (newFollowupStatus) {
        mainSheet.getRange(foundRowIndex, 19).setValue(newFollowupStatus);
      }
      // (b) Update Order Status (Col 18)
      if (newOrderStatus) {
        mainSheet.getRange(foundRowIndex, 18).setValue(newOrderStatus);
      }
      // (c) Update Order Value (Col 17)
      var valInput = data.orderValue !== undefined && data.orderValue !== '' ? data.orderValue : data.order_value;
      if (valInput !== undefined && valInput !== '') {
        var numVal = parseFloat(valInput) || 0;
        mainSheet.getRange(foundRowIndex, 17).setValue(numVal);
      }
      // (c2) Update Profit (Col 20): only when Delivered, else faka ('')
      var profitInput = data.profit;
      if (newFollowupStatus === 'Delivered') {
        var baseVal = (valInput !== undefined && valInput !== '') ? parseFloat(valInput) : parseFloat(prevOrderVal) || 0;
        var profitVal = (profitInput !== undefined && profitInput !== '') ? parseFloat(profitInput) : Math.round(baseVal * 0.20);
        mainSheet.getRange(foundRowIndex, 20).setValue(profitVal);
      } else {
        mainSheet.getRange(foundRowIndex, 20).setValue('');
      }

      // (d) Update Delivered Date (Col 21), Cancelled Date (Col 22), Followup Date (Col 23) strictly mutually exclusive
      var delivDtInput = data.deliveredDate || data.delivered_date;
      var cancDtInput = data.cancelledDate || data.cancelled_date;
      var followupDtInput = data.followupDate || data.followup_date;

      if (newFollowupStatus === 'Delivered') {
        var delivDt = delivDtInput || new Date();
        mainSheet.getRange(foundRowIndex, 21).setValue(delivDt);
        mainSheet.getRange(foundRowIndex, 22).setValue('');
        mainSheet.getRange(foundRowIndex, 23).setValue('');
      } else if (newFollowupStatus === 'Cancelled') {
        var cancDt = cancDtInput || new Date();
        mainSheet.getRange(foundRowIndex, 21).setValue('');
        mainSheet.getRange(foundRowIndex, 22).setValue(cancDt);
        mainSheet.getRange(foundRowIndex, 23).setValue('');
      } else if (newFollowupStatus) {
        var followupDt = followupDtInput || new Date();
        mainSheet.getRange(foundRowIndex, 21).setValue('');
        mainSheet.getRange(foundRowIndex, 22).setValue('');
        mainSheet.getRange(foundRowIndex, 23).setValue(followupDt);
      }
      
      // (f) Update Schedule Date (Col 15) - only if provided and non-empty
      var schedDtInput = data.scheduleDate !== undefined ? data.scheduleDate : data.schedule_date;
      if (schedDtInput !== undefined && schedDtInput !== '' && schedDtInput !== null) {
        mainSheet.getRange(foundRowIndex, 15).setValue(schedDtInput);
      }
      
      // (g) Update Scheduled Time (Col 16) - only if provided and non-empty
      var schedTmInput = data.scheduledTime !== undefined ? data.scheduledTime : (data.scheduleTime || data.schedule_time);
      if (schedTmInput !== undefined && schedTmInput !== '' && schedTmInput !== null) {
        mainSheet.getRange(foundRowIndex, 16).setValue(schedTmInput);
      }

      // (f) Record Historical Log into 'Followup' sheet with exact 14 columns requested:
      // Log Timestamp | followup_id | order_id | customer_name | customer_mobile | previous_followup_status | new_followup_status | order_status | order_value | schedule_date | schedule_time | updated_by | status_change | action
      var followupSheet = ss.getSheetByName("Followup");
      if (!followupSheet) {
        followupSheet = ss.insertSheet("Followup");
        followupSheet.appendRow([
          "Log Timestamp",
          "followup_id",
          "order_id",
          "customer_name",
          "customer_mobile",
          "previous_followup_status",
          "new_followup_status",
          "order_status",
          "order_value",
          "schedule_date",
          "schedule_time",
          "updated_by",
          "status_change",
          "action"
        ]);
        followupSheet.getRange(1, 1, 1, 14).setFontWeight("bold").setBackground("#e2e8f0");
      }

      var finalOrderVal = (valInput !== undefined && valInput !== '') ? valInput : prevOrderVal;
      var finalSchedDate = (schedDtInput !== undefined && schedDtInput !== '') ? schedDtInput : prevScheduleDate;
      var finalSchedTime = (schedTmInput !== undefined && schedTmInput !== '') ? schedTmInput : prevScheduleTime;

      // Determine Followup ID (sequential numeric)
      var nextFollowupId = data.followupId || data.followup_id;
      if (!nextFollowupId) {
        var lastFollowupRow = followupSheet.getLastRow();
        nextFollowupId = lastFollowupRow > 1 ? (lastFollowupRow - 1) : 1;
      }

      var prevFo = prevFollowupStatus || 'Pending';
      var newFo = newFollowupStatus || prevFo;
      var statusChangeVal = data.statusChange || data.status_change || (prevFo + " -> " + newFo);
      if (note) {
        statusChangeVal = statusChangeVal + " (" + note + ")";
      }

      // Determine Action Name
      var actionName = data.actionName || data.action_name || data.action || '';
      if (!actionName) {
        var actionChanges = [];
        if (valInput !== undefined && String(valInput) !== String(prevOrderVal)) actionChanges.push("price");
        if (data.profit !== undefined) actionChanges.push("profit");
        var isDateDiff = schedDtInput !== undefined && String(schedDtInput) !== String(prevScheduleDate);
        var isTimeDiff = schedTmInput !== undefined && String(schedTmInput) !== String(prevScheduleTime);
        if (isDateDiff && isTimeDiff) {
          actionChanges.push("schedule date & time");
        } else if (isDateDiff) {
          actionChanges.push("schedule");
        } else if (isTimeDiff) {
          actionChanges.push("schedule time");
        }
        if (newFo !== prevFo) actionChanges.push("status");

        if (actionChanges.length === 0) actionName = "Follow-up Update";
        else if (actionChanges.length === 1) {
          var singleAction = actionChanges[0];
          if (singleAction === "schedule") actionName = "Schedule Change";
          else if (singleAction === "schedule time") actionName = "Schedule Time Change";
          else if (singleAction === "status") actionName = "Status Change";
          else if (singleAction === "price") actionName = "Price Change";
          else if (singleAction === "profit") actionName = "Profit Add";
          else actionName = singleAction + " Change";
        } else {
          actionName = "(" + actionChanges.join(", ") + ") change";
        }
      }

      followupSheet.appendRow([
        timestamp,
        nextFollowupId,
        orderIdToFind,
        customerName,
        customerContact,
        prevFo,
        newFo,
        newOrderStatus || prevOrderStatus,
        finalOrderVal,
        finalSchedDate,
        finalSchedTime,
        updatedBy,
        statusChangeVal,
        actionName
      ]);

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Order #' + orderIdToFind + ' updated in Sheet1 & logged in Followup sheet',
        orderId: orderIdToFind,
        followupStatus: newFo,
        orderStatus: newOrderStatus,
        orderValue: finalOrderVal,
        scheduleDate: finalSchedDate,
        scheduledTime: finalSchedTime
      })).setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Order ID not found: ' + orderIdToFind
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  // 2. CREATE NEW ORDER (Default appendRow to main sheet)
  var lastRow = mainSheet.getLastRow();
  var newOrderId = 1001;
  if (lastRow > 1) {
    var prevId = mainSheet.getRange(lastRow, 1).getValue();
    newOrderId = Number(prevId) + 1;
    if (isNaN(newOrderId)) newOrderId = lastRow + 1000;
  }
  
  var orderVal = parseFloat(data.order_value || data.orderValue) || 0;
  var calculatedProfit = orderVal * 0.20; // 20% profit calculation
  
  var rowData = [
    newOrderId,                  // 0: Order Id
    data.customer_id || data.customerId || '',       // 1: Customer Id
    data.customer_mobile || data.customerContact || '',  // 2: Customer Mobile
    data.customer_name || data.customerName || '',     // 3: Customer Name
    data.gender || '',           // 4: Gender
    data.create_date || data.createDate || '',       // 5: Create Date
    data.order_channel || data.orderChannel || '',     // 6: Order Channel
    data.agent_id || data.agentId || '',     // 7: Agent ID
    data.agent_name || data.agentName || '',    // 8: Agent Name
    data.product_category || data.productCategory || '',  // 9: Product category
    data.product_name || data.productName || '',      // 10: Product Name
    data.city || '',             // 11: City
    data.delivery_area || data.deliveryArea || '',     // 12: Delivery Area
    data.address_details || data.addressDetails || '',   // 13: Address Details
    data.schedule_date || data.scheduleDate || '',     // 14: Schedule Date
    data.schedule_time || data.scheduledTime || data.scheduleTime || '',    // 15: Scheduled Time
    orderVal,                    // 16: Order Value
    data.order_status || data.orderStatus || 'Pending',     // 17: Order Status
    data.followup_status || data.followupStatus || 'Pending',  // 18: Followup Status
    calculatedProfit,            // 19: Profit
    '',                          // 20: delivered_date
    '',                          // 21: cancelled_date
    ''                           // 22: followup_date
  ];
  
  mainSheet.appendRow(rowData);
  
  return ContentService.createTextOutput(JSON.stringify({status: 'success', orderId: newOrderId}))
    .setMimeType(ContentService.MimeType.JSON);
}

function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
}
`;
  }

  static checkDateMatch(dateVal: string, filterOption: DateFilterType): boolean {
    if (!dateVal || !filterOption) return true;
    const targetDate = new Date(dateVal);
    if (isNaN(targetDate.getTime())) return false;

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const targetStr = targetDate.toISOString().slice(0, 10);

    if (filterOption === 'today') {
      return targetStr === todayStr;
    } else if (filterOption === 'yesterday') {
      const yest = new Date();
      yest.setDate(now.getDate() - 1);
      return targetStr === yest.toISOString().slice(0, 10);
    } else if (filterOption === 'last7') {
      const past = new Date();
      past.setDate(now.getDate() - 7);
      return targetDate >= past && targetDate <= now;
    } else if (filterOption === 'last30') {
      const past = new Date();
      past.setDate(now.getDate() - 30);
      return targetDate >= past && targetDate <= now;
    } else if (filterOption === 'thisMonth') {
      return targetDate.getFullYear() === now.getFullYear() && targetDate.getMonth() === now.getMonth();
    } else if (filterOption === 'lastMonth') {
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return targetDate.getFullYear() === lastMonthDate.getFullYear() && targetDate.getMonth() === lastMonthDate.getMonth();
    }
    return true;
  }

  static formatDateTime(val: string): string {
    if (!val) return '-';
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    if (hh === '00' && min === '00') {
      return `${yyyy}-${mm}-${dd}`;
    }
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  }
}
