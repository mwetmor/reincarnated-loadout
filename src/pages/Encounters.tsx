// Encounter Visualization — v0.6
// Shows AOE vs single-target interactions against a swarm pack.
// Pack size N = 8 (design-intent placeholder; exact value locked by gamora in B10.2).
// // TODO: wire B11 geometry field when rocket ships it — replace effect_category inference
// Geometry inference table (until B11):
//   area_damage → AOE overlay (circle)
//   single_target_damage / burst_damage / damage_over_time → point/single-target
//   control / mobility / defensive / sustain / utility → not rendered

import { useState } from 'react';
import type { ClassData, Skill } from '../data/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
import class0001Raw from '../../data/season_002328/classes/class_0001.json';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import class0005Raw from '../../data/season_002328/classes/class_0005.json';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import class0010Raw from '../../data/season_002328/classes/class_0010.json';

// ── Data ─────────────────────────────────────────────────────────────────────

const ENCOUNTER_CLASSES = [class0001Raw, class0005Raw, class0010Raw] as unknown as ClassData[];

const PACK_N = 8; // design-intent placeholder per B10.2 math phase (M1)

// Pack circle positions (absolute SVG coordinates), loose cluster centered ~(108,90)
const PACK_POSITIONS: [number, number][] = [
  [78, 52], [110, 46], [142, 56],   // top row
  [64, 84], [98, 88], [130, 82],    // middle row
  [82, 118], [116, 115],             // bottom row
];
const SINGLE_TARGET_IDX = 4; // [98, 88] — closest to cluster center

const CLUSTER_CX = 108;
const CLUSTER_CY = 90;
const CIRCLE_R = 12;    // swarm-tier circle radius
const AOE_R = 70;       // AOE circle radius (covers all 8 pack members)

// Canonical element → hex color for pack circle fill
const ELEMENT_HEX: Record<string, string> = {
  fire:     '#f97316',
  wind:     '#2dd4bf',
  water:    '#60a5fa',
  earth:    '#d97706',
  physical: '#94a3b8',
};

// ── Color helpers ─────────────────────────────────────────────────────────────

// color_value from engine skills is calibrated for Pixi.js (often dark for Yomi palette).
// Boost each channel by 100 so the overlay is visible on a dark UI background.
// Read from color_value per dispatch spec; brightness adjustment is presentation-side only.
function boostedSkillColor(colorValue: number): string {
  const boost = (c: number) => Math.min(255, c + 100).toString(16).padStart(2, '0');
  const r = boost((colorValue >> 16) & 0xFF);
  const g = boost((colorValue >> 8) & 0xFF);
  const b = boost(colorValue & 0xFF);
  return `#${r}${g}${b}`;
}

// ── Skill finders ─────────────────────────────────────────────────────────────

function findAoeSkill(cls: ClassData): Skill | null {
  return cls.skills.find((s) => s.effect_category === 'area_damage') ?? null;
}

function findPrimarySkill(cls: ClassData): Skill | null {
  return cls.skills.find((s) => s.role === 'primary_attack') ?? null;
}

// ── SVG panels ───────────────────────────────────────────────────────────────

function PackCircles({ packColor }: { packColor: string }) {
  return (
    <>
      {PACK_POSITIONS.map(([cx, cy], i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={CIRCLE_R}
          fill={packColor}
          fillOpacity={0.75}
          stroke={packColor}
          strokeWidth={1.5}
          strokeOpacity={0.4}
        />
      ))}
    </>
  );
}

function AoePanel({ cls }: { cls: ClassData }) {
  const packColor = ELEMENT_HEX[cls.dominant_element] ?? ELEMENT_HEX['physical'];
  const aoeSkill = findAoeSkill(cls);
  const aoeColor = aoeSkill ? boostedSkillColor(aoeSkill.color_value) : null;

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-mono text-gray-500 uppercase tracking-wide text-center">
        AOE vs Pack
      </h3>
      <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-2">
        <svg viewBox="0 0 216 200" className="w-full" aria-label="AOE encounter diagram">
          {/* AOE overlay — drawn first so pack circles appear on top */}
          {aoeColor ? (
            <circle
              cx={CLUSTER_CX}
              cy={CLUSTER_CY}
              r={AOE_R}
              fill={aoeColor}
              fillOpacity={0.18}
              stroke={aoeColor}
              strokeWidth={2.5}
              strokeOpacity={0.85}
            />
          ) : (
            <circle
              cx={CLUSTER_CX}
              cy={CLUSTER_CY}
              r={AOE_R}
              fill="none"
              stroke="#374151"
              strokeWidth={1.5}
              strokeDasharray="8,5"
            />
          )}

          {/* Pack circles */}
          <PackCircles packColor={packColor} />

          {/* Pack label */}
          <text
            x={CLUSTER_CX}
            y={166}
            textAnchor="middle"
            fontSize={10}
            fill="#6b7280"
            fontFamily="ui-monospace, monospace"
          >
            Swarm Pack ({PACK_N})
          </text>

          {/* Hit annotation */}
          {aoeColor ? (
            <>
              <text x={CLUSTER_CX} y={181} textAnchor="middle" fontSize={9} fill="#d1d5db" fontFamily="ui-monospace, monospace">
                {aoeSkill!.name}
              </text>
              <text x={CLUSTER_CX} y={194} textAnchor="middle" fontSize={9} fill="#a78bfa" fontFamily="ui-monospace, monospace" fontWeight="600">
                {PACK_N}/{PACK_N} hits → ~{PACK_N}x vs single target
              </text>
            </>
          ) : (
            <>
              <text x={CLUSTER_CX} y={181} textAnchor="middle" fontSize={9} fill="#6b7280" fontFamily="ui-monospace, monospace">
                No area_damage skill
              </text>
              <text x={CLUSTER_CX} y={194} textAnchor="middle" fontSize={9} fill="#6b7280" fontFamily="ui-monospace, monospace">
                0/{PACK_N} hits — 1x multiplier only
              </text>
            </>
          )}
        </svg>
      </div>
    </div>
  );
}

function SingleTargetPanel({ cls }: { cls: ClassData }) {
  const packColor = ELEMENT_HEX[cls.dominant_element] ?? ELEMENT_HEX['physical'];
  const primarySkill = findPrimarySkill(cls);
  const [tx, ty] = PACK_POSITIONS[SINGLE_TARGET_IDX];
  // Accent color: boosted from primary skill's color_value, or violet fallback
  const accentColor = primarySkill ? boostedSkillColor(primarySkill.color_value) : '#a78bfa';

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-mono text-gray-500 uppercase tracking-wide text-center">
        Single Target vs Pack
      </h3>
      <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-2">
        <svg viewBox="0 0 216 200" className="w-full" aria-label="Single target encounter diagram">
          {/* Pack circles */}
          <PackCircles packColor={packColor} />

          {/* Target highlight ring */}
          <circle
            cx={tx}
            cy={ty}
            r={CIRCLE_R + 8}
            fill="none"
            stroke={accentColor}
            strokeWidth={2.5}
            strokeOpacity={0.9}
          />
          {/* Arrow-like tick marks indicating "targeted" */}
          <line x1={tx} y1={ty - CIRCLE_R - 16} x2={tx} y2={ty - CIRCLE_R - 8} stroke={accentColor} strokeWidth={2} strokeOpacity={0.9} />

          {/* Pack label */}
          <text
            x={CLUSTER_CX}
            y={166}
            textAnchor="middle"
            fontSize={10}
            fill="#6b7280"
            fontFamily="ui-monospace, monospace"
          >
            Swarm Pack ({PACK_N})
          </text>

          {/* Hit annotation */}
          <text x={CLUSTER_CX} y={181} textAnchor="middle" fontSize={9} fill="#d1d5db" fontFamily="ui-monospace, monospace">
            {primarySkill?.name ?? 'Primary Attack'}
          </text>
          <text x={CLUSTER_CX} y={194} textAnchor="middle" fontSize={9} fill="#9ca3af" fontFamily="ui-monospace, monospace">
            1/{PACK_N} hits → 1x
          </text>
        </svg>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function Encounters() {
  const [selectedId, setSelectedId] = useState(ENCOUNTER_CLASSES[0].id);
  const cls = ENCOUNTER_CLASSES.find((c) => c.id === selectedId) ?? ENCOUNTER_CLASSES[0];
  const aoeSkill = findAoeSkill(cls);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-lg font-bold text-gray-100">Encounter Visualization</h1>
        <p className="text-xs text-gray-500 font-mono leading-relaxed">
          B10.2 pack proxy mechanics — one AOE skill hitting all {PACK_N} swarm pack members
          simultaneously produces ~{PACK_N}x damage vs a single-target class against the same pack.
          Pack size ≈{PACK_N} (B10.2 design intent; exact value locked by gamora).
        </p>
      </div>

      {/* Class selector */}
      <div className="flex items-center gap-3">
        <label className="text-xs text-gray-600 font-mono flex-shrink-0">Class:</label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="flex-1 max-w-xs bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded px-2 py-1 focus:outline-none focus:border-violet-500"
        >
          {ENCOUNTER_CLASSES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name ?? c.id}
            </option>
          ))}
        </select>

        {/* AOE indicator badge */}
        <span
          className={`text-xs font-mono px-2 py-0.5 rounded border ${
            aoeSkill
              ? 'text-violet-300 border-violet-700 bg-violet-950/50'
              : 'text-gray-500 border-gray-700 bg-gray-900/50'
          }`}
        >
          {aoeSkill ? `AOE: ${aoeSkill.name}` : 'No AOE skill'}
        </span>
      </div>

      {/* Two-panel diagram */}
      <div className="grid grid-cols-2 gap-4 sm:gap-6">
        <AoePanel cls={cls} />
        <SingleTargetPanel cls={cls} />
      </div>

      {/* Key insight callout */}
      <div className="rounded-lg border border-gray-800 bg-gray-900/40 px-4 py-3">
        <p className="text-xs font-mono text-gray-500 leading-relaxed">
          <span className="text-gray-400 font-semibold">PackProxy mechanics:</span>{' '}
          {aoeSkill ? (
            <>
              <span className="text-violet-300">{cls.name}</span> has{' '}
              <span className="text-violet-300">{aoeSkill.name}</span> (area_damage) —
              one cast hits all {PACK_N} pack members simultaneously via PackProxy.
              Against this pack: ~{PACK_N}× the damage output of a single-target skill.
            </>
          ) : (
            <>
              <span className="text-gray-300">{cls.name}</span> has no area_damage skills.
              Against a swarm pack of {PACK_N}, this class deals 1× — the same as against a single monster.
              An AOE class in the same encounter would produce ~{PACK_N}× damage output.
            </>
          )}
        </p>
      </div>

      {/* Footer note */}
      <p className="text-[10px] text-gray-700 font-mono text-center">
        Geometry inferred from effect_category (area_damage → circle, others → point).{' '}
        {/* TODO: wire B11 geometry field when rocket ships it */}
        v0.6 · 3 classes · Yomi season (season_002328)
      </p>
    </div>
  );
}
