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



(function(){
  const BACKEND_URL = 'https://ogaviral-pixel.vercel.app/api/purchase';

  function log(){ try{ console.log.apply(console, ['[OGV purchase.js]'].concat([].slice.call(arguments))); }catch(_){} }

  const isCallback = /[?&]reference=/.test(location.search);
  const okCopy = /(payment (successful|completed)|wallet funded|deposit successful|order (created|placed|completed))/i.test(document.body.innerText);
  const amtMatch = document.body.innerText.match(/(?:₦|NGN|N)\s*[\d,]+(?:\.\d{1,2})?/i);
  const amount = amtMatch ? parseFloat(amtMatch[0].replace(/[^0-9.]/g,'')) : 0;

  log('guards', { isCallback, okCopy, amount });

  if(!isCallback || !okCopy || amount <= 0) return;

  const fireKey = 'ogv_purchase_' + (new URLSearchParams(location.search).get('reference') || location.href);
  try { if (sessionStorage.getItem(fireKey)) return; sessionStorage.setItem(fireKey, '1'); } catch(e) {}

  const email = (sessionStorage.getItem('ogv_email')||'').trim().toLowerCase();
  const phone = (sessionStorage.getItem('ogv_phone')||'');

  const payload = {
    event_id: 'purchase-'+Date.now()+'-'+Math.random().toString(36).slice(2),
    amount: +amount.toFixed(2),
    currency: 'NGN',
    email, phone,
    ua: navigator.userAgent
  };

  log('sending', payload);

  fetch(BACKEND_URL, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  })
  .then(r => r.json().then(j => ({ ok: r.ok, j })))
  .then(({ok, j}) => log('capi response', ok ? 'OK' : 'ERROR', j))
  .catch(err => log('fetch error', err));
})();
