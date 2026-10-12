import { AgentUser, DateFilterType, OrderItem, FollowupHistoryItem } from '../types';
import { INITIAL_AGENTS, INITIAL_ORDERS } from '../data/mockOrders';

export const DEFAULT_SCRIPT_URL =
  (import.meta.env?.VITE_GOOGLE_SCRIPT_URL as string) ||
  'https://script.google.com/macros/s/AKfycbznJBoaggkUhg0ztkcmJpEyeaiuJRVRJX7oItiIgzWqhNPkYIbG3zjnEe2Hn1voDFFg/exec';

const STORAGE_KEYS = {
  ORDERS: 'agent_portal_orders_v2',
  AGENTS: 'agentUsers',
  TEAMS: 'agent_portal_teams_v1',
  SCRIPT_URL: 'agent_portal_script_url',
  LAST_SYNC: 'agent_portal_last_sync',
  FOLLOWUP_HISTORY: 'agent_portal_followup_history'
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

  static getLocalOrders(): OrderItem[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ORDERS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Normalize every order to include all 22 official sheet properties + compatibility aliases
          const normalized = parsed
            .map((o: any) => {
              const oId = String(o.order_id || o.id || '');
              const cId = String(o.customer_id || o.customerId || '1');
              const cMobile = String(o.customer_mobile || o.customerContact || '-');
              const cName = String(o.customer_name || o.customerName || 'Customer');
              const gen = String(o.gender || 'Other');
              const crDt = String(o.create_date || o.createDate || '');
              const ch = String(o.order_channel || o.orderChannel || 'Acquisition');
              const aId = String(o.agent_id || o.agentId || 'agent01');
              const aNm = String(o.agent_name || o.agentName || 'Agent');
              const pCat = String(o.product_category || o.productCategory || 'Electronics');
              const pNm = String(o.product_name || o.productName || 'Product Item');
              const ct = String(o.city || 'Dhaka');
              const dArea = String(o.delivery_area || o.deliveryArea || 'Gulshan');
              const addr = String(o.address_details || o.addressDetails || '-');
              const scDt = String(o.schedule_date || o.scheduleDate || '');
              const scTm = String(o.schedule_time || o.scheduledTime || '11AM to 12PM');
              const oVal = Number(o.order_value ?? o.orderValue ?? 0);
              const oSt = String(o.order_status || o.orderStatus || 'Pending');
              const foSt = String(o.followup_status || o.followupStatus || 'Pending');
              const pr = Number(o.profit ?? 0);
              const dDt = String(o.delivered_date || o.deliveredDate || '');
              const caDt = String(o.cancelled_date || o.cancelledDate || '');
              const fDt = String(o.followup_date || o.followupDate || '');

              return {
                ...o,
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
                order_value: oVal,
                orderValue: oVal,
                order_status: oSt,
                orderStatus: oSt,
                followup_status: foSt,
                followupStatus: foSt,
                profit: pr,
                delivered_date: dDt,
                deliveredDate: dDt,
                cancelled_date: caDt,
                cancelledDate: caDt,
                followup_date: fDt,
                followupDate: fDt
              };
            })
            .filter((o: any) => !['1001', '1002', '1003', '1004', '1005', '1006', '1007', '1008'].includes(String(o.order_id)));
          return normalized;
        }
      }
    } catch {
      // fallback
    }
    return [];
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

          // Strictly use parsed sheet orders as source of truth
          this.saveLocalOrders(parsed);
          localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());

          return { orders: parsed, source: 'google_sheets' };
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
      const cleanId = (o.agent_id || (o as any).agentId || '').trim();
      if (cleanId && !agentMap.has(cleanId.toLowerCase())) {
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
  private static parseGoogleSheetRows(data: any[][]): OrderItem[] {
    if (!Array.isArray(data) || data.length === 0) return [];

    let hasHeader = false;
    const firstRow = data[0].map(h => String(h || '').trim().toLowerCase());

    if (firstRow.some(col => col.includes('order') || col.includes('customer') || col.includes('agent') || col.includes('date'))) {
      hasHeader = true;
    }

    const headers = hasHeader ? firstRow : [];
    const rows = hasHeader ? data.slice(1) : data;

    const idxOrder    = headers.indexOf('order_id');
    const idxCustId   = headers.indexOf('customer_id');
    const idxCustCont = headers.indexOf('customer_mobile');
    const idxCustName = headers.indexOf('customer_name');
    const idxGender   = headers.indexOf('gender');
    const idxCreateDt = headers.indexOf('create_date');
    const idxChannel  = headers.indexOf('order_channel');
    const idxAgentId  = headers.indexOf('agent_id');
    const idxAgentNm  = headers.indexOf('agent_name');
    const idxProdCat  = headers.indexOf('product_category');
    const idxProdNm   = headers.indexOf('product_name');
    const idxCity     = headers.indexOf('city');
    const idxArea     = headers.indexOf('delivery_area');
    const idxAddress  = headers.indexOf('address_details');
    const idxSchedDt  = headers.indexOf('schedule_date');
    const idxSchedTm  = headers.indexOf('schedule_time');
    const idxValue    = headers.indexOf('order_value');
    const idxStatus   = headers.indexOf('order_status');
    const idxFollowup = headers.indexOf('followup_status');
    const idxProfit   = headers.indexOf('profit');
    const idxDelivDt  = headers.indexOf('delivered_date');
    const idxCancDt   = headers.indexOf('cancelled_date');
    const idxFollowDt = headers.indexOf('followup_date');

    return rows
      .filter(row => {
        if (!row || !Array.isArray(row) || row.length === 0) return false;
        const rawId = idxOrder !== -1 && row[idxOrder] !== undefined && row[idxOrder] !== null
          ? String(row[idxOrder]).trim()
          : '';
        // Strictly filter out any row without an explicit, valid order ID
        const lower = rawId.toLowerCase();
        if (!rawId || rawId === '-' || lower === 'null' || lower === 'undefined' || lower === 'order id' || lower.includes('total')) {
          return false;
        }
        return true;
      })
      .map((row) => {
        const valOrEmpty = (idx: number, fallback = '') =>
          idx !== -1 && row[idx] !== undefined && row[idx] !== null ? String(row[idx]).trim() : fallback;

        const numOrZero = (idx: number) => {
          if (idx === -1 || row[idx] === undefined || row[idx] === null) return 0;
          const val = parseFloat(String(row[idx]).replace(/[^0-9.-]+/g, ''));
          return isNaN(val) ? 0 : val;
        };

        const rawOrderId = valOrEmpty(idxOrder);
        const orderId = rawOrderId;
        const orderVal = numOrZero(idxValue);
        const profitVal = idxProfit !== -1 && row[idxProfit] !== undefined && row[idxProfit] !== ''
          ? numOrZero(idxProfit)
          : Math.round(orderVal * 0.20);

        const cId = valOrEmpty(idxCustId, '1');
        const cName = valOrEmpty(idxCustName, 'Customer');
        const cMobile = valOrEmpty(idxCustCont, '-');
        const gen = valOrEmpty(idxGender, 'Other');
        const crDt = valOrEmpty(idxCreateDt, new Date().toISOString().replace('T', ' ').slice(0, 19));
        const ch = valOrEmpty(idxChannel, 'Acquisition');
        const aId = valOrEmpty(idxAgentId, 'agent01');
        const aNm = valOrEmpty(idxAgentNm, 'Agent 01');
        const pCat = valOrEmpty(idxProdCat, 'Electronics');
        const pNm = valOrEmpty(idxProdNm, 'Product Item');
        const ct = valOrEmpty(idxCity, 'Dhaka');
        const dArea = valOrEmpty(idxArea, 'Gulshan');
        const addr = valOrEmpty(idxAddress, '-');
        const scDt = valOrEmpty(idxSchedDt, new Date().toISOString().split('T')[0]);
        const scTm = valOrEmpty(idxSchedTm, '11AM to 12PM');
        const oSt = valOrEmpty(idxStatus, 'Pending');
        const foSt = valOrEmpty(idxFollowup, 'Pending');
        const delivDt = valOrEmpty(idxDelivDt, '');
        const cancDt = valOrEmpty(idxCancDt, '');
        const followDt = valOrEmpty(idxFollowDt, '');

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
    const localOrders = this.getLocalOrders();

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
    const agId = String(newOrder.agent_id || newOrder.agentId || 'agent01');
    const agNm = String(newOrder.agent_name || newOrder.agentName || 'Agent');
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
        const params = new URLSearchParams();
        params.append('order_id', fullOrder.order_id);
        params.append('customer_id', fullOrder.customer_id);
        params.append('customer_mobile', fullOrder.customer_mobile);
        params.append('customer_name', fullOrder.customer_name);
        params.append('gender', fullOrder.gender);
        params.append('create_date', fullOrder.create_date);
        params.append('order_channel', fullOrder.order_channel);
        params.append('agent_id', fullOrder.agent_id);
        params.append('agent_name', fullOrder.agent_name);
        params.append('product_category', fullOrder.product_category);
        params.append('product_name', fullOrder.product_name);
        params.append('city', fullOrder.city);
        params.append('delivery_area', fullOrder.delivery_area);
        params.append('address_details', fullOrder.address_details);
        params.append('schedule_date', fullOrder.schedule_date);
        params.append('schedule_time', fullOrder.schedule_time);
        params.append('order_value', String(fullOrder.order_value));
        params.append('order_status', fullOrder.order_status);
        params.append('followup_status', fullOrder.followup_status);
        params.append('profit', String(fullOrder.profit));
        params.append('delivered_date', fullOrder.delivered_date || '');
        params.append('cancelled_date', fullOrder.cancelled_date || '');

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
        updatedBy: 'agent01',
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
    const orders = this.getLocalOrders();
    const existingOrder = orders.find((ord) => String(ord.order_id || ord.id) === String(orderId));

    const finalOrderStatus = updates.order_status || updates.orderStatus || existingOrder?.order_status || existingOrder?.orderStatus || 'Pending';
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

    const updated = orders.map((ord) => {
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
          ...updates,
          order_id: ord.order_id || ord.id,
          id: ord.order_id || ord.id,
          order_value: orderVal,
          orderValue: orderVal,
          profit: profit,
          order_status: finalOrderStatus,
          orderStatus: finalOrderStatus,
          followup_status: fStatus,
          followupStatus: fStatus,
          schedule_date: schedDate,
          scheduleDate: schedDate,
          schedule_time: schedTime,
          scheduledTime: schedTime,
          delivered_date: newDeliveredDate,
          deliveredDate: newDeliveredDate,
          cancelled_date: newCancelledDate,
          cancelledDate: newCancelledDate,
          followup_date: newFollowupDate,
          followupDate: newFollowupDate
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

      // Generate status change string only if status changed, otherwise include update notes
      let statusChangeText = statusChanged ? `${prevFo} -> ${finalFollowupStatus || prevFo}` : '';
      if (!statusChanged && schedDateChanged) statusChangeText = `(Schedule Date updated to ${schedDate})`;
      else if (!statusChanged && schedTimeChanged) statusChangeText = `(Schedule Time updated to ${schedTime})`;
      else if (!statusChanged) statusChangeText = 'No Status Change';

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
        const params = new URLSearchParams();
        params.append('action', 'updateFollowup');
        params.append('order_id', String(orderId));
        params.append('orderId', String(orderId));
        params.append('followup_id', String(nextFollowupId));
        params.append('followupId', String(nextFollowupId));
        params.append('action_name', actionStr);
        params.append('actionName', actionStr);
        const prevFo = existingOrder?.followup_status || existingOrder?.followupStatus || 'Pending';
        const statusChanged = finalFollowupStatus !== undefined && finalFollowupStatus !== prevFo;
        const scDtToSync = updates.schedule_date !== undefined ? updates.schedule_date : updates.scheduleDate;
        const scTmToSync = updates.schedule_time !== undefined ? updates.schedule_time : updates.scheduledTime;
        const schedDateChanged = scDtToSync !== undefined && scDtToSync !== (existingOrder?.schedule_date || existingOrder?.scheduleDate || '');
        const schedTimeChanged = scTmToSync !== undefined && scTmToSync !== (existingOrder?.schedule_time || existingOrder?.scheduledTime || '');
        const schedDate = scDtToSync || (existingOrder?.schedule_date || existingOrder?.scheduleDate || '');
        const schedTime = scTmToSync || (existingOrder?.schedule_time || existingOrder?.scheduledTime || '');

        const statusChangeText = statusChanged ? `${prevFo} -> ${finalFollowupStatus || prevFo}` : (schedDateChanged ? `(Schedule Date updated to ${schedDate})` : (schedTimeChanged ? `(Schedule Time updated to ${schedTime})` : 'No Status Change'));
        params.append('status_change', statusChangeText);
        params.append('statusChange', statusChangeText);
        if (finalFollowupStatus) {
          params.append('followup_status', finalFollowupStatus);
          params.append('followupStatus', finalFollowupStatus);
        }
        params.append('order_status', finalOrderStatus);
        params.append('orderStatus', finalOrderStatus);
        const orderValToSync = updates.order_value !== undefined ? updates.order_value : updates.orderValue;
        if (orderValToSync !== undefined) {
          params.append('order_value', String(orderValToSync));
          params.append('orderValue', String(orderValToSync));
        }
        const finalProfitParam = isCancelled ? 0 : (updates.profit !== undefined ? updates.profit : (orderValToSync !== undefined ? Number(orderValToSync) * 0.20 : undefined));
        if (finalProfitParam !== undefined) {
          params.append('profit', String(finalProfitParam));
        }
        params.append('delivered_date', newDeliveredDate || '');
        params.append('deliveredDate', newDeliveredDate || '');
        params.append('cancelled_date', newCancelledDate || '');
        params.append('cancelledDate', newCancelledDate || '');
        params.append('followup_date', newFollowupDate || '');
        params.append('followupDate', newFollowupDate || '');
        // Use already defined variables scDtToSync/scTmToSync
        if (scDtToSync !== undefined) {
          params.append('schedule_date', scDtToSync);
          params.append('scheduleDate', scDtToSync);
        }
        if (scTmToSync !== undefined) {
          params.append('schedule_time', scTmToSync);
          params.append('scheduledTime', scTmToSync);
          params.append('scheduleTime', scTmToSync);
        }
        params.append('updated_by', updatedBy);
        params.append('updatedBy', updatedBy);
        params.append('notes', notes);
        params.append('remarks', notes);
        if (existingOrder) {
          params.append('customer_name', existingOrder.customer_name || existingOrder.customerName || '');
          params.append('customerName', existingOrder.customer_name || existingOrder.customerName || '');
          params.append('customer_mobile', existingOrder.customer_mobile || existingOrder.customerContact || '');
          params.append('customerContact', existingOrder.customer_mobile || existingOrder.customerContact || '');
        }
        params.append('timestamp', currentTimestamp);

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
        console.warn('Google Apps Script status update error:', err);
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
    const orders = this.getLocalOrders();
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
  var sheet = ss.getSheetByName("Sheet1") || ss.getSheets()[0];
  var rows = sheet.getDataRange().getValues();
  
  return ContentService.createTextOutput(JSON.stringify(rows))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var mainSheet = ss.getSheetByName("Sheet1") || ss.getSheets()[0];
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
        message: 'Order #' + orderIdToFind + ' reverted from ' + (data.currentStatus || 'status') + ' to ' + prevStatus + ', undo logged in history'
      })).setMimeType(ContentService.MimeType.JSON);
    }
  }

  // 2. UPDATE FOLLOWUP / ORDER STATUS / ORDER VALUE / SCHEDULE DATE & TIME
  // AND LOG HISTORICAL AUDIT ROW TO "Followup" SHEET WITH EXACT 14 COLUMNS
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
