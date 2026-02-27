/**
 * Fraud Admin API
 * - Approve flagged transaction
 * - Block flagged transaction
 * - Get fraud statistics
 */

import { apiClient } from './client';
import type { ApiResponse } from '../types';

/** Approves a flagged transaction (sets fraud_action = 'approve') */
export async function approveFlaggedTransaction(transactionId: string): Promise<ApiResponse> {
  const response = await apiClient.post<ApiResponse>(
    `/api/v1/admin/flagged/${transactionId}/approve`
  );
  return response.data;
}

/** Blocks a flagged transaction (sets fraud_action = 'decline') */
export async function blockFlaggedTransaction(transactionId: string): Promise<ApiResponse> {
  const response = await apiClient.post<ApiResponse>(
    `/api/v1/admin/flagged/${transactionId}/block`
  );
  return response.data;
}

/** Gets fraud statistics (total flagged, false positive rate, etc.) */
export async function getFraudStats(): Promise<ApiResponse<{
  totalFlagged: number;
  falsePositiveRate: number;
  avgRiskScore: number;
  blockedAmountPaise: number;
}>> {
  const response = await apiClient.get('/api/v1/admin/fraud/stats');
  const raw = response.data;
  // Coerce numeric fields from pg strings
  if (raw.data) {
    raw.data.totalFlagged = Number(raw.data.totalFlagged) || 0;
    raw.data.falsePositiveRate = Number(raw.data.falsePositiveRate) || 0;
    raw.data.avgRiskScore = Number(raw.data.avgRiskScore) || 0;
    raw.data.blockedAmountPaise = Number(raw.data.blockedAmountPaise) || 0;
  }
  return raw;
}
