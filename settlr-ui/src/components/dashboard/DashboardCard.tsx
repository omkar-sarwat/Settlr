/**
 * DashboardCard Component
 *
 * Small summary card for Income or Expense.
 * Shows amount, weekly trend badge, and "This week's income/expense" label.
 * Income card = green accent, Expense card = red accent.
 *
 * All money in paise.
 */

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useCountUp } from '@/hooks/useCountUp';

interface DashboardCardProps {
  title: 'Income' | 'Expense';
  /** Amount in paise */
  amount: number;
  /** Percentage trend (positive = up, negative = down) */
  trend: number;
  type: 'income' | 'expense';
}

function formatCompact(paise: number): string {
  const rupees = Math.abs(paise) / 100;
  return rupees.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function DashboardCard({ title, amount, trend, type }: DashboardCardProps) {
  const animatedAmount = useCountUp(Math.abs(amount), 900);
  const isPositive = trend >= 0;
  const isIncome = type === 'income';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
      className="relative h-full rounded-3xl overflow-hidden p-5 flex flex-col justify-between"
      style={{
        background: isIncome
          ? 'linear-gradient(135deg, #0a2018 0%, #0f1a14 60%, #0f0f13 100%)'
          : 'linear-gradient(135deg, #1a0f0f 0%, #180d0d 60%, #0f0f13 100%)',
      }}
    >
      {/* Accent glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isIncome
            ? 'radial-gradient(ellipse at 30% 30%, rgba(16,185,129,0.10) 0%, transparent 60%)'
            : 'radial-gradient(ellipse at 30% 30%, rgba(239,68,68,0.08) 0%, transparent 60%)',
        }}
      />

      <div className="relative">
        <p className="text-sm font-medium text-text-secondary mb-2">{title}</p>
        <div className="flex items-baseline gap-1">
          <span
            className={`text-2xl font-bold tracking-tight ${
              isIncome ? 'text-success-400' : 'text-danger-400'
            }`}
          >
            {isIncome ? '+' : '-'}₹{formatCompact(animatedAmount)}
          </span>
          <span
            className={`text-xs font-medium ${
              isIncome ? 'text-success-400/60' : 'text-danger-400/60'
            }`}
          >
            ₹
          </span>
        </div>
      </div>

      <div className="relative flex items-center justify-between mt-auto pt-3">
        <p className="text-xs text-text-muted">
          This week&apos;s {type}
        </p>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${
            isPositive
              ? 'bg-success-500/15 text-success-400'
              : 'bg-danger-500/15 text-danger-400'
          }`}
        >
          {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(trend).toFixed(1)}%
        </motion.div>
      </div>
    </motion.div>
  );
}
