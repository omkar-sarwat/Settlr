// Reusable text input — fintech design system
import { forwardRef, type InputHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: LucideIcon;
  rightElement?: React.ReactNode;
}

/** Text input with label, error message, and optional icon. Fintech dark mode. */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon: LeftIcon, rightElement, className, ...inputProps }, ref) => {
    return (
      <div className="flex flex-col gap-2">
        {label && (
          <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
            {label}
          </label>
        )}
        <div className="relative">
          {LeftIcon && (
            <LeftIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          )}
          <input
            ref={ref}
            className={cn(
              'w-full h-10 bg-bg-secondary rounded-lg text-sm text-text-primary font-medium',
              'placeholder:text-text-muted border border-bg-tertiary transition-all duration-200',
              'focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20',
              'hover:border-bg-tertiary/80',
              LeftIcon ? 'pl-10' : 'pl-3',
              rightElement ? 'pr-10' : 'pr-3',
              error && 'border-danger focus:border-danger focus:ring-danger/20',
              className,
            )}
            {...inputProps}
          />
          {rightElement && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {rightElement}
            </div>
          )}
        </div>
        {error && (
          <p className="text-xs text-danger font-semibold">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
