# UI References

Inspiration sources for the Reincarnated Loadout App. Not to be copied — to be learned from.

---

## Skill Tree / Build Planning

### D4Planner (diablo4.io / maxroll Planner)
- **Borrow:** Node graph layout with tier rows, hover-to-preview, point allocation with undo
- **Avoid:** Overcrowded node density; the Reincarnated tree is smaller (4 chains × 4 tiers max = 16 nodes)
- **Key insight:** Two-step confirm prevents mis-investment — D4Planner uses this

### Last Epoch Tools (lastepochtools.com)
- **Borrow:** Clean tier-row layout, node state coloring (locked/available/invested), skill tooltip design
- **Avoid:** Passive skill web complexity — Reincarnated's tree is grid-based, not freeform
- **Key insight:** Chain labels and tier headers make navigation obvious

### Path of Exile — poe.ninja passive trees
- **Borrow:** Color coding by skill type/element, scaling coefficient display
- **Avoid:** The 1500-node passive tree — we have 14
- **Key insight:** Show role abbreviation on nodes (DPS, CTRL, SUPP) for at-a-glance readability

---

## Analytics Dashboards

### Prydwen.gg (Honkai Star Rail)
- **Borrow:** Card-based stat summary at top, archetype tier lists, clean Recharts usage, mobile-responsive tabs
- **Key insight:** The "banner pull stats" model maps well to our "archetype distribution across seasons" — categorical + count
- **URL:** https://www.prydwen.gg

### poe.ninja (Path of Exile)
- **Borrow:** Build popularity distribution, league statistics, sparkline trend charts
- **Key insight:** Season timeline (our modifier compression chart) mirrors their league-over-league meta evolution view

### Maxroll.gg — character stats pages
- **Borrow:** Stat radar chart, gear slot grid layout, clean sidebar design
- **Key insight:** Radar charts for 5-stat distributions (str/dex/int/wis/vit) are highly readable at small sizes

---

## Specific Component References

| Component | Reference | What to Take |
|-----------|-----------|--------------|
| Skill node | Last Epoch Tools | Hexagonal or square tiles, 3 states (locked/available/invested), scaling coef badge |
| Detail panel | D4Planner skill tooltip | Effect list, cooldown/cost row, rank slider or +/- buttons |
| Stats radar | Prydwen character sheets | 5-axis radar, labeled, filled polygon for distribution |
| Bar charts | Recharts BarChart | Grouped bars for archetype comparison; stacked for tier composition |
| Donut chart | Recharts PieChart | Element distribution; label on hover rather than always-on |
| Scatter plot | Recharts ScatterChart | modifier spread per archetype; x=archetype, y=modifier value |
| Line chart | Recharts LineChart | Season timeline; x=season_id (chronological), y=avg_modifier |
| Gear grid | Maxroll.gg | 10-slot grid (2×5 or 5+5 layout), empty slot placeholder icon |

---

## Layout References

### Desktop single-scroll
- **Model:** Prydwen character page — hero section at top, analytics sections below, all in one vertical scroll
- **Nav:** Sticky top bar with section links; active state on current section

### Mobile tabs/swipe
- **Model:** Maxroll.gg mobile builds — bottom tab bar (or top segment control), each tab is a full-viewport section
- **Swipe:** Native CSS scroll-snap-type on a horizontal container; no JS library needed in v0

---

## Color Palette (v0: Neutral)

- Background: `gray-950` or `zinc-950` (very dark)
- Surface: `gray-900` / `zinc-900`
- Border: `gray-700`
- Text primary: `gray-100`
- Text secondary: `gray-400`
- Accent (interactive): `violet-500` (neutral enough to not clash with future class theming)
- Success/invested: `emerald-500`
- Locked: `gray-600`
- Warning (unconverged class): `amber-500`

This palette is chosen to not commit to any element color — fire, water, earth, wind can all be layered on top in v1 without requiring a full retheme.
