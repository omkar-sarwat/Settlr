/**
 * Transaction Detail Panel
 * 
 * Slide-in panel showing full transaction details:
 * - Transaction summary card
 * - Ledger trail (double-entry bookkeeping)
 * - Fraud analysis (if flagged)
 * - Metadata (ID, timestamp, etc.)
 * 
 * Animated slide from right with glassmorphism.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertTriangle, Clock, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GlassCard } from '@/components/ui/GlassCard';
import { GhostButton } from '@/components/ui/GhostButton';
import { StatusBadge } from '@/components/ui/Badge';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { slideInRight } from '@/animations/variants';
import { getTransactionById } from '@/api/payment.api';
import type { TransactionDetailResponse } from '@/types';
import type { Transaction } from './TransactionList';

interface TransactionDetailPanelProps {
  transaction: Transaction | null;
  onClose: () => void;
}

export function TransactionDetailPanel({ transaction, onClose }: TransactionDetailPanelProps) {
  const [copiedId, setCopiedId] = useState(false);

  // Fetch real ledger entries from the backend when a transaction is selected
  const { data: detailData, isLoading: ledgerLoading } = useQuery({
    queryKey: ['transaction-detail', transaction?.id],
    queryFn: () => getTransactionById(transaction!.id),
    enabled: !!transaction?.id,
    staleTime: 60_000,
  });

  // Extract real ledger entries from the API response
  const detail = detailData as TransactionDetailResponse | undefined;
  const ledgerEntries = detail?.data?.ledger ?? [];

  const handleCopyId = () => {
    if (!transaction) return;
    navigator.clipboard.writeText(transaction.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <AnimatePresence mode="wait">
      {transaction && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Panel */}
          <motion.div
            variants={slideInRight}
            initial="initial"
            animate="animate"
            exit="exit"
            className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-bg-base border-l border-border-default z-50 overflow-y-auto"
          >
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between sticky top-0 bg-bg-base/80 backdrop-blur-lg pb-4 border-b border-border-default">
                <h2 className="text-xl font-bold text-text-primary">
                  Transaction Details
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-bg-elevated text-text-tertiary hover:text-text-primary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Hero */}
              <GlassCard
                variant={
                  transaction.status === 'success'
                    ? 'success'
                    : transaction.status === 'failed'
                    ? 'danger'
                    : 'default'
                }
                className="text-center p-6"
              >
                {transaction.status === 'success' && (
                  <CheckCircle className="w-12 h-12 text-success-light mx-auto mb-3" />
                )}
                {transaction.status === 'failed' && (
                  <AlertTriangle className="w-12 h-12 text-danger-light mx-auto mb-3" />
                )}
                {transaction.status === 'pending' && (
                  <Clock className="w-12 h-12 text-warning-light mx-auto mb-3" />
                )}

                <p className="text-sm text-text-secondary mb-2">
                  {transaction.type === 'sent' ? 'Sent to' : 'Received from'}
                </p>
                <p className="text-xl font-bold text-text-primary mb-1">
                  {transaction.counterpartyName}
                </p>
                <p className="text-3xl font-bold font-mono text-text-primary mb-3">
                  {transaction.type === 'received' ? '+' : '-'}
                  {formatCurrency(transaction.amountPaise)}
                </p>
                <StatusBadge status={transaction.status} />
              </GlassCard>

              {/* Transaction Info */}
              <GlassCard className="p-5 space-y-4">
                <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
                  Transaction Info
                </h3>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-text-tertiary text-sm">Transaction ID</span>
                    <button
                      onClick={handleCopyId}
                      className="flex items-center gap-2 text-text-primary text-sm font-mono hover:text-primary-light transition-colors"
                    >
                      <span className="truncate max-w-[180px]">{transaction.id}</span>
                      {copiedId ? (
                        <Check className="w-4 h-4 text-success-light" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-text-tertiary text-sm">Date & Time</span>
                    <span className="text-text-primary text-sm">
                      {formatDate(new Date(transaction.timestamp))}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-text-tertiary text-sm">Type</span>
                    <span className="text-text-primary text-sm capitalize">
                      {transaction.type}
                    </span>
                  </div>

                  {transaction.purpose && (
                    <div className="flex justify-between">
                      <span className="text-text-tertiary text-sm">Purpose</span>
                      <span className="text-text-primary text-sm">
                        {transaction.purpose}
                      </span>
                    </div>
                  )}
                </div>
              </GlassCard>

              {/* Ledger Trail — Real double-entry bookkeeping data from database */}
              <GlassCard className="p-5">
                <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-4">
                  Ledger Trail
                </h3>

                {ledgerLoading ? (
                  <div className="space-y-3">
                    {[0, 1].map((i) => (
                      <div key={i} className="h-16 rounded-lg bg-bg-elevated/50 animate-pulse" />
                    ))}
                  </div>
                ) : ledgerEntries.length === 0 ? (
                  <p className="text-sm text-text-muted text-center py-4">No ledger entries found</p>
                ) : (
                  <div className="space-y-3">
                    {ledgerEntries.map((entry: { id: string; accountId: string; entryType: string; amount: number; balanceBefore: number; balanceAfter: number }) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-bg-elevated/50"
                      >
                        <div>
                          <p className="text-sm font-medium text-text-primary">
                            {entry.accountId === transaction.counterpartyAccount
                              ? transaction.counterpartyName
                              : 'Your Account'}
                          </p>
                          <p className="text-xs text-text-muted mt-0.5">
                            {entry.entryType === 'debit' ? 'Debit' : 'Credit'}
                          </p>
                          <p className="text-xs text-text-muted">
                            Balance: {formatCurrency(Number(entry.balanceBefore))} → {formatCurrency(Number(entry.balanceAfter))}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-mono font-semibold ${
                            entry.entryType === 'debit' ? 'text-danger-light' : 'text-success-light'
                          }`}>
                            {entry.entryType === 'debit' ? '-' : '+'}{formatCurrency(Number(entry.amount))}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>

              {/* Close Button */}
              <GhostButton onClick={onClose} className="w-full">
                Close
              </GhostButton>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
