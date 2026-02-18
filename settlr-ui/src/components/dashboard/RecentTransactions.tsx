// RecentTransactions — last 5 transactions on the dashboard
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, ArrowDownLeft, ChevronRight, CreditCard } from 'lucide-react';
import { formatCurrency } from '../../lib/formatCurrency';
import { timeAgo } from '../../lib/formatDate';
import { cn } from '../../lib/cn';
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { StatusBadge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import type { Transaction } from '../../types';

interface RecentTransactionsProps {
  transactions: Transaction[];
  currentAccountId: string;
  isLoading: boolean;
}

/** Skeleton for a single transaction row */
function TransactionSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4">
      <div className="w-10 h-10 rounded-full bg-bg-border animate-pulse" />
      <div className="flex-1">
        <div className="h-3 w-28 bg-bg-border rounded animate-pulse mb-2" />
        <div className="h-2.5 w-20 bg-bg-border rounded animate-pulse" />
      </div>
      <div className="h-4 w-16 bg-bg-border rounded animate-pulse" />
    </div>
  );
}

/** Shows the last 5 transactions with click-to-view detail */
export function RecentTransactions({ transactions, currentAccountId, isLoading }: RecentTransactionsProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card padding={false}>
        <div className="p-6 pb-2">
          <h3 className="text-lg font-semibold text-text-primary">Recent Transactions</h3>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <TransactionSkeleton key={i} />
        ))}
      </Card>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <h3 className="text-lg font-semibold text-text-primary mb-4">Recent Transactions</h3>
        <EmptyState
          icon={CreditCard}
          title="No transactions yet"
          description="Send money to see your history here"
        />
      </Card>
    );
  }

  return (
    <Card padding={false}>
      <div className="p-6 pb-2">
        <h3 className="text-lg font-semibold text-text-primary">Recent Transactions</h3>
      </div>

      {/* Transaction rows */}
      {transactions.slice(0, 5).map((tx) => {
        const isSent = tx.fromAccountId === currentAccountId;
        const displayName = isSent ? (tx.toUserName || 'Unknown') : (tx.fromUserName || 'Unknown');

        return (
          <div
            key={tx.id}
            onClick={() => navigate(`/transactions/${tx.id}`)}
            className="flex items-center gap-4 px-6 py-3 hover:bg-bg-tertiary
                       cursor-pointer transition-colors border-b border-bg-border last:border-0"
          >
            <Avatar name={displayName} size="md" />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {isSent ? (
                  <ArrowUpRight className="w-3.5 h-3.5 text-danger-DEFAULT flex-shrink-0" />
                ) : (
                  <ArrowDownLeft className="w-3.5 h-3.5 text-success-DEFAULT flex-shrink-0" />
                )}
                <p className="text-sm font-medium text-text-primary truncate">
                  {displayName}
                </p>
              </div>
              <p className="text-xs text-text-secondary">{timeAgo(tx.createdAt)}</p>
            </div>

            <span
              className={cn(
                'text-sm font-mono font-semibold whitespace-nowrap',
                isSent ? 'text-danger-text' : 'text-success-text',
              )}
            >
              {isSent ? '-' : '+'}{formatCurrency(tx.amount)}
            </span>

            <StatusBadge status={tx.status} />
            <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />
          </div>
        );
      })}

      {/* View all link */}
      <div className="p-4 text-center">
        <button
          onClick={() => navigate('/transactions')}
          className="text-xs font-medium text-brand-light hover:text-brand transition-colors"
        >
          View all transactions →
        </button>
      </div>
    </Card>
  );
}
