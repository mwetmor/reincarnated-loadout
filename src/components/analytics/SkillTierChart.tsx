import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ChartCard } from './ChartCard';
import type { SkillTierBar } from '../../hooks/useAnalytics';

const TIER_COLORS = {
  t1: '#4b5563', // gray-600 — foundation skills
  t2: '#2563eb', // blue-600
  t3: '#7c3aed', // violet-700
  t4: '#d97706', // amber-600
};

const TIER_LABELS = {
  t1: 'T1',
  t2: 'T2',
  t3: 'T3',
  t4: 'T4',
};

interface Props {
  data: SkillTierBar[];
}

export function SkillTierChart({ data }: Props) {
  if (!data.length) return null;

  const chartHeight = Math.max(340, data.length * 28);

  return (
    <ChartCard
      title="Skill Tree Composition by Archetype"
      subtitle="Avg skill count per tier — T1 (foundation) through T4 (capstone). Yomi season only."
      height={chartHeight}
      caption="Yomi season (season_002328) — older seasons lack tier metadata. Most archetypes are T1-heavy; T4 capstones appear only in select archetypes."
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 36, left: 4, bottom: 4 }}
          barSize={10}
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
            allowDecimals={true}
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
              const label = TIER_LABELS[name as keyof typeof TIER_LABELS] ?? String(name);
              return [`${(value as number).toFixed(1)} skills`, label];
            }}
          />
          <Legend
            iconSize={8}
            wrapperStyle={{ fontSize: 10, color: '#9ca3af' }}
            formatter={(value) => TIER_LABELS[value as keyof typeof TIER_LABELS] ?? value}
          />
          <Bar dataKey="t1" stackId="a" fill={TIER_COLORS.t1} name="t1" />
          <Bar dataKey="t2" stackId="a" fill={TIER_COLORS.t2} name="t2" />
          <Bar dataKey="t3" stackId="a" fill={TIER_COLORS.t3} name="t3" />
          <Bar dataKey="t4" stackId="a" fill={TIER_COLORS.t4} name="t4" radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
