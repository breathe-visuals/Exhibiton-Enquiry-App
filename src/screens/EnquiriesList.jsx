import React, { useState } from 'react';
import { Search } from 'lucide-react';
import Header from '../components/Header';

const EnquiriesList = ({ navigateTo, enquiries }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const filteredEnquiries = enquiries.filter(e => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = (
      e.customer_name?.toLowerCase().includes(term) ||
      e.mobile?.includes(term) ||
      e.business_name?.toLowerCase().includes(term)
    );
    const matchesStatus = statusFilter === 'All' || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <Header title="All Enquiries" />
      
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <div style={{ ...styles.searchContainer, flex: 2, marginBottom: 0 }}>
          <Search size={20} color="var(--text-muted)" style={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Search..." 
            className="form-input"
            style={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={{ flex: 1 }}>
          <select 
            className="form-select" 
            style={{ height: '48px', borderRadius: '24px', paddingLeft: '16px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Status</option>
            <option value="New">New</option>
            <option value="Follow Up">Follow Up</option>
            <option value="Closed">Closed</option>
          </select>
        </div>
      </div>

      <div style={styles.list}>
        {filteredEnquiries.map(enquiry => (
          <div 
            key={enquiry.enquiry_id} 
            className="card" 
            style={styles.enquiryCard}
            onClick={() => navigateTo('enquiry-details', { enquiryId: enquiry.enquiry_id })}
          >
            <div style={styles.headerRow}>
              <h3 style={{margin: 0, fontSize: '1rem'}}>{enquiry.customer_name}</h3>
              <span style={styles.statusBadge}>{enquiry.status}</span>
            </div>
            
            <div style={styles.detailsRow}>
              {enquiry.business_name && (
                <div style={styles.detailItem}><strong>Business:</strong> {enquiry.business_name}</div>
              )}
              <div style={styles.detailItem}><strong>Mobile:</strong> {enquiry.mobile}</div>
            </div>
            
            <div style={styles.footerRow}>
              <div style={styles.meta}>
                Updated: {new Date(enquiry.updated_at || enquiry.created_at).toLocaleDateString()} • {enquiry.products?.length || 0} products
              </div>
              <div style={styles.eventLabel}>{enquiry.event_name}</div>
            </div>
          </div>
        ))}
        
        {filteredEnquiries.length === 0 && (
          <div style={{textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)'}}>
            No enquiries found.
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  searchContainer: {
    position: 'relative',
    marginBottom: '20px',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
  },
  searchInput: {
    paddingLeft: '40px',
    borderRadius: '20px',
    backgroundColor: 'white',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  enquiryCard: {
    cursor: 'pointer',
    margin: 0,
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusBadge: {
    fontSize: '0.7rem',
    padding: '2px 8px',
    backgroundColor: '#e0e7ff',
    color: 'var(--primary-color)',
    borderRadius: '12px',
    fontWeight: '600',
  },
  detailsRow: {
    fontSize: '0.85rem',
    color: 'var(--text-main)',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  detailItem: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  footerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '4px',
    paddingTop: '8px',
    borderTop: '1px solid var(--border-color)',
  },
  meta: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
  eventLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    backgroundColor: 'var(--bg-color)',
    padding: '2px 6px',
    borderRadius: '4px',
  }
};

export default EnquiriesList;
