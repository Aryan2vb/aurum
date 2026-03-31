import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import FormField from '../../molecules/FormField/FormField';
import Button from '../../atoms/Button/Button';
import Text from '../../atoms/Text/Text';
import Icon from '../../atoms/Icon/Icon';
import { login } from '../../../services/authService';
import '../AuthForms/AuthForms.css';

const LoginForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
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
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Enter a valid email address';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
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
      const { accessToken, ...rest } = await login({
        email: formData.email,
        password: formData.password,
      });
      if (!accessToken) throw new Error('Missing access token in response');
      localStorage.setItem('authToken', accessToken);
      localStorage.setItem('userEmail', formData.email);
      if (rest?.refreshToken) localStorage.setItem('refreshToken', rest.refreshToken);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setServerError(error?.message || 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form" noValidate>
      {/* ── Header ── */}
      <div className="auth-form__header">
        <Text variant="heading" weight="bold" className="auth-form__title">
          Welcome back
        </Text>
        <Text variant="body" className="auth-form__subtitle">
          Sign in to continue to Aurum
        </Text>
        <div className="auth-tabs">
          <Link to="/signup" className="auth-tabs__btn">Sign up</Link>
          <Link to="/login" className="auth-tabs__btn active">Log in</Link>
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
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          value={formData.email}
          onChange={handleChange('email')}
          error={errors.email}
          required
          id="login-email"
          icon={<Icon name="email" size={17} />}
          autoComplete="email"
          inputMode="email"
        />

        {/* Password field with show/hide toggle */}
        <div className="form-field">
          <label className="form-label" htmlFor="login-password">
            <Text variant="body" weight="medium">Password</Text>
            <span className="required">*</span>
          </label>
          <div className="password-field-wrapper">
            <div className={`input-wrapper input-wrapper-with-icon ${errors.password ? 'input-error' : ''}`}>
              <span className="input-icon">
                <Icon name="lock" size={17} />
              </span>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={formData.password}
                onChange={handleChange('password')}
                className="input"
                autoComplete="current-password"
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

      {/* ── Forgot password ── */}
      <div className="auth-form__actions">
        <Link to="/forgot-password" className="forgot-link">
          Forgot password?
        </Link>
      </div>

      {/* ── Submit ── */}
      <Button
        type="submit"
        variant="primary"
        size="large"
        className="auth-form__submit auth-form__submit--primary"
        disabled={loading}
      >
        {loading ? 'Signing in…' : 'Sign in'}
        {!loading && <Icon name="arrowRight" size={17} color="#0F0F0F" />}
      </Button>

      <p className="auth-form__footer-text">
        Don't have an account?{' '}
        <Link to="/signup" className="link">Sign up free</Link>
      </p>
    </form>
  );
};

export default LoginForm;
