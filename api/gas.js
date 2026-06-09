import { tryHandlePostgresRequest } from './_haos_postgres.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  } catch (_err) {
    return res.status(400).json({ success: false, message: 'Invalid JSON body' });
  }
  const fn = String(body.fn || '').trim();
  if (!fn) return res.status(400).json({ success: false, message: 'Missing function name' });

  try {
    const postgresResult = await tryHandlePostgresRequest(fn, Array.isArray(body.args) ? body.args : []);
    if (postgresResult) {
      return res.status(200).json(postgresResult);
    }

    const gasUrl = process.env.GAS_WEB_APP_URL || process.env.APPS_SCRIPT_URL || process.env.GOOGLE_APPS_SCRIPT_URL;
    const secret = process.env.GAS_API_SECRET || process.env.VERCEL_API_SECRET;
    if (!gasUrl || !secret) {
      return res.status(500).json({ success: false, message: 'Missing GAS_WEB_APP_URL or GAS_API_SECRET' });
    }

    const upstream = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        _vercelBridge: true,
        secret,
        fn,
        args: Array.isArray(body.args) ? body.args : []
      })
    });

    const text = await upstream.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (_err) {
      return res.status(502).json({ success: false, message: text || 'Invalid Apps Script response' });
    }

    const status = upstream.ok && !data.__bridgeError ? 200 : 502;
    return res.status(status).json(data);
  } catch (err) {
    return res.status(502).json({ success: false, message: err && err.message ? err.message : String(err) });
  }
}
