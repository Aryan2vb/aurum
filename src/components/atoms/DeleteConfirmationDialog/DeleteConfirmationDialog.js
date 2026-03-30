import React from 'react';
import Button from '../Button/Button';
import './DeleteConfirmationDialog.css';

/**
 * DeleteConfirmationDialog - Attio-style delete confirmation
 */
const DeleteConfirmationDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  itemName,
  itemType = 'item',
  isDeleting = false,
  className = '',
}) => {
  if (!isOpen) return null;

  return (
    <div className={`delete-confirmation-overlay ${className}`} onClick={onClose}>
      <div className="delete-confirmation-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="delete-confirmation-header">
          <h3 className="delete-confirmation-title">{title}</h3>
        </div>
        <div className="delete-confirmation-body">
          <p className="delete-confirmation-message">
            {message || (
              <>
                This will permanently delete{' '}
                {itemName && <span className="delete-confirmation-item-name">{itemName}</span>}
                {!itemName && `this ${itemType}`}. This action cannot be undone.
              </>
            )}
          </p>
        </div>
        <div className="delete-confirmation-actions">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            disabled={isDeleting}
            className="delete-confirmation-delete-button"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationDialog;
