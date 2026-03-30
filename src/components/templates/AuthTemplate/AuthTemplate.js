import React from 'react';
import './AuthTemplate.css';

const DEFAULT_MEDIA =
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80';

const AuthTemplate = ({
  children,
  mediaSrc = DEFAULT_MEDIA,
  mediaAlt = 'Aurum financial dashboard background',
}) => (
  <div className="auth-layout">
    {/* Mobile brand strip */}
    <header className="auth-layout__brand">
      <div className="auth-brand-logo" aria-hidden="true">
        <svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 2 L18 16 H2 Z" />
        </svg>
      </div>
      <span className="auth-brand-name">
        Au<span>rum</span>
      </span>
    </header>

    {/* Hero image — full bleed on mobile, sidebar on desktop */}
    <div className="auth-layout__hero">
      <img src={mediaSrc} alt={mediaAlt} loading="lazy" />
    </div>

    {/* Form panel */}
    <div className="auth-layout__panel">
      <div className="auth-panel">
        {children}
      </div>
    </div>
  </div>
);

export default AuthTemplate;
