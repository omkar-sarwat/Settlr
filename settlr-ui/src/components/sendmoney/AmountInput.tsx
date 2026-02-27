/**
 * Amount Input Component
 * 
 * Second step in Send Money flow.
 * Shows:
 * - Large rupee amount input (premium feel)
 * - Quick amount buttons (₹100, ₹500, ₹1000)
 * - Purpose/note input
 * - Balance check validation
 * - Animated currency symbol
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { IndianRupee, AlertCircle } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';
import { GhostButton } from '@/components/ui/GhostButton';
import { formatCurrency } from '@/lib/formatters';
import { scaleIn } from '@/animations/variants';

interface AmountInputProps {
  availableBalancePaise: number;
  onSubmit: (amountPaise: number, purpose: string) => void;
  onBack: () => void;
}

const QUICK_AMOUNTS = [10000, 50000, 100000]; // ₹100, ₹500, ₹1000 in paise

export function AmountInput({ availableBalancePaise, onSubmit, onBack }: AmountInputProps) {
  const [amountRupees, setAmountRupees] = useState('');
  const [purpose, setPurpose] = useState('');
  const [error, setError] = useState('');

  // Convert rupees to paise for validation
  const amountPaise = Math.round(parseFloat(amountRupees || '0') * 100);

  // Validate amount on change
  useEffect(() => {
    if (!amountRupees) {
      setError('');
      return;
    }

    const amount = parseFloat(amountRupees);
    if (isNaN(amount) || amount <= 0) {
      setError('Enter a valid amount');
      return;
    }

    if (amountPaise > availableBalancePaise) {
      setError('Insufficient balance');
      return;
    }

    if (amountPaise < 100) { // Minimum ₹1
      setError('Minimum amount is ₹1');
      return;
    }

    setError('');
  }, [amountRupees, amountPaise, availableBalancePaise]);

  const handleQuickAmount = (paise: number) => {
    setAmountRupees((paise / 100).toFixed(2));
  };

  const handleSubmit = () => {
    if (error || !amountRupees) return;
    onSubmit(amountPaise, purpose);
  };

  const isValid = amountRupees && !error;

  return (
    <div className="space-y-6">
      {/* Large Amount Input */}
      <GlassCard variant="elevated" className="p-8">
        <label className="text-sm text-text-secondary mb-3 block">
          Enter Amount
        </label>
        
        <div className="relative group">
          {/* Currency Symbol */}
          <motion.div
            variants={scaleIn}
            initial="initial"
            animate="animate"
            className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-2"
          >
            <IndianRupee className="w-10 h-10 text-primary-light" />
          </motion.div>

          {/* Amount Input */}
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={amountRupees}
            onChange={(e) => {
              // Only allow numbers and single decimal point
              const value = e.target.value.replace(/[^0-9.]/g, '');
              const parts = value.split('.');
              if (parts.length > 2) return; // Prevent multiple decimals
              if (parts[1]?.length > 2) return; // Limit to 2 decimal places
              setAmountRupees(value);
            }}
            className="w-full bg-transparent border-none outline-none text-5xl font-bold text-text-primary pl-14 font-mono tracking-tight placeholder:text-text-muted/30"
            autoFocus
          />
        </div>

        {/* Error or Available Balance */}
        <div className="mt-4 min-h-[20px]">
          {error ? (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-danger-light text-sm"
            >
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </motion.div>
          ) : (
            <p className="text-sm text-text-tertiary">
              Available: <span className="font-medium text-text-secondary">{formatCurrency(availableBalancePaise)}</span>
            </p>
          )}
        </div>
      </GlassCard>

      {/* Quick Amount Buttons */}
      <div className="flex gap-3">
        {QUICK_AMOUNTS.map((paise) => (
          <button
            key={paise}
            onClick={() => handleQuickAmount(paise)}
            className="flex-1 px-4 py-3 rounded-xl border border-border-default bg-bg-surface/30 backdrop-blur-sm text-text-secondary hover:border-primary-dark hover:text-primary-light hover:bg-bg-elevated transition-all text-sm font-medium"
          >
            {formatCurrency(paise)}
          </button>
        ))}
      </div>

      {/* Purpose/Note Input */}
      <div>
        <label className="text-sm text-text-secondary mb-2 block">
          Purpose (Optional)
        </label>
        <input
          type="text"
          placeholder="E.g., Lunch, Rent, Gift..."
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          maxLength={100}
          className="input-glass w-full"
        />
        {purpose && (
          <p className="text-xs text-text-muted mt-1">
            {purpose.length}/100 characters
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <GhostButton onClick={onBack} className="flex-1">
          Back
        </GhostButton>
        <GlowButton
          onClick={handleSubmit}
          disabled={!isValid}
          className="flex-1"
        >
          Continue
        </GlowButton>
      </div>
    </div>
  );
}
