import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Icon from '../../components/atoms/Icon/Icon';
import { buildApiUrl } from '../../config/api';
import './MobileSignupPage.css';

const MobileSignupPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    organizationName: '',
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (field) => (e) => {
    setFormData({ ...formData, [field]: e.target.value });
    if (errors[field]) setErrors({ ...errors, [field]: '' });
    if (serverError) setServerError('');
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Name is required';
    if (!formData.organizationName.trim()) newErrors.organizationName = 'Shop name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Min 8 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setServerError('');
    try {
      const response = await fetch(buildApiUrl('/auth/signup'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationName: formData.organizationName,
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message || `Signup failed`);
      }

      localStorage.setItem('organizationName', formData.organizationName);
      localStorage.setItem('userEmail', formData.email);
      navigate('/login', { replace: true });
    } catch (err) {
      setServerError(err.message || 'Unable to create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mobile-signup-container">
      {/* Animated Background Blobs (Same as Login) */}
      <div className="blob-bg">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      <div className="signup-content">
        <header className="signup-header">
          <div className="signup-logo">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 5L35 30H5L20 5Z" fill="var(--color-primary)" />
              <path d="M20 12L30 28H10L20 12Z" fill="white" fillOpacity="0.3" />
            </svg>
          </div>
          <h1>Join Aurum</h1>
          <p>Digitize your jewellery business today</p>
        </header>

        <main className="signup-card glass-panel">
          <form className="signup-form" onSubmit={handleSubmit}>
            {serverError && <div className="error-alert">{serverError}</div>}

            <div className="input-field">
              <label>Full Name</label>
              <div className="input-wrapper">
                <Icon name="user" size={18} color="var(--text-tertiary)" />
                <input
                  type="text"
                  placeholder="Ex. Rajesh Kumar"
                  value={formData.fullName}
                  onChange={handleChange('fullName')}
                  required
                />
              </div>
              {errors.fullName && <span className="field-error">{errors.fullName}</span>}
            </div>

            <div className="input-field">
              <label>Shop/Organization Name</label>
              <div className="input-wrapper">
                <Icon name="product" size={18} color="var(--text-tertiary)" />
                <input
                  type="text"
                  placeholder="Ex. Kumar Jewellers"
                  value={formData.organizationName}
                  onChange={handleChange('organizationName')}
                  required
                />
              </div>
              {errors.organizationName && <span className="field-error">{errors.organizationName}</span>}
            </div>

            <div className="input-field">
              <label>Email Address</label>
              <div className="input-wrapper">
                <Icon name="email" size={18} color="var(--text-tertiary)" />
                <input
                  type="email"
                  placeholder="rajesh@example.com"
                  value={formData.email}
                  onChange={handleChange('email')}
                  required
                />
              </div>
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>

            <div className="input-field">
              <label>Create Password</label>
              <div className="input-wrapper">
                <Icon name="lock" size={18} color="var(--text-tertiary)" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  value={formData.password}
                  onChange={handleChange('password')}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} />
                </button>
              </div>
              {errors.password && <span className="field-error">{errors.password}</span>}
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Creating Account...' : 'Get Started'}
            </button>
          </form>

          <div className="signup-footer">
            <p>Already have an account? <Link to="/login">Log in</Link></p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default MobileSignupPage;
