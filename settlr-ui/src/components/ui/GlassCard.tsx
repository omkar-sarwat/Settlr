/**
 * GlassCard Component
 * 
 * Wraps any content in a frosted glass effect card.
 * This is the core visual element of the entire UI.
 * 
 * Variants:
 * - default:  Standard glass with subtle background
 * - elevated: More prominent for important cards (balance, stats)
 * - accent:   Primary color tint for action areas
 * - success:  Green tint for successful states
 * - danger:   Red tint for errors/alerts
 * 
 * hoverable: Makes the card lift slightly when hovered
 */

import { motion, type HTMLMotionProps } from 'framer-motion';
import { clsx } from 'clsx';

type GlassVariant = 'default' | 'elevated' | 'accent' | 'success' | 'danger';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  variant?: GlassVariant;
  hoverable?: boolean;
  className?: string;
  children: React.ReactNode;
}

const variantClass: Record<GlassVariant, string> = {
  default:  'glass',
  elevated: 'glass-elevated',
  accent:   'glass-accent',
  success:  'bg-success-soft border border-success/20 backdrop-blur-xl rounded-3xl',
  danger:   'bg-danger-soft border border-danger-500/20 backdrop-blur-xl rounded-3xl',
};

export function GlassCard({ 
  variant = 'default', 
  hoverable, 
  className, 
  children, 
  ...props 
}: GlassCardProps) {
  return (
    <motion.div
      whileHover={hoverable ? { y: -2, boxShadow: '0 12px 48px rgba(0,0,0,0.5)' } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={clsx(variantClass[variant], 'p-6', className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}
