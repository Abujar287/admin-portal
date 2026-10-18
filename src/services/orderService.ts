import { AgentUser, DateFilterType, OrderItem, FollowupHistoryItem } from '../types';
import { INITIAL_AGENTS, INITIAL_ORDERS } from '../data/mockOrders';
import * as XLSX from 'xlsx';

export const DEFAULT_SCRIPT_URL =
  (import.meta.env?.VITE_GOOGLE_SCRIPT_URL as string) ||
  'https://script.google.com/macros/s/AKfycbznJBoaggkUhg0ztkcmJpEyeaiuJRVRJX7oItiIgzWqhNPkYIbG3zjnEe2Hn1voDFFg/exec';

export const DEFAULT_SHEET_ID = '1CKnS6A3okk6igZRIQCcBCJPEo-J56xwXTYJL8Dg5AiA';

export function extractSheetId(input: string): string | null {
  const clean = String(input || '').trim();
  if (/^[a-zA-Z0-9-_]{25,}$/.test(clean)) {
    return clean;
  }
  const match = clean.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return null;
}

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

  /**
   * Fetches data directly from Google Sheets using GViz JSONP (bypasses browser CORS on Vercel/static hosts)
   */
  static async fetchSheetViaGvizJsonp(sheetId: string = DEFAULT_SHEET_ID, sheetTab: string = 'orders'): Promise<any[][]> {
    const parseGvizJson = (rawText: string): any[][] => {
      const jsonStr = rawText
        .replace(/^[\s\S]*?google\.visualization\.Query\.setResponse\(/, '')
        .replace(/^[\s\S]*?__gviz_cb_[a-zA-Z0-9]+\(/, '')
        .replace(/\);?\s*$/, '');
      const data = JSON.parse(jsonStr);
      if (!data || !data.table) return [];
      const cols = (data.table.cols || []).map((c: any) => c ? (c.label || c.id || '') : '');
      const rows: any[][] = [cols];
      for (const r of data.table.rows || []) {
        if (!r || !r.c) continue;
        const rowValues = r.c.map((cell: any) => {
          if (!cell) return '';
          if (cell.f !== undefined && cell.f !== null) return String(cell.f);
          if (cell.v !== undefined && cell.v !== null) return String(cell.v);
          return '';
        });
        rows.push(rowValues);
      }
      return rows;
    };

    // 1. Browser JSONP via dynamic <script> tag (works anywhere without CORS)
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      try {
        const rows = await new Promise<any[][]>((resolve, reject) => {
          const cbId = '__gviz_cb_' + Math.random().toString(36).substring(2, 9);
          const script = document.createElement('script');
          let completed = false;

          const cleanup = () => {
            completed = true;
            try { delete (window as any)[cbId]; } catch {}
            if (script.parentNode) script.parentNode.removeChild(script);
          };

          const timer = setTimeout(() => {
            if (!completed) {
              cleanup();
              reject(new Error('GViz JSONP timeout'));
            }
          }, 25000);

          (window as any)[cbId] = (data: any) => {
            clearTimeout(timer);
            cleanup();
            try {
              if (!data || !data.table) {
                reject(new Error('Invalid GViz table response'));
                return;
              }
              const cols = (data.table.cols || []).map((c: any) => c ? (c.label || c.id || '') : '');
              const parsedRows: any[][] = [cols];
              for (const r of data.table.rows || []) {
                if (!r || !r.c) continue;
                const rowValues = r.c.map((cell: any) => {
                  if (!cell) return '';
                  if (cell.f !== undefined && cell.f !== null) return String(cell.f);
                  if (cell.v !== undefined && cell.v !== null) return String(cell.v);
                  return '';
                });
                parsedRows.push(rowValues);
              }
              resolve(parsedRows);
            } catch (err) {
              reject(err);
            }
          };

          script.src = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=responseHandler:${cbId}&sheet=${encodeURIComponent(sheetTab)}`;
          script.onerror = () => {
            clearTimeout(timer);
            cleanup();
            reject(new Error('GViz script tag failed to load'));
          };
          document.body.appendChild(script);
        });

        if (rows && rows.length > 0) return rows;
      } catch (scriptErr) {
        console.warn('Browser JSONP failed, attempting direct fetch:', scriptErr);
      }
    }

    // 2. Direct fetch fallback
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetTab)}`;
    const res = await fetch(url);
    const text = await res.text();
    return parseGvizJson(text);
  }

  static async fetchSheetTabsAndOrders(scriptUrl?: string): Promise<{ tabs: string[]; orders: OrderItem[]; source: 'google_sheets' | 'local_storage'; error?: string }> {
    const url = scriptUrl || this.getScriptUrl();
    const targetSheetId = extractSheetId(url) || DEFAULT_SHEET_ID;

    // 1. Try server/Vercel proxy route
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const res = await fetch(`/api/fetch-orders?url=${encodeURIComponent(url || DEFAULT_SCRIPT_URL)}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json, text/csv, */*' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const jsonRes = await res.json();
        if (jsonRes.success && jsonRes.data) {
          const tabs: string[] = Array.isArray(jsonRes.tabs) && jsonRes.tabs.length > 0
            ? jsonRes.tabs
            : ['orders', 'Sheet5', 'Followup'];

          let rawOrders = jsonRes.data;
          if (rawOrders && typeof rawOrders === 'object' && !Array.isArray(rawOrders)) {
            if (Array.isArray(rawOrders.orders)) rawOrders = rawOrders.orders;
            else if (Array.isArray(rawOrders.rows)) rawOrders = rawOrders.rows;
            else if (Array.isArray(rawOrders.data)) rawOrders = rawOrders.data;
            else if (Array.isArray(rawOrders.values)) rawOrders = rawOrders.values;
          }

          const parsed = this.parseGoogleSheetRows(rawOrders);
          if (parsed.length > 0) {
            this.saveLocalOrders(parsed);
            return { tabs, orders: parsed, source: 'google_sheets' };
          }
        }
      }
    } catch (proxyErr) {
      console.warn('Proxy tabs/orders fetch failed, falling back to direct GViz:', proxyErr);
    }

    // 2. Direct GViz JSONP fallback (essential for Vercel static deployments)
    try {
      const gvizRows = await this.fetchSheetViaGvizJsonp(targetSheetId, 'orders');
      if (gvizRows && gvizRows.length > 1) {
        const parsed = this.parseGoogleSheetRows(gvizRows);
        if (parsed.length > 0) {
          this.saveLocalOrders(parsed);
          return { tabs: ['orders', 'Sheet5', 'Followup'], orders: parsed, source: 'google_sheets' };
        }
      }
    } catch (directErr) {
      console.warn('Direct GViz tabs/orders fetch failed:', directErr);
    }

    const local = await this.getLocalOrders();
    return { tabs: ['orders', 'Sheet5', 'Followup'], orders: local, source: 'local_storage' };
  }

  static async fetchAgentsFromSheet(scriptUrl?: string): Promise<AgentUser[]> {
    const url = scriptUrl || this.getScriptUrl();
    const targetSheetId = extractSheetId(url || '') || DEFAULT_SHEET_ID;

    // Check candidate tabs ('users' requested by user, or 'users details')
    const candidateTabs = ['users', 'users details', 'Users', 'Users Details'];

    // 1. Try server proxy route
    for (const tabName of candidateTabs) {
      try {
        const res = await fetch(`/api/fetch-orders?url=${encodeURIComponent(url || DEFAULT_SCRIPT_URL)}&tab=${encodeURIComponent(tabName)}`);
        if (res.ok) {
          const jsonRes = await res.json();
          if (jsonRes.success && Array.isArray(jsonRes.data) && jsonRes.data.length > 0) {
            const rawData = jsonRes.data;
            const parsed = this.parseAgentSheetRows(rawData);
            // Tab exists in sheet! Store exactly what is in the sheet (even if 0 accounts)
            this.saveAgents(parsed);
            return parsed;
          }
        }
      } catch (err) {
        console.warn(`Failed to fetch agents via proxy from ${tabName}:`, err);
      }
    }

    // 2. Direct GViz fallback
    for (const tabName of candidateTabs) {
      try {
        const gvizRows = await this.fetchSheetViaGvizJsonp(targetSheetId, tabName);
        if (Array.isArray(gvizRows) && gvizRows.length > 0) {
          const parsed = this.parseAgentSheetRows(gvizRows);
          this.saveAgents(parsed);
          return parsed;
        }
      } catch (directErr) {
        console.warn(`Direct GViz fetch for ${tabName} failed:`, directErr);
      }
    }

    return this.getAgents();
  }

  static async saveAgentToSheet(agent: AgentUser): Promise<{ success: boolean; error?: string; rawResponse?: any }> {
    const scriptUrl = this.getScriptUrl();
    if (!scriptUrl) {
      return { success: false, error: 'No Google Script URL configured' };
    }

    try {
      const payload = {
        url: scriptUrl,
        action: 'saveUser',
        user_id: agent.user,
        user_name: agent.name || agent.user,
        email: agent.email || '',
        password: agent.pass || '',
        team: agent.team || 'Acquisition',
        role: agent.role || 'Agent',
        team_leader: Array.isArray(agent.teamLeaders) && agent.teamLeaders.length > 0 
          ? agent.teamLeaders.join(', ') 
          : (agent.teamLeaderId || ''),
        permission: JSON.stringify(agent.permissions || {}),
        birthday: agent.birthday || '',
        blood_group: agent.bloodGroup || '',
        status: agent.status || 'active'
      };

      const res = await fetch('/api/proxy-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to sync with Google Sheet' };
      }

      // Check whether Google Apps Script actually executed saveUser or fell back to order creation
      let parsedResp: any = null;
      try {
        parsedResp = typeof data.response === 'string' ? JSON.parse(data.response) : data.response;
      } catch {}

      if (parsedResp && (parsedResp.orderId !== undefined || parsedResp.order_id !== undefined)) {
        return {
          success: false,
          error: 'Apps Script Outdated: Google Sheet Apps Script does not have the updated Code.gs! It treated this user as a new order. Please update Code.gs in your Google Sheet (Extensions > Apps Script) and deploy a "New version".'
        };
      }

      if (parsedResp && parsedResp.status === 'error') {
        return {
          success: false,
          error: parsedResp.message || 'Google Sheet returned error while saving user'
        };
      }

      return { success: true, rawResponse: parsedResp };
    } catch (e: any) {
      console.error('saveAgentToSheet error:', e);
      return { success: false, error: e.message || 'Network error' };
    }
  }

  static async deleteAgentFromSheet(userId: string): Promise<{ success: boolean; error?: string }> {
    const scriptUrl = this.getScriptUrl();
    if (!scriptUrl) return { success: false, error: 'No script URL' };
    try {
      const payload = {
        url: scriptUrl,
        action: 'deleteUser',
        user_id: userId
      };
      const res = await fetch('/api/proxy-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      let parsedResp: any = null;
      try {
        parsedResp = typeof data.response === 'string' ? JSON.parse(data.response) : data.response;
      } catch {}

      if (parsedResp && (parsedResp.orderId !== undefined || parsedResp.order_id !== undefined)) {
        return {
          success: false,
          error: 'Apps Script Outdated: Please update Code.gs in Extensions > Apps Script with New Version.'
        };
      }

      return { success: !!data.success };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  private static parseAgentSheetRows(data: any): AgentUser[] {
    if (!Array.isArray(data) || data.length === 0) return [];

    // Filter out completely empty rows
    const nonNullRows = data.filter((r: any) => {
      if (!r) return false;
      if (Array.isArray(r)) {
        return r.some(c => c !== undefined && c !== null && String(c).trim() !== '');
      }
      if (typeof r === 'object') {
        return Object.values(r).some(c => c !== undefined && c !== null && String(c).trim() !== '');
      }
      return true;
    });

    if (nonNullRows.length === 0) return [];

    // Case 1: Array of JSON objects
    if (typeof nonNullRows[0] === 'object' && !Array.isArray(nonNullRows[0])) {
      return nonNullRows.map((item: any): AgentUser | null => {
        const u = String(item.user_id || item.user || item.id || item.username || '').trim();
        if (!u) return null;
        let perms = undefined;
        try {
          if (item.permission || item.permissions) {
            perms = typeof item.permission === 'object' ? item.permission : JSON.parse(item.permission || item.permissions);
          }
        } catch {}

        const tlRaw = String(item.team_leader || item.teamleader || item.teamLeader || item.teamLeaders || '');
        const tlArr = tlRaw ? tlRaw.split(',').map((s: string) => s.trim()).filter(Boolean) : [];

        return {
          user: u,
          pass: String(item.password || item.pass || '123456'),
          name: String(item.user_name || item.name || u),
          role: String(item.role || 'Agent'),
          team: String(item.team || 'Acquisition'),
          email: String(item.email || ''),
          status: (String(item.status || 'active').toLowerCase() === 'deactivated' ? 'deactivated' : 'active') as 'active' | 'deactivated',
          teamLeaderId: tlRaw,
          teamLeaders: tlArr,
          permissions: perms,
          birthday: String(item.birthday || ''),
          bloodGroup: String(item['blood group'] || item.blood_group || item.bloodGroup || '')
        };
      }).filter((a): a is AgentUser => a !== null && !!a.user);
    }

    // Case 2: 2D array of rows
    const firstRow = nonNullRows[0].map((h: any) => String(h || '').trim().toLowerCase());
    const findCol = (...candidates: string[]) => {
      for (const cand of candidates) {
        const norm = cand.toLowerCase().replace(/[\s_-]+/g, '');
        const idx = firstRow.findIndex((h: string) => {
          const normH = h.replace(/[\s_-]+/g, '');
          return normH === norm || h === cand.toLowerCase() || h.includes(cand.toLowerCase());
        });
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const idxId = findCol('user_id', 'userid', 'user', 'id');
    const idxName = findCol('user_name', 'username', 'name', 'agent_name');
    const idxEmail = findCol('email', 'mail');
    const idxPass = findCol('password', 'pass');
    const idxTeam = findCol('team', 'channel', 'department');
    const idxRole = findCol('role');
    const idxLeader = findCol('team_leader', 'teamleader', 'leader');
    const idxPerm = findCol('permission', 'permissions');
    const idxBday = findCol('birthday', 'birth_date', 'dob');
    const idxBlood = findCol('blood group', 'bloodgroup', 'blood');
    const idxStatus = findCol('status');

    const dataRows = nonNullRows.slice(1);
    return dataRows.map((row: any[]): AgentUser | null => {
      const u = String(row[idxId !== -1 ? idxId : 0] || '').trim();
      // Ignore if user cell is header or empty
      if (!u || u.toLowerCase() === 'user_id' || u.toLowerCase() === 'user') return null;

      const p = String(row[idxPass !== -1 ? idxPass : 3] || '123456');
      const nm = String(row[idxName !== -1 ? idxName : 1] || u);
      const em = String(row[idxEmail !== -1 ? idxEmail : 2] || '');
      const tm = String(row[idxTeam !== -1 ? idxTeam : 4] || 'Acquisition');
      const rl = String(row[idxRole !== -1 ? idxRole : 5] || 'Agent');
      const tl = String(row[idxLeader !== -1 ? idxLeader : 6] || '');
      const tlArr = tl ? tl.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
      const permRaw = idxPerm !== -1 ? String(row[idxPerm] || '') : '';
      let perms = undefined;
      try {
        if (permRaw) perms = JSON.parse(permRaw);
      } catch {}

      const bday = idxBday !== -1 ? String(row[idxBday] || '') : '';
      const bld = idxBlood !== -1 ? String(row[idxBlood] || '') : '';
      const st = (String(row[idxStatus !== -1 ? idxStatus : 10] || 'active').toLowerCase() === 'deactivated' ? 'deactivated' : 'active') as 'active' | 'deactivated';

      return {
        user: u,
        pass: p,
        name: nm,
        role: rl,
        team: tm,
        email: em,
        status: st,
        teamLeaderId: tl,
        teamLeaders: tlArr,
        permissions: perms,
        birthday: bday,
        bloodGroup: bld
      };
    }).filter((a): a is AgentUser => a !== null && !!a.user);
  }

  private static resolveAgentName(aId: string, sheetNm?: string): string {
    if (sheetNm !== undefined && sheetNm !== null) {
      return String(sheetNm).trim();
    }
    return '';
  }

  static getAgents(): AgentUser[] {
    let storedAgents: AgentUser[] = [];
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.AGENTS);
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          storedAgents = parsed;
        }
      }
    } catch {}

    const map = new Map<string, AgentUser>();
    // Pre-populate with INITIAL_AGENTS
    if (Array.isArray(INITIAL_AGENTS)) {
      INITIAL_AGENTS.forEach(a => {
        const k = String(a.user || '').trim().toLowerCase();
        if (k) map.set(k, a);
      });
    }

    // Merge stored agents (stored agents take precedence)
    storedAgents.forEach(a => {
      const k = String(a.user || '').trim().toLowerCase();
      if (k) {
        map.set(k, { ...(map.get(k) || {}), ...a });
      }
    });

    const merged = Array.from(map.values());
    try {
      localStorage.setItem(STORAGE_KEYS.AGENTS, JSON.stringify(merged));
    } catch {}
    return merged;
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

    try {
      let maxCust = 0;
      let maxOrd = 0;
      const phoneMap: Record<string, string> = {};
      for (const o of orders) {
        const c = Number(o.customer_id || o.customerId);
        if (!isNaN(c) && c > maxCust) maxCust = c;
        const ord = Number(o.order_id || o.id);
        if (!isNaN(ord) && ord > maxOrd) maxOrd = ord;

        const phone = String(o.customer_mobile || o.customerContact || '').replace(/\D/g, '').slice(-10);
        if (phone && (o.customer_id || o.customerId)) {
          phoneMap[phone] = String(o.customer_id || o.customerId);
        }
      }
      if (maxCust > 0) {
        localStorage.setItem('agent_portal_max_customer_id', String(maxCust));
      }
      if (maxOrd > 0) {
        localStorage.setItem('agent_portal_max_order_id', String(maxOrd));
      }
      if (Object.keys(phoneMap).length > 0) {
        const existing = JSON.parse(localStorage.getItem('customer_id_map') || '{}');
        localStorage.setItem('customer_id_map', JSON.stringify({ ...existing, ...phoneMap }));
      }
    } catch {}
  }

  static getMaxIds(orders?: OrderItem[]): { maxOrderId: number; maxCustomerId: number } {
    let maxOrd = Number(localStorage.getItem('agent_portal_max_order_id')) || 0;
    let maxCust = Number(localStorage.getItem('agent_portal_max_customer_id')) || 0;

    const source = (orders && orders.length > 0) ? orders : (memoryOrders || []);
    for (const o of source) {
      const c = Number(o.customer_id || o.customerId);
      if (!isNaN(c) && c > maxCust) maxCust = c;
      const ord = Number(o.order_id || o.id);
      if (!isNaN(ord) && ord > maxOrd) maxOrd = ord;
    }
    return { maxOrderId: maxOrd, maxCustomerId: maxCust };
  }

  /**
   * Generates formatted timestamp in Bangladesh Standard Time (BDT / Asia/Dhaka, GMT+6):
   * Format: YYYY-MM-DD HH:mm:ss
   */
  static getBdtTimestamp(date: Date = new Date()): string {
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Dhaka',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      const parts = formatter.formatToParts(date);
      const getPart = (type: string) => (parts.find(p => p.type === type) || {}).value || '';
      const yyyy = getPart('year');
      const mm = getPart('month');
      const dd = getPart('day');
      const hh = getPart('hour');
      const min = getPart('minute');
      const ss = getPart('second');
      if (yyyy && mm && dd) {
        return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
      }
    } catch {}

    // Fallback using manual BDT offset (+6 hours from UTC)
    const bdtMs = date.getTime() + (360 + date.getTimezoneOffset()) * 60000;
    const bdt = new Date(bdtMs);
    const y = bdt.getFullYear();
    const m = String(bdt.getMonth() + 1).padStart(2, '0');
    const d = String(bdt.getDate()).padStart(2, '0');
    const h = String(bdt.getHours()).padStart(2, '0');
    const min = String(bdt.getMinutes()).padStart(2, '0');
    const s = String(bdt.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${d} ${h}:${min}:${s}`;
  }

  /**
   * Retrieves the maximum sequential followup_id from storage or history.
   */
  static getMaxFollowupId(history?: FollowupHistoryItem[]): number {
    let maxFid = Number(localStorage.getItem('agent_portal_max_followup_id')) || 0;
    const source = (history && history.length > 0) ? history : this.getFollowupHistory();
    for (const h of source) {
      const fid = Number(h.followupId || h.id);
      if (!isNaN(fid) && fid > maxFid) maxFid = fid;
    }
    return maxFid;
  }

  /**
   * Fetches the Followup history tab from Google Sheet, parses rows, tracks max followup_id, and caches.
   */
  static async fetchFollowupHistory(): Promise<FollowupHistoryItem[]> {
    try {
      let rows: any[][] = [];

      // 1. Try server proxy route
      try {
        const res = await fetch('/api/fetch-orders?tab=Followup');
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.data) && json.data.length >= 2) {
            rows = json.data;
          }
        }
      } catch (proxyErr) {
        console.warn('Proxy fetch for Followup failed:', proxyErr);
      }

      // 2. Direct GViz fallback (works on Vercel without proxy server)
      if (!rows || rows.length < 2) {
        try {
          const scriptUrl = this.getScriptUrl();
          const sheetId = extractSheetId(scriptUrl || '') || DEFAULT_SHEET_ID;
          const gvizRows = await this.fetchSheetViaGvizJsonp(sheetId, 'Followup');
          if (Array.isArray(gvizRows) && gvizRows.length >= 2) {
            rows = gvizRows;
          }
        } catch (gvizErr) {
          console.warn('Direct GViz fetch for Followup failed:', gvizErr);
        }
      }

      if (!Array.isArray(rows) || rows.length < 2) return this.getFollowupHistory();

      const headers = rows[0].map((h: any) => String(h || '').trim().toLowerCase());
      const findCol = (...names: string[]) => {
        for (const n of names) {
          const idx = headers.findIndex((h: string) => h === n);
          if (idx !== -1) return idx;
        }
        for (const n of names) {
          const idx = headers.findIndex((h: string) => h.includes(n));
          if (idx !== -1) return idx;
        }
        return -1;
      };

      const idxTs = findCol('log timestamp', 'timestamp', 'date');
      const idxFid = findCol('followup_id', 'followup id');
      const idxOid = findCol('order_id', 'order id');
      const idxCname = findCol('customer_name', 'customer name');
      const idxCmob = findCol('customer_mobile', 'customer contact', 'mobile');
      const idxPrev = findCol('previous_followup_status', 'previous status');
      const idxNew = findCol('new_followup_status', 'new status');
      const idxOst = findCol('order_status', 'order status');
      const idxVal = findCol('order_value', 'order value', 'value');
      const idxScDt = findCol('schedule_date', 'schedule date');
      const idxScTm = findCol('schedule_time', 'schedule time');
      const idxUpBy = findCol('updated_by', 'updated by');
      const idxUpByNm = findCol('updated_by_name', 'updated by name');
      const idxStCh = findCol('status_change', 'status change');
      const idxAct = findCol('action');

      let maxFid = Number(localStorage.getItem('agent_portal_max_followup_id')) || 0;
      const parsedItems: FollowupHistoryItem[] = [];

      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r || !Array.isArray(r) || r.length === 0 || !r.some((c: any) => c !== undefined && c !== null && String(c).trim() !== '')) {
          continue;
        }
        const fidRaw = r[idxFid !== -1 ? idxFid : 1];
        const fidNum = parseInt(String(fidRaw), 10);
        if (!isNaN(fidNum) && fidNum > maxFid) {
          maxFid = fidNum;
        }

        const rawTs = String(r[idxTs !== -1 ? idxTs : 0] || '');
        let uBy = String(r[idxUpBy !== -1 ? idxUpBy : 11] || '1');
        let uByName = String(r[idxUpByNm !== -1 ? idxUpByNm : 12] || '');
        if (!uByName && uBy.includes('(@')) {
          const m = uBy.match(/\(@(.*)\)/);
          if (m) {
            uByName = uBy.replace(/\s*\(@.*\)/, '').replace('@', '').trim();
            uBy = m[1].trim();
          }
        } else if (!uByName && uBy.startsWith('@')) {
          uBy = uBy.substring(1);
        }

        // Manager access should strictly have update_by as '1', not email
        const lowerUBy = uBy.toLowerCase();
        const lowerUName = uByName.toLowerCase();
        if (
          lowerUBy === 'manager' ||
          lowerUBy === 'admin' ||
          lowerUBy === '1' ||
          lowerUBy.includes('abujar') ||
          lowerUBy.includes('@') ||
          lowerUName === 'manager' ||
          lowerUName === 'manager (admin)' ||
          lowerUName.includes('manager') ||
          lowerUName.includes('admin')
        ) {
          uBy = '1';
          if (!uByName || uByName.includes('@')) uByName = 'Manager';
        }

        parsedItems.push({
          id: String(fidRaw || i),
          followupId: !isNaN(fidNum) ? fidNum : (fidRaw || i),
          orderId: String(r[idxOid !== -1 ? idxOid : 2] || ''),
          customerName: String(r[idxCname !== -1 ? idxCname : 3] || ''),
          customerContact: String(r[idxCmob !== -1 ? idxCmob : 4] || ''),
          previousStatus: String(r[idxPrev !== -1 ? idxPrev : 5] || 'Pending'),
          newStatus: String(r[idxNew !== -1 ? idxNew : 6] || 'Pending'),
          orderStatus: String(r[idxOst !== -1 ? idxOst : 7] || 'Pending'),
          orderValue: Number(r[idxVal !== -1 ? idxVal : 8]) || 0,
          scheduleDate: String(r[idxScDt !== -1 ? idxScDt : 9] || ''),
          scheduledTime: String(r[idxScTm !== -1 ? idxScTm : 10] || ''),
          updatedBy: uBy,
          updatedByName: uByName,
          action: String(r[idxAct !== -1 ? idxAct : 14] || 'Follow-up Update'),
          notes: String(r[idxStCh !== -1 ? idxStCh : 13] || ''),
          timestamp: rawTs
        });
      }

      if (maxFid > 0) {
        localStorage.setItem('agent_portal_max_followup_id', String(maxFid));
      }

      if (parsedItems.length > 0) {
        // Reverse so newest audit entries appear at top
        const ordered = [...parsedItems].reverse();
        this.saveFollowupHistory(ordered);
        return ordered;
      }
      return this.getFollowupHistory();
    } catch (e) {
      console.warn('Failed to fetch Followup sheet history:', e);
      return this.getFollowupHistory();
    }
  }

  static resolveCustomerIdForPhone(phone: string, orders?: OrderItem[]): { customerId: string; isExisting: boolean } {
    const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
    const source = (orders && orders.length > 0) ? orders : (memoryOrders || []);

    if (cleanPhone) {
      // 1. Look in orders list
      const match = source.find(o => {
        const oPhone = String(o.customer_mobile || o.customerContact || '').replace(/\D/g, '').slice(-10);
        return oPhone && oPhone === cleanPhone;
      });
      if (match && (match.customer_id || match.customerId)) {
        return { customerId: String(match.customer_id || match.customerId), isExisting: true };
      }

      // 2. Look in customer_id_map
      try {
        const map = JSON.parse(localStorage.getItem('customer_id_map') || '{}');
        if (map[cleanPhone]) {
          return { customerId: String(map[cleanPhone]), isExisting: true };
        }
      } catch {}
    }

    // 3. New customer: strictly max customer_id from sheet + 1
    const { maxCustomerId } = this.getMaxIds(source);
    return { customerId: String(maxCustomerId + 1), isExisting: false };
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
    const targetSheetId = extractSheetId(scriptUrl || '') || DEFAULT_SHEET_ID;

    // 1. Try server / Vercel proxy route
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

      const res = await fetch(`/api/fetch-orders?url=${encodeURIComponent(scriptUrl || DEFAULT_SCRIPT_URL)}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
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
            this.saveLocalOrders(parsed);
            try {
              localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
            } catch (e) {}

            return { orders: parsed, source: 'google_sheets' };
          }
        }
      }
    } catch (proxyErr) {
      console.warn('Proxy fetchOrders failed, falling back to direct Google Sheet GViz:', proxyErr);
    }

    // 2. Direct GViz fallback (CRITICAL: fetches all 5002 orders on Vercel without proxy server)
    try {
      const gvizRows = await this.fetchSheetViaGvizJsonp(targetSheetId, 'orders');
      if (Array.isArray(gvizRows) && gvizRows.length > 1) {
        const parsed = this.parseGoogleSheetRows(gvizRows);
        if (parsed.length > 0) {
          this.saveLocalOrders(parsed);
          try {
            localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
          } catch (e) {}

          return { orders: parsed, source: 'google_sheets' };
        }
      }
    } catch (directErr) {
      console.warn('Direct GViz fetchOrders failed:', directErr);
    }

    // 3. Fallback to IndexedDB cache
    const idbOrders = await idbGetOrders();
    if (idbOrders && idbOrders.length > 0) {
      memoryOrders = idbOrders;
      return { orders: idbOrders, source: 'local_storage' };
    }

    return { orders: localOrders, source: 'local_storage' };
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
        const crDt = String(o.create_date || o.createDate || o.createdAt || this.getBdtTimestamp());
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
    const firstRow = rowsData[0].map((h: any) => String(h || '').trim().toLowerCase());

    if (firstRow.some((col: any) => col.includes('order') || col.includes('customer') || col.includes('agent') || col.includes('date'))) {
      hasHeader = true;
    }

    const headers = hasHeader ? firstRow : [];
    const rows = hasHeader ? rowsData.slice(1) : rowsData;

    const findCol = (...candidates: string[]): number => {
      for (const candidate of candidates) {
        const normCand = candidate.toLowerCase().replace(/[\s_-]+/g, '');
        const idx = headers.findIndex((h: any) => {
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
        const crDt = valOrEmpty(idxCreateDt, this.getBdtTimestamp(), 5);
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

    const { maxOrderId } = this.getMaxIds(localOrders);
    const orderId = String(newOrder.order_id || newOrder.id || (maxOrderId + 1));

    // Customer Id management: reuse customer_id if phone exists in sheet, else max customer_id + 1
    const contactPhone = String(newOrder.customer_mobile || newOrder.customerContact || '').trim();
    let customerId = String(newOrder.customer_id || newOrder.customerId || '').trim();

    if (!customerId || customerId === '0') {
      const resolved = this.resolveCustomerIdForPhone(contactPhone, localOrders);
      customerId = resolved.customerId;
    }

    // Cache phone to customerId
    const cleanPhone = contactPhone.replace(/\D/g, '').slice(-10);
    if (cleanPhone && customerId) {
      try {
        const customerMap: Record<string, string> = JSON.parse(localStorage.getItem('customer_id_map') || '{}');
        customerMap[cleanPhone] = customerId;
        localStorage.setItem('customer_id_map', JSON.stringify(customerMap));
      } catch {}
    }

    // Update global maximums in storage
    try {
      const numCust = Number(customerId);
      if (!isNaN(numCust) && numCust > 0) {
        const prev = Number(localStorage.getItem('agent_portal_max_customer_id')) || 0;
        localStorage.setItem('agent_portal_max_customer_id', String(Math.max(prev, numCust)));
      }
      const numOrd = Number(orderId);
      if (!isNaN(numOrd) && numOrd > 0) {
        const prev = Number(localStorage.getItem('agent_portal_max_order_id')) || 0;
        localStorage.setItem('agent_portal_max_order_id', String(Math.max(prev, numOrd)));
      }
    } catch {}

    const numOrderValue = Number(newOrder.order_value ?? newOrder.orderValue ?? 0);
    const calculatedProfit = newOrder.profit !== undefined ? Number(newOrder.profit) : Math.round(numOrderValue * 0.20);
    const cName = String(newOrder.customer_name || newOrder.customerName || 'Customer');
    const gen = String(newOrder.gender || 'Other');
    const crDate = String(newOrder.create_date || newOrder.createDate || this.getBdtTimestamp());
    const ch = String(newOrder.order_channel || newOrder.orderChannel || 'Acquisition');
    const agId = String(newOrder.agent_id || newOrder.agentId || '1');
    const rawAgNm = String(newOrder.agent_name || newOrder.agentName || '');
    const agNm = this.resolveAgentName(agId, rawAgNm);
    const pCat = String(newOrder.product_category || newOrder.productCategory || 'Electronics');
    const pNm = String(newOrder.product_name || newOrder.productName || 'Product Item');
    const ct = String(newOrder.city || 'Dhaka');
    const dArea = String(newOrder.delivery_area || newOrder.deliveryArea || 'Gulshan');
    const addr = String(newOrder.address_details || newOrder.addressDetails || '-');
    const scDate = String(newOrder.schedule_date || newOrder.scheduleDate || this.getBdtTimestamp().slice(0, 10));
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

        try {
          const proxyRes = await fetch('/api/proxy-script', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(bodyData)
          });
          if (proxyRes.ok) {
            remoteSynced = true;
          } else {
            throw new Error(`Proxy error ${proxyRes.status}`);
          }
        } catch (proxyErr) {
          console.warn('Google Apps Script proxy error, attempting direct POST:', proxyErr);
          try {
            const params = new URLSearchParams();
            for (const [key, val] of Object.entries(bodyData)) {
              params.append(key, String(val ?? ''));
            }
            await fetch(scriptUrl, {
              method: 'POST',
              mode: 'no-cors',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: params.toString()
            });
            remoteSynced = true;
          } catch (directErr) {
            console.warn('Direct Google Apps Script doPost error:', directErr);
          }
        }
      } catch (err) {
        console.warn('Google Apps Script createOrder overall error:', err);
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

    // If order is already Delivered or Cancelled, it CANNOT be edited from ANY access!
    const currentOrderFollowup = (existingOrder?.followup_status || existingOrder?.followupStatus || '').toLowerCase();
    const currentOrderStatus = (existingOrder?.order_status || existingOrder?.orderStatus || '').toLowerCase();
    const isCurrentlyLocked = 
      currentOrderFollowup === 'delivered' || currentOrderFollowup === 'cancelled' ||
      currentOrderStatus === 'delivered' || currentOrderStatus === 'cancelled';
    if (isCurrentlyLocked) {
      console.warn(`Order #${orderId} is locked (Delivered/Cancelled) from all access editing.`);
      return { updatedOrders: orders, historyItem: undefined, remoteSynced: false };
    }

    // Resolve manager / agent user ID and name cleanly (strip '@')
    let uById = updatedBy || '1';
    let uByName = updatedBy || 'Manager';

    if (updatedBy) {
      const trimmed = String(updatedBy).trim();
      if (trimmed.includes('(')) {
        const m = trimmed.match(/^(.*?)\s*\((?:@)?(.*)\)$/);
        if (m && m[1] && m[2]) {
          uByName = m[1].trim();
          uById = m[2].trim().replace(/^@/, '');
        } else {
          uById = trimmed.replace(/^@/, '');
          uByName = trimmed.replace(/^@/, '');
        }
      } else if (trimmed.startsWith('@')) {
        uById = trimmed.substring(1);
        uByName = trimmed.substring(1);
      } else {
        uById = trimmed;
        uByName = trimmed;
      }
    }

    const lowerId = uById.toLowerCase();
    const lowerName = uByName.toLowerCase();
    // Keep the uById and uByName derived from the input updatedBy,
    // do not force override to 'Manager' / '1' if name matches 'manager' etc.
    // This allows individual manager/admin names to show up in audit logs.
    
    // (Removed hardcoded override for manager/admin names here)

    const finalOrderStatus = 'Pending';
    const finalFollowupStatus = updates.followup_status || updates.followupStatus || existingOrder?.followup_status || existingOrder?.followupStatus || 'Pending';
    const currentTimestamp = this.getBdtTimestamp();

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

    // Followup action always records followup_date with BDT timestamp matching Log Timestamp
    let newFollowupDate = updates.followup_date || updates.followupDate || currentTimestamp;
    // Mutually exclusive dates for delivered, cancelled, and followup
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

        return {
          order_id: String(ord.order_id || ord.id || ''),
          id: String(ord.order_id || ord.id || ''),
          customer_id: String(ord.customer_id || ord.customerId || ''),
          customerId: String(ord.customer_id || ord.customerId || ''),
          customer_mobile: String(ord.customer_mobile || ord.customerContact || ''),
          customerContact: String(ord.customer_mobile || ord.customerContact || ''),
          customer_name: String(ord.customer_name || ord.customerName || ''),
          customerName: String(ord.customer_name || ord.customerName || ''),
          gender: String(ord.gender || ''),
          create_date: String(ord.create_date || ord.createDate || ''),
          createDate: String(ord.create_date || ord.createDate || ''),
          order_channel: String(ord.order_channel || ord.orderChannel || ''),
          orderChannel: String(ord.order_channel || ord.orderChannel || ''),
          agent_id: String(ord.agent_id || ord.agentId || ''),
          agentId: String(ord.agent_id || ord.agentId || ''),
          agent_name: String(ord.agent_name || ord.agentName || ''),
          agentName: String(ord.agent_name || ord.agentName || ''),
          product_category: String(ord.product_category || ord.productCategory || ''),
          productCategory: String(ord.product_category || ord.productCategory || ''),
          product_name: String(ord.product_name || ord.productName || ''),
          productName: String(ord.product_name || ord.productName || ''),
          city: String(ord.city || ''),
          delivery_area: String(ord.delivery_area || ord.deliveryArea || ''),
          deliveryArea: String(ord.delivery_area || ord.deliveryArea || ''),
          address_details: String(ord.address_details || ord.addressDetails || ''),
          addressDetails: String(ord.address_details || ord.addressDetails || ''),
          schedule_date: schedDate,
          scheduleDate: schedDate,
          schedule_time: schedTime,
          scheduledTime: schedTime,
          order_value: orderVal,
          orderValue: orderVal,
          profit: profit,
          // CRITICAL: order_status ALWAYS remains 'Pending'
          order_status: 'Pending',
          orderStatus: 'Pending',
          // CRITICAL: followup_status updates with the new status
          followup_status: finalFollowupStatus,
          followupStatus: finalFollowupStatus,
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
      const maxFid = this.getMaxFollowupId(existingHistory);
      nextFollowupId = maxFid + 1;
      localStorage.setItem('agent_portal_max_followup_id', String(nextFollowupId));
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
      if (schedDateChanged) changeDescriptions.push(`Schedule Date: ${prevScDate} -> ${schedDate}`);
      if (schedTimeChanged) changeDescriptions.push(`Schedule Time: ${prevScTime} -> ${schedTime}`);
      if (priceChanged) changeDescriptions.push(`Price: ${prevVal} -> ${orderVal}`);
      
      const statusChangeText = changeDescriptions.length > 0 ? changeDescriptions.join(', ') : 'No Status Change';

      historyItem = {
        id: nextId,
        followupId: nextFollowupId,
        orderId: String(orderId),
        customerName: existingOrder.customer_name || existingOrder.customerName,
        customerContact: existingOrder.customer_mobile || existingOrder.customerContact,
        previousStatus: prevFo,
        newStatus: finalFollowupStatus || prevFo,
        orderStatus: 'Pending',
        orderValue: orderVal,
        scheduleDate: schedDate,
        scheduledTime: schedTime,
        updatedBy: uById,
        updatedByName: uByName,
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

        const finalProfitParam = isCancelled ? 0 : (updates.profit !== undefined ? updates.profit : (orderValToSync !== undefined ? Math.round(Number(orderValToSync) * 0.20) : undefined));

        const bodyData: Record<string, string> = {
          url: scriptUrl,
          action: 'updateFollowup',
          'Log Timestamp': currentTimestamp,
          logTimestamp: currentTimestamp,
          timestamp: currentTimestamp,
          'followup_id': String(nextFollowupId),
          followupId: String(nextFollowupId),
          'order_id': String(orderId),
          orderId: String(orderId),
          'customer_name': existingOrder?.customer_name || existingOrder?.customerName || '',
          customerName: existingOrder?.customer_name || existingOrder?.customerName || '',
          'customer_mobile': existingOrder?.customer_mobile || existingOrder?.customerContact || '',
          customerMobile: existingOrder?.customer_mobile || existingOrder?.customerContact || '',
          customerContact: existingOrder?.customer_mobile || existingOrder?.customerContact || '',
          'previous_followup_status': prevFo,
          previousFollowupStatus: prevFo,
          'order_value': orderValToSync !== undefined ? String(orderValToSync) : String(existingOrder?.order_value || existingOrder?.orderValue || 0),
          orderValue: orderValToSync !== undefined ? String(orderValToSync) : String(existingOrder?.order_value || existingOrder?.orderValue || 0),
          'schedule_date': schedDate,
          scheduleDate: schedDate,
          'schedule_time': schedTime,
          scheduleTime: schedTime,
          scheduledTime: schedTime,
          'updated_by': uById,
          updatedBy: uById,
          'update_by': uById,
          updateBy: uById,
          'updated_by_name': uByName,
          updatedByName: uByName,
          'update_by_name': uByName,
          updateByName: uByName,
          'status_change': statusChangeText,
          statusChange: statusChangeText,
          'change_description': actionStr,
          actionName: actionStr,
          'notes': notes,
          remarks: notes,
          // CRITICAL: order_status ALWAYS remains 'Pending'
          'order_status': 'Pending',
          orderStatus: 'Pending',
          // CRITICAL: Send followup_status in all common parameter names so Google Apps Script captures it
          'followup_status': finalFollowupStatus,
          followupStatus: finalFollowupStatus,
          'new_followup_status': finalFollowupStatus,
          newFollowupStatus: finalFollowupStatus,
          status: finalFollowupStatus,
          // Profit: 20% on Delivered, empty / 0 on others
          profit: String(isDelivered ? (finalProfitParam || Math.round(Number(orderValToSync || existingOrder?.order_value || 0) * 0.20)) : ''),
          // Mutually exclusive dates
          'delivered_date': newDeliveredDate,
          deliveredDate: newDeliveredDate,
          'cancelled_date': newCancelledDate,
          cancelledDate: newCancelledDate,
          'followup_date': newFollowupDate,
          followupDate: newFollowupDate
        };

        console.log('DEBUG: Final Payload sent to Google Sheet:', bodyData);
        try {
          const proxyRes = await fetch('/api/proxy-script', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(bodyData)
          });
          if (proxyRes.ok) {
            const proxyJson = await proxyRes.json();
            console.log('DEBUG: Proxy script response:', proxyJson);
            remoteSynced = proxyJson.success ?? false;
          } else {
            throw new Error(`Proxy returned HTTP ${proxyRes.status}`);
          }
        } catch (proxyErr) {
          console.warn('Google Apps Script status update proxy error, attempting direct POST:', proxyErr);
          try {
            const params = new URLSearchParams();
            for (const [key, val] of Object.entries(bodyData)) {
              params.append(key, String(val ?? ''));
            }
            await fetch(scriptUrl, {
              method: 'POST',
              mode: 'no-cors',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: params.toString()
            });
            remoteSynced = true;
          } catch (directErr) {
            console.warn('Direct Google Apps Script status update error:', directErr);
          }
        }
      } catch (err) {
        console.warn('Google Apps Script status update overall error:', err);
      }
    }

    return { updatedOrders: updated, historyItem, remoteSynced };
  }

  static async updateOrderInSheet(
    orderId: string,
    updates: Partial<OrderItem>,
    updatedBy: string = 'manager',
    notes: string = ''
  ): Promise<{ updatedOrders: OrderItem[]; historyItem?: FollowupHistoryItem; remoteSynced: boolean }> {
    return this.updateOrderStatus(orderId, updates, updatedBy, notes);
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

    const nowTimestamp = this.getBdtTimestamp();
    const nextFollowupId = this.getMaxFollowupId(history) + 1;
    localStorage.setItem('agent_portal_max_followup_id', String(nextFollowupId));

    const sessionRoleUndo = typeof window !== 'undefined' ? sessionStorage.getItem('portal_session_role') : null;
    const normalizedUndoneBy = (
      sessionRoleUndo === 'manager' ||
      !undoneBy ||
      undoneBy.toLowerCase() === 'manager' ||
      undoneBy.toLowerCase() === 'admin' ||
      undoneBy.includes('abujar') ||
      undoneBy.includes('@') ||
      undoneBy === '1'
    ) ? '1' : undoneBy;

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
      updatedBy: normalizedUndoneBy,
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
        params.append('updated_by', normalizedUndoneBy);
        params.append('updatedBy', normalizedUndoneBy);
        params.append('update_by', normalizedUndoneBy);
        params.append('updateBy', normalizedUndoneBy);
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
// 5. Storing complete audit trail in 'Followup' historical sheet with exact 15 columns:
//    Log Timestamp | followup_id | order_id | customer_name | customer_mobile | previous_followup_status | new_followup_status | order_status | order_value | schedule_date | schedule_time | updated_by | updated_by_name | status_change | action
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

  // 0. SAVE / UPDATE USER IN 'users' / 'users details' TAB
  if (action === 'saveUser' || action === 'saveAgent' || action === 'updateAgent' || action === 'addUser') {
    var usersSheet = ss.getSheetByName("users") || ss.getSheetByName("Users") || ss.getSheetByName("users details") || ss.getSheetByName("Users Details");
    if (!usersSheet) {
      usersSheet = ss.insertSheet("users");
      usersSheet.appendRow([
        "user_id",
        "user_name",
        "email",
        "password",
        "team",
        "role",
        "team_leader",
        "permission",
        "birthday",
        "blood group",
        "status"
      ]);
      usersSheet.getRange(1, 1, 1, 11).setFontWeight("bold").setBackground("#e2e8f0");
    }

    var uId = String(data.user_id || data.user || data.userId || '').trim();
    if (!uId) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Missing user_id'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var uName = String(data.user_name || data.name || uId);
    var uEmail = String(data.email || '');
    var uPass = String(data.password || data.pass || '');
    var uTeam = String(data.team || 'Acquisition');
    var uRole = String(data.role || 'Agent');
    var uLeader = String(data.team_leader || data.teamLeader || data.teamLeaders || '');
    var uPerm = String(data.permission || data.permissions || '');
    var uBday = String(data.birthday || '');
    var uBlood = String(data['blood group'] || data.blood_group || data.bloodGroup || '');
    var uStatus = String(data.status || 'active');

    var uRows = usersSheet.getDataRange().getValues();
    var foundIndex = -1;
    var firstEmptyRow = -1;
    for (var u = 1; u < uRows.length; u++) {
      var cellVal = String(uRows[u][0] || '').trim();
      if (!cellVal && firstEmptyRow === -1) {
        firstEmptyRow = u + 1;
      }
      if (cellVal && cellVal.toLowerCase() === uId.toLowerCase()) {
        foundIndex = u + 1; // 1-indexed row in sheet
        break;
      }
    }

    var targetRow = foundIndex > 0 ? foundIndex : (firstEmptyRow > 0 ? firstEmptyRow : -1);

    if (targetRow > 0) {
      usersSheet.getRange(targetRow, 1).setValue(uId);
      usersSheet.getRange(targetRow, 2).setValue(uName);
      usersSheet.getRange(targetRow, 3).setValue(uEmail);
      if (uPass) usersSheet.getRange(targetRow, 4).setValue(uPass);
      usersSheet.getRange(targetRow, 5).setValue(uTeam);
      usersSheet.getRange(targetRow, 6).setValue(uRole);
      usersSheet.getRange(targetRow, 7).setValue(uLeader);
      usersSheet.getRange(targetRow, 8).setValue(uPerm);
      usersSheet.getRange(targetRow, 9).setValue(uBday);
      usersSheet.getRange(targetRow, 10).setValue(uBlood);
      usersSheet.getRange(targetRow, 11).setValue(uStatus);
    } else {
      usersSheet.appendRow([
        uId,
        uName,
        uEmail,
        uPass,
        uTeam,
        uRole,
        uLeader,
        uPerm,
        uBday,
        uBlood,
        uStatus
      ]);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      action: 'saveUser',
      message: 'User ' + uId + ' saved successfully into users tab',
      user_id: uId,
      tab: usersSheet.getName()
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // 0.1 DELETE USER FROM 'users' / 'users details' TAB
  if (action === 'deleteUser' || action === 'removeUser') {
    var usersSheet = ss.getSheetByName("users") || ss.getSheetByName("Users") || ss.getSheetByName("users details") || ss.getSheetByName("Users Details");
    var uIdToDelete = String(data.user_id || data.user || '').trim().toLowerCase();
    if (usersSheet && uIdToDelete) {
      var uRows = usersSheet.getDataRange().getValues();
      for (var u = 1; u < uRows.length; u++) {
        if (String(uRows[u][0]).trim().toLowerCase() === uIdToDelete) {
          usersSheet.deleteRow(u + 1);
          break;
        }
      }
    }
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: 'User deleted'
    })).setMimeType(ContentService.MimeType.JSON);
  }

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
        var uByVal = String(data.updatedBy || data.updated_by || data.updateBy || data.update_by || '1').trim();
        var uByNameVal = String(data.updatedByName || data.updated_by_name || data.updateByName || data.update_by_name || '').trim();
        if (!uByNameVal && uByVal.indexOf('(@') !== -1) {
          var m = uByVal.match(/(@(.*))/);
          if (m) {
            uByNameVal = uByVal.replace(/s*(@.*)/, '').replace('@', '').trim();
            uByVal = m[1].trim();
          }
        }
        var lowerUBy = uByVal.toLowerCase();
        var lowerUName = uByNameVal.toLowerCase();
        if (
          lowerUBy === 'manager' ||
          lowerUBy === 'admin' ||
          lowerUBy === '1' ||
          lowerUBy.indexOf('abujar') !== -1 ||
          lowerUBy.indexOf('manager') !== -1 ||
          lowerUBy.indexOf('admin') !== -1 ||
          lowerUBy.indexOf('@') !== -1 ||
          lowerUName === 'manager' ||
          lowerUName.indexOf('manager') !== -1 ||
          lowerUName.indexOf('admin') !== -1
        ) {
          uByVal = '1';
          if (!uByNameVal || uByNameVal.indexOf('@') !== -1) uByNameVal = 'Manager';
        }
        var actName = data.actionName || data.action_name || ("Undo");

        followupSheet.appendRow([
          new Date(),
          nextFupId,
          orderIdToFind,
          custName,
          custMob,
          '',
          prevStatus,
          stat,
          ordVal,
          scDate,
          scTime,
          uByVal,
          uByNameVal,
          "Reverted to " + prevStatus,
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
    var newFollowupStatus = data.followupStatus || data.followup_status || data.new_followup_status || data.newFollowupStatus || data.status || '';
    // order_status must always stay 'Pending' as required
    var newOrderStatus = 'Pending';
    var updatedBy = data.updatedBy || data.updated_by || '';
    var note = data.notes || data.remarks || '';
    var timestamp = data['Log Timestamp'] || data.logTimestamp || new Date();

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
      // (b) Update Order Status (Col 18) - ALWAYS keep 'Pending'
      mainSheet.getRange(foundRowIndex, 18).setValue('Pending');
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
        var followDt = followupDtInput || delivDt;
        mainSheet.getRange(foundRowIndex, 21).setValue(delivDt);
        mainSheet.getRange(foundRowIndex, 22).setValue('');
        mainSheet.getRange(foundRowIndex, 23).setValue(followDt);
      } else if (newFollowupStatus === 'Cancelled') {
        var cancDt = cancDtInput || new Date();
        var followDt = followupDtInput || cancDt;
        mainSheet.getRange(foundRowIndex, 21).setValue('');
        mainSheet.getRange(foundRowIndex, 22).setValue(cancDt);
        mainSheet.getRange(foundRowIndex, 23).setValue(followDt);
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

      // (f) Record Historical Log into 'Followup' sheet with exact 15 columns requested:
      // Log Timestamp | followup_id | order_id | customer_name | customer_mobile | previous_followup_status | new_followup_status | order_status | order_value | schedule_date | schedule_time | updated_by | updated_by_name | status_change | action
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
          "updated_by_name",
          "status_change",
          "action"
        ]);
        followupSheet.getRange(1, 1, 1, 15).setFontWeight("bold").setBackground("#e2e8f0");
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

      var uByVal = String(data.updatedBy || data.updated_by || data.updateBy || data.update_by || '').trim();
      var uByNameVal = String(data.updatedByName || data.updated_by_name || data.updateByName || data.update_by_name || '').trim();
      if (!uByNameVal && uByVal.indexOf('(@') !== -1) {
        var m = uByVal.match(/\(@(.*)\)/);
        if (m) {
          uByNameVal = uByVal.replace(/\s*\(@.*\)/, '').replace('@', '').trim();
          uByVal = m[1].trim();
        }
      }
      var lowerUBy = uByVal.toLowerCase();
      var lowerUName = uByNameVal.toLowerCase();
      // Removed hardcoded override to allow actual user ID/name to be logged in followup sheet
      // if (
      //   lowerUBy === 'manager' ||
      //   lowerUBy === 'admin' ||
      //   lowerUBy === '1' ||
      //   lowerUBy.indexOf('abujar') !== -1 ||
      //   lowerUBy.indexOf('manager') !== -1 ||
      //   lowerUBy.indexOf('admin') !== -1 ||
      //   lowerUBy.indexOf('@') !== -1 ||
      //   lowerUName === 'manager' ||
      //   lowerUName.indexOf('manager') !== -1 ||
      //   lowerUName.indexOf('admin') !== -1
      // ) {
      //   uByVal = '1';
      //   if (!uByNameVal || uByNameVal.indexOf('@') !== -1) uByNameVal = 'Manager';
      // }

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
        uByVal,
        uByNameVal,
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
    const str = String(val).trim();
    if (!str || str === '-' || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined') return '-';

    // 1. Direct YYYY-MM-DD HH:mm:ss matcher (preserves exact BDT hours)
    const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{2}))?/);
    if (isoMatch) {
      const y = isoMatch[1];
      const m = isoMatch[2].padStart(2, '0');
      const d = isoMatch[3].padStart(2, '0');
      const h = isoMatch[4] ? isoMatch[4].padStart(2, '0') : null;
      const min = isoMatch[5] || null;
      if (h && min && !(h === '00' && min === '00')) {
        return `${y}-${m}-${d} ${h}:${min}`;
      }
      return `${y}-${m}-${d}`;
    }

    // 2. Direct MM/DD/YYYY HH:mm:ss matcher (Google Sheets format)
    const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[T\s](\d{1,2}):(\d{2}))?/);
    if (slashMatch) {
      const m = slashMatch[1].padStart(2, '0');
      const d = slashMatch[2].padStart(2, '0');
      const y = slashMatch[3];
      const h = slashMatch[4] ? slashMatch[4].padStart(2, '0') : null;
      const min = slashMatch[5] || null;
      if (h && min && !(h === '00' && min === '00')) {
        return `${y}-${m}-${d} ${h}:${min}`;
      }
      return `${y}-${m}-${d}`;
    }

    // 3. Fallback to Date parser
    const dt = new Date(val);
    if (isNaN(dt.getTime())) return str;
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    const hh = String(dt.getHours()).padStart(2, '0');
    const min = String(dt.getMinutes()).padStart(2, '0');
    if (hh === '00' && min === '00') {
      return `${yyyy}-${mm}-${dd}`;
    }
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  }

  static formatSyncTimestamp(dateInput?: Date | string | number): string {
    const d = dateInput ? new Date(dateInput) : new Date();
    const day = d.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()] || 'Oct';
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const seconds = d.getSeconds().toString().padStart(2, '0');
    return `${day} ${month} ${year}, ${hours}:${minutes}:${seconds}`;
  }
}
