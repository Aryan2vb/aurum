import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { whoami, clearSession } from '../../services/authService';

let lastValidatedToken = null;
let validatePromise = null;

const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('authToken');
  const userRole = localStorage.getItem('userRole');
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
        await validatePromise;
        if (!cancelled) {
          setStatus('ok');
        }
      } catch (error) {
        if (error.status === 401 || error.status === 403) {
          clearSession();
          lastValidatedToken = null;
          validatePromise = null;
          if (!cancelled) {
            setStatus('no-token');
          }
          return;
        }

        // For non-auth errors, allow access but log in dev.
        if (process.env.NODE_ENV !== 'production') {
          console.error('Session validation failed', error);
        }
        if (!cancelled) {
          setStatus('ok');
        }
      }
    };

    validateSession();

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (status === 'no-token') {
    return <Navigate to="/login" replace />;
  }

  if (status === 'checking') {
    return null;
  }

  // Role check
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/invoices" replace />;
  }

  return children;
};

export default ProtectedRoute;

