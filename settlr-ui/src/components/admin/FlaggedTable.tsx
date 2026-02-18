// FlaggedTable — high-risk transactions requiring review
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ExternalLink, ShieldCheck, ShieldX } from 'lucide-react';
import { formatCurrency } from '../../lib/formatCurrency';
import { timeAgo } from '../../lib/formatDate';
import { cn } from '../../lib/cn';
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import type { FlaggedTransaction } from '../../types';

interface FlaggedTableProps {
  transactions: FlaggedTransaction[];
  isLoading: boolean;
}

/** Cards showing flagged transactions sorted by score descending */
export function FlaggedTable({ transactions, isLoading }: FlaggedTableProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-48 bg-bg-tertiary rounded-card animate-pulse" />
        ))}
      </div>
    );
  }

  // Sort by fraud score descending
  const sorted = [...transactions].sort((a, b) => (b.fraudScore ?? 0) - (a.fraudScore ?? 0));

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="No flagged transactions right now"
        description="All transactions are within normal risk levels"
      />
    );
  }

  return (
    <div className="space-y-4">
      {sorted.map((txn) => {
        const score = txn.fraudScore ?? 0;
        const signals = txn.signals || [];

        return (          <div key={txn.id}>          <Card className="space-y-3 border border-bg-border">
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-text-muted truncate max-w-[200px]">
                {txn.id}
              </span>
              <span
                className={cn(
                  'text-xs font-semibold px-2 py-0.5 rounded-badge',
                  score >= 80
                    ? 'bg-danger-bg text-danger-text'
                    : score >= 60
                      ? 'bg-warning-bg text-warning-text'
                      : 'bg-warning-bg text-warning-text',
                )}
              >
                Score: {score}
              </span>
            </div>

            {/* Transaction info */}
            <div className="flex items-center gap-3">
              <Avatar name={txn.fromUserName || 'Unknown'} size="md" />
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">
                  {txn.fromUserName || 'Unknown'} → {txn.toUserName || 'Unknown'}
                </p>
                <p className="text-xs text-text-secondary">
                  {formatCurrency(txn.amount)} · {timeAgo(txn.createdAt)}
                </p>
              </div>
            </div>

            {/* Signals that fired */}
            {signals.length > 0 && (
              <div className="space-y-1 pt-2 border-t border-bg-border">
                <p className="text-xs text-text-muted">Signals that fired:</p>
                {signals
                  .filter((s) => s.scoreAdded > 0)
                  .map((signal) => (
                    <div key={signal.ruleName} className="flex items-center gap-2">
                      <AlertTriangle
                        className={cn(
                          'w-3 h-3 flex-shrink-0',
                          signal.scoreAdded >= 20 ? 'text-danger-DEFAULT' : 'text-warning-DEFAULT',
                        )}
                      />
                      <span className="text-xs text-text-secondary">
                        {signal.ruleName}
                      </span>
                      <span className="text-xs font-mono text-danger-text">+{signal.scoreAdded}</span>
                      {signal.description && (
                        <span className="text-xs text-text-muted truncate">{signal.description}</span>
                      )}
                    </div>
                  ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-bg-border">
              <Button
                label="View Detail"
                onClick={() => navigate(`/transactions/${txn.id}`)}
                variant="ghost"
                icon={ExternalLink}
              />
              <div className="flex gap-2">
                <Button
                  label="Mark Safe"
                  onClick={() => { /* TODO: API call */ }}
                  variant="secondary"
                  icon={ShieldCheck}
                />
                <Button
                  label="Confirm Block"
                  onClick={() => { /* TODO: API call */ }}
                  variant="danger"
                  icon={ShieldX}
                />
              </div>
            </div>
          </Card>
          </div>
        );
      })}
    </div>
  );
}
