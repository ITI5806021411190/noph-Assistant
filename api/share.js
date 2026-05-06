export default async function handler(req, res) {
  const publicId = String(req.query.publicId || '');
  const workspaceId = String(req.query.workspaceId || '');
  const token = String(req.query.token || '');
  const baseUrl = process.env.PUBLIC_APP_BASE_URL || 'https://noph-assistant.vercel.app';
  const gasUrl = process.env.GAS_WEB_APP_URL;
  const secret = process.env.GAS_API_SECRET;

  const escapeHtml = (v) => String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  let title = 'Health Assistant OS';
  let desc = 'รายละเอียดงาน / พื้นที่ทำงานร่วมกัน';
  let target = baseUrl + '/public';

  try {
    if (gasUrl && secret && publicId) {
      const r = await fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _vercelBridge: true, secret, fn: 'getPublicSchedule', args: [publicId] })
      });
      const json = await r.json();
      if (json && json.success && json.data) {
        const d = json.data;
        title = (d.eventName || 'Public Schedule') + ' - Health Assistant OS';
        const type = d.scheduleType || d.tags || d.priority || d.workStatus || 'ตารางงาน/นัดหมาย';
        desc = 'ประเภทงาน: ' + type + ' | เวลา: ' + (d.startTime || '-') + ' | สถานที่: ' + (d.location || '-') + ' | รายละเอียด: ' + String(d.details || '').slice(0, 120);
      }
      target = baseUrl + '/public?publicId=' + encodeURIComponent(publicId);
    } else if (workspaceId) {
      title = 'พื้นที่ทำงานร่วมกัน - Health Assistant OS';
      desc = 'เปิดดูพื้นที่ทำงานร่วมกัน / แบบฟอร์มออนไลน์';
      target = baseUrl + '/public?workspaceId=' + encodeURIComponent(workspaceId) + (token ? '&token=' + encodeURIComponent(token) : '');
    }
  } catch (e) {
    target = publicId ? (baseUrl + '/public?publicId=' + encodeURIComponent(publicId)) : target;
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(`<!doctype html><html lang="th"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(desc)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${escapeHtml(target)}">
<meta name="description" content="${escapeHtml(desc)}">
<meta name="twitter:card" content="summary">
<meta http-equiv="refresh" content="0; url=${escapeHtml(target)}">
<script>location.replace(${JSON.stringify(target)});</script>
</head><body style="font-family:sans-serif;padding:24px">กำลังเปิด Health Assistant OS... <a href="${escapeHtml(target)}">คลิกที่นี่</a></body></html>`);
}
