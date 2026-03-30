import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import FormField from '../../molecules/FormField/FormField';
import Button from '../../atoms/Button/Button';
import Text from '../../atoms/Text/Text';
import Icon from '../../atoms/Icon/Icon';
import { buildApiUrl } from '../../../config/api';
import '../AuthForms/AuthForms.css';

const SignupForm = () => {
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
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.organizationName.trim()) newErrors.organizationName = 'Organization name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Enter a valid email address';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Must be at least 8 characters';
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
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('organizationName');
          navigate('/login', { replace: true });
          return;
        }
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message || `Signup failed (${response.status})`);
      }

      localStorage.setItem('organizationName', formData.organizationName);
      localStorage.setItem('userEmail', formData.email);
      navigate('/login', { replace: true });
    } catch (err) {
      setServerError(err.message || 'Unable to create account right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form" noValidate>
      {/* ── Header ── */}
      <div className="auth-form__header">
        <Text variant="heading" weight="bold" className="auth-form__title">
          Create your account
        </Text>
        <Text variant="body" className="auth-form__subtitle">
          30-day free trial · No credit card needed
        </Text>
        <div className="auth-tabs">
          <Link to="/signup" className="auth-tabs__btn active">Sign up</Link>
          <Link to="/login" className="auth-tabs__btn">Log in</Link>
        </div>
      </div>

      {/* ── Server error ── */}
      {serverError && (
        <div className="server-error" role="alert">
          <Icon name="close" size={14} color="var(--error)" />
          <span>{serverError}</span>
        </div>
      )}

      {/* ── Fields ── */}
      <div className="auth-form__stack">
        <FormField
          label="Full name"
          type="text"
          placeholder="Aryan Soni"
          value={formData.fullName}
          onChange={handleChange('fullName')}
          error={errors.fullName}
          required
          id="signup-fullname"
          icon={<Icon name="user" size={17} />}
          autoComplete="name"
        />

        <FormField
          label="Organization name"
          type="text"
          placeholder="Your workspace or company"
          value={formData.organizationName}
          onChange={handleChange('organizationName')}
          error={errors.organizationName}
          required
          id="signup-org"
          icon={<Icon name="product" size={17} />}
          autoComplete="organization"
        />

        <FormField
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={formData.email}
          onChange={handleChange('email')}
          error={errors.email}
          required
          id="signup-email"
          icon={<Icon name="email" size={17} />}
          autoComplete="email"
          inputMode="email"
        />

        {/* Password field with show/hide toggle */}
        <div className="form-field">
          <label className="form-label" htmlFor="signup-password">
            <Text variant="body" weight="medium">Password</Text>
            <span className="required">*</span>
          </label>
          <div className="password-field-wrapper">
            <div className={`input-wrapper input-wrapper-with-icon ${errors.password ? 'input-error' : ''}`}>
              <span className="input-icon">
                <Icon name="lock" size={17} />
              </span>
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a password (8+ chars)"
                value={formData.password}
                onChange={handleChange('password')}
                className="input"
                autoComplete="new-password"
                required
              />
            </div>
            <button
              type="button"
              className="password-toggle-btn"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((prev) => !prev)}
              tabIndex={0}
            >
              <Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} />
            </button>
          </div>
          {errors.password && (
            <Text variant="small" color="#ef4444" className="error-message">
              {errors.password}
            </Text>
          )}
        </div>
      </div>

      {/* ── Submit ── */}
      <Button
        type="submit"
        variant="primary"
        size="large"
        className="auth-form__submit auth-form__submit--primary"
        disabled={loading}
      >
        {loading ? 'Creating account…' : 'Create account'}
        {!loading && <Icon name="arrowRight" size={17} color="#0F0F0F" />}
      </Button>

      <p className="auth-form__footer-text">
        By signing up you agree to our{' '}
        <Link to="/terms" className="link">Terms</Link>
        {' & '}
        <Link to="/privacy" className="link">Privacy Policy</Link>.
      </p>

      <p className="auth-form__footer-text">
        Already have an account?{' '}
        <Link to="/login" className="link">Log in</Link>
      </p>
    </form>
  );
};

export default SignupForm;
