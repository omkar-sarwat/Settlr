// SendMoneyPage — 3-step flow: (1) Recipient, (2) Amount, (3) Confirm
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { getMyAccounts } from '../api/account.api';
import { StepIndicator } from '../components/send/StepIndicator';
import { RecipientStep } from '../components/send/RecipientStep';
import { AmountStep } from '../components/send/AmountStep';
import { ConfirmStep } from '../components/send/ConfirmStep';
import type { SendStep, RecipientInfo, SendMoneyFlowState } from '../types';

/** Send Money — manages step state and passes props to child step components */
export function SendMoneyPage() {
  const [state, setState] = useState<SendMoneyFlowState>({
    step: 1,
    recipient: null,
    amountPaise: 0,
    description: '',
  });

  // Fetch account for fromAccountId
  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: getMyAccounts,
    staleTime: 30_000,
  });

  const primaryAccount = accountsData?.data?.[0];

  // Step navigation helpers
  function goToStep(step: SendStep) {
    setState((prev) => ({ ...prev, step }));
  }

  function setRecipient(recipient: RecipientInfo) {
    setState((prev) => ({ ...prev, recipient, step: 2 }));
  }

  function setAmount(amountPaise: number, description: string) {
    setState((prev) => ({ ...prev, amountPaise, description, step: 3 }));
  }

  function resetFlow() {
    setState({ step: 1, recipient: null, amountPaise: 0, description: '' });
  }

  return (
    <div className="max-w-lg mx-auto space-y-8">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-brand-muted rounded-full flex items-center justify-center">
          <Send className="w-5 h-5 text-brand-light" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text-primary">Send Money</h1>
          <p className="text-sm text-text-secondary">Transfer funds instantly</p>
        </div>
      </div>

      {/* Step progress indicator */}
      <StepIndicator currentStep={state.step} />

      {/* Step content */}
      <div className="bg-bg-secondary rounded-card shadow-card p-6 border border-bg-border">
        {state.step === 1 && (
          <RecipientStep
            onSelect={setRecipient}
            initialRecipient={state.recipient}
          />
        )}

        {state.step === 2 && state.recipient && (
          <AmountStep
            recipient={state.recipient}
            initialAmount={state.amountPaise}
            initialDescription={state.description}
            onConfirm={setAmount}
            onBack={() => goToStep(1)}
          />
        )}

        {state.step === 3 && state.recipient && primaryAccount && (
          <ConfirmStep
            fromAccountId={primaryAccount.id}
            recipient={state.recipient}
            amountPaise={state.amountPaise}
            description={state.description}
            onBack={() => goToStep(2)}
            onReset={resetFlow}
          />
        )}
      </div>
    </div>
  );
}
