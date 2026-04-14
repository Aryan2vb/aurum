import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../../atoms/Icon/Icon';
import { recordPayment } from '../../../services/invoicesService';
import styles from './RecordPaymentModal.module.css';

const RecordPaymentModal = ({ isOpen, onClose, invoice, onRefresh }) => {
  const [amount, setAmount] = useState(0);
  const [mode, setMode] = useState('UPI');
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');

  React.useEffect(() => {
    if (isOpen && invoice) {
      setAmount(invoice.remainingBalance || 0);
      setMode('UPI');
      setNotes('');
    }
  }, [isOpen, invoice]);

  if (!isOpen || !invoice) return null;

  const handleRecord = async () => {
    if (amount <= 0) {
      alert('Amount must be greater than zero');
      return;
    }
    if (amount > invoice.remainingBalance) {
      alert('Amount cannot exceed remaining balance');
      return;
    }

    try {
      setLoading(true);
      await recordPayment(invoice.id, { 
        amount, 
        paymentMethod: mode,
        notes: notes || `Payment for invoice ${invoice.invoiceNumber}`
      });
      onRefresh();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>Record Payment</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </div>
        
        <div className={styles.body}>
          <div className={styles.invoiceSummary}>
            <div className={styles.summaryItem}>
              <label>Invoice No.</label>
              <span>{invoice.invoiceNumber || '—'}</span>
            </div>
            <div className={styles.summaryItem}>
              <label>Total Amount</label>
              <span>₹{invoice.totalAmount.toLocaleString()}</span>
            </div>
            <div className={styles.summaryItem}>
              <label>Remaining Balance</label>
              <span className={styles.balance}>₹{invoice.remainingBalance.toLocaleString()}</span>
            </div>
          </div>

          <div className={styles.form}>
            <div className={styles.inputGroup}>
              <label>Payment Amount ₹</label>
              <input 
                type="number" 
                value={amount} 
                onChange={e => setAmount(parseFloat(e.target.value) || 0)} 
                max={invoice.remainingBalance}
                step="0.01"
                autoFocus
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Payment Mode</label>
              <select value={mode} onChange={e => setMode(e.target.value)}>
                <option value="UPI">UPI</option>
                <option value="CASH">CASH</option>
                <option value="BANK_TRANSFER">BANK TRANSFER</option>
                <option value="CHEQUE">CHEQUE</option>
                <option value="CARD">CARD</option>
                <option value="OLD_GOLD">OLD GOLD</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>

            <div className={styles.inputGroup}>
              <label>Notes</label>
              <textarea 
                value={notes} 
                onChange={e => setNotes(e.target.value)}
                placeholder="Optional payment notes..."
              />
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button 
            className={styles.recordBtn} 
            onClick={handleRecord}
            disabled={loading || amount <= 0}
          >
            {loading ? 'Recording...' : 'Record Payment'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default RecordPaymentModal;
