import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from 'recharts';
import type { ClassData } from '../../data/types';
import { STAT_LABELS, SP_BUDGET } from '../../data/constants';

import { Card } from '../ui/Card';

// Cycle 11 M4: format a single coupling stat name → abbreviated label (INT, WIS, etc.)
function formatCoupledStat(statName: string): string {
  return STAT_LABELS[statName] ?? statName.slice(0, 3).toUpperCase();
}

interface StatsPanelProps {
  classData: ClassData;
  totalSP: number;
  remainingSP: number;
}

export function StatsPanel({ classData, totalSP, remainingSP }: StatsPanelProps) {
  const stats = classData.stat_distribution;
  const statEntries = Object.entries(stats) as [keyof typeof stats, number][];
  // Cycle 11 M4: null-safe — absent key on pre-Cycle-11 legacy seasons resolves to []
  const attributeCoupling: string[] = classData.attribute_coupling ?? [];

  const radarData = statEntries.map(([key, value]) => ({
    stat: STAT_LABELS[key] ?? key.toUpperCase(),
    value,
    fullMark: 130,
  }));

  const spPercent = Math.min((totalSP / SP_BUDGET) * 100, 100);

  return (
    <Card>
      <h3 className="text-xs font-mono text-gray-500 uppercase tracking-wide mb-4">
        Stats &amp; SP Budget
      </h3>

      <div className="flex flex-col sm:flex-row gap-6 items-start">
        {/* Radar chart */}
        <div className="w-full sm:w-48 h-40 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} margin={{ top: 0, right: 16, bottom: 0, left: 16 }}>
              <PolarGrid stroke="#374151" />
              <PolarAngleAxis
                dataKey="stat"
                tick={{ fill: '#9ca3af', fontSize: 10, fontFamily: 'monospace' }}
              />
              <Radar
                name="stats"
                dataKey="value"
                stroke="#7c3aed"
                fill="#7c3aed"
                fillOpacity={0.25}
                strokeWidth={1.5}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Raw stat numbers */}
        <div className="flex-1 space-y-2 min-w-0">
          {statEntries.map(([key, value]) => {
            const max = 130;
            const pct = Math.min((value / max) * 100, 100);
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="text-xs font-mono text-gray-500 w-8 flex-shrink-0">
                  {STAT_LABELS[key]}
                </span>
                <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-600 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-gray-300 w-8 text-right flex-shrink-0">
                  {value}
                </span>
              </div>
            );
          })}

          {/* Attribute coupling label — Cycle 11 M4; absent on pre-Cycle-11 seasons */}
          {attributeCoupling.length > 0 && (
            <div className="pt-2 mt-1 flex items-center gap-2">
              <span className="text-xs font-mono text-gray-500">Coupled:</span>
              <span className="text-xs font-mono text-violet-400">
                {attributeCoupling.map(formatCoupledStat).join(' + ')}
              </span>
            </div>
          )}

          {/* SP Budget */}
          <div className="pt-3 border-t border-gray-800 mt-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-mono text-gray-500 uppercase tracking-wide">SP Budget</span>
              <span className="text-xs font-mono text-gray-300">
                <span className={totalSP > 0 ? 'text-emerald-400' : ''}>{totalSP}</span>
                <span className="text-gray-600"> / {SP_BUDGET}</span>
              </span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  remainingSP <= 10 ? 'bg-amber-500' : 'bg-emerald-600'
                }`}
                style={{ width: `${spPercent}%` }}
              />
            </div>
            <p className="text-xs text-gray-600 mt-1 font-mono text-right">
              {remainingSP} SP remaining
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
