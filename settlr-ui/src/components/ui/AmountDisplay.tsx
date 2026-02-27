/**
 * AmountDisplay Component
 * 
 * ALWAYS use this component to show money amounts.
 * Never show raw paise numbers to users.
 * 
 * This component:
 * - Converts paise to rupees automatically
 * - Formats with Indian locale (₹1,23,456.78)
 * - Can animate counting up from 0
 * - Colors based on positive/negative
 * - Shows + or - prefix optionally
 * 
 * Example:
 *   <AmountDisplay paise={50000} size="lg" animate />
 *   // Shows ₹500.00 counting up from 0
 */

import { useCountUp } from '@/hooks/useCountUp';
import { clsx } from 'clsx';

interface AmountDisplayProps {
  paise: number;           // Money in paise — this is always the input
  animate?: boolean;       // If true, number counts up from 0 on mount
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'balance';
  positive?: boolean;      // Show in green
  negative?: boolean;      // Show in red
  showSign?: boolean;      // Show + or - prefix
  className?: string;
}

const sizeClasses = {
  sm:      'text-sm font-mono',
  md:      'text-base font-mono font-medium',
  lg:      'text-xl font-mono font-semibold',
  xl:      'text-amount font-display font-bold tracking-tight',
  balance: 'text-balance font-display font-bold tracking-tight',
};

export function AmountDisplay({ 
  paise, 
  animate, 
  size = 'md', 
  positive, 
  negative, 
  showSign,
  className,
}: AmountDisplayProps) {
  // useCountUp returns 0 initially and counts to target over 1000ms
  const animatedPaise = useCountUp(paise, animate ? 1000 : 0);
  const displayPaise = animate ? animatedPaise : paise;

  // Always divide by 100 — store in paise, display in rupees
  const rupees = displayPaise / 100;
  const formatted = rupees.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <span className={clsx(
      sizeClasses[size],
      positive && 'text-success-400',
      negative && 'text-danger-400',
      !positive && !negative && 'text-text-primary',
      className,
    )}>
      {showSign && (positive ? '+' : negative ? '-' : '')}
      <span className="text-text-secondary opacity-70 mr-0.5">₹</span>
      {formatted}
    </span>
  );
}
