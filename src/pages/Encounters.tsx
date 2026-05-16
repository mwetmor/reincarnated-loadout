// Encounter Analytics — v0.7
// Multi-dimensional centroid + stdev-ellipse clustering across (class, encounter-slot) pairs.
//
// Data: season_001005 (11 classes, 22 encounter slots) via encounter_analytics.json.
// When gamora Option 2 Yomi regen lands (tier1_populated: true):
//   - avg_duration / std_duration / avg_heals become non-null
//   - Default projection can switch to Damage × TTK as designed
// TODO(drax): switch default projection to Damage×TTK once gamora Option 2 regen ships (tier1_populated)
//
// View A interpretation (locked 2026-05-16 per decisions-log):
//   - AOE classes outperforming single-target classes on swarm encounter slots is genre-correct
//     AOE-payoff working as designed — NOT a balance failure.
//   - Single-target classes reduced clear-speed on swarm slots is expected.
//   - AOE classes with wide dispersion on boss/mini-boss slots is the diagnostic for
//     whether they're "less efficient" (acceptable) vs "helpless" (playable-floor failure).
//   - Divergence ceiling: per-class WR per encounter-slot < 25% is flagged (red indicator).

import { useState } from 'react';
import {
  useEncounterAnalytics,
  type EncounterPoint,
} from '../hooks/useEncounterAnalytics';

// ── Constants ─────────────────────────────────────────────────────────────────

const DIVERGENCE_WR_CEIL = 0.25; // flag below this win rate

// Fixed class colors (11 classes in season_001005; Yomi will have 14)
const CLASS_COLORS: Record<string, string> = {
  class_0001: '#f97316',
  class_0002: '#a78bfa',
  class_0003: '#34d399',
  class_0004: '#60a5fa',
  class_0005: '#fbbf24',
  class_0006: '#f472b6',
  class_0007: '#2dd4bf',
  class_0008: '#a3e635',
  class_0009: '#e879f9',
  class_0010: '#fb7185',
  class_0011: '#94a3b8',
};
const DEFAULT_CLASS_COLOR = '#6b7280';

const SLOT_LABELS: Record<string, string> = {
  swarm:       'Swarm',
  magic:       'Magic',
  trash:       'Trash',
  elite:       'Elite',
  'mini-boss': 'Mini-Boss',
  boss:        'Boss',
  unknown:     '?',
};

// ── SVG scatter helpers ───────────────────────────────────────────────────────

const SVG_W = 160;
const SVG_H = 120;
const PAD_L = 14;   // left: room for tick labels
const PAD_R = 8;
const PAD_T = 8;
const PAD_B = 16;   // bottom: room for axis label
const PLOT_W = SVG_W - PAD_L - PAD_R;
const PLOT_H = SVG_H - PAD_T - PAD_B;

function scaleX(dmg: number, [dMin, dMax]: [number, number]): number {
  if (dMax === dMin) return PAD_L + PLOT_W / 2;
  return PAD_L + ((dmg - dMin) / (dMax - dMin)) * PLOT_W;
}

function scaleY(wr: number): number {
  // 0 at bottom, 1 at top; SVG Y is inverted
  return PAD_T + (1 - wr) * PLOT_H;
}

function wrStdev(wr: number): number {
  // Binomial population stdev: sqrt(p*(1-p))
  return Math.sqrt(wr * (1 - wr));
}

// ── ScatterDot — one centroid + ellipse ───────────────────────────────────────

interface ScatterDotProps {
  enc: EncounterPoint;
  color: string;
  xExtent: [number, number];
  label: string;
}

function ScatterDot({ enc, color, xExtent, label }: ScatterDotProps) {
  const { avg_damage, std_damage, win_rate } = enc;
  if (avg_damage == null || win_rate == null) return null;

  const cx = scaleX(avg_damage, xExtent);
  const cy = scaleY(win_rate);
  const damageRange = xExtent[1] - xExtent[0];

  // Ellipse radii in SVG pixels
  const rx = std_damage != null ? Math.max(2, (std_damage / damageRange) * PLOT_W) : 0;
  const ry = Math.max(1, wrStdev(win_rate) * PLOT_H * 0.35);

  const flagged = win_rate < DIVERGENCE_WR_CEIL;

  return (
    <g role="img" aria-label={`${label}: avg damage ${Math.round(avg_damage)}, WR ${(win_rate * 100).toFixed(1)}%`}>
      {/* Stdev ellipse */}
      {(rx > 0 || ry > 0) && (
        <ellipse
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          fill={color}
          fillOpacity={0.12}
          stroke={flagged ? '#ef4444' : color}
          strokeWidth={flagged ? 1.5 : 0.8}
          strokeOpacity={flagged ? 0.9 : 0.5}
          strokeDasharray={flagged ? '3,2' : undefined}
        />
      )}
      {/* Centroid dot */}
      <circle
        cx={cx}
        cy={cy}
        r={flagged ? 4 : 3}
        fill={flagged ? '#ef4444' : color}
        fillOpacity={0.9}
        stroke={flagged ? '#fca5a5' : '#111827'}
        strokeWidth={0.8}
      />
    </g>
  );
}

// ── ScatterCard — one small-multiple card ─────────────────────────────────────

interface ScatterCardProps {
  title: string;
  subtitle?: string;
  points: Array<{
    enc: EncounterPoint;
    color: string;
    label: string;
  }>;
  xExtent: [number, number];
  hasFlag: boolean;          // any point below divergence ceiling
}

function ScatterCard({ title, subtitle, points, xExtent, hasFlag }: ScatterCardProps) {
  return (
    <div
      className={`rounded border bg-gray-900/70 p-1.5 flex flex-col gap-1 ${
        hasFlag ? 'border-red-900/60' : 'border-gray-800'
      }`}
    >
      {/* Card header */}
      <div className="flex items-center gap-1 min-w-0">
        {hasFlag && (
          <span className="text-[9px] text-red-400 flex-shrink-0" title="At least one encounter below 25% WR">⚑</span>
        )}
        <p className="text-[10px] font-mono text-gray-300 truncate">{title}</p>
      </div>
      {subtitle && (
        <p className="text-[9px] font-mono text-gray-600 truncate -mt-0.5">{subtitle}</p>
      )}

      {/* SVG scatter */}
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="w-full rounded bg-gray-950/50"
        style={{ aspectRatio: `${SVG_W}/${SVG_H}` }}
      >
        {/* Plot area border */}
        <rect
          x={PAD_L}
          y={PAD_T}
          width={PLOT_W}
          height={PLOT_H}
          fill="none"
          stroke="#1f2937"
          strokeWidth={0.5}
        />

        {/* Y gridlines at 0.25 and 0.75 */}
        {[0.25, 0.5, 0.75].map((wr) => (
          <line
            key={wr}
            x1={PAD_L}
            x2={PAD_L + PLOT_W}
            y1={scaleY(wr)}
            y2={scaleY(wr)}
            stroke={wr === 0.25 ? '#7f1d1d' : '#1f2937'}
            strokeWidth={wr === 0.25 ? 0.8 : 0.4}
            strokeDasharray={wr === 0.25 ? '3,2' : '2,3'}
          />
        ))}

        {/* Y axis tick labels */}
        {[0, 0.5, 1].map((wr) => (
          <text
            key={wr}
            x={PAD_L - 2}
            y={scaleY(wr) + 3}
            textAnchor="end"
            fontSize={7}
            fill="#4b5563"
            fontFamily="ui-monospace, monospace"
          >
            {wr === 0 ? '0%' : wr === 0.5 ? '50%' : '100%'}
          </text>
        ))}

        {/* Data points */}
        {points.map((p, i) => (
          <ScatterDot
            key={i}
            enc={p.enc}
            color={p.color}
            xExtent={xExtent}
            label={p.label}
          />
        ))}

        {/* X axis label */}
        <text
          x={PAD_L + PLOT_W / 2}
          y={SVG_H - 3}
          textAnchor="middle"
          fontSize={7}
          fill="#4b5563"
          fontFamily="ui-monospace, monospace"
        >
          Avg Damage →
        </text>
      </svg>
    </div>
  );
}

// ── Legend ─────────────────────────────────────────────────────────────────────

function SlotLegend({ slotColors }: { slotColors: Record<string, string> }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {Object.entries(slotColors).filter(([k]) => k !== 'unknown').map(([slot, color]) => (
        <div key={slot} className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          <span className="text-[10px] font-mono text-gray-500">{SLOT_LABELS[slot] ?? slot}</span>
        </div>
      ))}
      <div className="flex items-center gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-red-500 bg-red-500" />
        <span className="text-[10px] font-mono text-red-500/70">WR &lt; 25%</span>
      </div>
    </div>
  );
}

function ClassLegend({ classIds }: { classIds: string[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {classIds.map((cid) => (
        <div key={cid} className="flex items-center gap-1.5">
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: CLASS_COLORS[cid] ?? DEFAULT_CLASS_COLOR }}
          />
          <span className="text-[10px] font-mono text-gray-500">{cid}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type ViewMode = 'class' | 'slot';

export function Encounters() {
  const [view, setView] = useState<ViewMode>('class');
  const analytics = useEncounterAnalytics();

  const xExtent = analytics.global_damage_extent;

  // ── View 1: Per-class small multiples ──────────────────────────────────────
  const classCards = analytics.class_ids.map((cid) => {
    const cls = analytics.classes[cid];
    const points = cls.encounters.map((enc) => ({
      enc,
      color: analytics.slot_type_colors[enc.slot_type] ?? '#6b7280',
      label: `${enc.slot_type} (${enc.monster_id})`,
    }));
    const hasFlag = cls.encounters.some(
      (e) => e.win_rate != null && e.win_rate < DIVERGENCE_WR_CEIL
    );
    const aoeLabel = `AOE ${(cls.geometry_mix.aoe_pct * 100).toFixed(0)}%`;
    return { cid, points, hasFlag, aoeLabel };
  });

  // ── View 2: Per-encounter-slot small multiples ─────────────────────────────
  const slotCards = analytics.encounter_slots.map((slot) => {
    const entries = analytics.by_slot[slot.monster_id] ?? [];
    const points = entries.map(({ class_id, point }) => ({
      enc: point,
      color: CLASS_COLORS[class_id] ?? DEFAULT_CLASS_COLOR,
      label: class_id,
    }));
    const hasFlag = entries.some(
      ({ point }) => point.win_rate != null && point.win_rate < DIVERGENCE_WR_CEIL
    );
    return { slot, points, hasFlag };
  });

  // ── Count flagged ──────────────────────────────────────────────────────────
  const flaggedClassCount = classCards.filter((c) => c.hasFlag).length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">

      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-lg font-bold text-gray-100">Encounter Analytics</h1>
        <p className="text-xs text-gray-500 font-mono">
          season_001005 · {analytics.class_ids.length} classes · {analytics.encounter_slots.length} encounter slots
          {!analytics.tier1_populated && (
            <span className="text-amber-700 ml-2">
              (Tier-1 fields pending — Yomi regen not yet complete; using Damage × Win Rate projection)
            </span>
          )}
        </p>
      </div>

      {/* View A interpretation callout */}
      <div className="rounded-lg border border-gray-800 bg-gray-900/40 px-4 py-3 space-y-1.5">
        <p className="text-[10px] font-mono text-gray-500 font-semibold uppercase tracking-wide">
          Design interpretation (View A · locked 2026-05-16)
        </p>
        <ul className="text-[10px] font-mono text-gray-500 space-y-1 list-none">
          <li>
            <span className="text-gray-400">·</span>{' '}
            AOE classes clearing swarm slots faster than single-target classes is{' '}
            <span className="text-emerald-500/80">genre-correct AOE payoff</span> — not a balance failure.
          </li>
          <li>
            <span className="text-gray-400">·</span>{' '}
            Single-target classes showing reduced clear-speed on swarm slots is{' '}
            <span className="text-emerald-500/80">expected</span>; their payoff is boss/elite efficiency.
          </li>
          <li>
            <span className="text-gray-400">·</span>{' '}
            AOE classes with wide dispersion on boss slots:{' '}
            <span className="text-amber-500/80">diagnostic</span> — "less efficient" is acceptable;
            WR below 25% (⚑) is a playable-floor failure.
          </li>
        </ul>
        {flaggedClassCount > 0 && (
          <p className="text-[10px] font-mono text-red-400/80 pt-0.5">
            ⚑ {flaggedClassCount} of {analytics.class_ids.length} classes have at least one encounter slot below 25% WR (divergence ceiling).
          </p>
        )}
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono text-gray-600 uppercase tracking-wide">View:</span>
        <button
          onClick={() => setView('class')}
          className={`text-xs font-mono px-3 py-1 rounded border transition-colors ${
            view === 'class'
              ? 'bg-violet-900/40 border-violet-700 text-violet-300'
              : 'bg-gray-900 border-gray-700 text-gray-500 hover:text-gray-400'
          }`}
        >
          Per-class
        </button>
        <button
          onClick={() => setView('slot')}
          className={`text-xs font-mono px-3 py-1 rounded border transition-colors ${
            view === 'slot'
              ? 'bg-violet-900/40 border-violet-700 text-violet-300'
              : 'bg-gray-900 border-gray-700 text-gray-500 hover:text-gray-400'
          }`}
        >
          Per-encounter-slot
        </button>
      </div>

      {/* Legend */}
      {view === 'class' ? (
        <SlotLegend slotColors={analytics.slot_type_colors} />
      ) : (
        <ClassLegend classIds={analytics.class_ids} />
      )}

      {/* Small multiples grid — View 1: Per-class */}
      {view === 'class' && (
        <>
          <p className="text-[10px] font-mono text-gray-600">
            Each card: one class · one point per encounter slot · X = avg damage dealt · Y = win rate
            · ellipse = damage stdev × outcome variance
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {classCards.map(({ cid, points, hasFlag, aoeLabel }) => (
              <ScatterCard
                key={cid}
                title={cid}
                subtitle={aoeLabel}
                points={points}
                xExtent={xExtent}
                hasFlag={hasFlag}
              />
            ))}
          </div>
        </>
      )}

      {/* Small multiples grid — View 2: Per-encounter-slot */}
      {view === 'slot' && (
        <>
          <p className="text-[10px] font-mono text-gray-600">
            Each card: one encounter slot · one point per class · X = avg damage dealt · Y = win rate
            · ellipse = damage stdev × outcome variance · color = class
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {slotCards.map(({ slot, points, hasFlag }) => {
              const label = `${SLOT_LABELS[slot.slot_type] ?? slot.slot_type}${slot.is_pack ? ' (Pack)' : ''}`;
              return (
                <ScatterCard
                  key={slot.monster_id}
                  title={label}
                  subtitle={slot.monster_id}
                  points={points}
                  xExtent={xExtent}
                  hasFlag={hasFlag}
                />
              );
            })}
          </div>
        </>
      )}

      {/* Footer notes */}
      <div className="space-y-1 pt-2 border-t border-gray-800">
        <p className="text-[9px] font-mono text-gray-700">
          Projection: Damage Dealt × Win Rate (default until Tier-1 regen; tier-1 will enable Damage × Time-to-Kill).
          Stdev ellipse: rx = σ(damage), ry = √(WR × (1−WR)) × scale.
          Divergence ceiling: red ⚑ = WR &lt; 25% per slot (Lock 2 threshold).
          Pack encounters shown alongside 1v1 — pack fights excluded from convergence binary-search (Option 2) but included here as diagnostic.
        </p>
        <p className="text-[9px] font-mono text-gray-700">
          Data: season_001005 · {analytics.tier1_populated ? 'Tier-1 populated' : 'Tier-1 pending (gamora Option 2 regen)'}
          · v0.7 · roll-in of v0.6 encounter-viz (drax/v0.6-encounter-viz tag retained as history)
        </p>
      </div>
    </div>
  );
}
