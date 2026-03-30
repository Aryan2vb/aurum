import React from 'react';
import './InspectorSkeleton.css';

/**
 * InspectorSkeleton - Skeleton loading state for the Customer Inspector Panel
 * 
 * UX Philosophy:
 * - Skeleton must match final layout EXACTLY to prevent layout shift
 * - Use subtle shimmer animation (not jarring pulse)
 * - Load order: Header → Primary fields → Secondary sections
 * - Creates perception of speed even on slow connections
 * 
 * Following patterns from: Linear, Notion, Stripe
 */
const InspectorSkeleton = ({ mode = 'view' }) => {
  const isCreateMode = mode === 'create';

  return (
    <div className="inspector-skeleton">
      {/* ============================================ */}
      {/* HEADER SKELETON                             */}
      {/* ============================================ */}
      <div className="skeleton-header">
        <div className="skeleton-header-top">
          <div className="skeleton-identity">
            {/* Name placeholder - wider for create mode title */}
            <div className={`skeleton-bar skeleton-name ${isCreateMode ? 'create-title' : ''}`} />
            {/* Customer code - only in view mode */}
            {!isCreateMode && <div className="skeleton-bar skeleton-code" />}
          </div>
          
          {/* Status pill - only in view mode */}
          {!isCreateMode && <div className="skeleton-bar skeleton-status" />}
          
          {/* Action button placeholder */}
          <div className="skeleton-bar skeleton-action" />
        </div>
        
        {/* Meta line - only in view mode */}
        {!isCreateMode && (
          <div className="skeleton-meta">
            <div className="skeleton-bar skeleton-meta-item" />
            <div className="skeleton-bar skeleton-meta-item short" />
            <div className="skeleton-bar skeleton-meta-item" />
          </div>
        )}
      </div>

      {/* ============================================ */}
      {/* CONTENT SKELETON                            */}
      {/* ============================================ */}
      <div className="skeleton-content">
        {/* Primary Section - Personal */}
        <div className="skeleton-section">
          <div className="skeleton-bar skeleton-section-title" />
          <div className="skeleton-fields">
            <SkeletonField />
            <SkeletonField />
            <SkeletonField short />
            {!isCreateMode && <SkeletonField />}
          </div>
        </div>

        <div className="skeleton-divider" />

        {/* Contact Section */}
        <div className="skeleton-section">
          <div className="skeleton-bar skeleton-section-title" />
          <div className="skeleton-fields">
            <SkeletonField />
            {!isCreateMode && <SkeletonField short />}
          </div>
        </div>

        <div className="skeleton-divider" />

        {/* Location Section */}
        <div className="skeleton-section">
          <div className="skeleton-bar skeleton-section-title" />
          <div className="skeleton-fields">
            <SkeletonField />
            <SkeletonField short />
          </div>
        </div>

        {/* Additional sections - only in view mode */}
        {!isCreateMode && (
          <>
            <div className="skeleton-divider" />
            
            {/* Account Section */}
            <div className="skeleton-section">
              <div className="skeleton-bar skeleton-section-title" />
              <div className="skeleton-fields">
                <SkeletonField />
                <SkeletonField short />
              </div>
            </div>

            <div className="skeleton-divider" />

            {/* Collapsed sections indicator */}
            <div className="skeleton-collapsed">
              <div className="skeleton-bar skeleton-accordion" />
              <div className="skeleton-bar skeleton-accordion" />
              <div className="skeleton-bar skeleton-accordion" />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/**
 * Individual field skeleton - mimics the property row layout
 */
const SkeletonField = ({ short = false }) => (
  <div className="skeleton-field">
    <div className="skeleton-bar skeleton-label" />
    <div className={`skeleton-bar skeleton-value ${short ? 'short' : ''}`} />
  </div>
);

export default InspectorSkeleton;
