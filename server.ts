import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // API Proxy for fetching Google Sheet orders (avoids browser CORS)
  app.get('/api/fetch-orders', async (req, res) => {
    try {
      const scriptUrl = String(req.query.url || '');
      if (!scriptUrl) {
        return res.status(400).json({ error: 'Missing script URL' });
      }

      const response = await fetch(scriptUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/plain, */*'
        },
        redirect: 'follow'
      });

      if (!response.ok) {
        throw new Error(`Google Apps Script HTTP error ${response.status}`);
      }

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }

      return res.json({ success: true, data });
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
      return res.json({ success: true, response: text });
    } catch (err: any) {
      console.error('Server proxy-script error:', err);
      return res.status(500).json({ success: false, error: err.message || 'Failed to sync with Google Sheet' });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
