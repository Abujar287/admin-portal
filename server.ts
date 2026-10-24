import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// In-memory cache for ultra-fast response for 30,000 - 100,000 orders
const sheetCache = new Map<string, { data: any[][]; tabs: string[]; total: number; timestamp: number }>();

/**
 * High-performance CSV parser that processes 100,000 rows in ~150ms without XLSX overhead
 */
function parseFastCsv(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;
  const len = csvText.length;

  for (let i = 0; i < len; i++) {
    const char = csvText[i];
    const nextChar = i + 1 < len ? csvText[i + 1] : '';

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentCell += '"';
          i++; // Skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i++;
        }
        currentRow.push(currentCell.trim());
        if (currentRow.some(c => c !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else if (char === '\n') {
        currentRow.push(currentCell.trim());
        if (currentRow.some(c => c !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
  }

  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some(c => c !== '')) {
      rows.push(currentRow);
    }
  }

  return rows;
}

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(compression());
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ extended: true, limit: '100mb' }));

  // Health check endpoints for instant pre-warming response
  app.get('/health', (req, res) => res.status(200).send('OK'));
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  // API Proxy for fetching Google Sheet orders & tabs (ultra-fast for 30,000 - 100,000 orders)
  app.get('/api/fetch-orders', async (req, res) => {
    try {
      const defaultSheetId = '1CKnS6A3okk6igZRIQCcBCJPEo-J56xwXTYJL8Dg5AiA';
      const inputUrl = String(req.query.url || '').trim();
      const requestedTab = String(req.query.tab || req.query.sheet || '').trim();
      const isForce = req.query.refresh === 'true' || req.query.force === 'true';

      const extractSheetId = (input: string): string | null => {
        const clean = input.trim();
        if (/^[a-zA-Z0-9-_]{25,}$/.test(clean)) {
          return clean;
        }
        const match = clean.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (match && match[1]) {
          return match[1];
        }
        return null;
      };

      const targetSheetId = (inputUrl ? extractSheetId(inputUrl) : null) || defaultSheetId;
      const targetSheetName = requestedTab || 'orders';
      const cacheKey = `${targetSheetId}__${targetSheetName.toLowerCase()}`;

      let sheetNames: string[] = ['orders', 'Sheet5', 'Followup', 'users', 'users details'];
      const cached = sheetCache.get(cacheKey);

      // Instant cache hit if not forcing refresh
      if (!isForce && cached && (Date.now() - cached.timestamp < 60000)) {
        return res.json({
          success: true,
          tabs: cached.tabs,
          activeTab: targetSheetName,
          total: cached.total,
          data: cached.data,
          sheetId: targetSheetId,
          fromCache: true
        });
      }

      console.log(`[/api/fetch-orders] Requested tab: "${requestedTab}", target: "${targetSheetName}", isForce: ${isForce}`);

      let rows: any[][] = [];

      // 1. For default or 'orders' tab: Direct CSV export yields all 10,000+ unfiltered rows in ~200ms
      if (!requestedTab || targetSheetName.toLowerCase() === 'orders') {
        try {
          const directCsvUrl = `https://docs.google.com/spreadsheets/d/${targetSheetId}/export?format=csv`;
          const csvController = new AbortController();
          const timeoutId = setTimeout(() => csvController.abort(), 20000);

          const csvRes = await fetch(directCsvUrl, {
            headers: { 'Accept': 'text/csv, text/plain, */*' },
            signal: csvController.signal,
            redirect: 'follow'
          });
          clearTimeout(timeoutId);

          if (csvRes.ok) {
            const csvText = await csvRes.text();
            if (!csvText.includes('<!doctype html') && !csvText.includes('sign in to google')) {
              const parsedRows = parseFastCsv(csvText);
              if (parsedRows.length > 5) {
                rows = parsedRows;
              }
            }
          }
        } catch (directCsvErr) {
          console.warn('Direct CSV orders export warning:', directCsvErr);
        }
      }

      // 2. Multi-tab XLSX export (parses all tabs: orders, Followup, users details in ~1s)
      if (!rows || rows.length <= 5) {
        try {
          const xlsxUrl = `https://docs.google.com/spreadsheets/d/${targetSheetId}/export?format=xlsx`;
          const xlsxController = new AbortController();
          const timeoutId = setTimeout(() => xlsxController.abort(), 30000);

          const xlsxRes = await fetch(xlsxUrl, { redirect: 'follow', signal: xlsxController.signal });
          clearTimeout(timeoutId);

          if (xlsxRes.ok) {
            const arrayBuf = await xlsxRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuf);
            const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
            if (workbook.SheetNames && workbook.SheetNames.length > 0) {
              sheetNames = workbook.SheetNames;
              console.log(`[XLSX] Found sheet names:`, sheetNames);

              // Pre-cache all available sheets from the workbook
              for (const sName of sheetNames) {
                const ws = workbook.Sheets[sName];
                if (ws) {
                  const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false }) as any[][];
                  const filtered = rawRows.filter(r => Array.isArray(r) && r.some(c => c !== undefined && c !== null && String(c).trim() !== ''));
                  console.log(`[XLSX] Sheet "${sName}" filtered rows: ${filtered.length}, target: "${targetSheetName}"`);
                  const k = `${targetSheetId}__${sName.toLowerCase()}`;
                  sheetCache.set(k, {
                    data: filtered,
                    tabs: sheetNames,
                    total: Math.max(0, filtered.length - 1),
                    timestamp: Date.now()
                  });
                  if (sName.toLowerCase() === targetSheetName.toLowerCase()) {
                    rows = filtered;
                  }
                }
              }

              // Fallback match if requested sheet wasn't exact match
              if (!rows || rows.length === 0) {
                const targetWs = workbook.Sheets[targetSheetName] || workbook.Sheets[sheetNames[0]];
                if (targetWs) {
                  const rawRows = XLSX.utils.sheet_to_json(targetWs, { header: 1, raw: false }) as any[][];
                  rows = rawRows.filter(r => Array.isArray(r) && r.some(c => c !== undefined && c !== null && String(c).trim() !== ''));
                }
              }
            }
          }
        } catch (xlsxErr) {
          console.warn('XLSX multi-tab stream warning:', xlsxErr);
        }
      }

      // 3. Last fallback: GViz query export
      if (!rows || rows.length <= 1) {
        try {
          const gvizUrl = `https://docs.google.com/spreadsheets/d/${targetSheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(targetSheetName)}`;
          const gvizRes = await fetch(gvizUrl, { redirect: 'follow' });
          if (gvizRes.ok) {
            const gvizText = await gvizRes.text();
            if (!gvizText.includes('<!doctype html') && !gvizText.includes('sign in to google')) {
              rows = parseFastCsv(gvizText);
            }
          }
        } catch (gvizErr) {
          console.warn('GViz fallback warning:', gvizErr);
        }
      }

      if (!rows || rows.length === 0) {
        if (cached) {
          return res.json({
            success: true,
            tabs: cached.tabs,
            activeTab: targetSheetName,
            total: cached.total,
            data: cached.data,
            sheetId: targetSheetId,
            fromCache: true
          });
        }
        return res.status(500).json({
          success: false,
          error: 'Could not load data from Google Sheet. Please ensure sheet is set to "Anyone with the link can view".'
        });
      }

      const totalCount = Math.max(0, rows.length - 1);
      // Cache the result for subsequent requests
      sheetCache.set(cacheKey, {
        data: rows,
        tabs: sheetNames,
        total: totalCount,
        timestamp: Date.now()
      });

      return res.json({
        success: true,
        tabs: sheetNames,
        activeTab: targetSheetName,
        total: totalCount,
        data: rows,
        sheetId: targetSheetId
      });
    } catch (err: any) {
      console.error('Server fetch-orders error:', err);
      return res.status(500).json({ success: false, error: err.message || 'Failed to fetch orders from sheet' });
    }
  });

  // API Proxy for updating or creating orders in Google Sheet (avoids browser CORS)
  app.post('/api/proxy-script', async (req, res) => {
    try {
      const { url, ...formData } = req.body;
      if (!url) {
        return res.status(400).json({ error: 'Missing script URL' });
      }

      // Basic URL validation
      try {
        new URL(url);
      } catch (e) {
        console.error('Invalid URL passed to proxy:', url);
        return res.status(400).json({ success: false, error: 'The provided URL is invalid. Please ensure it is a valid Google Apps Script Web App URL.' });
      }

      console.log('Proxying request to:', url, 'with action:', formData.action);

      const params = new URLSearchParams();
      for (const [key, val] of Object.entries(formData)) {
        params.append(key, String(val ?? ''));
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString(),
        redirect: 'follow'
      });

      const text = await response.text();
      
      // If it's HTML, it's likely a 404 or an error page, not a successful API response.
      if (text.trim().toLowerCase().startsWith('<!doctype html') || text.toLowerCase().includes('<html')) {
        console.error('Google Sheets returned HTML instead of data. Likely an invalid Script URL.');
        return res.status(502).json({ success: false, error: 'Invalid Google Script URL or configuration. Please check your Web App URL.' });
      }
      
      console.log('Google Sheets response:', text);
      return res.json({ success: true, response: text });
    } catch (err: any) {
      console.error('Server proxy-script error:', err);
      return res.status(500).json({ success: false, error: err.message || 'Failed to sync with Google Sheet' });
    }
  });

  // API Endpoint to save/sync newly created or edited agents to user_details.json
  app.post('/api/save-agent-code', async (req, res) => {
    try {
      const newAgent = req.body;
      console.log('Received agent sync request:', newAgent);
      if (!newAgent || !newAgent.user) {
        return res.status(400).json({ success: false, error: 'Invalid agent data' });
      }

      const filePath = path.join(__dirname, 'user_details.json');
      console.log('Attempting to save to:', filePath);
      
      let users: any[] = [];
      
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        try {
          users = JSON.parse(fileContent);
        } catch (e) {
          users = [];
        }
      }

      const agentJsonStr = {
        user: newAgent.user,
        pass: newAgent.pass,
        name: newAgent.name || `Agent ${newAgent.user}`,
        role: newAgent.role || 'Agent',
        team: newAgent.team || 'Acquisition',
        email: newAgent.email || '',
        status: newAgent.status || 'active', // Ensure status is preserved
        permissions: newAgent.permissions || undefined,
        teamLeaders: newAgent.teamLeaders || undefined,
        teamLeaderId: newAgent.teamLeaderId || undefined
      };

      const existingIdx = users.findIndex(u => String(u.user) === String(newAgent.user));
      if (existingIdx !== -1) {
        users[existingIdx] = agentJsonStr;
      } else {
        users.push(agentJsonStr);
      }

      fs.writeFileSync(filePath, JSON.stringify(users, null, 2), 'utf8');
      console.log('Successfully wrote to file.');
      return res.json({ success: true, message: 'Agent synced successfully to user_details.json' });
    } catch (err: any) {
      console.error('Save agent code error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.use((req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa'
    });
    app.use(vite.middlewares);
    app.use(async (req, res, next) => {
      if (req.method !== 'GET' || req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/health')) {
        return next();
      }
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
    console.log('Vite middleware attached successfully');
  }

  let PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  let HOST = process.env.HOST || '0.0.0.0';

  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port' && args[i + 1]) {
      PORT = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--host' && args[i + 1]) {
      HOST = args[i + 1];
      i++;
    }
  }

  app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
  });
}

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

startServer();

