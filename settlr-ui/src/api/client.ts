// Single Axios instance for ALL API calls — auto-adds JWT, handles 401 redirect
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

/**
 * The single Axios instance used for ALL API calls in this app.
 * Automatically adds the JWT token to every request.
 * Automatically redirects to /login on 401 Unauthorized.
 * Never create another axios instance anywhere else.
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10_000,
});

// Add JWT token to every outgoing request automatically
apiClient.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().accessToken;
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Handle authentication errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
