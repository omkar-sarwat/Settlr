/**
 * GhostButton Component
 * 
 * Secondary button with transparent background and border.
 * Use for less important actions like Cancel, Back, View More.
 */

import { motion } from 'framer-motion';
import { clsx } from 'clsx';

interface GhostButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}

const sizeStyles = {
  sm: 'px-4 py-2 text-sm rounded-xl',
  md: 'px-6 py-3 text-base rounded-2xl',
  lg: 'px-8 py-4 text-lg rounded-2xl',
};

export function GhostButton({
  children,
  onClick,
  disabled,
  type = 'button',
  size = 'md',
  fullWidth,
  className,
}: GhostButtonProps) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={clsx(
        'btn-ghost',
        sizeStyles[size],
        fullWidth && 'w-full',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {children}
    </motion.button>
  );
}
