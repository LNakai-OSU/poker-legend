# Poker Legend — Technical Design

Living doc, paired with `GDD.md`. Update as architecture decisions are made.

## Stack

- **Vite + React + TypeScript** for app shell, UI (menus, HUD, dialogue,
  shop screens).
- **PixiJS 8** for the overworld tile renderer and (eventually) the table
  scene's visual layer. Runs inside a single full-viewport `<canvas>` mounted
  from a React component (`src/game/GameCanvas.tsx`).
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
                AI decision logic, tell generation — no rendering/React code
  overworld/    Pixi-based tile maps, player movement, scene transitions
  game/         top-level shell: GameCanvas mount, scene/state orchestration
  App.tsx       root component
docs/
  GDD.md        design doc (source of narrative/system truth)
  TECHDESIGN.md this file (source of architecture truth)
```

## Phase Roadmap (MVP)

1. **Scaffold** *(this phase)* — Vite/React/TS project, PixiJS wired into a
   full-viewport canvas, boots and renders a placeholder scene. GDD/TECHDESIGN
   docs in place.
2. **Apartment scene** — single walkable room (Pixi tile map + player sprite
   + basic collision), friend NPC that triggers the poker-night invite.
3. **Poker engine core** — deck/shuffle/hand evaluation/betting rounds in
   `src/engine/`, unit-tested against known odds, no UI yet.
4. **Poker night loop** — playable game against friend AI using the core
   engine; restart-on-loss checkpoint logic wired to the scene/state layer.
5. **Bus → local casino overworld** — casino lobby map, low-stakes table
   entrance; slots/craps as static flavor only.
6. **Low-stakes table live** — real AI opponents at an appropriate skill
   tier, first version of the tell system.
7. **Economy pass** — cash tracking, buy-ins, a first shop, checkpoint/save
   formalized (likely `localStorage` for the browser build initially).

Phases beyond this (mid-tier cities, sponsor/debt/collector system, mentor,
whales, Vegas-parallel, Macau-parallel, endgame heads-up) are deliberately
not broken down yet — do that once the MVP loop is playable and reviewed.

## Conventions

- Keep `src/engine/` free of any Pixi/React imports — it should be testable
  headlessly.
- Prefer plain Canvas-friendly data (positions, tile indices) over
  framework-specific state for anything that touches the render loop.
- Update this file's phase list as phases complete or get re-scoped; don't
  let it drift from what's actually built.
