// AmountStep — Step 2: enter amount, quick buttons, optional description, balance check
import { useState } from 'react';
import { ArrowLeft, ArrowRight, IndianRupee } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getMyAccounts } from '../../api/account.api';
import { formatCurrency, toPaise } from '../../lib/formatCurrency';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { cn } from '../../lib/cn';
import type { RecipientInfo } from '../../types';

interface AmountStepProps {
  recipient: RecipientInfo;
  initialAmount: number;
  initialDescription: string;
  onConfirm: (amountPaise: number, description: string) => void;
  onBack: () => void;
}

const QUICK_AMOUNTS = [100, 500, 1000, 2000];
const MIN_AMOUNT = 1;
const MAX_AMOUNT = 100_000;
const MAX_DESCRIPTION = 255;

/** Step 2 — enter amount with quick buttons, validate against balance, add description */
export function AmountStep({ recipient, initialAmount, initialDescription, onConfirm, onBack }: AmountStepProps) {
  const [amountStr, setAmountStr] = useState(
    initialAmount > 0 ? (initialAmount / 100).toString() : ''
  );
  const [description, setDescription] = useState(initialDescription);
  const [touched, setTouched] = useState(false);

  // Fetch balance
  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: getMyAccounts,
    staleTime: 30_000,
  });

  const balance = accountsData?.data?.[0]?.balance ?? 0;
  const balanceRupees = balance / 100;

  // Parse and validate
  const parsedAmount = parseFloat(amountStr) || 0;

  function getAmountError(): string {
    if (!touched && !amountStr) return '';
    if (!amountStr) return 'Enter an amount';
    if (isNaN(parsedAmount) || parsedAmount <= 0) return 'Enter a valid amount';
    if (parsedAmount < MIN_AMOUNT) return `Minimum amount is ₹${MIN_AMOUNT}`;
    if (parsedAmount > MAX_AMOUNT) return `Maximum transfer is ₹1,00,000`;
    if (parsedAmount > balanceRupees) return 'Insufficient balance';
    return '';
  }

  const amountError = getAmountError();
  const isValid = parsedAmount >= MIN_AMOUNT && parsedAmount <= MAX_AMOUNT && parsedAmount <= balanceRupees;

  function handleQuickAmount(rupees: number) {
    setAmountStr(rupees.toString());
    setTouched(true);
  }

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    // Allow only valid number input
    if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
      setAmountStr(val);
      setTouched(true);
    }
  }

  function handleReview() {
    if (!isValid) return;
    const paise = toPaise(amountStr);
    onConfirm(paise, description.trim());
  }

  return (
    <div className="space-y-6">
      {/* Recipient preview */}
      <Card className="border border-bg-border">
        <div className="flex items-center gap-3">
          <Avatar name={recipient.name} size="md" />
          <div>
            <p className="text-sm font-medium text-text-primary">
              Sending to: {recipient.name}
            </p>
            <p className="text-xs text-text-secondary">{recipient.email}</p>
          </div>
        </div>
      </Card>

      {/* Amount input */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-text-secondary">Amount</label>
        <div className="relative">
          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
          <input
            type="text"
            inputMode="decimal"
            value={amountStr}
            onChange={handleAmountChange}
            onBlur={() => setTouched(true)}
            placeholder="0.00"
            className={cn(
              'w-full h-14 bg-bg-tertiary rounded-input text-2xl font-semibold text-text-primary',
              'pl-10 pr-4 border transition-all duration-150 focus:outline-none',
              amountError
                ? 'border-danger-DEFAULT focus:shadow-none'
                : 'border-bg-border focus:border-brand focus:shadow-input',
            )}
          />
        </div>
        {amountError && (
          <p className="text-xs text-danger-text">{amountError}</p>
        )}
      </div>

      {/* Quick amount buttons */}
      <div className="space-y-2">
        <p className="text-xs text-text-muted">Quick amounts:</p>
        <div className="flex gap-2 flex-wrap">
          {QUICK_AMOUNTS.map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => handleQuickAmount(amt)}
              className={cn(
                'px-4 py-2 rounded-input text-sm font-medium transition-all cursor-pointer',
                parsedAmount === amt
                  ? 'bg-brand text-white'
                  : 'bg-bg-tertiary text-text-secondary border border-bg-border hover:border-brand hover:text-text-primary',
              )}
            >
              ₹{amt.toLocaleString('en-IN')}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Input
          label="Description (optional)"
          placeholder="What's this for?"
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION))}
          maxLength={MAX_DESCRIPTION}
        />
        <p className="text-xs text-text-muted text-right">
          {MAX_DESCRIPTION - description.length} chars remaining
        </p>
      </div>

      {/* Balance display */}
      <div className="flex items-center justify-between bg-bg-tertiary rounded-input px-4 py-3 border border-bg-border">
        <span className="text-sm text-text-secondary">Your balance:</span>
        <span className="text-sm font-semibold text-text-primary font-mono">
          {formatCurrency(balance)}
        </span>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <Button
          label="Back"
          onClick={onBack}
          variant="ghost"
          icon={ArrowLeft}
        />
        <Button
          label="Review"
          onClick={handleReview}
          disabled={!isValid}
          icon={ArrowRight}
        />
      </div>
    </div>
  );
}
