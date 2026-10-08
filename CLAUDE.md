# Poker Legend

**Read [docs/GAME_BIBLE.md](docs/GAME_BIBLE.md) first.** It states the rules of
this universe and the four kinds of content you write — characters, maps, events
and time. Nearly every request about this game is a change to one of those four.

## The short version

- Content is **typed TypeScript data**, not YAML and not code. The types are the
  schema; a bad reference is a compile error.
- **Adding content should mean adding data.** If a change needs a new component
  or a new branch in a view switch, the content model is probably missing
  something — say so rather than working around it.
- Sprites and tiles are **drawn at runtime from code**. There are no art assets.

## Commands

```
npm run dev         # dev server on :5173
npm run typecheck   # tsc -b --noEmit
npm test            # unit + content tests
npm run test:ui     # browser suite (needs the dev server running)
UI_ONLY="a,b" npm run test:ui   # just those scenarios, while fixing one
```

`tsc --noEmit` without `-b` is a **no-op** in this repo — the root tsconfig is a
solution file with `files: []`, so it checks nothing and exits 0. Always use
`npm run typecheck`.

## Verifying

The unit suite cannot see a chip drawn over a card, a seat overlapping its
neighbour, or a panel taller than the window. The browser suite can, and has
caught all three. **Check layout and scene changes in a real browser.**

When a test passes but the product is broken, suspect the test: more than once
here it encoded the bug, or compared `z-index` across stacking contexts instead
of hit-testing a pixel. Before trusting a new regression test, break the fix and
confirm the test fails.

Both suites are slow (unit ~6 min, browser ~8 min). Run them, but start them
early and do something else meanwhile.
