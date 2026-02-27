/**
 * ProtectedRoute Wrapper
 * 
 * Wraps authenticated routes to ensure user is logged in.
 * Redirects to /login if not authenticated.
 * Shows loading state while checking auth.
 */

import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
