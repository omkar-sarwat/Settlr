/**
 * Avatar Component
 * 
 * Shows user avatar with initials fallback.
 * Uses deterministic coloring so same name always gets same color.
 * 
 * This creates visual consistency — the same person's avatar
 * will look identical across the entire app.
 */

import { clsx } from 'clsx';
import { getInitials } from '@/lib/formatters';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// 8 distinct colors for avatars
const avatarColors = [
  'bg-warning-500/20 text-warning-400',     // Gold
  'bg-primary-500/20 text-primary-400',     // Indigo
  'bg-success-500/20 text-success-400',     // Emerald
  'bg-danger-500/20 text-danger-400',       // Red
  'bg-blue-500/20 text-blue-400',           // Blue
  'bg-purple-500/20 text-purple-400',       // Purple
  'bg-pink-500/20 text-pink-400',           // Pink
  'bg-cyan-500/20 text-cyan-400',           // Cyan
];

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
};

// Simple hash function to get consistent color for a name
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

export function Avatar({ name, size = 'md', className }: AvatarProps) {
  const initials = getInitials(name);
  const colorIndex = hashString(name) % avatarColors.length;
  const colorClass = avatarColors[colorIndex];

  return (
    <div className={clsx(
      'flex items-center justify-center rounded-full font-semibold',
      sizeClasses[size],
      colorClass,
      className
    )}>
      {initials}
    </div>
  );
}
