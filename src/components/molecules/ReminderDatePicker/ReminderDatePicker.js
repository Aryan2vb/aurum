import React, { useState, useRef, useEffect } from 'react';
import './ReminderDatePicker.css';

/**
 * ReminderDatePicker - Inline date picker with preset options
 * Attio-style minimal, calm design with optimistic UI
 */
const ReminderDatePicker = ({
    currentDate,
    onDateChange,
    disabled = false,
    className = '',
    ...props
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showCalendar, setShowCalendar] = useState(false);
    const [selectedPreset, setSelectedPreset] = useState(null);
    const containerRef = useRef(null);

    // Preset options
    const presets = [
        { label: 'Tomorrow', days: 1 },
        { label: '3 days', days: 3 },
        { label: '7 days', days: 7 },
    ];

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsExpanded(false);
                setShowCalendar(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const formatDisplayDate = (date) => {
        if (!date) return 'No reminder set';
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        if (isNaN(dateObj.getTime())) return 'Invalid date';

        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const targetDate = new Date(dateObj);
        targetDate.setHours(0, 0, 0, 0);

        const diffDays = Math.round((targetDate - now) / (1000 * 60 * 60 * 24));

        const options = { month: 'short', day: 'numeric' };
        const formattedDate = dateObj.toLocaleDateString('en-IN', options);

        if (diffDays === 0) return `${formattedDate} · today`;
        if (diffDays === 1) return `${formattedDate} · tomorrow`;
        if (diffDays === -1) return `${formattedDate} · yesterday`;
        if (diffDays > 0) return `${formattedDate} · in ${diffDays} days`;
        return `${formattedDate} · ${Math.abs(diffDays)} days ago`;
    };

    const handlePresetClick = (days) => {
        const newDate = new Date();
        newDate.setDate(newDate.getDate() + days);
        newDate.setHours(9, 0, 0, 0); // Set to 9 AM

        setSelectedPreset(days);
        setIsExpanded(false);
        setShowCalendar(false);

        if (onDateChange) {
            onDateChange(newDate, days);
        }
    };

    const handleCustomDateChange = (e) => {
        const newDate = new Date(e.target.value);
        if (!isNaN(newDate.getTime())) {
            setSelectedPreset(null);
            setShowCalendar(false);
            setIsExpanded(false);

            if (onDateChange) {
                onDateChange(newDate, null);
            }
        }
    };

    const getTodayString = () => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    };

    return (
        <div
            ref={containerRef}
            className={`reminder-date-picker ${isExpanded ? 'expanded' : ''} ${disabled ? 'disabled' : ''} ${className}`}
            {...props}
        >
            {/* Display current date - clickable to expand */}
            <button
                type="button"
                className="reminder-date-picker-trigger"
                onClick={() => !disabled && setIsExpanded(!isExpanded)}
                disabled={disabled}
            >
                <span className="reminder-date-picker-label">Next follow-up</span>
                <span className="reminder-date-picker-value">
                    {formatDisplayDate(currentDate)}
                </span>
                <span className="reminder-date-picker-icon">
                    {isExpanded ? '−' : '+'}
                </span>
            </button>

            {/* Expanded preset options */}
            {isExpanded && (
                <div className="reminder-date-picker-options">
                    <div className="reminder-date-picker-presets">
                        {presets.map((preset) => (
                            <button
                                key={preset.days}
                                type="button"
                                className={`reminder-date-picker-preset ${selectedPreset === preset.days ? 'active' : ''}`}
                                onClick={() => handlePresetClick(preset.days)}
                            >
                                {preset.label}
                            </button>
                        ))}
                        <button
                            type="button"
                            className={`reminder-date-picker-preset custom ${showCalendar ? 'active' : ''}`}
                            onClick={() => setShowCalendar(!showCalendar)}
                        >
                            Custom
                        </button>
                    </div>

                    {/* Custom date calendar */}
                    {showCalendar && (
                        <div className="reminder-date-picker-calendar">
                            <input
                                type="date"
                                min={getTodayString()}
                                onChange={handleCustomDateChange}
                                className="reminder-date-picker-input"
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ReminderDatePicker;
