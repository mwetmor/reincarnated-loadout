#!/usr/bin/env python3
"""
Season 002 Group Portrait Re-roll — cascade-r4-v1-season-002-marquee-polish-1
Agent: drax (player-surface seam owner)
Date: 2026-05-30

Phase 2 re-roll using legolas authored prompts + galadriel design guidance.
Re-generates ONLY the 4 faction group portraits (not individual kits).
Uses quality="high" (vs prior run's "medium") + legolas's richer authored prompts.

Backup prior groups to factions/prior/ before overwriting.

Cost: 4 × $0.08 (high quality) = ~$0.32

Sources:
  - legolas prompts: agentic_orchestration/legolas/notes/2026-05-29-cycle-14-season-002-marquee-image-gen-prompts.md
  - galadriel design: agentic_orchestration/galadriel/notes/2026-05-29-cycle-14-season-002-marquee-visual-coherence-design.md
"""

import os
import json
import base64
import datetime
import shutil
from pathlib import Path
from openai import OpenAI

COST_PER_IMAGE_HIGH = 0.08  # gpt-image-1 high quality 1024x1024
TAG = "cascade-r4-v1-season-002-marquee-polish-1"
LEDGER_PATH = Path("/Users/admin/Games/reincarnated-loadout/public/pitch/cost-ledger.json")
FACTIONS_OUT = Path("/Users/admin/Games/reincarnated-loadout/public/pitch/season_002/factions")

STYLE_LOCK = (
    "hand-drawn pixel-art game illustration, HD-2D style — reference Octopath Traveler / "
    "Triangle Strategy / Eastward / CrossCode art direction; isekai-genre-readable; "
    "NOT retro pixel-art; pixel-resolution sprites with hand-drawn-illustration sensibility; "
    "detailed shading and palette work"
)

# ─── LEGOLAS AUTHORED PROMPTS (verbatim from 2026-05-29 notes) ──────────────
# These are the authored prompts legolas filed AFTER drax's first pass.
# Baked in: galadriel's 4 group composition designs per §1 of her visual-coherence note.
# Galadriel design guidance notes integrated per-prompt below.

GROUP_PROMPTS = [
    {
        "cluster_id": 1,
        "slug": "1_group",
        "out_dir": FACTIONS_OUT,
        # Legolas authored — verbatim from notes file, Group Portrait 1
        # Galadriel §1.1: tri-band palette; loose triangle NOT pyramidal; ALL 3 in-frame;
        # pale-bleached environment; rim-lighting from each element; eye-line OUT-OF-FRAME
        "prompt": """GROUP PORTRAIT — Stormcallers of the Pale Reach (Cluster 1)
Season: cycle-14-wave-5-season-002 — Season of the Ironsoil Wide-Front
Style: hand-drawn pixel-art game illustration, HD-2D style — reference Octopath Traveler / Triangle Strategy / Eastward / CrossCode art direction; isekai-genre-readable; NOT retro pixel-art; pixel-resolution sprites with hand-drawn-illustration sensibility; detailed shading and palette work

SCENE: A pale, storm-swept highland bluff at dusk. Three European medieval ranged fighters stand in loose triangular formation, each channeling a different destructive force at full draw. Left figure: crackling lightning coils around their raised arms, arcs branching wide across the grey sky. Center figure: shadow threads spill outward from a half-raised staff, pooling darkness at their feet. Right figure: fire blooms in both hands, a wide fan of flame not aimed but released — spreading rather than targeting. All three strike simultaneously, their combined AOE devastating the emptiness before them. The scene reads devastation-first, doctrine-never. Wide-arc composition: the three elemental releases fan out across the full width of the frame, overlapping at the center in a tri-colored convergence of lightning-gold, shadow-violet, and fire-ember.

Lighting: storm-grey sky backlit by simultaneous tri-elemental discharge. Atmosphere: cold highland wind; the smell of ozone and char. Color palette: lightning-gold / shadow-deep-violet / fire-amber-orange against pale grey stone and bleached grass. Ultra-thematic. Dramatic. Pixel-art HD-2D; hand-drawn illustration sensibility; isekai-game-coded; NO retro pixel style.""",
    },
    {
        "cluster_id": 2,
        "slug": "2_group",
        "out_dir": FACTIONS_OUT,
        # Legolas authored — verbatim from notes file, Group Portrait 2
        # Galadriel §1.2: 5-7 members NOT all 9 (visual-soup risk); low-angle camera;
        # dust-haze ambient; NO bright elemental highlights; motion-coded earth VFX
        "prompt": """GROUP PORTRAIT — Ironsoil Vanguard (Cluster 2)
Season: cycle-14-wave-5-season-002 — Season of the Ironsoil Wide-Front
Style: hand-drawn pixel-art game illustration, HD-2D style — reference Octopath Traveler / Triangle Strategy / Eastward / CrossCode art direction; isekai-genre-readable; NOT retro pixel-art; pixel-resolution sprites with hand-drawn-illustration sensibility; detailed shading and palette work

SCENE: An earthen battleground, soil churned and cracked, mist low across broken ground. Nine European medieval close-quarters fighters press forward as a single crushing mass. Front rank: massive warriors with earth-stained armor delivering wide horizontal arc swings, ground fracturing beneath each blow. Mid rank: heavy-set fighters whose strikes raise plumes of soil and gravel, earthen force amplifying raw physical weight. Rear edge barely visible — a depth of bodies suggesting this is the front of an army, not a squad. The wide-arc AOE reads through overlapping impact zones: cracked earth radiates outward in concentric rings from multiple simultaneous strike points. No ranged reach, no elemental flash — only mass and proximity weaponized together.

The mood: relentless. Grim. European medieval martial tradition at its most earthbound. Color palette: ironsoil-brown / aged-steel-grey / earthen-amber dust clouds against muted overcast sky. Ground-level composition — the scene is fought at the soil, not above it. Ultra-thematic. Dramatic. Pixel-art HD-2D; hand-drawn illustration sensibility; isekai-game-coded; NO retro pixel style.""",
    },
    {
        "cluster_id": 3,
        "slug": "3_group",
        "out_dir": FACTIONS_OUT,
        # Legolas authored — verbatim from notes file, Group Portrait 3
        # Galadriel §1.3: 7-9 NOT 13; wind-primary AGGRESSIVE anchoring;
        # broken-cloud lighting; pluralistic-armor; absence-of-unified-heraldry;
        # environmental wind cues LOAD-BEARING
        "prompt": """GROUP PORTRAIT — Gale-Blessed Wardens (Cluster 3)
Season: cycle-14-wave-5-season-002 — Season of the Ironsoil Wide-Front
Style: hand-drawn pixel-art game illustration, HD-2D style — reference Octopath Traveler / Triangle Strategy / Eastward / CrossCode art direction; isekai-genre-readable; NOT retro pixel-art; pixel-resolution sprites with hand-drawn-illustration sensibility; detailed shading and palette work

SCENE: An open hilltop meadow in the moment before a storm breaks — a loose fellowship of thirteen medieval defenders in mid-sweep, each pulling from a different ambient elemental current. Wind-swept cloaks and banners. The central group of fighters executes wide horizontal arcs, gale-force pressure visible as translucent wind-sweeps crossing the full width of the frame. Holy light bleeds upward from one defender's blade, not blazing but present — sanctified without ceremony. Water-force ripples laterally from another fighter's extended arm, flat and sweeping. The thirteen figures are NOT a tight formation — they are spread across the front, connected not by rank but by the shared geometry of their wide reach.

The mood: elemental convergence without doctrine. The fellowship coheres through common width of arc, not shared creed. Color palette: wind-translucent-teal / holy-soft-gold / water-pale-blue against open grey-green meadow. Sky: overcast but not dark — ambient elemental pressure rather than storm. Ultra-thematic. Dramatic. Pixel-art HD-2D; hand-drawn illustration sensibility; isekai-game-coded; NO retro pixel style.""",
    },
    {
        "cluster_id": 4,
        "slug": "4_group",
        "out_dir": FACTIONS_OUT,
        # Legolas authored — verbatim from notes file, Group Portrait 4
        # Galadriel §1.4: dispersed-depth NOT formation; eye-level peer-camera;
        # shadow-thread tendrils (NOT smoke/fog/blob) LOAD-BEARING;
        # single warm horizon band as color contrast; 1-2 faces partially visible
        "prompt": """GROUP PORTRAIT — Duskchain Ranging Compact (Cluster 4)
Season: cycle-14-wave-5-season-002 — Season of the Ironsoil Wide-Front
Style: hand-drawn pixel-art game illustration, HD-2D style — reference Octopath Traveler / Triangle Strategy / Eastward / CrossCode art direction; isekai-genre-readable; NOT retro pixel-art; pixel-resolution sprites with hand-drawn-illustration sensibility; detailed shading and palette work

SCENE: The grey margin of a frontier forest at dusk — sparse trees, uneven ground, the light failing. Eight loosely scattered ranged fighters at various depths of shadow and visibility, each mid-chain-strike. Shadow threads visible as dark filament connecting targets across the mid-ground — not arrows but cascading force jumping from point to point. The chain pattern is the visual subject: dark energy traces a non-linear path through the scene, physically connecting the eight fighters to each other and to their targets in a web of accumulated pressure. Physical force-bolts anchor the chain at key strike nodes; occasional lightning sparks mark where momentum detonates. Some fighters are barely visible — only their shadow-threads and their ranged releases mark their positions.

The mood: patient accumulation, then cascade. Not confrontation — dissolution. Color palette: shadow-deep-violet / physical-steel-grey / dusk-amber-edge lighting against dark frontier forest. The scene reads darker than the other three factions, marginally lit. Ultra-thematic. Dramatic. Pixel-art HD-2D; hand-drawn illustration sensibility; isekai-game-coded; NO retro pixel style.""",
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


def backup_prior_groups():
    """Back up existing group images before overwriting."""
    prior_dir = FACTIONS_OUT / "prior"
    prior_dir.mkdir(exist_ok=True)
    for i in range(1, 5):
        src = FACTIONS_OUT / f"{i}_group.png"
        if src.exists():
            dst = prior_dir / f"{i}_group_prior.png"
            shutil.copy2(src, dst)
            print(f"  Backed up: {src.name} → prior/{dst.name}")


def generate_image(client, entry):
    slug = entry["slug"]
    out_path = entry["out_dir"] / f"{slug}.png"
    timestamp = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.%f") + "Z"

    print(f"  Generating (HIGH quality): {slug}")
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
                quality="high",
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
                "cost_usd": COST_PER_IMAGE_HIGH,
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

    print(f"Season 002 Group Portrait Re-roll — Phase 2 (legolas prompts + galadriel design)")
    print(f"  4 group portraits × $0.08 (HIGH quality) = ~$0.32")
    print(f"  Prior ledger total: ${ledger['total_cost_usd']}")
    print()

    # Back up prior groups first
    print("Backing up prior group images...")
    backup_prior_groups()
    print()

    results = []
    for entry in GROUP_PROMPTS:
        result = generate_image(client, entry)
        append_ledger_entry(ledger, result)
        save_ledger(ledger)
        results.append(result)
        status = "OK" if result["success"] else "FAIL"
        print(f"  [{status}] {result['class_slug']}")
        print()

    print()
    print("─── Re-roll Summary ───")
    total_cost = sum(r["cost_usd"] for r in results if r["success"])
    ok = [r for r in results if r["success"]]
    failures = [r for r in results if not r["success"]]
    print(f"  Generated: {len(ok)}/4")
    print(f"  Batch cost: ${total_cost:.2f}")
    print(f"  Ledger total: ${ledger['total_cost_usd']:.2f}")
    if failures:
        print(f"  FAILURES:")
        for f in failures:
            print(f"    {f['class_slug']}: {f['error_msg']}")
        raise SystemExit(1)
    print("  All re-roll images complete.")
    print()
    print("NEXT STEP: Visual quality check — read the new group images and compare.")


if __name__ == "__main__":
    main()
