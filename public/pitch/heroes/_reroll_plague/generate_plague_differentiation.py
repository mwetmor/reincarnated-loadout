#!/usr/bin/env python3
"""
Plague City differentiation re-roll — 2 portraits.
Plague Wind Censer: keep mask, deep-black robe.
Chalk-Handed Quarantine Warden: remove mask, stern grey-haired civic warden.
Tag: plague-differentiation-reroll
"""

import os
import json
import base64
import datetime
from pathlib import Path
from openai import OpenAI

COST_PER_IMAGE = 0.04
TAG = "plague-differentiation-reroll"
LEDGER_PATH = Path("/Users/admin/Games/reincarnated-loadout/public/pitch/cost-ledger.json")
OUT_DIR = Path("/Users/admin/Games/reincarnated-loadout/public/pitch/heroes/_reroll_plague/season_002014")

PORTRAITS = [
    {
        "slug": "plague-wind-censer",
        "season_id": "season_002014",
        "prompt": (
            "HD-2D hand-drawn pixel-art character portrait. Octopath Traveler / Triangle Strategy / "
            "Sea of Stars / Live A Live HD-2D visual register. Painterly cinematic lighting, "
            "atmospheric depth-of-field backdrop.\n\n"
            "A masked plague-priest standing in the middle of a deserted cobblestone city street, "
            "mid-swing of a long-chained brass censer that trails a wide arc of luminous pale "
            "grey-white cleansing smoke across the frame. She wears a LONG DEEP-BLACK ROBE AND "
            "HOODED CLOAK — almost entirely black-clad — with only the faintest pale-slate trim at "
            "collar and cuffs as the single accent. A long-beaked plague-doctor mask hides her face "
            "entirely; deep-black hood pulled up over the mask leaving only the beak's silhouette "
            "visible. The censer's chain wraps around her gripping hand (fingers tucked into the "
            "chain wraps). The background shows quarantined buildings with chalk-marked doors and "
            "shuttered windows in atmospheric haze. Pale slate and silver-white highlights from "
            "the cleansing smoke contrast strongly against the deep-black robe — the only bright "
            "elements in the composition are the smoke arc and the brass censer itself. Kinetic "
            "motion-streak and drifting particulate around the censer arc. 3/4 view, mid-action "
            "swing pose, isekai-genre-readable.\n\n"
            "The character displaces and carries. Style register: mystic. The substrate of motion — "
            "kinetic rearrangement; what removes targets from their position and redirects momentum.\n\n"
            "HD-2D illustrated pixel-art quality, single character centered. No text, no UI elements.\n\n"
            "Positive anatomy controls: Five-fingered human hands if visible, anatomically correct "
            "fingers, natural hand proportions.\n\n"
            "Negative: extra fingers, missing fingers, three fingers, four fingers, six fingers, "
            "wrong finger count, malformed hands, distorted hands, fused fingers, anatomically "
            "incorrect, extra limbs, mutated anatomy, photorealistic, Diablo grimdark painterly, "
            "dark concept art, retro 16-bit pixel, modern anime line-art, cel-shaded, "
            "oversaturated, AAA realism, vector art, multiple characters, text overlay, "
            "bright colored robes, white robes, blue robes, red robes"
        ),
    },
    {
        "slug": "chalk-handed-quarantine-warden",
        "season_id": "season_002014",
        "prompt": (
            "HD-2D hand-drawn pixel-art character portrait. Octopath Traveler / Triangle Strategy / "
            "Sea of Stars / Live A Live HD-2D visual register. Painterly cinematic lighting, "
            "atmospheric depth-of-field backdrop.\n\n"
            "SIDE PROFILE: a STERN GREY-HAIRED CIVIC WARDEN stands in profile facing a wooden door; "
            "a freshly-chalked X-mark is already inscribed on the door at shoulder height. The chalk "
            "is settling — small motes of white chalk-dust drift in the lamplight near the door. His "
            "hands are tucked behind his back (not visible to viewer), stance steady, the act of "
            "marking already completed. He is UNMASKED with his face fully visible in stern side "
            "profile: grey-bearded, deep-set tired eyes, weary-but-resolute expression of civic duty "
            "done daily. NO plague-doctor mask, NO beaked mask, NO face covering. He wears a long "
            "ash-stained CIVIC WARDEN'S COAT — this is the city administrator who decides which "
            "houses get sealed, NOT a plague-doctor or ritual figure. Loam-brown and burnt-amber "
            "trim on the coat; small civic-authority insignia on the collar (ribbon or pin). Behind "
            "him in soft depth-of-field: the rest of the plague-quarantined street, empty "
            "cobblestones, other shuttered windows with chalk Xs.\n\n"
            "The character anchors and roots. Style register: martial. The substrate of unyielding — "
            "positional refusal; what does not move and will not be moved.\n\n"
            "HD-2D illustrated pixel-art quality, single character centered, side-profile composition. "
            "No text, no UI elements.\n\n"
            "Positive anatomy controls: Five-fingered human hands if visible, anatomically correct "
            "fingers, natural hand proportions, properly-formed limbs.\n\n"
            "Negative: plague-doctor mask, beaked mask, plague mask, medical mask, hood-mask, "
            "face-covering, hooded face hidden, dark hood obscuring face, extra fingers, missing "
            "fingers, three fingers, four fingers, six fingers, wrong finger count, malformed hands, "
            "distorted hands, fused fingers, anatomically incorrect, extra limbs, mutated anatomy, "
            "photorealistic, Diablo grimdark painterly, dark concept art, retro 16-bit pixel, "
            "modern anime line-art, cel-shaded, oversaturated, AAA realism, vector art, multiple "
            "characters, text overlay"
        ),
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


def generate_portrait(client, portrait):
    slug = portrait["slug"]
    out_path = OUT_DIR / f"{slug}.png"
    timestamp = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.%f") + "Z"

    print(f"  Generating: {slug}")
    attempt = 1
    max_attempts = 3
    last_error = None

    while attempt <= max_attempts:
        try:
            print(f"    Attempt {attempt}...")
            response = client.images.generate(
                model="gpt-image-1",
                prompt=portrait["prompt"],
                n=1,
                size="1024x1024",
                quality="medium",
                output_format="png",
            )
            # gpt-image-1 returns b64_json
            img_data = response.data[0].b64_json
            img_bytes = base64.b64decode(img_data)
            with open(out_path, "wb") as f:
                f.write(img_bytes)
            print(f"    Saved: {out_path}")
            return {
                "timestamp": timestamp,
                "class_slug": slug,
                "season_id": portrait["season_id"],
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

    # All attempts exhausted
    return {
        "timestamp": timestamp,
        "class_slug": slug,
        "season_id": portrait["season_id"],
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

    results = []
    for portrait in PORTRAITS:
        entry = generate_portrait(client, portrait)
        append_ledger_entry(ledger, entry)
        save_ledger(ledger)
        results.append(entry)
        status = "OK" if entry["success"] else "FAILED"
        print(f"  {status}: {entry['class_slug']} — cost ${entry['cost_usd']:.2f}")

    # Summary
    print("\n--- Plague differentiation re-roll summary ---")
    total_cost = sum(e["cost_usd"] for e in results if e["success"])
    for r in results:
        flag = "OK" if r["success"] else "FAIL"
        print(f"  [{flag}] {r['class_slug']}")
    print(f"  Batch cost: ${total_cost:.2f}")
    print(f"  Ledger total: ${ledger['total_cost_usd']:.2f}")
    failures = [r for r in results if not r["success"]]
    if failures:
        print(f"  FAILURES ({len(failures)}):")
        for f in failures:
            print(f"    {f['class_slug']}: {f['error_msg']}")
        raise SystemExit(1)
    print("  All portraits generated successfully.")


if __name__ == "__main__":
    main()
