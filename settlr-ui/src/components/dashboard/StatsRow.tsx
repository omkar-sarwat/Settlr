// StatsRow — 3 metric cards: Total Balance, Sent Today, Received Today
import { Wallet, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { formatCurrency } from '../../lib/formatCurrency';
import { Card } from '../ui/Card';

interface StatsRowProps {
  balance: number;          // In paise
  sentToday: number;        // In paise
  receivedToday: number;    // In paise
  sentCount: number;        // Number of sent transactions today
  receivedCount: number;    // Number of received transactions today
  isLoading: boolean;
}

/** Skeleton loading state for a single stat card */
function StatCardSkeleton() {
  return (
    <Card>
      <div className="h-3 w-24 bg-bg-border rounded animate-pulse mb-4" />
      <div className="h-8 w-32 bg-bg-border rounded animate-pulse mb-2" />
      <div className="h-3 w-20 bg-bg-border rounded animate-pulse" />
    </Card>
  );
}

/** 3 stat cards in a row: Balance (purple border), Sent (red border), Received (green border) */
export function StatsRow({ balance, sentToday, receivedToday, sentCount, receivedCount, isLoading }: StatsRowProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Total Balance */}
      <Card className="border-l-2 border-l-brand">
        <div className="flex items-center gap-2 mb-3">
          <Wallet className="w-5 h-5 text-brand" />
          <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
            Total Balance
          </span>
        </div>
        <p className="text-2xl font-bold font-mono text-text-primary mb-1">
          {formatCurrency(balance)}
        </p>
        <p className="text-xs text-text-secondary">Available to send</p>
      </Card>

      {/* Sent Today */}
      <Card className="border-l-2 border-l-danger-DEFAULT">
        <div className="flex items-center gap-2 mb-3">
          <ArrowUpRight className="w-5 h-5 text-danger-DEFAULT" />
          <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
            Sent Today
          </span>
        </div>
        <p className="text-2xl font-bold font-mono text-text-primary mb-1">
          {formatCurrency(sentToday)}
        </p>
        <p className="text-xs text-text-secondary">{sentCount} transaction{sentCount !== 1 ? 's' : ''}</p>
      </Card>

      {/* Received Today */}
      <Card className="border-l-2 border-l-success-DEFAULT">
        <div className="flex items-center gap-2 mb-3">
          <ArrowDownLeft className="w-5 h-5 text-success-DEFAULT" />
          <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
            Received Today
          </span>
        </div>
        <p className="text-2xl font-bold font-mono text-text-primary mb-1">
          {formatCurrency(receivedToday)}
        </p>
        <p className="text-xs text-text-secondary">{receivedCount} transaction{receivedCount !== 1 ? 's' : ''}</p>
      </Card>
    </div>
  );
}
