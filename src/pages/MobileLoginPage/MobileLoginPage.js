import React from 'react';
import './MobileLoginPage.css';

const MobileLoginPage = () => {
  const handleSubmit = (e) => {
    e.preventDefault();
    window.location.href = '/dashboard';
  };

  return (
    <div className="mobile-login">
      <div className="login-background-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      <div className="mobile-login__container">
        <header className="mobile-login__header">
          <div className="mobile-login__logo-wrapper">
            <div className="mobile-login__logo">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/>
              </svg>
            </div>
          </div>
          <h1 className="mobile-login__brand">Aurum</h1>
          <p className="mobile-login__tagline">Manage your Udhar with elegance</p>
        </header>

        <form className="mobile-login__form" onSubmit={handleSubmit}>
          <div className="mobile-form-group">
            <label className="mobile-form-label">Email Address</label>
            <div className="mobile-input-wrapper">
              <input
                type="email"
                className="mobile-form-input"
                placeholder="name@company.com"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="mobile-form-group">
            <div className="label-row">
              <label className="mobile-form-label">Password</label>
              <a href="/forgot" className="forgot-link">Forgot?</a>
            </div>
            <div className="mobile-input-wrapper">
              <input
                type="password"
                className="mobile-form-input"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          <button type="submit" className="mobile-login__button">
            Sign In
          </button>
        </form>

        <footer className="mobile-login__footer">
          <p>Don't have an account? <a href="/signup">Create one</a></p>
        </footer>
      </div>
    </div>
  );
};

export default MobileLoginPage;


// export default MobileLoginPage;