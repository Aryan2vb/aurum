import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { whoami, clearSession } from '../../services/authService';
import { useAccessPolicy, moduleForAppPath } from '../../contexts/AccessPolicyContext';

let lastValidatedToken = null;
let validatePromise = null;

const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('authToken');
  const userRole = localStorage.getItem('userRole');
  const location = useLocation();
  const { setFromWhoami, canAccessModule } = useAccessPolicy();
  const [status, setStatus] = useState(token ? 'checking' : 'no-token');

  useEffect(() => {
    let cancelled = false;

    const validateSession = async () => {
      if (!token) {
        lastValidatedToken = null;
        validatePromise = null;
        setStatus('no-token');
        return;
      }

      if (token !== lastValidatedToken || !validatePromise) {
        lastValidatedToken = token;
        validatePromise = whoami();
      }

      try {
        const payload = await validatePromise;
        if (!cancelled) {
          setFromWhoami(payload);
          setStatus('ok');
        }
      } catch (error) {
        if (error.status === 401 || error.code === 'ACCESS_WINDOW_CLOSED') {
          clearSession();
          lastValidatedToken = null;
          validatePromise = null;
          if (!cancelled) setStatus('no-token');
          return;
        }

        if (process.env.NODE_ENV !== 'production') {
          console.error('Session validation failed', error);
        }
        if (!cancelled) setStatus('ok');
      }
    };

    validateSession();

    return () => {
      cancelled = true;
    };
  }, [token, setFromWhoami]);

  if (status === 'no-token') {
    return <Navigate to="/login" replace />;
  }

  if (status === 'checking') {
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/invoices" replace />;
  }

  const moduleKey = moduleForAppPath(location.pathname);
  if (moduleKey && !canAccessModule(moduleKey)) {
    const fallbacks = [
      '/invoices',
      '/customers',
      '/credits',
      '/reports',
      '/stock',
      '/purchases',
      '/books',
      '/advance',
      '/settings',
    ];
    const dest =
      fallbacks.find((path) => {
        const mod = moduleForAppPath(path);
        return !mod || canAccessModule(mod);
      }) || '/settings';
    if (dest === location.pathname) return children;
    return <Navigate to={dest} replace />;
  }

  return children;
};

export default ProtectedRoute;
