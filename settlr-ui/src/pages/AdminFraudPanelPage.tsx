/**
 * Admin Fraud Panel Page
 * 
 * Fraud monitoring dashboard for administrators:
 * - Key metrics (flagged count, false positive rate, blocked amount)
 * - Real-time flagged transactions table
 * - Risk score distribution
 * - Action controls (approve/block)
 * 
 * Uses danger/warning color scheme for emphasis.
 */

import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, TrendingDown, DollarSign } from 'lucide-react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { FraudMetricCard, FlaggedTransactionsTable, type FlaggedTransaction } from '@/components/fraud';
import { staggerContainer, staggerItem } from '@/animations/variants';
import { useFraudStats, useApproveFraud, useBlockFraud } from '@/hooks/useFraud';
import { useFlaggedTransactions } from '@/hooks/useAdminMetrics';
import type { FlaggedTransaction as APIFlaggedTransaction } from '@/types';

export function AdminFraudPanelPage() {
  const navigate = useNavigate();
  const { data: statsData } = useFraudStats();
  const { data: flaggedData } = useFlaggedTransactions();
  const { mutate: approveFraud } = useApproveFraud();
  const { mutate: blockFraud } = useBlockFraud();

  // Map API FlaggedTransaction to local FlaggedTransaction type
  const mappedTransactions: FlaggedTransaction[] = useMemo(() => {
    if (!flaggedData?.data) return [];

    return flaggedData.data.map((txn: APIFlaggedTransaction) => {
      // Calculate total risk score from signals
      const riskScore = txn.fraudScore || txn.signals.reduce((sum, sig) => sum + sig.scoreAdded, 0);
      
      return {
        id: txn.id,
        fromName: txn.fromUserName || 'Unknown',
        toName: txn.toUserName || 'Unknown',
        amountPaise: txn.amount,
        riskScore,
        signals: txn.signals.map(s => s.ruleName),
        timestamp: txn.createdAt,
        status: txn.status === 'fraud_blocked' ? 'blocked' as const
          : txn.status === 'completed' ? 'approved' as const
          : 'pending' as const,
      };
    });
  }, [flaggedData]);

  const handleApprove = (id: string) => {
    approveFraud(id);
  };

  const handleBlock = (id: string) => {
    blockFraud(id);
  };

  const handleViewDetails = (transaction: FlaggedTransaction) => {
    navigate(`/transactions/${transaction.id}`);
  };

  const pendingCount = mappedTransactions.filter((t) => t.status === 'pending').length;
  const metrics = statsData?.data || {
    totalFlagged: 0,
    falsePositiveRate: 0,
    avgRiskScore: 0,
    blockedAmountPaise: 0,
  };

  return (
    <PageWrapper>
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-danger-dark/20 flex items-center justify-center shadow-glow-danger">
          <Shield className="w-6 h-6 text-danger-light" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-1">
            Fraud Detection Panel
          </h1>
          <p className="text-text-secondary">
            {pendingCount} {pendingCount === 1 ? 'transaction' : 'transactions'} requiring review
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
      >
        <motion.div variants={staggerItem}>
          <FraudMetricCard
            label="Total Flagged"
            value={metrics.totalFlagged}
            valueFormat="number"
            icon={AlertTriangle}
            variant="danger"
            trend="Last 24 hours"
          />
        </motion.div>

        <motion.div variants={staggerItem}>
          <FraudMetricCard
            label="False Positive Rate"
            value={metrics.falsePositiveRate}
            valueFormat="percent"
            icon={TrendingDown}
            variant="warning"
            trend="Target: < 15%"
          />
        </motion.div>

        <motion.div variants={staggerItem}>
          <FraudMetricCard
            label="Avg Risk Score"
            value={metrics.avgRiskScore}
            valueFormat="number"
            icon={Shield}
            variant="warning"
            trend="Flagged transactions"
          />
        </motion.div>

        <motion.div variants={staggerItem}>
          <FraudMetricCard
            label="Blocked Amount"
            value={metrics.blockedAmountPaise}
            valueFormat="money"
            icon={DollarSign}
            variant="danger"
            trend="Prevented losses"
          />
        </motion.div>
      </motion.div>

      {/* Flagged Transactions Table */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Flagged Transactions
        </h2>
        <FlaggedTransactionsTable
          transactions={mappedTransactions}
          onApprove={handleApprove}
          onBlock={handleBlock}
          onViewDetails={handleViewDetails}
        />
      </div>
    </PageWrapper>
  );
}
