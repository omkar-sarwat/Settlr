// useAuth hook — provides current user, logout helper, and auth state
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import type { User } from '../types';

interface UseAuthReturn {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  logout: () => void;
}

/** Provides auth state and a logout function that clears state + navigates to /login */
export function useAuth(): UseAuthReturn {
  const { user, token, isAuthenticated, logout: clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const logout = useCallback(() => {
    clearAuth();
    navigate('/login', { replace: true });
  }, [clearAuth, navigate]);

  return { user, token, isAuthenticated, logout };
}
