import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Health check endpoints for instant pre-warming response
  app.get('/health', (req, res) => res.status(200).send('OK'));
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  // API Proxy for fetching Google Sheet orders & tabs (avoids browser CORS)
  app.get('/api/fetch-orders', async (req, res) => {
    try {
      const defaultSheetId = '1CKnS6A3okk6igZRIQCcBCJPEo-J56xwXTYJL8Dg5AiA';
      const inputUrl = String(req.query.url || '').trim();
      const requestedTab = String(req.query.tab || req.query.sheet || '').trim();

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

      // Always resolve to a valid Google Sheet ID, defaulting to user's sheet ID
      const targetSheetId = (inputUrl ? extractSheetId(inputUrl) : null) || defaultSheetId;

      let sheetNames: string[] = ['orders', 'Sheet5', 'Followup'];
      let rows: any[][] = [];
      let targetSheetName = requestedTab || 'orders';

      // 1. Try full XLSX export to obtain both tabs list and accurate formatted cells
      try {
        const xlsxUrl = `https://docs.google.com/spreadsheets/d/${targetSheetId}/export?format=xlsx`;
        const response = await fetch(xlsxUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, */*'
          },
          redirect: 'follow'
        });

        if (response.ok) {
          const arrayBuf = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuf);
          const textSample = buffer.toString('utf8', 0, Math.min(buffer.length, 500)).toLowerCase();
          
          if (!textSample.includes('<!doctype html') && !textSample.includes('sign in to google')) {
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            if (workbook.SheetNames && workbook.SheetNames.length > 0) {
              sheetNames = workbook.SheetNames;
              
              if (!requestedTab) {
                const foundOrders = sheetNames.find(n => {
                  const l = n.toLowerCase().trim();
                  return l === 'orders' || l === 'order';
                });
                targetSheetName = foundOrders || sheetNames[0];
              } else {
                const reqLower = requestedTab.toLowerCase().trim();
                const matched = sheetNames.find(n => n.toLowerCase().trim() === reqLower)
                  || sheetNames.find(n => n.toLowerCase().replace(/[\s_-]+/g, '') === reqLower.replace(/[\s_-]+/g, ''))
                  || sheetNames.find(n => {
                    const l = n.toLowerCase().trim();
                    return (reqLower.includes('user') && l.includes('user'));
                  });
                targetSheetName = matched || requestedTab;
              }

              const worksheet = workbook.Sheets[targetSheetName] || workbook.Sheets[sheetNames[0]];
              if (worksheet) {
                const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, dateNF: 'yyyy-mm-dd hh:mm:ss' }) as any[][];
                rows = rawRows.filter(r => Array.isArray(r) && r.some(c => c !== undefined && c !== null && String(c).trim() !== ''));
              }
            }
          }
        }
      } catch (xlsxErr) {
        console.warn('XLSX export fetch failed, falling back to CSV:', xlsxErr);
      }

      // 2. Fallback to direct GViz CSV export if XLSX failed or yielded empty data
      if (!rows || rows.length <= 1) {
        try {
          const csvUrl = `https://docs.google.com/spreadsheets/d/${targetSheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(targetSheetName || 'orders')}`;
          const csvRes = await fetch(csvUrl, { redirect: 'follow' });
          if (csvRes.ok) {
            const csvText = await csvRes.text();
            if (!csvText.includes('<!doctype html')) {
              const workbook = XLSX.read(csvText, { type: 'string' });
              const sheet = workbook.Sheets[workbook.SheetNames[0]];
              const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false }) as any[][];
              rows = rawRows.filter(r => Array.isArray(r) && r.some(c => c !== undefined && c !== null && String(c).trim() !== ''));
            }
          }
        } catch (csvErr) {
          console.warn('GViz CSV export failed:', csvErr);
        }
      }

      if (!rows || (rows.length === 0 && !sheetNames.some(s => s.toLowerCase().trim() === targetSheetName.toLowerCase().trim()))) {
        return res.status(500).json({
          success: false,
          error: 'Could not load data from Google Sheet. Please ensure sheet is set to "Anyone with the link can view".'
        });
      }

      return res.json({
        success: true,
        tabs: sheetNames,
        activeTab: targetSheetName,
        total: Math.max(0, rows.length - 1),
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

