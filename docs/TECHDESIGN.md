# Poker Legend — Technical Design

Living doc, paired with `GDD.md`. Update as architecture decisions are made.

## Stack

- **Vite + React + TypeScript** for app shell, UI (menus, HUD, dialogue,
  shop screens).
- **PixiJS 8** for the overworld tile renderer. Runs inside a full-viewport
  `<canvas>` mounted from a scene component (e.g. `src/overworld/ApartmentScene.tsx`).
  The poker table view turned out cleaner as plain React/CSS (cards, buttons,
  chip counts) rather than Pixi — no art assets to justify a canvas there yet,
  and it's easier to keep accessible/testable.
- **iPhone delivery** via Capacitor, wrapping the same web build — no
  separate native codebase. Not wired up yet; deferred until the MVP loop is
  playable in-browser.
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
  game/         top-level shell: scene switcher, poker night UI, shared
                UI pieces (Card, DialogueBox)
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
5. **Bus → local casino overworld** — casino lobby map, low-stakes table
   entrance; slots/craps as static flavor only. *(not started)*
6. **Low-stakes table live** — real AI opponents at an appropriate skill
   tier, first version of the tell system. *(not started — tells' data model
   already exists in `engine/types.ts` as `TellSignal`, unused so far)*
7. **Economy pass** — cash tracking, buy-ins, a first shop, checkpoint/save
   formalized (likely `localStorage` for the browser build initially).
   *(not started)*

Phases beyond this (mid-tier cities, sponsor/debt/collector system, mentor,
whales, Vegas-parallel, Macau-parallel, endgame heads-up) are deliberately
not broken down yet — do that once the MVP loop is playable and reviewed.

## Testing notes

- Engine correctness is covered by vitest (`npm test`): hand ranking, pot
  splitting, and full simulated freezeout games checking chip conservation
  after every single action, not just at hand boundaries — that granularity
  is what caught the StrictMode/effect bugs above.
- There's no React component test setup yet (no React Testing Library). The
  three UI-wiring bugs above were only caught by actually driving the app in
  a real browser with Playwright, not by the unit suite. Worth considering
  adding component tests or keeping a Playwright smoke pass in the loop for
  future scene work, since effect-timing bugs like these don't show up in
  headless engine tests.

## Conventions

- Keep `src/engine/` free of any Pixi/React imports — it should be testable
  headlessly.
- Prefer plain Canvas-friendly data (positions, tile indices) over
  framework-specific state for anything that touches the render loop.
- Update this file's phase list as phases complete or get re-scoped; don't
  let it drift from what's actually built.
