import React, { useEffect, useState } from 'react';
import { getEnquiryById } from '../utils/mockData';
import Header from '../components/Header';

const EnquiryDetails = ({ navigateTo, enquiryId }) => {
  const [enquiry, setEnquiry] = useState(null);

  useEffect(() => {
    const data = getEnquiryById(enquiryId);
    setEnquiry(data);
  }, [enquiryId]);

  if (!enquiry) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ paddingBottom: '20px' }}>
      <Header 
        title="Enquiry Details" 
        showBack={true} 
        onBack={() => navigateTo('enquiries')} 
      />

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
        </div>
      </div>

      {enquiry.business_card_url && (
        <div className="card">
          <h3 style={styles.sectionTitle}>Business Card</h3>
          <img src={enquiry.business_card_url} alt="Business Card" style={styles.businessCard} loading="lazy" />
        </div>
      )}

      {enquiry.general_notes && (
        <div className="card">
          <h3 style={styles.sectionTitle}>Notes</h3>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>{enquiry.general_notes}</p>
        </div>
      )}

      <div style={{ marginTop: '24px' }}>
        <h3 style={{ ...styles.sectionTitle, marginBottom: '12px' }}>
          Products ({enquiry.products?.length || 0})
        </h3>
        
        <div style={styles.productGrid}>
          {enquiry.products?.map(product => (
            <div key={product.product_id} className="card" style={styles.productCard}>
              <img src={product.photo_url} alt="Product" style={styles.productImg} loading="lazy" />
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
  },
  businessCard: {
    width: '100%',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
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
  }
};

export default EnquiryDetails;
