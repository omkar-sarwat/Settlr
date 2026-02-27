import { Check } from "lucide-react";
import { cn } from "../../lib/cn";
import type { SendStep } from "../../types";

interface StepIndicatorProps {
  currentStep: SendStep;
}

const STEPS = [
  { step: 1 as const, label: "Recipient" },
  { step: 2 as const, label: "Amount" },
  { step: 3 as const, label: "Confirm" },
];

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center">
      {STEPS.map(({ step, label }, index) => {
        const isDone = currentStep > step;
        const isActive = currentStep === step;
        const isFuture = currentStep < step;

        return (
          <div key={step} className="flex items-center">

            {/* Circle + Label */}
            <div className="flex flex-col items-center gap-2">

              <div
                className={cn(
                  "w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300",

                  // completed
                  isDone && "bg-green-500 text-white",

                  // active
                  isActive &&
                    "bg-primary-500 text-white ring-4 ring-primary-500/20",

                  // future
                  isFuture &&
                    "bg-white/10 border border-white/20 text-white/70 backdrop-blur-md"
                )}
              >
                {isDone ? <Check className="w-4 h-4" /> : step}
              </div>

              <span
                className={cn(
                  "text-xs font-medium transition-colors",

                  isDone && "text-green-400",
                  isActive && "text-primary-300",
                  isFuture && "text-white/60"
                )}
              >
                {label}
              </span>
            </div>

            {/* Connector */}
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  "w-20 sm:w-28 h-[2px] mx-4 transition-colors duration-300",
                  currentStep > step
                    ? "bg-green-500"
                    : "bg-white/10"
                )}
              />
            )}

          </div>
        );
      })}
    </div>
  );
}