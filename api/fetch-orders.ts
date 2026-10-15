import * as XLSX from 'xlsx';

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

    const targetSheetId = (inputUrl ? extractSheetId(inputUrl) : null) || defaultSheetId;
    let sheetNames: string[] = ['orders', 'Sheet5', 'Followup'];
    let rows: any[][] = [];
    let targetSheetName = requestedTab || 'orders';

    // 1. Try XLSX export
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
              const matched = sheetNames.find(n => {
                const l = n.toLowerCase().trim();
                return l === reqLower || (reqLower.includes('user') && l.includes('user'));
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
      console.warn('XLSX export fetch failed, falling back to GViz:', xlsxErr);
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

    return res.status(200).json({
      success: true,
      tabs: sheetNames,
      activeTab: targetSheetName,
      total: Math.max(0, rows.length - 1),
      data: rows,
      sheetId: targetSheetId
    });
  } catch (err: any) {
    console.error('Vercel api/fetch-orders error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch orders from sheet' });
  }
}
