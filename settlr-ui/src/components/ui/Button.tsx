// Reusable button — Fintech design system, 4 variants, loading state
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Spinner } from './Spinner';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps {
  label: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: ButtonVariant;
  isLoading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: LucideIcon;
  className?: string;
}

const variantClasses: Record<ButtonVariant, string> = {
  // Primary: Purple CTA (#8B5CF6) — tech, modern
  primary: 'bg-cta text-white hover:bg-cta-hover active:bg-cta-active shadow-md hover:shadow-lg hover:shadow-purple-glow',
  // Secondary: Gold trust (#F59E0B) — secondary actions
  secondary: 'bg-transparent border-2 border-brand text-brand hover:bg-brand hover:text-white active:bg-brand-hover',
  // Danger: Red for destructive
  danger: 'bg-danger text-white hover:bg-red-600 active:bg-red-700 shadow-md',
  // Ghost: Transparent, text-only
  ghost: 'text-text-secondary hover:text-brand bg-transparent hover:bg-bg-secondary',
};

/** Reusable button — fintech design system, always use this */
export function Button({
  label,
  onClick,
  type = 'button',
  variant = 'primary',
  isLoading = false,
  disabled = false,
  fullWidth = false,
  icon: Icon,
  className,
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cn(
        'h-10 px-4 rounded-lg font-semibold text-sm',
        'flex items-center justify-center gap-2',
        'transition-all duration-200 ease-out cursor-pointer',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary',
        variantClasses[variant],
        fullWidth && 'w-full',
        className,
      )}
    >
      {isLoading ? (
        <>
          <Spinner />
          <span>Loading...</span>
        </>
      ) : (
        <>
          {Icon && <Icon size={16} />}
          {label}
        </>
      )}
    </button>
  );
}
