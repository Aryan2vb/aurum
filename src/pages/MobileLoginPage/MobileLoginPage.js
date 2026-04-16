import React from 'react';
import './MobileLoginPage.css';

const MobileLoginPage = () => {
  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle login logic
  };

  return (
    <div className="mobile-login">
      <div className="mobile-login__header">
        <div className="mobile-login__logo">
          <svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 2 L18 16 H2 Z" />
          </svg>
        </div>
        <h1 className="mobile-login__brand">Aurum</h1>
        <p className="mobile-login__tagline">Welcome back</p>
      </div>

      <form className="mobile-login__form" onSubmit={handleSubmit}>
        <div className="mobile-form-group">
          <label className="mobile-form-label">Email</label>
          <input
            type="email"
            className="mobile-form-input"
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>

        <div className="mobile-form-group">
          <label className="mobile-form-label">Password</label>
          <input
            type="password"
            className="mobile-form-input"
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>

        <button type="submit" className="mobile-login__button">
          Sign In
        </button>
      </form>

      <p className="mobile-login__signup">
        Don't have an account? <a href="/signup">Sign Up</a>
      </p>
    </div>
  );
};

export default MobileLoginPage;