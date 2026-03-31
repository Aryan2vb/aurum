import React from 'react';
import './AuthTemplate.css';

const AuthTemplate = ({
  children,
  mediaSrc,
  mediaAlt = 'Aurum financial dashboard background',
  minimal = false,
}) => (
  <div className={`auth-layout ${minimal ? 'auth-layout--minimal' : ''}`}>
    {/* Mobile brand strip */}
    {!minimal && (
      <header className="auth-layout__brand">
        <div className="auth-brand-logo" aria-hidden="true">
          <svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 2 L18 16 H2 Z" />
          </svg>
        </div>
      </header>
    )}

    {/* Hero image — full bleed on mobile, sidebar on desktop */}
    {!minimal && mediaSrc && (
      <div className="auth-layout__hero">
        <img src={mediaSrc} alt={mediaAlt} loading="lazy" />
      </div>
    )}

    {/* Form panel */}
    <div className={`auth-layout__panel ${minimal ? 'auth-layout__panel--minimal' : ''}`}>
      <div className="auth-panel">
        {minimal && (
          <div className="auth-panel__logo">
            <div className="auth-brand-logo">
              <svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 2 L18 16 H2 Z" />
              </svg>
            </div>
          </div>
        )}
        {children}
      </div>
    </div>
  </div>
);

export default AuthTemplate;
