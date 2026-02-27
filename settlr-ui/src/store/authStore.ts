// Zustand auth store — JWT token stored IN MEMORY ONLY (never localStorage)
import { create } from 'zustand';
import type { AuthState, User } from '../types';

/**
 * Global authentication state.
 * Token is stored in memory only — refreshing the page clears the session.
 * This is intentional for security. No localStorage or sessionStorage.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  account: null,
  accessToken: null,
  isAuthenticated: false,

  /** Called after successful login — saves user, account and access token in memory */
  setAuth: (user: User, account, accessToken: string) => set({
    user,
    account,
    accessToken,
    isAuthenticated: true,
  }),

  /** Called on logout or 401 error — clears everything */
  clearAuth: () => set({
    user: null,
    account: null,
    accessToken: null,
    isAuthenticated: false,
  }),
}));
