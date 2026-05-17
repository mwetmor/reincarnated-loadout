# MIGRATION — reincarnated-loadout seam schema changes

Cross-seam schema changes per ADR-004. Each entry documents new data contracts, file paths,
consumer responsibilities, and downstream seams that must update their readers.

**Scope:** reincarnated-loadout seam. Loadout app consumes engine output (star-lord exports +
telemetry queries) as read-only data. New data contracts authored by drax-loadout are cross-seam
contracts that star-lord, rocket, or future demo consumers may need to read.

---

## [2026-05-18] §v1.0-vfx-manifest — VFX manifest schema definition (Phase-1 P1 D19 Sub-phase A)

**Author:** drax-loadout
**Phase-1 P1 Deliverable:** D19 Sub-phase A — chierit ZIP extraction + vfx-manifest.json authoring
**Hive log ref:** `agentic_orchestration/hive-mind/phase-1-p1-log.md` [STATE 2026-05-18 Sub-phase A]
**Tag:** `drax/v0.23-d19-sub-phase-a-chierit-extraction-manifest-1`
**Closes:** jack-ryan WP-4a (MIGRATION.md absent from loadout seam)
**Cross-seam consumers:** star-lord D15 (LLM flavor VFX register awareness), rocket D17 (Court browser visual signature display), drax D22 (embodiment display), drax D21 (substrate browser thumbnails)

### What changed

#### vfx-manifest.json — new cross-seam VFX data contract

**File:** `reincarnated-loadout/data/vfx-manifest.json`
**Schema version:** 1.0
**Authority:** drax-loadout (Phase-1 P1 D19 Sub-phase A, in-seam L1 decision per hive-mode)

This is a NEW canonical data contract (Discipline #12 — semantic shift: introducing
vfx-manifest.json as the substrate-VFX-coherence pillar made explicit — Discipline #13).

The manifest is extensible by design (Discipline-candidate #16 layer-extensibility-judged-at-perimeter):
new substrates (e.g., poison/acid Phase-1 P2 candidate) require only a new entry in the
`substrates` dict. No source-code changes in consumer seams for substrate additions.

#### Top-level structure

```json
{
  "schema_version": "1.0",
  "authored": "2026-05-18",
  "authority": "drax-loadout",
  "substrates": {
    "<substrate_name>": { ... }
  }
}
```

#### Per-substrate entry schema

```json
{
  "canonical_name": "<fire|water|earth|wind|lightning|holy|shadow>",
  "grouping_label": "<ignition|suffusion|bulwark|displacement|resonance|radiance|penumbra>",
  "primary_spell_pack": {
    "pack_slug": "<vendor>-<pack-name>",
    "pack_name": "<human-readable>",
    "vendor": "<pimen|CreativeKind|chierit|craftpix|fellor|frostwindz>",
    "path": "<relative path from demo/public/assets/>",
    "derived_register": "<hand-drawn-pixel|retro-pixel|unknown>",
    "register_verified": true,
    "license": "<commercial-royalty-free|commercial-use-permitted>",
    "attribution_required": false
  },
  "supplementary_packs": [
    {
      "pack_slug": "<string>",
      "sub_register": "<string>",
      "acquisition_status": "<on-disk|pending-matt|catalogue-only>",
      "register_risk": "<optional — present when Frostwindz or register-unknown pack>",
      "permitted_uses": ["<substrate-browser-thumbnail|in-combat-vfx|...>"],
      "denied_uses": ["<in-combat-vfx|...>"]
    }
  ],
  "geometry_animation_map": {
    "<geometry_type>": {
      "pack": "<pack_slug>",
      "animation_dir": "<path from demo/public/assets/>",
      "affinity": "<PREFER|NEUTRAL|AVOID>",
      "notes": "<optional>"
    }
  },
  "entity_packs": [
    {
      "pack_slug": "<chierit-<character>>",
      "character": "<character_slug>",
      "path": "<chierit/<character>>",
      "derived_register": "hand-drawn-pixel",
      "register_verified": true,
      "extraction_status": "<extracted|unextracted>",
      "extraction_date": "<YYYY-MM-DD>",
      "png_count": 0,
      "gif_count": 0,
      "animation_groups": ["<group_slug>", "..."],
      "license": "commercial-use-permitted",
      "attribution_required": false
    }
  ],
  "thumbnail_frame": {
    "source": "<chierit/<character>|pimen/...>",
    "file": "<relative path>",
    "notes": "<human note>"
  },
  "acquisition_status": "<on-disk|partial-on-disk|pending-matt|entity-only-on-disk|catalogue-only>",
  "combat_vfx_ready": true,
  "combat_vfx_notes": "<optional — present when combat_vfx_ready is false or partial>"
}
```

#### geometry_animation_map key constraint (LOAD-BEARING)

`geometry_animation_map` keys MUST match `geometry_affinities` field names from
`canonical/story/substrate-identity-declarations-2026-05-17.md` exactly.

The complete set of geometry type keys used in v1.0 manifest:

```
arc, area_sustain, bolt_line, branching, burst, chain_lightning, circle, cone,
creep, ground_targeted_circle, line, melee_arc, nova, pillar, projectile, radiant_aura,
shaft, slam, swirl, tendril, void_pool, vortex_pull, wave
```

This list grows as new substrates are added. All geometry keys must appear in the
substrate-identity-declarations `geometry_affinities` field for the substrate being mapped.
Consumers MUST fail-loud (Pattern P7) on unknown geometry keys.

**Cross-seam coordination:** rocket D1 ships substrate identity loader with geometry_affinities
validated at boot. When rocket D2 Coupling #2 ships (`VALID_SLOTS` registry-driven), the
element/selector.py geometry routing can consume the vfx-manifest `geometry_animation_map`
directly by key name.

#### Chierit extraction path convention (D19 Sub-phase A)

All 10 chierit Elementals packs extracted to:

```
reincarnated-demo/public/assets/chierit/<character_slug>/
```

Character slugs and substrate assignments:

| slug | substrate | sub_register | extraction_date |
|---|---|---|---|
| fire_knight | fire | fire | 2026-05-18 |
| water_priestess | water | water | 2026-05-18 |
| ground_monk | earth | stone | 2026-05-18 |
| crystal_mauler | earth | crystal-gem | 2026-05-18 |
| leaf_ranger | earth | biological-organic | 2026-05-18 |
| metal_bladekeeper | earth | earth-metal | 2026-05-18 |
| wind_hashashin | wind | wind | 2026-05-18 |
| lightning_ronin | lightning | lightning | 2026-05-18 |
| light_valkyrie | holy | holy | 2026-05-18 |
| shadow_stalker | shadow | shadow | 2026-05-18 |

Each extracted directory contains: `png/` (frame-level PNGs per animation), `gifs/` or
`gif_samples/` (preview GIFs per animation), and in some cases `aseprite/` source files.

Source ZIPs retained at `reincarnated-demo/public/assets/Elementals_bundle/` per drax
policy: originals preserved; extractions are derivative.

#### License status (Chierit Elementals bundle)

No license TXT files embedded in any of the 10 ZIPs. Commercial use permitted per itch.io
bundle purchase (Chierit Elementals bundle, verified purchase). Attribution not required.

Commit message attribution: "Chierit Elementals sprites by chierit (itch.io)".

#### acquisition_status values

| value | meaning |
|---|---|
| `on-disk` | Primary VFX pack + entity sprites both extracted and ready |
| `partial-on-disk` | Some VFX on-disk but geometry gaps exist; supplementary packs pending |
| `entity-only-on-disk` | Character sprites available; no spell VFX animations |
| `pending-matt` | Pack authorized; payment/download pending Matt action |
| `catalogue-only` | Pack identified in vendor catalogue; not yet acquired |

#### Frostwindz Deathbringer register disposition

Per gandalf DECISION [2026-05-18 00:00Z], Frostwindz Deathbringer (shadow substrate,
bone/death register) is a CONDITIONAL ACCEPT:

- **PERMITTED:** substrate-browser thumbnail (static UI frame); trial-cinematic redraw source material
- **DENIED:** in-combat VFX; Court portrait full-screen composition

Rationale: Frostwindz is retro-pixel register (per style-register.md § empirical landscape);
mixing retro-pixel VFX with HD-2D character sprites in combat violates the style-coherence lock.

`TODO(drax): Do NOT wire Frostwindz Deathbringer to in-combat VFX without register verification
+ explicit gandalf exception entry overriding the 2026-05-18 00:00Z DECISION.`

#### Combat VFX readiness summary (Sub-phase A state)

| substrate | combat_vfx_ready | notes |
|---|---|---|
| fire | true | pimen + chierit fire_knight |
| water | true | pimen + chierit water_priestess |
| earth | true (partial) | stone sub-register ready; crystal/organic pending acquisitions |
| wind | true | pimen + chierit wind_hashashin |
| lightning | true | pimen thunder pack (richest on-disk; ~30 variants) + chierit lightning_ronin |
| holy | false | entity-only (light_valkyrie); zero spell VFX; acquisition needed |
| shadow | false | void_pool only (Dark_Hole); tendril/creep absent; Frostwindz conditional |

### Downstream consumer responsibilities

#### star-lord (D15 LLM flavor diversifier)

- `vfx-manifest.json` → `substrates.<substrate>.primary_spell_pack.derived_register` informs
  `visual_prompt` LLM generation: do not generate retro-pixel language for HD-2D-registered
  substrates. When `derived_register: null` (holy primary_spell_pack is null), do not generate
  VFX-style `visual_prompt` until acquisition lands.
- `geometry_animation_map` keys are the canonical geometry vocabulary for VFX-register-aware
  LLM prompt building (D15 manifest cipher integration).

#### rocket (D17 Court of Forms browser)

- `thumbnail_frame.file` → static preview frame for Court browser substrate entry.
- `acquisition_status` → show placeholder/pending state for substrates where
  `combat_vfx_ready: false`.
- `grouping_label` → matches D20 grouping-layer-vocabulary.md registry; use as display label.

#### drax (D21 substrate browser + D22 embodiment display)

- D21 substrate browser: consume `thumbnail_frame.file` for per-substrate static preview image.
  No animation playback in loadout context.
- D22 embodiment display: consume `entity_packs[0].path` + `entity_packs[0].animation_groups`
  to reference chierit character sprites per substrate.
- Element badge colors for lightning/holy/shadow: NOT in vfx-manifest.json. Badge color
  decisions live in loadout Tailwind config. Three new colors needed at D21 implementation:
  lightning (electric yellow), holy (radiant gold), shadow (deep purple).

### Schema evolution notes

- When Sub-phase B (Matt acquisitions) lands: update `acquisition_status` fields from
  `pending-matt` to `on-disk`; populate `geometry_animation_map` entries for earth organic +
  crystal (CraftPix/Fellor) and shadow bone-death (Frostwindz — UI-only per gandalf).
- When Sub-phase C (demo VFX wiring) begins: vfx-manifest.json becomes the loadable resource
  for the demo's VFX dispatcher; path convention is `public/assets/vfx-manifest.json` mirrored
  from the loadout-authored canonical.
- Future substrate additions (Phase-1 P2): add a new key to `substrates` dict. No schema
  version bump required for additive additions. Version bump if any existing field
  is renamed or removed.

---

## [2026-05-17] §v1.1-vfx-manifest — VFX manifest schema v1.0 → v1.1 (Phase-1 P1 D19 Sub-phase B-partial)

**Author:** drax-loadout
**Phase-1 P1 Deliverable:** D19 Sub-phase B-partial — Frostwindz Deathbringer + CreativeKind Holy ingestion + CraftPix/Fellor deferral disposition
**Hive log ref:** `agentic_orchestration/hive-mind/phase-1-p1-log.md` [2026-05-17 STATE drax-loadout Sub-phase B-partial]
**Tag:** `drax/v0.24-d19-sub-phase-b-partial-holy-frostwindz-1`
**Predecessor:** §v1.0-vfx-manifest (D19 Sub-phase A, tag `drax/v0.23-d19-sub-phase-a-chierit-extraction-manifest-1`)
**Authority:** Matt L3 disposition 2026-05-17 (CraftPix + Fellor deferred to Phase-2; Frostwindz + CreativeKind Holy on-disk confirmed) + gandalf DECISION [2026-05-18 00:00Z] (Frostwindz register conditional)

### What changed

#### 1. Holy substrate — combat_vfx_ready: false → true (SEMANTIC SHIFT per Discipline #12)

**Change type:** Semantic shift — the holy substrate transitions from entity-only to fully combat-VFX-ready.

The holy L3 VFX gap (the largest VFX gap identified in Sub-phase A) is now CLOSED. Matt delivered CreativeKind Holy Spell Effects on-disk at `reincarnated-demo/public/assets/Holy_Spell_Effects_Creativekind/`.

**Manifest changes:**
- `substrates.holy.primary_spell_pack`: was `null`; now set to `creativekind-holy-spell-effects`
- `substrates.holy.primary_spell_pack.path`: `Holy_Spell_Effects_Creativekind`
- `substrates.holy.primary_spell_pack.derived_register`: `hand-drawn-pixel` (verified: HD-resolution spritesheets, smooth digital painting, CreativeKind vendor-level register confirmed)
- `substrates.holy.geometry_animation_map`: was `{}`; now populated with 8 geometry type mappings
- `substrates.holy.acquisition_status`: `entity-only-on-disk` → `on-disk`
- `substrates.holy.combat_vfx_ready`: `false` → `true`
- `substrates.holy.combat_vfx_notes`: updated to document full coverage
- `substrates.holy.thumbnail_frame`: updated to `Holy_Spell_Effects_Creativekind/Preview/Spell 4_gold_red.gif` (Spell 4 gold_red radiant aura — representative high-energy holy VFX)
- `substrates.holy.supplementary_packs`: CreativeKind Holy promoted to `primary_spell_pack`; pimen-holy-spell-effect remains catalogue-only

**Holy geometry_animation_map — populated entries:**

| geometry_type | affinity | spell | notes |
|---|---|---|---|
| `radiant_aura` | PREFER | Spell 4 (×9 color variants) + Spell 12 | Primary holy geometry; 9 palette options |
| `shaft` | PREFER | Spell 1 (+ blue) + Spell 10 (+ blue) | Vertical pillar of light; two size variants |
| `nova` | PREFER | Spell 2 + Spell 9 + Spell 13 | Three scale variants; Spell 13 = full-screen |
| `ground_targeted_circle` | PREFER | Spell 5 (+ blue) | Consecrate zone placement |
| `area_sustain` | PREFER | Spell 3 + Spell 11 | Sustained holy glow / blessing zone |
| `cone` | NEUTRAL | Spell 8 | Forward cone sweep |
| `burst` | NEUTRAL | Spell 6 (+ blue) | Burst explosion |
| `projectile` | NEUTRAL | Spell 7 (+ blue) | Projectile orb |

All PREFER geometry affinities per § 6 holy covered. All NEUTRAL geometry affinities covered. AVOID geometries (tendril/swirl/chain_lightning) have no entries — correct.

**Register verification:** CreativeKind Holy Spell Effects is HD-2D-conformant. Spritesheets at 1920x160 to 2720x912 px; frame content = smooth hand-drawn digital painting with radiant glow and multi-palette color variants. No retro pixel grid visible. CONFORMANT.

**New metadata.json:** `reincarnated-demo/public/assets/Holy_Spell_Effects_Creativekind/metadata.json` authored (pack_slug, vendor, substrate, geometry coverage assessment, 13 animation entries with geometry_type + affinity mapping).

#### 2. Shadow substrate — Frostwindz Deathbringer ingestion (UI-only conditional)

**Change type:** Additive — new supplementary_packs field additions.

Frostwindz Deathbringer is now on-disk at `reincarnated-demo/public/assets/Deathbringer VFX/`. Per gandalf DECISION [2026-05-18 00:00Z], this pack is a CONDITIONAL ACCEPT.

**Manifest changes (shadow.supplementary_packs[0] — frostwindz-deathbringer):**
- `acquisition_status`: `pending-matt` → `on-disk`
- `path`: `Deathbringer VFX` (Matt's placement path)
- `derived_register`: `16-bit-shaped-pixel` (CONFIRMED retro-pixel by visual inspection)
- `register_verified`: `true`
- `register_risk`: `CONFIRMED-retro-pixel` (field updated from `likely-retro-pixel`)
- `gandalf_decision_ref`: added reference to DECISION [2026-05-18 00:00Z]
- `permitted_uses`: `["ui_thumbnail", "loadout_static", "substrate_browser_thumbnail", "trial_cinematic_redraw_source"]`
- `denied_uses`: `["in_combat_vfx", "court_portrait_full_screen"]`
- `animation_count`: 6, `total_frames`: 99

**Critical constraint — TODO(drax) guard reinforced:**
```
TODO(drax): Do NOT wire Frostwindz Deathbringer to in-combat VFX.
Register CONFIRMED retro-pixel (16-bit-shaped). Explicit gandalf register-exception
required to override DECISION [2026-05-18 00:00Z]. UI-thumbnail ONLY.
```
This guard is present in both vfx-manifest.json AND in the pack's metadata.json.

**Frostwindz does NOT appear in any geometry_animation_map.** Smoke test verified this. In-combat routing is prevented at the data layer (no entry exists to wire from).

**Shadow combat_vfx_ready: remains false** — the Frostwindz addition is supplementary UI-only. Shadow's tendency/creep/drain geometry PREFER affinities are still not covered by HD-2D-conformant VFX. CreativeKind shadow-tendril (catalogue-only) remains the path to full shadow combat readiness.

**New metadata.json:** `reincarnated-demo/public/assets/Deathbringer VFX/metadata.json` authored (pack_slug, license summary from embedded docx, register_verified, permitted_uses/denied_uses, 6 animation slugs with geometry_type and explicit TODO guard).

**License verified:** Frostwindz Asset License Agreement.docx (embedded in pack) — commercial use permitted, no attribution required, no redistribution.

#### 3. Earth substrate — CraftPix + Fellor deferral disposition

**Change type:** Status update — `pending-matt` → `deferred-post-phase-1-p1` for two supplementary packs.

Matt L3 disposition 2026-05-17: CraftPix Premium wood-nature and Fellor Crystal Gem are DEFERRED to Phase-2 post-ship polish. Biological-organic and crystal-gem earth sub-registers ship Phase-1 P1 with stone-VFX fallback (pimen earth-spell-effect-03). This is graceful degradation, not a defect — chierit leaf_ranger + crystal_mauler entity sprites carry sub-register visual identity at character level.

**Manifest changes (earth.supplementary_packs):**
- `craftpix-wood-nature.acquisition_status`: `pending-matt` → `deferred-post-phase-1-p1`
- `craftpix-wood-nature.phase_2_followup`: added (Phase-2 acquisition + fallback documentation)
- `fellor-crystal.acquisition_status`: `pending-matt` → `deferred-post-phase-1-p1`
- `fellor-crystal.phase_2_followup`: added (Phase-2 acquisition + macOS Gatekeeper download note)
- `earth.combat_vfx_notes`: updated to document stone-VFX fallback chain

**Earth combat_vfx_ready: remains true** — stone sub-register (pimen earth-spell-effect-03, 11 animation groups) provides functional combat coverage for Phase-1 P1 ship.

**Phase-2 followup queue (captured in manifest notes):**
1. CraftPix Premium wood-nature acquisition (earth biological-organic VFX) — DEFERRED 2026-05-17 per Matt; revisit after Phase-1 P1 ship
2. Fellor Crystal Gem cluster acquisition (earth crystal-gem VFX) — DEFERRED 2026-05-17 per Matt; download issue likely macOS Gatekeeper quarantine (try Firefox or `xattr -d com.apple.quarantine` on retry)

#### 4. Schema version bump v1.0 → v1.1

**New fields in v1.1:**
- `permitted_uses: [...]` — array of allowed use-contexts for register-gated packs (Frostwindz)
- `denied_uses: [...]` — array of denied use-contexts (Frostwindz in-combat guard)
- `register_risk: "CONFIRMED-retro-pixel"` — replaces `"likely-retro-pixel"` now that visual inspection is complete
- `phase_2_followup: "<string>"` — deferred-acquisition documentation for earth supplementary packs
- `gandalf_decision_ref: "<string>"` — explicit reference to the gandalf DECISION entry governing conditional-accept packs
- `animation_preview: "<path>"` — optional GIF preview path alongside `animation_dir` spritesheet path (holy geometry_animation_map entries)
- `acquisition_status` value additions: `deferred-post-phase-1-p1` (earth supplementary packs)

**Notes field updates:**
- `acquisition_status` values list updated to include `deferred-post-phase-1-p1`
- `permitted_uses` / `denied_uses` / `register_risk` / `phase_2_followup` fields documented in notes
- Previous `TODO(drax): remove acquisition_status:pending-matt entries when Matt downloads CraftPix/Fellor/Frostwindz packs` removed; replaced with Phase-2 TODO for earth supplementary pack revisit

**Schema is backward-compatible** — new fields are additive. Existing v1.0 consumers reading substrates with no new fields are unaffected. `acquisition_status: deferred-post-phase-1-p1` is a new value; consumers that switch on this field need to handle the new value (treat as "not available").

### Downstream consumer responsibilities

#### star-lord (D15 LLM flavor diversifier)

- `substrates.holy.primary_spell_pack.derived_register: "hand-drawn-pixel"` — holy is now HD-2D-conformant; `visual_prompt` LLM generation can now reference radiant/shaft/nova VFX language for holy archetypes. Previously blocked (null primary_spell_pack).
- `substrates.holy.geometry_animation_map` — 8 keys now available. Geometry vocabulary for holy VFX-register-aware prompt building (D15 manifest cipher integration) is now complete.
- No change to star-lord's star-lord D15 already-shipped manifest consumption logic — additive changes only.

#### rocket (D17 Court of Forms browser)

- `substrates.holy.thumbnail_frame.file` → updated to `Holy_Spell_Effects_Creativekind/Preview/Spell 4_gold_red.gif`. Court browser holy thumbnail surface UNBLOCKED.
- `substrates.holy.acquisition_status: "on-disk"` + `combat_vfx_ready: true` → holy placeholder/pending state can be replaced with real thumbnail.
- `substrates.shadow.supplementary_packs[0]` (Frostwindz) → `acquisition_status: "on-disk"`. UI thumbnail use is permitted; shadow browser thumbnail can reference `Deathbringer VFX/VFX 2/gif.gif` as a secondary shadow VFX preview (retro-pixel; acceptable for UI-only context).
- `substrates.earth.supplementary_packs` → two entries now `deferred-post-phase-1-p1`; earth stone-fallback VFX is what surfaces in Court browser earth thumbnail. No Court browser code changes needed.

#### drax (D21 substrate browser + D22 embodiment display)

- D21 substrate browser: holy thumbnail now points to a real holy spell VFX GIF (`Spell 4_gold_red.gif`). Previously pointed to chierit/light_valkyrie entity idle. Update in D21 implementation.
- D22 embodiment display: no change from v1.0 — light_valkyrie still in entity_packs[0] for holy embodiment display.
- D22 QUESTION (carried from Sub-phase A QUESTION entry at hive-log line 3382): star-lord geometry key naming alignment — verify before Sub-phase C demo wiring.
- New `deferred-post-phase-1-p1` acquisition_status value: D21/D22 implementations should treat this like `pending-matt` (not available; fallback to stone VFX for earth sub-registers).

### Combat VFX readiness summary (v1.1 state)

| substrate | combat_vfx_ready | change from v1.0 | notes |
|---|---|---|---|
| fire | true | no change | pimen + chierit fire_knight |
| water | true | no change | pimen + chierit water_priestess |
| earth | true | no change (fallback clarified) | stone sub-register; crystal/organic fallback to stone per Phase-2 deferral |
| wind | true | no change | pimen + chierit wind_hashashin |
| lightning | true | no change | pimen thunder pack + chierit lightning_ronin |
| holy | **true** | **false → true** | CreativeKind Holy Spell Effects on-disk; full geometry coverage |
| shadow | false | no change | void_pool only (Dark_Hole); tendril/creep absent; Frostwindz UI-only |

---

*MIGRATION.md created 2026-05-18. First entry: §v1.0-vfx-manifest (D19 Sub-phase A).*
*Previous sessions (v0.5 through v0.21) did not require a MIGRATION.md entry; the engine's*
*`reincarnated-engine/src/reincarnated/export/MIGRATION.md` was the upstream contract drax consumed.*
*This file is the loadout-seam's outbound contract for data drax authors and cross-seam consumers read.*
