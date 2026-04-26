import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary';
import LoginPage from './pages/LoginPage/LoginPage';
import SignupPage from './pages/SignupPage/SignupPage';
import DashboardPage from './pages/DashboardPage/DashboardPage';

import CustomersPage from './pages/CustomersPage/CustomersPage';
import CustomerProfilePage from './pages/CustomerProfilePage/CustomerProfilePage';
import CreditsListPage from './pages/CreditsListPage/CreditsListPage';
import CreditDetailPage from './pages/CreditDetailPage/CreditDetailPage';
import CreateCreditPage from './pages/CreateCreditPage/CreateCreditPage';
import EditCreditPage from './pages/EditCreditPage/EditCreditPage';
import EditPaymentPage from './pages/EditPaymentPage/EditPaymentPage';
import RecordPaymentPage from './pages/RecordPaymentPage/RecordPaymentPage';
import RemindersPage from './pages/RemindersPage/RemindersPage';
import SettingsPage from './pages/SettingsPage/SettingsPage';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import PublicRoute from './components/PublicRoute/PublicRoute';
import InvoicesPage from './pages/InvoicesPage/InvoicesPage';
import CreateInvoicePage from './pages/CreateInvoicePage/CreateInvoicePage';
import CreateInvoicePageMobile from './pages/CreateInvoicePage/CreateInvoicePageMobile';
import ReportsPage from './pages/ReportsPage/ReportsPage';
import './App.css';

function App() {

  return (
    <ThemeProvider>
      <ErrorBoundary>
        <Router>
          <div className="App">
            <Routes>
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />
            <Route
              path="/signup"
              element={
                <PublicRoute>
                  <SignupPage />
                </PublicRoute>
              }
            />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customers"
              element={
                <ProtectedRoute>
                  <CustomersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customers/:id"
              element={
                <ProtectedRoute>
                  <CustomerProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/credits"
              element={
                <ProtectedRoute>
                  <CreditsListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/credits/new"
              element={
                <ProtectedRoute>
                  <CreateCreditPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/credits/:id"
              element={
                <ProtectedRoute>
                  <CreditDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/credits/:id/edit"
              element={
                <ProtectedRoute>
                  <EditCreditPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/credits/:id/payment"
              element={
                <ProtectedRoute>
                  <RecordPaymentPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/credits/:id/payments/:transactionId/edit"
              element={
                <ProtectedRoute>
                  <EditPaymentPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reminders"
              element={
                <ProtectedRoute>
                  <RemindersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            {/* INVOICE ROUTES */}
            <Route
              path="/invoices"
              element={
                <ProtectedRoute>
                  <InvoicesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/invoices/new"
              element={
                <ProtectedRoute>
                  <CreateInvoicePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/invoices/edit/:id"
              element={
                <ProtectedRoute>
                  <CreateInvoicePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/invoices/new/mobile"
              element={
                <ProtectedRoute>
                  <CreateInvoicePageMobile />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/reports"
              element={
                <ProtectedRoute allowedRoles={['OWNER']}>
                  <ReportsPage />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/invoices/new" replace />} />
            </Routes>
          </div>
        </Router>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;

