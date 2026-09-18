import React from 'react';
import { PlusCircle, FileText, Calendar } from 'lucide-react';
import Header from '../components/Header';

const Dashboard = ({ navigateTo, enquiries }) => {
  const today = new Date().toISOString().split('T')[0];
  
  const todaysEnquiries = enquiries.filter(
    e => e.created_at && e.created_at.startsWith(today)
  ).length;

  const totalProducts = enquiries.reduce(
    (sum, eq) => sum + (eq.products ? eq.products.length : 0), 0
  );

  return (
    <div>
      <Header title="Dashboard" />
      
      <div style={styles.statsGrid}>
        <div className="card" style={styles.statCard}>
          <div style={styles.statIcon}><FileText size={20} color="var(--primary-color)" /></div>
          <div>
            <div style={styles.statLabel}>Total Enquiries</div>
            <div style={styles.statValue}>{enquiries.length}</div>
          </div>
        </div>
        
        <div className="card" style={styles.statCard}>
          <div style={styles.statIcon}><Calendar size={20} color="var(--success-color)" /></div>
          <div>
            <div style={styles.statLabel}>Today's</div>
            <div style={styles.statValue}>{todaysEnquiries}</div>
          </div>
        </div>
      </div>

      <div className="card" style={{...styles.statCard, marginBottom: '24px'}}>
         <div style={styles.statLabel}>Total Products Enquired</div>
         <div style={styles.statValue}>{totalProducts}</div>
      </div>

      <button 
        className="btn btn-primary btn-block" 
        style={styles.newBtn}
        onClick={() => navigateTo('new-enquiry')}
      >
        <PlusCircle size={24} />
        New Enquiry
      </button>

      <div style={{marginTop: '32px'}}>
        <div className="flex justify-between items-center mb-md">
          <h3 style={{fontSize: '1.1rem'}}>Recent Enquiries</h3>
          <button 
            style={{background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontSize: '0.875rem'}}
            onClick={() => navigateTo('enquiries')}
          >
            View All
          </button>
        </div>
        
        {enquiries.slice(0, 3).map(enquiry => (
          <div 
            key={enquiry.enquiry_id} 
            className="card" 
            style={styles.recentCard}
            onClick={() => navigateTo('enquiry-details', { enquiryId: enquiry.enquiry_id })}
          >
            <div style={styles.recentHeader}>
              <strong>{enquiry.customer_name}</strong>
              <span style={styles.statusBadge}>{enquiry.status}</span>
            </div>
            <div className="text-sm" style={{color: 'var(--text-muted)', marginTop: '4px'}}>
              {enquiry.business_name && <span>{enquiry.business_name} • </span>}
              {enquiry.mobile}
            </div>
            <div className="text-xs" style={{marginTop: '8px', color: 'var(--text-muted)'}}>
              {enquiry.products?.length || 0} products • {new Date(enquiry.created_at).toLocaleDateString()}
            </div>
          </div>
        ))}

        {enquiries.length === 0 && (
          <div className="text-center text-muted mt-md">
            No enquiries yet. Create one!
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '12px',
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: 0,
    padding: '16px',
  },
  statIcon: {
    padding: '10px',
    backgroundColor: 'var(--bg-color)',
    borderRadius: '8px',
    display: 'flex',
  },
  statLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '4px',
  },
  statValue: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    lineHeight: 1,
  },
  newBtn: {
    padding: '16px',
    fontSize: '1.1rem',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
  },
  recentCard: {
    cursor: 'pointer',
    transition: 'transform 0.1s',
    border: '1px solid transparent',
  },
  recentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    fontSize: '0.7rem',
    padding: '2px 8px',
    backgroundColor: '#e0e7ff',
    color: 'var(--primary-color)',
    borderRadius: '12px',
    fontWeight: '600',
  }
};

export default Dashboard;
