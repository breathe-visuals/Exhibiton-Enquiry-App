import React, { useEffect, useState, useCallback } from 'react';
import { FileDown, ZoomIn } from 'lucide-react';
import * as api from '../services/api';
import Header from '../components/Header';
import ImageLightbox from '../components/ImageLightbox';

/* ─── PDF Export ──────────────────────────────────────────────────────────────
   We build an HTML string and open a print window. No external lib needed.
   The browser's "Save as PDF" / "Print to PDF" does the rest.
─────────────────────────────────────────────────────────────────────────────── */
const exportToPDF = (enquiry) => {
  const fmt = (v) => (v ? String(v) : '—');

  const productRows = (enquiry.products || []).map((p, i) => `
    <div class="product-block">
      <div class="product-num">Product ${i + 1}</div>
      ${p.photo_url ? `<img src="${p.photo_url}" class="product-img" alt="Product photo" />` : ''}
      <table class="info-table">
        <tr><td class="label">Description</td><td>${fmt(p.description)}</td></tr>
        <tr><td class="label">Quantity</td><td>${fmt(p.quantity)} ${fmt(p.unit)}</td></tr>
        ${p.weight ? `<tr><td class="label">Weight</td><td>${p.weight}</td></tr>` : ''}
        ${p.purity_material ? `<tr><td class="label">Purity / Material</td><td>${p.purity_material}</td></tr>` : ''}
        ${p.customer_requirement ? `<tr><td class="label">Requirement</td><td>${p.customer_requirement}</td></tr>` : ''}
      </table>
    </div>
  `).join('');

  const cardImages = [enquiry.business_card_url, enquiry.business_card_url_2]
    .filter(Boolean)
    .map(url => `<img src="${url}" class="card-img" alt="Business card" />`)
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Enquiry – ${fmt(enquiry.customer_name)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Inter, sans-serif; font-size: 13px; color: #0f172a; background: #fff; padding: 32px; }
    h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
    .subtitle { color: #64748b; font-size: 12px; margin-bottom: 24px; }
    .badge { display: inline-block; background: #e0e7ff; color: #2563eb; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 20px; margin-left: 10px; vertical-align: middle; }
    section { margin-bottom: 28px; }
    .section-title { font-size: 14px; font-weight: 700; color: #2563eb; border-bottom: 2px solid #e0e7ff; padding-bottom: 6px; margin-bottom: 14px; text-transform: uppercase; letter-spacing: 0.05em; }
    .info-table { width: 100%; border-collapse: collapse; }
    .info-table td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    .info-table .label { color: #64748b; font-weight: 600; width: 38%; white-space: nowrap; }
    .cards-row { display: flex; gap: 16px; flex-wrap: wrap; }
    .card-img { max-width: 260px; max-height: 160px; border-radius: 8px; border: 1px solid #e2e8f0; object-fit: contain; }
    .product-block { border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-bottom: 16px; break-inside: avoid; }
    .product-num { font-weight: 700; color: #2563eb; margin-bottom: 10px; }
    .product-img { width: 100%; max-height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 12px; }
    .advance-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 16px; display: flex; gap: 32px; }
    .advance-item .label { color: #64748b; font-size: 11px; font-weight: 600; text-transform: uppercase; margin-bottom: 2px; }
    .advance-item .value { font-size: 16px; font-weight: 700; color: #15803d; }
    footer { margin-top: 40px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <h1>${fmt(enquiry.customer_name)} <span class="badge">${fmt(enquiry.status)}</span></h1>
  <div class="subtitle">
    Enquiry ID: ${fmt(enquiry.enquiry_id)} &nbsp;|&nbsp;
    Date: ${new Date(enquiry.created_at).toLocaleString()} &nbsp;|&nbsp;
    Event: ${fmt(enquiry.event_name)}
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
      ${enquiry.advance_amount ? `<div class="advance-item"><div class="label">Amount</div><div class="value">₹${Number(enquiry.advance_amount).toLocaleString('en-IN')}</div></div>` : ''}
      ${enquiry.payment_mode ? `<div class="advance-item"><div class="label">Mode</div><div class="value">${enquiry.payment_mode_custom || enquiry.payment_mode}</div></div>` : ''}
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
    <p style="line-height:1.6">${enquiry.general_notes}</p>
  </section>` : ''}

  ${(enquiry.products || []).length > 0 ? `
  <section>
    <div class="section-title">Products Interested (${enquiry.products.length})</div>
    ${productRows}
  </section>` : ''}

  <footer>Generated by Exhibition Enquiry App &nbsp;•&nbsp; ${new Date().toLocaleString()}</footer>

  <script>window.onload = () => { window.print(); }</script>
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
const EnquiryDetails = ({ navigateTo, enquiryId }) => {
  const [enquiry, setEnquiry] = useState(null);
  const [error, setError] = useState(null);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  useEffect(() => {
    let cancelled = false;
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
  }, [enquiryId]);

  const openLightbox = useCallback((src) => setLightboxSrc(src), []);
  const closeLightbox = useCallback(() => setLightboxSrc(null), []);

  if (error) return <div style={{ padding: '20px', textAlign: 'center', color: 'var(--danger-color)' }}>{error}</div>;
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
          <span style={styles.statusBadge}>{enquiry.status}</span>
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

      {/* Export PDF button */}
      <div style={styles.exportBar}>
        <button
          className="btn btn-primary btn-block"
          onClick={() => exportToPDF(enquiry)}
          style={styles.exportBtn}
        >
          <FileDown size={20} />
          Export Enquiry as PDF
        </button>
      </div>

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
  exportBar: {
    marginTop: '24px',
    paddingTop: '16px',
    borderTop: '1px solid var(--border-color)',
  },
  exportBtn: {
    background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
    borderRadius: '12px',
    fontWeight: '700',
    fontSize: '1rem',
    letterSpacing: '0.02em',
  },
};

export default EnquiryDetails;
