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
import type { ModifierRange } from '../../hooks/useAnalytics';

export function ModifierRangeChart({ data }: { data: ModifierRange[] }) {
  const chartHeight = Math.max(380, data.length * 30);

  return (
    <ChartCard
      title="Balance Modifier Range by Archetype"
      subtitle="Horizontal bar spans min → max final_modifier across all seasons"
      height={chartHeight}
      caption="Hunter (~0.70–0.88) and Experimental (~0.82) are far outside the caster/mage cluster (0.05–0.20). Controllers vary more than mages."
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 52, left: 4, bottom: 4 }}
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
            tick={{ fontSize: 11, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => v.toFixed(2)}
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
              if (name === 'min_val') return [n.toFixed(3), 'Min'];
              if (name === 'range') return [n.toFixed(3), 'Spread (max − min)'];
              return [n, name as string];
            }}
          />
          {/* Transparent base: pushes visible bar from 0→min */}
          <Bar dataKey="min_val" stackId="a" fill="transparent" legendType="none" />
          {/* Visible range bar: min→max */}
          <Bar dataKey="range" stackId="a" fill="#475569" radius={[0, 3, 3, 0]}>
            <LabelList
              dataKey="max"
              position="right"
              formatter={(v: unknown) => (typeof v === 'number' ? v.toFixed(2) : String(v ?? ''))}
              style={{ fill: '#6b7280', fontSize: 10 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
