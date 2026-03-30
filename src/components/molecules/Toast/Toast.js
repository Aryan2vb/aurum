import React, { useState, useEffect, useCallback } from 'react';
import './Toast.css';

/**
 * Toast - Lightweight feedback component with undo action
 * Auto-dismisses after timeout, supports undo callback
 */
const Toast = ({
    message,
    undoLabel = 'Undo',
    onUndo,
    duration = 5000,
    isVisible = false,
    onDismiss,
    variant = 'success',
    className = '',
    ...props
}) => {
    const [isShowing, setIsShowing] = useState(false);
    const [progress, setProgress] = useState(100);

    const handleDismiss = useCallback(() => {
        setIsShowing(false);
        setTimeout(() => {
            if (onDismiss) onDismiss();
        }, 200); // Wait for exit animation
    }, [onDismiss]);

    useEffect(() => {
        if (isVisible) {
            setIsShowing(true);
            setProgress(100);

            // Progress animation
            const startTime = Date.now();
            const interval = setInterval(() => {
                const elapsed = Date.now() - startTime;
                const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
                setProgress(remaining);

                if (remaining <= 0) {
                    clearInterval(interval);
                }
            }, 50);

            // Auto dismiss
            const timeout = setTimeout(() => {
                handleDismiss();
            }, duration);

            return () => {
                clearInterval(interval);
                clearTimeout(timeout);
            };
        } else {
            setIsShowing(false);
        }
    }, [isVisible, duration, handleDismiss]);

    const handleUndo = () => {
        if (onUndo) onUndo();
        handleDismiss();
    };

    if (!isShowing && !isVisible) return null;

    return (
        <div
            className={`toast toast-${variant} ${isShowing ? 'show' : 'hide'} ${className}`}
            {...props}
        >
            <div className="toast-content">
                <span className="toast-icon">
                    {variant === 'success' && '✓'}
                    {variant === 'error' && '✕'}
                    {variant === 'info' && 'ℹ'}
                </span>
                <span className="toast-message">{message}</span>

                {onUndo && (
                    <>
                        <span className="toast-separator">·</span>
                        <button
                            type="button"
                            className="toast-undo"
                            onClick={handleUndo}
                        >
                            {undoLabel}
                        </button>
                    </>
                )}

                <button
                    type="button"
                    className="toast-close"
                    onClick={handleDismiss}
                    aria-label="Dismiss"
                >
                    ×
                </button>
            </div>

            <div className="toast-progress">
                <div
                    className="toast-progress-bar"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
};

export default Toast;
