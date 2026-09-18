import React, { useState } from 'react';
import { Camera, X, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { compressImage } from '../utils/imageUtils';

const AddProductModal = ({ isOpen, onClose, onSave, editingProduct }) => {
  const [product, setProduct] = useState(editingProduct || {
    product_id: `PRD-${Date.now()}`,
    photo_url: null,
    description: '',
    quantity: '1',
    unit: 'pcs',
    weight: '',
    purity_material: '',
    size: '',
    customer_requirement: '',
    notes: ''
  });

  const [preview, setPreview] = useState(product.photo_url || null);
  const [showDetails, setShowDetails] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProduct(prev => ({ ...prev, [name]: value }));
    setIsDirty(true);
  };

  const handlePhotoCapture = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const compressedDataUrl = await compressImage(file);
        setPreview(compressedDataUrl);
        setProduct(prev => ({ ...prev, photo_url: compressedDataUrl }));
        setIsDirty(true);
      } catch(err) {
        alert("Failed to process image.");
      }
    }
  };

  const handleClose = () => {
    if (isDirty) {
      if (window.confirm("You have unsaved product details. Discard them?")) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleSave = () => {
    if (!product.photo_url) {
      alert("Please add a product photo.");
      return;
    }
    if (!product.description) {
      alert("Please enter a short description.");
      return;
    }
    onSave(product);
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={{ margin: 0 }}>{editingProduct ? 'Edit Product' : 'Add Product'}</h3>
          <button style={styles.closeBtn} onClick={handleClose}><X size={24} /></button>
        </div>

        <div style={styles.content}>
          <div style={styles.photoContainer}>
            {preview ? (
              <div style={styles.previewWrapper}>
                <img src={preview} alt="Product" style={styles.previewImg} />
                <button 
                  style={styles.removePhotoBtn}
                  onClick={() => { setPreview(null); setProduct(prev => ({ ...prev, photo_url: null })); }}
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <label style={styles.uploadLabel}>
                <Camera size={32} color="var(--text-muted)" />
                <span style={{ marginTop: '8px', color: 'var(--text-muted)' }}>Tap to take photo</span>
                <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePhotoCapture} />
              </label>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Short Description *</label>
            <input 
              type="text" 
              className="form-input" 
              name="description"
              value={product.description}
              onChange={handleChange}
              placeholder="e.g. Gold Bangles 22k"
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Quantity</label>
              <input 
                type="number" 
                className="form-input" 
                name="quantity"
                value={product.quantity}
                onChange={handleChange}
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Unit</label>
              <select className="form-select" name="unit" value={product.unit} onChange={handleChange}>
                <option value="pcs">pcs</option>
                <option value="set">set</option>
                <option value="pair">pair</option>
                <option value="kg">kg</option>
                <option value="gram">gram</option>
                <option value="other">other</option>
              </select>
            </div>
          </div>

          <button 
            type="button" 
            style={styles.detailsToggleBtn}
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            {showDetails ? 'Hide Details' : 'More Details (Weight, Purity, etc.)'}
          </button>

          {showDetails && (
            <div style={styles.expandedDetails}>
              <div className="form-group">
                <label className="form-label">Approx. Weight (optional)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  name="weight"
                  value={product.weight}
                  onChange={handleChange}
                  placeholder="e.g. 15g"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Purity / Material (optional)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  name="purity_material"
                  value={product.purity_material}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Customer Requirement (optional)</label>
                <textarea 
                  className="form-textarea" 
                  name="customer_requirement"
                  value={product.customer_requirement}
                  onChange={handleChange}
                  rows="2"
                ></textarea>
              </div>
            </div>
          )}
        </div>

        <div style={styles.footer}>
          <button className="btn btn-primary btn-block" onClick={handleSave}>
            <Save size={20} />
            {editingProduct ? 'Update Product' : 'Add Product'}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end', // slide up effect
  },
  modal: {
    backgroundColor: 'white',
    borderTopLeftRadius: '20px',
    borderTopRightRadius: '20px',
    height: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
  },
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    color: 'var(--text-main)',
  },
  content: {
    padding: '20px',
    overflowY: 'auto',
    flex: 1,
  },
  photoContainer: {
    marginBottom: '20px',
  },
  uploadLabel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '150px',
    backgroundColor: 'var(--bg-color)',
    border: '2px dashed var(--border-color)',
    borderRadius: '12px',
    cursor: 'pointer',
  },
  previewWrapper: {
    position: 'relative',
    height: '200px',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  previewImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    backgroundColor: 'white',
    border: 'none',
    borderRadius: '50%',
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  },
  footer: {
    padding: '16px 20px',
    borderTop: '1px solid var(--border-color)',
    backgroundColor: 'white',
  },
  detailsToggleBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'none',
    border: 'none',
    color: 'var(--primary-color)',
    fontSize: '0.9rem',
    fontWeight: '500',
    cursor: 'pointer',
    padding: '12px 0',
    marginBottom: '12px',
    width: '100%',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
  },
  expandedDetails: {
    paddingTop: '12px',
    borderTop: '1px dashed var(--border-color)',
  }
};

export default AddProductModal;
