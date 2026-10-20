# Agent playbook

How agents working on this repo set up, verify and hand back work. Prompts that
launch an agent should say "follow docs/AGENTS.md" instead of restating this.

## Setup (in a git worktree)

```
scripts/worktree-setup.sh <port>     # private node_modules + dev server on <port>
```

Ports: the main checkout serves :5173. Give each concurrent agent its own port
(5174, 5175, …), and never stop a server you didn't start.

## Commands

```
npm run typecheck                  # tsc -b --noEmit (plain `tsc --noEmit` checks nothing here)
npm run lint                       # oxlint, must report 0 errors
npx vitest run <file>              # while iterating
npm test > LOG 2>&1; tail -5 LOG   # once, at the end (~6 min)
UI_ONLY="a,b" npm run test:ui -- <port> > LOG 2>&1; tail LOG
npm run test:ui -- <port> > LOG 2>&1; grep -E "FAIL|passed$" -A1 LOG   # once, at the end
node scripts/shoot.mjs --port <port> --areas … --periods … --out DIR --sheet overview
```

The browser suite tolerates a busy machine, but if a scenario fails with a
timeout while other agents are running suites, re-run it alone with UI_ONLY
before believing it.

## Seeing the game

`scripts/shoot.mjs` seeds a save for any area and period and screenshots it.
`--editor` adds the whole map as the editor draws it, and `--sheet` composes
everything into one captioned contact sheet. Look at the sheet, not at the
individual files. Use a 960x640 viewport (the default). Larger shots cost more
to look at and show nothing new.

## Keeping cost down

Cost is roughly context size × number of calls (see CLAUDE.md). In practice:

- Read files with `grep -n` and ranges, never whole.
- Logs go to files.
- Look at one contact sheet per check, and crop or open single shots only for detail.
- Batch independent steps into one call or one script.
- Iterate on narrow tests.

Keep a task small enough to finish inside one usage window. A long task is
better as two agents than one agent resumed three times. A resume after a
long pause re-reads the whole context without the cache.

## Finishing

- Typecheck, lint (0 errors), `npm test` and the browser suite all green.
- Before trusting a new regression test, break what it guards and confirm it
  fails.
- Commit on the worktree's branch only. Never push, never touch main.
  Commit at every milestone.
- Commit messages: a short imperative title, then prose explaining why. End
  with the attribution line given in the launching prompt.
- Delete scratch scripts, keep them out of commits, and leave the tree clean.
- Report back:
  - the branch;
  - what was built;
  - the path of the contact sheet;
  - your own scores;
  - decisions made for the user;
  - anything unfinished.

## For whoever launches agents

| Role | Model | Why |
|---|---|---|
| Critic (looks and judges) | sonnet | Observation and a written brief; doesn't need the top model. |
| Creator (pixel art, systems) | opus | Craft and multi-file judgement. |
| Mechanical (merges, test runs) | the orchestrator itself | No agent needed. |

Run agents one or two at a time. They share one usage limit, so more in
parallel doesn't finish sooner; it just hits the limit sooner.

When an agent with a big context is cut off, don't resume it if most of its
work is committed. Launch a fresh agent pointed at its branch and the commit
log. A fresh agent's context is a fraction of the old one.
