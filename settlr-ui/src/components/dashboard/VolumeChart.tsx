/**
 * Volume Chart Component
 * 
 * 7-day area chart showing sent and received money volume.
 * Uses Recharts with custom glassmorphism styling.
 * 
 * Features:
 * - Smooth animated draw-in effect
 * - Glowing gradient fills
 * - Dark theme optimized
 * - Custom tooltip with glass effect
 */

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, TooltipProps } from 'recharts';
import { GlassCard } from '@/components/ui/GlassCard';
import { formatCurrency } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';

interface VolumeChartProps {
  data: Array<{ day: string; sent: number; received: number }>;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

/**
 * Custom Tooltip with glass effect
 */
function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="glass px-4 py-3 space-y-1">
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <div 
            className="w-2 h-2 rounded-full" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-text-secondary capitalize">
            {entry.name}:
          </span>
          <span className="text-xs font-mono font-semibold text-text-primary">
            {formatCurrency(entry.value || 0)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function VolumeChart({ data, isLoading, isError, onRetry }: VolumeChartProps) {

  if (isLoading) {
    return (
      <GlassCard>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-32 mb-6" />
        <Skeleton className="h-60 w-full" />
      </GlassCard>
    );
  }

  if (isError) {
    return (
      <GlassCard>
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-danger-text">Could not load chart data.</p>
          <Button label="Retry" onClick={onRetry} />
        </div>
      </GlassCard>
    );
  }

  const chartData = data.map((point) => ({
    day: point.day ?? '--',
    sent: Number(point.sent ?? 0),
    received: Number(point.received ?? 0),
  }));

  return (
    <GlassCard>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-text-primary">
          Volume — Last 7 Days
        </h3>
        <p className="text-sm text-text-secondary mt-1">
          Money sent and received
        </p>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <AreaChart 
          data={chartData}
          margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
        >
          {/* Grid lines — very subtle */}
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="rgba(255,255,255,0.04)" 
            vertical={false}
          />

          {/* X Axis — days of week */}
          <XAxis
            dataKey="day"
            stroke="#475569"
            style={{ fontSize: '12px', fontFamily: 'Inter' }}
            tickLine={false}
            axisLine={false}
          />

          {/* Y Axis — hidden */}
          <YAxis hide />

          {/* Custom Tooltip */}
          <Tooltip content={<CustomTooltip />} cursor={false} />

          {/* Received money area — green gradient (drawn first = behind) */}
          <Area
            type="monotone"
            dataKey="received"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#receivedGradient)"
            fillOpacity={0.6}
            isAnimationActive={true}
            animationDuration={1200}
          />

          {/* Sent money area — red gradient (drawn last = on top) */}
          <Area
            type="monotone"
            dataKey="sent"
            stroke="#ef4444"
            strokeWidth={2}
            fill="url(#sentGradient)"
            fillOpacity={0.6}
            isAnimationActive={true}
            animationDuration={1200}
          />

          {/* Gradient definitions */}
          <defs>
            <linearGradient id="sentGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="receivedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
        </AreaChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-danger-500" />
          <span className="text-xs text-text-secondary">Sent</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-success-500" />
          <span className="text-xs text-text-secondary">Received</span>
        </div>
      </div>
    </GlassCard>
  );
}
