import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import { ChartCard } from './ChartCard';
import type { IterRange } from '../../hooks/useAnalytics';

export function ConvergenceChart({ data }: { data: IterRange[] }) {
  const chartHeight = Math.max(360, data.length * 30);

  return (
    <ChartCard
      title="Convergence Iterations by Archetype"
      subtitle="Min → max iterations to balance convergence across seasons"
      height={chartHeight}
      caption="Controllers and mages required up to 10 iterations. Hunter and Physical archetypes converged faster (4–7 iterations)."
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 36, left: 4, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" horizontal={false} />
          <YAxis
            dataKey="label"
            type="category"
            width={148}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <XAxis
            type="number"
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
            formatter={(value: unknown, name: unknown) => {
              const n = value as number;
              if (name === 'min_val') return [n, 'Min'];
              if (name === 'range') return [n, 'Spread (max − min)'];
              return [n, name as string];
            }}
          />
          <Bar dataKey="min_val" stackId="a" fill="transparent" legendType="none" />
          <Bar dataKey="range" stackId="a" fill="#374151" radius={[0, 3, 3, 0]}>
            <LabelList
              dataKey="max"
              position="right"
              style={{ fill: '#6b7280', fontSize: 10 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
