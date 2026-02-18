// FraudSignalRow — one fraud rule result with green check or red warning
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/cn';
import type { FraudSignal } from '../../types';

interface FraudSignalRowProps {
  signal: FraudSignal;
}

// Map internal rule names to friendly display names
const RULE_DISPLAY_NAMES: Record<string, string> = {
  VELOCITY_CHECK: 'Velocity Check',
  AMOUNT_ANOMALY: 'Amount Anomaly',
  UNUSUAL_HOUR: 'Unusual Hour',
  NEW_ACCOUNT: 'New Account',
  ROUND_AMOUNT: 'Round Amount',
  RECIPIENT_RISK: 'Recipient Risk',
};

/** Shows one fraud rule with check/warning icon, name, score, and description */
export function FraudSignalRow({ signal }: FraudSignalRowProps) {
  const fired = signal.scoreAdded > 0;

  return (
    <div className="flex items-center justify-between py-3 border-b border-bg-border last:border-0">
      <div className="flex items-center gap-3">
        {fired ? (
          <AlertTriangle className="w-4 h-4 text-danger-DEFAULT flex-shrink-0" />
        ) : (
          <CheckCircle2 className="w-4 h-4 text-success-DEFAULT flex-shrink-0" />
        )}
        <div>
          <p className="text-sm font-medium text-text-secondary">
            {RULE_DISPLAY_NAMES[signal.ruleName] ?? signal.ruleName}
          </p>
          {signal.description && (
            <p className="text-xs text-text-muted">{signal.description}</p>
          )}
        </div>
      </div>
      <span
        className={cn(
          'text-xs font-mono',
          fired ? 'text-danger-text font-semibold' : 'text-text-muted',
        )}
      >
        {fired ? `+${signal.scoreAdded} pts` : '0 pts'}
      </span>
    </div>
  );
}
