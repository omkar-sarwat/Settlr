/**
 * Badge Component
 * 
 * Small colored pill for showing status, labels, or tags.
 * 
 * Variants:
 * - success: Green - for completed, successful states
 * - danger:  Red - for failed, error states  
 * - warning: Yellow - for pending, review states
 * - neutral: Gray - for informational states
 * - primary: Indigo - for highlighted states
 */

import { clsx } from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'danger' | 'warning' | 'neutral' | 'primary';
  className?: string;
}

const variantClasses = {
  success: 'badge-success',
  danger:  'badge-danger',
  warning: 'badge-warning',
  neutral: 'badge-neutral',
  primary: 'badge-primary',
};

export function Badge({ children, variant = 'neutral', className }: BadgeProps) {
  return (
    <span className={clsx(variantClasses[variant], className)}>
      {children}
    </span>
  );
}

/** Maps transaction status string to the correct badge variant and label */
export function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <Badge variant="success">Completed</Badge>;
    case 'pending':
      return <Badge variant="warning">Pending</Badge>;
    case 'failed':
      return <Badge variant="danger">Failed</Badge>;
    case 'reversed':
      return <Badge variant="neutral">Reversed</Badge>;
    case 'fraud_blocked':
      return <Badge variant="danger">Blocked</Badge>;
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
}
