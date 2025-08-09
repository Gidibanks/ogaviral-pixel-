(function(){
  // ======= CONFIG =======
  const BACKEND_URL = 'https://ogaviral-pixel.vercel.app/api/purchase'; // <-- your Vercel API
  const REF_PARAM = 'reference';

  // ======= LOG (for quick debugging) =======
  function log(){ try{ console.log.apply(console, ['[OGV purchase.js]'].concat([].slice.call(arguments))); }catch(_){} }

  // ======= 1) Guards: must be addfunds callback with ?reference= =======
  const url = location.pathname.toLowerCase() + location.search.toLowerCase();
  const isAddFunds = /\/addfunds/i.test(url);
  const hasRef = new URLSearchParams(location.search).has(REF_PARAM);

  // broadened success copy: verified / success / completed / funded
  const successCopy = /(payment\s*(verified|successful|success|completed)|fund(ing|ed)\s*(successful|success)|deposit\s*(successful|success)|order\s*(created|placed|completed))/i
    .test(document.body.innerText);

  // bail early if not a legit success page
  if (!(isAddFunds && hasRef && successCopy)) {
    log('not success page', { isAddFunds, hasRef, successCopy });
    return;
  }

  // ======= 2) Amount extraction (robust) =======
  function parseMoney(txt){
    if(!txt) return 0;
    const m = String(txt).match(/(?:₦|NGN|N)\s*[\d,]+(?:\.\d{1,2})?/i);
    if (!m) return 0;
    return parseFloat(m[0].replace(/[^0-9.]/g,'')) || 0;
  }

  function findAmount(){
    // common explicit spots
    let el = document.querySelector('#payment-amount, #order-amount, .payment-amount, .order-amount, [data-amount], [data-order-total]');
    if (el){
      const attr = el.getAttribute('data-amount') || el.getAttribute('data-order-total');
      const n = attr ? parseFloat(attr) : parseMoney(el.textContent);
      if (n > 0) return n;
    }

    // tables: look for a row labeled "Amount" or "Total"
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

    // general body scan (last resort)
    return parseMoney(document.body.innerText);
  }

  const amount = +findAmount().toFixed(2);
  if (amount <= 0){
    log('amount not found, stopping');
    return;
  }

  // ======= 3) De-dupe by reference =======
  const ref = new URLSearchParams(location.search).get(REF_PARAM) || location.href;
  const fireKey = 'ogv_purchase_' + ref;
  try { if (sessionStorage.getItem(fireKey)) { log('dupe stop'); return; } sessionStorage.setItem(fireKey,'1'); } catch(_){}

  // identifiers captured earlier (optional)
  const email = (sessionStorage.getItem('ogv_email')||'').trim().toLowerCase();
  const phone = (sessionStorage.getItem('ogv_phone')||'');

  const payload = {
    event_id: 'purchase-'+Date.now()+'-'+Math.random().toString(36).slice(2),
    amount,
    currency: 'NGN',
    email,
    phone,
    ua: navigator.userAgent
  };

  log('sending', payload);

  fetch(BACKEND_URL, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  })
  .then(r => r.json().then(j => ({ok:r.ok, j})))
  .then(({ok,j}) => log('capi response', ok?'OK':'ERROR', j))
  .catch(err => log('fetch error', err));
})();
