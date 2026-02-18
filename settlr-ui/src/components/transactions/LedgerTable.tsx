// LedgerTable — double-entry ledger trail (debit + credit)
import { ArrowDown, ArrowUp, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../../lib/formatCurrency';
import { Card } from '../ui/Card';
import { cn } from '../../lib/cn';
import type { LedgerEntry } from '../../types';

interface LedgerTableProps {
  entries: LedgerEntry[];
}

/** Shows debit/credit entries with balance before→after for double-entry verification */
export function LedgerTable({ entries }: LedgerTableProps) {
  if (entries.length === 0) return null;

  // Calculate totals to verify balance
  const totalDebit = entries
    .filter((e) => e.entryType === 'debit')
    .reduce((sum, e) => sum + e.amount, 0);
  const totalCredit = entries
    .filter((e) => e.entryType === 'credit')
    .reduce((sum, e) => sum + e.amount, 0);
  const isBalanced = totalDebit === totalCredit;

  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-base">📒</span>
        <h3 className="text-sm font-semibold text-text-primary">Ledger Trail</h3>
      </div>

      <div className="space-y-4">
        {entries.map((entry) => {
          const isDebit = entry.entryType === 'debit';

          return (
            <div
              key={entry.id}
              className={cn(
                'p-4 rounded-input border',
                isDebit
                  ? 'border-danger-DEFAULT/20 bg-danger-bg/30'
                  : 'border-success-DEFAULT/20 bg-success-bg/30',
              )}
            >
              {/* Entry header */}
              <div className="flex items-center gap-2 mb-3">
                {isDebit ? (
                  <ArrowUp className="w-4 h-4 text-danger-text" />
                ) : (
                  <ArrowDown className="w-4 h-4 text-success-text" />
                )}
                <span
                  className={cn(
                    'text-xs font-semibold uppercase tracking-wide',
                    isDebit ? 'text-danger-text' : 'text-success-text',
                  )}
                >
                  {entry.entryType}
                </span>
                <span className="text-xs text-text-muted font-mono">
                  Account: ••••{entry.accountId.slice(-4)}
                </span>
              </div>

              {/* Amount and balances */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-text-muted mb-1">Amount</p>
                  <p className="text-sm font-semibold text-text-primary font-mono">
                    {formatCurrency(entry.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-muted mb-1">Before</p>
                  <p className="text-sm text-text-secondary font-mono">
                    {formatCurrency(entry.balanceBefore)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-muted mb-1">After</p>
                  <p className="text-sm text-text-primary font-mono font-semibold">
                    {formatCurrency(entry.balanceAfter)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Balance verification */}
      {isBalanced && (
        <div className="flex items-center gap-2 pt-2 border-t border-bg-border">
          <CheckCircle2 className="w-4 h-4 text-success-DEFAULT" />
          <span className="text-xs text-success-text">
            Verified: total debited = total credited. No money lost.
          </span>
        </div>
      )}
    </Card>
  );
}
