/**
 * serialized-loadout-10slot.test.ts — Path B Step 1a (SEAM 4, drax)
 *
 * Dispatch: 2026-06-22-drax-pathb-1a-loadout-app.md
 * Smoke (Discipline #2): the loadout app's serialized-loadout consumer surfaces all 10
 * canonical equipped slots from BOTH a 10-slot fixture AND a legacy 4-key fixture, with
 * main_hand distinguished as the non-resist weapon slot and empties rendered as clean nulls.
 *
 * This is the boundary verification for a CONSUMER seam (round-trip N/A — authors no contract).
 * Pure-logic test of the normalize + view layer (matches the existing node-env vitest pattern;
 * no DOM render needed to prove the slot-surfacing contract).
 *
 * @ts-nocheck -- matches existing test files' vitest type-suppression pattern
 */

// @ts-nocheck
import { describe, it, expect } from 'vitest';
import {
  EQUIPPED_SLOTS,
  RESIST_CAPABLE_SLOTS,
  MAIN_HAND_SLOT,
  normalizeSerializedLoadout,
  toEquippedSlotViews,
  isResistCapableSlot,
} from '../data/serializedLoadout';

// ── Fixture A: canonical serialized 10-slot loadout (serialize_loadout output shape) ──
// Production-post-1a shape: the 4 minted slots filled, the 6 new slots empty (null).
const TEN_SLOT_FIXTURE = {
  main_hand: { name: 'Eclipsed Blade', tier: 'legendary' },
  off_hand: { name: 'Warded Focus', tier: 'rare' },
  head: null,
  chest: { name: 'Meridian Robe', tier: 'epic' },
  hands: null,
  feet: null,
  belt: null,
  ring_1: null,
  ring_2: null,
  amulet: { name: 'Duskweaver Pendant', tier: 'uncommon' },
};

// A fully-populated 10-slot fixture (all slots filled) — proves the 6 new slots surface.
const FULL_TEN_SLOT_FIXTURE = Object.fromEntries(
  EQUIPPED_SLOTS.map((s) => [s, { name: `${s}-item` }])
);

// ── Fixture B: legacy 4-key serialized loadout (pre-1a serialize_loadout output) ──
// weapon→main_hand, off_hand→off_hand, armor→chest, accessory→amulet (MIGRATION §28).
const LEGACY_4KEY_FIXTURE = {
  weapon: { name: 'Old Sword', tier: 'rare' },
  off_hand: { name: 'Old Shield', tier: 'common' },
  armor: { name: 'Old Plate', tier: 'uncommon' },
  accessory: { name: 'Old Amulet', tier: 'rare' },
};

describe('serializedLoadout — canonical contract', () => {
  it('EQUIPPED_SLOTS is exactly the 10 canonical keys in serialize_loadout order', () => {
    expect(EQUIPPED_SLOTS).toEqual([
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
    ]);
  });

  it('exactly 9 resist-capable slots (main_hand excluded) — Rule-2 load-bearing', () => {
    expect(RESIST_CAPABLE_SLOTS).toHaveLength(9);
    expect(RESIST_CAPABLE_SLOTS).not.toContain('main_hand');
    expect(isResistCapableSlot(MAIN_HAND_SLOT)).toBe(false);
    for (const s of RESIST_CAPABLE_SLOTS) expect(isResistCapableSlot(s)).toBe(true);
  });
});

describe('serializedLoadout — 10-slot fixture', () => {
  it('normalizes to exactly 10 canonical slots', () => {
    const n = normalizeSerializedLoadout(TEN_SLOT_FIXTURE);
    expect(Object.keys(n).sort()).toEqual([...EQUIPPED_SLOTS].sort());
  });

  it('surfaces all 10 slots as ordered views; empties are clean nulls', () => {
    const views = toEquippedSlotViews(TEN_SLOT_FIXTURE);
    expect(views).toHaveLength(10);
    expect(views.map((v) => v.slot)).toEqual([...EQUIPPED_SLOTS]); // canonical order preserved
    // 4 filled, 6 empty (the post-1a production shape).
    expect(views.filter((v) => !v.isEmpty)).toHaveLength(4);
    expect(views.filter((v) => v.isEmpty)).toHaveLength(6);
    // Empty slots carry item === null, not undefined / error.
    for (const v of views.filter((x) => x.isEmpty)) expect(v.item).toBeNull();
  });

  it('main_hand is flagged as the non-resist weapon slot', () => {
    const views = toEquippedSlotViews(TEN_SLOT_FIXTURE);
    const mh = views.find((v) => v.slot === 'main_hand');
    expect(mh.isWeapon).toBe(true);
    expect(mh.resistCapable).toBe(false);
    // Every other slot is resist-capable.
    for (const v of views.filter((x) => x.slot !== 'main_hand')) {
      expect(v.isWeapon).toBe(false);
      expect(v.resistCapable).toBe(true);
    }
  });

  it('a fully-populated 10-slot fixture surfaces all 6 new slots filled', () => {
    const views = toEquippedSlotViews(FULL_TEN_SLOT_FIXTURE);
    expect(views.filter((v) => !v.isEmpty)).toHaveLength(10);
    for (const newSlot of ['head', 'hands', 'feet', 'belt', 'ring_1', 'ring_2']) {
      expect(views.find((v) => v.slot === newSlot).isEmpty).toBe(false);
    }
  });
});

describe('serializedLoadout — legacy 4-key brownfield fixture', () => {
  it('maps weapon→main_hand, armor→chest, accessory→amulet; off_hand stays', () => {
    const n = normalizeSerializedLoadout(LEGACY_4KEY_FIXTURE);
    expect(n.main_hand).toEqual({ name: 'Old Sword', tier: 'rare' });
    expect(n.off_hand).toEqual({ name: 'Old Shield', tier: 'common' });
    expect(n.chest).toEqual({ name: 'Old Plate', tier: 'uncommon' });
    expect(n.amulet).toEqual({ name: 'Old Amulet', tier: 'rare' });
  });

  it('still surfaces all 10 slots; the 6 unmapped legacy slots are empty', () => {
    const views = toEquippedSlotViews(LEGACY_4KEY_FIXTURE);
    expect(views).toHaveLength(10);
    expect(views.map((v) => v.slot)).toEqual([...EQUIPPED_SLOTS]);
    expect(views.filter((v) => !v.isEmpty)).toHaveLength(4);
    // head/hands/feet/belt/ring_1/ring_2 not in the legacy shape → empty, no error.
    for (const empty of ['head', 'hands', 'feet', 'belt', 'ring_1', 'ring_2']) {
      expect(views.find((v) => v.slot === empty).isEmpty).toBe(true);
    }
  });

  it('legacy main_hand (from weapon) is still the non-resist weapon slot', () => {
    const views = toEquippedSlotViews(LEGACY_4KEY_FIXTURE);
    const mh = views.find((v) => v.slot === 'main_hand');
    expect(mh.isWeapon).toBe(true);
    expect(mh.resistCapable).toBe(false);
    expect(mh.isEmpty).toBe(false);
  });
});

describe('serializedLoadout — tolerance / edge cases', () => {
  it('null / undefined loadout → all 10 slots empty, no throw', () => {
    for (const empty of [null, undefined, {}]) {
      const views = toEquippedSlotViews(empty);
      expect(views).toHaveLength(10);
      expect(views.every((v) => v.isEmpty)).toBe(true);
    }
  });

  it('unknown extra keys are ignored, not errored', () => {
    const views = toEquippedSlotViews({ main_hand: { name: 'X' }, bogus_slot: { name: 'Y' } });
    expect(views).toHaveLength(10);
    expect(views.find((v) => v.slot === 'main_hand').isEmpty).toBe(false);
  });

  it('canonical key wins over a legacy alias if both present', () => {
    // main_hand (canonical) + weapon (legacy alias for main_hand) both present.
    const n = normalizeSerializedLoadout({
      main_hand: { name: 'Canonical' },
      weapon: { name: 'Legacy' },
    });
    expect(n.main_hand).toEqual({ name: 'Canonical' });
  });
});
