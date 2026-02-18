// App — route definitions, protected routes wrapped in AppLayout
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { SendMoneyPage } from './pages/SendMoneyPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { TransactionDetailPage } from './pages/TransactionDetailPage';
import { AdminPage } from './pages/AdminPage';

/** Root component — maps URL paths to page components */
export function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected routes — wrapped in AppLayout (sidebar + auth guard) */}
      <Route
        path="/dashboard"
        element={
          <AppLayout>
            <DashboardPage />
          </AppLayout>
        }
      />
      <Route
        path="/send"
        element={
          <AppLayout>
            <SendMoneyPage />
          </AppLayout>
        }
      />
      <Route
        path="/transactions"
        element={
          <AppLayout>
            <TransactionsPage />
          </AppLayout>
        }
      />
      <Route
        path="/transactions/:id"
        element={
          <AppLayout>
            <TransactionDetailPage />
          </AppLayout>
        }
      />
      <Route
        path="/admin"
        element={
          <AppLayout>
            <AdminPage />
          </AppLayout>
        }
      />

      {/* Catch-all — redirect to dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
