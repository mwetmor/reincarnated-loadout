/**
 * Cycle14GearDisplay.tsx — 11-slot gear representative render
 *
 * Consumes class.gear_representative (MIGRATION.md §v1.68): one gear item per slot
 * at legendary_t1 rarity, carrying partition_modifiers + capability_modifiers +
 * t4_annotation + substrate_binding.
 *
 * Schema note: uses `rarity` field (not `rarity_tier` like Cycle13GearInstance).
 * NOT a multi-tier display — one representative item per slot is shown.
 *
 * Cycle 15+ scope: multi-tier display (all 10 rarity tiers per slot) is deferred.
 * TODO(drax): remove this comment when Cycle14GearDisplay expands to multi-tier (Cycle 15+).
 */
import type { GearRepresentative, GearRepresentativeItem } from '../../data/types';
import type { PartitionModifier, CapabilityModifier, T4Annotation, TriggeredPassive } from '../../data/cycle13Types';

// ── Display maps ─────────────────────────────────────────────────────────────

const SLOT_LABEL: Record<string, string> = {
  main_weapon:    'Main Weapon',
  secondary_item: 'Off-Hand',
  head:           'Head',
  chest:          'Chest',
  hands:          'Hands',
  feet:           'Feet',
  legs:           'Legs',
  amulet:         'Amulet',
  ring_1:         'Ring 1',
  ring_2:         'Ring 2',
  belt:           'Belt',
};

const SLOT_ORDER = [
  'main_weapon', 'secondary_item', 'head', 'chest', 'hands',
  'feet', 'legs', 'amulet', 'ring_1', 'ring_2', 'belt',
] as const;

// Rarity color map — matches Cycle13 colors for visual consistency
const RARITY_COLOR: Record<string, string> = {
  common:         'text-gray-400 border-gray-600',
  uncommon:       'text-green-400 border-green-700',
  rare:           'text-blue-400 border-blue-700',
  epic:           'text-purple-400 border-purple-700',
  legendary_t0:   'text-amber-400 border-amber-700',
  legendary_t0_5: 'text-amber-300 border-amber-600',
  legendary_t1:   'text-orange-300 border-orange-500',
  legendary_t2:   'text-orange-200 border-orange-400',
  set_t1:         'text-emerald-300 border-emerald-500',
  set_t2:         'text-emerald-200 border-emerald-400',
};

const RARITY_LABEL: Record<string, string> = {
  common:         'Common',
  uncommon:       'Uncommon',
  rare:           'Rare',
  epic:           'Epic',
  legendary_t0:   'Legendary T0',
  legendary_t0_5: 'Legendary T0.5',
  legendary_t1:   'Legendary T1',
  legendary_t2:   'Legendary T2',
  set_t1:         'Set T1',
  set_t2:         'Set T2',
};

// ── Modifier display helpers ─────────────────────────────────────────────────

function fmtMagnitude(mag: number, category: string): string {
  const pctCategories = ['crit', 'res_pen', 'damage', 'resource', 'speed'];
  if (pctCategories.some((c) => category.includes(c)) && mag < 5) {
    return `${(mag * 100).toFixed(1)}%`;
  }
  return mag.toFixed(mag < 1 ? 3 : 1);
}

function PartitionRow({ mod }: { mod: PartitionModifier }) {
  const label = mod.modifier_id.replace(/_/g, ' ');
  const mag = fmtMagnitude(mod.magnitude, mod.category);
  return (
    <div className="flex items-baseline justify-between gap-2 text-[10px] font-mono">
      <span className="text-gray-500 truncate">{label}</span>
      <span className="text-cyan-300 flex-shrink-0 font-bold">+{mag}</span>
    </div>
  );
}

function CapabilityRow({ mod }: { mod: CapabilityModifier }) {
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

function T4Block({ ann }: { ann: T4Annotation }) {
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
        attunement: <span className="text-amber-300">{ann.attunement_count}</span>
      </div>
      <div className="text-[10px] font-mono text-gray-400">
        scope: <span className="text-amber-300">{ann.scope_preference.replace(/_/g, ' ')}</span>
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

// ── Gear slot card ────────────────────────────────────────────────────────────

function GearSlotCard({ slot, item }: { slot: string; item: GearRepresentativeItem | null }) {
  const label = SLOT_LABEL[slot] ?? slot;

  if (!item) {
    return (
      <div className="rounded-lg border border-dashed border-gray-800 bg-gray-900/20 p-3">
        <div className="text-xs font-mono font-semibold text-gray-600 mb-1">{label}</div>
        <p className="text-[10px] font-mono text-gray-700">No gear data</p>
      </div>
    );
  }

  const rarityColor = RARITY_COLOR[item.rarity] ?? 'text-gray-400 border-gray-600';
  const rarityLabel = RARITY_LABEL[item.rarity] ?? item.rarity;
  const hasLegendaryPlus = item.rarity.startsWith('legendary') || item.rarity.startsWith('set_');

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/30">
      {/* Slot header + rarity */}
      <div className="px-3 py-2 border-b border-gray-800 flex items-center justify-between gap-2">
        <span className="text-xs font-mono font-semibold text-gray-300">{label}</span>
        <span className={`text-[9px] font-mono border rounded px-1 py-0.5 ${rarityColor}`}>
          {rarityLabel}
          {item.is_unique === 1 && (
            <span className="ml-1 text-yellow-500">◆</span>
          )}
        </span>
      </div>

      {/* Content */}
      <div className="px-3 py-2 space-y-2">
        {/* Partition modifiers */}
        {item.partition_modifiers.length > 0 && (
          <div>
            <div className="text-[9px] font-mono text-gray-600 uppercase tracking-wide mb-1">Modifiers</div>
            <div className="space-y-0.5">
              {item.partition_modifiers.map((mod, i) => (
                <PartitionRow key={`${mod.modifier_id}-${i}`} mod={mod} />
              ))}
            </div>
          </div>
        )}

        {/* Capability toolkit — legendary+ */}
        {hasLegendaryPlus && item.capability_modifiers.length > 0 && (
          <div>
            <div className="text-[9px] font-mono text-emerald-600 uppercase tracking-wide mb-1">
              Capability Toolkit
            </div>
            <div className="space-y-0.5">
              {item.capability_modifiers.map((mod, i) => (
                <CapabilityRow key={`${mod.modifier_id}-${i}`} mod={mod} />
              ))}
            </div>
          </div>
        )}

        {/* T4 annotation */}
        {item.t4_annotation && (
          <T4Block ann={item.t4_annotation} />
        )}

        {/* Triggered passive */}
        {item.triggered_passive && (
          <TriggeredPassiveBlock tp={item.triggered_passive} />
        )}

        {/* Substrate binding — main_weapon only */}
        {item.substrate_binding && (
          <div className="mt-1.5 rounded border border-gray-700/40 bg-gray-900/40 px-2 py-1.5 space-y-0.5">
            <div className="text-[9px] font-mono font-bold text-gray-500 mb-1">Substrate</div>
            <div className="text-[10px] font-mono text-gray-400 truncate">
              {item.substrate_binding.substrate_canonical_name}
            </div>
            <div className="text-[10px] font-mono text-gray-500">
              {item.substrate_binding.weapon_type_family.replace(/_/g, ' ')}
              {' · '}
              {item.substrate_binding.attribute_requirement}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Cycle14GearDisplayProps {
  gear: GearRepresentative;
}

export function Cycle14GearDisplay({ gear }: Cycle14GearDisplayProps) {
  const slotItems = SLOT_ORDER.map((slot) => ({
    slot,
    item: gear[slot] as GearRepresentativeItem | null,
  }));

  const populatedCount = slotItems.filter((s) => s.item !== null).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-mono text-gray-500 uppercase tracking-wide">
          Gear Representative — {populatedCount} / 11 Slots
        </h3>
        <span className="text-[10px] font-mono text-gray-700">
          rank-0 · legendary T1
        </span>
      </div>

      {/* Context note */}
      <div className="rounded border border-gray-800/60 bg-gray-900/20 px-3 py-1.5">
        <p className="text-[10px] font-mono text-gray-600">
          Representative gear at Legendary T1 rarity. Investment commits and multi-tier
          display land Cycle 15+.
        </p>
      </div>

      {/* Slot grid */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {slotItems.map(({ slot, item }) => (
          <GearSlotCard key={slot} slot={slot} item={item} />
        ))}
      </div>
    </div>
  );
}
