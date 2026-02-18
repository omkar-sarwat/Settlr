// Zustand auth store — JWT token stored IN MEMORY ONLY (never localStorage)
import { create } from 'zustand';
import type { AuthState, User } from '../types';

/**
 * Global authentication state.
 * Token is stored in memory only — refreshing the page clears the session.
 * This is intentional for security. No localStorage or sessionStorage.
 */
export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,

  /** Called after successful login — saves token and user info in memory */
  setAuth: (token: string, user: User) => set({
    token,
    user,
    isAuthenticated: true,
  }),

  /** Called on logout or 401 error — clears everything */
  logout: () => set({
    token: null,
    user: null,
    isAuthenticated: false,
  }),
}));
