import React, { useEffect, useState, useCallback } from 'react';
import { FileDown, ZoomIn, Trash2 } from 'lucide-react';
import * as api from '../services/api';
import Header from '../components/Header';
import ImageLightbox from '../components/ImageLightbox';

/* ─── PDF Export ──────────────────────────────────────────────────────────────
   Builds a rich HTML print page.
   Products are shown in a 4-column image grid (full image, not cropped).
   After every 4 images the grid starts a new row; the details table
   follows after all images. Page-break hints prevent mid-product splits.
─────────────────────────────────────────────────────────────────────────────── */
const exportToPDF = (enquiry) => {
  const fmt = (v) => (v ? String(v) : '—');

  /* ── Product images in a 4-column grid ── */
  const products = enquiry.products || [];

  const productPhotoGrid = products.length > 0 ? `
  <section>
    <div class="section-title">Product Photos (${products.length})</div>
    <div class="photo-grid">
      ${products.map((p, i) => `
        <div class="photo-cell">
          ${p.photo_url
            ? `<img src="${p.photo_url}" class="photo-img" alt="Product ${i + 1}" />`
            : `<div class="photo-placeholder">${i + 1}</div>`}
          <div class="photo-caption">${fmt(p.description)}</div>
        </div>
      `).join('')}
    </div>
  </section>` : '';

  /* ── Product details list ── */
  const productDetailsList = products.length > 0 ? `
  <section style="page-break-before: always;">
    <div class="section-title">Product Details</div>
    ${products.map((p, i) => `
      <div class="product-detail-block">
        <div class="product-num">Product ${i + 1} — ${fmt(p.description)}</div>
        <table class="info-table">
          <tr><td class="label">Quantity</td><td>${fmt(p.quantity)} ${fmt(p.unit)}</td></tr>
          ${p.weight ? `<tr><td class="label">Weight</td><td>${p.weight}</td></tr>` : ''}
          ${p.purity_material ? `<tr><td class="label">Purity / Material</td><td>${p.purity_material}</td></tr>` : ''}
          ${p.customer_requirement ? `<tr><td class="label">Requirement</td><td>${p.customer_requirement}</td></tr>` : ''}
        </table>
      </div>
    `).join('')}
  </section>` : '';

  const cardImages = [enquiry.business_card_url, enquiry.business_card_url_2]
    .filter(Boolean)
    .map((url, i) => `<div class="card-cell">
      <div class="card-label">${i === 0 ? 'Front' : 'Back'}</div>
      <img src="${url}" class="card-img" alt="Business card" />
    </div>`)
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Enquiry – ${fmt(enquiry.customer_name)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Inter, sans-serif; font-size: 13px; color: #0f172a; background: #fff; padding: 28px 32px; }

    /* ── Header ── */
    h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
    .subtitle { color: #64748b; font-size: 11px; margin-bottom: 20px; line-height: 1.7; }
    .badge { display: inline-block; background: #e0e7ff; color: #2563eb; font-size: 11px; font-weight: 700; padding: 2px 10px; border-radius: 20px; margin-left: 8px; vertical-align: middle; }

    /* ── Section ── */
    section { margin-bottom: 24px; }
    .section-title { font-size: 12px; font-weight: 700; color: #2563eb; border-bottom: 2px solid #e0e7ff; padding-bottom: 5px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.07em; }

    /* ── Info table ── */
    .info-table { width: 100%; border-collapse: collapse; }
    .info-table td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    .info-table .label { color: #64748b; font-weight: 600; width: 36%; white-space: nowrap; }

    /* ── Business cards ── */
    .cards-row { display: flex; gap: 20px; flex-wrap: wrap; }
    .card-cell { display: flex; flex-direction: column; gap: 4px; }
    .card-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
    .card-img { max-width: 240px; max-height: 140px; border-radius: 6px; border: 1px solid #e2e8f0; object-fit: contain; display: block; }

    /* ── Advance payment ── */
    .advance-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px 20px; display: flex; gap: 32px; }
    .advance-item .alabel { color: #64748b; font-size: 10px; font-weight: 600; text-transform: uppercase; margin-bottom: 3px; }
    .advance-item .avalue { font-size: 18px; font-weight: 700; color: #15803d; }

    /* ── 4-column product photo grid ── */
    .photo-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }
    .photo-cell {
      display: flex;
      flex-direction: column;
      gap: 4px;
      break-inside: avoid;
    }
    .photo-img {
      width: 100%;
      aspect-ratio: 1 / 1;
      object-fit: contain;       /* full image, no crop */
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      display: block;
    }
    .photo-placeholder {
      width: 100%;
      aspect-ratio: 1 / 1;
      background: #f1f5f9;
      border: 1px dashed #cbd5e1;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
      font-size: 18px;
      font-weight: 700;
    }
    .photo-caption {
      font-size: 10px;
      color: #64748b;
      text-align: center;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* ── Product detail blocks ── */
    .product-detail-block { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 10px; break-inside: avoid; }
    .product-num { font-weight: 700; color: #2563eb; font-size: 12px; margin-bottom: 8px; }

    /* ── Footer ── */
    footer { margin-top: 36px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 12px; }

    /* ── Print overrides ── */
    @media print {
      body { padding: 12px 16px; }
      @page { margin: 14mm 12mm; }
    }
  </style>
</head>
<body>

  <h1>${fmt(enquiry.customer_name)} <span class="badge">${fmt(enquiry.status)}</span></h1>
  <div class="subtitle">
    <strong>ID:</strong> ${fmt(enquiry.enquiry_id)}<br/>
    <strong>Date:</strong> ${new Date(enquiry.created_at).toLocaleString()}<br/>
    <strong>Event:</strong> ${fmt(enquiry.event_name)}
  </div>

  <!-- Visitor info -->
  <section>
    <div class="section-title">Visitor Information</div>
    <table class="info-table">
      <tr><td class="label">Mobile</td><td>${fmt(enquiry.mobile)}</td></tr>
      ${enquiry.business_name ? `<tr><td class="label">Business</td><td>${enquiry.business_name}</td></tr>` : ''}
      ${enquiry.address ? `<tr><td class="label">Address</td><td>${enquiry.address}</td></tr>` : ''}
    </table>
  </section>

  <!-- Advance payment -->
  ${(enquiry.advance_amount || enquiry.payment_mode) ? `
  <section>
    <div class="section-title">Advance Payment</div>
    <div class="advance-box">
      ${enquiry.advance_amount ? `<div class="advance-item"><div class="alabel">Amount</div><div class="avalue">₹${Number(enquiry.advance_amount).toLocaleString('en-IN')}</div></div>` : ''}
      ${enquiry.payment_mode ? `<div class="advance-item"><div class="alabel">Mode</div><div class="avalue">${enquiry.payment_mode_custom || enquiry.payment_mode}</div></div>` : ''}
    </div>
  </section>` : ''}

  <!-- Business card(s) -->
  ${cardImages ? `
  <section>
    <div class="section-title">Business Card</div>
    <div class="cards-row">${cardImages}</div>
  </section>` : ''}

  <!-- Notes -->
  ${enquiry.general_notes ? `
  <section>
    <div class="section-title">Notes</div>
    <p style="line-height:1.6; font-size:13px">${enquiry.general_notes}</p>
  </section>` : ''}

  <!-- Product photo grid (4 per row, full image) -->
  ${productPhotoGrid}

  <!-- Product details (new page) -->
  ${productDetailsList}

  <footer>
    Generated by Exhibition Enquiry App &nbsp;•&nbsp; ${new Date().toLocaleString()}
  </footer>

  <script>
    // Wait for images to load before printing
    window.addEventListener('load', () => { window.print(); });
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

/* ─── Component ────────────────────────────────────────────────────────────── */
const EnquiryDetails = ({ navigateTo, enquiryId, enquiries, onDeleteEnquiry }) => {
  const [enquiry, setEnquiry]     = useState(null);
  const [error, setError]         = useState(null);
  const [lightboxSrc, setLightbox] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
};

export default EnquiryDetails;
