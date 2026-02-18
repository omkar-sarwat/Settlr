// Payment API — transactions list, detail, send money
import { apiClient } from './client';
import type {
  TransactionFilters,
  TransactionListResponse,
  TransactionDetailResponse,
  SendMoneyParams,
  SendMoneyResponse,
} from '../types';

/** Fetches paginated transaction list with optional filters */
export async function getTransactions(filters?: TransactionFilters): Promise<TransactionListResponse> {
  const response = await apiClient.get<TransactionListResponse>('/api/v1/payments', {
    params: filters,
  });
  return response.data;
}

/** Fetches single transaction with fraud signals + ledger entries */
export async function getTransactionById(id: string): Promise<TransactionDetailResponse> {
  const response = await apiClient.get<TransactionDetailResponse>(`/api/v1/payments/${id}`);
  return response.data;
}

/**
 * Sends money via POST /api/v1/payments.
 * Includes Idempotency-Key header to prevent duplicate charges.
 * The key must be generated once with crypto.randomUUID() and reused on retries.
 */
export async function sendMoney(params: SendMoneyParams): Promise<SendMoneyResponse> {
  const { idempotencyKey, ...body } = params;
  const response = await apiClient.post<SendMoneyResponse>('/api/v1/payments', body, {
    headers: { 'Idempotency-Key': idempotencyKey },
  });
  return response.data;
}

/** Fetches recent transactions (last 5) for dashboard display */
export async function getRecentTransactions(): Promise<TransactionListResponse> {
  const response = await apiClient.get<TransactionListResponse>('/api/v1/payments', {
    params: { limit: 5, page: 1 },
  });
  return response.data;
}
