import type { SubstrateHeatmapRow } from '../../hooks/useAnalytics';

// Color intensity scale for substrate count cells.
// Max expected classes per substrate per season is ~3; scale to that.
function cellIntensity(count: number, maxCount: number): number {
  if (maxCount === 0 || count === 0) return 0;
  return Math.min(1, count / maxCount);
}

// Substrate column color — canonical keys for hue reference.
const SUBSTRATE_HUE: Record<string, string> = {
  fire:      '#f97316',
  water:     '#60a5fa',
  earth:     '#f59e0b',
  wind:      '#2dd4bf',
  lightning: '#eab308',
  holy:      '#a78bfa',
  shadow:    '#c084fc',
  physical:  '#94a3b8',
};

function substrateHue(sub: string): string {
  return SUBSTRATE_HUE[sub] ?? '#6b7280';
}

// Convert hex + alpha to rgba string
function hexAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

interface Props {
  rows: SubstrateHeatmapRow[];
  substrates: string[];
  newSubstrateSet: string[];
}

export function SubstrateHeatmap({ rows, substrates, newSubstrateSet }: Props) {
  if (!rows.length || !substrates.length) return null;

  // Find the max count across all cells for intensity scaling
  let maxCount = 1;
  for (const row of rows) {
    for (const count of Object.values(row.counts)) {
      if (count > maxCount) maxCount = count;
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 md:p-6 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-200 leading-tight">
          Substrate Distribution — Cross-Season Heatmap
        </h2>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
          Class count per dominant element per season. Color intensity scales to max observed count.
          Columns marked <span className="text-violet-400">*</span> are new in canonical-7
          (absent in historical 001xxx seasons).
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="text-[10px] font-mono border-collapse min-w-full">
          <thead>
            <tr>
              {/* Season column header */}
              <th className="text-left text-gray-600 pr-3 pb-1.5 font-normal whitespace-nowrap">
                Season
              </th>
              {/* Substrate column headers */}
              {substrates.map((sub) => {
                const isNew = newSubstrateSet.includes(sub);
                const hue = substrateHue(sub);
                return (
                  <th
                    key={sub}
                    className="text-center pb-1.5 font-normal px-1 whitespace-nowrap"
                    style={{ color: hue }}
                    title={isNew ? `${sub} — new in canonical-7` : sub}
                  >
                    {sub.slice(0, 3)}
                    {isNew && (
                      <span className="text-violet-400 text-[8px] align-super ml-px">*</span>
                    )}
                  </th>
                );
              })}
              {/* Validation */}
              <th className="text-center pb-1.5 font-normal pl-3 text-gray-600 whitespace-nowrap">
                ok?
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr
                key={row.seasonId}
                className={`${ri % 2 === 0 ? '' : 'bg-gray-950/30'} ${
                  row.isCanonical7 ? 'border-l-2 border-violet-700/40' : ''
                }`}
              >
                {/* Season label */}
                <td className="pr-3 py-0.5 whitespace-nowrap">
                  <span
                    className={row.isCanonical7 ? 'text-violet-300' : 'text-gray-500'}
                  >
                    {row.label}
                    {row.isCanonical7 && (
                      <span className="text-violet-600 text-[8px] ml-0.5">C7</span>
                    )}
                  </span>
                </td>
                {/* Substrate count cells */}
                {substrates.map((sub) => {
                  const count = row.counts[sub] ?? 0;
                  const intensity = cellIntensity(count, maxCount);
                  const hue = substrateHue(sub);
                  const bg = count > 0 ? hexAlpha(hue, intensity * 0.35 + 0.05) : 'transparent';
                  return (
                    <td
                      key={sub}
                      className="text-center px-1 py-0.5 rounded-sm"
                      style={{ backgroundColor: bg }}
                      title={count > 0 ? `${sub}: ${count} classes` : `${sub}: none`}
                    >
                      {count > 0 ? (
                        <span style={{ color: hexAlpha(hue, 0.7 + intensity * 0.3) }}>
                          {count}
                        </span>
                      ) : (
                        <span className="text-gray-800">—</span>
                      )}
                    </td>
                  );
                })}
                {/* Validation cell */}
                <td className="text-center pl-3 py-0.5">
                  {/* We don't have validation directly on the heatmap row, handled in summary cards */}
                  <span className="text-gray-700">·</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 border-t border-gray-800">
        <span className="text-[9px] font-mono text-gray-600">
          Cell value = class count with that dominant element in the season
        </span>
        <span className="text-[9px] font-mono text-violet-500/70">
          * = canonical-7 substrate (lightning / holy / shadow)
        </span>
        <span className="text-[9px] font-mono text-violet-600">
          C7 = canonical-7 season (002011-002015)
        </span>
      </div>
    </div>
  );
}
