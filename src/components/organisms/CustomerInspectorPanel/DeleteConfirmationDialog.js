import React from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import './DeleteConfirmationDialog.css';

/**
 * DeleteConfirmationDialog - A calm, neutral confirmation dialog for 
 * destructive actions.
 * 
 * UX Notes:
 * - Uses neutral language ("Remove" feels less alarming than "Delete forever")
 * - Clearly states what will happen
 * - Primary action is cancel (left), destructive action is right
 * - Uses Radix AlertDialog for proper accessibility (focus trap, escape to close)
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the dialog is open
 * @param {Function} props.onClose - Handler called when dialog should close
 * @param {Function} props.onConfirm - Handler called when delete is confirmed
 * @param {string} props.customerName - Name of the customer being deleted
 * @param {boolean} props.isDeleting - Whether delete action is in progress
 */
const DeleteConfirmationDialog = ({
  isOpen,
  onClose,
  onConfirm,
  customerName,
  isDeleting,
}) => {
  return (
    <AlertDialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialog.Portal>
        {/* Overlay with subtle blur */}
        <AlertDialog.Overlay className="delete-dialog-overlay" />
        
        {/* Dialog content - centered, clean design */}
        <AlertDialog.Content className="delete-dialog-content">
          {/* Title - clear but not alarming */}
          <AlertDialog.Title className="delete-dialog-title">
            Remove customer?
          </AlertDialog.Title>
          
          {/* Description - specific about what happens */}
          <AlertDialog.Description className="delete-dialog-description">
            This will remove <span className="customer-name-highlight">{customerName}</span> from 
            your active customers. The record will be archived and can be restored later if needed.
          </AlertDialog.Description>

          {/* Actions - cancel on left (safe), confirm on right (destructive) */}
          <div className="delete-dialog-actions">
            <AlertDialog.Cancel asChild>
              <button className="delete-dialog-cancel" disabled={isDeleting}>
                Cancel
              </button>
            </AlertDialog.Cancel>
            
            <AlertDialog.Action asChild>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onConfirm();
                }}
                disabled={isDeleting}
                className="delete-dialog-confirm"
              >
                {isDeleting ? (
                  <span className="delete-dialog-loading">
                    <LoadingSpinner />
                    Removing...
                  </span>
                ) : (
                  'Remove customer'
                )}
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
};

/**
 * Simple loading spinner component
 */
const LoadingSpinner = () => (
  <svg
    className="delete-dialog-spinner"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="spinner-track"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="spinner-head"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

export default DeleteConfirmationDialog;
