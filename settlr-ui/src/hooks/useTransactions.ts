// useTransactions — TanStack Query hooks for transaction data
import { useQuery } from '@tanstack/react-query';
import { getTransactions, getTransactionById, getRecentTransactions } from '../api/payment.api';
import type { TransactionFilters } from '../types';

/**
 * Fetches and caches the transaction list.
 * Automatically re-fetches when filters change (queryKey includes filters).
 * Keeps previous data visible while new data loads (no blank flash).
 */
export function useTransactions(filters?: TransactionFilters) {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => getTransactions(filters),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

/** Fetches a single transaction with fraud signals and ledger entries */
export function useTransactionDetail(transactionId: string) {
  return useQuery({
    queryKey: ['transaction', transactionId],
    queryFn: () => getTransactionById(transactionId),
    enabled: !!transactionId,
  });
}

/** Fetches the last 5 transactions for the dashboard */
export function useRecentTransactions() {
  return useQuery({
    queryKey: ['recent-transactions'],
    queryFn: getRecentTransactions,
    staleTime: 30_000,
  });
}
