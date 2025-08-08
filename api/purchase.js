const BACKEND_URL = 'https://ogaviral-pixel.vercel.app/api/purchase'; // <-- update to your Vercel URL

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { event_id, amount, currency, email, phone, ua } = req.body || {};
  if (!amount || !currency) return res.status(400).json({ error: 'Missing amount/currency' });

  const body = {
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
      custom_data: {
        value: +amount,
        currency: currency
      }
    }]
  };

  const resp = await fetch(`https://graph.facebook.com/v18.0/${process.env.PIXEL_ID}/events?access_token=${process.env.FB_ACCESS_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const json = await resp.json();
  res.status(resp.ok ? 200 : 400).json(json);
}
