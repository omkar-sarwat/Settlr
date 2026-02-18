// BalanceCard — large balance display with animated count-up feel
import { Wallet } from 'lucide-react';
import { formatCurrency } from '../../lib/formatCurrency';
import { Card } from '../ui/Card';

interface BalanceCardProps {
  balance: number;       // In paise
  isLoading: boolean;
}

/** Shows the user's total balance as a large formatted number */
export function BalanceCard({ balance, isLoading }: BalanceCardProps) {
  if (isLoading) {
    return (
      <Card className="border-l-2 border-l-brand">
        <div className="h-3 w-24 bg-bg-border rounded animate-pulse mb-4" />
        <div className="h-8 w-40 bg-bg-border rounded animate-pulse mb-2" />
        <div className="h-3 w-20 bg-bg-border rounded animate-pulse" />
      </Card>
    );
  }

  return (
    <Card className="border-l-2 border-l-brand">
      <div className="flex items-center gap-2 mb-3">
        <Wallet className="w-5 h-5 text-brand" />
        <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
          Total Balance
        </span>
      </div>
      <p className="text-3xl font-bold font-mono text-text-primary mb-1">
        {formatCurrency(balance)}
      </p>
      <p className="text-xs text-text-secondary">Available to send</p>
    </Card>
  );
}
