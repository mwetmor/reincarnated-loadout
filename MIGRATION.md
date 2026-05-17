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

*MIGRATION.md created 2026-05-18. First entry: vfx-manifest.json v1.0 (D19 Sub-phase A).*
*Previous sessions (v0.5 through v0.21) did not require a MIGRATION.md entry; the engine's*
*`reincarnated-engine/src/reincarnated/export/MIGRATION.md` was the upstream contract drax consumed.*
*This file is the loadout-seam's outbound contract for data drax authors and cross-seam consumers read.*
