// T4AlterationPanel — M3 (Cycle 11 Wave 3b, MIGRATION.md v1.3)
// Renders t4_alteration_output intent metadata below the SkillTree grid.
// Per Tier 2 framing: INTENT METADATA only — not combat-affecting until Cycle 12 Layer 6.
// Includes spirit-guide narration surface (§ 9 explainer pattern woven into panel).
// Null-safe: renders nothing when t4_alteration_output is null/absent.
//
// Cycle 12 Wave 5: Spirit Guide narration fallback chain (MIGRATION.md § v1.4-layer-6):
//   1. spirit_guide_narration_metadata.thematic_rationale (L6 enrichment — richer engine prose)
//   2. thematic_rationale (Cycle 11 field — static engine-generated rationale)
//   3. § 9 template voice (Cycle 11 static fallback — pre-engine-narration)
//
// 2026-05-26: "Mechanical Effects" sub-section added (Matt authorization via KR).
// Gated by designMode prop — hidden in player-mode (default), visible in design-mode.
// Fields: strategy_params (human-readable per-strategy_type), gamora_combatant_fields,
//         applied_axis_targets, eta_score. All null-safe.

import type { T4AlterationOutput, T4StrategyType } from '../../data/types';

// Human-readable strategy labels (player-facing — not raw enum strings).
// Per dispatch: drax design judgment on naming per cohesion-judge naming pattern.
const STRATEGY_LABELS: Record<string, string> = {
  RESOURCE_CONVERSION:  'Resource Conversion',
  TRADE_OFF:            'Trade-Off Keystone',
  ELEMENT_CONVERSION:   'Element Conversion',
  DEFENSIVE_CONVERSION: 'Defensive Conversion',
  GEOMETRY_COLLAPSE:    'Geometry Collapse',
};

// Short mechanical descriptions per strategy type — static template mapping.
// Per dispatch: drax uses static lookup when star-lord narration field is absent;
// thematic_rationale from class JSON takes precedence when present (see renderNarration below).
const STRATEGY_DESCRIPTIONS: Record<string, string> = {
  RESOURCE_CONVERSION:
    'This build identity converts one resource type to another — altering how your skills draw from your body and spirit rather than from a standard mana pool. The cost of power becomes something more personal.',
  TRADE_OFF:
    'This build identity embraces a deliberate exchange — gaining exceptional strength in one dimension by accepting a corresponding weakness in another. Power through sacrifice.',
  ELEMENT_CONVERSION:
    'This build identity converts all damage output to a single element — overriding the kit\'s natural elemental spread for focused resonance. Every strike speaks the same language.',
  DEFENSIVE_CONVERSION:
    'This build identity reframes your survival layer — converting standard armor or regeneration into an alternate defensive geometry. How you endure changes how you fight.',
  GEOMETRY_COLLAPSE:
    'This build identity collapses spatial diversity into concentrated geometry — trading attack-pattern variety for unified, amplified impact within a single pattern.',
};

function getStrategyLabel(strategyType: T4StrategyType): string {
  return STRATEGY_LABELS[strategyType as string] ?? strategyType.replace(/_/g, ' ');
}

function getStrategyDescription(strategyType: T4StrategyType): string {
  return STRATEGY_DESCRIPTIONS[strategyType as string] ?? 'A unique build-defining alteration derived from this kit\'s BC-axis configuration.';
}

// Render strategy-specific parameters in a contextual, human-readable way.
function renderParamRow(key: string, value: string | number | boolean | null): string | null {
  if (value === null || value === undefined) return null;
  // Format known parameter keys with friendly labels
  const keyLabel: Record<string, string> = {
    cost_resource:   'Cost resource',
    source:          'Source resource',
    target:          'Target resource',
    target_element:  'Target element',
    rate:            'Conversion rate',
    axis_direction:  'Axis direction',
    amplitude_delta: 'Amplitude shift',
    tempo_delta:     'Tempo shift',
    geometry_target: 'Target geometry',
    collapse_radius: 'Collapse radius',
  };
  const label = keyLabel[key] ?? key.replace(/_/g, ' ');
  const displayValue = typeof value === 'number'
    ? (value > 0 ? `+${value}` : String(value))
    : String(value).replace(/_/g, ' ');
  return `${label}: ${displayValue}`;
}

// ---- Mechanical Effects — design-mode sub-section ----
// Formats strategy_params into a human-readable sentence per the 6 known strategy_types.
// If strategy_type is unknown, falls back to a generic key:value list.
function formatStrategyParams(
  strategyType: T4StrategyType,
  params: Record<string, string | number | boolean | null>
): string | null {
  const p = params ?? {};

  switch (strategyType as string) {
    case 'RESOURCE_CONVERSION': {
      const cost = p['cost_resource'] ?? p['source'] ?? p['target'];
      if (cost) return `Skill costs converted to ${String(cost).replace(/_/g, ' ')}`;
      return 'Skill costs converted to alternate resource';
    }
    case 'DEFENSIVE_CONVERSION': {
      const rate = p['rate'];
      if (rate != null) return `Evasion ${String(rate)}:1 to Armor`;
      return 'Evasion converted to Armor';
    }
    case 'GEOMETRY_COLLAPSE': {
      const radius = p['collapse_radius'] ?? p['radius_multiplier'];
      const dmg = p['amplitude_delta'] ?? p['damage_multiplier'];
      if (radius != null && dmg != null)
        return `AoE radius × ${String(radius)}, damage × ${String(dmg)}`;
      if (radius != null) return `AoE radius × ${String(radius)}`;
      return 'AoE radius collapsed, damage amplified';
    }
    case 'TRADE_OFF': {
      const critRate = p['crit_rate'];
      const hitChance = p['hit_modifier'] ?? p['hit_chance'];
      if (critRate != null && hitChance != null)
        return `Crit rate ${String(critRate)}%, Hit chance ${String(hitChance)}`;
      if (critRate != null) return `Crit rate ${String(critRate)}%`;
      return 'Crit rate 0%, Hit chance 100%';
    }
    case 'ELEMENT_CONVERSION': {
      const target = p['target_element'] ?? p['target'];
      if (target) return `All skills converted to ${String(target).replace(/_/g, ' ')}`;
      return 'All skills converted to target element';
    }
    case 'DEFENSIVE_TRADEOFF': {
      const trade = p['trade_property'] ?? p['trade'];
      const dmgType = p['damage_type'] ?? p['nullified_element'] ?? 'Shadow';
      if (trade) return `${String(dmgType).replace(/_/g, ' ')} damage nullified at cost of ${String(trade).replace(/_/g, ' ')}`;
      return 'Elemental damage nullified at cost of trade property';
    }
    default: {
      // Generic fallback: key:value list
      const entries = Object.entries(p).filter(([, v]) => v != null);
      if (entries.length === 0) return null;
      return entries
        .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${String(v)}`)
        .join(' · ');
    }
  }
}

// Render gamora_combatant_fields as a labeled "Sim Integration:" list.
// Each sub-dict key is a strategy name (e.g. "defensive_conversion"); sub-values are params.
function renderGamoraCombatantFields(
  gcf: Record<string, Record<string, string | number | boolean>> | null | undefined
): Array<{ label: string; value: string }> {
  if (!gcf || Object.keys(gcf).length === 0) return [];
  const rows: Array<{ label: string; value: string }> = [];
  for (const [stratKey, params] of Object.entries(gcf)) {
    const stratLabel = stratKey.replace(/_/g, ' ');
    if (!params || Object.keys(params).length === 0) {
      rows.push({ label: stratLabel, value: '—' });
      continue;
    }
    const values = Object.entries(params)
      .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${String(v)}`)
      .join(', ');
    rows.push({ label: stratLabel, value: values });
  }
  return rows;
}

interface T4AlterationPanelProps {
  alteration: T4AlterationOutput | null | undefined;
  // designMode: when true, renders the "Mechanical Effects" sub-section (design-mode only).
  // Defaults to false (player-mode hides mechanical fields).
  designMode?: boolean;
  className?: string;
}

export function T4AlterationPanel({ alteration, designMode = false, className = '' }: T4AlterationPanelProps) {
  // Null-safe per MIGRATION.md v1.3: t4_alteration_output null = pre-§8 season or no alteration.
  if (!alteration) return null;

  // Phase 5 amendment 2026-05-26: prefer narrated alteration_type label over enum-derived label.
  // Falls back to STRATEGY_LABELS enum for legacy seasons without Phase 5 narration data.
  const narrationMeta = alteration.spirit_guide_narration_metadata ?? null;
  const strategyLabel =
    (narrationMeta?.alteration_type ?? '').trim() || getStrategyLabel(alteration.strategy_type);
  const strategyDescription = getStrategyDescription(alteration.strategy_type);

  // Spirit Guide narration — fallback chain (Cycle 12 Wave 5, MIGRATION.md § v1.4-layer-6):
  //   1. L6 narration_metadata.thematic_rationale — engine-generated prose, richer + context-aware
  //   2. Cycle 11 thematic_rationale field — engine-generated static rationale
  //   3. null — triggers § 9 template voice fallback in JSX below
  const spiritGuideNarration: string | null =
    narrationMeta?.thematic_rationale       // L6 enrichment path
    ?? alteration.thematic_rationale        // Cycle 11 fallback
    ?? null;                                // triggers § 9 template voice

  // Phase 5 amendment 2026-05-26: kinetic+sensory manifestation prose (1-2 sentences).
  // Present only on Phase 5 forms; gracefully omitted when absent or empty.
  const manifestationProse: string | null =
    (narrationMeta?.manifestation ?? '').trim() || null;

  // L6 narrative hooks (optional enhancement — rendered as context chips when present).
  const narrativeHooks: string[] = narrationMeta?.narrative_hooks ?? [];

  // L6 explainer template (informational — rendered as small label when present).
  const explainerTemplate: string | null = narrationMeta?.spirit_guide_explainer_template ?? null;

  // Extract non-trivial strategy params for display
  const paramRows = Object.entries(alteration.strategy_params ?? {})
    .map(([k, v]) => renderParamRow(k, v))
    .filter((r): r is string => r !== null);

  // Applied BC axes (optional)
  const bcAxes = alteration.applied_axis_targets ?? [];

  // η-score display (optional)
  const etaScore = alteration.eta_score ?? null;

  return (
    <div className={`rounded-lg border border-gray-700 bg-gray-900/60 overflow-hidden ${className}`}>
      {/* Header strip */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-800 bg-gray-900/80">
        <div className="flex items-center gap-2 min-w-0">
          {/* T4 badge */}
          <span className="inline-flex items-center flex-shrink-0 px-1.5 py-0.5 rounded border text-[10px] font-mono font-bold bg-violet-950 text-violet-300 border-violet-700">
            T4
          </span>
          {/* Phase 5 amendment 2026-05-26: narrated alteration_type label as primary heading;
              enum-derived strategy type shown as secondary label below when narrated label is present. */}
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-gray-200 leading-tight">
              {strategyLabel}
            </span>
            {(narrationMeta?.alteration_type ?? '').trim() && (
              <span className="text-[10px] font-mono text-gray-500 leading-tight">
                {getStrategyLabel(alteration.strategy_type)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Tier 2 intent-metadata badge */}
          <span className="inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-mono bg-gray-800 text-gray-500 border-gray-700"
            title="Tier 2 framing: intent metadata — not yet wired to combat arithmetic (Cycle 12 Layer 6)">
            Build Identity
          </span>
          {etaScore !== null && (
            <span className="text-[10px] font-mono text-gray-600"
              title="η-score: alteration candidacy score from Algorithm §8">
              η {etaScore.toFixed(2)}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-3 py-3 space-y-3">
        {/* Strategy mechanical description */}
        <p className="text-xs text-gray-400 leading-relaxed">
          {strategyDescription}
        </p>

        {/* Strategy-specific parameters */}
        {paramRows.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {paramRows.map((row, i) => {
              const [label, ...rest] = row.split(': ');
              const val = rest.join(': ');
              return (
                <span key={i} className="text-[11px] font-mono">
                  <span className="text-gray-600">{label}: </span>
                  <span className="text-violet-300 font-semibold">{val}</span>
                </span>
              );
            })}
          </div>
        )}

        {/* BC axes affected */}
        {bcAxes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {bcAxes.map((axis, i) => (
              <span key={i}
                className="inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-mono bg-gray-800 text-gray-500 border-gray-700"
                title="BC axis predicted to shift when alteration is active">
                {axis.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}

        {/* Spirit-guide narration surface (§ 9 explainer pattern).
            Fallback chain (Cycle 12 Wave 5, MIGRATION.md § v1.4-layer-6):
              1. L6 spirit_guide_narration_metadata.thematic_rationale (engine prose, richer)
              2. Cycle 11 thematic_rationale field (engine static rationale)
              3. § 9 template voice (pre-engine static fallback) */}
        <div className="rounded border border-gray-800 bg-gray-950/60 px-3 py-2.5">
          <div className="flex items-center justify-between gap-1.5 mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-gray-600 text-base">◈</span>
              <span className="text-[10px] font-mono text-gray-600 uppercase tracking-wide">
                Spirit Guide
              </span>
            </div>
            {/* L6 explainer template label — shown when narration_metadata is present */}
            {explainerTemplate && (
              <span className="text-[9px] font-mono text-gray-700 italic">
                {explainerTemplate.replace(/_/g, ' ')}
              </span>
            )}
          </div>
          {/* Phase 5 amendment 2026-05-26: manifestation prose — kinetic+sensory description of
              what the T4 alteration looks/feels like in play. Rendered before thematic_rationale
              to establish: observe (manifestation) → understand (rationale).
              Null-safe: gracefully absent on legacy seasons without Phase 5 narration data. */}
          {manifestationProse && (
            <p className="text-xs text-gray-300 leading-relaxed mb-2">
              {manifestationProse}
            </p>
          )}
          {spiritGuideNarration ? (
            <p className="text-xs text-gray-500 leading-relaxed italic">
              "{spiritGuideNarration}"
            </p>
          ) : (
            <p className="text-xs text-gray-600 leading-relaxed italic">
              "Summoner, you may have noticed — your spirit has unlocked something truly unique
              and meaningful. This {getStrategyLabel(alteration.strategy_type).toLowerCase()} defines how your entire kit
              operates at its peak. If you would like a walkthrough, I can explain how to help
              them make the most out of it."
            </p>
          )}
          {/* L6 narrative hooks — rendered as context chips when L6 narration_metadata present */}
          {narrativeHooks.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {narrativeHooks.map((hook, i) => (
                <span key={i}
                  className="inline-flex items-center px-1.5 py-0.5 rounded border text-[9px] font-mono bg-gray-900 text-gray-600 border-gray-800"
                  title="Narrative theme from Layer 6 Spirit Guide narration metadata">
                  {hook.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Mechanical Effects — design-mode sub-section (2026-05-26, Matt authorization via KR).
            Visibility gated by designMode prop: hidden in player-mode (default).
            Fields: strategy_params (human-readable), gamora_combatant_fields, applied_axis_targets, eta_score.
            Null-safe: each field row omitted when absent/empty; entire section hidden when all four absent. */}
        {designMode && (() => {
          const stratParamLine = formatStrategyParams(alteration.strategy_type, alteration.strategy_params ?? {});
          const gcfRows = renderGamoraCombatantFields(alteration.gamora_combatant_fields);
          const axisTargets = (alteration.applied_axis_targets ?? []).filter(Boolean);
          const eta = alteration.eta_score ?? null;
          // Whole section: omit if all four are absent/empty.
          if (!stratParamLine && gcfRows.length === 0 && axisTargets.length === 0 && eta === null) return null;

          return (
            <div className="rounded border border-cyan-900/40 bg-gray-950/70 px-3 py-2.5 space-y-2">
              {/* Sub-section header */}
              <div className="flex items-center gap-1.5 pb-1 border-b border-cyan-900/30">
                <span className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-950 text-cyan-500 border border-cyan-800">
                  ⚙
                </span>
                <span className="text-[10px] font-mono text-cyan-700 uppercase tracking-wide">
                  Mechanical Effects
                </span>
              </div>

              {/* strategy_params — human-readable formatted line */}
              {stratParamLine && (
                <div className="flex items-start gap-2 min-w-0">
                  <span className="text-[10px] font-mono text-gray-600 flex-shrink-0 w-28 pt-0.5">Strategy params</span>
                  <span className="text-[11px] font-mono text-cyan-300">{stratParamLine}</span>
                </div>
              )}

              {/* gamora_combatant_fields — Sim Integration */}
              {gcfRows.length > 0 && (
                <div className="flex items-start gap-2 min-w-0">
                  <span className="text-[10px] font-mono text-gray-600 flex-shrink-0 w-28 pt-0.5">Sim Integration</span>
                  <div className="space-y-0.5">
                    {gcfRows.map(({ label, value }, i) => (
                      <div key={i} className="flex items-start gap-1.5 flex-wrap">
                        <span className="text-[10px] font-mono text-gray-500">{label}:</span>
                        <span className="text-[10px] font-mono text-cyan-400">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* applied_axis_targets — BC Axis Targets */}
              {axisTargets.length > 0 && (
                <div className="flex items-start gap-2 min-w-0">
                  <span className="text-[10px] font-mono text-gray-600 flex-shrink-0 w-28 pt-0.5">BC Axis Targets</span>
                  <div className="flex flex-wrap gap-1">
                    {axisTargets.map((axis, i) => (
                      <span key={i}
                        className="inline-flex items-center px-1.5 py-0.5 rounded border text-[9px] font-mono bg-gray-900 text-cyan-600 border-cyan-900/50"
                        title="BC axis predicted to shift when alteration is active">
                        {axis.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* eta_score — Algorithm confidence */}
              {eta !== null && (
                <div className="flex items-start gap-2 min-w-0">
                  <span className="text-[10px] font-mono text-gray-600 flex-shrink-0 w-28 pt-0.5">Algorithm η</span>
                  <span className="text-[11px] font-mono text-cyan-400">{eta.toFixed(3)}</span>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
