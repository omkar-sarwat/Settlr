// Admin API — system metrics, flagged transactions, live feed
import { apiClient } from './client';
import type { AdminMetrics, ApiResponse, FlaggedTransaction, Transaction } from '../types';

/** Coerce numeric fields that pg returns as strings */
function coerceTxn(t: Transaction & { amount: string | number; fraudScore: string | number | null }) {
  return { ...t, amount: Number(t.amount) || 0, fraudScore: t.fraudScore != null ? Number(t.fraudScore) : null };
}

/** Fetches system health metrics (volume, success rate, fraud rate, latency) */
export async function getAdminMetrics(): Promise<ApiResponse<AdminMetrics>> {
  const response = await apiClient.get('/api/v1/admin/metrics');
  return response.data;
}

/** Fetches transactions with fraud score >= 30 (flagged for review) */
export async function getFlaggedTransactions(): Promise<ApiResponse<FlaggedTransaction[]>> {
  const response = await apiClient.get('/api/v1/admin/flagged');
  const raw = response.data;
  return { ...raw, data: (raw.data || []).map((t: FlaggedTransaction & { amount: string | number; fraudScore: string | number | null }) => coerceTxn(t)) };
}

/** Fetches most recent transactions for the live feed (newest first) */
export async function getLiveTransactions(): Promise<ApiResponse<Transaction[]>> {
  const response = await apiClient.get('/api/v1/admin/live', {
    params: { limit: 20 },
  });
  const raw = response.data;
  // The live endpoint wraps in { transactions: [...] }
  const list = raw.data?.transactions || raw.data || [];
  return { ...raw, data: (Array.isArray(list) ? list : []).map((t: Transaction & { amount: string | number; fraudScore: string | number | null }) => coerceTxn(t)) };
}
