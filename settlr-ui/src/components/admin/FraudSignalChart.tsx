// FraudSignalChart — horizontal bar chart showing fraud rule fire counts + TPM line chart
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import { Card } from '../ui/Card';
import type { SignalBreakdown, TransactionPerMinute } from '../../types';

// Friendly names for fraud rules
const RULE_SHORT_NAMES: Record<string, string> = {
  VELOCITY_CHECK: 'Velocity',
  AMOUNT_ANOMALY: 'Amount',
  UNUSUAL_HOUR: 'Hour',
  NEW_ACCOUNT: 'New Acct',
  ROUND_AMOUNT: 'Round',
  RECIPIENT_RISK: 'Recipient',
};

interface FraudSignalChartProps {
  signalBreakdown: SignalBreakdown[];
  transactionsPerMinute: TransactionPerMinute[];
}

/** Transactions per minute line chart + fraud signal breakdown bar chart */
export function FraudSignalChart({ signalBreakdown, transactionsPerMinute }: FraudSignalChartProps) {
  // Format signal data with friendly names
  const barData = signalBreakdown.map((s) => ({
    name: RULE_SHORT_NAMES[s.ruleName] ?? s.ruleName,
    count: s.count,
  }));

  // Format TPM data with time labels
  const lineData = transactionsPerMinute.map((t) => {
    const d = new Date(t.timestamp);
    return {
      time: `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`,
      count: t.count,
    };
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Transactions per minute chart */}
      <Card className="space-y-3">
        <h4 className="text-sm font-semibold text-text-primary">Transactions Per Minute</h4>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={lineData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3a" />
            <XAxis
              dataKey="time"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              axisLine={{ stroke: '#2a2a3a' }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#111118',
                border: '1px solid #2a2a3a',
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: '#f1f5f9' }}
              itemStyle={{ color: '#818cf8' }}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ r: 3, fill: '#6366f1' }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Signal breakdown bar chart */}
      <Card className="space-y-3">
        <h4 className="text-sm font-semibold text-text-primary">Signal Breakdown</h4>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={barData} layout="vertical" margin={{ left: 10 }}>
            <XAxis
              type="number"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              axisLine={{ stroke: '#2a2a3a' }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={70}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#111118',
                border: '1px solid #2a2a3a',
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: '#f1f5f9' }}
              itemStyle={{ color: '#818cf8' }}
              formatter={(value: number) => [`${value} fires`, 'Count']}
            />
            <Bar
              dataKey="count"
              fill="#6366f1"
              radius={[0, 4, 4, 0]}
              maxBarSize={24}
            />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
