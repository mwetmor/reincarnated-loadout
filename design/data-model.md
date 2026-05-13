# Data Model

Fields consumed from engine JSON. All data lives in `data/` as static files; no backend in v0.

---

## Class JSON Fields

Source: `data/<season_id>/classes/class_XXXX.json`

### Consumed in v0

| Field | Type | Used in |
|-------|------|---------|
| `id` | string | Class selector, URL param, localStorage key |
| `archetype_tag` | string | Class header, analytics grouping |
| `role_orientation` | string | Class header (`hybrid`, `damage`, `control`, etc.) |
| `dominant_element` | string | Class header, element distribution chart |
| `energy_type` | string | Class header, stats panel (`mana`, `stamina`, etc.) |
| `range_profile` | string | Class header (`melee`, `medium`, `ranged`) |
| `stat_distribution` | object | Stats panel radar + numbers; analytics radar chart |
| `skills` | array | Skill tree |
| `balance_metadata.final_modifier` | number | Analytics modifier charts |
| `balance_metadata.convergence_iterations` | number | Analytics convergence chart |
| `balance_metadata.converged` | boolean | Analytics summary; flag unconverged classes |
| `balance_metadata.actual_winrate` | number | Analytics modifier spread |

### Skill Object Fields

| Field | Type | Used in |
|-------|------|---------|
| `id` | string | State key, node identity |
| `role` | string | Detail panel label (primary_attack, burst_damage, etc.) |
| `canonical_element` | string | Node color hint, detail panel |
| `effect_category` | string | Detail panel |
| `effects` | array | Detail panel (effect name + params) |
| `tier` | number | Tree row (1–4); unlock rule enforcement |
| `chain_id` | string | Tree column (chain_A–chain_D) |
| `chain_position` | number | Sort order within chain |
| `parent_skill_ids` | string[] | Prerequisite display in detail panel |
| `scaling_coefficient` | number | Detail panel; key analytical stat |
| `energy_cost` | number | Detail panel |
| `cooldown_seconds` | number | Detail panel |

### Ignored in v0

| Field | Reason |
|-------|--------|
| `name` | Null in most generated classes; display `id` as fallback |
| `title_completion` | LLM-generated lore; not wired in v0 |
| `flavor_text` | Same; placeholder section in v1 |
| `color_palette` | Deferred to v1 class theming |
| `composition_mode` | Internal engine field; not surfaced |
| `canonical_pair_ref` | Internal engine field |
| `damage_multiplier` | Always 1.0 in current data; not surfaced |
| `balance_metadata.gauntlet_results` | Detailed fight logs; too verbose for v0 |
| `balance_metadata.target_winrate` | Engine config; not user-facing |

---

## Season Manifest Fields

Source: `data/<season_id>/manifest.json`

| Field | Used in |
|-------|---------|
| `season_id` | Season selector, analytics timeline axis |
| `generated_at` | Analytics timeline sort (chronological) |
| `season_theme_element` | Analytics anchor section |
| `anchor.id` | Anchor diversity chart |
| `anchor.name` | Anchor diversity display name |
| `anchor.category` | Anchor diversity grouping |

---

## App State

### SP Allocation State

Managed by `useSkillBuild` hook. Persisted to `localStorage`.

```typescript
type BuildState = {
  classId: string;
  seasonId: string;
  allocations: Record<string, number>;  // skill_id → SP invested (0–15)
}
```

### Unlock Rules (B6 spec)

```
T2 unlocked when: sum(T1 allocations) >= 3
T3 unlocked when: sum(T1 + T2 allocations) >= 5
T4 unlocked when: sum(T1 + T2 + T3 allocations) >= 8
```

These are enforced in `useSkillBuild`. Attempting to invest in a locked tier returns a validation error displayed in the detail panel.

### Constants (`src/data/constants.ts`)

```typescript
SP_BUDGET = 120          // total SP per character
MAX_SKILL_RANK = 15      // per-skill cap
TIER_UNLOCK_THRESHOLDS = { 2: 3, 3: 5, 4: 8 }
```

### localStorage Schema

Key: `reincarnated-loadout-build`

```json
{
  "version": 1,
  "classId": "class_0002",
  "seasonId": "season_001005",
  "allocations": {
    "skill_000016": 3,
    "skill_000017": 0,
    "skill_000018": 5
  },
  "savedAt": "2026-05-13T04:00:00Z"
}
```

Version field allows future migration if the schema changes.

---

## Season Discovery (Vite Glob Import)

`useSeasonData` hook uses Vite's `import.meta.glob` to load all manifest and class files at build time:

```typescript
const manifests = import.meta.glob('../data/*/manifest.json', { eager: true });
const classes = import.meta.glob('../data/*/classes/*.json', { eager: true });
```

This means **adding a new season requires only dropping files into `data/` and rebuilding** — no code changes.

---

## Known Data Quirks

- **Tier 4 skills**: Not present in current generated classes (tiers go up to 3). T4 unlock logic is implemented but will render an empty row until engine generates T4 skills.
- **Converged = false classes**: `balance_metadata.converged` is false for some classes. The app displays these with a warning badge but does not exclude them.
- **Null names**: All `name` fields in current data are null. The app displays `id` (e.g., "skill_000016") as fallback. When names land in a future engine version, they'll display automatically.
- **color_palette values**: Stored as integers (hex color encoded as int). Not used in v0 but the type definition preserves them for v1 theming.
