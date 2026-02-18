// ConfirmStep — Step 3: review summary, confirm+send with idempotency key, success/failure screens
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Home,
  Send,
} from 'lucide-react';
import { useSendMoney } from '../../hooks/useSendMoney';
import { formatCurrency } from '../../lib/formatCurrency';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import type { RecipientInfo, Transaction } from '../../types';

interface ConfirmStepProps {
  fromAccountId: string;
  recipient: RecipientInfo;
  amountPaise: number;
  description: string;
  onBack: () => void;
  onReset: () => void;
}

type ConfirmState = 'review' | 'success' | 'failure';

/** Step 3 — review transfer details, send with idempotency key, show result */
export function ConfirmStep({
  fromAccountId,
  recipient,
  amountPaise,
  description,
  onBack,
  onReset,
}: ConfirmStepProps) {
  const navigate = useNavigate();

  // Generate idempotency key ONCE — useRef keeps it stable across re-renders
  const idempotencyKey = useRef<string>(crypto.randomUUID());

  const [screenState, setScreenState] = useState<ConfirmState>('review');
  const [resultTxn, setResultTxn] = useState<Transaction | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [copied, setCopied] = useState(false);

  const sendMutation = useSendMoney();

  async function handleConfirm() {
    try {
      const result = await sendMutation.mutateAsync({
        fromAccountId,
        toAccountId: recipient.accountId,
        amount: amountPaise,
        currency: 'INR',
        description: description || undefined,
        idempotencyKey: idempotencyKey.current,
      });
      setResultTxn(result.data);
      setScreenState('success');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Transfer could not be completed';
      setErrorMessage(message);
      setScreenState('failure');
    }
  }

  function handleCopyTxnId() {
    if (!resultTxn) return;
    navigator.clipboard.writeText(resultTxn.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSendAgain() {
    // Reset the idempotency key for new transfer
    idempotencyKey.current = crypto.randomUUID();
    onReset();
  }

  // ── Success Screen ──────────────────────────────────────────────────────────
  if (screenState === 'success' && resultTxn) {
    return (
      <div className="flex flex-col items-center text-center py-8 space-y-6">
        {/* Animated checkmark */}
        <div className="w-20 h-20 bg-success-bg rounded-full flex items-center justify-center animate-in zoom-in-50 duration-500">
          <CheckCircle2 className="w-10 h-10 text-success-DEFAULT" />
        </div>

        <div className="space-y-2">
          <p className="text-2xl font-bold text-text-primary">
            {formatCurrency(amountPaise)} sent successfully!
          </p>
          <p className="text-sm text-text-secondary">
            to {recipient.name}
          </p>
        </div>

        {/* Transaction ID with copy */}
        <div className="flex items-center gap-2 bg-bg-tertiary rounded-input px-4 py-2.5 border border-bg-border">
          <span className="text-xs font-mono text-text-secondary truncate max-w-[200px]">
            {resultTxn.id}
          </span>
          <button
            onClick={handleCopyTxnId}
            className="flex-shrink-0 p-1 hover:bg-bg-border rounded transition-colors cursor-pointer"
            title="Copy transaction ID"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-success-text" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-text-muted" />
            )}
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 pt-4">
          <Button
            label="View Transaction"
            onClick={() => navigate(`/transactions/${resultTxn.id}`)}
            variant="secondary"
            icon={ExternalLink}
          />
          <Button
            label="Send Again"
            onClick={handleSendAgain}
            icon={Send}
          />
        </div>
      </div>
    );
  }

  // ── Failure Screen ──────────────────────────────────────────────────────────
  if (screenState === 'failure') {
    return (
      <div className="flex flex-col items-center text-center py-8 space-y-6">
        <div className="w-20 h-20 bg-danger-bg rounded-full flex items-center justify-center animate-in zoom-in-50 duration-500">
          <XCircle className="w-10 h-10 text-danger-DEFAULT" />
        </div>

        <div className="space-y-2">
          <p className="text-xl font-bold text-text-primary">
            Transfer could not be completed
          </p>
          <p className="text-sm text-danger-text">{errorMessage}</p>
        </div>

        <div className="flex items-center gap-3 pt-4">
          <Button
            label="Try Again"
            onClick={() => {
              idempotencyKey.current = crypto.randomUUID();
              setScreenState('review');
              setErrorMessage('');
            }}
            variant="secondary"
            icon={RefreshCw}
          />
          <Button
            label="Back to Dashboard"
            onClick={() => navigate('/dashboard')}
            icon={Home}
          />
        </div>
      </div>
    );
  }

  // ── Review Screen ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Review your transfer</h2>
        <p className="text-sm text-text-secondary mt-1">
          Please confirm the details below
        </p>
      </div>

      {/* Transfer details card */}
      <Card className="space-y-4 border border-bg-border">
        {/* Recipient */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-muted">To</span>
          <div className="flex items-center gap-2">
            <Avatar name={recipient.name} size="sm" />
            <span className="text-sm font-medium text-text-primary">{recipient.name}</span>
          </div>
        </div>

        {/* Account (masked) */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-muted">Account</span>
          <span className="text-sm text-text-secondary font-mono">
            ••••••{recipient.accountId.slice(-4)}
          </span>
        </div>

        {/* Amount */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-muted">Amount</span>
          <span className="text-lg font-bold text-text-primary font-mono">
            {formatCurrency(amountPaise)}
          </span>
        </div>

        {/* Description */}
        {description && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-muted">Description</span>
            <span className="text-sm text-text-secondary max-w-[200px] truncate">
              {description}
            </span>
          </div>
        )}

        <div className="border-t border-bg-border" />

        {/* Fee notice */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-muted">Transfer fee</span>
          <span className="text-sm text-success-text font-medium">Free</span>
        </div>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <Button
          label="Back"
          onClick={onBack}
          variant="ghost"
          icon={ArrowLeft}
        />
        <Button
          label="Confirm & Send"
          onClick={handleConfirm}
          isLoading={sendMutation.isPending}
          disabled={sendMutation.isPending}
          icon={Send}
        />
      </div>
    </div>
  );
}
