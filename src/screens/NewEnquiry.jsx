import React, { useState, useEffect, useRef } from 'react';
import { Camera, Image as ImageIcon, Check, X, Plus, ZoomIn } from 'lucide-react';
import Header from '../components/Header';
import AddProductModal from './AddProductModal';
import ImageLightbox from '../components/ImageLightbox';
import { compressImage } from '../utils/imageUtils';

const PAYMENT_MODES = ['Cash', 'RTGS', 'NEFT', 'UPI', 'Cheque', 'Card', 'Other'];

const BLANK_FORM = {
  customer_name: '',
  mobile: '',
  business_name: '',
  address: '',
  event_name: 'Gems & Jewellery Expo 2026',
  general_notes: '',
  business_card_url: null,
  business_card_url_2: null,
  advance_amount: '',
  payment_mode: '',
  payment_mode_custom: '',
};

const NewEnquiry = ({ navigateTo, setIsDirty, onSave, editingEnquiryId, enquiries }) => {
  const [formData, setFormData] = useState(BLANK_FORM);
  const [products, setProducts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);   // success banner
  const [saveError, setSaveError] = useState(null); // error banner
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [removedImageUrls, setRemovedImageUrls] = useState([]);
  const saveInProgress = useRef(false); // double-submit guard

  useEffect(() => {
    return () => setIsDirty(false);
  }, [setIsDirty]);

  // Load existing data if editing
  useEffect(() => {
    if (editingEnquiryId && enquiries) {
      const existing = enquiries.find(e => e.enquiry_id === editingEnquiryId);
      if (existing) {
        setFormData(existing);
        setProducts(existing.products || []);
        setRemovedImageUrls([]);
      }
    } else {
      setFormData(BLANK_FORM);
      setProducts([]);
    }
  }, [editingEnquiryId, enquiries]);

  // Auto-dismiss success banner after 3 s
  useEffect(() => {
    if (!savedOk) return;
    const t = setTimeout(() => setSavedOk(false), 3000);
    return () => clearTimeout(t);
  }, [savedOk]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setIsDirty(true);
  };

  const handleCardCapture = async (e, slot) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const compressedDataUrl = await compressImage(file);
        // Track the old image if it's a Drive URL to ensure it gets deleted
        const oldUrl = formData[slot];
        if (oldUrl && typeof oldUrl === 'string' && oldUrl.includes('drive.google.com')) {
          setRemovedImageUrls(prev => [...prev, oldUrl]);
        }
        setFormData(prev => ({ ...prev, [slot]: compressedDataUrl }));
        setIsDirty(true);
      } catch (err) {
        alert('Failed to process image.');
      }
    }
    e.target.value = '';
  };

  const handleSaveProduct = (product) => {
    // Track old Drive photo URLs for cleanup
    if (product._oldPhotoUrl) {
      setRemovedImageUrls(prev => [...prev, product._oldPhotoUrl]);
      delete product._oldPhotoUrl;
    }
    if (editingProduct) {
      setProducts(products.map(p => p.product_id === product.product_id ? product : p));
    } else {
      setProducts([...products, product]);
    }
    setIsModalOpen(false);
    setEditingProduct(null);
    setIsDirty(true);
  };

  const deleteProduct = (id) => {
    if (window.confirm('Are you sure you want to remove this product?')) {
      const removedProduct = products.find(p => p.product_id === id);
      if (removedProduct?.photo_url?.includes?.('drive.google.com')) {
        setRemovedImageUrls(prev => [...prev, removedProduct.photo_url]);
      }
      setProducts(products.filter(p => p.product_id !== id));
      setIsDirty(true);
    }
  };

  const handleSaveEnquiry = async () => {
    if (saveInProgress.current) return; // prevent double-tap
    if (!String(formData.customer_name || '').trim() || !String(formData.mobile || '').trim()) {
      setSaveError('Customer Name and Mobile Number are required.');
      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch(e) { window.scrollTo(0,0); }
      return;
    }

    saveInProgress.current = true;
    setIsSaving(true);
    setSaveError(null);
    setSavedOk(false);

    const enquiry = {
      ...formData,
      products,
      created_by: 'Current User',
      _removedImageUrls: removedImageUrls,
    };

    try {
      await onSave(enquiry);          // ← wait for the full save (API + re-fetch)
      
      setIsDirty(false);
      setSavedOk(true);
      
      if (editingEnquiryId) {
        // If editing, go back to details immediately so they can't click update again
        navigateTo('enquiry-details', { enquiryId: editingEnquiryId });
      } else {
        // ✅ Success: reset form so next enquiry can be entered right away
        setFormData(BLANK_FORM);
        setProducts([]);
        setRemovedImageUrls([]);
        // Scroll back to top so success banner is visible
        try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch(e) { window.scrollTo(0,0); }
      }
    } catch (error) {
      console.error(error);
      setSaveError(error.message || 'Failed to save enquiry. Please try again.');
      // Scroll to top so the user sees the error banner
      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch(e) { window.scrollTo(0,0); }
    } finally {
      setIsSaving(false);
      saveInProgress.current = false;
    }
  };

  const renderCardSlot = (slotKey, label) => {
    const url = formData[slotKey];
    return (
      <div style={styles.cardSlot}>
        <div style={styles.cardSlotLabel}>{label}</div>
        {url ? (
          <div style={styles.cardPreviewContainer}>
            <div style={{ position: 'relative' }}>
              <img
                src={url}
                alt={label}
                style={styles.cardPreview}
              />
              {/* Tap-to-expand overlay */}
              <button
                style={styles.zoomBtn}
                onClick={() => setLightboxSrc(url)}
                aria-label="Expand image"
              >
                <ZoomIn size={18} color="white" />
              </button>
            </div>
            <button
              className="btn btn-secondary mt-sm"
              onClick={() => {
                const oldUrl = formData[slotKey];
                if (oldUrl && typeof oldUrl === 'string' && oldUrl.includes('drive.google.com')) {
                  setRemovedImageUrls(prev => [...prev, oldUrl]);
                }
                setFormData(p => ({ ...p, [slotKey]: null }));
              }}
            >
              <X size={16} /> Remove
            </button>
          </div>
        ) : (
          <label style={styles.uploadBtn}>
            <Camera size={24} />
            <span>Capture {label}</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={(e) => handleCardCapture(e, slotKey)}
            />
          </label>
        )}
      </div>
    );
  };

  return (
    <div style={{ paddingBottom: '80px' }}>
      <Header
        title={editingEnquiryId ? "Edit Enquiry" : "New Enquiry"}
        showBack={true}
        onBack={() => navigateTo(editingEnquiryId ? 'enquiry-details' : 'dashboard')}
      />

      {/* ── Success banner ───────────────────────────────────────────── */}
      {savedOk && (
        <div style={bannerStyles.success}>
          <Check size={18} style={{ flexShrink: 0 }} />
          Enquiry saved! Form reset — ready for the next one.
        </div>
      )}

      {/* ── Error banner ─────────────────────────────────────────────── */}
      {saveError && (
        <div style={bannerStyles.error}>
          <span style={{ flex: 1 }}>⚠️ {saveError}</span>
          <button style={bannerStyles.closeBtn} onClick={() => setSaveError(null)}>✕</button>
        </div>
      )}

      {/* Visitor Details */}
      <div className="card">
        <h3 style={styles.sectionTitle}>Visitor Details</h3>

        <div className="form-group">
          <label className="form-label">Customer Name *</label>
          <input type="text" className="form-input" name="customer_name" value={formData.customer_name} onChange={handleChange} />
        </div>

        <div className="form-group">
          <label className="form-label">Mobile Number *</label>
          <input type="tel" className="form-input" name="mobile" value={formData.mobile} onChange={handleChange} />
        </div>

        <div className="form-group">
          <label className="form-label">Business Name (optional)</label>
          <input type="text" className="form-input" name="business_name" value={formData.business_name} onChange={handleChange} />
        </div>

        <div className="form-group">
          <label className="form-label">Address (optional)</label>
          <textarea
            className="form-textarea"
            name="address"
            value={formData.address}
            onChange={handleChange}
            rows="2"
            placeholder="City, State, Country..."
          />
        </div>

        <div className="form-group">
          <label className="form-label">Event Name</label>
          <input type="text" className="form-input" name="event_name" value={formData.event_name} onChange={handleChange} />
        </div>
      </div>

      {/* Business Cards — two slots */}
      <div className="card">
        <h3 style={styles.sectionTitle}>Business Card</h3>
        <div style={styles.twoCardGrid}>
          {renderCardSlot('business_card_url', 'Card Front')}
          {renderCardSlot('business_card_url_2', 'Card Back')}
        </div>
      </div>

      {/* Advance Payment */}
      <div className="card">
        <h3 style={styles.sectionTitle}>Advance Payment</h3>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label className="form-label">Advance Amount (₹)</label>
            <input
              type="number"
              className="form-input"
              name="advance_amount"
              value={formData.advance_amount}
              onChange={handleChange}
              placeholder="0"
              min="0"
            />
          </div>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label className="form-label">Payment Mode</label>
            <select
              className="form-select"
              name="payment_mode"
              value={formData.payment_mode}
              onChange={handleChange}
            >
              <option value="">Select...</option>
              {PAYMENT_MODES.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
        {/* Free-text override */}
        {formData.payment_mode === 'Other' && (
          <div className="form-group" style={{ marginTop: '12px' }}>
            <label className="form-label">Specify Payment Mode</label>
            <input
              type="text"
              className="form-input"
              name="payment_mode_custom"
              value={formData.payment_mode_custom || ''}
              onChange={handleChange}
              placeholder="e.g. DD, Wire Transfer..."
            />
          </div>
        )}
      </div>

      {/* Products */}
      <div className="card" style={{ backgroundColor: 'transparent', boxShadow: 'none', padding: 0 }}>
        <div className="flex justify-between items-center mb-md">
          <h3 style={styles.sectionTitle}>Products Interested</h3>
          <button
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
            onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}
          >
            <Plus size={16} /> Add Product
          </button>
        </div>

        {products.length === 0 ? (
          <div style={styles.emptyProducts}>
            <ImageIcon size={48} color="var(--border-color)" />
            <p style={{ margin: '8px 0', color: 'var(--text-muted)' }}>No products added yet.</p>
            <button
              className="btn btn-primary"
              style={styles.largeAddBtn}
              onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}
            >
              <Plus size={24} /> Add First Product
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {products.map(p => (
              <div key={p.product_id} style={styles.productCard}>
                <div style={{ position: 'relative' }}>
                  <img src={p.photo_url} alt="Product" style={styles.productImg} loading="lazy"
                    onError={(e) => { e.target.style.opacity = '0.3'; }}
                  />
                  <button
                    style={styles.productZoomBtn}
                    onClick={() => setLightboxSrc(p.photo_url)}
                    aria-label="View product photo"
                  >
                    <ZoomIn size={14} color="white" />
                  </button>
                </div>
                <div style={styles.productInfo}>
                  <div style={styles.productTitle}>{p.description}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Qty: {p.quantity} {p.unit}
                  </div>
                  <div style={styles.productActions}>
                    <button style={styles.actionBtn} onClick={() => { setEditingProduct(p); setIsModalOpen(true); }}>Edit</button>
                    <button style={{ ...styles.actionBtn, color: 'var(--danger-color)' }} onClick={() => deleteProduct(p.product_id)}>Remove</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* General Notes */}
      <div className="card mt-md">
        <h3 style={styles.sectionTitle}>General Notes</h3>
        <textarea
          className="form-textarea"
          name="general_notes"
          value={formData.general_notes}
          onChange={handleChange}
          rows="3"
          placeholder="Any additional discussion notes..."
        />
      </div>

      {/* Save button */}
      <div style={styles.bottomBar}>
        <button
          type="button"
          className="btn btn-primary btn-block"
          onClick={(e) => {
            e.preventDefault();
            handleSaveEnquiry();
          }}
          disabled={isSaving}
          style={{
            opacity: isSaving ? 0.75 : 1,
            background: savedOk
              ? 'linear-gradient(135deg, #10b981, #059669)'
              : undefined,
            transition: 'background 0.3s',
          }}
        >
          {isSaving ? (
            <div className="spinner" style={{ width: 20, height: 20, borderLeftColor: 'white' }} />
          ) : (
            <Check size={20} />
          )}
          {isSaving
            ? (products.length > 0 ? `Uploading images & saving…` : 'Saving…')
            : savedOk ? (editingEnquiryId ? 'Updated!' : 'Saved! Add Another?')
            : (editingEnquiryId ? 'Update Enquiry' : 'Save Enquiry')}
        </button>
      </div>

      {isModalOpen && (
        <AddProductModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveProduct}
          editingProduct={editingProduct}
        />
      )}

      {lightboxSrc && (
        <ImageLightbox
          src={lightboxSrc}
          alt="Full screen preview"
          onClose={() => setLightboxSrc(null)}
        />
      )}
    </div>
  );
};

const styles = {
  sectionTitle: {
    fontSize: '1rem',
    marginBottom: '16px',
    color: 'var(--text-main)',
    fontWeight: '600',
  },
  twoCardGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  cardSlot: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  cardSlotLabel: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  uploadBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '20px 12px',
    backgroundColor: '#f8fafc',
    border: '2px dashed var(--primary-color)',
    borderRadius: '12px',
    color: 'var(--primary-color)',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.85rem',
    textAlign: 'center',
    minHeight: '110px',
  },
  cardPreviewContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  cardPreview: {
    width: '100%',
    maxHeight: '140px',
    objectFit: 'contain',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    cursor: 'zoom-in',
  },
  zoomBtn: {
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
  largeAddBtn: {
    marginTop: '12px',
    padding: '12px 24px',
    borderRadius: '24px',
    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
  },
  emptyProducts: {
    padding: '32px 16px',
    backgroundColor: 'white',
    borderRadius: '12px',
    textAlign: 'center',
    color: 'var(--text-muted)',
    border: '1px dashed var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  productCard: {
    display: 'flex',
    backgroundColor: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: 'var(--box-shadow)',
    height: '100px',
  },
  productImg: {
    width: '100px',
    height: '100px',
    objectFit: 'cover',
    cursor: 'zoom-in',
  },
  productZoomBtn: {
    position: 'absolute',
    bottom: '4px',
    right: '4px',
    backgroundColor: 'rgba(0,0,0,0.55)',
    border: 'none',
    borderRadius: '4px',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  productInfo: {
    padding: '12px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  productTitle: {
    fontWeight: '600',
    fontSize: '0.95rem',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '180px',
  },
  productActions: {
    marginTop: 'auto',
    display: 'flex',
    gap: '12px',
  },
  actionBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--primary-color)',
    fontSize: '0.8rem',
    padding: 0,
    cursor: 'pointer',
    fontWeight: '500',
  },
  bottomBar: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '16px',
    backgroundColor: 'white',
    borderTop: '1px solid var(--border-color)',
    zIndex: 90,
  },
};

const bannerStyles = {
  success: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: '#f0fdf4',
    color: '#15803d',
    border: '1px solid #bbf7d0',
    borderRadius: '10px',
    padding: '12px 16px',
    marginBottom: '14px',
    fontSize: '0.88rem',
    fontWeight: '600',
    animation: 'fadeIn 0.3s ease',
  },
  error: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: '#fef2f2',
    color: '#b91c1c',
    border: '1px solid #fca5a5',
    borderRadius: '10px',
    padding: '12px 16px',
    marginBottom: '14px',
    fontSize: '0.88rem',
    fontWeight: '500',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#b91c1c',
    fontWeight: '700',
    padding: '0 4px',
    fontSize: '1rem',
    flexShrink: 0,
  },
};

export default NewEnquiry;
