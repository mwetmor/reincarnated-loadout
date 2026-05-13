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
