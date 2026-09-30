# Poker Legend

A story-driven poker RPG. You explore a top-down overworld between story beats,
and drop into a fully simulated Texas Hold'em engine whenever you sit down at a
table. You start broke at a friend's kitchen table and work up a ladder of
casino cities, risking real debt on the way.

**[Play it in your browser →](https://lnakai-osu.github.io/poker-legend/)**

## What's in it

- **A real poker engine.** Proper 52-card deck, correct hand evaluation,
  multi-way side pots, and a full betting-round state machine. Opponents decide
  using Monte Carlo equity estimation — the same technique real equity
  calculators use — with accuracy that degrades by skill tier.
- **Tells.** Opponents leak physical cues that correlate with their hand. Both
  how often a tell fires and how often it lies scale with skill, so a novice
  broadcasts honestly and an elite barely shows anything and misleads you when
  they do. The UI only ever shows the cue, never its meaning.
- **Six locations**, from a reservation casino at $1/$2 up to a $250/$500
  nosebleed game and a heads-up match for a penthouse.
- **Sponsors and collectors.** Take a stake, miss the deadline, and someone
  comes looking for you across the city grid.
- **A mentor** who teaches real, standard poker strategy — and each lesson
  unlocks the analytical tool a real player would use: position labels, pot
  odds and break-even equity, live hand reading, bankroll warnings.
- **Slots and craps** with honest odds (~92% RTP and the textbook 1.41% pass
  line house edge respectively), both verified by simulation in the test suite.

No art or audio files ship: the pixel sprites and every sound are generated at
runtime.

## Running it

```bash
npm install
npm run dev       # play at localhost:5173
npm test          # engine, content and balance tests
npm run test:ui   # browser suite (needs the dev server running)
```

## iOS

Capacitor wraps the same web build; the native project lives in `ios/`.

```bash
npm run ios:sync
npm run ios:open
```

Note: the iOS app has never been compiled or run — that needs a machine with
full Xcode. See `docs/TECHDESIGN.md`.

## Docs

- `docs/GDD.md` — design: narrative beats, systems, open questions
- `docs/TECHDESIGN.md` — architecture, content model, testing approach
- `docs/roadmap.pdf` — printable status roadmap
