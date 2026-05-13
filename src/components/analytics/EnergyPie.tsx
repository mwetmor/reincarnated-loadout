import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartCard } from './ChartCard';
import type { EnergySlice } from '../../hooks/useAnalytics';

const ENERGY_COLORS: Record<string, string> = {
  Mana: '#8b5cf6',
  Stamina: '#10b981',
  Combo: '#f59e0b',
  Focus: '#0ea5e9',
  Rage: '#f97316',
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
  payload: EnergySlice;
}

function EnergyLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, payload }: LabelProps) {
  if (percent < 0.04) return null;
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
        {(percent * 100).toFixed(0)}%
      </tspan>
    </text>
  );
}

export function EnergyPie({ data }: { data: EnergySlice[] }) {
  return (
    <ChartCard
      title="Energy Type Distribution"
      subtitle="Resource system used across all classes"
      caption="Mana dominates at ~81%. Stamina, Combo, Focus, and Rage account for the remaining ~19%."
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
            label={EnergyLabel as unknown as boolean}
          >
            {data.map((slice) => (
              <Cell key={slice.energy} fill={ENERGY_COLORS[slice.label] ?? FALLBACK_COLOR} />
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
