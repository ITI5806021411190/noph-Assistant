export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ __bridgeError: true, success: false, message: 'Method not allowed' });
  }
  const gasUrl = process.env.GAS_WEB_APP_URL;
  const apiSecret = process.env.GAS_API_SECRET;
  if (!gasUrl || !apiSecret) {
    return res.status(500).json({ __bridgeError: true, success: false, message: 'Vercel env is missing GAS_WEB_APP_URL or GAS_API_SECRET' });
  }
  const body = req.body || {};
  const fn = body.fn;
  const args = body.args || [];
  if (!fn || typeof fn !== 'string') {
    return res.status(400).json({ __bridgeError: true, success: false, message: 'Missing function name' });
  }
  try {
    const forwardedProto = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const publicBaseUrl = forwardedProto + '://' + host;
    const gasResponse = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _vercelBridge: true, secret: apiSecret, fn, args, publicBaseUrl }),
      redirect: 'follow'
    });
    const text = await gasResponse.text();
    let data;
    try { data = text ? JSON.parse(text) : {}; }
    catch (parseError) { return res.status(502).json({ __bridgeError: true, success: false, message: 'Apps Script returned non-JSON response: ' + text.slice(0, 500) }); }
    if (fn === 'getSchedulePublicUrlServer' && data && data.success && args[0]) {
      data.url = publicBaseUrl + '/public?publicId=' + encodeURIComponent(args[0]);
    }
    return res.status(gasResponse.ok ? 200 : 502).json(data);
  } catch (error) {
    return res.status(500).json({ __bridgeError: true, success: false, message: error.message || String(error) });
  }
}
