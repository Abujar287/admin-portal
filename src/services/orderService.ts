import { AgentUser, DateFilterType, OrderItem, FollowupHistoryItem } from '../types';
import { INITIAL_AGENTS, INITIAL_ORDERS } from '../data/mockOrders';

export const DEFAULT_SCRIPT_URL =
  (import.meta.env?.VITE_GOOGLE_SCRIPT_URL as string) ||
  'https://script.google.com/macros/s/AKfycbznJBoaggkUhg0ztkcmJpEyeaiuJRVRJX7oItiIgzWqhNPkYIbG3zjnEe2Hn1voDFFg/exec';

const STORAGE_KEYS = {
  ORDERS: 'agent_portal_orders_v2',
  AGENTS: 'agentUsers',
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

  static getFollowupHistory(): FollowupHistoryItem[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.FOLLOWUP_HISTORY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // fallback
    }
    return [];
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
    const existingOrder = orders.find((ord) => String(ord.id) === String(orderId));

    const finalOrderStatus = updates.orderStatus || (updates.followupStatus === 'Delivered' ? 'Delivered' : existingOrder?.orderStatus || 'Pending');

    const updated = orders.map((ord) => {
      if (String(ord.id) === String(orderId)) {
        const orderVal = updates.orderValue !== undefined ? Number(updates.orderValue) : ord.orderValue;
        const profit = updates.orderValue !== undefined ? Number(updates.orderValue) * 0.20 : ord.profit;
        return {
          ...ord,
          ...updates,
          orderValue: orderVal,
          profit: profit,
          orderStatus: finalOrderStatus
        };
      }
      return ord;
    });
    this.saveLocalOrders(updated);

    // Record Historical Log for Followup Sheet
    let historyItem: FollowupHistoryItem | undefined;
    if (existingOrder) {
      const orderVal = updates.orderValue !== undefined ? Number(updates.orderValue) : existingOrder.orderValue;
      const schedDate = updates.scheduleDate !== undefined ? updates.scheduleDate : existingOrder.scheduleDate;
      const schedTime = updates.scheduledTime !== undefined ? updates.scheduledTime : existingOrder.scheduledTime;

      historyItem = {
        id: 'hist_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        orderId: String(orderId),
        customerName: existingOrder.customerName,
        customerContact: existingOrder.customerContact,
        previousStatus: existingOrder.followupStatus || 'Pending',
        newStatus: updates.followupStatus || existingOrder.followupStatus || 'Pending',
        orderStatus: finalOrderStatus,
        orderValue: orderVal,
        scheduleDate: schedDate,
        scheduledTime: schedTime,
        updatedBy: updatedBy || 'Manager',
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
        notes: notes || ''
      };

      const existingHistory = this.getFollowupHistory();
      this.saveFollowupHistory([historyItem, ...existingHistory]);
    }

    let remoteSynced = false;
    const scriptUrl = this.getScriptUrl();

    if (scriptUrl) {
      try {
        const params = new URLSearchParams();
        // action 'updateFollowup' instructs Google Apps Script to update Sheet1 and log in 'Followup' sheet
        params.append('action', 'updateFollowup');
        params.append('orderId', String(orderId));
        if (updates.followupStatus) {
          params.append('followupStatus', updates.followupStatus);
        }
        params.append('orderStatus', finalOrderStatus);
        if (updates.orderValue !== undefined) {
          params.append('orderValue', String(updates.orderValue));
          params.append('profit', String(Number(updates.orderValue) * 0.20));
        }
        if (updates.scheduleDate !== undefined) {
          params.append('scheduleDate', updates.scheduleDate);
        }
        if (updates.scheduledTime !== undefined) {
          params.append('scheduledTime', updates.scheduledTime);
        }
        params.append('updatedBy', updatedBy);
        params.append('notes', notes);
        if (existingOrder) {
          params.append('customerName', existingOrder.customerName);
          params.append('customerContact', existingOrder.customerContact);
        }
        params.append('timestamp', new Date().toISOString().replace('T', ' ').slice(0, 19));

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

  static getUpdatedAppsScriptCode(): string {
    return `// ==========================================
// Google Apps Script for Agent & Manager Portal
// Supports:
// 1. Reading all orders (doGet)
// 2. Creating orders with 20% profit (doPost - default)
// 3. Updating Followup Status, Order Status, Order Value,
//    Schedule Date & Time in Sheet1 (action: 'updateFollowup')
// 4. Storing complete audit trail in 'Followup' historical sheet
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

  // 1. UPDATE FOLLOWUP / ORDER STATUS / ORDER VALUE / SCHEDULE DATE & TIME
  // AND LOG HISTORICAL AUDIT ROW TO "Followup" SHEET
  if (action === 'updateFollowup' || action === 'updateStatus' || action === 'updateOrder') {
    var orderIdToFind = String(data.orderId || '').trim();
    var newFollowupStatus = data.followupStatus || '';
    var newOrderStatus = data.orderStatus || (newFollowupStatus === 'Delivered' ? 'Delivered' : '');
    var updatedBy = data.updatedBy || 'Manager';
    var note = data.notes || data.remarks || '';
    var timestamp = new Date();

    var rows = mainSheet.getDataRange().getValues();
    var foundRowIndex = -1;
    var prevFollowupStatus = '';
    var prevOrderStatus = '';
    var prevOrderVal = '';
    var prevScheduleDate = '';
    var prevScheduleTime = '';
    var customerName = data.customerName || '';
    var customerContact = data.customerContact || '';

    for (var r = 1; r < rows.length; r++) {
      if (String(rows[r][0]).trim() === orderIdToFind) {
        foundRowIndex = r + 1; // 1-indexed row in sheet
        customerName = rows[r][1] || customerName;
        customerContact = rows[r][2] || customerContact;
        prevScheduleDate = rows[r][13] || '';
        prevScheduleTime = rows[r][14] || '';
        prevOrderVal = rows[r][15] || '';
        prevOrderStatus = rows[r][16] || '';
        prevFollowupStatus = rows[r][17] || '';
        break;
      }
    }

    if (foundRowIndex > 0) {
      // (a) Update Column 18 (R): Followup Status
      if (newFollowupStatus) {
        mainSheet.getRange(foundRowIndex, 18).setValue(newFollowupStatus);
      }
      // (b) Update Column 17 (Q): Order Status
      if (newOrderStatus) {
        mainSheet.getRange(foundRowIndex, 17).setValue(newOrderStatus);
      }
      // (c) Update Column 16 (P): Order Value & Column 19 (S): 20% Profit
      if (data.orderValue !== undefined && data.orderValue !== '') {
        var numVal = parseFloat(data.orderValue) || 0;
        mainSheet.getRange(foundRowIndex, 16).setValue(numVal);
        mainSheet.getRange(foundRowIndex, 19).setValue(numVal * 0.20);
      }
      // (d) Update Column 14 (N): Schedule Date
      if (data.scheduleDate !== undefined && data.scheduleDate !== '') {
        mainSheet.getRange(foundRowIndex, 14).setValue(data.scheduleDate);
      }
      // (e) Update Column 15 (O): Scheduled Time
      if (data.scheduledTime !== undefined && data.scheduledTime !== '') {
        mainSheet.getRange(foundRowIndex, 15).setValue(data.scheduledTime);
      }

      // (f) Record Historical Log into 'Followup' sheet
      var followupSheet = ss.getSheetByName("Followup");
      if (!followupSheet) {
        followupSheet = ss.insertSheet("Followup");
        followupSheet.appendRow([
          "Log Timestamp",
          "Order ID",
          "Customer Name",
          "Customer Contact",
          "Previous Followup Status",
          "New Followup Status",
          "Order Status",
          "Order Value",
          "Schedule Date",
          "Scheduled Time",
          "Updated By",
          "Notes / Remarks"
        ]);
        followupSheet.getRange(1, 1, 1, 12).setFontWeight("bold").setBackground("#e2e8f0");
      }

      var finalOrderVal = (data.orderValue !== undefined && data.orderValue !== '') ? data.orderValue : prevOrderVal;
      var finalSchedDate = (data.scheduleDate !== undefined && data.scheduleDate !== '') ? data.scheduleDate : prevScheduleDate;
      var finalSchedTime = (data.scheduledTime !== undefined && data.scheduledTime !== '') ? data.scheduledTime : prevScheduleTime;

      followupSheet.appendRow([
        timestamp,
        orderIdToFind,
        customerName,
        customerContact,
        prevFollowupStatus,
        newFollowupStatus || prevFollowupStatus,
        newOrderStatus || prevOrderStatus,
        finalOrderVal,
        finalSchedDate,
        finalSchedTime,
        updatedBy,
        note
      ]);

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Order #' + orderIdToFind + ' updated in Sheet1 & logged in Followup sheet',
        orderId: orderIdToFind,
        followupStatus: newFollowupStatus,
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
  
  var orderVal = parseFloat(data.orderValue) || 0;
  var calculatedProfit = orderVal * 0.20; // 20% profit calculation
  
  var rowData = [
    newOrderId,                  // 0: Order Id
    data.customerName || '',     // 1: Customer Name
    data.customerContact || '',  // 2: Customer Contact
    data.gender || '',           // 3: Gender
    data.createDate || '',       // 4: Create Date
    data.orderChannel || '',     // 5: Order Channel
    data.createdByNum || '',     // 6: Agent ID
    data.createdByName || '',    // 7: Agent Name
    data.productCategory || '',  // 8: Product catrgory
    data.productName || '',      // 9: Product Name
    data.city || '',             // 10: City
    data.deliveryArea || '',     // 11: Delivery Area
    data.addressDetails || '',   // 12: Address Details
    data.scheduleDate || '',     // 13: Schedule Date
    data.scheduledTime || '',    // 14: Scheduled Time
    orderVal,                    // 15: Order Value
    data.orderStatus || 'Pending',     // 16: Order Status
    data.followupStatus || 'Pending',  // 17: Folllowup Status
    calculatedProfit             // 18: Profit
  ];
  
  mainSheet.appendRow(rowData);
  
  return ContentService.createTextOutput(JSON.stringify({status: 'success', orderId: newOrderId}))
    .setMimeType(ContentService.MimeType.JSON);
}

function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
}`;
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
