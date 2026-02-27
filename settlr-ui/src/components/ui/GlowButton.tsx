/**
 * GlowButton Component
 * 
 * Primary action button with neon glow effect.
 * Use this for all important CTAs like Send Money, Confirm, Submit.
 * 
 * Features:
 * - Neon glow that intensifies on hover
 * - Spring physics for press animation
 * - Loading state with spinner
 * - Disabled state with reduced opacity
 * 
 * Variants:
 * - primary: Indigo glow (default for most actions)
 * - success: Green glow (for completed/confirm actions)
 * - danger:  Red glow (for destructive actions)
 */

import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

interface GlowButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'success' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}

const variantStyles = {
  primary: 'bg-primary-500 shadow-glow-primary hover:shadow-glow-primary',
  success: 'bg-success-500 shadow-glow-success hover:shadow-glow-success',
  danger:  'bg-danger-500 shadow-glow-danger hover:shadow-glow-danger',
};

const sizeStyles = {
  sm: 'px-4 py-2 text-sm rounded-xl',
  md: 'px-6 py-3 text-base rounded-2xl',
  lg: 'px-8 py-4 text-lg rounded-2xl',
};

export function GlowButton({
  children, 
  onClick, 
  loading, 
  disabled, 
  type = 'button',
  variant = 'primary', 
  size = 'md', 
  fullWidth, 
  className,
}: GlowButtonProps) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={clsx(
        'btn-primary font-semibold transition-all duration-200',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        className
      )}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin" />
          Processing...
        </span>
      ) : children}
    </motion.button>
  );
}
