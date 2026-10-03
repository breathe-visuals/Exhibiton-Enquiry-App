import React, { useState, useEffect } from 'react';
import { Camera, X, Check, Plus, ZoomIn } from 'lucide-react';
import Header from '../components/Header';
import AddProductModal from './AddProductModal';
import ImageLightbox from '../components/ImageLightbox';
import { compressImage } from '../utils/imageUtils';

const PAYMENT_MODES = ['Cash', 'RTGS', 'NEFT', 'UPI', 'Cheque', 'Card', 'Other'];

const EditEnquiry = ({ navigateTo, setIsDirty, enquiryId, enquiries, onSave }) => {
  const [formData, setFormData]       = useState(null);
  const [products, setProducts]       = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isSaving, setIsSaving]       = useState(false);
  const [savedOk, setSavedOk]         = useState(false);
  const [saveError, setSaveError]     = useState(null);
  const [lightboxSrc, setLightboxSrc] = useState(null);

  useEffect(() => {
    const found = enquiries?.find(e => e.enquiry_id === enquiryId);
    if (found) {
      setFormData({
        customer_name:       found.customer_name       || '',
        mobile:              found.mobile              || '',
        business_name:       found.business_name       || '',
        address:             found.address             || '',
        event_name:          found.event_name          || '',
        general_notes:       found.general_notes       || '',
        business_card_url:   found.business_card_url   || null,
        business_card_url_2: found.business_card_url_2 || null,
        advance_amount:      found.advance_amount      || '',
        payment_mode:        found.payment_mode        || '',
        payment_mode_custom: found.payment_mode_custom || '',
        status:              found.status              || 'New',
        enquiry_id:          found.enquiry_id,
        created_by:          found.created_by          || 'Unknown',
      });
      setProducts(found.products || []);
    }
    return () => setIsDirty(false);
  }, [enquiryId, enquiries, setIsDirty]);

  useEffect(() => {
    if (!savedOk) return;
    const t = setTimeout(() => setSavedOk(false), 3000);
    return () => clearTimeout(t);
  }, [savedOk]);

  if (!formData) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <div className="spinner" />
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setIsDirty(true);
  };

  const handleCardCapture = async (e, slot) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const compressed = await compressImage(file);
        setFormData(prev => ({ ...prev, [slot]: compressed }));
        setIsDirty(true);
      } catch { alert('Failed to process image.'); }
    }
    e.target.value = '';
  };

  const handleSaveProduct = (product) => {
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
    if (window.confirm('Remove this product?')) {
      setProducts(products.filter(p => p.product_id !== id));
      setIsDirty(true);
    }
  };

  const handleSave = async () => {
    if (!formData.customer_name.trim() || !formData.mobile.trim()) {
      alert('Customer Name and Mobile are required.');
      return;
    }
    setIsSaving(true); setSaveError(null); setSavedOk(false);
    try {
      await onSave({ ...formData, products });
      setIsDirty(false);
      setSavedOk(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => navigateTo('enquiry-details', { enquiryId: formData.enquiry_id }), 1200);
    } catch (err) {
      setSaveError(err.message || 'Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
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
              <img src={url} alt={label} style={styles.cardPreview} />
              <button style={styles.zoomBtn} onClick={() => setLightboxSrc(url)} aria-label="Expand"><ZoomIn size={16} color="white" /></button>
            </div>
            <button className="btn btn-secondary mt-sm" onClick={() => setFormData(p => ({ ...p, [slotKey]: null }))}><X size={16} /> Remove</button>
          </div>
        ) : (
          <label style={styles.uploadBtn}>
            <Camera size={22} />
            <span>Capture {label}</span>
            <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => handleCardCapture(e, slotKey)} />
          </label>
        )}
      </div>
    );
  };

  return (
    <div style={{ paddingBottom: '80px' }}>
      <Header title="Edit Enquiry" showBack={true} onBack={() => navigateTo('enquiry-details', { enquiryId: formData.enquiry_id })} />

      {savedOk && <div style={bannerStyles.success}><Check size={18} style={{ flexShrink: 0 }} /> Saved! Redirecting...</div>}
      {saveError && <div style={bannerStyles.error}><span style={{ flex: 1 }}>{saveError}</span><button style={bannerStyles.closeBtn} onClick={() => setSaveError(null)}>x</button></div>}

      <div className="card mt-md">
        <h3 style={styles.sectionTitle}>Customer Info</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input className="form-input" name="customer_name" placeholder="Customer Name *" value={formData.customer_name} onChange={handleChange} />
          <input className="form-input" name="mobile" placeholder="Mobile Number *" value={formData.mobile} onChange={handleChange} inputMode="tel" />
          <input className="form-input" name="business_name" placeholder="Business Name" value={formData.business_name} onChange={handleChange} />
          <input className="form-input" name="address" placeholder="Address" value={formData.address} onChange={handleChange} />
          <input className="form-input" name="event_name" placeholder="Event Name" value={formData.event_name} onChange={handleChange} />
        </div>
      </div>

      <div className="card mt-md">
        <h3 style={styles.sectionTitle}>Business Cards</h3>
        <div style={styles.twoCardGrid}>
          {renderCardSlot('business_card_url', 'Front')}
          {renderCardSlot('business_card_url_2', 'Back')}
        </div>
      </div>

      <div className="card mt-md">
        <h3 style={styles.sectionTitle}>Advance Payment</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input className="form-input" name="advance_amount" placeholder="Amount (Rs)" value={formData.advance_amount} onChange={handleChange} inputMode="numeric" />
          <select className="form-select" name="payment_mode" value={formData.payment_mode} onChange={handleChange}>
            <option value="">Payment Mode</option>
            {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          {formData.payment_mode === 'Other' && (
            <input className="form-input" name="payment_mode_custom" placeholder="Specify payment mode" value={formData.payment_mode_custom} onChange={handleChange} />
          )}
        </div>
      </div>

      <div className="card mt-md">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ ...styles.sectionTitle, margin: 0 }}>Products ({products.length})</h3>
          <button className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '0.85rem', borderRadius: '20px' }}
            onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}>
            <Plus size={16} /> Add
          </button>
        </div>
        {products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No products yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {products.map(p => (
              <div key={p.product_id} style={styles.productCard}>
                <img src={p.photo_url} alt="Product" style={styles.productImg} />
                <div style={styles.productInfo}>
                  <div style={styles.productTitle}>{p.description}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Qty: {p.quantity} {p.unit}</div>
                  <div style={{ marginTop: 'auto', display: 'flex', gap: '12px' }}>
                    <button style={styles.actionBtn} onClick={() => { setEditingProduct(p); setIsModalOpen(true); }}>Edit</button>
                    <button style={{ ...styles.actionBtn, color: 'var(--danger-color)' }} onClick={() => deleteProduct(p.product_id)}>Remove</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card mt-md">
        <h3 style={styles.sectionTitle}>General Notes</h3>
        <textarea className="form-textarea" name="general_notes" value={formData.general_notes} onChange={handleChange} rows="3" placeholder="Any additional notes..." />
      </div>

      <div style={styles.bottomBar}>
        <button className="btn btn-primary btn-block" onClick={handleSave} disabled={isSaving}
          style={{ opacity: isSaving ? 0.75 : 1, background: savedOk ? 'linear-gradient(135deg,#10b981,#059669)' : undefined, transition: 'background 0.3s' }}>
          {isSaving ? <div className="spinner" style={{ width: 20, height: 20, borderLeftColor: 'white' }} /> : <Check size={20} />}
          {isSaving ? 'Saving...' : savedOk ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {isModalOpen && <AddProductModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveProduct} editingProduct={editingProduct} />}
      {lightboxSrc && <ImageLightbox src={lightboxSrc} alt="Preview" onClose={() => setLightboxSrc(null)} />}
    </div>
  );
};

const styles = {
  sectionTitle: { fontSize: '1rem', marginBottom: '16px', color: 'var(--text-main)', fontWeight: '600' },
  twoCardGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  cardSlot: { display: 'flex', flexDirection: 'column', gap: '8px' },
  cardSlotLabel: { fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  uploadBtn: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '20px 12px', backgroundColor: '#f8fafc', border: '2px dashed var(--primary-color)', borderRadius: '12px', color: 'var(--primary-color)', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', textAlign: 'center', minHeight: '110px' },
  cardPreviewContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  cardPreview: { width: '100%', maxHeight: '140px', objectFit: 'contain', borderRadius: '8px', border: '1px solid var(--border-color)', cursor: 'zoom-in' },
  zoomBtn: { position: 'absolute', bottom: '6px', right: '6px', backgroundColor: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '6px', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  productCard: { display: 'flex', backgroundColor: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--box-shadow)', height: '100px', border: '1px solid var(--border-color)' },
  productImg: { width: '100px', height: '100px', objectFit: 'cover' },
  productInfo: { padding: '12px', flex: 1, display: 'flex', flexDirection: 'column' },
  productTitle: { fontWeight: '600', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' },
  actionBtn: { background: 'none', border: 'none', color: 'var(--primary-color)', fontSize: '0.8rem', padding: 0, cursor: 'pointer', fontWeight: '500' },
  bottomBar: { position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px', backgroundColor: 'white', borderTop: '1px solid var(--border-color)', zIndex: 90 },
};

const bannerStyles = {
  success: { display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px 16px', marginBottom: '14px', fontSize: '0.88rem', fontWeight: '600' },
  error:   { display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: '10px', padding: '12px 16px', marginBottom: '14px', fontSize: '0.88rem' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#b91c1c', fontWeight: '700', padding: '0 4px', fontSize: '1rem', flexShrink: 0 },
};

export default EditEnquiry;
