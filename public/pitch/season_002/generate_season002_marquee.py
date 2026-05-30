#!/usr/bin/env python3
"""
Season 002 Marquee Image Generation — cascade-r4-v1-season-002-marquee-reshape
Agent: drax (player-surface seam owner)
Date: 2026-05-30

Generates:
  - 4 faction group portraits (ultra-thematic, dramatic, HD-2D)
    → public/pitch/season_002/factions/{cluster_id}_group.png
  - 12 individual kit portraits (top-3 per faction; cluster-membered kits)
    → public/pitch/season_002/kits/{kit_id}.png

Total: 16 images × $0.04 = $0.64 (within $5 sub-budget; $20 cycle budget)

Season: cycle-14-wave-5-season-002 — "Season of the Ironsoil Wide-Front"
4 Factions:
  Cluster 1: Stormcallers of the Pale Reach (3 members)  — lightning/shadow/fire, ranged, large-AOE
  Cluster 2: Ironsoil Vanguard (9 members)               — physical/earth, melee, large-AOE
  Cluster 3: Gale-Blessed Wardens (13 members)           — wind/holy/water, melee, large-AOE
  Cluster 4: Duskchain Ranging Compact (8 members)       — shadow/physical/lightning, ranged, chain

Style register (locked per canonical/story/style-register.md):
  hand-drawn pixel-art game illustration, HD-2D style — reference Octopath Traveler /
  Triangle Strategy / Eastward / CrossCode art direction; isekai-genre-readable;
  NOT retro pixel-art; pixel-resolution sprites with hand-drawn-illustration sensibility;
  detailed shading and palette work

D7 compliance: all prompts are substrate-filled (no free-form LLM dialogue generation).
"""

import os
import json
import base64
import datetime
from pathlib import Path
from openai import OpenAI

COST_PER_IMAGE = 0.04
TAG = "cascade-r4-v1-season-002-marquee-reshape"
LEDGER_PATH = Path("/Users/admin/Games/reincarnated-loadout/public/pitch/cost-ledger.json")
FACTIONS_OUT = Path("/Users/admin/Games/reincarnated-loadout/public/pitch/season_002/factions")
KITS_OUT = Path("/Users/admin/Games/reincarnated-loadout/public/pitch/season_002/kits")

STYLE_LOCK = (
    "hand-drawn pixel-art game illustration, HD-2D style — reference Octopath Traveler / "
    "Triangle Strategy / Eastward / CrossCode art direction; isekai-genre-readable; "
    "NOT retro pixel-art; pixel-resolution sprites with hand-drawn-illustration sensibility; "
    "detailed shading and palette work"
)

NEGATIVE = (
    "photorealistic, Diablo grimdark painterly, dark concept art, retro 16-bit pixel, "
    "modern anime line-art, cel-shaded, oversaturated, AAA realism, vector art, text overlay, "
    "extra fingers, missing fingers, malformed hands, fused fingers, extra limbs, mutated anatomy"
)

# ─── FACTION GROUP PORTRAIT PROMPTS ─────────────────────────────────────────

FACTION_PROMPTS = [
    {
        "cluster_id": 1,
        "slug": "1_group",
        "out_dir": FACTIONS_OUT,
        "prompt": f"""FACTION GROUP PORTRAIT — Stormcallers of the Pale Reach (Cluster 1)
Season: cycle-14-wave-5-season-002 — Season of the Ironsoil Wide-Front
Style: {STYLE_LOCK}

Ultra-thematic dramatic group composition. Three ranged fighters — the Stormcallers of the Pale Reach — posed against a stormy pale-white sky with distant jagged horizon. Lightning, shadow, and fire arc in equal measure across the wide frame behind them. European medieval aesthetic: cloaks and bracers, no heavy plate — practitioners of distance, not defense. Left figure channels crackling lightning, center casts a wide shadow-veil, right releases a fire arc. All three are mid-action, coats billowing in the wind.

Wide cinematic composition emphasizing the group's "wide-arc elemental devastation" doctrine — three ranged fighters forming a loose triangular stance, distance between them, the arc of destruction spanning the full frame. Color palette: pale-white sky, lightning-gold, fire-orange, deep-shadow violet. Dramatic atmospheric lighting from storm front above. Heroic isekai visual register.

{STYLE_LOCK}. No UI elements, no text overlay.
Negative: {NEGATIVE}""",
    },
    {
        "cluster_id": 2,
        "slug": "2_group",
        "out_dir": FACTIONS_OUT,
        "prompt": f"""FACTION GROUP PORTRAIT — Ironsoil Vanguard (Cluster 2)
Season: cycle-14-wave-5-season-002 — Season of the Ironsoil Wide-Front
Style: {STYLE_LOCK}

Ultra-thematic dramatic group composition. Nine warriors — the Ironsoil Vanguard — arrayed in a wide crushing front on cracked iron-dark soil, low stone formations behind them. European medieval martial tradition: heavy plate, earth-caked boots, massive weapons (mauls, greatswords, war hammers) raised in wide-arc sweeping ready poses. Physical force and earthen weight define the silhouette — no magic, no range, only mass and proximity. Front row crouched low and braced, rear warriors towering behind them.

Wide cinematic composition emphasizing "close-crush" doctrine — bodies and terrain weaponized together, the earth fracturing beneath their stance, dust rising. Color palette: iron-grey, earth-brown, amber-dust, with faint earthen-green accent from cracked soil. Dramatic low-angle lighting from a heavy overcast sky. Heroic isekai visual register; sense of unstoppable forward mass.

{STYLE_LOCK}. No UI elements, no text overlay.
Negative: {NEGATIVE}""",
    },
    {
        "cluster_id": 3,
        "slug": "3_group",
        "out_dir": FACTIONS_OUT,
        "prompt": f"""FACTION GROUP PORTRAIT — Gale-Blessed Wardens (Cluster 3)
Season: cycle-14-wave-5-season-002 — Season of the Ironsoil Wide-Front
Style: {STYLE_LOCK}

Ultra-thematic dramatic group composition. Thirteen fighters — the Gale-Blessed Wardens — spread in a broad defensive line across open windswept terrain. Fantasy-generic medieval fellowship: varied weapons (spears, swords, bows, staves) held in sweeping ready poses, robes and cloaks catching the wind. Wind, holy light, and water flow together across the wide frame — ambient elemental pressure rather than focused beams. The fighters hold the line with presence rather than aggression.

Wide cinematic composition emphasizing "broad-front-combat" — a wide horizontal sweep of figures holding together, wind bending around them, pale-holy light filtering through the gale above. Color palette: slate-blue sky, wind-white gust streaks, holy-gold warmth at the center, water-cyan at the flanks. Dramatic side-lighting from diffuse storm light. Heroic isekai visual register; fellowship-and-line-holding energy.

{STYLE_LOCK}. No UI elements, no text overlay.
Negative: {NEGATIVE}""",
    },
    {
        "cluster_id": 4,
        "slug": "4_group",
        "out_dir": FACTIONS_OUT,
        "prompt": f"""FACTION GROUP PORTRAIT — Duskchain Ranging Compact (Cluster 4)
Season: cycle-14-wave-5-season-002 — Season of the Ironsoil Wide-Front
Style: {STYLE_LOCK}

Ultra-thematic dramatic group composition. Eight fighters — the Duskchain Ranging Compact — positioned in the grey margin between a forest edge and open field at twilight. Fantasy-generic medieval frontier: lean ranged fighters (archers, crossbow operatives, shadow-casters) spaced apart in a loose chain formation, each holding a patient pre-strike stillness. Shadow threads between them in visible dark-chain motifs, connecting them across the grey space. One figure in silhouette against a pale dusk sky releases a cascading chain-strike.

Wide cinematic composition emphasizing "chain-engagement" doctrine — figures distributed across depth planes, a chain of shadow connecting each, the sense of pressure accumulating before a single detonation. Color palette: twilight purple-grey, shadow-black, pale dusk sky, with lightning-bright chain-spark accent. Dramatic dusk back-lighting casting long shadows toward viewer. Heroic isekai visual register; patience and precision, not aggression.

{STYLE_LOCK}. No UI elements, no text overlay.
Negative: {NEGATIVE}""",
    },
]

# ─── PER-KIT INDIVIDUAL PORTRAIT PROMPTS ─────────────────────────────────────
# Top-3 per faction (cluster 1 has exactly 3 members; others use first 3 of member_kit_ids).
# Kit attributes derived from kit_id parsing: bc_cell_id = engagement_profile_damage_level_damage_pattern_attribute
# UX decision: 3 per faction = 12 portraits total; 33 total would be excessive for marquee page.

KIT_PROMPTS = [
    # ── Cluster 1: Stormcallers of the Pale Reach (all 3 members) ───────────
    {
        "kit_id": "S1_endgame_bc_ranged_medium_variable_int_light_s0",
        "slug": "S1_endgame_bc_ranged_medium_variable_int_light_s0",
        "out_dir": KITS_OUT,
        "prompt": f"""KIT CHARACTER PORTRAIT — Stormcaller of the Pale Reach
Faction: Stormcallers of the Pale Reach (Cluster 1) — Season of the Ironsoil Wide-Front
Style: {STYLE_LOCK}

Full-body character portrait on plain atmospheric studio backdrop (pale stormy sky haze). European medieval ranged practitioner. Lightning-attuned INT fighter — robed, variable-tempo striker, medium-range. Variable crackling lightning energy in both hands extended outward in a wide arc. Expression: concentrated, attuned rather than aggressive. Costume: European medieval scholar-warrior robe over chainmail, pale-grey and lightning-gold palette, hood down showing focused face. Lightning secondary affinity glows faintly.

Single-figure composition; three-quarter view; ready-casting pose with wide arm spread echoing the arc doctrine. Pixel-art HD-2D; hand-drawn-illustration sensibility; detailed shading.
No text, no UI. Negative: {NEGATIVE}""",
    },
    {
        "kit_id": "S1_endgame_bc_ranged_medium_variable_int_light_s1",
        "slug": "S1_endgame_bc_ranged_medium_variable_int_light_s1",
        "out_dir": KITS_OUT,
        "prompt": f"""KIT CHARACTER PORTRAIT — Dusk Caller of the Pale Reach
Faction: Stormcallers of the Pale Reach (Cluster 1) — Season of the Ironsoil Wide-Front
Style: {STYLE_LOCK}

Full-body character portrait on plain atmospheric studio backdrop (pale stormy sky haze). South Asian medieval ranged practitioner. Shadow-element INT fighter — fluid robes, variable-tempo caster, medium-range. Shadow pulses released in wide arcs from open hands in mid-release. Expression: calm, intuitive, saturating rather than aiming. Costume: flowing layered south-Asian medieval robes, deep-indigo and shadow-violet palette with pale-sky trim, hair loose in wind. No heavy armor — movement over defense.

Single-figure composition; three-quarter view; fluid mid-release pose, one arm extended low, one arm extended high, wide arc implied. Pixel-art HD-2D; hand-drawn-illustration sensibility; detailed shading.
No text, no UI. Negative: {NEGATIVE}""",
    },
    {
        "kit_id": "S1_endgame_bc_ranged_medium_variable_int_light_s2",
        "slug": "S1_endgame_bc_ranged_medium_variable_int_light_s2",
        "out_dir": KITS_OUT,
        "prompt": f"""KIT CHARACTER PORTRAIT — Ember Caller of the Pale Reach
Faction: Stormcallers of the Pale Reach (Cluster 1) — Season of the Ironsoil Wide-Front
Style: {STYLE_LOCK}

Full-body character portrait on plain atmospheric studio backdrop (pale stormy sky haze). European medieval ranged practitioner. Fire-element INT fighter — sweeping ignition caster, variable-tempo, medium-range. Fire released in a wide sweeping arc, flame reshaping the field rather than targeting. Expression: reads the burn as pattern — calm expertise. Costume: European medieval traveler's coat with fire-resistant leather patches, ember-orange and ash-grey palette, scorched edges on the coat hem.

Single-figure composition; three-quarter view; sweeping side-arm fire-release pose, wide arc of flame extending from the figure. Pixel-art HD-2D; hand-drawn-illustration sensibility; detailed shading.
No text, no UI. Negative: {NEGATIVE}""",
    },

    # ── Cluster 2: Ironsoil Vanguard (top 3 of 9) ───────────────────────────
    {
        "kit_id": "S1_endgame_bc_melee_low_spiky_str_none_s0",
        "slug": "S1_endgame_bc_melee_low_spiky_str_none_s0",
        "out_dir": KITS_OUT,
        "prompt": f"""KIT CHARACTER PORTRAIT — Ironsoil Breaker, Spikewarden of Gravel
Faction: Ironsoil Vanguard (Cluster 2) — Season of the Ironsoil Wide-Front
Style: {STYLE_LOCK}

Full-body character portrait on plain atmospheric studio backdrop (cracked iron-dark earth). European medieval close-quarters brawler. STR-driven low-tempo spiky fighter — slow to build, explosive on release. Large war hammer or maul raised overhead at apex of a wide-arc swing. Expression: grim patience — building to the spike. Costume: heavy layered plate over earth-stained padding, iron-grey and earth-brown palette, cracked-soil motif on pauldrons. Boots caked in iron-dark earth.

Single-figure composition; three-quarter view; coiled-power pre-spike pose — weapon at apex overhead, legs planted wide, earth cracking beneath stance. Pixel-art HD-2D; hand-drawn-illustration sensibility; detailed armor shading.
No text, no UI. Negative: {NEGATIVE}""",
    },
    {
        "kit_id": "S1_endgame_bc_melee_high_flat_str_none_s0",
        "slug": "S1_endgame_bc_melee_high_flat_str_none_s0",
        "out_dir": KITS_OUT,
        "prompt": f"""KIT CHARACTER PORTRAIT — Ironsoil Breaker of the Flattened Ground
Faction: Ironsoil Vanguard (Cluster 2) — Season of the Ironsoil Wide-Front
Style: {STYLE_LOCK}

Full-body character portrait on plain atmospheric studio backdrop (cracked iron-dark earth). European medieval close-quarters brawler. STR-driven high-tempo flat-output striker — relentless, no burst, compounding earthen pressure. Two-handed greatsword or war-axe mid-wide-arc sweep, body fully committed to the swing. Expression: unflinching, grinding forward — attrition made flesh. Costume: battered heavy plate, earth-caked war-axe or greatsword, iron-grey and amber-dust palette, no ornamentation.

Single-figure composition; three-quarter view; full-commitment wide-arc mid-swing, momentum forward, grounded and unstoppable. Pixel-art HD-2D; hand-drawn-illustration sensibility; detailed armor shading.
No text, no UI. Negative: {NEGATIVE}""",
    },
    {
        "kit_id": "S1_endgame_bc_melee_high_flat_str_none_s1",
        "slug": "S1_endgame_bc_melee_high_flat_str_none_s1",
        "out_dir": KITS_OUT,
        "prompt": f"""KIT CHARACTER PORTRAIT — Rampart, the Ironsoil Crusher
Faction: Ironsoil Vanguard (Cluster 2) — Season of the Ironsoil Wide-Front
Style: {STYLE_LOCK}

Full-body character portrait on plain atmospheric studio backdrop (cracked iron-dark earth). European medieval brawler — the body that becomes terrain. STR-driven high-tempo flat-output melee fighter. Massive chest and shoulders, no wasted movement — closes ground and delivers compounding wide-arc devastation. Bare-arms or minimal armor over heavy under-plate; fists or war-hammer raised mid-strike. Expression: relentless, absorbing-and-returning — not rage, pure engine of ruin.

Single-figure composition; three-quarter view; forward-momentum pose, feet apart, mid-strike with maximum commitment, earth displaced underfoot. Pixel-art HD-2D; hand-drawn-illustration sensibility; detailed shading.
No text, no UI. Negative: {NEGATIVE}""",
    },

    # ── Cluster 3: Gale-Blessed Wardens (top 3 of 13) ───────────────────────
    {
        "kit_id": "S1_endgame_bc_melee_high_flat_dex_none_s0",
        "slug": "S1_endgame_bc_melee_high_flat_dex_none_s0",
        "out_dir": KITS_OUT,
        "prompt": f"""KIT CHARACTER PORTRAIT — Windreave of Veldmoor
Faction: Gale-Blessed Wardens (Cluster 3) — Season of the Ironsoil Wide-Front
Style: {STYLE_LOCK}

Full-body character portrait on plain atmospheric studio backdrop (windswept open moorland haze). Fantasy-generic medieval DEX-driven melee warden. Wind-primary affinity — high-tempo flat-output, relentless lateral sweeping. Curved blade or twin-swords in mid-wide-arc sweep, movement fluid, costume billowing. Expression: unhurried consistency, the unfailing moorland gale. Costume: lightweight traveler's layered wrap, slate-blue and wind-white palette, flowing panels catching wind.

Single-figure composition; three-quarter view; lateral sweep mid-arc — fluid, wide, unbroken tempo. Wind streams trailing behind the blade arc. Pixel-art HD-2D; hand-drawn-illustration sensibility; detailed shading.
No text, no UI. Negative: {NEGATIVE}""",
    },
    {
        "kit_id": "S1_endgame_bc_melee_high_flat_dex_none_s1",
        "slug": "S1_endgame_bc_melee_high_flat_dex_none_s1",
        "out_dir": KITS_OUT,
        "prompt": f"""KIT CHARACTER PORTRAIT — Dextrous Warden of the Gale Front
Faction: Gale-Blessed Wardens (Cluster 3) — Season of the Ironsoil Wide-Front
Style: {STYLE_LOCK}

Full-body character portrait on plain atmospheric studio backdrop (windswept open field). Fantasy-generic medieval DEX-driven melee warden. Holy-affinity — high-tempo flat-output, filling gaps with lateral cuts. Light armor — mobility over defense, holy light faintly luminous around the blade edges. Expression: reading the geometry of the front — attentive, flowing. Costume: traveler's fitted plate-and-leather combination, pale-gold holy accent on blade, wind-white layered cloak.

Single-figure composition; three-quarter view; lateral mid-sweep, one leg extended in motion, filling a gap in a defensive line implied by body language. Holy shimmer along blade. Pixel-art HD-2D; hand-drawn-illustration sensibility; detailed shading.
No text, no UI. Negative: {NEGATIVE}""",
    },
    {
        "kit_id": "S1_endgame_bc_ranged_high_flat_dex_none_s0",
        "slug": "S1_endgame_bc_ranged_high_flat_dex_none_s0",
        "out_dir": KITS_OUT,
        "prompt": f"""KIT CHARACTER PORTRAIT — Stormcaller of the Open Reach
Faction: Gale-Blessed Wardens (Cluster 3) — Season of the Ironsoil Wide-Front
Style: {STYLE_LOCK}

Full-body character portrait on plain atmospheric studio backdrop (windswept open field with pale sky). Fantasy-generic medieval DEX-driven ranged warden. Lightning-affinity, flat high-tempo sustained volleys — a drifting defender rather than a fixed archer. Recurve bow or spirit-bow drawn full, lightning-gold streak along the bowstring mid-release. Expression: steady, drifting between lines — no fixed post. Costume: light traveler's layered wrap, slate-blue and lightning-gold palette, hair in motion from wind and draw-speed.

Single-figure composition; three-quarter view; full-draw release moment, one leg slightly back, body sideways, the arc of the shot implied. Lightning-gold spark at arrowhead. Pixel-art HD-2D; hand-drawn-illustration sensibility; detailed shading.
No text, no UI. Negative: {NEGATIVE}""",
    },

    # ── Cluster 4: Duskchain Ranging Compact (top 3 of 8) ───────────────────
    {
        "kit_id": "S1_endgame_bc_ranged_low_spiky_str_none_s0",
        "slug": "S1_endgame_bc_ranged_low_spiky_str_none_s0",
        "out_dir": KITS_OUT,
        "prompt": f"""KIT CHARACTER PORTRAIT — Duskchain Striker of the Gaunt Reach
Faction: Duskchain Ranging Compact (Cluster 4) — Season of the Ironsoil Wide-Front
Style: {STYLE_LOCK}

Full-body character portrait on plain atmospheric studio backdrop (grey frontier margin, twilight). Fantasy-generic medieval STR-driven ranged striker. Shadow-threading spiky-output — holds position in shadow until pressure loads, then detonates. Heavy crossbow or throw-weapon raised at the moment of release, dark chain-shadow motif trailing from the projectile. Expression: patient, accumulating — the deferred debt about to collect. Costume: frontier leathers, muted grey-brown palette, shadow-dark cloak at shoulders, chain-link belt.

Single-figure composition; three-quarter view; coiled-release moment — weight behind the shot, shadow-chain motif extending from weapon to target-implied. Low dusk back-light casting long shadow. Pixel-art HD-2D; hand-drawn-illustration sensibility; detailed shading.
No text, no UI. Negative: {NEGATIVE}""",
    },
    {
        "kit_id": "S1_endgame_bc_ranged_low_spiky_dex_none_s0",
        "slug": "S1_endgame_bc_ranged_low_spiky_dex_none_s0",
        "out_dir": KITS_OUT,
        "prompt": f"""KIT CHARACTER PORTRAIT — Stormbreak Ranger of the Pale Verge
Faction: Duskchain Ranging Compact (Cluster 4) — Season of the Ironsoil Wide-Front
Style: {STYLE_LOCK}

Full-body character portrait on plain atmospheric studio backdrop (grey frontier margin, pale dusk). Fantasy-generic medieval DEX-driven ranged striker. Lightning-threaded spiky-output — patient, then sudden overwhelming discharge. Compact bow or lightning-charged throwing spear at the apex of a single decisive release, lightning chain crackling from the tip. Expression: precise timing — letting the storm do what shadow started. Costume: lean frontier archer gear, pale-grey and lightning-gold palette, minimal but functional.

Single-figure composition; three-quarter view; decisive-release moment — one arm forward, one back, lightning-chain extending from projectile through implied chain-connection to background. Pixel-art HD-2D; hand-drawn-illustration sensibility; detailed shading.
No text, no UI. Negative: {NEGATIVE}""",
    },
    {
        "kit_id": "S1_endgame_bc_ranged_low_spiky_int_none_s0",
        "slug": "S1_endgame_bc_ranged_low_spiky_int_none_s0",
        "out_dir": KITS_OUT,
        "prompt": f"""KIT CHARACTER PORTRAIT — Duskchain Hexer of the Pale Verge
Faction: Duskchain Ranging Compact (Cluster 4) — Season of the Ironsoil Wide-Front
Style: {STYLE_LOCK}

Full-body character portrait on plain atmospheric studio backdrop (grey frontier margin, twilight). Fantasy-generic medieval INT-driven intelligence operative. Shadow-threading chain hexer — holds fire until chain is primed, then single devastating burst collapses multiple targets. Staff or dark-crystal focus raised, dark shadow-chain motif spreading outward in cascading web from the tip. Expression: cold precision — spending patience to collect cascading debts. Costume: frontier scholar's layered robes, deep-shadow-violet palette, chain-symbol stitched into hem.

Single-figure composition; three-quarter view; shadow-chain burst mid-release, the chain network radiating outward from raised focus. Dusk twilight back-light. Pixel-art HD-2D; hand-drawn-illustration sensibility; detailed robe shading.
No text, no UI. Negative: {NEGATIVE}""",
    },
]


def load_ledger():
    with open(LEDGER_PATH, "r") as f:
        return json.load(f)


def save_ledger(ledger):
    with open(LEDGER_PATH, "w") as f:
        json.dump(ledger, f, indent=2)


def append_ledger_entry(ledger, entry):
    ledger["entries"].append(entry)
    ledger["entry_count"] = len(ledger["entries"])
    successful = [e for e in ledger["entries"] if e.get("success")]
    ledger["total_cost_usd"] = round(sum(e["cost_usd"] for e in successful), 4)
    ledger["generated_at"] = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.%f") + "Z"


def generate_image(client, entry):
    slug = entry["slug"]
    out_path = entry["out_dir"] / f"{slug}.png"
    timestamp = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.%f") + "Z"

    # Skip if already generated
    if out_path.exists():
        print(f"  SKIP (exists): {slug}")
        return {
            "timestamp": timestamp,
            "class_slug": slug,
            "season_id": "cycle-14-wave-5-season-002",
            "cost_usd": 0.0,
            "success": True,
            "attempt": 0,
            "error_msg": None,
            "tag": TAG,
            "skipped": True,
        }

    print(f"  Generating: {slug}")
    attempt = 1
    max_attempts = 3
    last_error = None

    while attempt <= max_attempts:
        try:
            print(f"    Attempt {attempt}...")
            response = client.images.generate(
                model="gpt-image-1",
                prompt=entry["prompt"],
                n=1,
                size="1024x1024",
                quality="medium",
                output_format="png",
            )
            img_data = response.data[0].b64_json
            img_bytes = base64.b64decode(img_data)
            entry["out_dir"].mkdir(parents=True, exist_ok=True)
            with open(out_path, "wb") as f:
                f.write(img_bytes)
            print(f"    Saved: {out_path}")
            return {
                "timestamp": timestamp,
                "class_slug": slug,
                "season_id": "cycle-14-wave-5-season-002",
                "cost_usd": COST_PER_IMAGE,
                "success": True,
                "attempt": attempt,
                "error_msg": None,
                "tag": TAG,
            }
        except Exception as e:
            last_error = str(e)
            print(f"    Attempt {attempt} failed: {last_error}")
            if attempt < max_attempts:
                import time
                backoff = 2 ** attempt
                print(f"    Backing off {backoff}s...")
                time.sleep(backoff)
            attempt += 1

    return {
        "timestamp": timestamp,
        "class_slug": slug,
        "season_id": "cycle-14-wave-5-season-002",
        "cost_usd": 0.0,
        "success": False,
        "attempt": max_attempts,
        "error_msg": last_error,
        "tag": TAG,
    }


def main():
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY not set")

    client = OpenAI(api_key=api_key)
    ledger = load_ledger()

    all_prompts = FACTION_PROMPTS + KIT_PROMPTS
    print(f"Season 002 Marquee Image Gen — {len(all_prompts)} images")
    print(f"  {len(FACTION_PROMPTS)} faction group portraits")
    print(f"  {len(KIT_PROMPTS)} individual kit portraits (top-3 per faction)")
    print(f"  Budget estimate: ${len(all_prompts) * COST_PER_IMAGE:.2f}")
    print()

    results = []
    for entry in all_prompts:
        result = generate_image(client, entry)
        if not result.get("skipped"):
            append_ledger_entry(ledger, result)
            save_ledger(ledger)
        results.append(result)
        status = "SKIP" if result.get("skipped") else ("OK" if result["success"] else "FAIL")
        print(f"  [{status}] {result['class_slug']}")

    print()
    print("─── Season 002 Marquee Image Gen Summary ───")
    total_cost = sum(r["cost_usd"] for r in results if r["success"] and not r.get("skipped"))
    ok = [r for r in results if r["success"] and not r.get("skipped")]
    skipped = [r for r in results if r.get("skipped")]
    failures = [r for r in results if not r["success"]]
    print(f"  Generated: {len(ok)}")
    print(f"  Skipped (existing): {len(skipped)}")
    print(f"  Failures: {len(failures)}")
    print(f"  Batch cost: ${total_cost:.2f}")
    print(f"  Ledger total: ${ledger['total_cost_usd']:.2f}")
    if failures:
        print(f"  FAILURES:")
        for f in failures:
            print(f"    {f['class_slug']}: {f['error_msg']}")
        raise SystemExit(1)
    print("  All images complete.")


if __name__ == "__main__":
    main()
