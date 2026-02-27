/**
 * Recent Activity Component
 * 
 * Displays last 5 transactions with stagger animation.
 * Each transaction shows:
 * - Avatar with initials
 * - Name and transaction type
 * - Amount (colored red for sent, green for received)
 * - Time ago
 * - Status badge
 * 
 * Clicking a transaction navigates to transaction history.
 */

import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownLeft, Receipt } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '@/components/ui/GlassCard';
import { Avatar } from '@/components/ui/Avatar';
import { AmountDisplay } from '@/components/ui/AmountDisplay';
import { StatusBadge } from '@/components/ui/Badge';
import { timeAgo } from '@/lib/formatters';
import { staggerContainer, staggerItem } from '@/animations/variants';
import { useRecentTransactions } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { Skeleton } from '@/components/ui/Skeleton';
import { useMemo } from 'react';
import type { Transaction } from '@/types';
import { Button } from '@/components/ui/Button';

export function RecentActivity() {
  const navigate = useNavigate();
  const {
    data: transactions,
    isLoading,
    isError,
    refetch,
  } = useRecentTransactions();
  const { data: accountsData } = useAccounts();

  // Get primary account ID to determine sent/received
  const primaryAccountId = accountsData?.data?.[0]?.id;

  // Map transactions to include type and recipient name
  const mappedTransactions = useMemo(() => {
    if (!transactions?.data || !primaryAccountId) return [];

    return transactions.data.map((txn: Transaction) => {
      const isSent = txn.fromAccountId === primaryAccountId;
      return {
        ...txn,
        type: isSent ? ('sent' as const) : ('received' as const),
        recipientName: isSent ? txn.toUserName : txn.fromUserName,
      };
    });
  }, [transactions, primaryAccountId]);

  return (
    <GlassCard>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">
            Recent Activity
          </h3>
          <p className="text-sm text-text-secondary mt-1">
            Last 5 transactions
          </p>
        </div>
        <button
          onClick={() => navigate('/transactions')}
          className="text-sm font-medium text-primary-400 hover:text-primary-300 transition-colors"
        >
          View All →
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <Skeleton className="w-10 h-10 rounded-xl" />
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="text-right">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="w-20 h-6 rounded-full" />
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {!isLoading && isError && (
        <div className="rounded-input border border-danger-DEFAULT/40 bg-danger-bg p-4 flex items-center justify-between">
          <p className="text-sm text-danger-text">Could not load recent activity.</p>
          <Button label="Retry" onClick={() => void refetch()} />
        </div>
      )}

      {/* Transaction List */}
      {!isLoading && !isError && mappedTransactions.length > 0 && (
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="space-y-1"
        >
          {mappedTransactions.map((txn) => (
            <motion.div
              key={txn.id}
              variants={staggerItem}
              className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-all duration-200 cursor-pointer group"
              whileHover={{ y: -1 }}
              onClick={() => navigate('/transactions')}
            >
              {/* Icon - Arrow Up (sent) or Arrow Down (received) */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                txn.type === 'sent' 
                  ? 'bg-danger-soft' 
                  : 'bg-success-soft'
              }`}>
                {txn.type === 'sent' ? (
                  <ArrowUpRight size={18} className="text-danger-400" />
                ) : (
                  <ArrowDownLeft size={18} className="text-success-400" />
                )}
              </div>

              {/* Avatar with initials */}
              <Avatar name={txn.recipientName || 'Unknown'} size="md" />

              {/* Name and type */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text-primary truncate">
                  {txn.recipientName || 'Unknown User'}
                </p>
                <p className="text-sm text-text-muted">
                  {txn.type === 'sent' ? 'Sent to' : 'Received from'}
                </p>
              </div>

              {/* Amount and time */}
              <div className="text-right">
                <AmountDisplay
                  paise={txn.amount}
                  size="md"
                  negative={txn.type === 'sent'}
                  positive={txn.type === 'received'}
                  showSign
                  className="block mb-1"
                />
                <p className="text-xs text-text-muted">
                  {timeAgo(new Date(txn.createdAt))}
                </p>
              </div>

              {/* Status badge */}
              <div>
                <StatusBadge status={txn.status} />
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Empty State (shown when no transactions) */}
      {!isLoading && !isError && mappedTransactions.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-soft flex items-center justify-center">
            <Receipt size={28} className="text-primary-400" />
          </div>
          <p className="text-text-secondary font-medium mb-2">
            No transactions yet
          </p>
          <p className="text-sm text-text-muted">
            Send your first payment to get started
          </p>
        </div>
      )}
    </GlassCard>
  );
}
