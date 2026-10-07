import React, { useEffect, useState, useCallback } from 'react';
import { FileDown, ZoomIn, Trash2, RefreshCw, Edit } from 'lucide-react';
import * as api from '../services/api';
import Header from '../components/Header';
import ImageLightbox from '../components/ImageLightbox';

const STATUS_COLORS = {
  'New':       { bg: '#e0e7ff', color: '#2563eb' },
  'Follow Up': { bg: '#fef9c3', color: '#ca8a04' },
  'Closed':    { bg: '#dcfce7', color: '#16a34a' },
};
const STATUS_LIST = ['New', 'Follow Up', 'Closed'];

/* ─── PDF Export ──────────────────────────────────────────────────────────────
   Page 1 : Customer details, advance payment, business card, notes.
   Page 2+: Products in a 2x2 grid — always starts on a new page.
   Mobile  : Shows Share + Save PDF buttons (Web Share API).
   Desktop : Auto-opens print dialog after images load.
─────────────────────────────────────────────────────────────────────────────── */
const exportToPDF = (enquiry) => {
  const fmt = (v) => (v ? String(v) : '—');
  const esc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/`/g, '\\`');

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
  <\/script>
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

/* ─── Component ────────────────────────────────────────────────────────────── */
const EnquiryDetails = ({ navigateTo, enquiryId, enquiries, onDeleteEnquiry, onUpdateStatus }) => {
  const [enquiry, setEnquiry]       = useState(null);
  const [error, setError]           = useState(null);
  const [lightboxSrc, setLightbox]  = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showStatusSheet, setShowStatusSheet] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // First try to find from already-loaded list (instant)
    if (enquiries && enquiries.length > 0) {
      const found = enquiries.find(e => e.enquiry_id === enquiryId);
      if (found) {
        setEnquiry(found);
        return; // no network fetch needed
      }
    }

    // Fallback: fetch from API if not in list
    const fetchEnquiry = async () => {
      try {
        const data = await api.getEnquiryById(enquiryId);
        if (!cancelled) setEnquiry(data);
      } catch (err) {
        if (!cancelled) setError('Failed to load details.');
      }
    };
    fetchEnquiry();
    return () => { cancelled = true; };
  }, [enquiryId, enquiries]);

  const openLightbox  = useCallback((src) => setLightbox(src), []);
  const closeLightbox = useCallback(() => setLightbox(null), []);

  const handleDelete = async () => {
    if (!window.confirm('Delete this enquiry? This cannot be undone.')) return;
    setIsDeleting(true);
    try {
      await onDeleteEnquiry(enquiryId);
      navigateTo('enquiries');
    } catch (err) {
      alert('Delete failed. Please try again.');
      setIsDeleting(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!onUpdateStatus) return;
    setIsUpdatingStatus(true);
    try {
      await onUpdateStatus(enquiryId, newStatus);
      // Update local state so badge re-renders instantly
      setEnquiry(prev => prev ? { ...prev, status: newStatus } : prev);
      setShowStatusSheet(false);
    } catch (err) {
      alert(err.message || 'Failed to update status. Please try again.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (error) return (
    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--danger-color)' }}>{error}</div>
  );
  if (!enquiry) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column' }}>
        <div className="spinner" />
      </div>
    );
  }

  const hasAdvance = enquiry.advance_amount || enquiry.payment_mode;

  return (
    <div style={{ paddingBottom: '20px' }}>
      <Header
        title="Enquiry Details"
        showBack={true}
        onBack={() => navigateTo('enquiries')}
      />

      {/* Customer info card */}
      <div className="card">
        <div style={styles.header}>
          <h2 style={{ margin: 0 }}>{enquiry.customer_name}</h2>
          <span
            style={{
              ...styles.statusBadge,
              backgroundColor: STATUS_COLORS[enquiry.status]?.bg || '#e0e7ff',
              color: STATUS_COLORS[enquiry.status]?.color || 'var(--primary-color)',
              cursor: onUpdateStatus ? 'pointer' : 'default',
            }}
            onClick={() => onUpdateStatus && setShowStatusSheet(true)}
            title={onUpdateStatus ? 'Tap to change status' : ''}
          >
            {enquiry.status}
          </span>
        </div>

        <div style={styles.infoGrid}>
          <div style={styles.infoItem}>
            <div style={styles.infoLabel}>Mobile</div>
            <div style={styles.infoValue}>{enquiry.mobile}</div>
          </div>
          {enquiry.business_name && (
            <div style={styles.infoItem}>
              <div style={styles.infoLabel}>Business</div>
              <div style={styles.infoValue}>{enquiry.business_name}</div>
            </div>
          )}
          <div style={styles.infoItem}>
            <div style={styles.infoLabel}>Date</div>
            <div style={styles.infoValue}>{new Date(enquiry.created_at).toLocaleDateString()}</div>
          </div>
          <div style={styles.infoItem}>
            <div style={styles.infoLabel}>Event</div>
            <div style={styles.infoValue}>{enquiry.event_name}</div>
          </div>
          {enquiry.address && (
            <div style={{ ...styles.infoItem, gridColumn: '1 / -1' }}>
              <div style={styles.infoLabel}>Address</div>
              <div style={styles.infoValue}>{enquiry.address}</div>
            </div>
          )}
        </div>
      </div>

      {/* Advance Payment */}
      {hasAdvance && (
        <div className="card" style={styles.advanceCard}>
          <h3 style={styles.sectionTitle}>Advance Payment</h3>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            {enquiry.advance_amount && (
              <div>
                <div style={styles.infoLabel}>Amount</div>
                <div style={styles.advanceAmount}>
                  ₹{Number(enquiry.advance_amount).toLocaleString('en-IN')}
                </div>
              </div>
            )}
            {enquiry.payment_mode && (
              <div>
                <div style={styles.infoLabel}>Mode</div>
                <div style={{ ...styles.infoValue, fontWeight: '700' }}>
                  {enquiry.payment_mode_custom || enquiry.payment_mode}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Business Cards */}
      {(enquiry.business_card_url || enquiry.business_card_url_2) && (
        <div className="card">
          <h3 style={styles.sectionTitle}>Business Card</h3>
          <div style={styles.twoCardGrid}>
            {[
              { url: enquiry.business_card_url, label: 'Front' },
              { url: enquiry.business_card_url_2, label: 'Back' },
            ].filter(c => c.url).map(c => (
              <div key={c.label} style={styles.cardSlot}>
                <div style={styles.cardSlotLabel}>{c.label}</div>
                <div style={{ position: 'relative' }}>
                  <img
                    src={c.url}
                    alt={`Business Card ${c.label}`}
                    style={{ ...styles.businessCard, cursor: 'zoom-in' }}
                    onClick={() => openLightbox(c.url)}
                    loading="lazy"
                    onError={(e) => { e.target.style.opacity = '0.3'; }}
                  />
                  <button style={styles.zoomOverlay} onClick={() => openLightbox(c.url)} aria-label="Expand image">
                    <ZoomIn size={16} color="white" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {enquiry.general_notes && (
        <div className="card">
          <h3 style={styles.sectionTitle}>Notes</h3>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>{enquiry.general_notes}</p>
        </div>
      )}

      {/* Products */}
      <div style={{ marginTop: '8px' }}>
        <h3 style={{ ...styles.sectionTitle, marginBottom: '12px' }}>
          Products ({enquiry.products?.length || 0})
        </h3>

        <div style={styles.productGrid}>
          {enquiry.products?.map(product => (
            <div key={product.product_id} className="card" style={styles.productCard}>
              <div style={{ position: 'relative' }}>
                <img
                  src={product.photo_url}
                  alt="Product"
                  style={{ ...styles.productImg, cursor: 'zoom-in' }}
                  onClick={() => openLightbox(product.photo_url)}
                  loading="lazy"
                  onError={(e) => { e.target.style.opacity = '0.3'; }}
                />
                <button style={styles.zoomOverlay} onClick={() => openLightbox(product.photo_url)} aria-label="Expand product image">
                  <ZoomIn size={16} color="white" />
                </button>
              </div>
              <div style={styles.productContent}>
                <div style={styles.productTitle}>{product.description}</div>
                <div style={styles.productMeta}>
                  <div style={styles.metaBadge}>Qty: {product.quantity} {product.unit}</div>
                  {product.weight && <div style={styles.metaBadge}>{product.weight}</div>}
                  {product.purity_material && <div style={styles.metaBadge}>{product.purity_material}</div>}
                </div>
                {product.customer_requirement && (
                  <div style={styles.reqBlock}>
                    <strong>Req:</strong> {product.customer_requirement}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div style={styles.actionBar}>
        <button
          className="btn btn-primary"
          onClick={() => exportToPDF(enquiry)}
          style={styles.exportBtn}
        >
          <FileDown size={20} />
          Export PDF
        </button>
        <button
          className="btn"
          onClick={() => navigateTo('edit-enquiry', { enquiryId: enquiry.enquiry_id })}
          style={styles.editBtn}
        >
          <Edit size={18} />
          Edit
        </button>
        {onUpdateStatus && (
          <button
            className="btn"
            onClick={() => setShowStatusSheet(true)}
            disabled={isUpdatingStatus}
            style={styles.statusBtn}
          >
            {isUpdatingStatus
              ? <div className="spinner" style={{ width: 18, height: 18, borderLeftColor: 'var(--primary-color)' }} />
              : <RefreshCw size={18} />}
            Status
          </button>
        )}
        <button
          className="btn"
          onClick={handleDelete}
          disabled={isDeleting}
          style={styles.deleteBtn}
        >
          {isDeleting
            ? <div className="spinner" style={{ width: 18, height: 18, borderLeftColor: 'white' }} />
            : <Trash2 size={18} />}
          Delete
        </button>
      </div>

      {/* Status change sheet */}
      {showStatusSheet && (
        <>
          <div
            style={{
              position: 'fixed', inset: 0,
              backgroundColor: 'rgba(0,0,0,0.4)',
              zIndex: 200, backdropFilter: 'blur(2px)',
            }}
            onClick={() => !isUpdatingStatus && setShowStatusSheet(false)}
          />
          <div style={detailSheetStyles.sheet}>
            <div style={detailSheetStyles.handle} />
            <div style={detailSheetStyles.title}>Change Status</div>
            <div style={detailSheetStyles.name}>{enquiry.customer_name}</div>
            <div style={detailSheetStyles.options}>
              {STATUS_LIST.map(s => {
                const sc     = STATUS_COLORS[s];
                const active = enquiry.status === s;
                return (
                  <button
                    key={s}
                    style={{
                      ...detailSheetStyles.optBtn,
                      backgroundColor: active ? sc.bg : 'transparent',
                      border: `2px solid ${active ? sc.color : 'var(--border-color)'}`,
                      color: active ? sc.color : 'var(--text-main)',
                      opacity: isUpdatingStatus ? 0.6 : 1,
                    }}
                    disabled={isUpdatingStatus || active}
                    onClick={() => handleStatusChange(s)}
                  >
                    {active && <span style={{ marginRight: '6px' }}>✓</span>}
                    {s}
                    {active && <span style={{ fontSize: '0.7rem', marginLeft: '6px', opacity: 0.7 }}>(current)</span>}
                  </button>
                );
              })}
            </div>
            {isUpdatingStatus && (
              <div style={{ textAlign: 'center', padding: '8px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Saving…</div>
            )}
            <button
              style={detailSheetStyles.cancelBtn}
              onClick={() => setShowStatusSheet(false)}
              disabled={isUpdatingStatus}
            >Cancel</button>
          </div>
        </>
      )}

      {lightboxSrc && (
        <ImageLightbox
          src={lightboxSrc}
          alt="Full screen view"
          onClose={closeLightbox}
        />
      )}
    </div>
  );
};

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    paddingBottom: '16px',
    borderBottom: '1px solid var(--border-color)',
  },
  statusBadge: {
    fontSize: '0.75rem',
    padding: '4px 12px',
    backgroundColor: '#e0e7ff',
    color: 'var(--primary-color)',
    borderRadius: '16px',
    fontWeight: '600',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
  },
  infoLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginBottom: '4px',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: '0.9rem',
    fontWeight: '500',
    color: 'var(--text-main)',
  },
  sectionTitle: {
    fontSize: '1rem',
    marginBottom: '12px',
    color: 'var(--text-main)',
    fontWeight: '600',
  },
  advanceCard: {
    borderLeft: '4px solid var(--success-color)',
  },
  advanceAmount: {
    fontSize: '1.3rem',
    fontWeight: '700',
    color: 'var(--success-color)',
  },
  twoCardGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  cardSlot: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  cardSlotLabel: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  businessCard: {
    width: '100%',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    display: 'block',
  },
  zoomOverlay: {
    position: 'absolute',
    bottom: '6px',
    right: '6px',
    backgroundColor: 'rgba(0,0,0,0.55)',
    border: 'none',
    borderRadius: '6px',
    width: '30px',
    height: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  productGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  productCard: {
    padding: 0,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  productImg: {
    width: '100%',
    height: '200px',
    objectFit: 'cover',
    display: 'block',
  },
  productContent: {
    padding: '16px',
  },
  productTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    marginBottom: '8px',
  },
  productMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '12px',
  },
  metaBadge: {
    fontSize: '0.75rem',
    backgroundColor: 'var(--bg-color)',
    padding: '4px 8px',
    borderRadius: '4px',
    color: 'var(--text-muted)',
  },
  reqBlock: {
    fontSize: '0.85rem',
    backgroundColor: '#fef3c7',
    padding: '8px 12px',
    borderRadius: '6px',
    color: '#92400e',
  },
  actionBar: {
    marginTop: '24px',
    display: 'flex',
    gap: '12px',
  },
  exportBtn: {
    flex: 1,
    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
    borderRadius: '12px',
    fontWeight: '700',
    fontSize: '1rem',
  },
  deleteBtn: {
    flex: 0,
    minWidth: '100px',
    backgroundColor: 'var(--danger-color)',
    color: 'white',
    borderRadius: '12px',
    fontWeight: '600',
    gap: '6px',
  },
  editBtn: {
    flex: 0,
    minWidth: '100px',
    backgroundColor: '#f1f5f9',
    color: '#334155',
    border: '1px solid #cbd5e1',
    borderRadius: '12px',
    fontWeight: '600',
    gap: '6px',
  },
  statusBtn: {
    flex: 0,
    minWidth: '100px',
    backgroundColor: 'white',
    color: 'var(--primary-color)',
    border: '1.5px solid var(--primary-color)',
    borderRadius: '12px',
    fontWeight: '600',
    gap: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

const detailSheetStyles = {
  sheet: {
    position: 'fixed',
    bottom: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: '480px',
    backgroundColor: 'white',
    borderRadius: '20px 20px 0 0',
    padding: '12px 20px 32px',
    zIndex: 201,
    boxShadow: '0 -4px 32px rgba(0,0,0,0.18)',
  },
  handle: {
    width: '40px',
    height: '4px',
    backgroundColor: '#cbd5e1',
    borderRadius: '4px',
    margin: '0 auto 16px',
  },
  title: {
    fontSize: '1rem',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: '4px',
    color: 'var(--text-main)',
  },
  name: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    textAlign: 'center',
    marginBottom: '20px',
  },
  options: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '16px',
  },
  optBtn: {
    width: '100%',
    padding: '13px 16px',
    borderRadius: '12px',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s',
  },
  cancelBtn: {
    width: '100%',
    padding: '13px',
    borderRadius: '12px',
    background: '#f1f5f9',
    border: 'none',
    fontSize: '0.95rem',
    fontWeight: '600',
    color: 'var(--text-muted)',
    cursor: 'pointer',
  },
};

export default EnquiryDetails;

