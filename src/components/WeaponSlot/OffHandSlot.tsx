// OffHandSlot — M2 (Cycle 11, MIGRATION.md v1.3)
// Consumes secondary_item from class JSON. Null-safe (null is always valid per schema).
// Per Q3 RATIFIED: T4 post-mortem proceeds with main weapon only.
// Off-hand is UI-staged via SHOW_OFF_HAND_SLOT flag — set to true for v1.0 production launch.
//
// TODO(drax): set SHOW_OFF_HAND_SLOT = true for v1.0 production launch per Q3 RATIFIED.
// Off-hand data is consumed and component is fully built; flag is the only gate.

import type { WeaponDescriptor } from '../../data/types';
import { WeaponSlot } from './WeaponSlot';

// Q3 UI-staging gate: T4 post-mortem = main-weapon-only; off-hand surfaced for v1.0 production launch.
// Flip to true when v1.0 production launch is authorized.
// TODO(drax): remove this staging flag at v1.0 production launch — set to true and delete this comment.
export const SHOW_OFF_HAND_SLOT = false;

interface OffHandSlotProps {
  secondaryItem: WeaponDescriptor | null | undefined;
  className?: string;
}

export function OffHandSlot({ secondaryItem, className = '' }: OffHandSlotProps) {
  // Q3 UI-staging: suppress off-hand display during T4 post-mortem period.
  // Component is built; null-safety and rendering are fully implemented.
  if (!SHOW_OFF_HAND_SLOT) return null;

  // Null-safe per MIGRATION.md v1.3: secondary_item is null for classes without off-hand.
  // ALWAYS-VALID null — not an error condition.
  if (!secondaryItem) return null;

  return (
    <WeaponSlot
      weapon={secondaryItem}
      label="Off-Hand"
      className={className}
    />
  );
}
