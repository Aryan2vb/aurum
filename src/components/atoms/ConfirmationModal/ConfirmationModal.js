import React from 'react';
import Button from '../Button/Button';
import Icon from '../Icon/Icon';
import './ConfirmationModal.css';

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

  return (
    <div className="confirmation-modal-overlay" onClick={onClose}>
      <div className="confirmation-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="confirmation-modal-header">
          <div 
            className="confirmation-modal-icon" 
            style={{ backgroundColor: `${getIconColor()}15`, color: getIconColor() }}
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
