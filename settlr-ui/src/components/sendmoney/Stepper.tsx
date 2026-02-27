/**
 * Stepper Component
 * Visual progress indicator for multi-step flows
 */

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { scaleIn } from "@/animations/variants";

export interface Step {
  label: string;
  description?: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number; // 0-indexed
}

export function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <div className="flex items-center justify-center gap-6 max-w-2xl mx-auto mb-8">
      {steps.map((step, index) => {
        const isActive = index === currentStep;
        const isCompleted = index < currentStep;
        const isUpcoming = index > currentStep;

        return (
          <div key={index} className="flex items-center">

            {/* Step Circle + Label */}
            <div className="flex flex-col items-center">

              {/* Step Circle */}
              <motion.div
                variants={scaleIn}
                initial="initial"
                animate={isActive || isCompleted ? "animate" : "initial"}
                className={`
                  w-12 h-12 rounded-full flex items-center justify-center
                  font-semibold transition-all duration-300

                  ${isActive ? "bg-purple-600 text-white ring-4 ring-purple-600/20 shadow-lg" : ""}
                  ${isCompleted ? "bg-green-500 text-white" : ""}
                  ${isUpcoming ? "bg-white text-black border border-gray-300" : ""}
                `}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </motion.div>

              {/* Step Label */}
              <div className="mt-2 text-center">
                <p
                  className={`text-sm font-medium ${
                    isActive ? "text-white" : "text-gray-400"
                  }`}
                >
                  {step.label}
                </p>

                {step.description && (
                  <p className="text-xs text-gray-500">
                    {step.description}
                  </p>
                )}
              </div>

            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div className="w-20 sm:w-28 h-[2px] mx-4">
                <div
                  className={`h-full transition-all duration-500 ${
                    index < currentStep
                      ? "bg-green-500"
                      : "bg-gray-600"
                  }`}
                />
              </div>
            )}

          </div>
        );
      })}
    </div>
  );
}