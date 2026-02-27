/**
 * Flagged Transactions Table Component
 * 
 * Table showing transactions flagged by fraud engine:
 * - Transaction details
 * - Risk score (0-100)
 * - Signal indicators
 * - Action buttons (approve/block)
 * 
 * Sortable and filterable.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, XCircle, Eye } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GhostButton } from '@/components/ui/GhostButton';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, timeAgo } from '@/lib/formatters';
import { staggerContainer, staggerItem } from '@/animations/variants';

export interface FlaggedTransaction {
  id: string;
  fromName: string;
  toName: string;
  amountPaise: number;
  riskScore: number; // 0-100
  signals: string[]; // e.g., ['velocity', 'unusual_time', 'large_amount']
  timestamp: string;
  status: 'pending' | 'approved' | 'blocked';
}

interface FlaggedTransactionsTableProps {
  transactions: FlaggedTransaction[];
  onApprove: (id: string) => void;
  onBlock: (id: string) => void;
  onViewDetails: (transaction: FlaggedTransaction) => void;
}

export function FlaggedTransactionsTable({
  transactions,
  onApprove,
  onBlock,
  onViewDetails,
}: FlaggedTransactionsTableProps) {
  const [sortBy, setSortBy] = useState<'riskScore' | 'timestamp'>('riskScore');

  const sortedTransactions = [...transactions].sort((a, b) => {
    if (sortBy === 'riskScore') {
      return b.riskScore - a.riskScore; // Highest risk first
    } else {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(); // Newest first
    }
  });

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'text-danger-light';
    if (score >= 50) return 'text-warning-light';
    return 'text-success-light';
  };

  const getRiskBadgeVariant = (score: number): 'danger' | 'warning' | 'primary' => {
    if (score >= 80) return 'danger';
    if (score >= 50) return 'warning';
    return 'primary';
  };

  if (transactions.length === 0) {
    return (
      <GlassCard className="text-center py-12">
        <CheckCircle className="w-12 h-12 text-success-light mx-auto mb-3" />
        <p className="text-text-primary font-medium">No flagged transactions</p>
        <p className="text-sm text-text-tertiary mt-1">All systems operational</p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sort Controls */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-text-secondary">Sort by:</span>
        <div className="flex gap-2">
          <button
            onClick={() => setSortBy('riskScore')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
              sortBy === 'riskScore'
                ? 'bg-primary-dark text-white shadow-glow-primary'
                : 'text-text-tertiary hover:text-text-primary hover:bg-bg-elevated'
            }`}
          >
            Risk Score
          </button>
          <button
            onClick={() => setSortBy('timestamp')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
              sortBy === 'timestamp'
                ? 'bg-primary-dark text-white shadow-glow-primary'
                : 'text-text-tertiary hover:text-text-primary hover:bg-bg-elevated'
            }`}
          >
            Time
          </button>
        </div>
      </div>

      {/* Table */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="space-y-3"
      >
        {sortedTransactions.map((transaction) => (
          <motion.div key={transaction.id} variants={staggerItem}>
            <GlassCard
              hoverable
              className={`${
                transaction.riskScore >= 80 ? 'border-danger-dark/50' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Risk Indicator */}
                <div className="flex-shrink-0">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    transaction.riskScore >= 80
                      ? 'bg-danger-dark/20'
                      : transaction.riskScore >= 50
                      ? 'bg-warning-dark/20'
                      : 'bg-primary-dark/20'
                  }`}>
                    <AlertTriangle className={`w-6 h-6 ${getRiskColor(transaction.riskScore)}`} />
                  </div>
                </div>

                {/* Transaction Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-text-primary font-medium">
                      {transaction.fromName} → {transaction.toName}
                    </p>
                    <Badge variant={getRiskBadgeVariant(transaction.riskScore)}>
                      Risk: {transaction.riskScore}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <span className="font-mono font-semibold text-text-primary">
                      {formatCurrency(transaction.amountPaise)}
                    </span>
                    <span className="text-text-tertiary">
                      {timeAgo(new Date(transaction.timestamp))}
                    </span>
                    <span className="text-text-muted font-mono">
                      {transaction.id}
                    </span>
                  </div>

                  {/* Signal Tags */}
                  {transaction.signals.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {transaction.signals.map((signal) => (
                        <span
                          key={signal}
                          className="px-2 py-0.5 rounded text-xs bg-bg-elevated text-text-tertiary border border-border-default"
                        >
                          {signal.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                {transaction.status === 'pending' && (
                  <div className="flex gap-2">
                    <GhostButton
                      size="sm"
                      onClick={() => onViewDetails(transaction)}
                    >
                      <Eye className="w-4 h-4" />
                    </GhostButton>
                    <GhostButton
                      size="sm"
                      onClick={() => onApprove(transaction.id)}
                      className="hover:text-success-light hover:border-success-dark"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </GhostButton>
                    <GhostButton
                      size="sm"
                      onClick={() => onBlock(transaction.id)}
                      className="hover:text-danger-light hover:border-danger-dark"
                    >
                      <XCircle className="w-4 h-4" />
                    </GhostButton>
                  </div>
                )}

                {transaction.status === 'approved' && (
                  <Badge variant="success">Approved</Badge>
                )}

                {transaction.status === 'blocked' && (
                  <Badge variant="danger">Blocked</Badge>
                )}
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
