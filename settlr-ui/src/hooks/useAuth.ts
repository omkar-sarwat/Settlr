// useAuth hook — provides current user, logout helper, and auth state
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import type { User } from '../types';

interface UseAuthReturn {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  logout: () => void;
}

/** Provides auth state and a logout function that clears state + navigates to /login */
export function useAuth(): UseAuthReturn {
  const { user, accessToken, isAuthenticated, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const logout = useCallback(() => {
    clearAuth();
    navigate('/login', { replace: true });
  }, [clearAuth, navigate]);

  return { user, accessToken, isAuthenticated, logout };
}
