import React, { useState, useEffect } from 'react';
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

  // Load initial data
  useEffect(() => {
    const fetchEnquiries = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await api.getEnquiries();
        setEnquiries(data);
      } catch (err) {
        console.error(err);
        setError(err.message || 'Failed to load enquiries. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchEnquiries();
  }, [currentRoute]); // Refresh when route changes to catch new saves

  const navigateTo = (route, params = {}) => {
    if (isDirty) {
      const confirmLeave = window.confirm("You have unsaved changes. Are you sure you want to leave?");
      if (!confirmLeave) return;
    }
    
    // Clear dirty state on successful navigation
    setIsDirty(false);

    if (params.enquiryId) {
      setSelectedEnquiryId(params.enquiryId);
    }
    setCurrentRoute(route);
  };

  const renderScreen = () => {
    if (isLoading && currentRoute !== 'new-enquiry' && currentRoute !== 'settings') {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', color: 'var(--text-muted)' }}>
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      );
    }

    if (error && currentRoute !== 'new-enquiry' && currentRoute !== 'settings') {
      return (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--danger-color)' }}>
          <p>{error}</p>
          <button className="btn btn-secondary" onClick={() => setCurrentRoute(currentRoute)}>Retry</button>
        </div>
      );
    }

    switch (currentRoute) {
      case 'dashboard':
        return <Dashboard navigateTo={navigateTo} enquiries={enquiries} />;
      case 'enquiries':
        return <EnquiriesList navigateTo={navigateTo} enquiries={enquiries} />;
      case 'new-enquiry':
        return <NewEnquiry navigateTo={navigateTo} setIsDirty={setIsDirty} />;
      case 'enquiry-details':
        return <EnquiryDetails navigateTo={navigateTo} enquiryId={selectedEnquiryId} />;
      case 'settings':
        return <Settings navigateTo={navigateTo} />;
      default:
        return <Dashboard navigateTo={navigateTo} enquiries={enquiries} />;
    }
  };

  // Hide bottom nav on screens where we want full focus (like new-enquiry forms)
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
