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
          <div class="product-num">Product #${i + 1}</div>
          <div class="product-name">${fmt(p.description)}</div>
          ${p.photo_url
            ? `<img src="${p.photo_url}" class="product-photo" alt="Product ${i + 1}" loading="eager" />`
            : `<div class="product-no-photo">No Photo</div>`}
          <table class="detail-table">
            <tr><td class="dl">Quantity</td><td>${fmt(p.quantity)} ${fmt(p.unit)}</td></tr>
            ${p.weight ? `<tr><td class="dl">Weight</td><td>${p.weight}</td></tr>` : ''}
            ${p.purity_material ? `<tr><td class="dl">Purity / Material</td><td>${p.purity_material}</td></tr>` : ''}
            ${p.customer_requirement ? `<tr><td class="dl">Requirement</td><td>${p.customer_requirement}</td></tr>` : ''}
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
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Inter, sans-serif; font-size: 13px; color: #0f172a; background: #fff; padding: 28px 32px; max-width: 860px; margin: 0 auto; }
    .cover { background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%); border-radius: 14px; padding: 24px 28px; color: white; margin-bottom: 28px; }
    .cover h1 { font-size: 22px; font-weight: 700; margin-bottom: 8px; }
    .cover .meta { opacity: 0.88; font-size: 12px; line-height: 2; }
    .cover .badge { display: inline-block; background: rgba(255,255,255,0.25); color: white; font-size: 11px; font-weight: 700; padding: 3px 12px; border-radius: 20px; margin-left: 10px; vertical-align: middle; }
    section { margin-bottom: 22px; }
    .section-title { font-size: 11px; font-weight: 700; color: #2563eb; border-bottom: 2px solid #e0e7ff; padding-bottom: 5px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.08em; }
    .info-table { width: 100%; border-collapse: collapse; }
    .info-table td { padding: 7px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    .info-table .label { color: #64748b; font-weight: 600; width: 35%; white-space: nowrap; }
    .info-table tr:last-child td { border-bottom: none; }
    .cards-row { display: flex; gap: 20px; flex-wrap: wrap; }
    .card-cell { display: flex; flex-direction: column; gap: 6px; }
    .card-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
    .card-img { max-width: 220px; max-height: 130px; border-radius: 8px; border: 1px solid #e2e8f0; object-fit: contain; display: block; }
    .advance-box { background: linear-gradient(135deg, #f0fdf4, #ecfdf5); border: 1px solid #bbf7d0; border-radius: 10px; padding: 16px 20px; display: flex; gap: 32px; flex-wrap: wrap; }
    .advance-item .alabel { color: #64748b; font-size: 10px; font-weight: 600; text-transform: uppercase; margin-bottom: 4px; }
    .advance-item .avalue { font-size: 20px; font-weight: 700; color: #15803d; }
    .notes-box { background: #fefce8; border-left: 3px solid #fbbf24; padding: 12px 16px; border-radius: 0 8px 8px 0; line-height: 1.7; color: #78350f; }
    .page-break { page-break-before: always; break-before: page; padding-top: 4px; }
    .products-header { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; margin-bottom: 16px; display: flex; align-items: center; gap: 10px; }
    .products-count { font-size: 13px; font-weight: 700; color: #0f172a; }
    .products-count span { color: #2563eb; }
    .product-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
    .product-box { border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; break-inside: avoid; display: flex; flex-direction: column; box-shadow: 0 1px 4px rgba(0,0,0,0.07); }
    .product-num { font-size: 10px; font-weight: 700; color: #fff; background: linear-gradient(135deg, #2563eb, #7c3aed); padding: 4px 10px; letter-spacing: 0.05em; }
    .product-name { font-size: 12px; font-weight: 700; color: #0f172a; padding: 8px 10px 5px; border-bottom: 1px solid #f1f5f9; line-height: 1.4; }
    .product-photo { width: 100%; aspect-ratio: 4 / 3; object-fit: contain; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: block; }
    .product-no-photo { width: 100%; aspect-ratio: 4 / 3; background: #f1f5f9; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 12px; border-bottom: 1px solid #e2e8f0; }
    .detail-table { width: 100%; border-collapse: collapse; flex: 1; }
    .detail-table td { padding: 5px 9px; border-bottom: 1px solid #f8fafc; font-size: 11px; vertical-align: top; }
    .detail-table tr:last-child td { border-bottom: none; }
    .detail-table .dl { color: #64748b; font-weight: 600; white-space: nowrap; width: 42%; }
    footer { margin-top: 36px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 12px; }
    .share-bar { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
    .share-btn { flex: 1; min-width: 130px; display: flex; align-items: center; justify-content: center; gap: 8px; background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; border: none; border-radius: 10px; padding: 13px 18px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: Inter, sans-serif; box-shadow: 0 4px 12px rgba(37,99,235,0.3); }
    .print-btn { flex: 1; min-width: 130px; display: flex; align-items: center; justify-content: center; gap: 8px; background: #f1f5f9; color: #334155; border: 1px solid #e2e8f0; border-radius: 10px; padding: 13px 18px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: Inter, sans-serif; }
    @media print {
      .share-bar { display: none !important; }
      body { padding: 0; max-width: none; }
      @page { margin: 12mm 10mm; size: A4 portrait; }
    }
    @media (max-width: 600px) {
      body { padding: 16px; }
      .cover { border-radius: 10px; padding: 16px; }
      .cover h1 { font-size: 18px; }
      .product-grid { gap: 10px; }
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

  <div class="cover">
    <h1>${fmt(enquiry.customer_name)} <span class="badge">${fmt(enquiry.status)}</span></h1>
    <div class="meta">
      <strong>ID:</strong> ${fmt(enquiry.enquiry_id)}&nbsp;&nbsp;|&nbsp;&nbsp;
      <strong>Date:</strong> ${new Date(enquiry.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}&nbsp;&nbsp;|&nbsp;&nbsp;
      <strong>Event:</strong> ${fmt(enquiry.event_name)}
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
    <div class="advance-box">
      ${enquiry.advance_amount ? `<div class="advance-item"><div class="alabel">Amount</div><div class="avalue">&#8377;${Number(enquiry.advance_amount).toLocaleString('en-IN')}</div></div>` : ''}
      ${enquiry.payment_mode ? `<div class="advance-item"><div class="alabel">Mode</div><div class="avalue">${enquiry.payment_mode_custom || enquiry.payment_mode}</div></div>` : ''}
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
      window.addEventListener('load', () => setTimeout(() => window.print(), 800));
    }
  </script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  } else {
    alert('Please allow pop-ups to export PDF.');
  }
};

export default exportToPDF;
