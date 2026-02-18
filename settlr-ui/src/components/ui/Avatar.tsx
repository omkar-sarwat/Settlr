// Avatar — Circle with initials, deterministic color based on name hash
import { cn } from '../../lib/cn';

interface AvatarProps {
  name: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// 8 distinct background colors for avatar circles — fintech design system
const AVATAR_COLORS = [
  'bg-brand/20 text-brand',           // Gold
  'bg-cta/20 text-cta',               // Purple
  'bg-success-bg text-success-text',  // Emerald
  'bg-danger-bg text-danger',         // Red
  'bg-warning-bg text-warning-text',  // Amber
  'bg-info-bg text-info-text',        // Blue
  'bg-bg-tertiary text-text-secondary', // Neutral light
  'bg-brand-light/10 text-brand-light', // Light gold
] as const;

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
} as const;

/** Gets the first letter of each word (max 2) to show as initials */
function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0].toUpperCase())
    .join('');
}

/** Simple hash function to pick a consistent color for each name */
function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/** Circle avatar with 2 initials — same person always gets the same color */
export function Avatar({ name, size = 'md', className }: AvatarProps) {
  const initials = getInitials(name || '?');
  const colorIndex = hashName(name || '') % AVATAR_COLORS.length;

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold flex-shrink-0',
        sizeClasses[size],
        AVATAR_COLORS[colorIndex],
        className,
      )}
      title={name || undefined}
    >
      {initials}
    </div>
  );
}
