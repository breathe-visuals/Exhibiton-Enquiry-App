import React from 'react';
import { Plus, ZoomIn } from 'lucide-react';

const ProductListManager = ({ products, onAdd, onEdit, onRemove, onZoom }) => {
  return (
    <div className="card mt-md">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={styles.sectionTitle}>Products ({products.length})</h3>
        {products.length > 0 && (
          <button type="button" className="btn btn-primary" onClick={onAdd} style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
            <Plus size={16} /> Add
          </button>
        )}
      </div>

      {products.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📦</div>
          <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>No products added yet.</p>
          <button type="button" style={styles.largeAddBtn} onClick={onAdd}>
            <Plus size={24} /> Add First Product
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {products.map(p => (
            <div key={p.product_id} style={styles.productCard}>
              <div style={{ position: 'relative' }}>
                <img 
                  src={p.photo_url} 
                  alt="Product" 
                  style={styles.productImg} 
                  loading="lazy"
                  onError={(e) => { e.target.style.opacity = '0.3'; }}
                />
                <button
                  type="button"
                  style={styles.productZoomBtn}
                  onClick={(e) => { e.preventDefault(); onZoom(p.photo_url); }}
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
                  <button type="button" style={styles.actionBtn} onClick={() => onEdit(p)}>Edit</button>
                  <button type="button" style={{ ...styles.actionBtn, color: 'var(--danger-color)' }} onClick={() => onRemove(p.product_id)}>Remove</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const styles = {
  sectionTitle: {
    margin: 0,
    fontSize: '1.1rem',
    fontWeight: '600',
    color: 'var(--text-dark)',
  },
  emptyState: {
    padding: '32px 16px',
    textAlign: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px dashed var(--border-color)',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
    opacity: 0.5,
  },
  largeAddBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    backgroundColor: 'var(--primary-color)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)',
  },
  productCard: {
    display: 'flex',
    backgroundColor: 'white',
    borderRadius: '12px',
    border: '1px solid var(--border-color)',
    overflow: 'hidden',
    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
  },
  productImg: {
    width: '90px',
    height: '90px',
    objectFit: 'cover',
    backgroundColor: '#f1f5f9',
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
  }
};

export default ProductListManager;
