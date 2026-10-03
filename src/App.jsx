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
   * Helper: if the value is a base64 data URL, upload it to Drive and
   * return the resulting Drive thumbnail URL. Otherwise pass it through.
   */
  const maybeUploadImage = useCallback(async (dataUrl, type) => {
    if (!dataUrl || !dataUrl.startsWith('data:image')) return dataUrl || '';
    // uploadImage calls the /upload endpoint which saves to the correct Drive folder
    const res = await api.uploadImage(dataUrl, type);
    return res;
  }, []);

  /**
   * Optimistically add a new enquiry to local state immediately,
   * then upload all images separately and fire the API call.
   *
   * WHY: Embedding large base64 strings inside the createEnquiry payload
   * caused Apps Script POST-body size / execution-timeout failures.
   * Uploading each image via the dedicated /upload endpoint first keeps
   * the final createEnquiry payload small (Drive URLs only).
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

    let uploadedUrlsThisSession = [];

    try {
      // ── 1. Pre-upload business card images ──────────────────────────────
      const [bcUrl1, bcUrl2] = await Promise.all([
        maybeUploadImage(enquiryData.business_card_url,   'business_card'),
        maybeUploadImage(enquiryData.business_card_url_2, 'business_card'),
      ]);
      
      if (bcUrl1 && bcUrl1.includes('drive.google.com') && enquiryData.business_card_url !== bcUrl1) uploadedUrlsThisSession.push(bcUrl1);
      if (bcUrl2 && bcUrl2.includes('drive.google.com') && enquiryData.business_card_url_2 !== bcUrl2) uploadedUrlsThisSession.push(bcUrl2);

      // ── 2. Pre-upload every product photo sequentially ──────────────────
      //    (sequential to avoid hammering Apps Script simultaneously)
      const uploadedProducts = [];
      for (const p of (enquiryData.products || [])) {
        const photoUrl = await maybeUploadImage(p.photo_url, 'product');
        if (photoUrl && photoUrl.includes('drive.google.com') && p.photo_url !== photoUrl) {
          uploadedUrlsThisSession.push(photoUrl);
        }
        uploadedProducts.push({ ...p, photo_url: photoUrl });
      }

      // ── 3. Build clean payload (Drive URLs, no base64) ──────────────────
      const cleanPayload = {
        ...enquiryData,
        business_card_url:   bcUrl1,
        business_card_url_2: bcUrl2,
        products: uploadedProducts,
      };

      // ── 4. Save enquiry (small JSON, no embedded images) ─────────────────
      await api.createEnquiry(cleanPayload);

      // Re-fetch to get server-assigned ID & any server-side transformations
      const fresh = await api.getEnquiries();
      setEnquiries(Array.isArray(fresh) ? fresh : []);
    } catch (err) {
      // Rollback optimistic insert on failure
      setEnquiries(prev => prev.filter(e => e.enquiry_id !== tempId));
      if (uploadedUrlsThisSession.length > 0) {
        api.deleteImages(uploadedUrlsThisSession).catch(e => console.error("Failed to delete orphaned images:", e));
      }
      throw err; // propagate so NewEnquiry can show the error alert
    }
  }, [maybeUploadImage]);

  /**
   * Optimistically update an existing enquiry
   */
  const editEnquiryOptimistic = useCallback(async (enquiryData) => {
    // Snapshot state for rollback
    let previousEnquiries;
    setEnquiries(prev => {
      previousEnquiries = prev;
      return prev.map(e => (e.enquiry_id === enquiryData.enquiry_id ? { ...enquiryData, updated_at: new Date().toISOString() } : e));
    });

    let uploadedUrlsThisSession = [];

    try {
      const [bcUrl1, bcUrl2] = await Promise.all([
        maybeUploadImage(enquiryData.business_card_url,   'business_card'),
        maybeUploadImage(enquiryData.business_card_url_2, 'business_card'),
      ]);
      
      if (bcUrl1 && bcUrl1.includes('drive.google.com') && enquiryData.business_card_url !== bcUrl1) uploadedUrlsThisSession.push(bcUrl1);
      if (bcUrl2 && bcUrl2.includes('drive.google.com') && enquiryData.business_card_url_2 !== bcUrl2) uploadedUrlsThisSession.push(bcUrl2);

      const uploadedProducts = [];
      for (const p of (enquiryData.products || [])) {
        const photoUrl = await maybeUploadImage(p.photo_url, 'product');
        if (photoUrl && photoUrl.includes('drive.google.com') && p.photo_url !== photoUrl) {
          uploadedUrlsThisSession.push(photoUrl);
        }
        uploadedProducts.push({ ...p, photo_url: photoUrl });
      }

      const cleanPayload = {
        ...enquiryData,
        business_card_url:   bcUrl1,
        business_card_url_2: bcUrl2,
        products: uploadedProducts,
      };

      await api.updateEnquiry(cleanPayload.enquiry_id, cleanPayload);

      // Re-fetch to sync
      const fresh = await api.getEnquiries();
      setEnquiries(Array.isArray(fresh) ? fresh : []);
    } catch (err) {
      if (previousEnquiries) setEnquiries(previousEnquiries);
      if (uploadedUrlsThisSession.length > 0) {
        api.deleteImages(uploadedUrlsThisSession).catch(e => console.error("Failed to delete orphaned images:", e));
      }
      throw err;
    }
  }, [maybeUploadImage]);

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
        {renderScreen()}
      </main>
      
      {!hideBottomNav && (
        <BottomNav currentRoute={currentRoute} navigateTo={navigateTo} />
      )}
    </div>
  );
}

export default App;
