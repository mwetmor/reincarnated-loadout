/**
 * Cycle13GearDisplay.tsx — 11 gear slots × 10 rarity tiers display
 *
 * Per-slot: shows rarity tier tabs; per tier:
 *   - partition_modifiers (mechanical stats)
 *   - capability_modifiers (from legendary_t0 up)
 *   - t4_annotation (from legendary_t1 up)
 *   - set_bonus (for set_t1/set_t2 — parsed as dict per star-lord design decision)
 *   - triggered_passive (when present)
 *
 * Capability toolkit content (Block B1): Legendary+ capability_modifiers
 * are the added-skill content layer tying gear → skill-tree investment.
 */
import { useState } from 'react';
import type {
  Cycle13GearInstance,
  PartitionModifier,
  CapabilityModifier,
  T4Annotation,
  SetBonus,
  TriggeredPassive,
  Cycle13Slot,
  Cycle13RarityTier,
} from '../../data/cycle13Types';
import {
  SLOT_LABEL,
  SLOT_ORDER,
  RARITY_ORDER,
  RARITY_LABEL,
  RARITY_COLOR,
  hasCapabilityToolkit,
  hasT4Annotation,
} from '../../data/cycle13Types';
import { groupGearBySlotAndRarity } from '../../hooks/useCycle13Data';

// ── Modifier display helpers ────────────────────────────────────────────────

function fmtMagnitude(mag: number, category: string): string {
  const pctCategories = ['crit', 'res_pen', 'damage', 'resource', 'speed'];
  if (pctCategories.some((c) => category.includes(c)) && mag < 5) {
    return `${(mag * 100).toFixed(1)}%`;
  }
  return mag.toFixed(mag < 1 ? 3 : 1);
}

function PartitionModifierRow({ mod }: { mod: PartitionModifier }) {
  const label = mod.modifier_id.replace(/_/g, ' ');
  const mag = fmtMagnitude(mod.magnitude, mod.category);
  return (
    <div className="flex items-baseline justify-between gap-2 text-[10px] font-mono">
      <span className="text-gray-500 truncate">{label}</span>
      <span className="text-cyan-300 flex-shrink-0 font-bold">+{mag}</span>
    </div>
  );
}

function CapabilityModifierRow({ mod }: { mod: CapabilityModifier }) {
  return (
    <div className="flex items-baseline gap-2 text-[10px] font-mono">
      <span className="text-[8px] font-mono text-emerald-600 uppercase tracking-wide flex-shrink-0">
        {mod.capability_category.replace(/_/g, ' ')}
      </span>
      <span className="text-emerald-300 truncate">{mod.modifier_id.replace(/_/g, ' ')}</span>
      {mod.chain_alignment && (
        <span className="text-[9px] text-emerald-600/60 flex-shrink-0">
          → {mod.chain_alignment}
        </span>
      )}
    </div>
  );
}

function T4AnnotationBlock({ ann }: { ann: T4Annotation }) {
  return (
    <div className="mt-1.5 rounded border border-amber-800/40 bg-amber-950/20 px-2 py-1.5 space-y-0.5">
      <div className="text-[9px] font-mono font-bold text-amber-400 mb-1">T4 Attunement</div>
      <div className="text-[10px] font-mono text-gray-400">
        chain: <span className="text-amber-300">{ann.chain_alignment}</span>
      </div>
      <div className="text-[10px] font-mono text-gray-400">
        intent: <span className="text-amber-300">{ann.t4_target_intent}</span>
      </div>
      <div className="text-[10px] font-mono text-gray-400">
        attunement count: <span className="text-amber-300">{ann.attunement_count}</span>
      </div>
      <div className="text-[10px] font-mono text-gray-400">
        scope preference: <span className="text-amber-300">{ann.scope_preference.replace(/_/g, ' ')}</span>
      </div>
    </div>
  );
}

function SetBonusBlock({ bonus }: { bonus: SetBonus }) {
  return (
    <div className="mt-1.5 rounded border border-emerald-700/40 bg-emerald-950/20 px-2 py-1.5 space-y-0.5">
      <div className="text-[9px] font-mono font-bold text-emerald-400 mb-1">Set Bonus</div>
      <div className="text-[10px] font-mono text-gray-400">
        2pc: <span className="text-emerald-300">{bonus.bonus_2pc_effect_tag.replace(/_/g, ' ')}</span>
      </div>
      <div className="text-[10px] font-mono text-gray-400">
        4pc: <span className="text-emerald-300">{bonus.bonus_4pc_effect_tag.replace(/_/g, ' ')}</span>
      </div>
      <div className="text-[10px] font-mono text-gray-400">
        scope: <span className="text-emerald-300">{bonus.scope_preference.replace(/_/g, ' ')}</span>
      </div>
    </div>
  );
}

function TriggeredPassiveBlock({ tp }: { tp: TriggeredPassive }) {
  return (
    <div className="mt-1.5 rounded border border-violet-800/40 bg-violet-950/20 px-2 py-1.5">
      <div className="text-[9px] font-mono font-bold text-violet-400 mb-1">
        Triggered Passive{tp.is_true_active ? ' (Active)' : ''}
      </div>
      <p className="text-[10px] font-mono text-gray-400 leading-relaxed">{tp.description}</p>
    </div>
  );
}

// ── Rarity tier panel ───────────────────────────────────────────────────────

interface RarityTierPanelProps {
  gear: Cycle13GearInstance;
}

function RarityTierPanel({ gear }: RarityTierPanelProps) {
  const isLegendaryPlus = hasCapabilityToolkit(gear.rarity_tier);
  const hasT4Ann = hasT4Annotation(gear.rarity_tier);
  const isSet = gear.rarity_tier === 'set_t1' || gear.rarity_tier === 'set_t2';

  return (
    <div className="space-y-2">
      {/* Partition modifiers — always present */}
      {gear.partition_modifiers.length > 0 && (
        <div>
          <div className="text-[9px] font-mono text-gray-600 uppercase tracking-wide mb-1">Modifiers</div>
          <div className="space-y-0.5">
            {gear.partition_modifiers.map((mod, i) => (
              <PartitionModifierRow key={`${mod.modifier_id}-${i}`} mod={mod} />
            ))}
          </div>
        </div>
      )}

      {/* Capability toolkit (Block B1) — from legendary_t0 up */}
      {isLegendaryPlus && gear.capability_modifiers.length > 0 && (
        <div>
          <div className="text-[9px] font-mono text-emerald-600 uppercase tracking-wide mb-1">
            Capability Toolkit
          </div>
          <div className="space-y-0.5">
            {gear.capability_modifiers.map((mod, i) => (
              <CapabilityModifierRow key={`${mod.modifier_id}-${i}`} mod={mod} />
            ))}
          </div>
        </div>
      )}

      {/* T4 annotation — from legendary_t1 up */}
      {hasT4Ann && gear.t4_annotation && (
        <T4AnnotationBlock ann={gear.t4_annotation} />
      )}

      {/* Set bonus — set_t1/set_t2 only */}
      {isSet && gear.set_bonus && (
        <SetBonusBlock bonus={gear.set_bonus} />
      )}

      {/* Triggered passive — when present */}
      {gear.triggered_passive && (
        <TriggeredPassiveBlock tp={gear.triggered_passive} />
      )}
    </div>
  );
}

// ── Slot panel ──────────────────────────────────────────────────────────────

interface SlotPanelProps {
  slot: Cycle13Slot;
  tierMap: Map<string, Cycle13GearInstance>;
}

function SlotPanel({ slot, tierMap }: SlotPanelProps) {
  const [selectedTier, setSelectedTier] = useState<Cycle13RarityTier>('legendary_t1');
  const selectedGear = tierMap.get(selectedTier);

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/30">
      {/* Slot header */}
      <div className="px-3 py-2 border-b border-gray-800">
        <span className="text-xs font-mono font-semibold text-gray-300">{SLOT_LABEL[slot]}</span>
      </div>

      {/* Rarity tier tabs — scrollable */}
      <div className="flex overflow-x-auto gap-0.5 px-2 py-1.5 border-b border-gray-800 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
        {RARITY_ORDER.map((tier) => {
          const hasData = tierMap.has(tier);
          const isSelected = tier === selectedTier;
          const colorBase = RARITY_COLOR[tier];
          return (
            <button
              key={tier}
              onClick={() => setSelectedTier(tier)}
              disabled={!hasData}
              title={RARITY_LABEL[tier]}
              className={`flex-shrink-0 text-[8px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
                isSelected && hasData
                  ? `${colorBase} bg-gray-800`
                  : hasData
                  ? 'text-gray-600 border-gray-800 hover:border-gray-700 hover:text-gray-500'
                  : 'text-gray-800 border-gray-900 cursor-not-allowed'
              }`}
            >
              {tier === 'legendary_t0_5' ? 'L0.5' :
               tier === 'legendary_t0' ? 'L0' :
               tier === 'legendary_t1' ? 'L1' :
               tier === 'legendary_t2' ? 'L2' :
               tier === 'set_t1' ? 'S1' :
               tier === 'set_t2' ? 'S2' :
               tier.slice(0, 3).toUpperCase()}
            </button>
          );
        })}
      </div>

      {/* Selected tier content */}
      <div className="px-3 py-2 min-h-[80px]">
        {selectedGear ? (
          <RarityTierPanel gear={selectedGear} />
        ) : (
          <p className="text-[10px] font-mono text-gray-700 mt-2">No gear data for this tier</p>
        )}
      </div>

      {/* Rarity label footer */}
      <div className="px-3 pb-2">
        <span className={`text-[9px] font-mono ${RARITY_COLOR[selectedTier]?.split(' ')[0] ?? 'text-gray-600'}`}>
          {RARITY_LABEL[selectedTier]}
          {selectedGear?.is_unique === 1 && (
            <span className="ml-1 text-yellow-600">(Unique)</span>
          )}
        </span>
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

interface Cycle13GearDisplayProps {
  gear: Cycle13GearInstance[];
}

export function Cycle13GearDisplay({ gear }: Cycle13GearDisplayProps) {
  const gearMap = groupGearBySlotAndRarity(gear);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-mono text-gray-500 uppercase tracking-wide">
          Gear — 11 Slots × 10 Rarity Tiers
        </h3>
        <span className="text-[10px] font-mono text-gray-700">
          {gear.length} instances
        </span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-1.5 text-[9px] font-mono">
        <span className="text-gray-600">Tier abbreviations:</span>
        {RARITY_ORDER.map((tier) => (
          <span key={tier} className={RARITY_COLOR[tier]?.split(' ')[0] ?? 'text-gray-600'}>
            {tier === 'legendary_t0_5' ? 'L0.5' :
             tier === 'legendary_t0' ? 'L0' :
             tier === 'legendary_t1' ? 'L1' :
             tier === 'legendary_t2' ? 'L2' :
             tier === 'set_t1' ? 'S1' :
             tier === 'set_t2' ? 'S2' :
             tier.slice(0, 3).toUpperCase()}={RARITY_LABEL[tier]}
          </span>
        ))}
      </div>

      {/* Capability toolkit note */}
      <div className="rounded border border-emerald-900/40 bg-emerald-950/20 px-3 py-1.5">
        <p className="text-[10px] font-mono text-emerald-600">
          Block B1: Capability Toolkit — added-skill content visible from Legendary T0 up.
          T4 Attunement annotation visible from Legendary T1 up.
          Set bonuses visible for Set T1/T2 tiers.
        </p>
      </div>

      {/* Slot grid */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {SLOT_ORDER.map((slot) => {
          const tierMap = gearMap.get(slot) ?? new Map<string, Cycle13GearInstance>();
          return (
            <SlotPanel key={slot} slot={slot} tierMap={tierMap} />
          );
        })}
      </div>
    </div>
  );
}
