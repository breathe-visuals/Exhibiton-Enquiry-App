import React, { useState, useEffect } from 'react';
import { Camera, Image as ImageIcon, Check, X, Plus } from 'lucide-react';
import Header from '../components/Header';
import AddProductModal from './AddProductModal';
import * as api from '../services/api';
import { compressImage } from '../utils/imageUtils';

const NewEnquiry = ({ navigateTo, setIsDirty }) => {
  const [formData, setFormData] = useState({
    customer_name: '',
    mobile: '',
    business_name: '',
    address: '',
    event_name: 'Gems & Jewellery Expo 2026',
    general_notes: '',
    business_card_url: null,
  });

  const [products, setProducts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Clear dirty state if we unmount without saving (App.jsx handles the confirm, so if we unmount it's fine)
  useEffect(() => {
    return () => setIsDirty(false);
  }, [setIsDirty]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setIsDirty(true);
  };

  const handleCardCapture = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const compressedDataUrl = await compressImage(file);
        setFormData(prev => ({ ...prev, business_card_url: compressedDataUrl }));
        setIsDirty(true);
      } catch (err) {
        alert("Failed to process image.");
      }
    }
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
    if(window.confirm("Are you sure you want to remove this product?")) {
      setProducts(products.filter(p => p.product_id !== id));
      setIsDirty(true);
    }
  };

  const handleSaveEnquiry = async () => {
    if (!formData.customer_name || !formData.mobile) {
      alert("Customer Name and Mobile Number are required.");
      return;
    }
    
    setIsSaving(true);
    
    try {
      const enquiry = {
        ...formData,
        products: products,
        created_by: 'Current User' // Placeholder for auth
      };
      
      await api.createEnquiry(enquiry);
      
      setIsDirty(false); // Clear dirty state before navigation
      navigateTo('dashboard');
    } catch (error) {
      console.error(error);
      alert("Failed to save enquiry. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ paddingBottom: '80px' }}>
      <Header 
        title="New Enquiry" 
        showBack={true} 
        onBack={() => navigateTo('dashboard')} 
      />

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
          <label className="form-label">Event Name</label>
          <input type="text" className="form-input" name="event_name" value={formData.event_name} onChange={handleChange} />
        </div>
      </div>

      <div className="card">
        <h3 style={styles.sectionTitle}>Business Card</h3>
        {formData.business_card_url ? (
          <div style={styles.cardPreviewContainer}>
            <img src={formData.business_card_url} alt="Business Card" style={styles.cardPreview} />
            <button className="btn btn-secondary mt-sm" onClick={() => setFormData(p => ({...p, business_card_url: null}))}>
              Remove Card
            </button>
          </div>
        ) : (
          <label style={styles.uploadBtn}>
            <Camera size={24} />
            <span>Capture Business Card</span>
            <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleCardCapture} />
          </label>
        )}
      </div>

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
                <img src={p.photo_url} alt="Product" style={styles.productImg} loading="lazy" />
                <div style={styles.productInfo}>
                  <div style={styles.productTitle}>{p.description}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Qty: {p.quantity} {p.unit}
                  </div>
                  <div style={styles.productActions}>
                    <button style={styles.actionBtn} onClick={() => { setEditingProduct(p); setIsModalOpen(true); }}>Edit</button>
                    <button style={{...styles.actionBtn, color: 'var(--danger-color)'}} onClick={() => deleteProduct(p.product_id)}>Remove</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card mt-md">
        <h3 style={styles.sectionTitle}>General Notes</h3>
        <textarea 
          className="form-textarea" 
          name="general_notes"
          value={formData.general_notes}
          onChange={handleChange}
          rows="3"
          placeholder="Any additional discussion notes..."
        ></textarea>
      </div>

      <div style={styles.bottomBar}>
        <button 
          className="btn btn-primary btn-block" 
          onClick={handleSaveEnquiry}
          disabled={isSaving}
          style={{ opacity: isSaving ? 0.7 : 1 }}
        >
          {isSaving ? <div className="spinner" style={{width: 20, height: 20, borderLeftColor: 'white'}}></div> : <Check size={20} />} 
          {isSaving ? 'Saving...' : 'Save Enquiry'}
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
  uploadBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '24px',
    backgroundColor: '#f8fafc',
    border: '2px dashed var(--primary-color)',
    borderRadius: '12px',
    color: 'var(--primary-color)',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '1.1rem',
  },
  largeAddBtn: {
    marginTop: '12px',
    padding: '12px 24px',
    borderRadius: '24px',
    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
  },
  cardPreviewContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  cardPreview: {
    width: '100%',
    maxHeight: '200px',
    objectFit: 'contain',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
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
  }
};

export default NewEnquiry;
