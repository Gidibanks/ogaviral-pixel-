(function(){
  // ===== config =====
  const BACKEND_URL = 'https://ogaviral-pixel.vercel.app/api/purchase'; // your Vercel route
  const ALLOWED_HOST = /(^|\.)ogaviral\.com$/i; // domain lock (optional but safer)

  // bail if not on your domain
  if (!ALLOWED_HOST.test(location.hostname)) return;

  // must be the addfunds callback with ?reference=
  const qs = new URLSearchParams(location.search);
  const isAddFunds = /\/addfunds/i.test(location.pathname);
  const hasRef = qs.has('reference');
  if (!(isAddFunds && hasRef)) return;

  // find amount (selectors → tables → fallback scan)
  function parseMoney(txt){
    if(!txt) return 0;
    const m = String(txt).match(/(?:₦|NGN|N)\s*[\d,]+(?:\.\d{1,2})?/i);
    return m ? parseFloat(m[0].replace(/[^0-9.]/g,'')) : 0;
  }
  function findAmount(){
    let el = document.querySelector(
      '#payment-amount, #order-amount, .payment-amount, .order-amount, [data-amount], [data-order-total]'
    );
    if (el){
      const attr = el.getAttribute('data-amount') || el.getAttribute('data-order-total');
      const n = attr ? parseFloat(attr) : parseMoney(el.textContent);
      if (n > 0) return n;
    }
    const rows = Array.from(document.querySelectorAll('tr'));
    for (const r of rows){
      const t = (r.innerText||'').toLowerCase();
      if (/amount|total|value/.test(t)){
        const cells = r.querySelectorAll('td,th');
        if (cells.length >= 2){
          const n = parseMoney(cells[1].innerText);
          if (n > 0) return n;
        }
        const n2 = parseMoney(r.innerText);
        if (n2 > 0) return n2;
      }
    }
    return parseMoney(document.body.innerText);
  }

  // wait a tick for DOM content (some PP pages paint late)
  function ready(fn){ 
    if (document.readyState !== 'loading') fn(); 
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function(){
    const amount = +findAmount().toFixed(2);
    if (amount <= 0) return; // no amount, no event

    // de-dupe per reference
    const ref = qs.get('reference') || location.href;
    const key = 'ogv_purchase_' + ref;
    try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key,'1'); } catch(_){}

    // optional identifiers saved earlier
    const email = (sessionStorage.getItem('ogv_email')||'').trim().toLowerCase();
    const phone = (sessionStorage.getItem('ogv_phone')||'');

    const payload = {
      event_id: 'purchase-' + Date.now() + '-' + Math.random().toString(36).slice(2),
      amount,
      currency: 'NGN',
      email,
      phone,
      ua: navigator.userAgent
    };

    fetch(BACKEND_URL, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    }).catch(()=>{});
  });
})();
