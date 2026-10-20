# Handoff — art-quality push (written 2026-10-20)

Read CLAUDE.md, then this. It is the state of an unfinished run, so a new
session can pick it up without the history.

## The standing request

The user wants the game's art and scenes at the quality of a released GBA
Pokémon game, with an extraordinary amount of detail: houses that look like
houses, detailed casinos and slot machines. Method: **GAN-style rounds** — a
critic agent screenshots and grades; a creator agent fixes the top findings;
repeat as far as the weekly allowance affords. The user is often away: work
autonomously, don't ask for approval, and if a usage limit hits, resume as soon
as it resets. They also want token-efficient work (see CLAUDE.md and
docs/AGENTS.md; critics on sonnet, creators on opus, one or two agents at a
time).

## Where main stands (pushed)

Merged: editor tabs for characters and events (#editor/characters,
#editor/events); 16x24 character sprites with roles and a walk cycle; 48
drawn buildings, 8 slot-machine variants, a floor plan of its own for every
casino and 26 interiors; the poker table as a GBA scene in ten themed rooms;
a browser suite that holds up under load; efficiency tooling. Tests at last
check: 326 unit, 52/52 browser.

The round-1 critic scored the game 1.5/10 overall. Creators' own scores since:
buildings 7, casino floors 7.5, slots 7, interiors 7.5, characters 7, table
scene 8. Streets/terrain and night were the weakest; agent 1B is on those.

## In flight

**Agent 1B** — branch `worktree-agent-a908a0cb98da20c16`, worktree
`.claude/worktrees/agent-a908a0cb98da20c16`, dev server :5175. Ground drawn from
its neighbours with edges and variants, street furniture, per-town roads, and
evening/night lighting (lit windows, lamp pools, neon). Told to finish and
commit items 1–4 only and report. Merge it when it reports
(`git merge --no-ff`, then typecheck, lint, `npm test`, `npm run test:ui`).
If it was cut off: check `git log main..<branch>`, and if most of the work is
committed, launch a fresh agent on that branch rather than resuming.

## Next, in order

1. Merge 1B. Remove its worktree and branch once merged.
2. **Round-2 critic** (sonnet, read-only): `scripts/shoot.mjs` contact sheets of
   every street, road, casino, interior and table, in morning/evening/night.
   Compare with the round-1 brief at
   `/private/tmp/claude-501/-Users-lanninnakai/4de48707-96de-4b74-8bb2-860c54d11252/scratchpad/critic-r1/BRIEF.md`
   (may be gone; the scores above are the baseline). Output: scores per
   category and the top 8 fixes.
3. **Creator round 2** (opus), scoped to what the critic found. Include these
   known leftovers:
   - Content polish in `src/world/cities.ts`: `hal` and `hal-mesa` are one man
     but have two faces; the `marcus-dana` POI should reuse the `dana`
     character; set roles explicitly (Mr Patel → clerk, lifeguard look, the
     marina's boat "Dealer" → suit); check the note, signs, gull, fruit stall
     and viewpoint render as objects.
   - The map editor's preview should draw through the game's per-cell logic so
     variants, edges and carpets match the game.
   - Mesa casino carpet is too loud (1B was asked to tone it down; check).
   - Door labels can vanish against a building's sign.
   - Table scene: rooms are static (no neon flicker/water shimmer), tall phones
     show plain wall above the table, ♣/♠ glyphs are rough at 5px, menus/HUD/
     dialogue box still use the system font.
   - Editor tabs: no delete/rename for characters or events; tile positions are
     typed numbers with no click-on-map picker.
4. Repeat critic → creator while scores climb. Suggested stop: overall 8/10, or
   three rounds, whichever comes first. The user has not set one, so say what
   was done and what it cost rather than looping indefinitely.

## Facts worth knowing

- Everything is drawn at runtime from code; there are no art assets. Stamps
  (objects) are `{ stampId, col, row }` in `AREA_STAMPS` (src/world/cities.ts);
  tiles come from `TILE_VOCABULARY` (src/overworld/tiles.ts), which the parser,
  editor palette and save endpoint all read.
- `npm run typecheck`, not `tsc --noEmit` (a no-op here).
- Main serves :5173. `scripts/worktree-setup.sh <port>` sets up an agent's
  worktree. vitest and the dev server ignore `.claude/`.
- Unexplained once: `PALM_CAY_TOWN` in cities.ts was found modified during the
  stamp work and could not be reproduced. Git is the undo; commit before long
  editing sessions.
- The iOS build is blocked on Xcode (not installed; ~20GB free needed).
- Earlier known-unfixed items: tutorial coaching goes quiet after hand 1; bet
  sizing is lumpy at micro stakes. (The action-button wall on phones may be
  resolved by the table redesign — check.)
