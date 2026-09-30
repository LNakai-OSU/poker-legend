# Poker Legend — Technical Design

Living doc, paired with `GDD.md`. Update as architecture decisions are made.

## Stack

- **Vite + React + TypeScript** for app shell, UI (menus, HUD, dialogue,
  shop screens).
- **PixiJS 8** for the overworld tile renderer. Runs inside a full-viewport
  `<canvas>` mounted by `src/overworld/OverworldScene.tsx`, which every city
  is rendered through.
  The poker table view is deliberately plain React/CSS (cards, buttons, chip
  counts) rather than Pixi — it reflows for phone widths and stays testable.
- **iPhone delivery** via Capacitor, wrapping the same web build — no separate
  native codebase. Scaffolded and syncing; see **iOS build** below for what
  still needs a machine with full Xcode.
- **Poker engine** (`src/engine/`) is plain TypeScript, framework-agnostic,
  unit-testable in isolation from rendering. Deck/shuffle/hand-eval logic
  must be correct against known probabilities before any UI work builds on
  top of it.

## Project Structure

```
src/
  engine/       poker engine: deck, shuffle, hand evaluation, betting rounds,
                pot/side-pot math, AI decision logic — no rendering/React code
  overworld/    Pixi-based tile maps, grid movement, NPCs, scene components
  game/         scene switcher, game state, progression rules, table and
                menu UI, save system
  world/        content data: cities, tables, shops, sponsors, missions,
                lessons (types.ts + content.ts)
  App.tsx       root component
docs/
  GDD.md        design doc (source of narrative/system truth)
  TECHDESIGN.md this file (source of architecture truth)
```

## Phase Roadmap (MVP)

1. **Scaffold** ✅ — Vite/React/TS project, PixiJS wired into a full-viewport
   canvas. GDD/TECHDESIGN docs in place.
2. **Apartment scene** ✅ — walkable room (`src/overworld/`) with grid-locked
   LeafGreen-style movement, an NPC (Marcus) with dialogue, triggers the
   poker-night scene transition.
3. **Poker engine core** ✅ — deck/shuffle/hand evaluation/side-pot math/full
   betting-round state machine in `src/engine/`, Monte Carlo AI decisions,
   unit-tested including a multi-seed AI-vs-AI fuzz simulation.
4. **Poker night loop** ✅ — playable 3-handed freezeout against Marcus and
   Dana (`src/game/PokerNightScene.tsx`); restart-on-loss, win ends the scene
   (casino transition is a stub — currently just returns to the apartment).
   Verified end-to-end with Playwright, which caught and led to fixes for:
   a stale-pot display bug, a React StrictMode double-deal bug that silently
   ate a blind round's chips, and an effect dependency bug that could stall
   the AI's turn. See `chipleak.test.ts` for the regression coverage.
5. **Bus → local casino overworld** ✅ — bus transition, then the
   Silver Creek casino as the first data-driven city.
6. **Tells & table depth** ✅ — `src/engine/tells.ts` rolls a read per
   opponent per street. Frequency *and* truthfulness both scale down with
   skill tier, so a novice leaks constantly and honestly while an elite
   rarely shows anything and lies when they do; whales leak honestly at any
   stake. The UI shows only the observable cue, never its meaning.
7. **Economy & persistence** ✅ — cash, buy-ins, shops, and checkpoint
   saving of the whole `GameState` (`src/game/save.ts`). Only hub scenes are
   checkpoints, so reloading mid-hand drops you to the last hub and forfeits
   chips on the table.

## Phases 8-12 (complete)

8. **Mid-tier cities** ✅ — Riverbend Landing, Crescent Harbor and Palm Cay,
   each with tables, shops, NPCs and missions.
9. **Sponsors, debt & collectors** ✅ — sponsors stake you against a
   deadline; days burn when you play a session or travel. Past due, a
   collector hunts you across the grid with greedy pursuit
   (`OverworldScene`'s chaser). Caught means losing everything you carry.
   Leaving town buys one day of grace, so fleeing delays rather than solves.
10. **Mentor & whales** ✅ — Hal teaches real, standard strategy and each
    lesson unlocks the corresponding tool: position labels, pot odds and
    break-even equity, live hand reading, bankroll warnings, sharper tell
    perception. Whales are an engine archetype: wild equity misjudgement,
    calling far below the break-even price, honest tells at any stake.
11. **Neon Mesa (Vegas-parallel)** ✅ — $25/$50 main game plus a
    dress-code-gated $100/$200 high roller room.
12. **Porto Lumina (Macau-parallel) & endgame** ✅ — $200/$400 nosebleed
    game and the $250k heads-up match against Nadia Okonkwo. Winning takes
    the penthouse and opens free play.

## Content model

Locations are data, not code. `src/world/content.ts` holds every city, table,
shop, sponsor, mission and lesson; `CityScene` renders any city and
`TableScene` runs any stake. Maps are ASCII sketches parsed by `parseMap`.
Adding a location should mean adding data, not components.

Content-integrity tests (`src/world/content.test.ts`) guard the things that
would otherwise break silently: every POI must have a walkable neighbour or it
can never be interacted with, every referenced id must resolve, the bankroll
and buy-in ladders must both increase, and the shops must be able to satisfy
every dress code in the game.

## Art

Sprites are generated at runtime rather than loaded as image files
(`src/overworld/sprites.ts`). Each is drawn on a 16x16 grid to an offscreen
canvas and scaled to the 32px tile size with nearest-neighbour filtering, which
is what produces the chunky GBA-era look without shipping any assets.

- Tiles (floor, wall, furniture, carpet, water, road) are patterned rather than
  flat, so large rooms don't read as blocks of colour.
- Characters are a single drawing routine with a swappable palette, generated
  per facing (4) and walk frame (2). A POI's accent colour becomes its
  character palette, so NPC art is derived from content data.
- Props (slot machine, craps table, shop counter, sign, lift) are chosen from
  the POI's `art` field, defaulting by action kind.

Textures are cached by palette/kind, so repeated NPCs cost nothing extra.

`tiles.ts` holds the pure tile data and `tileRenderer.ts` the rendering, because
sprites need `TILE_SIZE` and the renderer needs sprites — keeping constants in a
third module breaks what would otherwise be an import cycle.

## Mobile

The iPhone target needs more than a responsive layout, since the overworld is
keyboard-driven on desktop:

- `TouchControls` renders an on-screen d-pad and action button on coarse-pointer
  or narrow viewports. It drives the same movement and interaction paths through
  refs rather than synthesising keyboard events.
- Table and menu screens size with `clamp()` so a five-card board and four seat
  panels fit at 390px without horizontal scrolling.
- Verified at an iPhone 13 viewport: controls usable, no horizontal overflow,
  and the desktop experience unchanged (controls hidden, no page scroll).

## Audio

Every sound is synthesised at runtime with the Web Audio API
(`src/audio/audio.ts`) — no audio files ship, matching the sprite approach.
Cards and chips are filtered noise bursts, wins and losses are arpeggios, and
the music bed is a low drone plus sparse notes drawn from a scale that changes
with the scene ('overworld', 'table', and a faster, darker 'tense' set while
collectors are hunting you).

Browsers refuse to start audio before a user gesture, so the context stays
suspended and every call is a no-op until the first interaction unlocks it. The
mute preference persists in `localStorage`.

Verified by tapping the audio graph in a real browser rather than trusting the
API calls: an analyser mirrored onto the destination measured peak amplitude
rising from 0.04 (music only) to 0.108 (with effects), and falling to exactly 0
when muted while the context stayed running.

## Animation

Motion is CSS-driven for the UI and ticker-driven in the overworld:

- Cards deal in staggered and flip face-up at showdown; the pot bumps when it
  changes and winning seats pulse.
- Each tell animates the way its cue would move — a lip twitch jitters briefly,
  an arm shift drifts, chips tap, a glance fades in and out, and stillness
  simply arrives slowly.
- The overworld gives people an idle bob on individual phases, and a pulsing
  red vignette while you are being hunted.
- Scenes cross-fade on transition.

All of it collapses under `prefers-reduced-motion`.

## iOS build

Capacitor wraps the same web build — there is no separate native codebase.
`capacitor.config.ts` points at `dist`, and the native project lives in `ios/`
(committed; its copied web assets are generated and ignored).

```
npm run ios:sync   # build the web app and copy it into the native project
npm run ios:open   # open the project in Xcode to run or archive
```

Capacitor 7 uses Swift Package Manager rather than CocoaPods, so there is no
`pod install` step.

**What has been verified here:** the project scaffolds and `cap sync` copies the
build in; the production bundle (the exact payload the native app loads) runs
clean at an iPhone viewport with no failed requests or console errors; the
Swift sources parse; and `Info.plist` and `project.pbxproj` are valid.

**What has not:** the app has never been compiled, linked, or run. That needs
full Xcode, and this machine has only the Command Line Tools (and too little
free disk to install it). Treat the native target as unproven until someone
runs `npm run ios:sync && npm run ios:open` on a machine with Xcode and
launches it in a simulator.

## Conventions

- Keep `src/engine/` free of any Pixi/React imports — it should be testable
  headlessly.
- Prefer plain Canvas-friendly data (positions, tile indices) over
  framework-specific state for anything that touches the render loop.
- Update this file's phase list as phases complete or get re-scoped; don't
  let it drift from what's actually built.
