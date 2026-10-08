import { AgentUser, DateFilterType, OrderItem } from '../types';
import { INITIAL_AGENTS, INITIAL_ORDERS } from '../data/mockOrders';

export const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbznJBoaggkUhg0ztkcmJpEyeaiuJRVRJX7oItiIgzWqhNPkYIbG3zjnEe2Hn1voDFFg/exec';

const STORAGE_KEYS = {
  ORDERS: 'agent_portal_orders_v2',
  AGENTS: 'agentUsers',
  SCRIPT_URL: 'agent_portal_script_url',
  LAST_SYNC: 'agent_portal_last_sync'
};

export interface SyncStatus {
  lastSyncTime: string | null;
  source: 'google_sheets' | 'local_storage';
  totalOrders: number;
  error?: string;
  isLive: boolean;
}

export class OrderService {
  static getScriptUrl(): string {
    return localStorage.getItem(STORAGE_KEYS.SCRIPT_URL) || DEFAULT_SCRIPT_URL;
  }

  static setScriptUrl(url: string): void {
    localStorage.setItem(STORAGE_KEYS.SCRIPT_URL, url.trim());
  }

  static getAgents(): AgentUser[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.AGENTS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    localStorage.setItem(STORAGE_KEYS.AGENTS, JSON.stringify(INITIAL_AGENTS));
    return INITIAL_AGENTS;
  }

  static saveAgents(agents: AgentUser[]): void {
    localStorage.setItem(STORAGE_KEYS.AGENTS, JSON.stringify(agents));
  }

  static getLocalOrders(): OrderItem[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ORDERS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(INITIAL_ORDERS));
    return INITIAL_ORDERS;
  }

  static saveLocalOrders(orders: OrderItem[]): void {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  }

  static resetOrdersToMock(): OrderItem[] {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(INITIAL_ORDERS));
    return INITIAL_ORDERS;
  }

  /**
   * Fetches orders directly from Google Apps Script Web App:
   * URL: https://script.google.com/macros/s/AKfycbznJBoaggkUhg0ztkcmJpEyeaiuJRVRJX7oItiIgzWqhNPkYIbG3zjnEe2Hn1voDFFg/exec
   */
  static async fetchOrders(forceRefresh = false): Promise<{ orders: OrderItem[]; source: 'google_sheets' | 'local_storage'; error?: string }> {
    const scriptUrl = this.getScriptUrl();
    const localOrders = this.getLocalOrders();

    if (!scriptUrl) {
      return { orders: localOrders, source: 'local_storage' };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000); // 9s timeout

      const res = await fetch(scriptUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/plain, */*'
        },
        redirect: 'follow',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const parsed = this.parseGoogleSheetRows(data);
        if (parsed.length > 0) {
          // Sync agents dynamically discovered in the Google Sheet
          this.syncAgentsFromOrders(parsed);

          // Merge any recently placed local orders that might be in transit
          const existingIds = new Set(parsed.map(p => String(p.id)));
          const uniqueLocal = localOrders.filter(o => !existingIds.has(String(o.id)));
          const combined = [...uniqueLocal, ...parsed];
          this.saveLocalOrders(combined);
          localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());

          return { orders: combined, source: 'google_sheets' };
        }
      }
      return { orders: localOrders, source: 'local_storage' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('Google Script fetch failed (falling back to resilient local cache):', msg);
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
      const cleanId = (o.agentId || '').trim();
      if (cleanId && !agentMap.has(cleanId.toLowerCase())) {
        agentMap.set(cleanId.toLowerCase(), {
          user: cleanId,
          pass: cleanId, // default pass same as user id
          name: o.agentName || `Agent ${cleanId}`,
          team: o.orderChannel || 'Acquisition',
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
  private static parseGoogleSheetRows(data: any[][]): OrderItem[] {
    if (!Array.isArray(data) || data.length === 0) return [];

    let hasHeader = false;
    const firstRow = data[0].map(h => String(h || '').trim().toLowerCase());

    if (firstRow.some(col => col.includes('order') || col.includes('customer') || col.includes('agent') || col.includes('date'))) {
      hasHeader = true;
    }

    const headers = hasHeader ? firstRow : [];
    const rows = hasHeader ? data.slice(1) : data;

    const getColIdx = (keywords: string[], fallbackIdx: number): number => {
      if (hasHeader) {
        for (const kw of keywords) {
          const idx = headers.findIndex(h => h.includes(kw.toLowerCase()));
          if (idx !== -1) return idx;
        }
      }
      return fallbackIdx;
    };

    const idxOrder    = getColIdx(['order id', 'order_id'], 0);
    const idxCustName = getColIdx(['customer name'], 1);
    const idxCustCont = getColIdx(['customer contact', 'phone', 'contact'], 2);
    const idxGender   = getColIdx(['gender'], 3);
    const idxCreateDt = getColIdx(['create date', 'created'], 4);
    const idxChannel  = getColIdx(['order channel', 'channel'], 5);
    const idxAgentId  = getColIdx(['agent id', 'agent_id', 'createdbynum'], 6);
    const idxAgentNm  = getColIdx(['agent name', 'createdbyname'], 7);
    const idxProdCat  = getColIdx(['product category', 'product catrgory'], 8);
    const idxProdNm   = getColIdx(['product name'], 9);
    const idxCity     = getColIdx(['city'], 10);
    const idxArea     = getColIdx(['delivery area', 'area'], 11);
    const idxAddress  = getColIdx(['address details', 'address'], 12);
    const idxSchedDt  = getColIdx(['schedule date'], 13);
    const idxSchedTm  = getColIdx(['scheduled time', 'time'], 14);
    const idxValue    = getColIdx(['order value', 'value'], 15);
    const idxStatus   = getColIdx(['order status', 'status'], 16);
    const idxFollowup = getColIdx(['followup status', 'folllowup status'], 17);
    const idxProfit   = getColIdx(['profit'], 18);

    return rows
      .filter(row => row && row.length > 0 && (row[idxOrder] !== '' || row[idxCustName] !== ''))
      .map((row, index) => {
        const valOrEmpty = (idx: number, fallback = '') =>
          idx !== -1 && row[idx] !== undefined && row[idx] !== null ? String(row[idx]).trim() : fallback;

        const numOrZero = (idx: number) => {
          if (idx === -1 || row[idx] === undefined || row[idx] === null) return 0;
          const val = parseFloat(String(row[idx]).replace(/[^0-9.-]+/g, ''));
          return isNaN(val) ? 0 : val;
        };

        const rawOrderId = valOrEmpty(idxOrder);
        const orderId = rawOrderId || String(1001 + index);
        const orderVal = numOrZero(idxValue);
        // Profit calculation in Google Apps Script is: orderVal * 0.20
        const profitVal = idxProfit !== -1 && row[idxProfit] !== undefined && row[idxProfit] !== ''
          ? numOrZero(idxProfit)
          : Math.round(orderVal * 0.20);

        return {
          id: orderId,
          customerName: valOrEmpty(idxCustName, 'Customer'),
          customerContact: valOrEmpty(idxCustCont, '-'),
          gender: valOrEmpty(idxGender, 'Other'),
          createDate: valOrEmpty(idxCreateDt, new Date().toISOString().replace('T', ' ').slice(0, 19)),
          orderChannel: valOrEmpty(idxChannel, 'Acquisition'),
          agentId: valOrEmpty(idxAgentId, 'agent01'),
          agentName: valOrEmpty(idxAgentNm, 'Agent 01'),
          productCategory: valOrEmpty(idxProdCat, 'Electronics'),
          productName: valOrEmpty(idxProdNm, 'Product Item'),
          city: valOrEmpty(idxCity, 'Dhaka'),
          deliveryArea: valOrEmpty(idxArea, 'Gulshan'),
          addressDetails: valOrEmpty(idxAddress, '-'),
          scheduleDate: valOrEmpty(idxSchedDt, new Date().toISOString().split('T')[0]),
          scheduledTime: valOrEmpty(idxSchedTm, '11AM to 12PM'),
          orderValue: orderVal,
          orderStatus: valOrEmpty(idxStatus, 'Pending'),
          followupStatus: valOrEmpty(idxFollowup, 'Pending'),
          profit: profitVal
        };
      });
  }

  /**
   * Creates a new order.
   * Dispatches to Google Apps Script doPost(e) and saves locally.
   */
  static async createOrder(
    newOrder: Omit<OrderItem, 'id' | 'profit'> & { profit?: number }
  ): Promise<{ success: boolean; order: OrderItem; remoteSynced: boolean }> {
    const localOrders = this.getLocalOrders();

    let nextNum = 1001;
    if (localOrders.length > 0) {
      const topId = localOrders[0].id.replace(/[^0-9]/g, '');
      const parsedNum = parseInt(topId, 10);
      if (!isNaN(parsedNum)) {
        nextNum = parsedNum + 1;
      } else {
        nextNum = 1001 + localOrders.length;
      }
    }
    const orderId = String(nextNum);

    // Profit = 20%
    const calculatedProfit = newOrder.profit !== undefined ? newOrder.profit : Math.round(newOrder.orderValue * 0.20);

    let fullOrder: OrderItem = {
      ...newOrder,
      id: orderId,
      profit: calculatedProfit
    };

    // Save locally immediately
    const updated = [fullOrder, ...localOrders];
    this.saveLocalOrders(updated);

    // Dispatch to Google Apps Script doPost(e)
    let remoteSynced = false;
    const scriptUrl = this.getScriptUrl();

    if (scriptUrl) {
      try {
        const params = new URLSearchParams();
        params.append('customerName', fullOrder.customerName);
        params.append('customerContact', fullOrder.customerContact);
        params.append('gender', fullOrder.gender);
        params.append('createDate', fullOrder.createDate);
        params.append('orderChannel', fullOrder.orderChannel);
        params.append('createdByNum', fullOrder.agentId);
        params.append('createdByName', fullOrder.agentName);
        params.append('productCategory', fullOrder.productCategory);
        params.append('productName', fullOrder.productName);
        params.append('city', fullOrder.city);
        params.append('deliveryArea', fullOrder.deliveryArea);
        params.append('addressDetails', fullOrder.addressDetails);
        params.append('scheduleDate', fullOrder.scheduleDate);
        params.append('scheduledTime', fullOrder.scheduledTime);
        params.append('orderValue', String(fullOrder.orderValue));
        params.append('orderStatus', fullOrder.orderStatus);
        params.append('followupStatus', fullOrder.followupStatus);

        await fetch(scriptUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: params.toString(),
          mode: 'no-cors'
        });
        remoteSynced = true;
      } catch (err) {
        console.warn('Google Apps Script doPost error:', err);
      }
    }

    return {
      success: true,
      order: fullOrder,
      remoteSynced
    };
  }

  static updateOrderStatus(orderId: string, updates: Partial<OrderItem>): OrderItem[] {
    const orders = this.getLocalOrders();
    const updated = orders.map(ord => (ord.id === orderId ? { ...ord, ...updates } : ord));
    this.saveLocalOrders(updated);
    return updated;
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
