/**
 * Send Money Page
 * 
 * 3-step flow for sending money:
 * 1. Select recipient (search or recent)
 * 2. Enter amount and purpose
 * 3. Review and confirm transaction
 * 
 * Each step slides in/out with smooth transitions.
 * Uses stepper UI to show progress.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { GlassCard } from '@/components/ui/GlassCard';
import {
  RecipientSearch,
  AmountInput,
  ReviewAndConfirm,
  Stepper,
  type Recipient,
} from '@/components/sendmoney';
import { slideInRight, slideInLeft } from '@/animations/variants';
import { useAccounts } from '@/hooks/useAccounts';

const STEPS = [
  { label: 'Recipient', description: 'Who to send to' },
  { label: 'Amount', description: 'How much to send' },
  { label: 'Confirm', description: 'Review & send' },
];

export function SendMoneyPage() {
  const navigate = useNavigate();
  const { data: accountsData } = useAccounts();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');

  // Form state
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);
  const [amountPaise, setAmountPaise] = useState(0);
  const [purpose, setPurpose] = useState('');

  // Get primary account data
  const primaryAccount = accountsData?.data?.[0];
  const availableBalance = primaryAccount?.balance || 0;
  const accountNumber = primaryAccount?.id || '';

  // Navigation handlers
  const goToStep = (step: number, dir: 'forward' | 'backward' = 'forward') => {
    setDirection(dir);
    setCurrentStep(step);
  };

  const handleSelectRecipient = (recipient: Recipient) => {
    setSelectedRecipient(recipient);
    goToStep(1, 'forward');
  };

  const handleAmountSubmit = (amount: number, purposeText: string) => {
    setAmountPaise(amount);
    setPurpose(purposeText);
    goToStep(2, 'forward');
  };

  const handleSuccess = () => {
    navigate('/dashboard');
  };

  // Animation variants based on direction
  const variants = direction === 'forward' ? slideInRight : slideInLeft;

  return (
    <PageWrapper>
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 rounded-lg hover:bg-bg-elevated text-text-tertiary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Send Money</h1>
          <p className="text-text-secondary mt-1">
            Quick and secure transfers to any account
          </p>
        </div>
      </div>

      {/* Stepper */}
      <Stepper steps={STEPS} currentStep={currentStep} />

      {/* Step Content */}
      <div className="max-w-2xl mx-auto">
        <GlassCard variant="elevated" className="p-8">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={variants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {/* Step 1: Recipient Search */}
              {currentStep === 0 && (
                <RecipientSearch onSelectRecipient={handleSelectRecipient} />
              )}

              {/* Step 2: Amount Input */}
              {currentStep === 1 && selectedRecipient && (
                <AmountInput
                  availableBalancePaise={availableBalance}
                  onSubmit={handleAmountSubmit}
                  onBack={() => goToStep(0, 'backward')}
                />
              )}

              {/* Step 3: Review & Confirm */}
              {currentStep === 2 && selectedRecipient && (
                <ReviewAndConfirm
                  recipient={selectedRecipient}
                  amountPaise={amountPaise}
                  purpose={purpose}
                  senderAccountNumber={accountNumber}
                  senderBalancePaise={availableBalance}
                  onBack={() => goToStep(1, 'backward')}
                  onSuccess={handleSuccess}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </GlassCard>
      </div>
    </PageWrapper>
  );
}