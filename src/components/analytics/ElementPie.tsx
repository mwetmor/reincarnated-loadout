import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartCard } from './ChartCard';
import type { ElementSlice } from '../../hooks/useAnalytics';

// Deliberately non-element-themed categorical colors
const ELEMENT_COLORS: Record<string, string> = {
  fire: '#f97316',
  water: '#0ea5e9',
  earth: '#84cc16',
  wind: '#06b6d4',
  physical: '#94a3b8',
};

const FALLBACK_COLOR = '#6b7280';

const RADIAN = Math.PI / 180;

interface LabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
  payload: ElementSlice;
}

function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, payload }: LabelProps) {
  if (percent < 0.05) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.52;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      style={{ pointerEvents: 'none' }}
    >
      <tspan x={x} dy="-6" fontSize={11} fontWeight={700} fill="#0f172a">
        {payload.label}
      </tspan>
      <tspan x={x} dy="14" fontSize={10} fill="#1e293b">
        {(percent * 100).toFixed(1)}%
      </tspan>
    </text>
  );
}

export function ElementPie({ data }: { data: ElementSlice[] }) {
  return (
    <ChartCard
      title="Element Distribution"
      subtitle="Dominant element across all classes"
      caption="Fire over-represented at 23.1% — expected 20% in a balanced 5-element system."
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius="30%"
            outerRadius="60%"
            dataKey="count"
            nameKey="label"
            labelLine={false}
            label={PieLabel as unknown as boolean}
          >
            {data.map((slice) => (
              <Cell
                key={slice.element}
                fill={ELEMENT_COLORS[slice.element] ?? FALLBACK_COLOR}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: '#111827',
              border: '1px solid #374151',
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value: unknown, name: unknown) => [`${value as number} classes`, name as string]}
            itemStyle={{ color: '#9ca3af' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
