# Pimen VFX Integration Friction Findings
## drax dispatch: 2026-05-16-drax-pimen-first-vfx-integration (VS2a Step 2)
## Date: 2026-05-16

---

## 1. Pack selection — 5-pack proof-of-concept subset

| # | Pack slug | Element | Scene moment | Cost | rb | Notes |
|---|---|---|---|---|---|---|
| 1 | `fire-spell-effect-3` | fire | fire_mage / fire_controller primary skill cast | $3 | retro | CAUTION: resolution_band=retro (see §3) |
| 2 | `water-spell-effect-03` | water | water_mage / water_controller primary cast | $3 | hd2d-pixel | Cleanest register confidence |
| 3 | `ice-spell-effect-02` | ice/water | water archetype aura + freeze ailment visuals | $4.99 | hd2d-pixel | Spritesheet pack — Stage 2 pass-through |
| 4 | `wind-spell-effect-03` | wind | wind_caster / wind_controller primary cast | $3 | retro | CAUTION: resolution_band=retro (see §3) |
| 5 | `explosion-effect` | multi | ground_slam + area attacks (circle geometry) | $3.40 | hd2d-pixel | Has aseprite source — best metadata quality |

**Selection rationale:**
- Classical-element coverage: fire, water, wind confirmed. Ice = water sub-element (no dedicated ice
  class in engine output). Earth is NOT covered in this 5-pack subset — `earth-spell-effect-03` has
  `requires-visual-inspection` flag (unknown resolution_band) and includes an enemy character split.
  Earth routes to Super Pixel Effects fallback for VS2a.
- VFX slot-type coverage: cast-impact (fire/water/wind), aura (ice/wind), ground-slam (explosion).
  Projectile slot not Pimen-covered in this subset — routes to Super Pixel Effects arrow/projectile.
- Register compliance: all 5 have `derived_register=hand-drawn-pixel` per elrond's R5 cascade.
  Two packs (fire-spell-effect-3, wind-spell-effect-03) have `resolution_band=retro` alongside the
  hand-drawn-pixel derived_register — a friction finding (§3 below).

---

## 2. Ingest pipeline integration

### End-to-end path
```
pimen-catalogue-curated-2026-05-16.jsonl   (elrond; read-only)
         ↓
Stage 1 (stage1_unpack.py)    → public/assets/pimen/<slug>/raw/
Stage 2 (stage2_assemble.py)  → public/assets/pimen/<slug>/sheets/<anim>.png
Stage 3 (stage3_metadata.py)  → public/assets/pimen/<slug>/metadata.json
         ↓
pimenVfx.ts → fetch metadata.json → Pixi.js Texture.from(sheets/<anim>.png)
```

### Pre-acquisition state
No actual Pimen archives on disk. The integration is wired end-to-end:
- Synthetic `metadata.json` stubs placed at each pack's output path (match Stage 3 schema).
- `pimenVfx.ts` fetches metadata.json via HTTP on gauntlet start (`prewarmPimenVfxCache`).
- If assets are present, Pixi.js loads the sheet and slices frames per canvas dimensions.
- If assets are absent (pre-acquisition), `spawnPimenVfx()` returns false — caller falls through to
  Super Pixel Effects (existing behavior preserved; no regression).

### Verified pipeline confidence levels by pack

| Pack | Stage 1 | Stage 2 | Stage 3 | Notes |
|---|---|---|---|---|
| `fire-spell-effect-3` | RAR → unar | individual-frames → assemble | measure canvas | Low friction |
| `water-spell-effect-03` | RAR → unar | individual-frames → assemble | measure canvas | Lowest friction; hd2d-pixel rb |
| `ice-spell-effect-02` | RAR → unar | **spritesheet pass-through** | requires_frame_inspection=true | Frame dims NOT auto-measurable; see §4 |
| `wind-spell-effect-03` | RAR → unar | individual-frames → assemble | measure canvas | Low friction |
| `explosion-effect` | RAR/ZIP → unar | spritesheet pass-through | **aseprite source** → best metadata | See §4 |

---

## 3. Register friction — retro resolution_band vs hand-drawn-pixel derived_register

**Finding:** `fire-spell-effect-3` and `wind-spell-effect-03` have:
- `derived_register = hand-drawn-pixel` (R5 cascade positive-tag signal from JRPG + action-rpg + handmade tags)
- `resolution_band = retro` (Legolas-inferred from preview; signals lower resolution)

This is the curation log's R5 cascade rule 1 (positive hand-drawn-pixel tag wins) overriding rule 2
(retro tag + retro band → retro-16bit). The positive tag came first in priority order.

**Risk:** "retro" resolution_band means these packs may render at a noticeably lower pixel density than
the demo's locked HD-2D register. The style-register.md lock is explicit: "Retro / 16-bit pixel-art
register [is] not canonical."

**Mitigation for VS2a (ad-hoc):** both packs are included with TODO(drax) annotations in pimenVfx.ts.
Post-acquisition visual inspection resolves this definitively. If either pack fails the HD-2D
register eyeball test, remove it from `ELEMENT_SLOT_MAP` in pimenVfx.ts — wind/fire routes back to
Super Pixel Effects with no other code change.

**Recommendation for elrond:** fire-spell-effect-3 and wind-spell-effect-03 are high-priority items
for the visual-inspection queue drain (currently 21 rows in catalogue.db with `manual_review_queued=1`).
The register_band conflict is the specific friction. If Matt acquires either as part of the 5-pack set,
drax should run the inspection immediately.

---

## 4. Spritesheet pass-through friction — canvas dimension measurement

**Finding:** `ice-spell-effect-02` and `explosion-effect` are `file_format=png-spritesheet` packs.
Stage 2 passes the sheet through unchanged. Stage 3's canvas-dimension measurement logic for
spritesheet packs sets `requires_frame_inspection=true` because the sheet may use variable spacing,
padding, or multiple animation rows.

**Consequence:** For spritesheet packs, the synthetic metadata stubs embed assumed canvas dimensions
(100×100 for ice, 128×128 for explosion). These assumptions will be WRONG if the actual pack uses
different dimensions — Pixi.js will slice incorrectly, producing garbled frames.

**Mitigation for VS2a (ad-hoc):**
1. Synthetic stubs include `"requires_frame_inspection": true` in the animation record.
2. When real packs are acquired, `pimenVfx.ts`'s `loadPimenMetadata()` replaces synthetic stubs with
   Stage 3 live output. Stage 3's measurement (`PIL.Image.size / cols`) gives exact canvas dimensions.
3. For `explosion-effect` (has aseprite source): Stage 3 should add an aseprite CLI export step to
   get exact frame dims from the source file. Currently Stage 3 uses PIL measurement as primary.

**Recommendation for elrond + knight-rider dispatch:** Stage 3 needs explicit per-animation canvas
dimension measurement for spritesheet pass-throughs. The current Stage 3 leaves this as
`requires_frame_inspection=true` with user-supplied dims. A future Stage 3 extension (aseprite CLI
parse OR pixi-atlas parse OR visual inspection pass) would close this gap for spritesheet packs.
This is a MEDIUM priority friction item for the VS2b attribution-pipeline dispatch.

**Recommendation for gandalf+drax VFX scene-needs spec:** when spec authoring begins,
document per-pack expected canvas dimensions as a first-class spec field, not just animation
slot-type. This prevents synthetic stub dimension drift.

---

## 5. Element gap — earth not covered in 5-pack subset

`earth-spell-effect-03` was excluded from the 5-pack subset due to:
1. `requires-visual-inspection` flag (unknown resolution_band)
2. Category split (pack includes Earth Elemental enemy character alongside VFX)
3. Embodiment tag `pending-amendment` on the enemy sister row — unclear if purchasing grants
   the enemy sprite vs just the VFX

**VS2a behavior:** earth element routes to Super Pixel Effects (`circle` / `ground_slam` geometry →
`symmetrical_explosion_001` / `epic_explosion_001`). No Pimen-earth VFX in this integration.

**Recommendation for downstream elrond pack selection:** earth element requires either:
(a) earth-spell-effect-03 post-acquisition visual inspection (confirm rb; resolve enemy-half embodiment)
(b) A different earth-only pack if one exists in the full catalogue (legolas crawl for earth-only vendors)
Earth is a classical-element cipher anchor (Outcome 2) — its VFX gap in the Pimen subset is notable.

---

## 6. Attribution pipeline friction (Step 2 ad-hoc vs Step 3 formalized)

The current integration uses an ad-hoc element → pack slug mapping in `pimenVfx.ts`.
The mapping is:
```
element + geometry → ELEMENT_SLOT_MAP → metaKey → PimenAnimSlot → Pixi.js Texture
```

**Friction surfaced:** the "attribution" step (which pack renders which scene moment) is:
- Hard-coded in pimenVfx.ts (not driven by catalogue metadata)
- Per-element, not per-substrate (the catalogue uses substrate vocabulary; the engine emits element)
- Not connected to the engine's skill geometry metadata (we read `geometry` from the demo's VFX
  dispatch, which itself comes from the engine's skill geometry field)

**Recommendation for VS2b attribution-pipeline dispatch:**
The formalized pipeline (Step 3 of 4-step plan) should define a build-time mapping from:
  `engine skill geometry + element` → `catalogue substrate tag` → `Pimen pack slug + anim name`
This eliminates the hard-coded element_slot_map in pimenVfx.ts and makes pack substitution
(e.g., swapping fire-spell-effect-3 for a higher-quality fire pack) a data change, not a code change.

---

## 7. Metadata loading friction

**Finding:** `pimenVfx.ts` loads metadata.json via HTTP fetch on prewarm. If the metadata.json
fetch returns non-200 (no assets yet), it silently falls back to synthetic stubs. If metadata.json
is malformed, the fetch resolves but `loadPimenMetadata()` throws in the JSON parse step.

**Current protection:** `loadPimenMetadata()` has a `catch {}` that returns null on any error.
The synthetic stubs are pre-seeded before fetch attempts. So malformed JSON simply means the
synthetic stub is used — no crash, no missing slot.

**Recommendation for VS2b:** add a schema validation step in `loadPimenMetadata()` (zod or
manual field check) to surface malformed metadata.json as a named warning rather than silent
synthetic-stub fallback. This avoids "invisible" pipeline regressions where Stage 3 produces
a bad JSON but the demo silently uses stubs.

---

## 8. Per-scene attribution mapping (demo render moments)

| Pack | Scene moment | Demo archetype | Geometry trigger |
|---|---|---|---|
| fire-spell-effect-3 | fire_mage primary skill impact | fire_mage, fire_controller | single_target, projectile (at impact) |
| water-spell-effect-03 | water_mage primary skill impact | water_mage, water_controller | single_target, projectile |
| ice-spell-effect-02 | water archetype aura / secondary | water_mage, water_controller | self_buff, aura, self_cast |
| wind-spell-effect-03 | wind_caster primary skill | wind_caster, wind_controller | single_target, cone, line |
| explosion-effect | area attacks across elements | fire_controller, earth_caster, any boss | ground_slam, circle, ground_targeted_circle |

---

## 9. Smoke-test result

`npm run build` — PASS (TypeScript clean, Vite build 10.96s, 0 type errors).
Demo does not regress: `spawnPimenVfx()` returns false pre-acquisition → Super Pixel Effects
fallback fires → existing behavior preserved. No console errors on render.

---

## 10. Recommendations for downstream elrond Pimen subset selection dispatch

1. **Prioritize earth element coverage** — visual-inspection queue drain on earth-spell-effect-03
   (confirm rb; resolve enemy-half embodiment). Earth is a cipher anchor without Pimen coverage.
2. **Resolve retro-rb fire + wind** — fire-spell-effect-3 and wind-spell-effect-03 are registered
   hand-drawn-pixel but have retro rb tag. Post-acquisition inspection is the resolution.
3. **Expand to 10 packs for VS2a full coverage:** the 5-pack subset is proof-of-concept only.
   Full VS2a season coverage needs at minimum: earth (currently missing), dark/holy (encounter
   boss visual vocabulary), plus 1-2 impact VFX for melee geometry (currently Super Pixel Effects).
4. **Bundle cost-coverage analysis:** mega-pack-elemental-spell-effects-01 ($12.75) covers 9 packs
   including all 5 in this subset (minus explosion-effect) at a 63% discount. If Matt authorizes
   acquisition, the bundle is the most efficient path for the 5-pack subset + earth coverage.

---

## 11. Recommendations for downstream gandalf+drax VFX scene-needs spec dispatch

1. **Per-canvas dimension spec field:** each VFX slot-type should specify expected canvas dimensions
   (or a range). Current approach leaves this to post-acquisition measurement.
2. **Sub-decision A1 confirmed safe:** canonical-four element vocabulary (fire/water/earth/wind)
   drives the pack selection without conflict. The 5-pack subset maps cleanly to canonical-four.
3. **Aura slot confirmed independent need:** `ice-spell-effect-02` is used as aura (not cast-impact)
   for the water archetype — this validates the dispatch's 3 VFX slot-types (cast-impact /
   aura / ground-slam) as the minimum viable VS2a set. Projectile is satisfied by Super Pixel Effects
   until a Pimen projectile pack is selected (Battle VFX: Hit Spark or Slashes and Thrusts).
4. **Explosion as cross-element utility:** `explosion-effect` functions as a cross-element area
   pack. This pattern (one multi-element pack per area slot-type) is efficient — recommend the
   VFX scene-needs spec account for cross-element utility packs explicitly.

---

— drax, 2026-05-16
