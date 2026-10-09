import React, { useState, useEffect } from 'react';
import { ChevronLeft, WifiOff } from 'lucide-react';
import { getOfflineQueueLength } from '../services/api';

const Header = React.memo(({ title, showBack, onBack, rightElement }) => {
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    const updateQueue = async () => {
      const count = await getOfflineQueueLength();
      setQueueCount(count);
    };
    updateQueue();
    window.addEventListener('offline-queue-updated', updateQueue);
    return () => window.removeEventListener('offline-queue-updated', updateQueue);
  }, []);
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
        <h2 style={styles.title}>
          {title}
          {queueCount > 0 && (
            <span style={styles.offlineBadge}>
              <WifiOff size={12} /> {queueCount}
            </span>
          )}
        </h2>
      </div>
      <div style={styles.right}>
        {rightElement}
      </div>
    </div>
  );
});

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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
  },
  offlineBadge: {
    fontSize: '0.75rem',
    backgroundColor: '#f59e0b',
    color: '#fff',
    padding: '2px 6px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontWeight: 'normal',
  }
};

export default Header;
