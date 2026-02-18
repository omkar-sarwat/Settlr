// Admin API — system metrics, flagged transactions, live feed
import { apiClient } from './client';
import type { AdminMetrics, ApiResponse, FlaggedTransaction, Transaction } from '../types';

/** Fetches system health metrics (volume, success rate, fraud rate, latency) */
export async function getAdminMetrics(): Promise<ApiResponse<AdminMetrics>> {
  const response = await apiClient.get('/api/v1/admin/metrics');
  return response.data;
}

/** Fetches transactions with fraud score >= 30 (flagged for review) */
export async function getFlaggedTransactions(): Promise<ApiResponse<FlaggedTransaction[]>> {
  const response = await apiClient.get('/api/v1/admin/flagged');
  return response.data;
}

/** Fetches most recent transactions for the live feed (newest first) */
export async function getLiveTransactions(): Promise<ApiResponse<Transaction[]>> {
  const response = await apiClient.get('/api/v1/admin/live', {
    params: { limit: 20 },
  });
  return response.data;
}
