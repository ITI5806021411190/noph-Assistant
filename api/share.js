export default function handler(req, res) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query || {})) {
    if (Array.isArray(value)) {
      value.forEach(item => query.append(key, item));
    } else if (value !== undefined && value !== null && String(value) !== '') {
      query.set(key, String(value));
    }
  }

  const target = '/public' + (query.toString() ? `?${query.toString()}` : '');
  res.writeHead(302, { Location: target });
  res.end();
}
