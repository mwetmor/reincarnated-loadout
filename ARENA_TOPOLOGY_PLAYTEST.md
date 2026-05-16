# Arena Topology Playtest Findings
**Dispatch:** drax/v0.12-room-hallway-geometry-system  
**Date:** 2026-05-16  
**Status:** Implementation complete; runtime playtest pending Matt's visual inspection of live demo.

---

## What was implemented

The single-ellipse arena model has been retired and replaced with a room/hallway interior topology per gandalf canonical `canonical/story/arena-room-hallway-system.md`.

**New modules:**
- `src/world/topology.ts` — Room, Hallway, Door, Dungeon data structures; bounds clamping; linear dungeon builder; VS2a 7-room plan
- `src/world/aggro.ts` — per-room aggro state machine (dormant/active/cleared)
- `src/rendering/roomRenderer.ts` — rectangular room/hallway floor + wall rendering; camera variants; door threshold primitives

**Modified:**
- `src/world/movement.ts` — `clampToZone()` added; `tickPlayerMove`/`tickAIMove` now accept `clampFn` parameter; `clampToEllipse` removed from in-combat paths
- `src/main.ts` — full wiring: topology dungeon built per gauntlet; camera system; aggro trigger; AI room anchor cap; door activation/crossing

---

## VS2a 7-room linear dungeon layout

At 48 px/m (PIXELS_PER_METER canonical):

| Wave | Room | Variant | Size (px) | Width/Height (m) |
|------|------|---------|-----------|------------------|
| 1 | room_0 | default | 1440 × 1440 | 30 × 30 m |
| 2 | room_1 | default | 1440 × 1440 | 30 × 30 m |
| 3 | room_2 | default | 1440 × 1440 | 30 × 30 m |
| 4 | room_3 | small   |  720 ×  720 | 15 × 15 m |
| 5 | room_4 | large   | 2160 × 2160 | 45 × 45 m |
| 6 | room_5 | default | 1440 × 1440 | 30 × 30 m |
| 7 | room_6 | default | 1440 × 1440 | 30 × 30 m |

**Hallways (alternating narrow/wide for visual interest):**

| Index | Width (px/m) | Length (px/m) |
|-------|-------------|----------------|
| hw0 | 384 px / 8 m | 480 px / 10 m |
| hw1 | 288 px / 6 m | 672 px / 14 m |
| hw2 | 480 px / 10 m | 480 px / 10 m |
| hw3 | 384 px / 8 m | 768 px / 16 m |
| hw4 | 288 px / 6 m | 576 px / 12 m |
| hw5 | 480 px / 10 m | 480 px / 10 m |

All widths within the canonical 6–10m (288–480 px) band.

---

## Camera variant analysis

The canvas is 1800 × 944 px (CANVAS_WIDTH × CANVAS_HEIGHT).

| Room Variant | Width vs Canvas | Camera Behavior |
|---|---|---|
| Small (720px) | 720 < 1800 — fits | Fixed at room center. Full room visible with margin. |
| Default (1440px) | 1440 < 1800 — fits | Fixed at room center. Room visible with 180px margin on each side. |
| Large (2160px) | 2160 > 1800 — doesn't fit | Follow-camera: player-centered, clamped at room edges. |
| Hallway (288–480px wide) | All < 1800 — fits | Fixed at hallway center. Player visible with large margin. |

**Implication for playtest:** the default room (30m × 30m) fits within the 1800px canvas width with 180px margin on each side. The player always sees the full room. This is a visual upgrade from the prior ellipse (which visually clipped near the edges at 1568px). 

For the large boss room (Wave 5, 2160px), the camera follows the player — consistent with the canonical doc's spec for the large variant.

---

## AI engagement distance re-validation

**Values carried forward from v0.10 (locked at canonical/story/movement-speed-baseline.md):**
- Player: 360 px/s (7.5 m/s mid-game)
- AI: 276 px/s (5.75 m/s = 360 × 0.767)
- Chase margin: 84 px/s

**PREFERRED_RANGE and KITE_TRIGGER** were not changed in this dispatch (per canonical doc, movement-speed-baseline values are locked; engagement distance re-tuning is a follow-on).

**Room-size impact on engagement distances:**

| Room | Width | Long range (660px = 13.75m) vs room |
|------|-------|--------------------------------------|
| Small (720px) | 15m | 660px long-range would span ~92% of room width — AI at long range is near the wall. **Flag: long-range AI in small room will oscillate against room edge.** May need medium or close-only encounters in small rooms for VS2a. |
| Default (1440px) | 30m | 660px long-range = 46% of room width. Comfortable. |
| Large (2160px) | 45m | 660px long-range = 31% of room width. Comfortable with room to spare. |

**Recommendation for downstream tuning:**
1. Wave 4 (small room, mini-boss): assign mini-boss a 'close' or 'medium' range profile. Long-range AI in a 15m room will wall-hug uncomfortably.
2. Default room: current PREFERRED_RANGE values (90/420/660) feel appropriate; same concern as Case A from v0.10 applies (at 360 px/s player speed, the 30m room is more spacious than the prior ellipse — Case A cramping is resolved).
3. Large boss room (Wave 5): consider increasing PREFERRED_RANGE['long'] from 660 to ~900 px (18.75m) for the boss encounter to use the space effectively. This is a gamora/knight-rider design call, not a drax change.

---

## Pack movement patterns

**AI room-anchor cap:** implemented in `src/world/aggro.ts` via `shouldHaltPursuit()`. AI halts within 60px of room edge when player exits into hallway. Static halt behavior (no wander-back animation) is correct for VS2a per canonical doc.

**Kiting within rooms:** `tickAIMove` kiting logic (medium/long range retreat) is now bounded by `clampToRoom()`. AI cannot kite through walls. Predictable cap behavior at room edges.

**Dormant rooms:** AI does not tick when `aggroState === 'dormant'`. All enemies visible in spawn positions but motionless until player crosses room threshold. Consistent with "approach to engage" genre convention.

---

## Player traversal feel (estimated pre-playtest)

**Hallway traversal:**
- Narrowest hallway: 288px (6m) — at 48px/m this is 6 body radii wide (36px each side). Two combatants can pass side-by-side with margin. Should not feel constraining.
- Widest hallway: 480px (10m) — feels spacious; room for positional play if future enemy types patrol hallways (Phase 1+).
- Hallway length: 480–768px (10–16m). At 360 px/s player speed, traversal is 1.3–2.1 seconds. Should feel like a brief transition corridor, not a long march.

**Door Mode B (free traversal):** player can retreat from active room into hallway. AI halts at room edge. This creates the genre-standard "doorway kiting" opportunity — intentional per canonical doc.

---

## Open items for downstream tuning

1. **Long-range AI in small room (Wave 4):** pack composition should use close/medium range profiles for the mini-boss + adds in the 720px small room. Currently the gauntlet builder assigns range_profile from monster data — no override in this dispatch.

2. **PREFERRED_RANGE['long'] for large boss room (Wave 5):** candidate for 660→900px upward adjustment when the large room encounters are playtested. Requires knight-rider dispatch (engine engagement-distance design call).

3. **KITE_TRIGGER (300px) in default rooms:** at 30m room width (1440px), the 300px kite trigger fires when player is within 6.25m. This may cause ranged AI to back up into the far wall in a default room. Monitor during playtest.

4. **Room-entry transition timing:** the existing AI_ENGAGEMENT_WINDUP (0.7s) provides the reaction window after aggro triggers. The canonical doc says ~0.5s pan to orient player — the current implementation has no explicit pan (camera snaps to room center since all rooms fit in viewport). If Matt wants a slower entry pan, we can reduce CAMERA_SPEED from 8.0 to 2.0 temporarily on room entry.

5. **Ambient particles in dungeon:** the existing ambient particle system (`tickAmbientParticles`) is tied to the season; it does not know about room topology. Particles currently spawn across the full arena-layer container. In the new topology, ambient particles will drift across all rooms and hallways simultaneously (the dungeon is a large world coordinate space). This may look odd. Follow-on: scope ambient particles per-room or clip to player's current zone.

---

## Smoke test results

- `npm run build`: PASS (TypeScript clean, Vite 9.24s, no new errors)
- 60/60 new tests pass (topology, aggro, camera)
- 3 pre-existing failures in `tests/damage.test.ts` (unrelated — `rollAilmentApplies` return type change from prior dispatch; not introduced by this dispatch)

---

## Recommendations for knight-rider

1. **Pack composition by room variant:** the gauntlet builder (`encounter/gauntlet.ts`) does not currently know about room variants. For VS2a correctness, Wave 4 (small room, mini-boss) should use close/medium range profile monsters only. This is a content-design call — knight-rider to advise or author a follow-on dispatch.

2. **PREFERRED_RANGE['long'] bump for Wave 5 large room:** if the boss playtest shows the boss AI huddling at 660px in a 45m room, consider bumping to 900px. Requires Matt decision on engagement distance design.

3. **Pattern P6 WATCH item:** `canonical/story/p6-forward-audit-2026-05-16.md` § B10 V2 row is now resolved by this dispatch. Engine sim's sequential-room semantics have matching visual presentation. Knight-rider can close the WATCH item.

4. **VS2a integration gating:** this dispatch gives visual presentation to B10 V2 engine sim semantics. The "sequential-room sim + matching visual presentation" cohesion for VS2a is complete pending Matt's visual playtest.

— drax, 2026-05-16
