/**
 * serializedLoadout.ts — consumer-side mirror of the engine's `serialize_loadout` form.
 *
 * Path B Step 1a (SEAM 4, drax — player-facing presentation). Consumes the serialized
 * 10-slot loadout form that rocket (schema), gamora (sim), and star-lord (telemetry/export)
 * landed upstream. This is a CONSUMER seam — it authors NO cross-seam contract; this module
 * mirrors the engine's already-MIGRATION'd shape so the app can render it.
 *
 * Authoritative source (do NOT diverge): rocket MIGRATION.md
 *   ~/Games/reincarnated-engine/src/reincarnated/generation/MIGRATION.md
 *   → "[2026-06-22] Path B Step 1a — `Loadout` widened 4→10 equipped slots"
 *   star-lord co-author section "### star-lord seam 3 — export-side completion".
 *
 * Canonical contract (from gear_schema.EQUIPPED_SLOTS, serialize_loadout()):
 *   - EXACTLY 10 keys, in this order:
 *       main_hand, off_hand, head, chest, hands, feet, belt, ring_1, ring_2, amulet
 *   - Empty slots serialize to JSON `null`.
 *   - `main_hand` carries NO resist (the weapon slot). The other 9 are resist-capable
 *     (RESIST_CAPABLE_SLOTS = EQUIPPED_SLOTS minus main_hand; cardinality 9 is load-bearing
 *     per spec §4 Rule-2: 9 × +9 = +81 just-caps all 7 elements).
 *
 * Brownfield (math note §4 / MIGRATION §28): a historical 4-key serialized loadout
 *   (`weapon` / `off_hand` / `armor` / `accessory`) must still render. The legacy→canonical
 *   mapping is `weapon→main_hand`, `armor→chest`, `accessory→amulet` (`off_hand` already
 *   canonical). normalizeSerializedLoadout() folds either shape into the canonical 10-key form.
 *
 * SCOPE HOLD (1a is structural-presentation only): this module surfaces the 10 SLOTS. It does
 * NOT interpret resist magnitudes / breadth affixes (1b) or budget/calibration (1c). The
 * per-slot value type is intentionally opaque here — render what the loadout carries.
 */

/** Canonical 10 equipped-slot keys, in serialize_loadout() order. Single source of truth. */
export const EQUIPPED_SLOTS = [
  'main_hand',
  'off_hand',
  'head',
  'chest',
  'hands',
  'feet',
  'belt',
  'ring_1',
  'ring_2',
  'amulet',
] as const;

export type EquippedSlot = (typeof EQUIPPED_SLOTS)[number];

/** The weapon slot — carries NO resist. Distinguished in presentation per acceptance criteria. */
export const MAIN_HAND_SLOT: EquippedSlot = 'main_hand';

/**
 * Resist-capable slots = EQUIPPED_SLOTS minus main_hand. Cardinality 9 is load-bearing
 * (spec §4 Rule-2). Derived from EQUIPPED_SLOTS so it can never silently drift.
 */
export const RESIST_CAPABLE_SLOTS: readonly EquippedSlot[] = EQUIPPED_SLOTS.filter(
  (s) => s !== MAIN_HAND_SLOT
);

/** Player-visible label per canonical slot key. Matches the engine's gear_slot_labels intent. */
export const EQUIPPED_SLOT_LABEL: Record<EquippedSlot, string> = {
  main_hand: 'Main Hand',
  off_hand: 'Off-Hand',
  head: 'Head',
  chest: 'Chest',
  hands: 'Hands',
  feet: 'Feet',
  belt: 'Belt',
  ring_1: 'Ring 1',
  ring_2: 'Ring 2',
  amulet: 'Amulet',
};

/** True iff the slot is resist-capable (everything except main_hand). */
export function isResistCapableSlot(slot: EquippedSlot): boolean {
  return slot !== MAIN_HAND_SLOT;
}

/**
 * Legacy 4-key → canonical mapping (brownfield tolerance, MIGRATION §28).
 *   weapon → main_hand, armor → chest, accessory → amulet. off_hand is already canonical.
 * Any key not in this map (e.g. an already-canonical 10-key shape) passes through unchanged.
 */
const LEGACY_KEY_MAP: Record<string, EquippedSlot> = {
  weapon: 'main_hand',
  armor: 'chest',
  accessory: 'amulet',
  off_hand: 'off_hand',
};

/**
 * An engine-serialized loadout: keys are slot names, values are opaque gear payloads
 * (a serialized gear dict) or `null` for empty. Accepts both the canonical 10-key shape
 * and historical 4-key shapes — normalizeSerializedLoadout() reconciles them.
 *
 * 1a HOLD: value is `unknown` on purpose — 1a surfaces slots, not gear-content interpretation.
 */
export type SerializedLoadout = Record<string, unknown>;

/** A normalized loadout: every one of the 10 canonical slots present; empties are `null`. */
export type NormalizedLoadout = Record<EquippedSlot, unknown>;

/** One slot's render row: canonical key, label, content (null = empty), resist-capable flag. */
export interface EquippedSlotView {
  slot: EquippedSlot;
  label: string;
  item: unknown; // opaque gear payload or null; 1a does not interpret it
  isEmpty: boolean;
  resistCapable: boolean;
  isWeapon: boolean;
}

/**
 * Fold any serialized loadout (canonical 10-key OR legacy 4-key) into the canonical 10-key form.
 * - Missing slots → null (renders cleanly as empty).
 * - Legacy keys (weapon/armor/accessory) are remapped to their canonical slot.
 * - A canonical key always wins over a legacy alias if both are somehow present.
 * - Unknown keys are ignored (tolerant, never throws on extra data).
 */
export function normalizeSerializedLoadout(
  raw: SerializedLoadout | null | undefined
): NormalizedLoadout {
  // Start every canonical slot at null (empty) — guarantees all 10 always render.
  const out = Object.fromEntries(
    EQUIPPED_SLOTS.map((s) => [s, null])
  ) as NormalizedLoadout;

  if (!raw || typeof raw !== 'object') return out;

  for (const [key, value] of Object.entries(raw)) {
    // Already-canonical key? (covers all 10, incl. off_hand which is also a legacy key)
    if ((EQUIPPED_SLOTS as readonly string[]).includes(key)) {
      // Canonical key wins; only overwrite if it carries content or slot is still empty.
      if (out[key as EquippedSlot] == null) out[key as EquippedSlot] = value ?? null;
      continue;
    }
    // Legacy alias?
    const mapped = LEGACY_KEY_MAP[key];
    if (mapped) {
      // Do not clobber a canonical value already placed at this slot.
      if (out[mapped] == null) out[mapped] = value ?? null;
    }
    // Unknown key → ignored (tolerant).
  }

  return out;
}

/**
 * Build the ordered render rows for all 10 equipped slots (canonical order).
 * Empty slots are included with item=null and isEmpty=true — the consumer renders them
 * as clean empties. main_hand is flagged isWeapon + resistCapable=false.
 */
export function toEquippedSlotViews(
  raw: SerializedLoadout | null | undefined
): EquippedSlotView[] {
  const normalized = normalizeSerializedLoadout(raw);
  return EQUIPPED_SLOTS.map((slot) => {
    const item = normalized[slot];
    return {
      slot,
      label: EQUIPPED_SLOT_LABEL[slot],
      item,
      isEmpty: item == null,
      resistCapable: isResistCapableSlot(slot),
      isWeapon: slot === MAIN_HAND_SLOT,
    };
  });
}
