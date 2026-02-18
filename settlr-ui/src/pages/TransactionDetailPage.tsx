// TransactionDetailPage — full transaction info, fraud analysis, ledger trail
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Copy, Check, Shield, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { getTransactionById } from '../api/payment.api';
import { getMyAccounts } from '../api/account.api';
import { formatCurrency } from '../lib/formatCurrency';
import { formatFullDate } from '../lib/formatDate';
import { cn } from '../lib/cn';
import { Card } from '../components/ui/Card';
import { Avatar } from '../components/ui/Avatar';
import { StatusBadge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';
import { FraudSignalRow } from '../components/transactions/FraudSignalRow';
import { LedgerTable } from '../components/transactions/LedgerTable';

/** Transaction detail page — shows full info, fraud analysis, and ledger trail */
export function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  // Fetch transaction detail
  const { data, isLoading, error } = useQuery({
    queryKey: ['transaction', id],
    queryFn: () => getTransactionById(id!),
    enabled: !!id,
  });

  // Fetch accounts to determine sent vs received
  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: getMyAccounts,
    staleTime: 30_000,
  });

  const currentAccountId = accountsData?.data?.[0]?.id ?? '';

  function handleCopyId() {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <p className="text-text-secondary">Transaction not found</p>
        <button
          onClick={() => navigate('/transactions')}
          className="text-brand-light hover:underline text-sm mt-2 cursor-pointer"
        >
          Back to Transactions
        </button>
      </div>
    );
  }

  const { transaction, signals, ledger } = data.data;
  const isSent = transaction.fromAccountId === currentAccountId;
  const displayName = isSent
    ? (transaction.toUserName || 'Unknown')
    : (transaction.fromUserName || 'Unknown');
  const fraudScore = transaction.fraudScore ?? 0;

  // Fraud action label
  function getFraudActionLabel(score: number): { label: string; className: string } {
    if (score < 30) return { label: 'AUTO APPROVED', className: 'text-success-text bg-success-bg' };
    if (score < 60) return { label: 'UNDER REVIEW', className: 'text-warning-text bg-warning-bg' };
    if (score < 80) return { label: 'HIGH RISK', className: 'text-warning-text bg-warning-bg' };
    return { label: 'BLOCKED', className: 'text-danger-text bg-danger-bg' };
  }

  const fraudAction = getFraudActionLabel(fraudScore);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/transactions')}
        className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Transactions
      </button>

      {/* Transaction header card */}
      <Card className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar name={displayName} size="lg" />
            <div>
              <p className="text-sm text-text-secondary">
                {isSent ? 'Sent to' : 'Received from'}
              </p>
              <p className="text-lg font-semibold text-text-primary">{displayName}</p>
              <p className="text-xs text-text-muted mt-0.5">
                {formatFullDate(transaction.createdAt)}
              </p>
            </div>
          </div>
          <StatusBadge status={transaction.status} />
        </div>

        {/* Amount */}
        <p
          className={cn(
            'text-3xl font-bold font-mono',
            isSent ? 'text-danger-text' : 'text-success-text',
          )}
        >
          {isSent ? '-' : '+'}{formatCurrency(transaction.amount)}
        </p>

        {/* Description */}
        {transaction.description && (
          <p className="text-sm text-text-secondary italic">
            &quot;{transaction.description}&quot;
          </p>
        )}

        {/* Transaction ID */}
        <div className="flex items-center gap-2 pt-2 border-t border-bg-border">
          <span className="text-xs text-text-muted">Transaction ID</span>
          <span className="text-xs font-mono text-text-secondary truncate max-w-[240px]">
            {transaction.id}
          </span>
          <button
            onClick={handleCopyId}
            className="p-1 hover:bg-bg-tertiary rounded transition-colors cursor-pointer"
            title="Copy ID"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-success-text" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-text-muted" />
            )}
          </button>
        </div>
      </Card>

      {/* Fraud analysis card */}
      <Card className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-brand-light" />
          <h3 className="text-sm font-semibold text-text-primary">Fraud Analysis</h3>
        </div>

        {/* Score and action */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-text-secondary">
              Risk Score: <span className="font-semibold text-text-primary">{fraudScore}</span> / 100
            </p>
          </div>
          <span className={cn('text-xs font-semibold px-3 py-1 rounded-badge', fraudAction.className)}>
            {fraudAction.label}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              fraudScore < 30 && 'bg-success-DEFAULT',
              fraudScore >= 30 && fraudScore < 60 && 'bg-warning-DEFAULT',
              fraudScore >= 60 && fraudScore < 80 && 'bg-warning-DEFAULT',
              fraudScore >= 80 && 'bg-danger-DEFAULT',
            )}
            style={{ width: `${Math.min(fraudScore, 100)}%` }}
          />
        </div>

        {/* Signal rows */}
        {signals.length > 0 && (
          <div className="pt-2">
            <p className="text-xs text-text-muted mb-2">
              Signals Checked ({signals.length} rules):
            </p>
            <div className="divide-y divide-bg-border">
              {signals.map((signal) => (
                <FraudSignalRow key={signal.ruleName} signal={signal} />
              ))}
            </div>
          </div>
        )}

        {/* Summary */}
        {signals.length > 0 && (
          <div className="flex items-center gap-2 pt-2 border-t border-bg-border">
            {fraudScore < 60 ? (
              <CheckCircle2 className="w-4 h-4 text-success-DEFAULT" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-danger-DEFAULT" />
            )}
            <span className="text-xs text-text-secondary">
              Total risk: {fraudScore} points from {signals.filter((s) => s.scoreAdded > 0).length} fired rule(s)
            </span>
          </div>
        )}
      </Card>

      {/* Ledger trail */}
      <LedgerTable entries={ledger} />
    </div>
  );
}
