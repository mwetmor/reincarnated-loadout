# AGENT_STATE — drax

**Last updated:** 2026-05-25
**Last tag:** drax/cycle-12-wave-5-spirit-guide-narration-update-2026-05-25 — Cycle 12 Wave 5 Spirit Guide narration L6 enrichment
**Branch:** main
**Hive-mind mode:** ACTIVE (Cycle 12 Wave 5 COMPLETE; awaiting KR integration smoke + Gate-2)

## Session summary

### Cycle 12 Wave 5 — Spirit Guide narration L6 enrichment (completed 2026-05-25)

**Dispatch:** `agentic_orchestration/dispatches/2026-05-25-drax-cycle-12-wave-5-spirit-guide-narration-update.md`
**Tag:** `drax/cycle-12-wave-5-spirit-guide-narration-update-2026-05-25` @ commit `7699690`
**Upstream:** rocket Layer 6 `t4_wireup.py` emit_cross_seam_fields() + `rocket/v0.1-cycle-12-layer-6-section-8-wireup-and-l9-refactor-2026-05-25`
**MIGRATION.md:** v1.4-layer-6 (spirit_guide_narration_metadata emission shape)
**Preview URL:** https://reincarnated-loadout-bxdfu3igb-matthew-wetmore-s-projects.vercel.app
**Push status:** PUSHED — main + tag pushed to origin

**What shipped:**

1. **`src/data/types.ts`** — NarrationMetadata interface + T4AlterationOutput extension:
   - New `NarrationMetadata` interface per MIGRATION.md § v1.4-layer-6 / t4_wireup.py `_build_spirit_guide_narration()` shape:
     - `has_mechanic_alteration: boolean`
     - `alteration_type?: string | null`
     - `thematic_rationale?: string | null` (engine-generated, richer than Cycle 11 static)
     - `manifestation?: string | null`
     - `spirit_guide_explainer_template?: string | null`
     - `narrative_hooks?: string[]`
     - `secondary_alteration_types?: string[]`
   - `T4AlterationOutput.spirit_guide_narration_metadata?: NarrationMetadata | null` — additive nullable field
   - All null-safe; pre-L6 classes (absent field) degrade cleanly to Cycle 11 behavior

2. **`src/components/SkillTree/T4AlterationPanel.tsx`** — Spirit Guide narration fallback chain:
   - Fallback chain: L6 `narration_metadata.thematic_rationale` → Cycle 11 `thematic_rationale` → § 9 template voice
   - L6 explainer template label rendered as `text-[9px]` micro-label in Spirit Guide header row when present (e.g., "resource cost shift")
   - L6 narrative hooks rendered as small context chips below narration text when present (e.g., "sacrifice", "blood magic", "life wager")
   - Tier 2 framing maintained: "Build Identity" badge + "Intent Metadata" header — no Cycle 11 framing changed
   - Null-safe throughout: `narrationMeta?.thematic_rationale` pattern; `?? []` for hooks array

3. **`data/sample-season/classes/class_0001.json`** — fixture extended with `spirit_guide_narration_metadata`:
   - Populated with realistic L6-shape content for RESOURCE_CONVERSION: `has_mechanic_alteration: true`, `alteration_type`, `thematic_rationale` (richer prose than Cycle 11 `thematic_rationale`), `manifestation: "rank3_passive"`, `spirit_guide_explainer_template: "resource_cost_shift"`, `narrative_hooks: ["sacrifice", "blood_magic", "life_wager"]`, `secondary_alteration_types: []`
   - Exercises the populated-case path (L6 enrichment narration + explainer template label + narrative hook chips)

**Smoke results:**
- `npm run build`: 773 modules, 0 TypeScript errors — PASS (parity with Cycle 11 baseline)
- Null-case smoke: all 11 real seasons (no `t4_alteration_output`, no `spirit_guide_narration_metadata`) — T4AlterationPanel returns null, no broken UI (TypeScript type constraint + null guard verified)
- Populated-case smoke: `class_0001.json` (sample-season) with `spirit_guide_narration_metadata` → L6 narration path (richer prose renders), explainer template label visible, narrative hook chips render below narration text
- Tier 2 framing: "Build Identity" badge maintained; "Intent Metadata" label in M6 panel unaffected; no over-promising language introduced
- No regression: M1 (WeaponSlot), M2 (OffHandSlot), M4 (attribute coupling), M5 (ProvenanceBadge), M6 (T4ComparisonPanel) all unaffected
- Q5 RATIFIED: preview-only; production NOT promoted

**Design decisions made:**
- L6 explainer template rendered as informational micro-label (text-[9px], muted gray) in Spirit Guide header — visible but non-intrusive; doesn't compete with narration prose
- Narrative hooks rendered as small chips below narration text only when hooks array is non-empty — degrades cleanly to no chips for pre-L6 classes
- Fallback chain preserves Cycle 11 behavior exactly for pre-L6 classes: `narrationMeta` is null → `spiritGuideNarration` falls through to `alteration.thematic_rationale` → same behavior as Cycle 11 v1.0
- No new UI affordances beyond narration enrichment; all changes woven into existing M3 Spirit Guide box

**TODO(drax): remove sample-season narration_metadata fixture** — updated with synthesized L6-shape content. When rocket §8 + Layer 6 ships and season is regenerated, replace with real engine emission. Track until star-lord confirms regen + export complete. (Extends prior TODO for T4 fixture.)

---

### Cycle 11 M3 + M6 — T4 alteration display + comparison panel (completed 2026-05-25, Wave 3b)

**Dispatch:** `agentic_orchestration/dispatches/2026-05-25-drax-cycle-11-m3-m6-t4-display-wave-3b.md`
**Tag:** `drax/v0.1-cycle-11-m3-m6-t4-display-wave-3b-2026-05-25` @ commit `b948d3d`
**Intermediate tag:** `drax/v0.0-cycle-11-m3-t4-alteration-display-2026-05-25` @ `b948d3d`
**Upstream:** `star-lord/v0.1-cycle-11-schema-extensions-2026-05-25` (79/79 PASS)
**MIGRATION.md:** v1.3 (t4_alteration_output field; 4 additive nullable fields)
**Preview URL:** https://reincarnated-loadout-bc7s9pqpu-matthew-wetmore-s-projects.vercel.app
**Push status:** PUSHED — main + both tags pushed to origin

**What shipped:**

1. **`src/data/types.ts`** — T4AlterationOutput interface + T4StrategyType:
   - `T4StrategyType` union covering all 5 v1 strategies + forward-compat `string`
   - `T4AlterationOutput` interface: `strategy_type`, `strategy_params`, `applied_axis_targets?`, `eta_score?`, `thematic_rationale?`
   - `ClassData.t4_alteration_output` typed as `T4AlterationOutput | null` (was loose `Record<string,any>`)

2. **`src/components/SkillTree/T4AlterationPanel.tsx`** (M3):
   - Renders `t4_alteration_output` intent metadata below SkillTree grid
   - Header: strategy label (human-readable, not raw enum) + "Build Identity" badge + η-score
   - Body: mechanical strategy description (static template per strategy_type)
   - Parameters rendered as `label: value` pairs (friendly key labels)
   - BC axis tags rendered as small chips
   - Spirit-guide narration box (◈ icon): uses `thematic_rationale` from class JSON when present;
     falls back to § 9 template voice ("Summoner, you may have noticed...")
   - Null-safe: component returns null when alteration is null

3. **`src/components/SkillTree/T4ComparisonPanel.tsx`** (M6):
   - TOGGLE panel per Q2 RATIFIED (button with ▶ chevron; closed by default)
   - Current strategy shown with violet "selected" badge + η-score
   - 4 alternative strategies shown with static descriptions + "v1.1" placeholder for η-scores
   - Footer note: v1.1 will surface actual candidate scores when rocket §8 multi-candidate ships
   - Null-safe: toggle hidden entirely when alteration is null

4. **`src/components/SkillTree/SkillTree.tsx`** — wiring:
   - Imports T4AlterationPanel + T4ComparisonPanel
   - `t4Alteration = classData.t4_alteration_output ?? null` — null-safe extraction
   - Both panels conditionally rendered below tree/detail-panel row
   - Outer wrapper `<div className="flex flex-col gap-4">` wraps the full component

5. **`data/sample-season/classes/class_0001.json`** — smoke fixture:
   - Added `t4_alteration_output: RESOURCE_CONVERSION` with `strategy_params`, `applied_axis_targets`, `eta_score: 0.82`, and `thematic_rationale` (spirit-guide narration text)
   - This exercises the full render path for M3 + M6 + spirit-guide narration

**Tier 2 framing honored:** "Build Identity" badge on M3 header strip; "Intent Metadata" label in M6 panel header; M6 footer cites "Cycle 12 Layer 6" for combat wire-up.

**Design decisions made:**
- M3 goes BELOW the tree/detail-panel row (not inside the tree grid) — keeps the grid clean; alteration is a class-level identity, not per-skill
- Spirit-guide narration WOVEN INTO M3 panel (not a separate affordance) — per dispatch § 9 pattern; uses ◈ icon consistent with existing SpiritGuide component
- M6 toggle trigger: text button with ▶ chevron (`rotate-90` when open) — mobile-friendly tap target
- M6 comparison: current-only with static alternative descriptions (dispatch: lean toward current-only for v1 simplicity; multi-candidate deferred to v1.1)
- Violet accent color for T4 badge + current-alteration row in M6 — consistent with existing skill tier color register

**Smoke results:**
- `npm run build`: 773 modules, 0 TypeScript errors — PASS
- Vercel preview: `reincarnated-loadout-bc7s9pqpu-matthew-wetmore-s-projects.vercel.app` — READY
- Cycle-11+ path (class_0001, sample-season): RESOURCE_CONVERSION alteration renders M3 panel + M6 toggle + spirit-guide narration
- Null-case path: all 11 real seasons (no `t4_alteration_output`) — both panels hidden, no broken UI (null-guard verified by TypeScript type constraint)
- No regression: M1 (WeaponSlot), M2 (OffHandSlot), M4 (attribute coupling), M5 (ProvenanceBadge) all unaffected
- Q5 RATIFIED: preview-only; production NOT promoted

**TODO(drax): remove sample-season T4 fixture** — `data/sample-season/classes/class_0001.json` now has `t4_alteration_output` manually patched. When rocket §8 ships and season is regenerated, replace with real output. Track until star-lord confirms regen + export complete.

**TODO(drax): review M3 panel position** — currently M3 + M6 render below the SkillTree component's full row. Post-mortem: if Matt wants them in a different position in Loadout.tsx (e.g., as a separate section with its own header), easy to move — wiring is in SkillTree.tsx return, but could be lifted to Loadout.tsx instead.

---

### Cycle 11 M4 — Attribute coupling labels (completed 2026-05-25, Wave 3a refire)

**Dispatch:** `agentic_orchestration/dispatches/2026-05-25-drax-cycle-11-m4-attribute-coupling-labels-refire.md`
**Tag:** `drax/v0.0-cycle-11-m4-attribute-coupling-labels-2026-05-25-refire`
**Upstream:** `rocket/v0.0-cycle-11-attribute-coupling-field-2026-05-25` @ `eef66b1` (5/5 PASS)
**MIGRATION.md:** `~/Games/reincarnated-engine/src/reincarnated/generation/MIGRATION.md` § [2026-05-25]

**What shipped:**

1. **`src/data/types.ts`** — `attribute_coupling?: string[]` optional field added to `ClassData` interface:
   - Field comment cites MIGRATION.md [2026-05-25] + null-safety pattern
   - Optional (absent key on pre-Cycle-11 legacy seasons)

2. **`src/components/StatsPanel/StatsPanel.tsx`** — Coupling label row:
   - `formatCoupledStat()` helper: maps lowercase stat name → `STAT_LABELS` abbreviation (INT, WIS, etc.)
   - `attributeCoupling = classData.attribute_coupling ?? []` — null-safe for absent-key legacy seasons
   - Renders `Coupled: INT + WIS` row (using `text-violet-400` for stat values; `text-gray-500` for "Coupled:" label)
   - Conditionally rendered: `{attributeCoupling.length > 0 && (...)}` — renders nothing for legacy classes
   - Placement: between stat bars block and SP Budget section within StatsPanel card

3. **`data/sample-season/classes/class_0001.json`** — Added `attribute_coupling: ["intelligence", "wisdom"]` for Cycle-11+ smoke path verification (derived from stat_distribution top-2: INT=101, WIS=98)

**Label phrasing design decision:** `"Coupled: INT + WIS"` — abbreviated form using existing `STAT_LABELS` constants (3-letter uppercase codes). Matches the terse monospace font register of the stat bar labels. Avoids expanded form ("Couples with Intelligence + Wisdom") which would be wider than the stat block column on mobile. Rendered in violet-400 to match the stat bar fill color (`bg-violet-600`), creating visual cohesion.

**Smoke results:**
- `npm run build`: 771 modules, 0 TypeScript errors (clean) — PASS
- Cycle-11+ path: `class_0001.json` (sample-season) now has `attribute_coupling: ["intelligence", "wisdom"]` → renders `Coupled: INT + WIS` (confirmed by type-safe build + logic trace)
- Legacy path: season_001001 class_0001 has no `attribute_coupling` key → `?? []` → `length === 0` → no label, no broken UI (confirmed by empirical key-check: `'attribute_coupling' in d == False`)
- No regression: all 11 existing seasons' classes have absent field → null-guard path exercises cleanly

**TODO(drax): remove sample-season fixture patch** — `data/sample-season/classes/class_0001.json` manually patched with `attribute_coupling`. When engine regen fires post-Cycle-11, replace with real output. Track until star-lord confirms regen + export complete.

---

### Cycle 11 M1 + M2 + M5 — Weapon slots + provenance badge (completed 2026-05-25)

**Dispatch:** `agentic_orchestration/dispatches/2026-05-25-drax-cycle-11-m1-m2-m5-loadout-display.md`
**Tag:** `drax/v0.1-cycle-11-m1-m2-m5-loadout-display-2026-05-25` @ commit `f22a61f`
**Upstream:** `star-lord/v0.1-cycle-11-schema-extensions-2026-05-25` (79/79 PASS)
**MIGRATION.md:** v1.3 (star-lord Wave 1, 4 additive nullable fields)

**Intermediate tags:**
- `drax/v0.0-cycle-11-m5-provenance-badge-2026-05-25` @ `2823dc1`
- `drax/v0.0-cycle-11-m1-weapon-slot-2026-05-25` @ `e402f7b`
- `drax/v0.0-cycle-11-m2-off-hand-slot-2026-05-25` @ `e402f7b`

**What shipped:**

1. **M5 — ProvenanceBadge** (`src/components/ui/ProvenanceBadge.tsx`):
   - Consumes `source_library` string field (class-level)
   - `engine_authored_gap_fill_v1` → amber badge with "Engine fill" label (distinct per Q1 RATIFIED)
   - All other substrate libraries (met_museum, fextralife_ds2, odin_army_tradoc, wikidata_named_weapon) → neutral gray badge
   - Null-safe: returns null when source_library is null/undefined

2. **M1 — WeaponSlot** (`src/components/WeaponSlot/WeaponSlot.tsx`):
   - Consumes `main_weapon` WeaponDescriptor from class JSON
   - Renders: slot label, weapon name, category badge, cultural_register, period (underscore-replaced), lineage (nullable)
   - Embeds ProvenanceBadge from weapon.source_library (weapon-level provenance)
   - Null-safe: returns null when weapon is null

3. **M2 — OffHandSlot** (`src/components/WeaponSlot/OffHandSlot.tsx`):
   - Consumes `secondary_item` WeaponDescriptor from class JSON
   - Wraps WeaponSlot with "Off-Hand" label
   - Q3 UI-staging: `SHOW_OFF_HAND_SLOT = false` during T4 post-mortem; component is fully built
   - Null-safe: returns null when secondary_item is null (ALWAYS-VALID null per schema)

4. **types.ts** — `WeaponDescriptor` interface + Cycle 11 optional fields on ClassData:
   - `main_weapon?: WeaponDescriptor | null`
   - `secondary_item?: WeaponDescriptor | null`
   - `source_library?: string | null`
   - `t4_alteration_output?: Record<string, any> | null` (M3 gated — DO NOT render yet)

5. **Loadout.tsx wiring:**
   - ProvenanceBadge added to archetype tag row in ClassHeader (class-level source_library)
   - WeaponSlot + OffHandSlot section between ClassHeader and SkillTree; collapses when both null
   - Section renders only when `classData.main_weapon || classData.secondary_item` is truthy

6. **Smoke fixtures** (sample-season):
   - `class_0001`: met_museum main_weapon (polearm), null secondary_item, met_museum source_library
   - `class_0002`: engine_authored_gap_fill_v1 main_weapon + secondary_item (melee + talisman), gap-fill source_library

**Smoke results:**
- `npm run build`: 771 modules, 0 TypeScript errors (clean)
- Dev server: starts in 197ms, no console errors
- All pre-Cycle-11 classes (no main_weapon/secondary_item/source_library fields) handled by optional typing — null-guard paths verified
- Chunk size warning is pre-existing (Recharts); no new issue

**TODO(drax): SHOW_OFF_HAND_SLOT = true for v1.0 production launch** (Q3 RATIFIED)
- File: `src/components/WeaponSlot/OffHandSlot.tsx`, line 18
- Flip constant to `true` when v1.0 production launch authorized
- Remove TODO comment and staging gate comment at same time

**Deferred (out of scope this Wave):**
- M3 (T4 alteration panel): gated on rocket §8 + BC-shift sweep PASS
- M4 (attribute_coupling labels): gated on rocket attribute_coupling field landing
- M6 (T4 comparison panel): gates on M3

---

### /pitch page Phase-1 scaffold (completed 2026-05-18)

**Dispatch:** `agentic_orchestration/gandalf/requests/2026-05-18-star-lord-pitch-to-life-vercel-automation-sprint.md` § 2.3
**Commit:** `fda1a2a` — `feat(drax-loadout): /pitch page scaffold (Pattern A)`
**Preview URL:** https://reincarnated-loadout-9p1dedmlh-matthew-wetmore-s-projects.vercel.app/pitch
**Pitch URL:** https://reincarnated-loadout-9p1dedmlh-matthew-wetmore-s-projects.vercel.app/pitch

**New files:**
- `src/pages/Pitch.tsx` — page composition
- `src/components/pitch/HeroOfEngineSpotlight.tsx`
- `src/components/pitch/SeasonHypePiece.tsx`
- `src/components/pitch/CosmologyPairBlock.tsx`
- `src/components/pitch/SlotFillChipRow.tsx`
- `src/components/pitch/HeroPortraitPlaceholder.tsx`
- `src/components/pitch/PathsCards.tsx`
- `src/data/pitch/pitchData.ts`

**Modified:** `src/App.tsx` (route), `src/components/Nav.tsx` (nav item)

**Data sources used:**
- Hero class names + season assignments: gandalf curation `agentic_orchestration/gandalf/findings/2026-05-18-pitch-top-hero-curation.md`
- Cosmological pair-rationale prose + slot-fills: real engine output `reincarnated-engine/output/standard-demo-regen-2026-05-17/season_00201{1..5}/cosmological_vocabulary.json`
- star-lord's `seasons.json` included (already at `src/data/pitch/seasons.json` when commit ran)

**Phase 2 requirements (for star-lord):**
- Portrait pipeline to produce `public/pitch/heroes/<season_id>/<class_slug>.png` + `public/pitch/heroes-manifest.json`
- On manifest delivery: drax Phase 2 swaps HeroPortraitPlaceholder for real `<img>` at all TODO(drax) swap-points

**TODO(drax) entries (all Phase 2 swap-points):**
- `src/components/pitch/HeroPortraitPlaceholder.tsx` — swap for `<img>` when portraits land
- `src/pages/Pitch.tsx` — Phase 2 swap comment at import block
- `src/data/pitch/pitchData.ts` — replace inline data with seasons.json import + heroes-manifest.json consumption

**Smoke:** `npm run build` clean — 768 modules, 0 TypeScript errors

---

### v1.17 loadout side-car — is_retired filter (completed 2026-05-18)

**Dispatch:** `2026-05-18-drax-v1-17-auto-cast-plus-dungeon-objects-plus-is-retired-filter.md` Block 3
**Source:** rocket v1.17 canonical-6 is_retired backfill (17 hybrid_mage instances across seasons 002011-002015)

**Changes:**
- `src/data/types.ts`: added `is_retired?: boolean` and `retirement_reason?: string` to ClassData interface
- `src/pages/Loadout.tsx`: `classes` filtered to exclude `is_retired === true` before class-select
- `src/pages/Sample.tsx`: same filter applied
- `npm run build` clean (loadout)

**Effect:** hybrid_mage classes (17 instances) no longer appear in the loadout class selector for affected seasons.

---

### v1.1 Website refresh — new seasons + seasonal analytics (completed 2026-05-17)

**Dispatch:** `2026-05-17-drax-loadout-website-refresh-new-seasons-and-analytics.md` — COMPLETE
**Tag:** `drax/v1.1-loadout-website-refresh-new-seasons-and-analytics-1`
**Source:** `reincarnated-engine/output/standard-demo-regen-2026-05-17/` (5 seasons 002011-002015)

**Data layer:** 11 seasons total / 114 classes now in `data/`
- Historical (canonical-4): season_001001, 001002, 001003, 001004, 001005
- Canonical-7 (lightning/holy/shadow added): season_002011, 002012, 002013, 002014, 002015
- Yomi (gear-pool season): season_002328
- `useSeasonData` auto-discovers via `import.meta.glob` — no hook changes needed beyond `selectableSeasons` addition

**Analytics refresh (`src/pages/Analytics.tsx` + hooks + 2 new components):**

1. **SeasonSummaryCards** (`src/components/analytics/SeasonSummaryCards.tsx`) — per-season card grid:
   - Three groups: Historical / Canonical-7 / Yomi
   - Per card: label, C7 badge, PASS/FAIL validation, theme element (colored dot), anchor name, class count, convergence failures, avg modifier, substrate chips (* = new canonical-7)
   - Canonical-7 new-substrate callout per card when lightning/holy/shadow present

2. **SubstrateHeatmap** (`src/components/analytics/SubstrateHeatmap.tsx`) — cross-season substrate count table:
   - Rows = seasons (C7 seasons left-border highlighted, violet C7 label)
   - Columns = all substrates (fire/water/earth/wind/lightning/holy/shadow/physical)
   - Cell intensity scales to max observed count; color-coded by substrate hue
   - Columns marked * for canonical-7 substrates

3. **useAnalytics additions:**
   - `SeasonSummaryCard`, `SubstrateHeatmapRow` types
   - `seasonSummaryCards`, `substrateHeatmap`, `allSubstrates`, `newSubstrateSet` fields
   - `isCanonical7Season()` helper identifies 002011-002015

4. **Analytics.tsx:**
   - New canonical-7 callout banner (violet, above summary cards)
   - `NewSubstratesBadge` in summary strip (shows "lightning · holy · shadow")
   - SeasonSummaryCards + SubstrateHeatmap inserted above existing Tier 1 charts
   - Existing 9 charts fully preserved

5. **Season pickers (Loadout.tsx + Sample.tsx):**
   - `selectableSeasons` added to `useSeasonData` return
   - Dropdown at page top; class resets on season change
   - Works across all 11 real seasons (sample-season alias excluded from picker)

6. **constants.ts extensions:**
   - `ELEMENT_COLORS`: added lightning (yellow), holy (violet), shadow (purple)
   - `ARCHETYPE_LABEL`: added lightning_mage, lightning_controller, holy_caster, holy_controller, shadow_mage, shadow_controller, physical_grappler

**Smoke results:**
- `npm run build`: clean (0 TypeScript errors, 760 modules)
- Bundle size: 2,315 KB minified / 469 KB gzip — grew ~1.5 KB from 51 new class JSONs (within expectations)
- CourtBrowser.tsx: untouched; court.json bootstrap path intact
- Encounters.tsx: untouched (fixed to season_001005 encounter analytics data)
- Vercel deploy size: OBSERVATION — pre-existing chunk warning (Recharts), no new issue

**Note on season_001005:** Was absent from loadout data (only 001001-004 were present). Sourced from `reincarnated-engine/seasons/season_001005/` (not the standard-demo-regen-2026-05-17 staging dir). Now present alongside the other historical seasons.

### D17 Court of Forms browser surface (completed 2026-05-17)

**Dispatch:** `2026-05-17-drax-loadout-d17-court-browser-surface.md` — COMPLETE
**Tag:** `drax/v1.0-d17-court-browser-surface-1` (significant version bump; loadout-side D17 milestone)
**Route:** `/court` (new nav tab "Court")
**MIGRATION.md:** §v1.2
**Hive log entries:** STATE + QUESTION (rocket export step) + HANDOFF (drax-demo) appended

**Architecture decision: Path A static export** (documented in MIGRATION.md §v1.2)
- Engine (rocket) writes JSON snapshot to `~/.config/reincarnated/court_export.json`
- Loadout reads from `public/data/court.json` (bootstrap empty file in place)
- Path B (API) and Path C (SQLite file-watch) rejected — disproportionate for local-first Phase-1 P1
- QUESTION filed → rocket: add `Court.export_json(earth_self_id, output_path)` to `court_persistence.py`

**What shipped (5 items):**

1. **Architecture decision** — Path A static export; documented in MIGRATION.md §v1.2 including
   QUESTION to rocket for the missing export step.

2. **Court data consumption layer:**
   - `src/data/courtTypes.ts` — TypeScript types mirroring Python dataclasses (`CourtForm`,
     `CourtSkill`, `CourtVisualSignature`, `CourtExport`); `SUBSTRATE_COLORS` (all 7 canonical
     substrates); `SUBSTRATE_GROUPING_LABEL`, `PATH_TAKEN_LABEL`, `COURT_ROLE_LABEL`
   - `src/hooks/useCourtData.ts` — React hook; discriminated union state (loading/empty/ready/error);
     graceful empty-Court handling; forms sorted season ASC on load

3. **Court browser UI (`src/pages/CourtBrowser.tsx`):**
   - Card grid (1→2→3→4 col responsive)
   - Substrate filter toggles (grouping_label display; "all" default)
   - Search by form_name (substring, case-insensitive)
   - Sort: season ASC/DESC, substrate, name
   - N=5 recency indicator (accent-color "recent" badge on most recently ascended forms)
   - Sprite thumbnails from vfx-manifest.json v1.1 `thumbnail_frame.file` paths; `onError` graceful degradation
   - All 7 substrate colors visible (SUBSTRATE_COLORS extension of v0.28 palette)
   - Per-card: form_name (full, per C3), season, archetype, role, class_role_function,
     iconic skill, path_taken, court_resonance strip
   - Empty state: canonical voice copy ("Your Court will populate as you ascend forms across seasons")
   - Loading + error states

4. **Cross-seam reference update:**
   - `MIGRATION.md §v1.2` authored (architecture decision + schema + consumer responsibilities)
   - `AGENT_STATE.md` updated (this entry)
   - Bootstrap `public/data/court.json` created (empty envelope; triggers empty state)

5. **Hive log + tag:**
   - STATE entry appended
   - QUESTION → rocket (export_json() needed)
   - HANDOFF → drax-demo (informational; Court browser live in loadout)
   - Tag: `drax/v1.0-d17-court-browser-surface-1`

**New files:**
- `src/data/courtTypes.ts` — Court TypeScript types + substrate palette
- `src/hooks/useCourtData.ts` — React hook for court.json consumption
- `src/pages/CourtBrowser.tsx` — Court browser UI page
- `public/data/court.json` — bootstrap empty envelope (Path A consumer path)

**Modified files:**
- `src/App.tsx` — added `/court` route + CourtBrowser import
- `src/components/Nav.tsx` — added "Court" nav tab
- `MIGRATION.md` — §v1.2 appended
- `AGENT_STATE.md` — this entry

**Smoke results:**
- `npm run build`: 690 modules, 0 TypeScript errors (clean)
- court.json: valid JSON, empty envelope, graceful empty state path verified by type
- Substrate colors: all 7 substrates have explicit Tailwind literal classes (no safelist additions needed)
- Sprite thumbnail paths: `onError` degradation means broken paths don't crash the page
- Build chunk size warning is pre-existing (Recharts); no new issue

**TODO(drax): remove Path A bootstrap** — when rocket ships `export_json()` and first export
is produced, the empty `public/data/court.json` gets replaced with real data. Then the empty
state is no longer the default path. Track until rocket HANDOFF confirms export step live.

**TODO(drax): Frostwindz guard preserved** — Frostwindz Deathbringer is `denied_uses: ["court_portrait_full_screen"]`.
Court card thumbnails use `chierit/shadow_stalker/gif_samples/e_idle.gif` for shadow (not Frostwindz).
No Frostwindz paths referenced in CourtBrowser.tsx. Guard intact.

### D19 Sub-phase B-partial: holy VFX gap closed + Frostwindz ingested + earth deferred (completed 2026-05-17)

**Hive-mode D19 Sub-phase B-partial.** Matt landed two vendor packs on-disk: CreativeKind Holy Spell Effects + Frostwindz Deathbringer. CraftPix Premium + Fellor Crystal DEFERRED to Phase-2 per Matt L3 disposition 2026-05-17.
**Tag:** `drax/v0.24-d19-sub-phase-b-partial-holy-frostwindz-1`
**Loadout commit:** `3b17175` (data/vfx-manifest.json v1.1 + MIGRATION.md §v1.1)
**Demo commit:** `103ed6c` (metadata.json for both packs)
**Hive log entries:** STATE + HANDOFF + OBSERVATION (appended after commit)

**What shipped:**

1. **CreativeKind Holy Spell Effects metadata.json** (`Holy_Spell_Effects_Creativekind/metadata.json`):
   - 13 animation slugs (Spell 1–13) with geometry_type + affinity mapping
   - derived_register: hand-drawn-pixel (VERIFIED — HD-resolution spritesheets, smooth digital painting)
   - All 5 PREFER holy geometries mapped (radiant_aura, shaft, nova, ground_targeted_circle, area_sustain)
   - 52 assets (26 preview GIFs + 26 spritesheets); 9 color variants for Spell 4 (radiant_aura)

2. **Frostwindz Deathbringer metadata.json** (`Deathbringer VFX/metadata.json`):
   - derived_register: 16-bit-shaped-pixel (CONFIRMED retro-pixel by visual inspection)
   - permitted_uses: [ui_thumbnail, loadout_static, substrate_browser_thumbnail, trial_cinematic_redraw_source]
   - denied_uses: [in_combat_vfx, court_portrait_full_screen] per gandalf DECISION [2026-05-18 00:00Z]
   - License: commercial-royalty-free (no attribution required; read from embedded docx)
   - 6 VFX animations; 99 total frames across VFX 1-6
   - TODO(drax) guard preserved and strengthened

3. **vfx-manifest.json v1.1** (`data/vfx-manifest.json`):
   - schema_version: "1.0" → "1.1"
   - HOLY: primary_spell_pack set (creativekind-holy-spell-effects); geometry_animation_map populated (8 keys); acquisition_status entity-only-on-disk → on-disk; combat_vfx_ready: false → **true** (Discipline #12 semantic shift)
   - SHADOW (Frostwindz): acquisition_status pending-matt → on-disk; register_risk confirmed; permitted_uses/denied_uses set; NOT in geometry_animation_map (in-combat denied)
   - EARTH (CraftPix + Fellor): acquisition_status pending-matt → deferred-post-phase-1-p1; phase_2_followup notes added; stone-VFX fallback documented
   - New v1.1 fields: permitted_uses, denied_uses, register_risk (confirmed), phase_2_followup, gandalf_decision_ref, animation_preview, deferred-post-phase-1-p1 status value

4. **MIGRATION.md §v1.1** entry authored:
   - Semantic shift documentation (holy combat_vfx_ready false → true)
   - Frostwindz conditional-accept ingestion + TODO(drax) guard
   - Earth deferral disposition + Phase-2 followup
   - Schema field additions (backward-compatible)
   - Consumer responsibilities per seam (star-lord / rocket / drax)

**Smoke results:**
- vfx-manifest.json: parses clean (python3 -m json.tool)
- No Frostwindz entries in any geometry_animation_map (verified by script)
- All holy PREFER geometry affinities covered; no key drift vs § 6 declarations
- npm run build: succeeded (687 modules, 0 TS errors)

**Phase-2 followup queue (captured in manifest + state):**
1. CraftPix Premium wood-nature (earth biological-organic) — DEFERRED 2026-05-17 per Matt
2. Fellor Crystal Gem (earth crystal-gem) — DEFERRED 2026-05-17 per Matt; macOS Gatekeeper note on retry
3. CreativeKind shadow-tendril (shadow tendril/creep geometry) — catalogue-only; not yet authorized; needed for full shadow combat_vfx_ready

**Cross-seam observations:**
- Holy combat_vfx_ready now TRUE — rocket D17 Court browser holy thumbnail UNBLOCKED (new thumbnail: Spell 4_gold_red.gif)
- Shadow combat_vfx_ready remains FALSE — Frostwindz is UI-only; tendril/creep PREFER geometries still absent
- Earth stone-VFX fallback is functional for Phase-1 P1 ship (graceful degradation)

**TODO(drax): Frostwindz Deathbringer** — do NOT wire to in-combat VFX. Register CONFIRMED retro-pixel. UI thumbnails only. Explicit gandalf exception required to override DECISION [2026-05-18 00:00Z]. Guard in metadata.json AND vfx-manifest.json shadow.supplementary_packs.

### D19 Sub-phase A: chierit extraction + vfx-manifest.json + MIGRATION.md (completed 2026-05-18)

**Hive-mode D19 Sub-phase A.** Deliverable 19 VFX library extension — Sub-phase A.
**Tag:** `drax/v0.23-d19-sub-phase-a-chierit-extraction-manifest-1`
**Loadout commit:** `f659c90` (MIGRATION.md + data/vfx-manifest.json)
**Demo commit:** `c5d8a40` (public/assets/chierit/ — 4,211 files, 10 character packs)
**Hive log entries:** STATE start, milestone x2, HANDOFF to jack-ryan (WP-4a close), QUESTION to star-lord

**What shipped:**

1. **Chierit extraction** (`reincarnated-demo/public/assets/chierit/`):
   - 10 ZIPs extracted from `Elementals_bundle/` to `chierit/<character_slug>/`
   - Path convention: normalized lowercase slug; vendor-original internal structure preserved
   - 3,841 PNGs + 357 GIFs; all 10 packs registered in vfx-manifest.json
   - Source ZIPs retained at `Elementals_bundle/` (originals preserved)

2. **`data/vfx-manifest.json`** — new cross-seam VFX data contract (schema v1.0):
   - 7 substrates: fire/water/earth/wind/lightning/holy/shadow
   - Per-substrate: grouping_label, primary_spell_pack, geometry_animation_map, entity_packs, thumbnail_frame, acquisition_status, combat_vfx_ready
   - geometry_animation_map keys match substrate-identity-declarations geometry_affinities names
   - Frostwindz: register_risk + permitted_uses/denied_uses per gandalf DECISION [2026-05-18 00:00Z]
   - Combat VFX ready: fire/water/earth(stone)/wind/lightning
   - NOT READY: holy (entity-only; no spell VFX), shadow (void_pool only; tendril/creep absent)

3. **`MIGRATION.md`** — new file per jack-ryan WP-4a:
   - First entry: §v1.0-vfx-manifest
   - Full schema documentation + consumer responsibilities per seam
   - geometry_animation_map key constraint documented (load-bearing for D15/D17)
   - Chierit extraction path convention table
   - Frostwindz conditional-accept disposition + TODO(drax) guard
   - Schema evolution notes for Sub-phases B + C

**Smoke results:**
- vfx-manifest.json: parses clean; all 7 substrates; 5 combat-ready; grouping_labels confirmed; Frostwindz risk documented
- loadout build: 687 modules, 0 TS errors (unchanged)
- chierit: 10 directories; 3,841 PNGs + 357 GIFs verified

**Cross-seam observations:**
- Star-lord D15/D17/D22: geometry_animation_map key naming is now committed. QUESTION to star-lord in hive log re: prompt-cipher schema alignment with manifest keys.
- Rocket D17: thumbnail_frame.file paths ready for Court browser substrate thumbnails.
- Jack-ryan WP-4a: MIGRATION.md authored. WP-4a should close.
- TODO(drax): Frostwindz Deathbringer — do NOT wire to in-combat VFX per gandalf DECISION. UI thumbnails only.

### D19-vfx-library-extension-plan (completed 2026-05-17 — PLANNING ONLY; no code changes)

**Hive-mode Track B.** Deliverable 19 VFX library extension — planning phase.
**Planning doc:** `agentic_orchestration/hive-mind/d19-vfx-library-extension-plan.md`
**Hive log entries:** 4 appended (STATE start, STATE complete, OBSERVATION x2, HANDOFF)
**Implementation status:** BLOCKED on Matt vendor acquisitions (CraftPix premium wood-nature + Fellor Crystal + Frostwindz Deathbringer)

**Key findings:**

On-disk VFX inventory (all 7 substrates assessed):
- Fire: ADEQUATE — pimen fire-spell-effect-3 (9 animation groups) + CreativeKind entities + chierit fire_knight ZIP
- Water: ADEQUATE — pimen water-spell-effect-03 (7 groups) + chierit water_priestess ZIP
- Earth: MODERATE GAP — stone adequate; crystal = Fellor pending; biological = CraftPix pending
- Wind: ADEQUATE — pimen wind-spell-effect-03 (12 groups, richest pack) + chierit ZIP
- Lightning: STRONG — pimen thunder-spell-effect-03 (~30 blur/no-blur variants) + CreativeKind Lightning x2 VFX + God_of_Lightning x2 + Lich lightning + chierit lightning_ronin ZIP
- Holy: SIGNIFICANT GAP — entity sprites only (Angel_Guardian, Angel_Mage, angel_v1; chierit light_valkyrie ZIP); ZERO holy spell VFX on-disk
- Shadow: PARTIAL — Dark_Hole VFX + entity sprites; tendril/drain geometry absent; Frostwindz Deathbringer pending with RETRO register RISK

**Critical observations:**
1. Frostwindz Deathbringer is likely RETRO-pixel (not HD-2D-conformant); wiring to combat VFX requires gandalf register exception — documented in plan § 2.3 + hive log OBSERVATION
2. Holy spell VFX is NOT covered by Matt's three authorized acquisitions; CreativeKind Holy Spell Effects (~$5-15) needed for holy combat rendering — surfaced as L3 OBSERVATION to knight-rider for Matt routing
3. Lightning is the best-covered new substrate — pimen thunder pack alone provides adequate geometry coverage; no additional acquisition blocking

**Sub-phase A READY (no Matt acquisitions required):**
- Chierit Elementals ZIP extraction (10 ZIPs: fire_knight, water_priestess, ground_monk, crystal_mauler, leaf_ranger, wind_hashashin, lightning_ronin, light_valkyrie, shadow_stalker, metal_bladekeeper)
- Author `reincarnated-demo/public/assets/vfx-manifest.json` per schema in plan § 4.4
- 1-2 day effort; dispatchable by knight-rider now

**VFX manifest schema proposed:** per-substrate JSON with `geometry_animation_map` keyed to substrate-identity-declarations geometry_affinities; `thumbnail_frame` for loadout substrate browser; `acquisition_status` field. Star-lord coordination needed (D17/D22/D15 key naming alignment).

**Effort estimate (implementation phase):** 6-9 days post-acquisitions:
- Sub-phase A: 1-2 days (now)
- Sub-phase B (acquisition intake + register verify): 0.5-1 day when Matt downloads
- Sub-phase C (demo VFX wiring + loadout D21/D22 + element badges): 4-6 days

**No production code modified.** Planning only.
**No tag cut** (doc-only session; no substantive loadout code change to tag per dispatch instruction: "skip tag if doc-only").

### v0.21-form-bias-stage-3-cipher-consumption (completed 2026-05-16)

**Dispatch:** `2026-05-16-drax-form-bias-stage-3-cipher-consumption.md`
**Commit:** `84487ea`
**Tag:** `drax/v0.21-form-bias-stage-3-cipher-consumption`
**Upstream:** `star-lord/v1.3-form-bias-stage-3-cipher-migration @ 19d8ba0`
**MIGRATION.md:** v1.2

**What changed:**

6 LEAK-RISK sites closed. Cipher migration consumption for star-lord Stage 3.

**L-06, L-07 — GearGrid.tsx:**
- Added `resolveGearElementName(item)` helper: `seasonal_dominant_element ?? dominant_element`
- Modal display (L-06) now renders `resolvedElName` (seasonal for v1.5+, canonical for pre-v1.5)
- Card cell display (L-07) now renders `resolvedElName.slice(0,4)` — same resolution
- `seasonal_dominant_element?: string | null` added to `GearPoolEntry` type

**L-12 — Loadout.tsx + Sample.tsx (ElementMappingBadges/ElementMappingRow):**
- Both components now call `buildElementBadgeEntries()` / `buildSampleElementEntries()`
- v1.5+ manifests: iterates `manifest.seasonal_elements` (grouping-layer keyed: ignition/suffusion/bulwark/displacement)
- Pre-v1.5 manifests: falls back to `CANONICAL_ORDER` iteration over `manifest.elements`
- Grouping key shown to player (not the canonical key) — semantic slot label
- Color lookup uses `canonicalKey` from `canonical_slot` (INTERNAL; not rendered as text)
- `assertManifestSeasonalFields(manifest)` called at entry point — field-presence assertion

**L-02 — SkillDetailPanel.tsx + SkillTree.tsx (resolveElementName hardening):**
- Added `resolveSkillElementName(skill, manifest)` in SkillDetailPanel: prefers `skill.seasonal_element` (v1.5+ direct), falls back to `resolveElementDisplay()`
- `resolveElementDisplay(canonical, manifest, context)` in types.ts: checks `seasonal_elements` (canonical_slot match), then `elements`, then warns + returns "Unknown" — never returns raw canonical-four
- Both SkillDetailPanel and SkillTree now use hardened resolver
- `seasonal_element?: string | null` added to `Skill` type

**L-13 — Loadout.tsx + Sample.tsx (dominantElementName):**
- `dominantElementName` now: `classData.seasonal_dominant_element ?? resolveElementDisplay(classData.dominant_element, manifest, ...)`
- Prefer direct field (v1.5+); fall through hardened resolver; never return raw canonical-four
- `seasonal_dominant_element?: string | null` added to `ClassData` type

**L-11 — constants.ts (archetype display labels):**
- Added `resolveArchetypeLabel(archetypeTag, manifest?)` function
- v1.5+ manifests: finds seasonal entry by `canonical_slot`, returns `{seasonalName} {RoleSuffix}` (e.g. "Pressure-Release Mage")
- Pre-v1.5 or non-elemental archetypes: returns static `ARCHETYPE_LABEL` value
- Loadout.tsx + Sample.tsx: all `ARCHETYPE_LABEL[...]` call sites replaced with `resolveArchetypeLabel(...)`. Unused `ARCHETYPE_LABEL` import removed.

**Types.ts additions:**
- `Skill.seasonal_element?: string | null`
- `ClassData.seasonal_dominant_element?: string | null`
- `GearPoolEntry.seasonal_dominant_element?: string | null`
- `SeasonManifest.seasonal_elements?: Record<string, SeasonalElementMapping> | null`
- `SeasonalElementMapping` interface (extends ElementMapping + adds `canonical_slot: string`)
- `assertManifestSeasonalFields(manifest)`: fail-loud WARN for v1.5+ missing seasonal_elements
- `resolveElementDisplay(canonical, manifest, context)`: hardened resolver (WARN + "Unknown" on both-missing)

**Test file written:** `src/__tests__/cipher-no-leak.test.ts` — 18 drax-side cipher guard tests.
BLOCKED on vitest devDependency (jack-ryan approval required before adding).
Type-level correctness enforced via `tsc -b` (0 errors).

**Smoke results:**
- All pre-v1.5 season manifests (v1.2 season_001001, v1.3 season_002328): 0 canonical-four leaks via resolveElementDisplay (fire→pitch/lantern, water→brine, earth→basalt/bone, wind→thrum/miasma)
- Simulated v1.5 fixture: fire→Pressure-Release, wind→Veil, water→Churn, earth→Grit (all via seasonal_elements)
- Gear items (74/200 with element): pre-v1.5 fallback shows canonical-four — EXPECTED for pre-Stage-3 season data. Will resolve to seasonal names when v1.5 export ships.
- Build: clean (687 modules, 0 TS errors)

**Known follow-on (NOT in this dispatch scope):**
- `reincarnated-demo/src/ui/classSelector.ts:147` — `cls.dominant_element` rendered as player-visible text (discovered during audit; outside the 6 enumerated L-sites). Track as demo-side LEAK-RISK for next cipher dispatch.
- Loadout vitest gap — add to jack-ryan approval queue when sequencing allows.
- v1.5 season data not yet exported — star-lord Stage 3 shipped code but no regen yet. Gear items will show canonical-four until a v1.5 season export replaces season_002328 data.

**Spirit Guide voice audio unblocked:** YES — all 6 player-visible canonical-four LEAK-RISK sites on the loadout app are closed. gandalf audio framework dependency D2 is satisfied.

**Build:** Clean (0 TS errors, 687 modules)
**Tag:** `drax/v0.21-form-bias-stage-3-cipher-consumption` (commit 84487ea) — intermediate

### v0.8-gear-wiring (completed, this session)

1. **Gear tab wired** — `Loadout.tsx` now imports `gear_pool.json` from `season_002328`, calls `synthesizeSampleLoadout(classData, gearPool)` via `useMemo` (re-runs on class change), and passes `mode="sample"` + `synthesized={synthesizedGear}` to `<GearGrid />`. Same fit-score formula as `Sample.tsx`: fit = (energy_type × range_profile × role_orientation)^(1/3).

2. **`data/telemetry.db` gitignored** — added `data/telemetry.db` to `.gitignore`. Large local data file, not for VCS.

**Build:** Clean (0 TS errors, 686 modules)
**Tag:** `drax/v0.8-gear-wiring` (commit fe8b810) — intermediate
**Preview:** https://reincarnated-loadout-g3v3ffhry-matthew-wetmore-s-projects.vercel.app

---

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

### v0.7-encounter-analytics (completed, this session)

**Multi-dimensional centroid + stdev-ellipse encounter analytics:**

- `data/encounter_analytics.json` — pre-computed fight aggregates from season_001005 (11 classes, 22 encounter slots, 230 (class × monster) pairs)
  - Generated via `/tmp/gen_encounter_analytics.py` querying `data/telemetry.db`
  - Tier-1 columns (duration_seconds, a_heals_received, a_potions_used) are NULL for all existing rows — marked tier1_populated: false
  - Geometry mix per class computed from abilities table (AOE / single / buff percentages)
  - Win rate and stdev(damage) per (class, monster) pair

- `src/hooks/useEncounterAnalytics.ts` — typed hook; global damage extent; by-slot index
- `src/pages/Encounters.tsx` — full v0.7 replacement of v0.6 static SVG:
  - **View 1** (default): per-class small multiples, one point per encounter slot
  - **View 2**: per-encounter-slot small multiples, one point per class
  - SVG scatter plots: centroid dot + stdev ellipse per (class × encounter-slot) pair
  - Projection: Damage Dealt × Win Rate (Tier-1 pending; TODO switches to Damage × TTK once gamora Option 2 regen ships)
  - Divergence ceiling: WR < 25% flagged red ⚑ (Lock 2 threshold)
  - View A interpretation callout (locked 2026-05-16 per decisions-log)
  - No new npm dependencies — pure React + SVG

**v0.6 promote-or-retire decision:** Option (a) — rolled v0.6 into v0.7; v0.6 intermediate tag `drax/v0.6-encounter-viz` retained as history; v0.7 gets the milestone tag (pending Matt).

**Tag:** `drax/v0.7-encounter-analytics` (commit 1949def) — intermediate
**Preview:** https://reincarnated-loadout-fqcfcam6s-matthew-wetmore-s-projects.vercel.app

### v0.7.1-skill-gate-fix (completed, this session)

1. **Skill gate bug (FIXED)** — `unlockRules.ts`: `spInTiersBelow` and `isTierUnlocked` now accept optional `chainId` parameter. `canInvest` uses `skill.chain_id` so each chain's T2/T3/T4 unlocks independently based only on that chain's lower-tier SP. `SkillTree.tsx`: `getNodeState` passes `skill.chain_id`; row-level locked overlay only shows when ALL chains in that tier are locked. `useSkillBuild.ts`: signature updated to `(tier, chainId?) => boolean`.

2. **StatRadarChart domain (FIXED)** — domain expanded from `[0, 50]` to `[0, 70]`. Empirical check: INT/WIS peak at 61.5%, DEX at 60.4%, STR at 54.1%. 50 was clipping real data.

3. **SkillTierChart experimental (VERIFIED)** — `class_0010` (experimental, Yomi) has `tier: null` on all skills, `chain_id: 'flat'` (flat non-tiered structure by design). Correctly excluded by existing `firstTier == null` guard. Caption updated to acknowledge this.

4. **encounter_analytics.json note updated** — reflects gamora Option 2 regen complete (10/10 converged, 849s, 2026-05-16). Tier-1 column coverage assessed: `duration_seconds` only 3.4% of rows (52,800/1,541,700), sparse and uneven (only first 6 balance iterations). Projection stays Damage×WR; `tier1_populated` stays `false`.

**Preview:** https://reincarnated-loadout-odfuct08x-matthew-wetmore-s-projects.vercel.app
**Tag:** `drax/v0.7.1-skill-gate-fix` (commit 68dfceb) — intermediate

### v0.7-encounter-analytics-legends (completed, this session)

All 6 surfaces from dispatch `2026-05-16-drax-encounters-page-explanatory-content.md`:

1. **Surface 1** — `AxisLegend` component: compact strip above each card grid; X/Y axis meanings + ellipse semantics (σ(damage) width, √(WR×(1-WR)) height)
2. **Surface 2** — Sticky view toggle + color legend block (`sticky top-0 z-10 bg-gray-950`); legend reactively switches between encounter-type colors (per-class view) and class colors (per-slot view); subline text makes the semantic change explicit
3. **Surface 3** — `<details open>` "How to read this" panel at page top (6-item structured guide: what/data/good/bad/caveats/analytic-frame); cross-references the View A callout as the analytic frame
4. **Surface 4** — AOE % roster range note above per-class grid (18%–54% for season_001005; verified from encounter_analytics.json)
5. **Surface 5** — View-toggle sublines that update on toggle, calling out color semantics switch
6. **Surface 6** — Tier-1 pending note expanded to full paragraph with "prefer Win Rate as primary signal" guidance

**Build:** Clean (0 TS errors, 686 modules)
**Tag:** `drax/v0.7-encounter-analytics-legends` (commit 3f2fca6) — intermediate
**Preview:** https://reincarnated-loadout-1tj6lewiv-matthew-wetmore-s-projects.vercel.app

### Cycle 11 M4 — attribute_coupling field NOT PRESENT (escalation, 2026-05-25)

**Dispatch:** `agentic_orchestration/dispatches/2026-05-25-drax-cycle-11-m4-attribute-coupling-labels.md`
**Status:** ESCALATED TO KR — field not present in class JSON; merges into star-lord schema extensions dispatch

**Pre-implementation verification result:**
- Searched `attribute_coupling` across all 11 seasons in `reincarnated-loadout/data/` — ZERO matches
- Searched across `reincarnated-engine/` source — ZERO matches
- `ClassData` interface in `src/data/types.ts` — no `attribute_coupling` field
- Sampled class JSON keys from seasons 001001, 001005, 002015, 002328 — field absent in all
- Class JSON top-level keys are: `id`, `name`, `title_completion`, `flavor_text`, `archetype_tag`, `energy_type`, `role_orientation`, `range_profile`, `dominant_element`, `color_palette`, `stat_distribution`, `skills`, `balance_metadata`, `convergence_report` (plus per-season additive fields)

**Conclusion:** drax memo § 4.3 claim "data already present / no schema change needed" was incorrect.
M4 is NOT zero-dependency. It requires star-lord schema extension to emit `attribute_coupling` from the engine.

**Action taken:** NO implementation fired. Per dispatch protocol, escalated to KR for routing to star-lord schema extensions dispatch. Completion record appended to dispatch file.

**No code changed. No tag cut.**

---

## Next session pick-up

**Cycle 11 COMPLETE (Wave 3b done). Cycle 12 open. Next loadout-seam tasks:**

Priority 0 (COMPLETE — Cycle 11 Wave 3b):
- **M3+M6 T4 alteration display:** T4AlterationPanel + T4ComparisonPanel. Tag: `drax/v0.1-cycle-11-m3-m6-t4-display-wave-3b-2026-05-25`
- Preview: https://reincarnated-loadout-bc7s9pqpu-matthew-wetmore-s-projects.vercel.app

Priority 0 (COMPLETE — Cycle 11 Wave 3a):
- **M4 attribute coupling labels:** StatsPanel `Coupled: INT + WIS` display. Tag: `drax/v0.0-cycle-11-m4-attribute-coupling-labels-2026-05-25-refire`

Priority 0 (COMPLETE — Cycle 11 Wave 2):
- **M1/M2/M5 loadout display:** WeaponSlot + OffHandSlot + ProvenanceBadge. Tag: `drax/v0.1-cycle-11-m1-m2-m5-loadout-display-2026-05-25`

Priority 0 (COMPLETE — Phase-1 P1 prior wave):
- **v1.1 website refresh:** 10 new seasons exposed (001005 + 002011-002015), analytics refreshed, season pickers live. Tag: `drax/v1.1-loadout-website-refresh-new-seasons-and-analytics-1`

Priority 1 (READY — D17 Court browser COMPLETE):
- **D17 Court browser: COMPLETE** (tag: `drax/v1.0-d17-court-browser-surface-1`)
- **BLOCKED on rocket:** Court browser is live but shows empty state until rocket ships `export_json()`.
  See MIGRATION.md §v1.2 QUESTION entry. When rocket HANDOFF confirms, replace
  `public/data/court.json` bootstrap with a real export to verify full render path.

Priority 2 (D19 Sub-phase C — next loadout work):
- **D19 Sub-phase C:** Demo VFX wiring (element-keyed routing + geometry-affinity dispatch) + loadout D21 substrate browser + D22 embodiment display + element badges for lightning/holy/shadow
  - Holy wiring UNBLOCKED (CreativeKind Holy Spell Effects on-disk; geometry_animation_map complete)
  - Lightning wiring UNBLOCKED (pimen thunder pack + CreativeKind lightning on-disk; geometry_animation_map complete)
  - Shadow PARTIAL (void_pool only; tendril/creep still gap)
  - Earth stone-VFX fallback available (CraftPix/Fellor deferred to Phase-2)

Priority 3 (Phase-2 followup — DO NOT start in Phase-1 P1):
- CraftPix Premium wood-nature acquisition (earth biological-organic VFX)
- Fellor Crystal Gem acquisition (earth crystal-gem VFX)
- CreativeKind shadow-tendril acquisition (shadow tendril/creep VFX) — not yet authorized

**Cross-seam dependencies to watch:**
- Star-lord D17/D22/D15 manifest schema key naming (QUESTION in hive log line 3382 — coordinate before Sub-phase C VFX wiring)
- Rocket D1 SubstrateIdentity loader (unblocks D22 embodiment display substrate identity consumption)
- Jack-ryan WP-4a: should close with §v1.1 MIGRATION.md entry

**TODO(drax): Frostwindz Deathbringer** — do NOT wire to in-combat VFX. Register CONFIRMED retro-pixel. UI thumbnails ONLY. Guard in both metadata.json and vfx-manifest.json. Explicit gandalf exception required to override DECISION [2026-05-18 00:00Z].

**Outstanding pre-hive open items (unchanged from v0.21):**

### Milestone tag: v0.8-gear-wiring (2026-05-16, Pattern A subagent)

- Matt approved at 2026-05-16 Day 4 mid-session (reviewed preview at https://reincarnated-loadout-g3v3ffhry-matthew-wetmore-s-projects.vercel.app)
- Milestone tag `v0.8-gear-wiring` cut at commit `fe8b810` (the actual feature commit Matt reviewed) and pushed to origin
- **Anomaly noted:** intermediate tag `drax/v0.8-gear-wiring` sits at `72bc4e9` (the subsequent AGENT_STATE update commit), one commit ahead of `fe8b810`. The dispatch specified `fe8b810` as the target — milestone tag placed there as instructed. The two tags do not point to the same commit (unlike v0.7.1 where both tags matched). Raised here for knight-rider awareness; no action taken beyond following dispatch instructions.

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

✓ TypeScript: `npm run build` — clean (0 errors), 686 modules
✓ Build: dist/ produced, gzip sizes nominal
✓ Vercel preview: READY (68dfceb) — https://reincarnated-loadout-odfuct08x-matthew-wetmore-s-projects.vercel.app
✓ Tags on main: `drax/v0.5.1-bug-fixes`, `drax/v0.6.5-analytics-tier3`, `drax/v0.5.2-stats-and-slot`, `drax/v0.7-encounter-analytics`, `drax/v0.7.1-skill-gate-fix`, `v0.7.1-skill-gate-fix` (milestone, pushed 2026-05-16)

## Repo state (set by star-lord 2026-05-16)

- **Remote:** `https://github.com/mwetmor/reincarnated-loadout.git` — configured and verified
- **main:** up to date with `origin/main` (371493d)
- **Tags:** 21 local / 21 remote — fully synced (`git push origin --tags` complete)
- **Untracked `data/telemetry.db`** — present in working tree; not committed and not in .gitignore. Flag for drax: confirm whether this is intentional (local-only data file) or whether it should be gitignored.
