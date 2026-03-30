import React from 'react';
import AmountDisplay from '../../atoms/AmountDisplay/AmountDisplay';
import './ImpactPreview.css';

/**
 * ImpactPreview - Shows consequence preview when reminder date changes
 * Displays expected credits and collectible amount for the selected date
 */
const ImpactPreview = ({
    daysFromNow,
    creditsCount = 1,
    totalAmount = 0,
    isLoading = false,
    isVisible = true,
    className = '',
    ...props
}) => {
    if (!isVisible) return null;

    const getRelativeLabel = () => {
        if (daysFromNow === 1) return 'tomorrow';
        if (daysFromNow <= 7) return `in ${daysFromNow} days`;
        return `in ${daysFromNow} days`;
    };

    return (
        <div className={`impact-preview ${isLoading ? 'loading' : ''} ${className}`} {...props}>
            <div className="impact-preview-header">
                <span className="impact-preview-icon">💡</span>
                <span className="impact-preview-title">
                    If you follow up {getRelativeLabel()}:
                </span>
            </div>

            <div className="impact-preview-details">
                {isLoading ? (
                    <div className="impact-preview-skeleton">
                        <div className="skeleton-line"></div>
                        <div className="skeleton-line short"></div>
                    </div>
                ) : (
                    <ul className="impact-preview-list">
                        <li className="impact-preview-item">
                            <span className="impact-preview-bullet">•</span>
                            <span>{creditsCount} credit{creditsCount !== 1 ? 's' : ''} expected</span>
                        </li>
                        <li className="impact-preview-item">
                            <span className="impact-preview-bullet">•</span>
                            <span>
                                <AmountDisplay value={totalAmount} size="sm" /> potentially collectible
                            </span>
                        </li>
                    </ul>
                )}
            </div>
        </div>
    );
};

export default ImpactPreview;
