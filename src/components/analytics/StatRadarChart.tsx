import { useState } from 'react';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { ChartCard } from './ChartCard';
import type { StatRadarEntry } from '../../hooks/useAnalytics';

const STAT_LABELS: Record<string, string> = {
  strength: 'STR',
  dexterity: 'DEX',
  intelligence: 'INT',
  wisdom: 'WIS',
  vitality: 'VIT',
};

const STATS = ['strength', 'dexterity', 'intelligence', 'wisdom', 'vitality'] as const;

interface Props {
  entries: StatRadarEntry[];
  globalAvg: Omit<StatRadarEntry, 'archetype' | 'label'>;
}

export function StatRadarChart({ entries, globalAvg }: Props) {
  const [selectedArch, setSelectedArch] = useState(entries[0]?.archetype ?? '');

  const selected = entries.find((e) => e.archetype === selectedArch) ?? entries[0];

  const chartData = selected
    ? STATS.map((stat) => ({
        stat: STAT_LABELS[stat],
        archetype: selected[stat],
        global: globalAvg[stat],
      }))
    : [];

  return (
    <ChartCard
      title="Stat Allocation by Archetype"
      subtitle="Average % of 270-point stat budget allocated per stat. Gray overlay = cross-archetype mean."
      height={300}
      caption="INT/WIS-heavy archetypes (mages, controllers) and STR/DEX-heavy (warriors, rogues) show clear separation."
    >
      <div className="flex flex-col gap-3 h-full">
        {/* Archetype selector */}
        <select
          value={selectedArch}
          onChange={(e) => setSelectedArch(e.target.value)}
          className="self-start bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded px-2 py-1 focus:outline-none focus:border-violet-500 font-mono"
        >
          {entries.map((e) => (
            <option key={e.archetype} value={e.archetype}>
              {e.label}
            </option>
          ))}
        </select>

        {/* Radar */}
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
              <PolarGrid stroke="#1f2937" />
              <PolarAngleAxis
                dataKey="stat"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 70]}
                tick={{ fontSize: 9, fill: '#4b5563' }}
                tickCount={4}
              />
              {/* Global avg — rendered first so archetype overlay sits on top */}
              <Radar
                name="All archetypes avg"
                dataKey="global"
                stroke="#374151"
                fill="#374151"
                fillOpacity={0.25}
                strokeWidth={1}
              />
              <Radar
                name={selected?.label ?? ''}
                dataKey="archetype"
                stroke="#8b5cf6"
                fill="#8b5cf6"
                fillOpacity={0.35}
                strokeWidth={2}
              />
              <Legend
                iconSize={8}
                wrapperStyle={{ fontSize: 10, color: '#9ca3af' }}
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
                formatter={(value: unknown, name: unknown) => [`${value as number}%`, name as string]}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ChartCard>
  );
}
