# AGENT_STATE — drax

**Last updated:** 2026-05-16
**Last tag:** drax/v0.5.2-stats-and-slot (commit ad49d3d)
**Branch:** main

## Session summary

### v0.5-real-gear (completed, prev session)
- Retired all synthesized gear types (`GearEffectPoolEntry`, `RolledEffect`, `GearCatalog`, `SynthesizedSlot`, `formatEffect.ts`)
- Added `GearPoolEntry`, `LoadoutSlot` types matching real engine schema
- Implemented fit-score gear selector: `fit = (energy_type × range_profile × role_orientation)^(1/3); value = power_score × fit`
- Display slots → engine slots: Main=weapon/0, Off=off_hand/0, Head=armor/0, Chest=armor/1, Neck=accessory/0, Ring1=accessory/1, Ring2=accessory/2
- GearGrid: full tier badge palette (legendary/epic/rare/uncommon/common), real names + flavor text
- "Gear — synthesized" retired → "Gear — Yomi Season"
- Loadout page now shows real gear (was empty mode before)

### v0.6-encounter-viz (completed, prev session)
- New `/encounters` route with 4th nav tab
- Two-panel SVG schematic: AOE vs pack (left) + single-target vs pack (right)
- 3 Yomi classes: Lantern-Keeper (AOE), Miasma Warden (AOE), Hollow Wind Ascetic (no AOE)
- Pack N=8 (design-intent placeholder per B10.2; exact value locked by gamora)
- Geometry inferred from `effect_category` (area_damage → circle, others → point)
  - `// TODO: wire B11 geometry field when rocket ships it` — comment in Encounters.tsx
- AOE overlay: skill's `color_value` brightened (+100/channel) for dark UI visibility
- Single-target: ring highlight + tick indicator on closest pack member
- `Skill.color_value: number` added to types.ts (confirmed real engine field)

### v0.6.5-analytics-tier3 (completed, this session)

**Tier 3 analytics charts** — all three from design-doc sections 5, 7, 8:

1. **StatRadarChart** (`src/components/analytics/StatRadarChart.tsx`)
   - Recharts RadarChart showing avg stat allocation per archetype as % of 270-point budget
   - Dropdown to select archetype; violet overlay for selected, gray overlay for global avg
   - All 5 stats: STR, DEX, INT, WIS, VIT

2. **SeasonTimelineChart** (`src/components/analytics/SeasonTimelineChart.tsx`)
   - Recharts LineChart: avg final_modifier per season, chronological by generated_at
   - Hover tooltip shows anchor name, modifier value, class count
   - Reference line at overall avg; honest caption that modifier doesn't trend monotonically across disconnected seeds

3. **SkillTierChart** (`src/components/analytics/SkillTierChart.tsx`)
   - Recharts stacked horizontal BarChart: avg skill count per tier (T1-T4) per archetype
   - Only Yomi season (season_002328) has tier field in skills — older seasons silently skipped
   - Caption explicitly states Yomi-only scope

**useAnalytics additions:**
- `StatRadarEntry`, `SeasonTimelinePoint`, `SkillTierBar` types
- Computations: statRadarEntries, globalStatAvg, seasonTimeline, skillTierBars
- `AnalyticsData` interface extended with 4 new fields

**Tailwind safelist trim** (`tailwind.config.js`):
- Replaced broad catch-all pattern safelist (covered ~500+ classes) with 5 specific literals
- Only classes genuinely needing protection: bg-orange/teal/blue/amber-600, bg-slate-500
  (runtime result of `elColors.bg.replace('950','600').replace('800','500')` in SkillNode.tsx)
- All other element/tier/state colors are string literals → Tailwind scans without safelist

**CC-BY footer** (`src/App.tsx`):
- Added `<Footer />` component at bottom of every route
- Attributes game-icons.net (Lorc, Delapouite & contributors) under CC BY 3.0 with live links
- Previously attribution was in commit messages only

### v0.5.2-stats-and-slot (completed, this session)

1. **Bug A — Slot/flavor mismatch**: Modal slot label now uses `ENGINE_SLOT_LABEL[slot.engineSlot]` instead of `SLOT_TYPE_LABEL[displayLabel]`. Both Head/Chest positions show "Armor" — honest about engine's single armor pool. "Miasma Shroud of Yomi" robe now shows "Armor" not "Helmet".

2. **Bug 5 — Stats display**: Wired `stats`, `rolled_effects`, `ability_modifiers` from MIGRATION.md v1.1. Modal shows cyan stat lines, yellow effect lines, violet modifier lines. `buildStatLines()`, `fmtEffect()`, `fmtModifier()` helper functions.

3. **Bug B — Element on card cell**: `dominant_element` shown as small colored text on card cell below tier abbreviation. 126/200 items have null element — badge optional.

4. **types.ts**: Added `GearStats`, `GearRolledEffect` interfaces; fixed pre-existing nullable type errors (`color_signature`, `flavor_text`, `visual_prompt`). Fixed `Sample.tsx` cast to `as unknown as GearPoolEntry[]`.

**Preview:** https://reincarnated-loadout-7uokkvr61-matthew-wetmore-s-projects.vercel.app

## Confirmed findings

- `role: "primary_attack"` is a real engine field (confirmed from class JSON; not a UI heuristic)
- `Skill.color_value` is a real engine field (RGB integer, calibrated for Pixi.js; dark for Yomi palette)
- `stat_requirements: null` for all 200 Yomi gear items
- Older season skills (season_001001–004) lack `tier` field — schema pre-dates skill tree tier structure
- `stat_distribution` sums to exactly 270 across all seasons (confirmed budget constraint)
- `final_modifier` range: 0.05–0.88 across all seasons (not > 1.0)
- No `origin` remote configured in loadout repo — push steps skipped

## Next session pick-up

Open items remaining:
- **Milestone tag** — `drax/v0.5.2-stats-and-slot` intermediate; `v0.5.2` milestone requires knight-rider/Matt confirmation (ADR-003)
- **v0.7-encounter-analytics dispatch** — BLOCKED on star-lord fight-log granularity research; do not start until knight-rider confirms unblock
- **Add git remote to loadout repo** — needs Matt to provide remote URL or create GitHub repo
- **Milestone tags** — `v0.6-encounter-viz` and `v0.6.5-analytics-tier3` intermediate only; `v0.6` milestone requires Matt approval per ADR-003
- **Skill gate bug** — gates open per total tree points (5+5=all open); should be per-chain — flagged in v0.4 notes, still open
- **StatRadarChart PolarRadiusAxis domain** — currently fixed at [0, 50]; works for current data but mages spike INT/WIS to ~40% range. Check if any archetype exceeds 50% on a single stat and adjust if needed.
- **SkillTierChart** — experimental archetype has 0 classes in Yomi with tier data (only 1 class, class_0010, archetype=experimental); verify it appears in chart

### v0.5.1-bug-fixes (completed, this session)

1. **Bug 1 — All legendary**: `synthesizeSampleLoadout.ts` now assigns explicit tiers per display slot (legendary/rare/epic/uncommon/epic/common/rare → all 5 tiers present). Removed `power_score` from fit formula — was tier-correlated and would override tier targets.

2. **Bug 2 — power_score visible**: Removed `Power X.XXX` line from GearGrid modal tooltip.

3. **Bug 3 — raw slot key**: Added `SLOT_TYPE_LABEL` map to GearGrid. Modal now shows "Helmet", "Chest Armor", "Weapon", "Off-Hand", "Necklace", "Ring" instead of internal shorthand ("Head slot", "Main slot").

4. **Bug 4 — gear on /loadout**: Loadout.tsx reverted to `<GearGrid mode="empty" />`. Removed all synthesized gear imports and useMemo.

**Preview:** https://reincarnated-loadout-606gj5w7p-matthew-wetmore-s-projects.vercel.app

## Confirmed findings (additions this session)

- `color_signature`: null for 160/200 items in gear_pool.json (type was `string`, now `string | null`)
- `flavor_text`: null for 120/200 items (was `string`, now `string | null`)
- `visual_prompt`: null for 120/200 items (was `string`, now `string | null`)
- `dominant_element`: null for 126/200 items (was already `string | null` — correct)
- Engine armor pool is flat (slot='armor' only) — no head/chest sub-slot distinction
- `fit_energy_type` keys: combo, focus, mana, rage, stamina-as-resource (energy type names, not element names)
- `ability_modifiers` keys in data: cooldown_factor, energy_cost_factor, crit_bonus_damage, control_duration_bonus (matches MIGRATION.md)
- Stats range: bonus_damage_flat up to 3707; bonus_hp up to 1430; bonus_crit_chance max 0.1 (10%)

## Smoke-test status

✓ TypeScript: `npm run build` — clean (0 errors), 684 modules
✓ Build: dist/ produced, gzip sizes nominal
✓ Vercel preview: READY (ad49d3d)
✓ Tags on main: `drax/v0.5.1-bug-fixes`, `drax/v0.6.5-analytics-tier3`, `drax/v0.5.2-stats-and-slot`
