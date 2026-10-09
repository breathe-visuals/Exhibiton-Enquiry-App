import React, { useState, useEffect, useRef } from 'react';
import { Camera, Image as ImageIcon, Check, X, Plus, ZoomIn } from 'lucide-react';
import Header from '../components/Header';
import AddProductModal from './AddProductModal';
import ImageLightbox from '../components/ImageLightbox';
import ImageCaptureSlot from '../components/ImageCaptureSlot';
import ProductListManager from '../components/ProductListManager';
import { compressImage, cropBusinessCard } from '../utils/imageUtils';

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
      const existing = enquiries.find(e => String(e.enquiry_id) === String(editingEnquiryId));
      if (existing) {
        setFormData(existing);
        setProducts(existing.products || []);
        setRemovedImageUrls([]);
      }
    } else {
      setFormData(BLANK_FORM);
      setProducts([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingEnquiryId]);

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
        const processedDataUrl = await cropBusinessCard(file);
        // Track the old image if it's a Drive URL to ensure it gets deleted
        const oldUrl = formData[slot];
        if (oldUrl && typeof oldUrl === 'string' && oldUrl.includes('drive.google.com')) {
          setRemovedImageUrls(prev => [...prev, oldUrl]);
        }
        setFormData(prev => ({ ...prev, [slot]: processedDataUrl }));
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
        navigateTo('enquiry-details', { enquiryId: editingEnquiryId }, true);
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
          <ImageCaptureSlot
            label="Card Front"
            url={formData.business_card_url}
            onCapture={(e) => handleCardCapture(e, 'business_card_url')}
            onRemove={() => {
              const oldUrl = formData.business_card_url;
              if (oldUrl && typeof oldUrl === 'string' && oldUrl.includes('drive.google.com')) {
                setRemovedImageUrls(prev => [...prev, oldUrl]);
              }
              setFormData(p => ({ ...p, business_card_url: null }));
            }}
            onZoom={setLightboxSrc}
          />
          <ImageCaptureSlot
            label="Card Back"
            url={formData.business_card_url_2}
            onCapture={(e) => handleCardCapture(e, 'business_card_url_2')}
            onRemove={() => {
              const oldUrl = formData.business_card_url_2;
              if (oldUrl && typeof oldUrl === 'string' && oldUrl.includes('drive.google.com')) {
                setRemovedImageUrls(prev => [...prev, oldUrl]);
              }
              setFormData(p => ({ ...p, business_card_url_2: null }));
            }}
            onZoom={setLightboxSrc}
          />
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

      <ProductListManager
        products={products}
        onAdd={() => { setEditingProduct(null); setIsModalOpen(true); }}
        onEdit={(p) => { setEditingProduct(p); setIsModalOpen(true); }}
        onRemove={deleteProduct}
        onZoom={setLightboxSrc}
      />

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
