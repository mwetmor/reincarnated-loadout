import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChartCard } from './ChartCard';
import type { WinRateBin } from '../../hooks/useAnalytics';

export function WinRateHistogram({ data }: { data: WinRateBin[] }) {
  return (
    <ChartCard
      title="Win-Rate Distribution"
      subtitle="Actual win-rates across all classes and seasons"
      caption="Amber = intentional outlier (target deliberately set away from 50%). Most classes land in the 0.50–0.60 band."
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: '#111827',
              border: '1px solid #374151',
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: '#e5e7eb' }}
            itemStyle={{ color: '#9ca3af' }}
          />
          <Bar dataKey="regular" name="Standard" stackId="a" fill="#475569" />
          <Bar
            dataKey="outlier"
            name="Intentional outlier"
            stackId="a"
            fill="#f59e0b"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
