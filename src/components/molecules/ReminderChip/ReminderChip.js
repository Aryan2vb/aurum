import React, { useState, useCallback } from 'react';
import ContactIcon from '../../atoms/ContactIcon/ContactIcon';
import AmountDisplay from '../../atoms/AmountDisplay/AmountDisplay';
import Button from '../../atoms/Button/Button';
import ReminderDatePicker from '../ReminderDatePicker/ReminderDatePicker';
import ImpactPreview from '../ImpactPreview/ImpactPreview';
import { generateWhatsAppUrl, getReminderImpact } from '../../../services/creditsService';
import './ReminderChip.css';

/**
 * ReminderChip - Enhanced reminder card with Attio-style UX
 * Features: Inline date controls, impact preview, WhatsApp action, auto-save
 */
const ReminderChip = ({
  reminder,
  onContact,
  onRecordPayment,
  onMarkDone,
  onReminderUpdate,
  className = '',
  ...props
}) => {
  const {
    creditId,
    customer,
    remainingAmount,
    remainingBalance,
    expectedDueDate,
    daysOverdue,
    nextReminderDate,
  } = reminder;

  const [showImpact, setShowImpact] = useState(false);
  const [impactData, setImpactData] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const amount = remainingAmount || remainingBalance || 0;
  const isOverdue = daysOverdue && daysOverdue > 0;

  // Handle date change with optimistic UI
  const handleDateChange = useCallback(async (newDate, daysPreset) => {
    setIsUpdating(true);

    // Calculate impact preview
    const impact = getReminderImpact(newDate, [reminder]);
    setImpactData({
      ...impact,
      totalAmount: amount,
      creditsCount: 1,
    });
    setShowImpact(true);

    // Trigger the update callback
    if (onReminderUpdate) {
      const previousDate = nextReminderDate;
      await onReminderUpdate(creditId, newDate, previousDate);
    }

    setIsUpdating(false);
  }, [creditId, nextReminderDate, onReminderUpdate, amount, reminder]);

  // Handle WhatsApp action
  const handleWhatsApp = useCallback(() => {
    const url = generateWhatsAppUrl(reminder);
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [reminder]);

  // Get phone number for display
  const phoneNumber = customer?.phone || customer?.contactDetails?.[0]?.primaryPhone;

  return (
    <div
      className={`reminder-chip ${isOverdue ? 'reminder-chip-overdue' : ''} ${isUpdating ? 'updating' : ''} ${className}`}
      {...props}
    >
      {/* Header: Customer name + Amount */}
      <div className="reminder-chip-header">
        <div className="reminder-chip-customer">
          <span className="reminder-chip-name">{customer?.name || customer?.fullName}</span>
          {phoneNumber && (
            <ContactIcon
              method={customer?.preferredMethod || 'CALL'}
              size="sm"
              clickable
              phoneNumber={phoneNumber}
              onClick={onContact}
            />
          )}
        </div>
        <AmountDisplay
          value={amount}
          size="md"
          emphasis
          variant={isOverdue ? 'negative' : 'default'}
        />
      </div>

      {/* Reminder Summary */}
      <div className="reminder-chip-summary">
        <ReminderDatePicker
          currentDate={nextReminderDate || expectedDueDate}
          onDateChange={handleDateChange}
          disabled={isUpdating}
        />

        <div className="reminder-chip-expected">
          <span className="reminder-chip-expected-label">Expected amount</span>
          <span className="reminder-chip-expected-value">
            <AmountDisplay value={amount} size="sm" /> from 1 credit
          </span>
        </div>
      </div>

      {/* Impact Preview - shows after date change */}
      {showImpact && impactData && (
        <ImpactPreview
          daysFromNow={impactData.daysFromNow}
          creditsCount={impactData.creditsCount}
          totalAmount={impactData.totalAmount}
          isLoading={isUpdating}
        />
      )}

      {/* Due status indicator */}
      {isOverdue && (
        <div className="reminder-chip-due reminder-chip-overdue-text">
          Overdue by {daysOverdue} day{daysOverdue > 1 ? 's' : ''}
        </div>
      )}

      {/* Actions row */}
      <div className="reminder-chip-actions">
        <Button
          variant="ghost"
          size="small"
          onClick={handleWhatsApp}
          className="reminder-chip-whatsapp"
        >
          <span className="whatsapp-icon">💬</span>
          WhatsApp
        </Button>

        {onRecordPayment && (
          <Button
            variant="primary"
            size="small"
            onClick={() => onRecordPayment(reminder)}
          >
            Record Payment
          </Button>
        )}

        {onMarkDone && (
          <Button
            variant="ghost"
            size="small"
            onClick={() => onMarkDone(reminder)}
          >
            Done
          </Button>
        )}
      </div>
    </div>
  );
};

export default ReminderChip;
