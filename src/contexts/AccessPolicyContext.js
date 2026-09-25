import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ALL_MODULES = {
  customers: true,
  credits: true,
  advance: true,
  invoices: true,
  stock: true,
  purchases: true,
  books: true,
  reports: true,
};

const AccessPolicyContext = createContext({
  modules: ALL_MODULES,
  setFromWhoami: () => {},
  canAccessModule: () => true,
});

export const AccessPolicyProvider = ({ children }) => {
  const [modules, setModules] = useState(() => {
    try {
      const raw = localStorage.getItem('accessModules');
      return raw ? { ...ALL_MODULES, ...JSON.parse(raw) } : ALL_MODULES;
    } catch {
      return ALL_MODULES;
    }
  });

  const setFromWhoami = useCallback((payload) => {
    const next = payload?.accessPolicy?.modules;
    if (!next || typeof next !== 'object') return;
    const merged = { ...ALL_MODULES, ...next };
    setModules(merged);
    localStorage.setItem('accessModules', JSON.stringify(merged));
  }, []);

  const canAccessModule = useCallback(
    (moduleKey) => {
      if (!moduleKey) return true;
      if (localStorage.getItem('userRole') === 'OWNER') return true;
      return modules[moduleKey] !== false;
    },
    [modules],
  );

  const value = useMemo(
    () => ({ modules, setFromWhoami, canAccessModule }),
    [modules, setFromWhoami, canAccessModule],
  );

  return (
    <AccessPolicyContext.Provider value={value}>{children}</AccessPolicyContext.Provider>
  );
};

export const useAccessPolicy = () => useContext(AccessPolicyContext);

export const MODULE_FOR_PATH = {
  '/customers': 'customers',
  '/credits': 'credits',
  '/advance': 'advance',
  '/invoices': 'invoices',
  '/stock': 'stock',
  '/purchases': 'purchases',
  '/books': 'books',
  '/reports': 'reports',
};

export const moduleForAppPath = (pathname) => {
  if (!pathname) return null;
  if (pathname.startsWith('/customers')) return 'customers';
  if (pathname.startsWith('/credits')) return 'credits';
  if (pathname.startsWith('/advance')) return 'advance';
  if (pathname.startsWith('/invoices')) return 'invoices';
  if (pathname.startsWith('/stock')) return 'stock';
  if (pathname.startsWith('/purchases')) return 'purchases';
  if (pathname.startsWith('/books')) return 'books';
  if (pathname.startsWith('/reports')) return 'reports';
  return null;
};
