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
ground drawn from its neighbours (kerbs, edges, per-town paving, animated
water), ~270 street-furniture stamps, six distinct roads between towns, and
evening/night lighting with lit windows, lamp pools and neon; a browser suite
that holds up under load; efficiency tooling. Tests at last check (main
cf565da): 352 unit, 52/52 browser, lint clean.

The round-1 critic scored the game 1.5/10 overall. Creators' own scores since:
buildings 7, casino floors 7.5, slots 7, interiors 7.5, characters 7, table
scene 8, streets/terrain 8, time of day 8 (1B). These are the creators' own
scores, not an independent critic's — round 2 should re-grade everything.

## In flight

Nothing. All agents have finished and their worktrees and branches are removed.

## Next, in order

1. **Round-2 critic** (sonnet, read-only): `scripts/shoot.mjs` contact sheets of
   every street, road, casino, interior and table, in morning/evening/night.
   Compare with the round-1 brief at
   `/private/tmp/claude-501/-Users-lanninnakai/4de48707-96de-4b74-8bb2-860c54d11252/scratchpad/critic-r1/BRIEF.md`
   (may be gone; the scores above are the baseline). Output: scores per
   category and the top 8 fixes.
2. **Creator round 2** (opus), scoped to what the critic found. Include these
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
   - 1B's known rough edges: the door-label plate on Lumina's Atelier covers
     some of its gold lettering; several shop doors and island-hotel windows
     have no/dim lit glass at night; no light spill onto the Mesa fountain
     water; the editor's stamp tray shows frame 0 only and has no night view,
     and the editor preview's per-cell drawing was not tested.
   - Editor tabs: no delete/rename for characters or events; tile positions are
     typed numbers with no click-on-map picker.
3. Repeat critic → creator while scores climb. Suggested stop: overall 8/10, or
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

## Round 2 (2026-10-20)

Critic r2 (sonnet) scored overall 7/10. Creator r2 fixed its top items (merged
to main, not pushed): Mesa frontage, quiet Mesa carpets, taller slots and fuller
floors, five shop floors, night rim light, one Hal face, gas station and Mesa
lay-by. Creator's own overall ~7.8; 356 unit, 52/52 browser. Left: Mesa casino
floor near the door is empty; slot banks repeat reel order; Outfitters slate
busy; Ultraviolet front plain; jackpot boards clipped by the HUD; editor
preview per-cell logic; door labels vs signs; worktree dev servers ignore
file changes (vite ignores .claude/). Next: round-3 critic, then stop and report.

## Round 4 creator (2026-10-21, branch worktree-agent-ac6068170dbae6dcd, not merged)

Critic r3 scored overall 7.2/10 and named four fixes; all four are done on the
branch:

1. **Mesa Casino floor** — the pit runs wall to wall (main table, heads-up,
   roulette, craps); the front is a slot bank either side of the door aisle
   with a new change booth (cashier inside) and a new WIN ME prize car between
   them; cacti at the sides; a croupier, cashier, cocktail waitress and tourist
   on the floor.
2. **Slot banks** — art can now have several looks (`StampArt.variants`); a
   placement is handed one by `placementVariants` (consecutive per room, offset
   by position, shared across every slot-bank stamp via `variantGroup`). A
   bank's look rotates its palette (4-5 colourways each), pairs or alternates
   machines, deals different reels/emblems and lights a different marquee
   (LUCKY 7, WILD, BONUS, HOT, DIAMOND, TRIPLE). The editor draws the same.
3. **People** — `PersonLook` gains `hat`/`hatColor` and `garment`/`garmentColor`
   (jacket, vest, hoodie, overalls, stripes, cardigan) and four haircuts (afro,
   pigtails, slick, shaggy). Strangers draw them from their id; only people in
   their own clothes (`local`, `kid`) wear them; a POI with a written face
   keeps exactly that face. The six street regulars got garments in data.
   Clerks behind counters are drawn to the belt at the counter's far edge
   (`NpcConfig.counter`), not a head over its front.
4. **Rooms** — four new floors (parquet, diamond lino, front-room carpet, navy
   saloon carpet) and nineteen small props (`src/overworld/art/propsArt.ts`).
   The seven named rooms are furnished to the walls; seven other rooms with a
   5x5 bare square got a prop or two. `src/world/rooms.test.ts` guards both.

Left: the cast still has many dealer-uniformed staff (by role, on purpose);
showroom middles are an aisle by design; the Lumina lobby and casino share
marble; no new tests for the people beyond the existing casting suite.

## Losing progression (2026-10-22, branch worktree-agent-a1af32883948641a8, not merged)

Losing is now part of the story: the state keeps a `record` of busts, matches
lost and each sponsor's stakes; events can ask `cashBelow`, `debt`, `hunted`,
`challenge` and `count`, fire on `caught`, and set `cameBack`. ~50 beats: the
kitchen table deals you back in wherever Marcus is when you are broke; each
sponsor notices owing/late/square and has a collector with a face and lines;
a lost match is met by Nadia, Marcus, Dana, Hal and Kit with a rematch path;
the rent pays off. STORYBOARD.md §4 is the map; GAME_BIBLE §2 the vocabulary.
Left: see STORYBOARD.md §6 (choices, a stake-sized home game, bust beats for
Deb/Rosa/the Fixer, collectors indoors).
