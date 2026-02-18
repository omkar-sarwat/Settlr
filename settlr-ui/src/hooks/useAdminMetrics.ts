// useAdminMetrics — auto-refreshing admin dashboard data (every 10 seconds)
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { getAdminMetrics, getFlaggedTransactions, getLiveTransactions } from '../api/admin.api';

/**
 * Fetches admin system metrics with auto-refresh every 10 seconds.
 * Also tracks a "seconds ago" counter for the "Updated X seconds ago" display.
 */
export function useAdminMetrics() {
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [lastFetchTime, setLastFetchTime] = useState(new Date());

  const query = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: getAdminMetrics,
    refetchInterval: 10_000,
    staleTime: 5_000,
  });

  // Reset counter when data is refreshed
  useEffect(() => {
    if (query.dataUpdatedAt) {
      setLastFetchTime(new Date(query.dataUpdatedAt));
      setSecondsAgo(0);
    }
  }, [query.dataUpdatedAt]);

  // Increment counter every second for the "Updated X seconds ago" display
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastFetchTime.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [lastFetchTime]);

  return { ...query, secondsAgo };
}

/** Fetches flagged transactions (fraud score >= 30) with auto-refresh */
export function useFlaggedTransactions() {
  return useQuery({
    queryKey: ['admin-flagged'],
    queryFn: getFlaggedTransactions,
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
}

/** Fetches live transaction feed (most recent 20) with auto-refresh */
export function useLiveTransactions() {
  return useQuery({
    queryKey: ['admin-live'],
    queryFn: getLiveTransactions,
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
}
