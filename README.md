# Reincarnated Loadout — RETIRED (2026-06-10)

> ## ⛔ RETIRED — archived, not deleted
>
> This web `/forge` + loadout app was **always scaffolding** toward the real Unreal Engine player-facing surface — never intended to ship as a player-facing companion. It served its purpose as a fast-iteration prototyping surface *before* UE was empirically proven (mantis spike GREEN; 15K stars @ ~92 FPS). With UE now the single player-facing surface, the app is **wound down** to dissolve the two-cosmograph cross-surface drift hazard (a star-sign that's a neighbor in the forge becoming a stranger in the sky). This is **retirement, not deletion** — full git history is preserved and the codebase is kept in place.
>
> - **Archive tag:** `drax/loadout-retired-2026-06-10` (annotated; on the final HEAD)
> - **Wind-down dispatch:** `reincarnated-collaboration/agentic_orchestration/dispatches/2026-06-10-drax-forge-loadout-wind-down.md`
> - **Rationale (the *why*):** `reincarnated-collaboration/agentic_orchestration/gandalf/notes/2026-06-10-forge-windown-recommendation-for-kr.md`
> - **Migrate-forward salvage note:** `reincarnated-collaboration/agentic_orchestration/drax/notes/2026-06-10-forge-loadout-salvage-note.md`
>
> Vercel deployment disposition (dark vs. frozen) is staged for Matt authorization (ADR-006). Everything below this banner is the historical README, retained for reference.

---

# Reincarnated Loadout

Character build inspection and cross-season analytics for the Reincarnated RPG engine.

> **v0 foundation.** Design docs live in `design/`. Implementation begins in Phase 2 (pending design review).

## Quick Start

```bash
npm install
npm run dev
```

## Project Structure

```
src/pages/      — Loadout (Page 1) and Analytics (Page 2)
src/components/ — SkillTree, StatsPanel, GearGrid, analytics charts
src/hooks/      — useSkillBuild (SP state), useSeasonData (data loading)
data/           — Bundled season JSONs (no backend required)
design/         — Architecture docs, data model, phases roadmap
prototypes/     — v0-static-html.html (historical reference)
```

## Adding Season Data

1. Create `data/<season_id>/classes/`
2. Copy class JSONs and `manifest.json` from the engine output
3. `npm run build` — the analytics page discovers the new season automatically

## Tech Stack

React + Vite + TypeScript · Tailwind CSS · Recharts · React Router · Static deployment (Vercel / GitHub Pages)

## Roadmap

See `design/phases.md` for the v0 → v1+ feature roadmap.
