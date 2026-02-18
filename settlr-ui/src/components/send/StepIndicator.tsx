// StepIndicator — 3-step progress bar (active=purple, done=green, future=gray)
import { Check } from 'lucide-react';
import { cn } from '../../lib/cn';
import type { SendStep } from '../../types';

interface StepIndicatorProps {
  currentStep: SendStep;
}

const STEPS = [
  { step: 1 as const, label: 'Recipient' },
  { step: 2 as const, label: 'Amount' },
  { step: 3 as const, label: 'Confirm' },
];

/** Visual progress bar for the 3-step send money flow */
export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-0">
      {STEPS.map(({ step, label }, index) => {
        const isDone = currentStep > step;
        const isActive = currentStep === step;
        const isFuture = currentStep < step;

        return (
          <div key={step} className="flex items-center">
            {/* Circle + label */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300',
                  isDone && 'bg-success-DEFAULT text-white',
                  isActive && 'bg-brand text-white ring-4 ring-brand/20',
                  isFuture && 'bg-bg-tertiary text-text-muted border border-bg-border',
                )}
              >
                {isDone ? <Check className="w-4 h-4" /> : step}
              </div>
              <span
                className={cn(
                  'text-xs font-medium transition-colors',
                  isDone && 'text-success-text',
                  isActive && 'text-brand-light',
                  isFuture && 'text-text-muted',
                )}
              >
                {label}
              </span>
            </div>

            {/* Connector line between circles */}
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  'w-16 sm:w-24 h-0.5 mx-2 mb-6 transition-colors duration-300',
                  currentStep > step + 1
                    ? 'bg-success-DEFAULT'
                    : currentStep > step
                      ? 'bg-brand'
                      : 'bg-bg-border',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
