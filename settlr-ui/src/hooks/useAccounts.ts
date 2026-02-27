/**
 * useAccounts — Account data hooks
 * - Get all accounts for current user
 * - Get single account by ID
 * - Get weekly stats for dashboard chart
 */

import { useQuery } from '@tanstack/react-query';
import { getMyAccounts, getAccountById, getWeeklyStats, lookupAccount } from '../api/account.api';

/** Fetches all accounts for the authenticated user */
export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: getMyAccounts,
    staleTime: 30_000,
  });
}

/** Fetches a single account by ID */
export function useAccount(accountId: string) {
  return useQuery({
    queryKey: ['account', accountId],
    queryFn: () => getAccountById(accountId),
    enabled: !!accountId,
    staleTime: 30_000,
  });
}

/** Fetches 7-day volume stats for dashboard chart */
export function useWeeklyStats() {
  return useQuery({
    queryKey: ['weekly-stats'],
    queryFn: getWeeklyStats,
    staleTime: 60_000,
  });
}

/** Searches for recipient by email or account ID */
export function useAccountLookup(query: string) {
  return useQuery({
    queryKey: ['account-lookup', query],
    queryFn: () => lookupAccount(query),
    enabled: query.trim().length >= 2,
    staleTime: 10_000,
  });
}
