// Auth API — login, register, refresh, logout
import { apiClient } from './client';
import type { LoginFormData, RegisterFormData, LoginResponse, RegisterResponse, ApiResponse } from '../types';

/** Authenticates user with email + password, returns JWT tokens + user object */
export async function loginUser(data: LoginFormData): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>('/api/v1/auth/login', data);
  return response.data;
}

/** Creates a new user account, returns JWT tokens + user object */
export async function registerUser(data: RegisterFormData): Promise<RegisterResponse> {
  const response = await apiClient.post<RegisterResponse>('/api/v1/auth/register', data);
  return response.data;
}

/** Exchange refresh token for a new access token */
export async function refreshToken(refreshToken: string): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>('/api/v1/auth/refresh', { refreshToken });
  return response.data;
}

/** Invalidate refresh token on the server */
export async function logoutUser(refreshToken: string): Promise<ApiResponse> {
  const response = await apiClient.post<ApiResponse>('/api/v1/auth/logout', { refreshToken });
  return response.data;
}
