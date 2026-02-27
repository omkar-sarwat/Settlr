/**
 * Skeleton Component
 * 
 * Shows a shimmering placeholder while data is loading.
 * ALWAYS show skeletons — never show blank screens while fetching.
 * 
 * The shimmer effect moves from left to right giving the
 * impression that content is being loaded.
 */

import { clsx } from 'clsx';

interface SkeletonProps {
  className?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
}

export function Skeleton({ className, rounded = 'md' }: SkeletonProps) {
  const r = { 
    sm: 'rounded', 
    md: 'rounded-xl', 
    lg: 'rounded-2xl', 
    full: 'rounded-full' 
  };
  
  return <div className={clsx('skeleton', r[rounded], className)} />;
}

/**
 * Ready-made skeleton for stat cards
 * Shows the loading state of a metric card
 */
export function StatCardSkeleton() {
  return (
    <div className="glass p-6 space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

/**
 * Ready-made skeleton for transaction rows
 * Shows the loading state of a transaction list item
 */
export function TransactionRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-border-subtle">
      <Skeleton className="w-10 h-10" rounded="full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-5 w-20" />
    </div>
  );
}
