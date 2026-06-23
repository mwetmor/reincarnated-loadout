/**
 * EquippedSlotsGrid.tsx — renders the engine's serialized 10-slot loadout form.
 *
 * Path B Step 1a (SEAM 4, drax). Consumes the `serialize_loadout` output (10 canonical
 * keys, empties → null) and surfaces all 10 equipped slots in canonical order. main_hand
 * is distinguished as the non-resist weapon slot. Tolerant of legacy 4-key serialized
 * loadouts (weapon/off_hand/armor/accessory) via normalizeSerializedLoadout().
 *
 * STRUCTURAL-PRESENTATION ONLY (1a hold): surfaces SLOTS + whether each slot is filled.
 * It does NOT display resist magnitudes / breadth affixes (1b) or budget/calibration (1c).
 * The per-slot gear payload is opaque — we show a compact name when one is derivable, else
 * just "filled" / empty. Post-1a, the engine still mints only the 4 production slots; the
 * other 6 surface as empty. That is EXPECTED and is NOT a balance signal (CONCERN-3).
 */
import type { SerializedLoadout } from '../../data/serializedLoadout';
import { toEquippedSlotViews } from '../../data/serializedLoadout';
import { Card } from '../ui/Card';
import { FlavorTip } from '../ui/FlavorTip';

interface EquippedSlotsGridProps {
  /** Engine-serialized loadout (canonical 10-key or legacy 4-key). null/undefined → all empty. */
  loadout?: SerializedLoadout | null;
  /** Optional heading override. */
  title?: string;
}

/**
 * Best-effort compact label for an opaque serialized gear payload. 1a does not interpret
 * gear content; this only pulls a display name if the payload happens to carry one. Empty
 * slots (null) return null and render as a clean placeholder.
 */
function compactItemName(item: unknown): string | null {
  if (item == null) return null;
  if (typeof item === 'string') return item;
  if (typeof item === 'object') {
    const obj = item as Record<string, unknown>;
    const name = obj.name ?? obj.gear_id ?? obj.id;
    if (typeof name === 'string') return name;
  }
  return 'Equipped';
}

export function EquippedSlotsGrid({ loadout, title = 'Equipped Slots' }: EquippedSlotsGridProps) {
  const views = toEquippedSlotViews(loadout);
  const filledCount = views.filter((v) => !v.isEmpty).length;

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-mono text-gray-500 uppercase tracking-wide">{title}</h3>
        <span className="text-[10px] font-mono text-gray-700">
          {filledCount}/{views.length} equipped
        </span>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {views.map((view) => {
          const name = compactItemName(view.item);
          return (
            <div
              key={view.slot}
              className={`relative flex flex-col items-center gap-1 p-2 rounded-md border group ${
                view.isEmpty
                  ? 'border-dashed border-gray-700 bg-gray-800/40'
                  : 'border-gray-600 bg-gray-800/60'
              }`}
            >
              {/* Weapon-slot marker — main_hand carries NO resist (distinguished per §4). */}
              {view.isWeapon && (
                <span
                  className="absolute -top-1 -left-1 text-[7px] font-mono px-1 rounded-sm bg-amber-900/70 text-amber-300 border border-amber-700/60 uppercase tracking-wide"
                  title="Weapon slot — no resist"
                >
                  wpn
                </span>
              )}

              <div className="relative w-8 h-8 rounded border bg-gray-900 flex items-center justify-center text-lg group-hover:border-gray-600 border-gray-700">
                {view.isEmpty ? (
                  <span className="text-gray-700">◻</span>
                ) : (
                  <span className="text-gray-300 text-xs font-mono text-center leading-tight px-0.5">
                    {(name ?? '').slice(0, 4)}
                  </span>
                )}
                <span className="absolute -top-1 -right-1" onClick={(e) => e.stopPropagation()}>
                  <FlavorTip mode="modal" title={`${view.label}${view.isWeapon ? ' (Weapon)' : ''}`}>
                    <span className="block text-xs text-gray-500 not-italic mb-1 uppercase tracking-wide">
                      {view.slot}
                    </span>
                    <span className="block text-xs text-gray-400 not-italic">
                      {view.resistCapable ? 'Resist-capable slot' : 'Weapon slot — no resist'}
                    </span>
                    <span className="block text-xs text-gray-500 not-italic mt-1">
                      {view.isEmpty ? 'Empty.' : (name ?? 'Equipped.')}
                    </span>
                  </FlavorTip>
                </span>
              </div>

              <span className="text-[10px] font-mono text-center leading-tight text-gray-400">
                {view.label}
              </span>

              <span
                className={`text-[8px] font-mono ${
                  view.isEmpty ? 'text-gray-700' : 'text-gray-500'
                }`}
              >
                {view.isEmpty ? 'empty' : (name ? name.slice(0, 6) : 'filled')}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-gray-700 font-mono text-center mt-3">
        Serialized 10-slot loadout — Main Hand is the non-resist weapon slot.
      </p>
    </Card>
  );
}
