// LiveFeed — auto-refreshing transaction feed, max 20 rows, pause button
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pause, Play, Radio } from 'lucide-react';
import { useLiveTransactions } from '../../hooks/useAdminMetrics';
import { formatCurrency } from '../../lib/formatCurrency';
import { cn } from '../../lib/cn';
import { Spinner } from '../ui/Spinner';
import type { Transaction } from '../../types';

/** Live transaction feed with pause/resume and color-coded risk borders */
export function LiveFeed() {
  const navigate = useNavigate();
  const { data, isLoading } = useLiveTransactions();
  const [paused, setPaused] = useState(false);
  const [displayedTxns, setDisplayedTxns] = useState<Transaction[]>([]);
  const prevDataRef = useRef<Transaction[]>([]);

  // Update displayed transactions when new data arrives (unless paused)
  useEffect(() => {
    const incoming = data?.data || [];
    if (!paused && incoming.length > 0) {
      setDisplayedTxns(incoming.slice(0, 20));
      prevDataRef.current = incoming;
    }
  }, [data, paused]);

  function getBorderColor(score: number | undefined): string {
    const s = score ?? 0;
    if (s >= 80) return 'border-l-4 border-l-danger-DEFAULT bg-danger-bg/20';
    if (s >= 30) return 'border-l-4 border-l-warning-DEFAULT';
    return 'border-l-4 border-l-success-DEFAULT';
  }

  function formatTime(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-IN', { hour12: false });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with live indicator and pause toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-text-primary">Live Feed</span>
          {!paused && (
            <span className="flex items-center gap-1">
              <Radio className="w-3 h-3 text-success-DEFAULT animate-pulse" />
              <span className="text-xs text-success-text">LIVE</span>
            </span>
          )}
        </div>
        <button
          onClick={() => setPaused(!paused)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-input text-xs font-medium',
            'transition-colors cursor-pointer',
            paused
              ? 'bg-success-bg text-success-text hover:bg-success-DEFAULT/20'
              : 'bg-bg-tertiary text-text-secondary hover:text-text-primary',
          )}
        >
          {paused ? (
            <><Play className="w-3 h-3" /> Resume</>
          ) : (
            <><Pause className="w-3 h-3" /> Pause</>
          )}
        </button>
      </div>

      {/* Feed rows */}
      <div className="bg-bg-secondary rounded-card shadow-card overflow-hidden">
        {displayedTxns.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-8">
            No transactions yet
          </p>
        ) : (
          displayedTxns.map((txn, index) => {
            const score = txn.fraudScore ?? 0;
            const isBlocked = txn.status === 'fraud_blocked';

            return (
              <div
                key={txn.id}
                onClick={() => navigate(`/transactions/${txn.id}`)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 cursor-pointer',
                  'hover:bg-bg-tertiary transition-all duration-200',
                  'border-b border-bg-border last:border-0',
                  getBorderColor(score),
                  // Animate newest rows
                  index < 3 && 'animate-in fade-in-0 slide-in-from-top-2 duration-300',
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Timestamp */}
                <span className="text-xs font-mono text-text-muted w-16 flex-shrink-0">
                  {formatTime(txn.createdAt)}
                </span>

                {/* Transaction ID */}
                <span className="text-xs font-mono text-text-secondary truncate w-24 hidden sm:block">
                  {txn.id.slice(0, 12)}…
                </span>

                {/* Parties */}
                <span className="text-sm text-text-primary truncate flex-1">
                  {txn.fromUserName || 'Unknown'} → {txn.toUserName || 'Unknown'}
                </span>

                {/* Amount */}
                <span className="text-sm font-mono font-semibold text-text-primary whitespace-nowrap">
                  {formatCurrency(txn.amount)}
                </span>

                {/* Status */}
                {isBlocked ? (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-badge bg-danger-bg text-danger-text">
                    BLOCKED
                  </span>
                ) : (
                  <span
                    className={cn(
                      'text-xs px-2 py-0.5 rounded-badge',
                      score < 30 && 'text-success-text',
                      score >= 30 && score < 80 && 'text-warning-text',
                      score >= 80 && 'text-danger-text',
                    )}
                  >
                    Score: {score}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
