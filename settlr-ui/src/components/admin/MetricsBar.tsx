// MetricsBar — 8 metric cards for admin: volume, success, blocked, latency, p95, p99, total txns, active users
import { DollarSign, CheckCircle2, Shield, Clock, Zap, Activity, Users, TrendingUp } from 'lucide-react';
import { formatCompact } from '../../lib/formatCurrency';
import { Card } from '../ui/Card';
import { cn } from '../../lib/cn';
import type { AdminMetrics } from '../../types';

interface MetricsBarProps {
  metrics: AdminMetrics | undefined;
  isLoading: boolean;
}

interface MetricCardConfig {
  label: string;
  value: string;
  subtitle: string;
  icon: typeof DollarSign;
  color: string;
}

/** 8-card metrics grid showing key admin + performance stats */
export function MetricsBar({ metrics, isLoading }: MetricsBarProps) {
  const cards: MetricCardConfig[] = [
    {
      label: 'Volume',
      value: metrics ? formatCompact(metrics.totalVolumeToday) : '—',
      subtitle: 'today',
      icon: DollarSign,
      color: 'text-brand-light bg-brand-muted',
    },
    {
      label: 'Success',
      value: metrics ? `${metrics.successRate.toFixed(1)}%` : '—',
      subtitle: 'rate',
      icon: CheckCircle2,
      color: 'text-success-text bg-success-bg',
    },
    {
      label: 'Blocked',
      value: metrics ? `${metrics.fraudBlockRate.toFixed(1)}%` : '—',
      subtitle: 'by fraud',
      icon: Shield,
      color: 'text-danger-text bg-danger-bg',
    },
    {
      label: 'Avg Latency',
      value: metrics ? `${metrics.avgLatencyMs}ms` : '—',
      subtitle: 'avg',
      icon: Clock,
      color: 'text-warning-text bg-warning-bg',
    },
    {
      label: 'P95 Latency',
      value: metrics?.p95LatencyMs !== undefined ? `${metrics.p95LatencyMs}ms` : '—',
      subtitle: '95th pctl',
      icon: Zap,
      color: 'text-brand-light bg-brand-muted',
    },
    {
      label: 'P99 Latency',
      value: metrics?.p99LatencyMs !== undefined ? `${metrics.p99LatencyMs}ms` : '—',
      subtitle: '99th pctl',
      icon: Activity,
      color: 'text-danger-text bg-danger-bg',
    },
    {
      label: 'Total Txns',
      value: metrics?.totalTransactions !== undefined ? metrics.totalTransactions.toLocaleString() : '—',
      subtitle: 'all time',
      icon: TrendingUp,
      color: 'text-success-text bg-success-bg',
    },
    {
      label: 'Active Users',
      value: metrics?.activeUsersToday !== undefined ? String(metrics.activeUsersToday) : '—',
      subtitle: 'today',
      icon: Users,
      color: 'text-warning-text bg-warning-bg',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label} className="flex items-center gap-3">
          {isLoading ? (
            <MetricSkeleton />
          ) : (
            <>
              <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', card.color)}>
                <card.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-lg font-bold text-text-primary font-mono">{card.value}</p>
                <p className="text-xs text-text-muted">{card.label} <span className="text-text-muted/60">({card.subtitle})</span></p>
              </div>
            </>
          )}
        </Card>
      ))}
    </div>
  );
}

function MetricSkeleton() {
  return (
    <div className="flex items-center gap-3 animate-pulse w-full">
      <div className="w-10 h-10 bg-bg-tertiary rounded-full" />
      <div className="space-y-2 flex-1">
        <div className="h-5 w-16 bg-bg-tertiary rounded" />
        <div className="h-3 w-10 bg-bg-tertiary rounded" />
      </div>
    </div>
  );
}
