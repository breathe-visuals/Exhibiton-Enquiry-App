import React from 'react';
import { ChevronLeft } from 'lucide-react';

const Header = ({ title, showBack, onBack, rightElement }) => {
  return (
    <div style={styles.header}>
      <div style={styles.left}>
        {showBack && (
          <button style={styles.backBtn} onClick={onBack}>
            <ChevronLeft size={24} />
          </button>
        )}
      </div>
      <div style={styles.center}>
        <h2 style={styles.title}>{title}</h2>
      </div>
      <div style={styles.right}>
        {rightElement}
      </div>
    </div>
  );
};

const styles = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 0',
    marginBottom: '16px',
    borderBottom: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-color)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  left: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
  },
  center: {
    flex: 2,
    textAlign: 'center',
  },
  right: {
    flex: 1,
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-main)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    padding: '4px',
  },
  title: {
    fontSize: '1.1rem',
    margin: 0,
  }
};

export default Header;
