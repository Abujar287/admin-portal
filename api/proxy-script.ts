export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    console.log('Proxy request body:', req.body);
    const { url, ...formData } = req.body || {};
    if (!url) {
      console.error('Proxy missing URL');
      return res.status(400).json({ error: 'Missing script URL' });
    }

    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({ success: false, error: 'The provided URL is invalid. Please ensure it is a valid Google Apps Script Web App URL.' });
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

    if (text.trim().toLowerCase().startsWith('<!doctype html') || text.toLowerCase().includes('<html')) {
      return res.status(502).json({ success: false, error: 'Invalid Google Script URL or configuration. Please check your Web App URL.' });
    }

    return res.status(200).json({ success: true, response: text });
  } catch (err: any) {
    console.error('Vercel api/proxy-script error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to sync with Google Sheet' });
  }
}
