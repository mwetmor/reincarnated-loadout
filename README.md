# Reincarnated Loadout

> ## Status — LIVE, forward development paused (2026-06-10)
>
> This app — including the 2D cosmograph (`/forge`) — is **live and stays live** on Vercel (`https://reincarnated-loadout.vercel.app`). What changed on 2026-06-10 is the **forward roadmap, not the deployment**: active feature development on the loadout web app is **paused** (no further roadmap) now that Unreal Engine is the primary player-facing surface. The app is **not retired, not archived, and not going dark.**
>
> The **original cosmograph form is explicitly retained** — Matt still plans to use it. Nothing is being torn down.
>
> - **Disposition:** seam frozen (no further roadmap); app + cosmograph remain live on Vercel as-is.
> - **Context dispatch:** `reincarnated-collaboration/agentic_orchestration/dispatches/2026-06-10-drax-forge-loadout-wind-down.md` (see the scope-correction note in its completion record).
> - **Design-learnings (captured as the seam's roadmap pauses):** `reincarnated-collaboration/agentic_orchestration/drax/notes/2026-06-10-forge-loadout-salvage-note.md`
>
> Everything below this note is the standing app README.

---

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
