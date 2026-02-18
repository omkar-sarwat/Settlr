// AdminPage — 3-tab admin panel: System Metrics, Fraud Monitor, Live Feed
import { useState } from 'react';
import { Shield, BarChart3, Radio, RefreshCw } from 'lucide-react';
import { useAdminMetrics, useFlaggedTransactions } from '../hooks/useAdminMetrics';
import { MetricsBar } from '../components/admin/MetricsBar';
import { FraudSignalChart } from '../components/admin/FraudSignalChart';
import { FlaggedTable } from '../components/admin/FlaggedTable';
import { LiveFeed } from '../components/admin/LiveFeed';
import { cn } from '../lib/cn';

type AdminTab = 'metrics' | 'fraud' | 'live';

const TABS = [
  { id: 'metrics' as const, label: 'System Metrics', icon: BarChart3 },
  { id: 'fraud' as const, label: 'Fraud Monitor', icon: Shield },
  { id: 'live' as const, label: 'Live Feed', icon: Radio },
];

/** Admin panel with 3 tabs, auto-refreshing every 10 seconds */
export function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('metrics');

  // Data hooks
  const { data: metricsData, isLoading: metricsLoading, secondsAgo } = useAdminMetrics();
  const { data: flaggedData, isLoading: flaggedLoading } = useFlaggedTransactions();

  const metrics = metricsData?.data ?? undefined;
  const flaggedTxns = flaggedData?.data ?? [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-muted rounded-full flex items-center justify-center">
            <Shield className="w-5 h-5 text-brand-light" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Admin Panel</h1>
            <p className="text-xs text-text-muted">Internal monitoring dashboard</p>
          </div>
        </div>

        {/* Updated counter */}
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <RefreshCw className="w-3 h-3 animate-spin" style={{ animationDuration: '3s' }} />
          Updated {secondsAgo}s ago
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex border-b border-bg-border">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2',
              'transition-all cursor-pointer -mb-px',
              activeTab === id
                ? 'border-brand text-brand-light'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:border-bg-border',
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
            {id === 'fraud' && flaggedTxns.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs font-semibold bg-danger-bg text-danger-text rounded-full">
                {flaggedTxns.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'metrics' && (
          <div className="space-y-6">
            <MetricsBar metrics={metrics} isLoading={metricsLoading} />
            {metrics && (
              <FraudSignalChart
                signalBreakdown={metrics.signalBreakdown}
                transactionsPerMinute={metrics.transactionsPerMinute}
              />
            )}
          </div>
        )}

        {activeTab === 'fraud' && (
          <FlaggedTable transactions={flaggedTxns} isLoading={flaggedLoading} />
        )}

        {activeTab === 'live' && <LiveFeed />}
      </div>
    </div>
  );
}
