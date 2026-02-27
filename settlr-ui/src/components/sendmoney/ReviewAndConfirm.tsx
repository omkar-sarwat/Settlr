/**
 * Review and Confirm Component
 * 
 * Third step in Send Money flow.
 * Shows:
 * - Transaction summary (recipient, amount, purpose)
 * - Sender account details
 * - Final confirmation button
 * - Loading state during processing
 * - Success/Error screens
 */

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import type { AxiosError } from 'axios';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';
import { GhostButton } from '@/components/ui/GhostButton';
import { Avatar } from '@/components/ui/Avatar';
import { AmountDisplay } from '@/components/ui/AmountDisplay';
import { formatCurrency } from '@/lib/formatters';
import { fadeInUp, scaleIn } from '@/animations/variants';
import { useSendMoney } from '@/hooks/useSendMoney';
import type { Recipient } from './RecipientSearch';

interface ReviewAndConfirmProps {
  recipient: Recipient;
  amountPaise: number;
  purpose: string;
  senderAccountNumber: string;
  senderBalancePaise: number;
  onBack: () => void;
  onSuccess: () => void;
}

export function ReviewAndConfirm({
  recipient,
  amountPaise,
  purpose,
  senderAccountNumber,
  senderBalancePaise,
  onBack,
  onSuccess,
}: ReviewAndConfirmProps) {
  const [status, setStatus] = useState<'review' | 'success' | 'error'>('review');
  const [errorMessage, setErrorMessage] = useState('');
  const [successTransactionId, setSuccessTransactionId] = useState<string | null>(null);
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());

  const { mutateAsync: sendMoney, isPending } = useSendMoney();

  function getErrorMessage(code: string): string {
    const messages: Record<string, string> = {
      INSUFFICIENT_BALANCE: 'Your account balance is too low for this transfer',
      FRAUD_BLOCKED: 'This transaction was blocked by our security system',
      ACCOUNT_LOCKED: 'Account is busy, please try again in a moment',
      RECIPIENT_NOT_FOUND: 'Recipient account not found',
      ACCOUNT_NOT_FOUND: 'Account not found',
      ACCOUNT_FROZEN: 'Your account has been frozen',
    };

    return messages[code] ?? 'Something went wrong, please try again';
  }

  const handleConfirm = async () => {
    setStatus('review');
    setErrorMessage('');

    try {
      const response = await sendMoney({
        fromAccountId: senderAccountNumber,
        toAccountId: recipient.id,
        amount: amountPaise,
        currency: 'INR',
        description: purpose || undefined,
        idempotencyKey: idempotencyKeyRef.current,
      });

      setSuccessTransactionId(response?.data?.id ?? null);
      
      setStatus('success');
      
      // Navigate away after 2 seconds
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err: unknown) {
      setStatus('error');
      const axiosErr = err as AxiosError<{ error?: string }>;
      const errorCode = axiosErr.response?.data?.error ?? '';
      setErrorMessage(getErrorMessage(errorCode));
    }
  };

  const remainingBalancePaise = senderBalancePaise - amountPaise;

  // Success Screen
  if (status === 'success') {
    return (
      <motion.div
        variants={scaleIn}
        initial="initial"
        animate="animate"
        className="text-center py-12"
      >
        <GlassCard variant="success" className="inline-block p-6 mb-6">
          <CheckCircle className="w-16 h-16 text-success-light mx-auto" />
        </GlassCard>
        <h2 className="text-2xl font-bold text-text-primary mb-2">
          Payment Successful!
        </h2>
        <p className="text-text-secondary mb-6">
          {formatCurrency(amountPaise)} sent to {recipient.name}
        </p>
        <div className="text-sm text-text-tertiary">
          {successTransactionId ? `Transaction ID: ${successTransactionId}` : 'Redirecting to dashboard...'}
        </div>
      </motion.div>
    );
  }

  // Error Screen
  if (status === 'error') {
    return (
      <motion.div
        variants={fadeInUp}
        initial="initial"
        animate="animate"
        className="space-y-6"
      >
        <GlassCard variant="danger" className="p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-danger-light flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-danger-light mb-2">
                Transaction Failed
              </h3>
              <p className="text-text-secondary text-sm">
                {errorMessage}
              </p>
            </div>
          </div>
        </GlassCard>

        <div className="flex gap-3">
          <GhostButton onClick={onBack} className="flex-1">
            Go Back
          </GhostButton>
          <GlowButton onClick={handleConfirm} className="flex-1">
            Try Again
          </GlowButton>
        </div>
      </motion.div>
    );
  }

  // Review Screen
  return (
    <div className="space-y-6">
      {/* Transaction Summary */}
      <GlassCard variant="elevated">
        <div className="p-6 border-b border-border-default">
          <h3 className="text-sm text-text-secondary mb-4">Sending To</h3>
          <div className="flex items-center gap-4">
            <Avatar name={recipient.name} size="lg" />
            <div>
              <p className="text-lg font-semibold text-text-primary">
                {recipient.name}
              </p>
              <p className="text-sm text-text-tertiary font-mono">
                {recipient.accountNumber}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 bg-gradient-to-br from-primary-dark/10 to-transparent">
          <p className="text-sm text-text-secondary mb-2">Amount</p>
          <AmountDisplay paise={amountPaise} size="xl" showSign />
          
          {purpose && (
            <div className="mt-4 pt-4 border-t border-border-default/50">
              <p className="text-xs text-text-tertiary mb-1">Purpose</p>
              <p className="text-sm text-text-secondary">{purpose}</p>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Account Details */}
      <div className="grid grid-cols-2 gap-4">
        <GlassCard>
          <div className="p-4">
            <p className="text-xs text-text-tertiary mb-1">From Account</p>
            <p className="text-sm font-mono text-text-primary">
              {senderAccountNumber}
            </p>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="p-4">
            <p className="text-xs text-text-tertiary mb-1">Remaining Balance</p>
            <p className="text-sm font-semibold text-text-primary">
              {formatCurrency(remainingBalancePaise)}
            </p>
          </div>
        </GlassCard>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <GhostButton
          onClick={onBack}
          disabled={isPending}
          className="flex-1"
        >
          Back
        </GhostButton>
        <GlowButton
          onClick={handleConfirm}
          disabled={isPending}
          className="flex-1"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <span>Confirm & Send</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </GlowButton>
      </div>
    </div>
  );
}
