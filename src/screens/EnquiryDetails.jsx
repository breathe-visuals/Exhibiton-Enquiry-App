import React, { useEffect, useState, useCallback } from 'react';
import { FileDown, ZoomIn, Trash2, RefreshCw, Edit, MessageCircle } from 'lucide-react';
import * as api from '../services/api';
import Header from '../components/Header';
import ImageLightbox from '../components/ImageLightbox';
import exportToPDF from '../utils/pdfExporter';

const STATUS_COLORS = {
  'New':       { bg: '#e0e7ff', color: '#2563eb' },
  'Follow Up': { bg: '#fef9c3', color: '#ca8a04' },
  'Closed':    { bg: '#dcfce7', color: '#16a34a' },
};
const STATUS_LIST = ['New', 'Follow Up', 'Closed'];


/* ─── Component ────────────────────────────────────────────────────────────── */
const EnquiryDetails = ({ navigateTo, enquiryId, enquiries, onDeleteEnquiry, onUpdateStatus }) => {
  const [enquiry, setEnquiry]       = useState(null);
  const [error, setError]           = useState(null);
  const [lightboxSrc, setLightbox]  = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showStatusSheet, setShowStatusSheet] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Step 1: Hydrate from local list. This reacts if 'enquiries' loads late (hard refresh)
  useEffect(() => {
    if (enquiries && enquiries.length > 0) {
      const foundInList = enquiries.find(e => String(e.enquiry_id) === String(enquiryId));
      if (foundInList) {
        setEnquiry(foundInList);
        setError(null);
      }
    }
  }, [enquiryId, enquiries]);

  // Step 2: Fetch fresh data from server exactly once per enquiryId
  useEffect(() => {
    let cancelled = false;
    const fetchFresh = async () => {
      try {
        const data = await api.getEnquiryById(enquiryId);
        if (!cancelled && data) {
          setEnquiry({ ...data, products: Array.isArray(data.products) ? data.products : [] });
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          // We only want to set an error if we NEVER found it locally either
          setEnquiry(prev => {
            if (!prev) setError('Failed to load details. Please check your internet connection.');
            return prev;
          });
        }
      }
    };
    fetchFresh();
    return () => { cancelled = true; };
  }, [enquiryId]);


  const openLightbox  = useCallback((src) => setLightbox(src), []);
  const closeLightbox = useCallback(() => setLightbox(null), []);

  const handleWhatsApp = () => {
    let phone = enquiry.mobile.replace(/\D/g, ''); // strip non-digits
    if (phone.length === 10) phone = '91' + phone; // Default to India if 10 digits

    const text = `Hi ${enquiry.customer_name},\n\nIt was great meeting you at ${enquiry.event_name}! Please find the requested details attached.`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

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
          className="btn"
          onClick={handleWhatsApp}
          style={{ ...styles.exportBtn, backgroundColor: '#25D366', color: '#fff', border: '1px solid #25D366' }}
        >
          <MessageCircle size={20} />
          WhatsApp
        </button>
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
    flexWrap: 'wrap',
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

