/**
 * RevenueFlow Component
 *
 * Bar chart showing revenue (sent/received) over time.
 * Matches the reference UI: vertical bars with Daily/Weekly toggle,
 * hover tooltips, and a highlighted growth percentage annotation.
 *
 * Data comes from the API (chart endpoint) or falls back to demo data.
 */

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  type TooltipProps,
} from 'recharts';
import { RefreshCw } from 'lucide-react';

interface DataPoint {
  time: string;
  value: number;
}

interface RevenueFlowProps {
  data: DataPoint[];
}

const PERIOD_OPTIONS = ['Daily', 'Weekly'] as const;

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.[0]) return null;

  const value = payload[0].value as number;
  return (
    <div className="px-3 py-2 rounded-xl bg-bg-card/95 backdrop-blur border border-white/[0.08] shadow-card">
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className="text-sm font-bold text-text-primary font-mono">
        ₹{(value / 100).toLocaleString('en-IN')}
      </p>
    </div>
  );
}

export function RevenueFlow({ data }: RevenueFlowProps) {
  const [period, setPeriod] = useState<(typeof PERIOD_OPTIONS)[number]>('Daily');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Find the max value index for highlight
  const maxIndex = useMemo(() => {
    let max = 0;
    let idx = 0;
    data.forEach((d, i) => {
      if (d.value > max) {
        max = d.value;
        idx = i;
      }
    });
    return idx;
  }, [data]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className="h-full rounded-3xl bg-white/[0.02] backdrop-blur-lg border border-white/[0.06] p-5 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-text-primary">Revenue flow</h3>
        <div className="flex items-center gap-2">
          {/* Period toggle */}
          <div className="flex items-center bg-white/[0.04] rounded-xl p-0.5">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => setPeriod(opt)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  period === opt
                    ? 'bg-white/[0.08] text-text-primary'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          {/* Refresh button */}
          <motion.button
            whileHover={{ rotate: 90 }}
            transition={{ duration: 0.3 }}
            className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
          >
            <RefreshCw size={14} />
          </motion.button>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 5, left: 5, bottom: 5 }}
            barCategoryGap="25%"
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#64748b' }}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'rgba(255,255,255,0.02)', radius: 8 }}
            />
            <Bar
              dataKey="value"
              radius={[8, 8, 4, 4]}
              onMouseEnter={(_, index) => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    index === maxIndex
                      ? 'url(#barHighlight)'
                      : hoveredIndex === index
                        ? 'rgba(139,92,246,0.5)'
                        : 'rgba(139,92,246,0.25)'
                  }
                  style={{ transition: 'fill 200ms ease' }}
                />
              ))}
            </Bar>
            <defs>
              <linearGradient id="barHighlight" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c084fc" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.4} />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Growth annotation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-2 flex items-center gap-2"
      >
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-success-500/15 text-success-400 text-xs font-semibold">
          +16%
        </span>
        <span className="text-xs text-text-muted">vs last period</span>
      </motion.div>
    </motion.div>
  );
}
