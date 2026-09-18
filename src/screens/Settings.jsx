import React from 'react';
import Header from '../components/Header';
import { User, LogOut, Settings as SettingsIcon } from 'lucide-react';

const Settings = () => {
  return (
    <div>
      <Header title="Settings" />
      
      <div className="card" style={styles.profileCard}>
        <div style={styles.avatar}>
          <User size={32} color="white" />
        </div>
        <div style={styles.userInfo}>
          <h3 style={{ margin: 0 }}>Staff Member 1</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Exhibition: Gems & Jewellery Expo 2026
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <button style={styles.listItem}>
          <SettingsIcon size={20} color="var(--text-muted)" />
          <span style={styles.listText}>App Preferences</span>
        </button>
        <button style={styles.listItem}>
          <LogOut size={20} color="var(--danger-color)" />
          <span style={{ ...styles.listText, color: 'var(--danger-color)' }}>Log Out</span>
        </button>
      </div>

      <div style={{ textAlign: 'center', marginTop: '32px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        Exhibition Enquiry App v1.0.0<br/>
        (Mock Data Mode)
      </div>
    </div>
  );
};

const styles = {
  profileCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '24px',
  },
  avatar: {
    width: '60px',
    height: '60px',
    borderRadius: '30px',
    backgroundColor: 'var(--primary-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
  },
  listItem: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px 20px',
    backgroundColor: 'white',
    border: 'none',
    borderBottom: '1px solid var(--border-color)',
    cursor: 'pointer',
    textAlign: 'left',
  },
  listText: {
    fontSize: '1rem',
    fontWeight: '500',
    color: 'var(--text-main)',
  }
};

export default Settings;
