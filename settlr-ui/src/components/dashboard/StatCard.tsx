/**
 * Stat Card Component
 * 
 * Shows a single metric with icon, value, and label.
 * Used for Total Sent, Total Received, Success Rate, etc.
 * 
 * Features:
 * - Counts up from 0 on mount
 * - Icon with colored background
 * - Hover lift effect
 * - Descriptive label
 */

import { GlassCard } from '@/components/ui/GlassCard';
import { AmountDisplay } from '@/components/ui/AmountDisplay';
import { useCountUp } from '@/hooks/useCountUp';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  valuePaise?: number;        // For money amounts
  valueNumber?: number;       // For non-money numbers (percentages, counts)
  valueFormat?: 'money' | 'number' | 'percent';
  icon: LucideIcon;
  iconColor: 'primary' | 'success' | 'danger' | 'warning';
  trend?: string;             // e.g., "+12% vs yesterday"
}

const iconColorClasses = {
  primary: 'bg-primary-soft text-primary-400',
  success: 'bg-success-soft text-success-400',
  danger:  'bg-danger-soft text-danger-400',
  warning: 'bg-warning-soft text-warning-400',
};

export function StatCard({ 
  label, 
  valuePaise, 
  valueNumber = 0,
  valueFormat = 'money',
  icon: Icon,
  iconColor,
  trend,
}: StatCardProps) {
  // For non-money values, use count-up animation
  const animatedNumber = useCountUp(valueNumber, 1000);

  return (
    <GlassCard hoverable className="space-y-4">
      {/* Icon */}
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${iconColorClasses[iconColor]}`}>
        <Icon size={22} />
      </div>

      {/* Value */}
      <div>
        {valueFormat === 'money' && valuePaise !== undefined && (
          <AmountDisplay
            paise={valuePaise}
            size="xl"
            animate
            className="block mb-1"
          />
        )}
        {valueFormat === 'number' && (
          <div className="text-stat font-bold text-text-primary">
            {animatedNumber.toLocaleString('en-IN')}
          </div>
        )}
        {valueFormat === 'percent' && (
          <div className="text-stat font-bold text-text-primary">
            {animatedNumber}%
          </div>
        )}

        <p className="text-sm text-text-secondary font-medium">
          {label}
        </p>

        {/* Optional trend indicator */}
        {trend && (
          <p className="text-xs text-text-muted mt-1">
            {trend}
          </p>
        )}
      </div>
    </GlassCard>
  );
}
