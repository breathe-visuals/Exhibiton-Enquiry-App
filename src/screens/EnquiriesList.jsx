import React, { useState, useCallback } from 'react';
import { Search, Trash2, CheckSquare, Square, X, Building2, Phone, MapPin, ArrowUpDown } from 'lucide-react';
import Header from '../components/Header';

const STATUS_COLORS = {
  'New':      { bg: '#e0e7ff', color: '#2563eb' },
  'Follow Up':{ bg: '#fef9c3', color: '#ca8a04' },
  'Closed':   { bg: '#dcfce7', color: '#16a34a' },
};

// Status priority for sorting: New first, Follow Up second, Closed last
const STATUS_ORDER = { 'New': 0, 'Follow Up': 1, 'Closed': 2 };

const SORT_OPTIONS = [
  { value: 'newest',   label: 'Newest First' },
  { value: 'oldest',   label: 'Oldest First' },
  { value: 'status',   label: 'Status (New→Closed)' },
  { value: 'name_az',  label: 'Name A→Z' },
];

const EnquiriesList = ({ navigateTo, enquiries, onDeleteEnquiries }) => {
  const [searchTerm, setSearchTerm]     = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy]             = useState('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [selectMode, setSelectMode]     = useState(false);
  const [selected, setSelected]         = useState(new Set());
  const [isDeleting, setIsDeleting]     = useState(false);

  const filteredEnquiries = React.useMemo(() => {
    const term = searchTerm.toLowerCase();
    const filtered = enquiries.filter(e => {
      const matchesSearch = (
        e.customer_name?.toLowerCase().includes(term) ||
        e.mobile?.includes(term) ||
        e.business_name?.toLowerCase().includes(term)
      );
      const matchesStatus = statusFilter === 'All' || e.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    // Apply sort
    return [...filtered].sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at);
      if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
      if (sortBy === 'status') {
        const diff = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
        return diff !== 0 ? diff : new Date(b.created_at) - new Date(a.created_at);
      }
      if (sortBy === 'name_az') return (a.customer_name || '').localeCompare(b.customer_name || '');
      return 0;
    });
  }, [enquiries, searchTerm, statusFilter, sortBy]);

  const toggleSelect = useCallback((id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selected.size === filteredEnquiries.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredEnquiries.map(e => e.enquiry_id)));
    }
  }, [selected.size, filteredEnquiries]);

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const handleDeleteSelected = async () => {
    const count = selected.size;
    if (!window.confirm(`Delete ${count} enquir${count === 1 ? 'y' : 'ies'}? This cannot be undone.`)) return;

    setIsDeleting(true);
    try {
      await onDeleteEnquiries(Array.from(selected));
      exitSelectMode();
    } catch (err) {
      alert('Delete failed. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCardClick = (enquiry) => {
    if (selectMode) {
      toggleSelect(enquiry.enquiry_id);
    } else {
      navigateTo('enquiry-details', { enquiryId: enquiry.enquiry_id });
    }
  };

  const allSelected = filteredEnquiries.length > 0 && selected.size === filteredEnquiries.length;

  return (
    <div>
      {/* Header with select toggle */}
      <div style={styles.topBar}>
        <h2 style={styles.title}>All Enquiries</h2>
        {!selectMode ? (
          <button style={styles.selectBtn} onClick={() => setSelectMode(true)}>
            <CheckSquare size={18} />
            Select
          </button>
        ) : (
          <button style={styles.cancelSelectBtn} onClick={exitSelectMode}>
            <X size={18} />
            Cancel
          </button>
        )}
      </div>

      {/* Search + Filter + Sort row */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
        <div style={{ ...styles.searchContainer, flex: 2 }}>
          <Search size={18} color="var(--text-muted)" style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search name, mobile..."
            className="form-input"
            style={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="form-select"
          style={styles.statusSelect}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="All">All</option>
          <option value="New">🔵 New</option>
          <option value="Follow Up">🟡 Follow Up</option>
          <option value="Closed">🟢 Closed</option>
        </select>
      </div>

      {/* Sort row */}
      <div style={styles.sortRow}>
        <span style={styles.sortLabel}>Sort by:</span>
        <div style={styles.sortChips}>
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              style={{
                ...styles.sortChip,
                ...(sortBy === opt.value ? styles.sortChipActive : {}),
              }}
              onClick={() => setSortBy(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Count + result summary */}
      <div style={styles.resultSummary}>
        <span style={styles.resultCount}>{filteredEnquiries.length} enquir{filteredEnquiries.length !== 1 ? 'ies' : 'y'}</span>
        {statusFilter !== 'All' && (
          <span style={{ ...styles.activeFilter, backgroundColor: STATUS_COLORS[statusFilter]?.bg, color: STATUS_COLORS[statusFilter]?.color }}>
            {statusFilter}
          </span>
        )}
      </div>

      {/* margin before list */}
      <div style={{ marginBottom: '12px' }} />

      {/* Select-mode action bar */}
      {selectMode && (
        <div style={styles.selectionBar}>
          <button style={styles.selectAllBtn} onClick={toggleSelectAll}>
            {allSelected ? <CheckSquare size={18} color="var(--primary-color)" /> : <Square size={18} color="var(--text-muted)" />}
            <span>{allSelected ? 'Deselect All' : 'Select All'}</span>
          </button>
          <span style={styles.selectedCount}>
            {selected.size} selected
          </span>
          {selected.size > 0 && (
            <button
              style={styles.deleteBtn}
              onClick={handleDeleteSelected}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <div className="spinner" style={{ width: 16, height: 16, borderLeftColor: 'white' }} />
              ) : (
                <Trash2 size={16} color="white" />
              )}
              Delete
            </button>
          )}
        </div>
      )}

      {/* List */}
      <div style={styles.list}>
        {filteredEnquiries.map(enquiry => {
          const isSelected = selected.has(enquiry.enquiry_id);
          const statusStyle = STATUS_COLORS[enquiry.status] || STATUS_COLORS['New'];
          return (
            <div
              key={enquiry.enquiry_id}
              className="card"
              style={{
                ...styles.enquiryCard,
                ...(isSelected ? styles.selectedCard : {}),
                ...(selectMode ? { cursor: 'pointer' } : {}),
              }}
              onClick={() => handleCardClick(enquiry)}
            >
              {/* Checkbox (visible only in select mode) */}
              {selectMode && (
                <div style={styles.checkboxWrapper}>
                  {isSelected
                    ? <CheckSquare size={22} color="var(--primary-color)" />
                    : <Square size={22} color="var(--border-color)" />
                  }
                </div>
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={styles.headerRow}>
                  <h3 style={styles.customerName}>{enquiry.customer_name}</h3>
                  <span style={{ ...styles.statusBadge, backgroundColor: statusStyle.bg, color: statusStyle.color }}>
                    {enquiry.status}
                  </span>
                </div>

                <div style={styles.detailsRow}>
                  {enquiry.business_name && (
                    <div style={styles.detailItem}>
                      <Building2 size={12} style={styles.detailIcon} />
                      {enquiry.business_name}
                    </div>
                  )}
                  <div style={styles.detailItem}>
                    <Phone size={12} style={styles.detailIcon} />
                    {enquiry.mobile}
                  </div>
                  {enquiry.address && (
                    <div style={styles.detailItem}>
                      <MapPin size={12} style={styles.detailIcon} />
                      {enquiry.address}
                    </div>
                  )}
                </div>

                <div style={styles.footerRow}>
                  <div style={styles.meta}>
                    {new Date(enquiry.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    {' • '}
                    {enquiry.products?.length || 0} product{enquiry.products?.length !== 1 ? 's' : ''}
                    {enquiry.advance_amount ? ` • ₹${Number(enquiry.advance_amount).toLocaleString('en-IN')} adv.` : ''}
                  </div>
                  <div style={styles.eventLabel}>{enquiry.event_name}</div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredEnquiries.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
            <Search size={40} color="var(--border-color)" style={{ marginBottom: '12px' }} />
            <div>No enquiries found.</div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  title: {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: '700',
  },
  selectBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'none',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '6px 12px',
    fontSize: '0.85rem',
    fontWeight: '500',
    color: 'var(--primary-color)',
    cursor: 'pointer',
  },
  cancelSelectBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'none',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '6px 12px',
    fontSize: '0.85rem',
    fontWeight: '500',
    color: 'var(--text-muted)',
    cursor: 'pointer',
  },
  searchContainer: {
    position: 'relative',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
  },
  searchInput: {
    paddingLeft: '38px',
    borderRadius: '24px',
    backgroundColor: 'white',
    height: '44px',
    fontSize: '0.9rem',
  },
  statusSelect: {
    height: '44px',
    borderRadius: '24px',
    paddingLeft: '12px',
    fontSize: '0.85rem',
    flex: 1,
    minWidth: '90px',
  },
  selectionBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '10px',
    padding: '10px 14px',
    marginBottom: '12px',
  },
  selectAllBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'none',
    border: 'none',
    fontSize: '0.85rem',
    fontWeight: '500',
    color: 'var(--text-main)',
    cursor: 'pointer',
    padding: 0,
  },
  selectedCount: {
    flex: 1,
    fontSize: '0.85rem',
    color: 'var(--primary-color)',
    fontWeight: '600',
    textAlign: 'center',
  },
  deleteBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'var(--danger-color)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 14px',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  enquiryCard: {
    cursor: 'pointer',
    margin: 0,
    padding: '14px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    transition: 'box-shadow 0.15s, border-color 0.15s',
    border: '1.5px solid transparent',
  },
  selectedCard: {
    borderColor: 'var(--primary-color)',
    backgroundColor: '#eff6ff',
    boxShadow: '0 0 0 2px rgba(37,99,235,0.15)',
  },
  checkboxWrapper: {
    paddingTop: '2px',
    flexShrink: 0,
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '6px',
  },
  customerName: {
    margin: 0,
    fontSize: '1rem',
    fontWeight: '600',
    flex: 1,
    marginRight: '8px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  statusBadge: {
    fontSize: '0.7rem',
    padding: '2px 8px',
    borderRadius: '12px',
    fontWeight: '600',
    flexShrink: 0,
  },
  detailsRow: {
    fontSize: '0.82rem',
    color: 'var(--text-muted)',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    marginBottom: '8px',
  },
  detailItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  detailIcon: {
    flexShrink: 0,
    color: 'var(--text-muted)',
  },
  footerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '6px',
    borderTop: '1px solid var(--border-color)',
  },
  meta: {
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
  },
  eventLabel: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    backgroundColor: 'var(--bg-color)',
    padding: '2px 6px',
    borderRadius: '4px',
    maxWidth: '110px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  sortRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
    flexWrap: 'wrap',
  },
  sortLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    fontWeight: '600',
    flexShrink: 0,
  },
  sortChips: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
  },
  sortChip: {
    fontSize: '0.72rem',
    padding: '4px 10px',
    borderRadius: '20px',
    border: '1px solid var(--border-color)',
    background: 'white',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'all 0.15s',
  },
  sortChipActive: {
    background: 'var(--primary-color)',
    color: 'white',
    borderColor: 'var(--primary-color)',
    fontWeight: '600',
  },
  resultSummary: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  },
  resultCount: {
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
    fontWeight: '500',
  },
  activeFilter: {
    fontSize: '0.7rem',
    padding: '2px 8px',
    borderRadius: '12px',
    fontWeight: '600',
  },
};

export default EnquiriesList;
