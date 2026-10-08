# Poker Legend — Game Bible

The rules of this universe, and the four things you write to change it.

This is the front door. [GDD.md](GDD.md) holds the original design intent and
the open questions; [TECHDESIGN.md](TECHDESIGN.md) holds the architecture and
build history. Where any of the three disagree, **this document wins** — and
where this document disagrees with the code, the code wins and this document is
out of date, so fix it.

---

## 1. What this game is

A story-driven poker RPG. You walk a connected, Pokémon-style top-down world
between beats, and sit down at a table that is a real poker simulation — real
deck, real odds, real opponents. You start broke in a flat above a bakery and
climb a ladder of towns until somebody puts a penthouse on the table.

Browser first, iPhone via Capacitor from the same build.

### The rules of the universe

These hold everywhere. Content that breaks one of them is a bug, and most of
them are enforced by tests rather than trusted.

1. **The poker is never fudged.** Real 52-card deck, real shuffling, real hand
   evaluation. The game never adjusts the odds for drama. If a hand is a
   cooler, it is a cooler.
2. **Difficulty is skill, not luck.** A harder table is better opponents —
   tighter ranges, better bet sizing, more reliable hand reading — never worse
   cards for the player.
3. **The world is one continuous place.** Towns join at their edges and you
   walk between them. A door leads inside a building; a road is never a door.
   The bus is a shortcut across a world you could also walk.
4. **Days are the scarce resource.** Debts come due on a day count and a
   session at a table costs a day. Time pressure is the game's only real
   antagonist, so nothing may quietly hand the player more days.
5. **Nothing costs money without doing something.** Every item on sale has an
   effect; every meal buys something; a cash sink with a sentence attached is
   a bug.
6. **Nobody is a palette swap.** Two towns may not be the same room in another
   colour, and two opponents may not be the same bot with different captions.
7. **The player is never stranded.** Every point of interest has somewhere to
   stand next to it, every door has somewhere to stand in front of it, and
   every area is reachable on foot from where the player starts.

---

## 2. The four things you write

Everything below is **typed TypeScript data**, not YAML and not code. The types
are the schema: a bad reference is a compile error, and the content tests catch
what types cannot — reachability, ladders, duplicate moments.

### Characters — `src/world/characters.ts`

One person, written down once. Their name, face, the line under their name at a
table, what they say while they play, the seat they take when they sit down, and
where they are through the day.

```ts
deb: {
  name: 'Deb',
  style: 'Been here longer than you.',
  look: { skin: '…', hair: '…', hairStyle: 'tied', shirt: '…', accessory: 'none' },
  seat: { skillTier: 'amateur', archetype: 'regular' },
  lines: { greeting: ['Deb: …'], raise: ['Deb: …'], … },
  personas: { headsUp: { style: '…', lines: { greeting: ['…'] } } },
  overworld: {
    lines: ['Deb: Been here longer than you.'],
    schedule: [
      { period: 'morning', areaId: 'rb-street', col: 9, row: 7, lines: ['…'] },
      { period: 'evening', areaId: 'rb-street', col: 9, row: 7, lines: ['…'] },
    ],
  },
},
```

- `seat` is omitted for people who never play.
- `overworld` is omitted for people who only ever sit at a table.
- **A persona is the same person somewhere else** — Vance one on one, Kit at the
  second table she finds you at. It is not a second character. Only the fields
  that change are written.
- A table seats characters by id: `opponents: ['deb', 'mack', 'tiny']`, or
  `{ character: 'vance', persona: 'headsUp' }`.

### Maps — `src/world/cities.ts`

A town is a set of **areas**. An area is one walkable space: a street, a shop
interior, a casino floor. Areas join two ways:

- **Edges** — `edges: { east: { toAreaId: 'depot', offset: -2 } }`. You walk off
  one side and onto the next map, keeping your place along the shared side.
  This is how streets and towns join. No transition, nothing to step on.
- **Doors** — `exits: [{ col, row, toAreaId, toCol, toRow, label }]`. Only for
  going inside a building. You stop in front of a door and it takes you through;
  you never stand on it.

The map itself is an ASCII grid parsed by `parseMap`. It is diffable, reviewable
and editable by hand:

```
##################
#,,,,,,,,,,,,,,,,#
#,FFFF,,,,,,FFFF,#
########D#########
```

### Events — `src/world/events.ts`

A scripted beat: when it happens, what has to be true, what then occurs.

```ts
{
  id: 'poker-night',
  about: "Marcus's Friday game: the one that starts the campaign.",
  trigger: { kind: 'talkTo', characterId: 'marcus' },
  conditions: [
    { kind: 'flag', flag: 'wonPokerNight', set: false },
    { kind: 'period', period: ['afternoon', 'evening', 'night'] },
  ],
  actions: [
    { kind: 'dialogue', speaker: 'marcus', lines: ['Marcus: You made it!'] },
    { kind: 'startPokerNight' },
  ],
}
```

**Triggers:** `talkTo` (a character), `interact` (a fixture), `enterArea`,
`standOn`.

**Conditions** (all must hold): `flag`, `period`, `dayAtLeast`, `cashAtLeast`,
`hasItem`, `hasLesson`, `eventDone`.

**Actions**, in order: `dialogue`, `moveNpc`, `wait`, `setFlag`, `clearFlag`,
`giveItem`, `giveCash`, `unlockCity`, `unlockTable`, `startTable`,
`startPokerNight`, `teleport`, `advancePeriod`, `advanceDay`, `playSound`,
`fade`.

Rules:

- An event fires **once**, ever, unless marked `repeatable`.
- **At most one event per moment.** Two events sharing a trigger must have
  conditions that tell them apart; the tests fail otherwise, because
  declaration order is not a decision anybody made.
- Actions that finish by themselves all run in one tick. `dialogue`, `wait` and
  `fade` suspend until something says to carry on.
- `startTable` and `startPokerNight` end the event — what follows is the table,
  and there is nobody left in the street to say the next line to.

### Time — `src/game/time.ts`

A day has four periods: `morning`, `afternoon`, `evening`, `night`.

**The hour is not what the economy is denominated in.** Days are the scarce
resource (rule 4). Periods move on the things that cost no days at all — a bus
ride across town, an hour over a meal — so passing time buys you *somewhere to
be*, not more time to play. Anything that costs a day puts you in the next
morning.

A character's `schedule` says where they are at each period. It is looked up per
area and per hour, not simulated: a schedule is a statement about where somebody
*is*, not a model of them walking there. It costs nothing while you are not
looking and cannot drift out of step with the clock.

The light of the hour is laid over the whole map, so every town gets an evening
without being drawn four times. Morning is left clear — it is the hour the art
is drawn for.

---

## 3. The shape of a run

**The ladder.** Six towns, in order, each gated on bankroll:

| # | Town | Bankroll gate | Tables |
|---|---|---|---|
| 0 | Basin (home) | — | Marcus's home game |
| 1 | Silver Creek | $0 | Low Stakes 1/2 |
| 2 | Riverbend Landing | $600 | Riverboat 2/5 |
| 3 | Crescent Harbor | $2,500 | Harbor Room 5/10 · Heads Up 5/10 · The Back Room 10/20 |
| 4 | Palm Cay | $8,000 | Cay Room 10/25 · The Tourist Table 10/25 |
| 5 | Neon Mesa | $30,000 | Mesa Main 25/50 · Heads Up 50/100 · High Roller 100/200 · The Invitational 200/400 |
| 6 | Porto Lumina | $90,000 | Nosebleed 100/200 · The Challenge, heads up, 50/100 |

The Back Room and The Invitational are invite-only: you get in by working the
room at a club, not by walking up.

Each stop raises both the bankroll gate and the stakes; the content tests fail
if either stops climbing.

**The beats.** Flat above a bakery → Marcus's home game (winner takes
everything) → the bus out to Silver Creek → the ladder → clubs and private
invitationals → a heads-up Challenge for the penthouse, which you commit to
before you see a card and cannot leave.

**The risk axis.** Sponsors stake you. A stake is a loan with a deadline in
days. Miss it and collectors hunt you in the town you are standing in. Skipping
town sets a grace period before they pick the trail back up, and a shakedown
buys three more days. Getting caught costs three quarters of your bankroll —
enough to hurt, not enough to end the run with nothing to rebuy with.

**The help.** A mentor sells lessons in real, standard poker strategy — pot
odds, position, hand reading. They are teaching, not flavour.

---

## 4. How it looks and sounds

- **Overworld:** original pixel art in the spirit of LeafGreen. Every sprite and
  tile is **drawn at runtime from code** — there are no art assets in this
  repo. 16×16 drawings scaled to a 32px tile with nearest-neighbour filtering.
  A character's palette comes from their content data.
- **Table:** a different visual language — an oval felt, opponents round the
  rim, you at the rail, chips as physical stacks. Avatars carry an *expression*
  driven by what is happening in the hand.
- **A seat is a fixed size.** Nothing inside it may change how much of the felt
  it takes, or it writes itself across its neighbour's cards.
- **Key moments announce themselves over the felt** and fade. The game does not
  stop to make you dismiss a panel.

---

## 5. Working on this

**Adding content should mean adding data.** If a change needs a new React
component or a new branch in a view switch, that is a signal the content model
is missing something — say so rather than working around it.

**The content tests are the specification.** `src/world/content.test.ts` and
`src/world/events.test.ts` encode the rules above: reachability, door frontage,
edge symmetry both ways, the ladders climbing, every id resolving, nobody
standing in a wall, no two events fighting over a moment. They have repeatedly
caught real mistakes before the game was ever launched.

**Commands:**

```
npm run dev         # dev server on :5173
npm run typecheck   # tsc -b --noEmit  (plain `tsc --noEmit` is a NO-OP here)
npm test            # unit + content tests
npm run test:ui     # browser suite, needs the dev server
UI_ONLY="…" npm run test:ui   # one or more scenarios, comma separated
```

**Verify in a real browser.** The unit tests cannot see a chip drawn over a
card, a seat overlapping its neighbour or a panel taller than the window. The
browser suite can, and has.

---

## Open questions

- Depth of slots and craps. Currently ambient flavour.
- Audio direction beyond the current ambient tracks and cues.
- Character customisation: appearance only, or traits that matter?
- Whether time pressure should tighten — sessions costing a period rather than a
  day, with debt windows rescaled to match. Deliberately not done; see §2 Time.
- iOS build is blocked on Xcode being installed locally.
