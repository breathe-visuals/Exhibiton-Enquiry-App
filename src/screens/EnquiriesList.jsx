import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Search, Trash2, CheckSquare, Square, X, Building2, Phone, MapPin, ChevronDown, ChevronUp } from 'lucide-react';

const STATUS_COLORS = {
  'New':       { bg: '#e0e7ff', color: '#2563eb' },
  'Follow Up': { bg: '#fef9c3', color: '#ca8a04' },
  'Closed':    { bg: '#dcfce7', color: '#16a34a' },
};

// Status cycle order
const STATUS_ORDER = { 'New': 0, 'Follow Up': 1, 'Closed': 2 };
const STATUS_LIST  = ['New', 'Follow Up', 'Closed'];

const SORT_OPTIONS = [
  { value: 'newest',  label: 'Newest First' },
  { value: 'oldest',  label: 'Oldest First' },
  { value: 'status',  label: 'Status (New→Closed)' },
  { value: 'name_az', label: 'Name A→Z' },
];

// How long (ms) to hold before triggering long-press
const LONG_PRESS_DELAY = 500;

/* ─── Status Action Sheet ─────────────────────────────────────────────────── */
const StatusSheet = React.memo(({ enquiry, onClose, onSelect, isUpdating }) => (
  <>
    {/* Backdrop */}
    <div style={sheetStyles.backdrop} onClick={onClose} />

    {/* Bottom sheet */}
    <div style={sheetStyles.sheet}>
      <div style={sheetStyles.handle} />
      <div style={sheetStyles.sheetTitle}>Change Status</div>
      <div style={sheetStyles.name}>{enquiry.customer_name}</div>

      <div style={sheetStyles.options}>
        {STATUS_LIST.map(s => {
          const sc      = STATUS_COLORS[s];
          const active  = enquiry.status === s;
          return (
            <button
              key={s}
              style={{
                ...sheetStyles.optBtn,
                backgroundColor: active ? sc.bg : 'transparent',
                border: `2px solid ${active ? sc.color : 'var(--border-color)'}`,
                color: active ? sc.color : 'var(--text-main)',
                opacity: isUpdating ? 0.6 : 1,
              }}
              disabled={isUpdating || active}
              onClick={() => onSelect(s)}
            >
              {active && <span style={{ marginRight: '6px' }}>✓</span>}
              {s}
              {active && <span style={{ fontSize: '0.7rem', marginLeft: '6px', opacity: 0.7 }}>(current)</span>}
            </button>
          );
        })}
      </div>

      {isUpdating && (
        <div style={{ textAlign: 'center', padding: '8px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          Saving…
        </div>
      )}

      <button style={sheetStyles.cancelBtn} onClick={onClose} disabled={isUpdating}>Cancel</button>
    </div>
  </>
));

/* ─── Main Component ─────────────────────────────────────────────────────── */
const EnquiriesList = ({ navigateTo, enquiries, onDeleteEnquiries, onUpdateStatus }) => {
  const [rawSearch, setRawSearch]       = useState('');
  const [searchTerm, setSearchTerm]     = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy]             = useState('newest');
  const [selectMode, setSelectMode]     = useState(false);
  const [selected, setSelected]         = useState(new Set());
  const [isDeleting, setIsDeleting]     = useState(false);
  const [visibleCount, setVisibleCount] = useState(25);

  // Status sheet state
  const [sheetEnquiry, setSheetEnquiry] = useState(null); // the enquiry whose sheet is open
  const [isUpdating, setIsUpdating]     = useState(false);
  const [updateError, setUpdateError]   = useState(null);
  const [expandedStatusId, setExpandedStatusId] = useState(null);

  // Long-press refs
  const longPressTimer = useRef(null);
  const longPressFired = useRef(false);

  // Debounce search input — avoids filtering on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(rawSearch);
      setVisibleCount(25); // reset pagination on search
    }, 200);
    return () => clearTimeout(timer);
  }, [rawSearch]);

  /* ── Filtering & sorting ─────────────────────────────────────────────── */
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

  /* ── Select mode ─────────────────────────────────────────────────────── */
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

  /* ── Long-press handlers ─────────────────────────────────────────────── */
  const startLongPress = useCallback((enquiry) => {
    longPressFired.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      // Haptic feedback on supported devices
      if (navigator.vibrate) navigator.vibrate(60);
      setSheetEnquiry(enquiry);
    }, LONG_PRESS_DELAY);
  }, []);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  /* ── Card click ──────────────────────────────────────────────────────── */
  const handleCardClick = (enquiry) => {
    // If the long-press fired, don't also navigate
    if (longPressFired.current) return;
    if (selectMode) {
      toggleSelect(enquiry.enquiry_id);
    } else {
      navigateTo('enquiry-details', { enquiryId: enquiry.enquiry_id });
    }
  };

  /* ── Status sheet actions ────────────────────────────────────────────── */
  const handleStatusSelect = async (newStatus) => {
    if (!sheetEnquiry) return;
    setIsUpdating(true);
    setUpdateError(null);
    try {
      await onUpdateStatus(sheetEnquiry.enquiry_id, newStatus);
      setSheetEnquiry(null);
    } catch (err) {
      setUpdateError(err.message || 'Failed to update status. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const closeSheet = () => {
    if (isUpdating) return;
    setSheetEnquiry(null);
    setUpdateError(null);
  };

  const allSelected = filteredEnquiries.length > 0 && selected.size === filteredEnquiries.length;

  /* ── Render ──────────────────────────────────────────────────────────── */
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

      {/* Search + Status filter */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
        <div style={{ ...styles.searchContainer, flex: 2 }}>
          <Search size={18} color="var(--text-muted)" style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search name, mobile..."
            className="form-input"
            style={styles.searchInput}
            value={rawSearch}
            onChange={(e) => setRawSearch(e.target.value)}
          />
        </div>
        <select
          className="form-select"
          style={styles.statusSelect}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setVisibleCount(25);
          }}
        >
          <option value="All">All</option>
          <option value="New">🔵 New</option>
          <option value="Follow Up">🟡 Follow Up</option>
          <option value="Closed">🟢 Closed</option>
        </select>
      </div>

      {/* Sort chips */}
      <div style={styles.sortRow}>
        <span style={styles.sortLabel}>Sort:</span>
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

      {/* Result summary */}
      <div style={styles.resultSummary}>
        <span style={styles.resultCount}>
          {filteredEnquiries.length} enquir{filteredEnquiries.length !== 1 ? 'ies' : 'y'}
        </span>
        {statusFilter !== 'All' && (
          <span style={{ ...styles.activeFilter, backgroundColor: STATUS_COLORS[statusFilter]?.bg, color: STATUS_COLORS[statusFilter]?.color }}>
            {statusFilter}
          </span>
        )}
        {/* Long-press hint */}
        {!selectMode && filteredEnquiries.length > 0 && (
          <span style={styles.hintText}>Hold card to change status</span>
        )}
      </div>

      <div style={{ marginBottom: '12px' }} />

      {/* Select-mode action bar */}
      {selectMode && (
        <div style={styles.selectionBar}>
          <button style={styles.selectAllBtn} onClick={toggleSelectAll}>
            {allSelected ? <CheckSquare size={18} color="var(--primary-color)" /> : <Square size={18} color="var(--text-muted)" />}
            <span>{allSelected ? 'Deselect All' : 'Select All'}</span>
          </button>
          <span style={styles.selectedCount}>{selected.size} selected</span>
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

      {/* Enquiry cards */}
      <div style={styles.list}>
        {filteredEnquiries.slice(0, visibleCount).map(enquiry => {
          const isSelected  = selected.has(enquiry.enquiry_id);
          const statusStyle = STATUS_COLORS[enquiry.status] || STATUS_COLORS['New'];
          const isOffline = enquiry.enquiry_id && enquiry.enquiry_id.startsWith('ENQ-');
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
              onMouseDown={() => !selectMode && startLongPress(enquiry)}
              onMouseUp={cancelLongPress}
              onMouseLeave={cancelLongPress}
              onTouchStart={() => !selectMode && startLongPress(enquiry)}
              onTouchEnd={cancelLongPress}
              onTouchCancel={cancelLongPress}
              onContextMenu={(e) => { e.preventDefault(); if (!selectMode) { cancelLongPress(); setSheetEnquiry(enquiry); } }}
            >
              {/* Checkbox (select mode only) */}
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
                  <h3 style={styles.customerName}>
                    {enquiry.customer_name}
                    {isOffline && (
                      <span title="Stored offline, waiting to sync" style={{ marginLeft: '6px', color: '#f59e0b', display: 'inline-flex', verticalAlign: 'middle' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22.61 16.95A5 5 0 0 0 18 10h-1.26a8 8 0 0 0-7.05-6M5 5a8 8 0 0 0 4 15h9a5 5 0 0 0 1.7-.3"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      </span>
                    )}
                  </h3>
                  {/* Status inline dropdown */}
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <select
                      style={{
                        appearance: 'none',
                        WebkitAppearance: 'none',
                        backgroundColor: statusStyle.bg,
                        color: statusStyle.color,
                        padding: '3px 22px 3px 10px',
                        borderRadius: '12px',
                        border: 'none',
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        cursor: selectMode ? 'default' : 'pointer',
                        outline: 'none',
                        fontFamily: 'inherit',
                      }}
                      value={enquiry.status}
                      disabled={selectMode}
                      onChange={(e) => {
                        onUpdateStatus(enquiry.enquiry_id, e.target.value)
                          .catch(err => alert(err.message || 'Failed to update'));
                      }}
                    >
                      {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {!selectMode && (
                      <ChevronDown 
                        size={13} 
                        color={statusStyle.color} 
                        style={{ position: 'absolute', right: '6px', pointerEvents: 'none' }} 
                      />
                    )}
                  </div>
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

        {visibleCount < filteredEnquiries.length && (
          <button 
            style={styles.loadMoreBtn} 
            onClick={() => setVisibleCount(v => v + 25)}
          >
            Load More
          </button>
        )}
      </div>

      {/* Error toast for status update failure */}
      {updateError && (
        <div style={styles.errorToast}>
          ⚠️ {updateError}
          <button style={styles.errorClose} onClick={() => setUpdateError(null)}>✕</button>
        </div>
      )}

      {/* Status bottom sheet */}
      {sheetEnquiry && (
        <StatusSheet
          enquiry={sheetEnquiry}
          onClose={closeSheet}
          onSelect={handleStatusSelect}
          isUpdating={isUpdating}
        />
      )}
    </div>
  );
};

/* ─── Styles ─────────────────────────────────────────────────────────────── */
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
  searchContainer: { position: 'relative' },
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
  sortChips: { display: 'flex', gap: '6px', flexWrap: 'wrap' },
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
    flexWrap: 'wrap',
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
  hintText: {
    fontSize: '0.68rem',
    color: 'var(--text-muted)',
    opacity: 0.65,
    marginLeft: 'auto',
    fontStyle: 'italic',
  },
  selectionBar: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
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
  loadMoreBtn: {
    width: '100%',
    padding: '12px',
    marginTop: '16px',
    backgroundColor: '#fff',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    color: 'var(--primary-color)',
    fontWeight: '600',
    cursor: 'pointer',
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
    userSelect: 'none',
    WebkitUserSelect: 'none',
  },
  selectedCard: {
    borderColor: 'var(--primary-color)',
    backgroundColor: '#eff6ff',
    boxShadow: '0 0 0 2px rgba(37,99,235,0.15)',
  },
  checkboxWrapper: { paddingTop: '2px', flexShrink: 0 },
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
    padding: '3px 9px',
    borderRadius: '12px',
    fontWeight: '600',
    flexShrink: 0,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
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
  detailIcon: { flexShrink: 0, color: 'var(--text-muted)' },
  footerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '6px',
    borderTop: '1px solid var(--border-color)',
  },
  meta: { fontSize: '0.72rem', color: 'var(--text-muted)' },
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
  errorToast: {
    position: 'fixed',
    bottom: '80px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#fef2f2',
    color: '#b91c1c',
    border: '1px solid #fca5a5',
    borderRadius: '10px',
    padding: '10px 16px',
    fontSize: '0.85rem',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    zIndex: 1000,
    boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
    maxWidth: '340px',
    width: '90%',
  },
  errorClose: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#b91c1c',
    fontWeight: '700',
    padding: '0 4px',
    marginLeft: 'auto',
  },
};

/* ─── Status Sheet Styles ─────────────────────────────────────────────────── */
const sheetStyles = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 200,
    backdropFilter: 'blur(2px)',
  },
  sheet: {
    position: 'fixed',
    bottom: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: '480px',
    backgroundColor: 'white',
    borderRadius: '20px 20px 0 0',
    padding: '12px 20px 32px',
    zIndex: 201,
    boxShadow: '0 -4px 32px rgba(0,0,0,0.18)',
    animation: 'slideUp 0.22s ease-out',
  },
  handle: {
    width: '40px',
    height: '4px',
    backgroundColor: '#cbd5e1',
    borderRadius: '4px',
    margin: '0 auto 16px',
  },
  sheetTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: '4px',
    color: 'var(--text-main)',
  },
  name: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    textAlign: 'center',
    marginBottom: '20px',
  },
  options: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '16px',
  },
  optBtn: {
    width: '100%',
    padding: '13px 16px',
    borderRadius: '12px',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s',
  },
  cancelBtn: {
    width: '100%',
    padding: '13px',
    borderRadius: '12px',
    background: '#f1f5f9',
    border: 'none',
    fontSize: '0.95rem',
    fontWeight: '600',
    color: 'var(--text-muted)',
    cursor: 'pointer',
  },
  expandToggleBtn: {
    width: '100%',
    marginTop: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    background: '#f8fafc',
    border: '1px solid var(--border-color)',
    color: 'var(--text-muted)',
    padding: '6px',
    borderRadius: '8px',
    cursor: 'pointer',
  },
};

export default EnquiriesList;
