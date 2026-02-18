// FraudScoreBadge — color-coded risk level indicator
import { cn } from '../../lib/cn';

interface FraudScoreBadgeProps {
  score: number;
  className?: string;
}

/** Color-coded badge: 0-29 green, 30-59 yellow, 60-79 orange, 80+ red */
export function FraudScoreBadge({ score, className }: FraudScoreBadgeProps) {
  if (score < 30) {
    return (
      <span
        className={cn(
          'text-xs font-medium px-2 py-0.5 rounded-badge',
          'bg-success-bg text-success-text',
          className,
        )}
      >
        {score} · Low Risk
      </span>
    );
  }

  if (score < 60) {
    return (
      <span
        className={cn(
          'text-xs font-medium px-2 py-0.5 rounded-badge',
          'bg-warning-bg text-warning-text',
          className,
        )}
      >
        {score} · Review
      </span>
    );
  }

  if (score < 80) {
    return (
      <span
        className={cn(
          'text-xs font-medium px-2 py-0.5 rounded-badge',
          'bg-warning-bg text-warning-text',
          className,
        )}
      >
        {score} · High Risk
      </span>
    );
  }

  return (
    <span
      className={cn(
        'text-xs font-medium px-2 py-0.5 rounded-badge',
        'bg-danger-bg text-danger-text',
        className,
      )}
    >
      {score} · Blocked
    </span>
  );
}
