const exportToPDF = (enquiry) => {
  const fmt = (v) => (v ? String(v) : '—');
  const esc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/`/g, '\`');

  const products = enquiry.products || [];

  const cardImages = [enquiry.business_card_url, enquiry.business_card_url_2]
    .filter(Boolean)
    .map((url, i) => `<div class="card-cell">
      <div class="card-label">${i === 0 ? 'Front' : 'Back'}</div>
      <img src="${url}" class="card-img" alt="Business card" />
    </div>`)
    .join('');

  const productsHtml = products.length > 0 ? `
  <div class="page-break">
    <div class="products-header">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
      <div class="products-count">Products Interested &nbsp;<span>${products.length} item${products.length !== 1 ? 's' : ''}</span></div>
    </div>
    <div class="product-grid">
      ${products.map((p, i) => `
        <div class="product-box">
          <div class="product-header-bar">
            <div class="product-num">Item #${i + 1}</div>
            <div class="product-name">${fmt(p.description)}</div>
          </div>
          ${p.photo_url
            ? `<img src="${p.photo_url}" class="product-photo" alt="Product ${i + 1}" loading="eager" />`
            : `<div class="product-no-photo">No Photo</div>`}
          <table class="detail-table">
            <tr><td class="dl">Qty</td><td>${fmt(p.quantity)} ${fmt(p.unit)}</td></tr>
            ${p.weight ? `<tr><td class="dl">Weight</td><td>${p.weight}</td></tr>` : ''}
            ${p.purity_material ? `<tr><td class="dl">Material</td><td>${p.purity_material}</td></tr>` : ''}
            ${p.customer_requirement ? `<tr><td class="dl">Req</td><td>${p.customer_requirement}</td></tr>` : ''}
          </table>
        </div>
      `).join('')}
    </div>
  </div>` : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Enquiry - ${fmt(enquiry.customer_name)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Inter, sans-serif; font-size: 13px; color: #1e293b; background: #fff; padding: 32px 40px; max-width: 900px; margin: 0 auto; line-height: 1.5; }
    
    /* Header (Replacing gradient cover) */
    .header { padding-bottom: 20px; border-bottom: 2px solid #e2e8f0; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
    .header-main h1 { font-size: 24px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
    .header-main .badge { display: inline-block; background: #f1f5f9; color: #334155; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 4px; border: 1px solid #cbd5e1; margin-left: 12px; vertical-align: middle; }
    .header-meta { text-align: right; font-size: 11px; color: #64748b; line-height: 1.6; }
    .header-meta strong { color: #334155; font-weight: 600; }
    
    /* Sections */
    section { margin-bottom: 28px; }
    .section-title { font-size: 12px; font-weight: 600; color: #475569; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
    
    /* Tables */
    .info-table { width: 100%; border-collapse: collapse; }
    .info-table td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    .info-table .label { color: #64748b; font-weight: 500; width: 25%; }
    .info-table td:last-child { color: #0f172a; font-weight: 500; }
    .info-table tr:last-child td { border-bottom: none; }
    
    /* Clean Boxes (Replacing silly gradients) */
    .clean-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; display: flex; gap: 40px; flex-wrap: wrap; }
    .box-item { display: flex; flex-direction: column; gap: 4px; }
    .box-item .blabel { color: #64748b; font-size: 10px; font-weight: 600; text-transform: uppercase; }
    .box-item .bvalue { font-size: 18px; font-weight: 600; color: #0f172a; }
    
    .notes-box { background: #f8fafc; border: 1px solid #e2e8f0; border-left: 3px solid #94a3b8; padding: 14px 18px; border-radius: 4px; color: #334155; }
    
    /* Business Cards (2-column Grid) */
    .cards-row { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .card-cell { width: 100%; display: flex; flex-direction: column; gap: 8px; }
    .card-label { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px dashed #cbd5e1; padding-bottom: 4px; }
    .card-img { width: 100%; max-height: 300px; object-fit: contain; border: 1px solid #cbd5e1; border-radius: 4px; background: #f8fafc; padding: 8px; }
    
    /* Products Grid */
    .page-break { page-break-before: always; break-before: page; padding-top: 10px; }
    .products-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
    .products-count { font-size: 14px; font-weight: 600; color: #0f172a; }
    .product-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
    .product-box { border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; break-inside: avoid; display: flex; flex-direction: column; }
    .product-header-bar { display: flex; justify-content: space-between; align-items: center; background: #f1f5f9; padding: 8px 12px; border-bottom: 1px solid #cbd5e1; }
    .product-num { font-size: 11px; font-weight: 600; color: #475569; }
    .product-name { font-size: 12px; font-weight: 600; color: #0f172a; text-align: right; max-width: 70%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .product-photo { width: 100%; height: 180px; object-fit: contain; background: #fff; border-bottom: 1px solid #e2e8f0; display: block; padding: 8px; }
    .product-no-photo { width: 100%; height: 180px; background: #f8fafc; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 12px; border-bottom: 1px solid #e2e8f0; }
    
    .detail-table { width: 100%; border-collapse: collapse; background: #fff; }
    .detail-table td { padding: 6px 12px; border-bottom: 1px solid #f1f5f9; font-size: 11px; }
    .detail-table tr:last-child td { border-bottom: none; }
    .detail-table .dl { color: #64748b; width: 45%; }
    .detail-table td:last-child { font-weight: 500; color: #334155; }
    
    footer { margin-top: 40px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px; }
    
    .share-bar { display: flex; gap: 12px; margin-bottom: 24px; }
    .share-btn, .print-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; border-radius: 6px; padding: 12px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: Inter, sans-serif; transition: all 0.2s; }
    .share-btn { background: #fff; color: #0f172a; border: 1px solid #cbd5e1; }
    .print-btn { background: #0f172a; color: #fff; border: 1px solid #0f172a; }
    
    @media print {
      .share-bar { display: none !important; }
      body { padding: 0; max-width: none; }
      @page { margin: 15mm; size: A4 portrait; }
    }
    @media (max-width: 600px) {
      body { padding: 20px; }
      .header { flex-direction: column; align-items: flex-start; gap: 12px; }
      .header-meta { text-align: left; }
      .product-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>

  <div class="share-bar">
    <button class="share-btn" onclick="handleShare()">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
      Share
    </button>
    <button class="print-btn" onclick="window.print()">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
      Save as PDF
    </button>
  </div>

  <div class="header">
    <div class="header-main">
      <h1>${fmt(enquiry.customer_name)} <span class="badge">${fmt(enquiry.status)}</span></h1>
    </div>
    <div class="header-meta">
      <div><strong>ID:</strong> ${fmt(enquiry.enquiry_id)}</div>
      <div><strong>Date:</strong> ${new Date(enquiry.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
      <div><strong>Event:</strong> ${fmt(enquiry.event_name)}</div>
    </div>
  </div>

  <section>
    <div class="section-title">Visitor Information</div>
    <table class="info-table">
      <tr><td class="label">Mobile</td><td>${fmt(enquiry.mobile)}</td></tr>
      ${enquiry.business_name ? `<tr><td class="label">Business</td><td>${enquiry.business_name}</td></tr>` : ''}
      ${enquiry.address ? `<tr><td class="label">Address</td><td>${enquiry.address}</td></tr>` : ''}
    </table>
  </section>

  ${(enquiry.advance_amount || enquiry.payment_mode) ? `
  <section>
    <div class="section-title">Advance Payment</div>
    <div class="clean-box">
      ${enquiry.advance_amount ? `<div class="box-item"><div class="blabel">Amount</div><div class="bvalue">&#8377;${Number(enquiry.advance_amount).toLocaleString('en-IN')}</div></div>` : ''}
      ${enquiry.payment_mode ? `<div class="box-item"><div class="blabel">Mode</div><div class="bvalue">${enquiry.payment_mode_custom || enquiry.payment_mode}</div></div>` : ''}
    </div>
  </section>` : ''}

  ${cardImages ? `
  <section>
    <div class="section-title">Business Card</div>
    <div class="cards-row">${cardImages}</div>
  </section>` : ''}

  ${enquiry.general_notes ? `
  <section>
    <div class="section-title">Notes</div>
    <div class="notes-box">${enquiry.general_notes}</div>
  </section>` : ''}

  ${productsHtml}

  <footer>
    Generated by Exhibition Enquiry App &nbsp;•&nbsp; ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
  </footer>

  <script>
    async function handleShare() {
      const title = 'Enquiry - ${esc(fmt(enquiry.customer_name))}';
      const text = 'Exhibition enquiry for ${esc(fmt(enquiry.customer_name))} | Event: ${esc(fmt(enquiry.event_name))}';
      if (navigator.share) {
        try { await navigator.share({ title, text, url: window.location.href }); }
        catch (err) { if (err.name !== 'AbortError') window.print(); }
      } else {
        try {
          await navigator.clipboard.writeText(window.location.href);
          alert('Link copied! Paste it to share.');
        } catch (_) { window.print(); }
      }
    }
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    if (!isMobile) {
      // For desktop, we can just trigger it
      setTimeout(() => window.print(), 800);
    } else {
      // For mobile, wait a bit for images to load then trigger print
      setTimeout(() => window.print(), 800);
    }
  </script>
</div>`;

  // Create a container for the print view
  const printContainer = document.createElement('div');
  printContainer.id = 'print-mount';
  printContainer.style.position = 'absolute';
  printContainer.style.top = '0';
  printContainer.style.left = '0';
  printContainer.style.width = '100%';
  printContainer.style.zIndex = '999999';
  printContainer.style.backgroundColor = '#fff';
  printContainer.innerHTML = html;

  // Add print-specific styles to hide the rest of the app
  const style = document.createElement('style');
  style.id = 'print-style';
  style.innerHTML = `
    @media print {
      body > *:not(#print-mount) { display: none !important; }
      #print-mount { position: relative; z-index: auto; }
    }
  `;
  
  document.head.appendChild(style);
  document.body.appendChild(printContainer);

  // Function to cleanup after printing
  const cleanup = () => {
    if (document.getElementById('print-mount')) {
      document.body.removeChild(printContainer);
    }
    if (document.getElementById('print-style')) {
      document.head.removeChild(style);
    }
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);

  // Fallback cleanup in case afterprint doesn't fire (some mobile browsers)
  setTimeout(cleanup, 60000); // Clean up after 1 min regardless
};

export default exportToPDF;
