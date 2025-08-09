// /api/purchase.js  (Vercel)
export default async function handler(req, res) {
  // --- CORS ---
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { event_id, amount, currency, email, phone, ua } = req.body || {};
    if (!amount || !currency) return res.status(400).json({ error: 'Missing amount/currency' });

    const payload = {
      data: [{
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        event_id: event_id || `purchase-${Date.now()}`,
        action_source: "website",
        user_data: {
          em: email ? [email] : undefined,
          ph: phone ? [phone] : undefined,
          client_user_agent: ua || undefined
        },
        custom_data: { value: +amount, currency }
      }]
    };

    const r = await fetch(
      `https://graph.facebook.com/v18.0/${process.env.PIXEL_ID}/events?access_token=${process.env.FB_ACCESS_TOKEN}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
    );
    const j = await r.json();
    return res.status(r.ok ? 200 : 400).json(j);
  } catch (e) {
    return res.status(500).json({ error: 'Server error', details: String(e) });
  }
}
