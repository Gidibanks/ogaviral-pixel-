(function(){
  const BACKEND_URL = 'https://your-vercel-app.vercel.app/api/purchase'; // Change to your backend endpoint
  const PIXEL_ID = '1265498695127046';

  function normPhone(raw){
    if(!raw) return '';
    let p = String(raw).replace(/[^\d+]/g,'');
    if(p.startsWith('+')) return p;
    if(p.startsWith('0')) return '+234' + p.slice(1);
    if(p.startsWith('234')) return '+'+p;
    if(/^\d{10,15}$/.test(p)) return '+'+p;
    return p;
  }

  // Check success page
  const isCallback = /[?&]reference=/.test(location.search);
  const okCopy = /(payment (successful|completed)|wallet funded|deposit successful|order (created|placed|completed))/i.test(document.body.innerText);
  const amtMatch = document.body.innerText.match(/(?:₦|NGN|N)\s*[\d,]+(?:\.\d{1,2})?/i);
  const amount = amtMatch ? parseFloat(amtMatch[0].replace(/[^0-9.]/g,'')) : 0;
  if(!isCallback || !okCopy || amount <= 0) return;

  // Prevent duplicates
  const fireKey = 'ogv_purchase_' + (new URLSearchParams(location.search).get('reference') || location.href);
  try {
    if (sessionStorage.getItem(fireKey)) return;
    sessionStorage.setItem(fireKey, '1');
  } catch(e) {}

  // Get stored identifiers if available
  const email = sessionStorage.getItem('ogv_email') || '';
  const phone = sessionStorage.getItem('ogv_phone') || '';

  // Send to backend for CAPI
  fetch(BACKEND_URL, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({
      event_id: 'purchase-'+Date.now()+'-'+Math.random().toString(36).slice(2),
      amount: +amount.toFixed(2),
      currency: 'NGN',
      email: email.trim().toLowerCase(),
      phone: normPhone(phone),
      ua: navigator.userAgent
    })
  }).then(res => res.json())
    .then(r => console.log('[OgaViral CAPI]', r))
    .catch(err => console.error('[OgaViral CAPI Error]', err));
})();
