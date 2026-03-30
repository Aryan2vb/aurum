import React, { useState, useRef, useEffect, useCallback } from 'react';
import { generateWhatsAppUrl, getReminderImpact } from '../../../services/creditsService';
import AmountDisplay from '../../atoms/AmountDisplay/AmountDisplay';
import Icon from '../../atoms/Icon/Icon';
import './ReminderRow.css';

/**
 * ReminderRow - Attio-style minimal reminder line
 * 
 * Checklist compliance:
 * - One calm line, not a card
 * - "Next follow-up" with relative date
 * - "Expected amount affected" on secondary line
 * - Inline date controls (presets first, calendar optional)
 * - Impact preview inline (no box)
 * - Auto-save with "Updated · Undo"
 * - WhatsApp on same line
 * - No modals, minimal design
 */
const ReminderRow = ({
    reminder,
    onReminderUpdate,
    onRecordPayment,
    className = '',
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

    const [isExpanded, setIsExpanded] = useState(false);
    const [showImpact, setShowImpact] = useState(false);
    const [impactData, setImpactData] = useState(null);
    const [feedback, setFeedback] = useState(null);
    const [previousDate, setPreviousDate] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const containerRef = useRef(null);

    const amount = remainingAmount || remainingBalance || 0;
    const customerName = customer?.name || customer?.fullName || 'Customer';
    const phone = customer?.phone || customer?.contactDetails?.[0]?.primaryPhone;
    const isOverdue = daysOverdue && daysOverdue > 0;
    const currentReminderDate = nextReminderDate || expectedDueDate;

    // Preset options
    const presets = [
        { label: 'Tomorrow', days: 1 },
        { label: '3 days', days: 3 },
        { label: '7 days', days: 7 },
    ];

    // Format date with relative time (currently unused but kept for future use)
    // eslint-disable-next-line no-unused-vars
    const formatDate = useCallback((date) => {
        if (!date) return 'No date set';
        const d = new Date(date);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const target = new Date(d);
        target.setHours(0, 0, 0, 0);

        const diffDays = Math.round((target - now) / (1000 * 60 * 60 * 24));
        const formatted = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });

        if (diffDays === 0) return `${formatted} · today`;
        if (diffDays === 1) return `${formatted} · tomorrow`;
        if (diffDays === -1) return `${formatted} · yesterday`;
        if (diffDays > 0) return `${formatted} · in ${diffDays} days`;
        return `${formatted} · ${Math.abs(diffDays)} days ago`;
    }, []);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsExpanded(false);
                setShowImpact(false);
            }
        };

        if (isExpanded) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isExpanded]);

    // Handle preset selection
    const handlePreset = useCallback(async (days) => {
        const newDate = new Date();
        newDate.setDate(newDate.getDate() + days);
        newDate.setHours(9, 0, 0, 0);

        setPreviousDate(currentReminderDate);
        setIsExpanded(false);

        // Calculate impact immediately
        const impact = getReminderImpact(newDate, [reminder]);
        setImpactData({
            ...impact,
            totalAmount: amount,
            creditsCount: 1,
        });
        setShowImpact(true);

        // Auto-save with optimistic UI
        setIsUpdating(true);
        try {
            if (onReminderUpdate) {
                await onReminderUpdate(creditId, newDate, currentReminderDate);
            }
            setFeedback({ type: 'success', canUndo: true });
            // Hide impact and feedback after 5 seconds
            setTimeout(() => {
                setShowImpact(false);
                setFeedback(null);
            }, 5000);
        } catch (err) {
            setFeedback({ type: 'error', message: 'Failed to update' });
            // Revert impact preview on error
            setShowImpact(false);
        } finally {
            setIsUpdating(false);
        }
    }, [creditId, currentReminderDate, onReminderUpdate, amount, reminder]);

    // Handle custom date
    const handleCustomDate = useCallback(async (e) => {
        const newDate = new Date(e.target.value);
        if (isNaN(newDate.getTime())) return;

        setPreviousDate(currentReminderDate);
        setIsExpanded(false);

        // Calculate impact
        const impact = getReminderImpact(newDate, [reminder]);
        setImpactData({
            ...impact,
            totalAmount: amount,
            creditsCount: 1,
        });
        setShowImpact(true);

        // Auto-save
        setIsUpdating(true);
        try {
            if (onReminderUpdate) {
                await onReminderUpdate(creditId, newDate, currentReminderDate);
            }
            setFeedback({ type: 'success', canUndo: true });
            setTimeout(() => {
                setShowImpact(false);
                setFeedback(null);
            }, 5000);
        } catch (err) {
            setFeedback({ type: 'error', message: 'Failed' });
            setShowImpact(false);
        } finally {
            setIsUpdating(false);
        }
    }, [creditId, currentReminderDate, onReminderUpdate, amount, reminder]);

    // Handle undo
    const handleUndo = useCallback(async () => {
        if (previousDate && onReminderUpdate) {
            setIsUpdating(true);
            try {
                await onReminderUpdate(creditId, previousDate, currentReminderDate);
                setFeedback(null);
                setShowImpact(false);
            } catch (err) {
                setFeedback({ type: 'error', message: 'Failed to undo' });
            } finally {
                setIsUpdating(false);
            }
        }
    }, [creditId, previousDate, currentReminderDate, onReminderUpdate]);

    // Handle WhatsApp
    const handleWhatsApp = useCallback(() => {
        const url = generateWhatsAppUrl(reminder);
        window.open(url, '_blank', 'noopener,noreferrer');
    }, [reminder]);

    const getTodayString = () => new Date().toISOString().split('T')[0];

    return (
        <div
            ref={containerRef}
            className={`reminder-line ${isOverdue ? 'overdue' : ''} ${className}`}
        >
            {/* Main line - always visible */}
            <div className="reminder-line-main">
                {/* Left: Customer info */}
                <div className="reminder-line-left">
                    <span className="reminder-line-customer">{customerName}</span>
                </div>

                {/* Right: Reminder date and actions */}
                <div className="reminder-line-right">
                    {/* Reminder date group */}
                    {/* <div className="reminder-line-date-group">
                        <span className="reminder-line-label">Next follow-up</span>
                        <button
                            className="reminder-line-date"
                            onClick={() => setIsExpanded(!isExpanded)}
                            disabled={isUpdating}
                        >
                            {formatDate(currentReminderDate)}
                            <span className="reminder-line-change">
                                {isExpanded ? '×' : 'Change'}
                            </span>
                        </button>
                    </div> */}

                    {/* WhatsApp action - on same line */}
                    {phone && (
                        <button
                            className="reminder-line-whatsapp"
                            onClick={handleWhatsApp}
                            title="Send WhatsApp message"
                        >
                            <Icon name="whatsapp" size={16} />
                            Send Message on WhatsApp
                        </button>
                    )}

                    {/* Record payment action */}
                    {onRecordPayment && (
                        <button
                            className="reminder-line-record"
                            onClick={() => onRecordPayment(reminder)}
                        >
                            Record
                        </button>
                    )}
                </div>
            </div>

            {/* Secondary line: Expected amount affected */}
            <div className="reminder-line-secondary">
                <span className="reminder-line-secondary-label">Expected amount affected</span>
                <span className="reminder-line-secondary-value">
                    <AmountDisplay value={amount} size="sm" /> from 1 credit
                </span>
            </div>

            {/* Expanded presets - inline, no modal */}
            {isExpanded && (
                <div className="reminder-line-presets">
                    {presets.map((preset) => (
                        <button
                            key={preset.days}
                            className="reminder-line-preset"
                            onClick={() => handlePreset(preset.days)}
                            disabled={isUpdating}
                        >
                            {preset.label}
                        </button>
                    ))}
                    <label className="reminder-line-custom">
                        <input
                            type="date"
                            min={getTodayString()}
                            onChange={handleCustomDate}
                            className="reminder-line-date-input"
                            disabled={isUpdating}
                        />
                        <span>Custom date</span>
                    </label>
                </div>
            )}

            {/* Impact preview - inline, no box, normal text */}
            {showImpact && impactData && !isExpanded && (
                <div className="reminder-line-impact">
                    If you follow up in {impactData.daysFromNow} day{impactData.daysFromNow !== 1 ? 's' : ''}:{' '}
                    • {impactData.creditsCount} credit{impactData.creditsCount !== 1 ? 's' : ''} expected{' '}
                    • <AmountDisplay value={impactData.totalAmount} size="sm" /> potentially collectible
                </div>
            )}

            {/* Feedback: "Updated · Undo" */}
            {feedback && !isExpanded && (
                <div className="reminder-line-feedback">
                    {feedback.type === 'success' ? (
                        <>
                            Updated · <button className="reminder-line-undo" onClick={handleUndo}>Undo</button>
                        </>
                    ) : (
                        <span className="reminder-line-error">{feedback.message}</span>
                    )}
                </div>
            )}
        </div>
    );
};

export default ReminderRow;
