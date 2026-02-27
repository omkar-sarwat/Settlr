// Payment API — transactions list, detail, send money
import { apiClient } from './client';
import type {
  Transaction,
  TransactionFilters,
  TransactionListResponse,
  TransactionDetailResponse,
  SendMoneyParams,
  SendMoneyResponse,
} from '../types';

/**
 * Normalizes a transaction list response from the backend.
 * The payment-service may return { data: { transactions: [...], total, ... } }
 * but the UI expects { data: Transaction[], pagination: { ... } }.
 * Also coerces amount/fraudScore to numbers (pg returns NUMERIC as strings).
 */
interface RawPaymentResponse {
  success?: boolean;
  data?: Transaction[] | { transactions: Transaction[]; total?: number; page?: number; limit?: number; totalPages?: number };
  traceId?: string;
}

function normalizeListResponse(raw: RawPaymentResponse): TransactionListResponse {
  const payload = raw?.data;

  function coerceTransaction(txn: Transaction & { amount: string | number; fraudScore?: string | number | null }) {
    return {
      ...txn,
      amount: Number(txn.amount) || 0,
      fraudScore: txn.fraudScore != null ? Number(txn.fraudScore) : undefined,
    };
  }

  // Already in expected shape: data is an array
  if (Array.isArray(payload)) {
    return {
      ...raw,
      data: payload.map(coerceTransaction),
    } as TransactionListResponse;
  }

  // Backend shape: data.transactions is the array
  if (payload && Array.isArray(payload.transactions)) {
    const transactions = payload.transactions.map(coerceTransaction);
    return {
      success: raw.success ?? true,
      data: transactions,
      pagination: {
        total: payload.total ?? transactions.length,
        page: payload.page ?? 1,
        limit: payload.limit ?? 20,
        totalPages: payload.totalPages ?? Math.ceil((payload.total ?? transactions.length) / (payload.limit ?? 20)),
      },
      traceId: raw.traceId ?? '',
    };
  }

  // Fallback: return empty
  return {
    success: raw?.success ?? false,
    data: [],
    pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
    traceId: raw?.traceId ?? '',
  };
}

/** Fetches paginated transaction list with optional filters */
export async function getTransactions(filters?: TransactionFilters): Promise<TransactionListResponse> {
  const response = await apiClient.get('/api/v1/payments', {
    params: filters,
  });
  return normalizeListResponse(response.data);
}

/** Fetches single transaction with fraud signals + ledger entries */
export async function getTransactionById(id: string): Promise<TransactionDetailResponse> {
  const response = await apiClient.get(`/api/v1/transactions/${id}/details`);
  const raw = response.data;
  const payload = raw?.data ?? {};

  return {
    success: raw?.success ?? true,
    traceId: raw?.traceId ?? '',
    data: {
      transaction: payload.transaction,
      signals: (payload.fraudSignals ?? []).map((signal: { ruleName: string; scoreAdded: number; signalData?: Record<string, unknown> }) => ({
        ruleName: signal.ruleName,
        scoreAdded: Number(signal.scoreAdded ?? 0),
        data: signal.signalData ?? {},
      })),
      ledger: (payload.ledgerEntries ?? []).map((entry: {
        id: string;
        entryType: 'debit' | 'credit';
        amount: number;
        balanceBefore: number;
        balanceAfter: number;
      }) => ({
        id: entry.id,
        entryType: entry.entryType,
        amount: Number(entry.amount ?? 0),
        balanceBefore: Number(entry.balanceBefore ?? 0),
        balanceAfter: Number(entry.balanceAfter ?? 0),
      })),
    },
  } as TransactionDetailResponse;
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
  const response = await apiClient.get('/api/v1/payments', {
    params: { limit: 5, page: 1 },
  });
  return normalizeListResponse(response.data);
}

/** Fetches today's dashboard stats (sent, received, success rate) for a specific account */
export interface DashboardStats {
  sentToday: number;
  receivedToday: number;
  successRate: number;
}

export async function getDashboardStats(accountId: string): Promise<DashboardStats> {
  const response = await apiClient.get('/api/v1/payments/dashboard-stats', {
    params: { accountId },
  });
  const d = response.data?.data ?? response.data;
  return {
    sentToday: Number(d.sentToday),
    receivedToday: Number(d.receivedToday),
    successRate: Number(d.successRate),
  };
}
