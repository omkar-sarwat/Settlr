// Account API — balance, account info, lookup, weekly stats
import { apiClient } from './client';
import type { AccountListResponse, AccountResponse, ApiResponse, ChartDataPoint } from '../types';

/** Fetches all accounts for the current authenticated user */
export async function getMyAccounts(): Promise<AccountListResponse> {
  const response = await apiClient.get<AccountListResponse>('/api/v1/accounts');
  return response.data;
}

/** Fetches a single account by ID */
export async function getAccountById(accountId: string): Promise<AccountResponse> {
  const response = await apiClient.get<AccountResponse>(`/api/v1/accounts/${accountId}`);
  return response.data;
}

/** Creates a new account for the current user */
export async function createAccount(): Promise<AccountResponse> {
  const response = await apiClient.post<AccountResponse>('/api/v1/accounts');
  return response.data;
}

/** Looks up an account by email or account ID for the send money recipient search */
export async function lookupAccount(query: string): Promise<ApiResponse<{ id: string; name: string; email: string; accountId: string } | null>> {
  const response = await apiClient.get('/api/v1/accounts/lookup', { params: { q: query } });
  return response.data;
}

/** Fetches 7-day sent/received stats for the dashboard chart */
export async function getWeeklyStats(): Promise<ApiResponse<ChartDataPoint[]>> {
  const response = await apiClient.get('/api/v1/accounts/stats/weekly');
  return response.data;
}
