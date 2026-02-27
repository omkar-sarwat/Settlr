/**
 * DashboardRecentTxns Component
 *
 * Compact recent transactions row for the dashboard.
 * Shows a horizontal card with the latest transaction
 * and a "See All" link. Matches the reference UI's bottom
 * transaction bar style (brand icon, status badge, amount).
 *
 * Amounts in paise.
 */

import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, ArrowDownLeft, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/lib/formatCurrency';
import { timeAgo } from '@/lib/formatDate';
import type { Transaction } from '@/types';
import { StatusBadge } from '@/components/ui/Badge';

interface DashboardRecentTxnsProps {
  transactions: Transaction[];
  currentAccountId: string;
}

export function DashboardRecentTxns({
  transactions,
  currentAccountId,
}: DashboardRecentTxnsProps) {
  const navigate = useNavigate();

  // Show at most 3 recent transactions
  const display = transactions.slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.35 }}
      className="rounded-3xl bg-white/[0.02] backdrop-blur-lg border border-white/[0.06] p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-text-primary">
            Recent transaction
          </h3>
          <span className="text-xs font-medium text-text-muted bg-white/[0.06] px-2 py-0.5 rounded-md">
            {transactions.length}
          </span>
        </div>
        <button
          onClick={() => navigate('/transactions')}
          className="flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          See All <ChevronRight size={14} />
        </button>
      </div>

      {/* Transaction rows */}
      {display.length === 0 ? (
        <p className="text-sm text-text-muted py-4 text-center">
          No transactions yet. Send your first payment!
        </p>
      ) : (
        <div className="space-y-1">
          {display.map((tx) => {
            const isSent = tx.fromAccountId === currentAccountId;
            const displayName = isSent
              ? tx.toUserName || 'Unknown'
              : tx.fromUserName || 'Unknown';

            return (
              <motion.div
                key={tx.id}
                whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                onClick={() => navigate('/transactions')}
                className="flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-colors"
              >
                {/* Direction icon */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isSent ? 'bg-danger-500/10' : 'bg-success-500/10'
                  }`}
                >
                  {isSent ? (
                    <ArrowUpRight size={18} className="text-danger-400" />
                  ) : (
                    <ArrowDownLeft size={18} className="text-success-400" />
                  )}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {displayName}
                  </p>
                </div>

                {/* Status badge */}
                <StatusBadge status={tx.status} />

                {/* Date */}
                <span className="text-xs text-text-muted whitespace-nowrap hidden sm:block">
                  {timeAgo(tx.createdAt)}
                </span>

                {/* Masked account */}
                <span className="text-xs text-text-muted font-mono hidden md:block">
                  **{(tx.fromAccountId || '').slice(-4)}
                </span>

                {/* Amount */}
                <span
                  className={`text-sm font-semibold font-mono whitespace-nowrap ${
                    isSent ? 'text-danger-400' : 'text-success-400'
                  }`}
                >
                  {isSent ? '-' : '+'}
                  {formatCurrency(tx.amount)}
                </span>

                {/* More */}
                <button className="text-text-muted hover:text-text-primary transition-colors">
                  <ChevronRight size={16} />
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
