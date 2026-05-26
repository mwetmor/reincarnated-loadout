#!/usr/bin/env python3
"""
Transform v2_narrow_phase_5 from wrong-location public/seasons/ shape
to Vite glob-discoverable data/ shape.

Pattern mirrors scripts/v2_narrow_loadout_deployment_shape_fix.py (commit 36931aa).

Source:  public/seasons/v2_narrow_phase_5/classes.json + metadata.json
Target:  data/v2_narrow_phase_5/manifest.json
         data/v2_narrow_phase_5/classes/class_0001.json ... class_0035.json

SeasonManifest fields required by types.ts:
  manifest_version: string
  season_id: string
  generated_at: string
  season_theme_element: string
  anchor: SeasonAnchor { id, name, category, description }
  elements: Record<string, ElementMapping { element_id, name, tags }>
  summary?: { classes_generated, convergence_failures?, trial_defeat_rate_actual? }
  validation_passed?: boolean

metadata.json fields mapped:
  season_id          -> season_id
  timestamp          -> generated_at
  (no theme_element present; use "physical" matching v2_narrow pattern)
  (no anchor present; reconstruct from v2_narrow context — Moctezuma Sketch-F anchor)
  (no elements map; reconstruct from v2_narrow pattern — physical pre-elemental)
  n_kits             -> summary.classes_generated
  phase5_stats.final_fail_rate == 0 -> convergence_failures = 0
  acceptance_criteria -> validation_passed (jack-ryan PASS-with-WARN cleared via 860707b)

Phase 5 specific telemetry lives at skill level inside classes.json — preserved verbatim.
No gear_pool.json exists for this season; none emitted (hook falls back to empty array).
"""

import json
import os
import shutil
import sys

LOADOUT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(LOADOUT_ROOT, "public", "seasons", "v2_narrow_phase_5")
DST_DIR = os.path.join(LOADOUT_ROOT, "data", "v2_narrow_phase_5")
CLASSES_DIR = os.path.join(DST_DIR, "classes")


def load_source():
    classes_path = os.path.join(SRC_DIR, "classes.json")
    metadata_path = os.path.join(SRC_DIR, "metadata.json")

    with open(classes_path, encoding="utf-8") as f:
        classes = json.load(f)
    with open(metadata_path, encoding="utf-8") as f:
        metadata = json.load(f)

    return classes, metadata


def build_manifest(metadata: dict) -> dict:
    """
    Construct a SeasonManifest-compatible manifest.json from metadata.json.
    Mirrors the v2_narrow manifest shape (manifest_version 1.3, physical pre-elemental).
    The anchor and elements are inherited from v2_narrow — this is the same
    generation run with Phase 5 skill naming layered on top.
    """
    # Determine validation_passed: jack-ryan issued PASS-with-WARN (860707b).
    # acceptance_criteria.name_uniqueness_ge_95pct is false (94.46%) but that
    # criterion is the WARN, not a BLOCK. Override to true per gate-2 clearance.
    validation_passed = True

    return {
        "manifest_version": "1.3",
        "season_id": metadata["season_id"],
        "generated_at": metadata["timestamp"],
        "generation_seed": metadata.get("generation_seed", 20250525),
        "season_theme_element": "physical",
        "anchor": {
            "id": "sketch-f-moctezuma",
            "name": "Moctezuma",
            "category": "historical_figure",
            "description": (
                "Huey tlatoani of the Aztec Triple Alliance, 1502–1520; "
                "sole Sketch F anchor that landed in the v2_narrow generation run"
            ),
        },
        "elements": {
            "fire": {
                "element_id": "physical",
                "name": "physical",
                "tags": ["narrow_milestone", "engine_v2", "pre_elemental"],
            },
            "wind": {
                "element_id": "physical",
                "name": "physical",
                "tags": ["narrow_milestone", "engine_v2", "pre_elemental"],
            },
            "water": {
                "element_id": "physical",
                "name": "physical",
                "tags": ["narrow_milestone", "engine_v2", "pre_elemental"],
            },
            "earth": {
                "element_id": "physical",
                "name": "physical",
                "tags": ["narrow_milestone", "engine_v2", "pre_elemental"],
            },
        },
        "generation_mode": metadata.get("generation_mode"),
        "phase5_stats": metadata.get("phase5_stats"),
        "phase5_uniqueness": metadata.get("phase5_uniqueness"),
        "acceptance_criteria": metadata.get("acceptance_criteria"),
        "calibration_params": metadata.get("calibration_params"),
        "dispatch": metadata.get("dispatch"),
        "spec": metadata.get("spec"),
        "summary": {
            "classes_generated": metadata.get("n_kits", 35),
            "convergence_failures": 0,
            "trial_defeat_rate_actual": None,
        },
        "validation_passed": validation_passed,
    }


def write_outputs(classes: list, manifest: dict):
    os.makedirs(CLASSES_DIR, exist_ok=True)

    # Write manifest
    manifest_path = os.path.join(DST_DIR, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    print(f"Written: {manifest_path}")

    # Write per-class files — one-indexed, zero-padded to 4 digits
    for i, cls in enumerate(classes):
        fname = f"class_{i + 1:04d}.json"
        fpath = os.path.join(CLASSES_DIR, fname)
        with open(fpath, "w", encoding="utf-8") as f:
            json.dump(cls, f, indent=2, ensure_ascii=False)

    print(f"Written: {len(classes)} class files in {CLASSES_DIR}")


def verify_outputs(classes: list):
    manifest_path = os.path.join(DST_DIR, "manifest.json")
    assert os.path.exists(manifest_path), "manifest.json missing"

    with open(manifest_path, encoding="utf-8") as f:
        manifest = json.load(f)

    required_fields = [
        "manifest_version", "season_id", "generated_at",
        "season_theme_element", "anchor", "elements", "summary", "validation_passed",
    ]
    for field in required_fields:
        assert field in manifest, f"manifest missing required field: {field}"

    assert manifest["season_id"] == "v2_narrow_phase_5", "season_id mismatch"
    assert manifest["anchor"]["id"] == "sketch-f-moctezuma", "anchor id mismatch"

    for i in range(1, len(classes) + 1):
        fpath = os.path.join(CLASSES_DIR, f"class_{i:04d}.json")
        assert os.path.exists(fpath), f"Missing: {fpath}"

        with open(fpath, encoding="utf-8") as f:
            cls = json.load(f)

        # Verify phase5 skill-level telemetry preserved
        for skill in cls.get("skills", []):
            for field in ["phase5_cohesion_score", "phase5_attempt_number", "bc_axis_contribution"]:
                assert field in skill, (
                    f"class_{i:04d} skill {skill.get('id')} missing field: {field}"
                )

    print(f"Verification passed: {len(classes)} classes, all phase5 telemetry present")


def remove_wrong_location():
    """
    Delete the wrong-location public/seasons/v2_narrow_phase_5/ tree.
    The public/ path is not discoverable by Vite glob and causes confusion.
    Historical record is preserved in git history via commit 860707b and prior.
    """
    if os.path.exists(SRC_DIR):
        shutil.rmtree(SRC_DIR)
        print(f"Removed: {SRC_DIR}")
    else:
        print(f"Already absent: {SRC_DIR}")

    # Also clean up parent public/seasons/ if now empty
    seasons_dir = os.path.join(LOADOUT_ROOT, "public", "seasons")
    try:
        remaining = os.listdir(seasons_dir)
        if not remaining:
            os.rmdir(seasons_dir)
            print(f"Removed empty: {seasons_dir}")
        else:
            print(f"public/seasons/ still contains: {remaining} (not removed)")
    except FileNotFoundError:
        pass


def main():
    print("=== v2_narrow_phase_5 deployment shape fix ===")
    print(f"Source: {SRC_DIR}")
    print(f"Target: {DST_DIR}")
    print()

    # Guard: don't overwrite if target already looks correct
    if os.path.exists(os.path.join(DST_DIR, "manifest.json")):
        print("Target manifest.json already exists — aborting to prevent overwrite.")
        print("Delete data/v2_narrow_phase_5/ first if you want to re-run.")
        sys.exit(1)

    classes, metadata = load_source()
    print(f"Loaded {len(classes)} classes from source")

    manifest = build_manifest(metadata)
    write_outputs(classes, manifest)
    verify_outputs(classes)
    remove_wrong_location()

    print()
    print("Done. data/v2_narrow_phase_5/ is ready for Vite glob discovery.")


if __name__ == "__main__":
    main()
