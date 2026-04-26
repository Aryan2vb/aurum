import React, { useEffect } from 'react';
import Button from '../Button/Button';
import Icon from '../Icon/Icon';
import './ConfirmationModal.css';

/**
 * Helper to convert hex to rgba or handle CSS variables for alpha backgrounds
 */
const convertColorWithAlpha = (color, alpha = 0.082) => {
  if (!color) return 'transparent';
  if (color.startsWith('var(')) return color;
  
  // Handle hex colors
  let r = 0, g = 0, b = 0;
  if (color.length === 4) {
    r = parseInt(color[1] + color[1], 16);
    g = parseInt(color[2] + color[2], 16);
    b = parseInt(color[3] + color[3], 16);
  } else if (color.length === 7) {
    r = parseInt(color.substring(1, 3), 16);
    g = parseInt(color.substring(3, 5), 16);
    b = parseInt(color.substring(5, 7), 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Proceed',
  cancelText = 'Cancel',
  type = 'warning', // 'warning', 'danger', 'info'
  isLoading = false
}) => {
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'help';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'danger': return '#ef4444';
      case 'warning': return '#f59e0b';
      case 'info': return '#3b82f6';
      default: return 'var(--text-secondary)';
    }
  };

  const iconColor = getIconColor();

  return (
    <div className="confirmation-modal-overlay" onClick={onClose}>
      <div className="confirmation-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="confirmation-modal-header">
          <div 
            className="confirmation-modal-icon" 
            style={{ backgroundColor: convertColorWithAlpha(iconColor), color: iconColor }}
          >
            <Icon name={getIcon()} size={24} />
          </div>
          <h3 className="confirmation-modal-title">{title}</h3>
        </div>
        <div className="confirmation-modal-body">
          <div className="confirmation-modal-message">
            {message}
          </div>
        </div>
        <div className="confirmation-modal-actions">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            disabled={isLoading}
            style={{ backgroundColor: type === 'danger' ? '#ef4444' : undefined }}
          >
            {isLoading ? 'Processing...' : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
