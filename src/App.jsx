import React, { useState, useEffect } from 'react';
import Dashboard from './screens/Dashboard';
import EnquiriesList from './screens/EnquiriesList';
import NewEnquiry from './screens/NewEnquiry';
import EnquiryDetails from './screens/EnquiryDetails';
import Settings from './screens/Settings';
import BottomNav from './components/BottomNav';
import { getEnquiries } from './utils/mockData';

function App() {
  const [currentRoute, setCurrentRoute] = useState('dashboard');
  const [selectedEnquiryId, setSelectedEnquiryId] = useState(null);
  const [enquiries, setEnquiries] = useState([]);
  const [isDirty, setIsDirty] = useState(false);

  // Load initial data
  useEffect(() => {
    setEnquiries(getEnquiries());
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
