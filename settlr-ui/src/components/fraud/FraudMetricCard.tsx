/**
 * Fraud Metric Card Component
 * 
 * Displays fraud-related metrics:
 * - Total flagged transactions
 * - False positive rate
 * - Average risk score
 * - Blocked amount
 * 
 * Uses danger/warning colors for emphasis.
 */

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { useCountUp } from '@/hooks/useCountUp';
import { formatCurrency } from '@/lib/formatters';
import { scaleIn } from '@/animations/variants';

interface FraudMetricCardProps {
  label: string;
  value: number;
  valueFormat: 'number' | 'percent' | 'money';
  icon: LucideIcon;
  variant?: 'danger' | 'warning' | 'primary';
  trend?: string;
}

export function FraudMetricCard({
  label,
  value,
  valueFormat,
  icon: Icon,
  variant = 'danger',
  trend,
}: FraudMetricCardProps) {
  const animatedValue = useCountUp(value, 1500);

  const variantStyles = {
    danger: {
      bg: 'from-danger-dark/10 to-transparent',
      icon: 'text-danger-light',
      glow: 'shadow-glow-danger',
    },
    warning: {
      bg: 'from-warning-dark/10 to-transparent',
      icon: 'text-warning-light',
      glow: 'shadow-glow-warning',
    },
    primary: {
      bg: 'from-primary-dark/10 to-transparent',
      icon: 'text-primary-light',
      glow: 'shadow-glow-primary',
    },
  };

  const styles = variantStyles[variant];

  return (
    <motion.div variants={scaleIn} initial="initial" animate="animate">
      <GlassCard hoverable className={`bg-gradient-to-br ${styles.bg}`}>
        <div className="flex items-start justify-between mb-4">
          <p className="text-sm text-text-secondary font-medium">{label}</p>
          <div className={`p-2.5 rounded-lg ${styles.glow}`}>
            <Icon className={`w-5 h-5 ${styles.icon}`} />
          </div>
        </div>

        <p className="text-3xl font-bold text-text-primary font-mono mb-2">
          {valueFormat === 'money'
            ? formatCurrency(animatedValue)
            : valueFormat === 'percent'
            ? `${animatedValue.toFixed(1)}%`
            : animatedValue.toLocaleString()}
        </p>

        {trend && (
          <p className="text-xs text-text-muted">{trend}</p>
        )}
      </GlassCard>
    </motion.div>
  );
}
