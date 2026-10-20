# Poker Legend

**Read [docs/GAME_BIBLE.md](docs/GAME_BIBLE.md) first.** It states the rules of
this universe and the four kinds of content you write — characters, maps, events
and time. Nearly every request about this game is a change to one of those four.

**Read [docs/REQUESTS.md](docs/REQUESTS.md) at the start of a session.** It is
where the user writes changes they want. Do any that are still `- [ ]`, tick
them, and note underneath what you did and anything you decided for them.

## The short version

- Content is **typed TypeScript data**, not YAML and not code. The types are the
  schema; a bad reference is a compile error.
- **Adding content should mean adding data.** If a change needs a new component
  or a new branch in a view switch, the content model is probably missing
  something — say so rather than working around it.
- Sprites and tiles are **drawn at runtime from code**. There are no art assets.

## Working efficiently

Every model call re-reads the whole conversation, so cost is roughly
**context size × number of calls**. Anything that enters context — a file, a
log, a screenshot — is paid for again on every later call.

- **Read narrowly.** `grep -n` and ranged reads. Never read a large file
  (`cities.ts`, the `art/` files) whole.
- **Logs go to a file.** Redirect test and build output, then `tail`/`grep`
  it. Never let a full suite's output into context.
- **Look at one contact sheet, not many screenshots.**
  `node scripts/shoot.mjs --areas a,b,c --periods morning,night --out DIR
  --sheet overview` gives one captioned image of every shot. Open a single
  shot only to inspect detail, and don't re-open ones you've already seen.
- **Iterate on narrow tests** (`npx vitest run <file>`, `UI_ONLY="…"`) and run
  the full suites once, at the end.
- **Batch.** One script that does ten steps beats ten tool calls.
- **Commit at every milestone.** An interrupted agent is cheapest to replace
  when its work is already committed.

Agents launched to work in a worktree follow
[docs/AGENTS.md](docs/AGENTS.md).

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
