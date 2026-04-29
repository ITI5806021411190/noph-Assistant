export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method === "GET") {
    return res.status(200).json({
      success: true,
      message: "Vercel GAS proxy is running",
      hasGasUrl: !!process.env.GAS_WEB_APP_URL,
      hasSecret: !!process.env.GAS_API_SECRET
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed"
    });
  }

  try {
    const gasUrl = process.env.GAS_WEB_APP_URL;
    const apiSecret = process.env.GAS_API_SECRET;

    if (!gasUrl || !apiSecret) {
      return res.status(500).json({
        success: false,
        message: "Missing GAS_WEB_APP_URL or GAS_API_SECRET in Vercel Environment Variables"
      });
    }

    const payload = {
      ...(req.body || {}),
      apiSecret: apiSecret
    };

    const gasResponse = await fetch(gasUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });

    const text = await gasResponse.text();

    try {
      const json = JSON.parse(text);
      return res.status(200).json(json);
    } catch (parseError) {
      return res.status(502).json({
        success: false,
        message: "Invalid JSON response from Apps Script",
        raw: text
      });
    }

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || String(error)
    });
  }
}
