// App — route definitions, protected routes wrapped in AppLayout
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { SendMoneyPage } from './pages/SendMoneyPage';
import { TransactionHistoryPage } from './pages/TransactionHistoryPage';
import { AdminFraudPanelPage } from './pages/AdminFraudPanelPage';
import { ProfilePage } from './pages/ProfilePage';

/** Root component — maps URL paths to page components */
export function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected routes — wrapped in AppLayout (sidebar + auth guard) */}
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="send" element={<SendMoneyPage />} />
        <Route path="transactions" element={<TransactionHistoryPage />} />
        <Route path="admin" element={<AdminFraudPanelPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* Catch-all — redirect to dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
