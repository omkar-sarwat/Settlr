/**
 * Transaction List Component
 * 
 * Displays paginated list of transactions.
 * Each row shows:
 * - Avatar (recipient/sender)
 * - Name & account number
 * - Amount (green for received, red for sent)
 * - Status badge
 * - Date/time
 * - Click to open detail panel
 */

import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge } from '@/components/ui/Badge';
import { formatCurrency, timeAgo } from '@/lib/formatters';
import { staggerContainer, staggerItem } from '@/animations/variants';

export interface Transaction {
  id: string;
  type: 'sent' | 'received';
  counterpartyName: string;
  counterpartyAccount: string;
  amountPaise: number;
  status: 'success' | 'failed' | 'pending';
  timestamp: string;
  purpose?: string;
}

interface TransactionListProps {
  transactions: Transaction[];
  onSelectTransaction: (transaction: Transaction) => void;
  isLoading?: boolean;
}

export function TransactionList({
  transactions,
  onSelectTransaction,
  isLoading = false,
}: TransactionListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <GlassCard key={i} className="p-4 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-bg-elevated" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-bg-elevated rounded" />
                <div className="h-3 w-24 bg-bg-elevated rounded" />
              </div>
              <div className="h-6 w-20 bg-bg-elevated rounded" />
            </div>
          </GlassCard>
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <GlassCard className="text-center py-16">
        <div className="text-text-tertiary">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-bg-elevated flex items-center justify-center">
            <ChevronRight className="w-8 h-8 opacity-50" />
          </div>
          <p className="font-medium">No transactions found</p>
          <p className="text-sm mt-1">Try adjusting your filters</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-3"
    >
      {transactions.map((transaction) => (
        <motion.div key={transaction.id} variants={staggerItem}>
          <GlassCard
            hoverable
            onClick={() => onSelectTransaction(transaction)}
            className="flex items-center gap-4 group cursor-pointer"
          >
            {/* Avatar */}
            <Avatar name={transaction.counterpartyName} size="md" />

            {/* Transaction Details */}
            <div className="flex-1 min-w-0">
              <p className="text-text-primary font-medium group-hover:text-primary-light transition-colors">
                {transaction.counterpartyName}
              </p>
              <p className="text-sm text-text-tertiary font-mono truncate">
                {transaction.counterpartyAccount}
              </p>
              {transaction.purpose && (
                <p className="text-xs text-text-muted mt-0.5 truncate">
                  {transaction.purpose}
                </p>
              )}
            </div>

            {/* Amount */}
            <div className="text-right">
              <p
                className={`text-lg font-bold font-mono ${
                  transaction.type === 'received' ? 'text-success-light' : 'text-danger-light'
                }`}
              >
                {transaction.type === 'received' ? '+' : '-'}
                {formatCurrency(transaction.amountPaise)}
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                {timeAgo(new Date(transaction.timestamp))}
              </p>
            </div>

            {/* Status Badge */}
            <StatusBadge status={transaction.status} />

            {/* Arrow */}
            <ChevronRight className="w-5 h-5 text-text-tertiary group-hover:text-primary-light group-hover:translate-x-1 transition-all" />
          </GlassCard>
        </motion.div>
      ))}
    </motion.div>
  );
}
