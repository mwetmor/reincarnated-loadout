# AGENT_STATE — drax

**Last updated:** 2026-05-14
**Last tag:** drax/v0.6.5-analytics-tier3
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
- **v0.7-encounter-analytics dispatch** — BLOCKED on star-lord fight-log granularity research; do not start until knight-rider confirms unblock
- **Add git remote to loadout repo** — needs Matt to provide remote URL or create GitHub repo
- **Milestone tag** — `v0.6-encounter-viz` and `v0.6.5-analytics-tier3` intermediate only; `v0.6` milestone requires Matt approval per ADR-003
- **Skill gate bug** — gates open per total tree points (5+5=all open); should be per-chain — flagged in v0.4 notes, still open
- **StatRadarChart PolarRadiusAxis domain** — currently fixed at [0, 50]; works for current data but mages spike INT/WIS to ~40% range. Check if any archetype exceeds 50% on a single stat and adjust if needed.
- **SkillTierChart** — experimental archetype has 0 classes in Yomi with tier data (only 1 class, class_0010, archetype=experimental); verify it appears in chart

## Smoke-test status

✓ TypeScript: `npm run build` — clean (0 errors), 684 modules
✓ Build: dist/ produced, gzip sizes nominal
✓ Dev server: root route HTTP 200
✓ Tag: `drax/v0.6.5-analytics-tier3` on `main`
