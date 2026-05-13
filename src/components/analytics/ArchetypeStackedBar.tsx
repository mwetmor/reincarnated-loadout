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
import type { ArchetypeSeasonRow } from '../../hooks/useAnalytics';
import { archetypeLabel } from '../../hooks/useAnalytics';

const PALETTE = [
  '#94a3b8',
  '#10b981',
  '#f59e0b',
  '#3b82f6',
  '#8b5cf6',
  '#06b6d4',
  '#f97316',
  '#ec4899',
  '#14b8a6',
  '#a855f7',
  '#84cc16',
  '#0ea5e9',
  '#d946ef',
  '#22c55e',
];

interface Props {
  data: ArchetypeSeasonRow[];
  archetypes: string[];
}

export function ArchetypeStackedBar({ data, archetypes }: Props) {
  const chartData = data.map((row) => ({ ...row, _season: row.seasonLabel }));

  return (
    <ChartCard
      title="Archetype Distribution by Season"
      subtitle="Class mix across 5 seasons — hover a segment to identify the archetype"
      height={320}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
          <XAxis
            dataKey="_season"
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
            formatter={(value: unknown, name: unknown) => {
              const n = value as number;
              if (n === 0) return null;
              return [n, archetypeLabel(name as string)];
            }}
          />
          {archetypes.map((arch, i) => (
            <Bar
              key={arch}
              dataKey={arch}
              stackId="a"
              fill={PALETTE[i % PALETTE.length]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
