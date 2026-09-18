import React from 'react';
import { Home, List, Settings } from 'lucide-react';

const BottomNav = ({ currentRoute, navigateTo }) => {
  return (
    <div style={styles.nav}>
      <button 
        style={currentRoute === 'dashboard' ? { ...styles.btn, ...styles.active } : styles.btn}
        onClick={() => navigateTo('dashboard')}
      >
        <Home size={24} />
        <span style={styles.label}>Home</span>
      </button>
      <button 
        style={currentRoute === 'enquiries' ? { ...styles.btn, ...styles.active } : styles.btn}
        onClick={() => navigateTo('enquiries')}
      >
        <List size={24} />
        <span style={styles.label}>Enquiries</span>
      </button>
      <button 
        style={currentRoute === 'settings' ? { ...styles.btn, ...styles.active } : styles.btn}
        onClick={() => navigateTo('settings')}
      >
        <Settings size={24} />
        <span style={styles.label}>Settings</span>
      </button>
    </div>
  );
};

const styles = {
  nav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60px',
    backgroundColor: 'white',
    borderTop: '1px solid var(--border-color)',
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    zIndex: 100,
  },
  btn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    cursor: 'pointer',
    width: '33%',
    padding: '8px 0',
  },
  active: {
    color: 'var(--primary-color)',
  },
  label: {
    fontSize: '0.75rem',
    fontWeight: '500',
  }
};

export default BottomNav;
