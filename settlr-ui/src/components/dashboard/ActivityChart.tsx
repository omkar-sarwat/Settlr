// ActivityChart — 7-day sent vs received area chart using Recharts
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  type TooltipProps,
} from 'recharts';
import { formatCurrency } from '../../lib/formatCurrency';
import { Card } from '../ui/Card';
import type { ChartDataPoint } from '../../types';

interface ActivityChartProps {
  data: ChartDataPoint[];
  isLoading: boolean;
}

/** Custom tooltip that shows both sent and received values formatted as currency */
function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-bg-secondary border border-bg-border rounded-card p-3 shadow-card">
      <p className="text-xs font-medium text-text-primary mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-xs">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-text-secondary capitalize">{entry.dataKey}:</span>
          <span className="font-mono font-medium text-text-primary">
            {formatCurrency(entry.value as number)}
          </span>
        </div>
      ))}
    </div>
  );
}

/** 7-day area chart showing sent (purple) and received (green) activity */
export function ActivityChart({ data, isLoading }: ActivityChartProps) {
  if (isLoading) {
    return (
      <Card>
        <div className="h-3 w-32 bg-bg-border rounded animate-pulse mb-4" />
        <div className="h-[240px] bg-bg-border/30 rounded animate-pulse" />
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold text-text-primary mb-1">Activity</h3>
      <p className="text-xs text-text-secondary mb-4">Sent vs Received — Last 7 days</p>

      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          {/* No grid lines for cleaner look */}
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#94a3b8' }}
          />
          {/* Y axis hidden — cleaner look */}
          <Tooltip content={<ChartTooltip />} />
          <defs>
            <linearGradient id="sentGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="receivedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="sent"
            stroke="#6366f1"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#sentGradient)"
          />
          <Area
            type="monotone"
            dataKey="received"
            stroke="#10b981"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#receivedGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}
