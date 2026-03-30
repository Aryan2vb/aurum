import React, { useEffect } from 'react';
import './SlideOver.css';

/**
 * Slide-over panel component (slides in from right, no background blur)
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether panel is open
 * @param {function} props.onClose - Close handler
 * @param {string} props.title - Panel title
 * @param {React.ReactNode} props.children - Panel content
 * @param {string} props.className - Additional class names
 * @param {number|string} props.width - Panel width (default: '500px', can be '100vw' for mobile)
 */
const SlideOver = ({
  isOpen,
  onClose,
  title,
  children,
  className = '',
  width = 500
}) => {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - no blur, just overlay */}
      <div 
        className="slideover-backdrop" 
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Panel */}
      <div 
        className={`slideover-panel ${className}`}
        style={{ width: `${width}px` }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="slideover-title"
      >
        {/* Header */}
        {title && (
          <div className="slideover-header">
            <h2 id="slideover-title" className="slideover-title">{title}</h2>
            <button 
              className="slideover-close"
              onClick={onClose}
              aria-label="Close panel"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        )}
        
        {/* Content */}
        <div className="slideover-content">
          {children}
        </div>
      </div>
    </>
  );
};

export default SlideOver;
