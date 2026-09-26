import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Full-screen image lightbox.
 * Props:
 *  - src   : image URL to display
 *  - alt   : alt text
 *  - onClose : callback to close
 */
const ImageLightbox = ({ src, alt = 'Image', onClose }) => {
  // Close on Escape key
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!src) return null;

  return (
    <div
      style={styles.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
    >
      {/* Close button */}
      <button
        style={styles.closeBtn}
        onClick={onClose}
        aria-label="Close image preview"
      >
        <X size={28} color="white" />
      </button>

      {/* Image — stop click bubbling so tapping the image itself doesn't close */}
      <img
        src={src}
        alt={alt}
        style={styles.image}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.92)',
    zIndex: 2000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    cursor: 'zoom-out',
    animation: 'fadeIn 0.18s ease',
  },
  closeBtn: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    background: 'rgba(255,255,255,0.15)',
    border: 'none',
    borderRadius: '50%',
    width: '44px',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 2001,
    backdropFilter: 'blur(4px)',
  },
  image: {
    maxWidth: '100%',
    maxHeight: '90vh',
    borderRadius: '8px',
    objectFit: 'contain',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    cursor: 'default',
    animation: 'scaleIn 0.2s ease',
  },
};

export default ImageLightbox;
