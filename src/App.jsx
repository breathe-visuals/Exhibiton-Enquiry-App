import React, { useState, useEffect, useCallback } from 'react';
import Dashboard from './screens/Dashboard';
import EnquiriesList from './screens/EnquiriesList';
import NewEnquiry from './screens/NewEnquiry';
import EnquiryDetails from './screens/EnquiryDetails';
import Settings from './screens/Settings';
import BottomNav from './components/BottomNav';
import * as api from './services/api';

function App() {
  const [currentRoute, setCurrentRoute] = useState('dashboard');
  const [selectedEnquiryId, setSelectedEnquiryId] = useState(null);
  const [enquiries, setEnquiries] = useState([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load data once on mount
  useEffect(() => {
    let cancelled = false;
    const fetchEnquiries = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await api.getEnquiries();
        if (!cancelled) setEnquiries(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load enquiries. Please try again.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetchEnquiries();
    return () => { cancelled = true; };
  }, []);

  /**
   * Optimistically add a new enquiry to local state immediately,
   * then fire the API call in the background.
   */
  const addEnquiryOptimistic = useCallback(async (enquiryData) => {
    const tempId = `ENQ-${Date.now()}`;
    const tempEnquiry = {
      ...enquiryData,
      enquiry_id: tempId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: enquiryData.status || 'New',
    };

    setEnquiries(prev => [tempEnquiry, ...prev]);

    try {
      await api.createEnquiry(enquiryData);
      // Re-fetch to get server-assigned ID & any server-side transformations
      const fresh = await api.getEnquiries();
      setEnquiries(Array.isArray(fresh) ? fresh : []);
    } catch (err) {
      // Rollback optimistic insert on failure
      setEnquiries(prev => prev.filter(e => e.enquiry_id !== tempId));
      throw err; // propagate so NewEnquiry can show the error alert
    }
  }, []);

  /**
   * Optimistically update enquiry status in local state,
   * then sync to backend. Rolls back on failure.
   */
  const updateStatusOptimistic = useCallback(async (id, newStatus) => {
    // Snapshot previous state for rollback
    let previousEnquiries;
    setEnquiries(prev => {
      previousEnquiries = prev;
      return prev.map(e =>
        e.enquiry_id === id
          ? { ...e, status: newStatus, updated_at: new Date().toISOString() }
          : e
      );
    });

    try {
      await api.updateEnquiryStatus(id, newStatus);
    } catch (err) {
      // Rollback on error
      if (previousEnquiries) setEnquiries(previousEnquiries);
      throw err;
    }
  }, []);

  /**
   * Optimistically delete one or more enquiries.
   */
  const deleteEnquiriesOptimistic = useCallback(async (ids) => {
    const idSet = new Set(ids);
    // Snapshot for rollback
    let previousEnquiries;
    setEnquiries(prev => {
      previousEnquiries = prev;
      return prev.filter(e => !idSet.has(e.enquiry_id));
    });

    try {
      if (ids.length === 1) {
        await api.deleteEnquiry(ids[0]);
      } else {
        await api.deleteEnquiries(ids);
      }
    } catch (err) {
      // On failure, restore snapshot (avoid a second API call that could also fail)
      if (previousEnquiries) setEnquiries(previousEnquiries);
      throw err;
    }
  }, []);

  const navigateTo = useCallback((route, params = {}) => {
    if (isDirty) {
      const confirmLeave = window.confirm('You have unsaved changes. Are you sure you want to leave?');
      if (!confirmLeave) return;
    }
    setIsDirty(false);

    if (params.enquiryId) {
      setSelectedEnquiryId(params.enquiryId);
    }
    setCurrentRoute(route);
  }, [isDirty]);

  const renderScreen = () => {
    if (isLoading) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', color: 'var(--text-muted)' }}>
          <div className="spinner" />
          <p style={{ marginTop: '12px' }}>Loading...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--danger-color)' }}>
          <p>{error}</p>
          <button className="btn btn-secondary" style={{ marginTop: '12px' }} onClick={() => window.location.reload()}>Retry</button>
        </div>
      );
    }

    switch (currentRoute) {
      case 'dashboard':
        return <Dashboard navigateTo={navigateTo} enquiries={enquiries} />;
      case 'enquiries':
        return (
          <EnquiriesList
            navigateTo={navigateTo}
            enquiries={enquiries}
            onDeleteEnquiries={deleteEnquiriesOptimistic}
            onUpdateStatus={updateStatusOptimistic}
          />
        );
      case 'new-enquiry':
        return (
          <NewEnquiry
            navigateTo={navigateTo}
            setIsDirty={setIsDirty}
            onSave={addEnquiryOptimistic}
          />
        );
      case 'enquiry-details':
        return (
          <EnquiryDetails
            navigateTo={navigateTo}
            enquiryId={selectedEnquiryId}
            enquiries={enquiries}
            onDeleteEnquiry={(id) => deleteEnquiriesOptimistic([id])}
            onUpdateStatus={updateStatusOptimistic}
          />
        );
      case 'settings':
        return <Settings navigateTo={navigateTo} />;
      default:
        return <Dashboard navigateTo={navigateTo} enquiries={enquiries} />;
    }
  };

  const hideBottomNav = currentRoute === 'new-enquiry' || currentRoute === 'enquiry-details';

  return (
    <div className="app-container">
      <main className="main-content">
        {renderScreen()}
      </main>
      
      {!hideBottomNav && (
        <BottomNav currentRoute={currentRoute} navigateTo={navigateTo} />
      )}
    </div>
  );
}

export default App;
