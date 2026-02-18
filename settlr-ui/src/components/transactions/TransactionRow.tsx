// TransactionRow — single clickable row in the transaction list
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { formatCurrency } from '../../lib/formatCurrency';
import { timeAgo } from '../../lib/formatDate';
import { cn } from '../../lib/cn';
import { Avatar } from '../ui/Avatar';
import { StatusBadge } from '../ui/Badge';
import { FraudScoreBadge } from './FraudScoreBadge';
import type { Transaction } from '../../types';

interface TransactionRowProps {
  transaction: Transaction;
  currentAccountId: string;
}

/** Clickable row showing avatar, name, amount, fraud badge, status, and chevron */
export function TransactionRow({ transaction, currentAccountId }: TransactionRowProps) {
  const navigate = useNavigate();
  const isSent = transaction.fromAccountId === currentAccountId;
  const displayName = isSent
    ? (transaction.toUserName || 'Unknown')
    : (transaction.fromUserName || 'Unknown');

  return (
    <div
      onClick={() => navigate(`/transactions/${transaction.id}`)}
      className="flex items-center gap-4 p-4 hover:bg-bg-tertiary cursor-pointer
                 transition-colors border-b border-bg-border last:border-0"
    >
      <Avatar name={displayName} size="md" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-text-primary truncate">{displayName}</p>
          <span className="text-xs text-text-muted">{isSent ? 'Sent' : 'Received'}</span>
        </div>
        <p className="text-xs text-text-secondary">
          {timeAgo(transaction.createdAt)}
        </p>
      </div>

      {transaction.fraudScore !== undefined && (
        <FraudScoreBadge score={transaction.fraudScore} className="hidden sm:inline-flex" />
      )}

      <span
        className={cn(
          'text-sm font-mono font-semibold whitespace-nowrap',
          isSent ? 'text-danger-text' : 'text-success-text',
        )}
      >
        {isSent ? '-' : '+'}{formatCurrency(transaction.amount)}
      </span>

      <StatusBadge status={transaction.status} />

      <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />
    </div>
  );
}
