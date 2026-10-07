import React from 'react';
import { Camera, X, ZoomIn } from 'lucide-react';

const ImageCaptureSlot = ({ label, url, onCapture, onRemove, onZoom }) => {
  return (
    <div style={styles.cardSlot}>
      <div style={styles.cardSlotLabel}>{label}</div>
      {url ? (
        <div style={styles.cardPreviewContainer}>
          <div style={{ position: 'relative' }}>
            <img src={url} alt={label} style={styles.cardPreview} />
            <button
              style={styles.zoomBtn}
              onClick={(e) => { e.preventDefault(); onZoom(url); }}
              aria-label="Expand image"
            >
              <ZoomIn size={18} color="white" />
            </button>
          </div>
          <button
            type="button"
            className="btn btn-secondary mt-sm"
            onClick={onRemove}
          >
            <X size={16} /> Remove
          </button>
        </div>
      ) : (
        <label style={styles.uploadBtn}>
          <Camera size={24} />
          <span>Capture {label}</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={onCapture}
          />
        </label>
      )}
    </div>
  );
};

const styles = {
  cardSlot: {
    border: '2px dashed var(--border-color)',
    borderRadius: '12px',
    padding: '16px',
    textAlign: 'center',
    backgroundColor: '#f8fafc',
    position: 'relative',
    transition: 'all 0.2s ease',
  },
  cardSlotLabel: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-muted)',
    marginBottom: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  uploadBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    color: 'var(--primary-color)',
    cursor: 'pointer',
    padding: '16px',
  },
  cardPreviewContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  cardPreview: {
    width: '100%',
    maxWidth: '240px',
    height: '140px',
    objectFit: 'cover',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  zoomBtn: {
    position: 'absolute',
    bottom: '8px',
    right: '8px',
    backgroundColor: 'rgba(0,0,0,0.6)',
    border: 'none',
    borderRadius: '6px',
    padding: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  }
};

export default ImageCaptureSlot;
