// Status badge — fintech dark mode status indicator
import { cn } from '../../lib/cn';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'muted';

interface BadgeProps {
  label: string;
  variant: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-success-bg text-success-text border border-success-DEFAULT/50',
  warning: 'bg-warning-bg text-warning-DEFAULT border border-warning-DEFAULT/50',
  danger:  'bg-danger-bg text-danger text-danger-text border border-danger/50',
  info:    'bg-info-bg text-info text-info-text border border-info/50',
  muted:   'bg-bg-tertiary text-text-muted border border-bg-tertiary/50',
};

/** Small colored label for status display — dark mode fintech. Maps transaction status to color. */
export function Badge({ label, variant, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'text-xs font-semibold px-2 py-1 rounded-lg whitespace-nowrap inline-block',
        'transition-all duration-200',
        variantClasses[variant],
        className,
      )}
    >
      {label}
    </span>
  );
}

/** Maps transaction status string to the correct badge variant and label */
export function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <Badge label="Completed" variant="success" />;
    case 'pending':
      return <Badge label="Pending" variant="warning" />;
    case 'failed':
      return <Badge label="Failed" variant="danger" />;
    case 'reversed':
      return <Badge label="Reversed" variant="info" />;
    case 'fraud_blocked':
      return <Badge label="Blocked" variant="danger" />;
    default:
      return <Badge label={status} variant="muted" />;
  }
}
