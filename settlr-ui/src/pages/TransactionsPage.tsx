// TransactionsPage — paginated transaction list with filters, grouped by date
import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Send, Loader2 } from 'lucide-react';
import { getTransactions } from '../api/payment.api';
import { getMyAccounts } from '../api/account.api';
import { getDateGroup } from '../lib/formatDate';
import { TransactionFiltersBar } from '../components/transactions/TransactionFilters';
import { TransactionRow } from '../components/transactions/TransactionRow';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import type { TransactionFilters, Transaction } from '../types';

/** Transaction list page with filter bar, date grouping, and pagination */
export function TransactionsPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<TransactionFilters>({});
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  // Fetch current user's accounts
  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: getMyAccounts,
    staleTime: 30_000,
  });
  const currentAccountId = accountsData?.data?.[0]?.id ?? '';

  // Fetch transactions with current filters
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['transactions', filters, page],
    queryFn: () => getTransactions({ ...filters, page, limit: LIMIT }),
    staleTime: 10_000,
  });

  const transactions = data?.data || [];
  const pagination = data?.pagination;
  const totalCount = pagination?.total ?? 0;
  const hasMore = pagination ? page < pagination.totalPages : false;

  // Handle filter changes — reset page to 1
  const handleFilterChange = useCallback((newFilters: TransactionFilters) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  // Group transactions by date (Today, Yesterday, This Week, etc.)
  const grouped = useMemo(() => {
    const groups = new Map<string, Transaction[]>();
    for (const txn of transactions) {
      const group = getDateGroup(txn.createdAt);
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group)!.push(txn);
    }
    return groups;
  }, [transactions]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Transactions</h1>
          {totalCount > 0 && (
            <p className="text-sm text-text-secondary mt-1">
              {totalCount} transaction{totalCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <Button
          label="Send Money"
          onClick={() => navigate('/send')}
          icon={Send}
        />
      </div>

      {/* Filter bar */}
      <TransactionFiltersBar onFilterChange={handleFilterChange} />

      {/* Transaction list */}
      <div className="bg-bg-secondary rounded-card shadow-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-12">
            <EmptyState
              title="No transactions found"
              description="Try adjusting your filters or send your first payment"
              action={{ label: 'Send Money', onClick: () => navigate('/send') }}
            />
          </div>
        ) : (
          <>
            {Array.from(grouped.entries()).map(([group, txns]) => (
              <div key={group}>
                {/* Date group heading */}
                <div className="px-4 py-2 bg-bg-tertiary/50 border-b border-bg-border">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                    {group}
                  </p>
                </div>

                {/* Transaction rows */}
                {txns.map((txn) => (
                  <TransactionRow
                    key={txn.id}
                    transaction={txn}
                    currentAccountId={currentAccountId}
                  />
                ))}
              </div>
            ))}

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center py-4 border-t border-bg-border">
                <Button
                  label={isFetching ? 'Loading...' : 'Load more'}
                  onClick={() => setPage((p) => p + 1)}
                  variant="ghost"
                  disabled={isFetching}
                  icon={isFetching ? Loader2 : undefined}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
