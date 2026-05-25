// WeaponSlot — M1 (Cycle 11, MIGRATION.md v1.3)
// Consumes main_weapon from class JSON. Renders weapon name, category, cultural context.
// Null-safe: renders nothing when weapon is null (pre-substrate-binding season).

import type { WeaponDescriptor } from '../../data/types';
import { ProvenanceBadge } from '../ui/ProvenanceBadge';

// Human-readable category labels for weapon_kind values from substrate.
const CATEGORY_LABELS: Record<string, string> = {
  melee:    'Melee',
  polearm:  'Polearm',
  ranged:   'Ranged',
  firearm:  'Firearm',
  shield:   'Shield',
  tome:     'Tome',
  banner:   'Banner',
  focus:    'Focus',
  horn:     'Horn',
  talisman: 'Talisman',
};

function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

interface WeaponSlotProps {
  weapon: WeaponDescriptor | null | undefined;
  label?: string;
  className?: string;
}

export function WeaponSlot({ weapon, label = 'Main Weapon', className = '' }: WeaponSlotProps) {
  // Null-safe per MIGRATION.md v1.3: main_weapon is null for pre-substrate-binding seasons.
  if (!weapon) return null;

  const categoryLabel = getCategoryLabel(weapon.category);

  return (
    <div className={`py-2 px-3 rounded-lg bg-gray-900/50 border border-gray-800 ${className}`}>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        {/* Left: label + weapon name + category */}
        <div className="min-w-0">
          <p className="text-[10px] text-gray-600 font-mono mb-0.5">{label}</p>
          <p className="text-sm font-semibold text-gray-100 leading-tight">
            {weapon.name}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            {/* Category badge */}
            <span className="inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-mono bg-gray-800 text-gray-300 border-gray-700">
              {categoryLabel}
            </span>
            {/* Cultural register */}
            {weapon.cultural_register && (
              <span className="text-[10px] font-mono text-gray-500">
                {weapon.cultural_register.replace(/_/g, ' ')}
              </span>
            )}
            {/* Period */}
            {weapon.period && (
              <span className="text-[10px] font-mono text-gray-600">
                {weapon.period.replace(/_/g, ' ')}
              </span>
            )}
          </div>
          {/* Lineage (nullable) */}
          {weapon.lineage && (
            <p className="text-[10px] font-mono text-gray-600 mt-0.5 italic">
              {weapon.lineage}
            </p>
          )}
        </div>
        {/* Right: provenance badge (M5 — source_library on the weapon descriptor) */}
        <ProvenanceBadge sourceLibrary={weapon.source_library} className="flex-shrink-0 self-start mt-0.5" />
      </div>
    </div>
  );
}
