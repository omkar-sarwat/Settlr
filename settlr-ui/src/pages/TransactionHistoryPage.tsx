/**
 * Transaction History Page
 * 
 * Complete transaction management:
 * - Advanced filters (type, status, date, search)
 * - Paginated transaction list
 * - Slide-in detail panel with ledger trail
 * - Export functionality (future)
 * 
 * All elements use glassmorphism design.
 */

import { useState, useMemo } from 'react';
import { Download } from 'lucide-react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { GlowButton } from '@/components/ui/GlowButton';
import {
  TransactionFilter,
  TransactionList,
  TransactionDetailPanel,
  type Transaction,
  type FilterState,
} from '@/components/transactions';
import { useTransactions } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { exportToCSV } from '@/lib/export';
import type { Transaction as APITransaction } from '@/types';

export function TransactionHistoryPage() {
  const [filters, setFilters] = useState<FilterState>({
    type: 'all',
    status: 'all',
    dateRange: 'all',
    searchQuery: '',
  });

  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Map FilterState to API TransactionFilters
  const apiFilters = useMemo(() => {
    // Map dateRange to API period format
    let period: 'today' | 'week' | 'month' | 'all' | undefined;
    if (filters.dateRange === '7days') period = 'week';
    else if (filters.dateRange === '30days') period = 'month';
    else if (filters.dateRange === 'all') period = 'all';
    else period = 'all'; // default for 'custom'

    // Map status to API format
    let status: 'all' | 'completed' | 'pending' | 'failed' | undefined;
    if (filters.status === 'all') status = undefined;
    else if (filters.status === 'success') status = 'completed';
    else if (filters.status === 'failed') status = 'failed';
    else if (filters.status === 'pending') status = 'pending';
    else status = undefined;

    return {
      type: filters.type,
      status,
      search: filters.searchQuery || undefined,
      period,
    };
  }, [filters]);

  const { data: transactionsData, isLoading } = useTransactions(apiFilters);
  const { data: accountsData } = useAccounts();

  const primaryAccountId = accountsData?.data?.[0]?.id;

  // Map API transactions to local Transaction type
  const mappedTransactions: Transaction[] = useMemo(() => {
    if (!transactionsData?.data || !primaryAccountId) return [];

    return transactionsData.data.map((txn: APITransaction) => {
      const isSent = txn.fromAccountId === primaryAccountId;
      return {
        id: txn.id,
        type: isSent ? ('sent' as const) : ('received' as const),
        counterpartyName: isSent ? (txn.toUserName || 'Unknown') : (txn.fromUserName || 'Unknown'),
        counterpartyAccount: isSent ? txn.toAccountId : txn.fromAccountId,
        amountPaise: txn.amount,
        status: txn.status === 'completed' ? 'success' as const 
          : txn.status === 'failed' ? 'failed' as const 
          : 'pending' as const,
        timestamp: txn.createdAt,
        purpose: txn.description,
      };
    });
  }, [transactionsData, primaryAccountId]);

  // Handle export
  const handleExport = () => {
    if (!transactionsData?.data) return;
    exportToCSV(transactionsData.data, 'transactions');
  };

  return (
    <PageWrapper>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Transaction History
          </h1>
          <p className="text-text-secondary">
            View and manage all your transactions
          </p>
        </div>

        {/* Export Button */}
        <GlowButton variant="primary" size="sm" onClick={handleExport}>
          <Download className="w-4 h-4" />
          <span>Export</span>
        </GlowButton>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <TransactionFilter filters={filters} onFilterChange={setFilters} />
      </div>

      {/* Results Count */}
      <div className="mb-4 text-sm text-text-tertiary">
        {mappedTransactions.length} {mappedTransactions.length === 1 ? 'transaction' : 'transactions'} found
      </div>

      {/* Transaction List */}
      <TransactionList
        transactions={mappedTransactions}
        onSelectTransaction={setSelectedTransaction}
        isLoading={isLoading}
      />

      {/* Detail Panel (slides in from right) */}
      <TransactionDetailPanel
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
      />
    </PageWrapper>
  );
}
