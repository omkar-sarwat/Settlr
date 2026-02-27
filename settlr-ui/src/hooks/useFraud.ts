/**
 * useFraud — Fraud management hooks
 * - Get fraud stats
 * - Approve transaction mutation
 * - Block transaction mutation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFraudStats, approveFlaggedTransaction, blockFlaggedTransaction } from '../api/fraud.api';

/** Fetches fraud statistics */
export function useFraudStats() {
  return useQuery({
    queryKey: ['fraud-stats'],
    queryFn: getFraudStats,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

/** Mutation to approve a flagged transaction */
export function useApproveFraud() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (transactionId: string) => approveFlaggedTransaction(transactionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-flagged'] });
      queryClient.invalidateQueries({ queryKey: ['fraud-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-metrics'] });
    },
  });
}

/** Mutation to block a flagged transaction */
export function useBlockFraud() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (transactionId: string) => blockFlaggedTransaction(transactionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-flagged'] });
      queryClient.invalidateQueries({ queryKey: ['fraud-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-metrics'] });
    },
  });
}
