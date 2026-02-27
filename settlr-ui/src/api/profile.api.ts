// Profile API — get and update user profile
import { apiClient } from './client';
import type { User, ApiResponse } from '../types';

export interface ProfileUpdateData {
  name?: string;
  phone?: string;
}

/** Fetch current user profile */
export async function getProfile(): Promise<ApiResponse<User>> {
  const response = await apiClient.get<ApiResponse<User>>('/api/v1/auth/profile');
  return response.data;
}

/** Update user profile (name, phone) */
export async function updateProfile(data: ProfileUpdateData): Promise<ApiResponse<User>> {
  const response = await apiClient.patch<ApiResponse<User>>('/api/v1/auth/profile', data);
  return response.data;
}
