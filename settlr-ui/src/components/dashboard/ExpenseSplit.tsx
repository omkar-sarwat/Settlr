/**
 * ExpenseSplit Component
 *
 * Donut chart showing expense category breakdown.
 * Matches the reference UI: centered total, colored legend items.
 * Uses Recharts PieChart with inner/outer radius for donut effect.
 *
 * Amounts in paise.
 */

import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useCountUp } from '@/hooks/useCountUp';

interface ExpenseCategory {
  name: string;
  /** Percentage of total */
  value: number;
  /** CSS color */
  color: string;
}

interface ExpenseSplitProps {
  data: ExpenseCategory[];
  /** Total expense in paise */
  totalPaise?: number;
}

function formatTotal(paise: number): string {
  const rupees = paise / 100;
  return rupees.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function ExpenseSplit({ data, totalPaise = 232000 }: ExpenseSplitProps) {
  const animatedTotal = useCountUp(totalPaise, 1000);

  // Marker colors for legend dots
  const markerStyles: Record<string, string> = {
    Food: 'bg-amber-400',
    Health: 'bg-violet-400',
    Bills: 'bg-pink-400',
    Other: 'bg-sky-400',
    Transfer: 'bg-emerald-400',
    Shopping: 'bg-orange-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="h-full rounded-3xl bg-white/[0.02] backdrop-blur-lg border border-white/[0.06] p-5 flex flex-col"
    >
      {/* Header */}
      <h3 className="text-base font-semibold text-text-primary mb-4">
        Expense split
      </h3>

      {/* Chart + Legend row */}
      <div className="flex-1 flex items-center gap-4 min-h-0">
        {/* Donut Chart */}
        <div className="relative w-36 h-36 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={64}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
                animationBegin={200}
                animationDuration={800}
                animationEasing="ease-out"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] text-text-muted">Total</span>
            <span className="text-lg font-bold text-text-primary font-mono">
              {formatTotal(animatedTotal)}
              <span className="text-xs text-text-muted ml-0.5">₹</span>
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-3">
          {data.map((category) => (
            <motion.div
              key={category.name}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-center gap-2"
            >
              <div
                className={`w-1.5 h-4 rounded-full ${
                  markerStyles[category.name] || 'bg-white/30'
                }`}
                style={!markerStyles[category.name] ? { backgroundColor: category.color } : {}}
              />
              <span className="text-xs text-text-secondary font-medium">
                {category.name}
              </span>
              <span className="text-xs font-bold text-text-primary ml-auto">
                {category.value}%
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
