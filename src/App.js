import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import PublicRoute from './components/PublicRoute/PublicRoute';

// Mobile-First Pages
import MobileLoginPage from './pages/MobileLoginPage/MobileLoginPage';
import MobileSignupPage from './pages/MobileSignupPage/MobileSignupPage';
import MobileDashboardPage from './pages/MobileDashboardPage/MobileDashboardPage';
import MobileCustomersPage from './pages/MobileCustomersPage/MobileCustomersPage';
import MobileCreditsListPage from './pages/MobileCreditsListPage/MobileCreditsListPage';
import MobileCreditDetailPage from './pages/MobileCreditDetailPage/MobileCreditDetailPage';
import MobileAddCreditPage from './pages/MobileAddCreditPage/MobileAddCreditPage';
import MobileInvoicesPage from './pages/MobileInvoicesPage/MobileInvoicesPage';
import CreateInvoicePageMobile from './pages/CreateInvoicePage/CreateInvoicePageMobile';
import MobileRemindersPage from './pages/MobileRemindersPage/MobileRemindersPage';
import MobileReportsPage from './pages/MobileReportsPage/MobileReportsPage';
import MobileSettingsPage from './pages/MobileSettingsPage/MobileSettingsPage';

import './App.css';

function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <Router>
          <div className="App">
            <Routes>
              {/* AUTH ROUTES */}
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <MobileLoginPage />
                  </PublicRoute>
                }
              />
              <Route
                path="/signup"
                element={
                  <PublicRoute>
                    <MobileSignupPage />
                  </PublicRoute>
                }
              />

              {/* CORE APP ROUTES */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <MobileDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customers"
                element={
                  <ProtectedRoute>
                    <MobileCustomersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customers/:id"
                element={
                  <ProtectedRoute>
                    <MobileCreditDetailPage />
                  </ProtectedRoute>
                }
              />

              {/* UDHAR / CREDITS */}
              <Route
                path="/credits"
                element={
                  <ProtectedRoute>
                    <MobileCreditsListPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/credits/new"
                element={
                  <ProtectedRoute>
                    <MobileAddCreditPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/credits/:id"
                element={
                  <ProtectedRoute>
                    <MobileCreditDetailPage />
                  </ProtectedRoute>
                }
              />

              {/* INVOICES */}
              <Route
                path="/invoices"
                element={
                  <ProtectedRoute>
                    <MobileInvoicesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/invoices/new"
                element={
                  <ProtectedRoute>
                    <CreateInvoicePageMobile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/invoices/edit/:id"
                element={
                  <ProtectedRoute>
                    <CreateInvoicePageMobile />
                  </ProtectedRoute>
                }
              />

              {/* OTHER */}
              <Route
                path="/reminders"
                element={
                  <ProtectedRoute>
                    <MobileRemindersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute>
                    <MobileReportsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <MobileSettingsPage />
                  </ProtectedRoute>
                }
              />

              {/* REDIRECTS */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/mobile/*" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </Router>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;


// export default App;

