import React, { useState, useEffect, useCallback } from 'react';
import Dashboard from './screens/Dashboard';
import EnquiriesList from './screens/EnquiriesList';
import NewEnquiry from './screens/NewEnquiry';
import EnquiryDetails from './screens/EnquiryDetails';
import Settings from './screens/Settings';
import BottomNav from './components/BottomNav';
import ErrorBoundary from './components/ErrorBoundary';
import * as api from './services/api';
import * as localDb from './services/localDb';

function App() {
  const [currentRoute, setCurrentRoute] = useState('dashboard');
  const [selectedEnquiryId, setSelectedEnquiryId] = useState(null);
  const [enquiries, setEnquiries] = useState([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Refresh the full enquiries list from the server and update local state+cache
  const refreshFromServer = useCallback(async () => {
    try {
      const data = await api.getEnquiries();
      const freshData = Array.isArray(data) ? data : [];
      setEnquiries(freshData);
      localDb.saveLocalEnquiries(freshData).catch(e => console.error(e));
    } catch (err) {
      console.warn('Background refresh failed:', err.message);
    }
  }, []);

  // SWR: Hydrate immediately from localDb, then fetch fresh
  useEffect(() => {
    let cancelled = false;
    
    const initData = async () => {
      // 1. Instantly load from IndexedDB - ensure products is always an array
      let hasLocalData = false;
      try {
        const cachedData = await localDb.getLocalEnquiries();
        if (cachedData && cachedData.length > 0 && !cancelled) {
          // Sanitize: ensure products is always an array (prevents 0-products crash)
          const sanitized = cachedData.map(e => ({ ...e, products: Array.isArray(e.products) ? e.products : [] }));
          setEnquiries(sanitized);
          hasLocalData = true;
          setIsLoading(false); // UI instantly unblocks
        }
      } catch(e) { console.error(e); }

      // 2. Fetch fresh from network (background)
      if (!hasLocalData && !cancelled) setIsLoading(true);
      setError(null);
      try {
        const data = await api.getEnquiries();
        if (!cancelled) {
          const freshData = Array.isArray(data) ? data : [];
          setEnquiries(freshData);
          localDb.saveLocalEnquiries(freshData).catch(e => console.error(e));
        }
      } catch (err) {
        if (!cancelled && !hasLocalData) {
          setError(err.message || 'Failed to load enquiries. Please try again.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    
    initData();
    return () => { cancelled = true; };
  }, []);

  // Listen for offline queue sync events → re-fetch so Pending → Synced badges update
  useEffect(() => {
    const handleQueueUpdate = () => {
      if (navigator.onLine) refreshFromServer();
    };
    window.addEventListener('offline-queue-updated', handleQueueUpdate);
    return () => window.removeEventListener('offline-queue-updated', handleQueueUpdate);
  }, [refreshFromServer]);

  // 3. Persist local state to IndexedDB whenever it changes
  useEffect(() => {
    if (!isLoading && enquiries.length > 0) {
      localDb.saveLocalEnquiries(enquiries).catch(e => console.error(e));
    }
  }, [enquiries, isLoading]);

  /**
   * Optimistically add a new enquiry to local state immediately,
   * then send the single payload (including base64 images) to the backend.
   */
  const addEnquiryOptimistic = useCallback((enquiryData) => {
    return new Promise((resolve) => {
      const tempId = `ENQ-${Date.now()}`;
      const tempEnquiry = {
        ...enquiryData,
        enquiry_id: tempId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: enquiryData.status || 'New',
      };

      setEnquiries(prev => [tempEnquiry, ...prev]);
      resolve({ success: true, enquiry_id: tempId }); // Instantly unblock UI

      // Background Sync
      const cleanPayload = {
        ...enquiryData,
        products: (enquiryData.products || []).map(({ _oldPhotoUrl, ...rest }) => rest),
      };
      
      const removedUrls = cleanPayload._removedImageUrls || [];
      delete cleanPayload._removedImageUrls;

      api.createEnquiry(cleanPayload)
        .then(async (result) => {
          if (result && !result._queued) {
            // Sync succeeded – fetch the full list so the real ID + products appear
            await refreshFromServer();
          }
          // If queued (offline), keep temp entry; offline-queue-updated event fires on reconnect
        })
        .catch(err => {
          console.log('Background sync error (likely queued):', err);
        });
    });
  }, []);

  /**
   * Optimistically update an existing enquiry
   */
  const editEnquiryOptimistic = useCallback((enquiryData) => {
    return new Promise((resolve) => {
      setEnquiries(prev => prev.map(e => (e.enquiry_id === enquiryData.enquiry_id ? { ...enquiryData, updated_at: new Date().toISOString() } : e)));
      resolve({ success: true, enquiry_id: enquiryData.enquiry_id }); // Instantly unblock UI

      // Background Sync
      const cleanPayload = {
        ...enquiryData,
        products: (enquiryData.products || []).map(({ _oldPhotoUrl, ...rest }) => rest),
      };
      const removedUrls = cleanPayload._removedImageUrls || [];
      delete cleanPayload._removedImageUrls;

      api.updateEnquiry(cleanPayload.enquiry_id, cleanPayload)
        .then(async (result) => {
          if (removedUrls.length > 0) api.deleteImages(removedUrls).catch(e => console.error(e));
          if (result && !result._queued) {
            // Sync succeeded – refresh full list so products are always accurate
            await refreshFromServer();
          }
        })
        .catch(err => {
          console.log('Background edit sync error (likely queued):', err);
        });
    });
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

  const navigateTo = useCallback((route, params = {}, force = false) => {
    if (!force && isDirty) {
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
      case 'edit-enquiry':
        return (
          <NewEnquiry
            navigateTo={navigateTo}
            setIsDirty={setIsDirty}
            onSave={editEnquiryOptimistic}
            editingEnquiryId={selectedEnquiryId}
            enquiries={enquiries}
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

  const hideBottomNav = currentRoute === 'new-enquiry' || currentRoute === 'enquiry-details' || currentRoute === 'edit-enquiry';

  return (
    <div className="app-container">
      <main className="main-content">
        <ErrorBoundary>
          {renderScreen()}
        </ErrorBoundary>
      </main>
      
      {!hideBottomNav && (
        <BottomNav currentRoute={currentRoute} navigateTo={navigateTo} />
      )}
    </div>
  );
}

export default App;
