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
- `overworld` is omitted for people who only ever sit at a table. Its optional
  `role` puts them in a uniform in the street, and `look` adds what a table
  portrait never shows (`trousers`, `shoes`, `lower: 'skirt'`, `sleeves`, and
  their own clothes: `garment: 'jacket' | 'vest' | 'hoodie' | 'overalls' |
  'stripes' | 'cardigan'` with `garmentColor`, `hat` with `hatColor`). A
  uniform covers a garment and decides its own hat.
- A point of interest on a map can say who stands there the same way:
  `role: 'bartender'`, `look: { hairStyle: 'bun' }`. Without them, the role
  comes from what the POI does and the look is made up from its id.
- **A persona is the same person somewhere else** — Vance one on one, Kit at the
  second table she finds you at. It is not a second character. Only the fields
  that change are written.
- **Chapters move people with the story.** `overworld.chapters` is a list of
  `{ when, schedule, lines? }`: a whole day somewhere else from the moment its
  conditions hold. The last chapter whose conditions hold replaces `schedule`,
  so the list reads as a timeline. This is how Dana is in the corner of every
  room you play and Marcus is at the rail for the match:

  ```ts
  chapters: [
    { when: [{ kind: 'chapter', cityId: 'riverbend' }],
      schedule: [{ period: 'evening', areaId: 'rb-boat', col: 19, row: 3 }] },
    { when: [{ kind: 'flag', flag: 'hasPenthouse' }],
      schedule: [{ period: 'night', areaId: 'pl-lift', col: 11, row: 4 }] },
  ],
  ```

  A character may keep no usual hours at all (Kit, Hal) and exist only in
  chapters. A POI whose id or name is a character's is drawn as that character,
  so Hal's two lesson stools share his face.
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
^^^^^^^^^^^^^^^^^^
^FFFFwwwwwwwwFFFF^
^FFFF,,,,,,,,FFFF^
^,,,,,,,,,,,,,,,,^
^^^^^^^^D^^^^^^^^^
```

A room is a wall top (`^`) round the edge, a back wall face along the top in
the room's own material (`w` panelling here), and a floor (`,` carpet). Every
character is listed in `TILE_VOCABULARY` in `src/overworld/tiles.ts`.

Anything bigger than a tile — a house, a slot bank, a poker table, a bed — is a
**stamp** listed in `AREA_STAMPS` at the bottom of `cities.ts`. A stamp lays its
own tiles into the map (the `FFFF` above is a slot bank) and is drawn as one
object over them. A wall on a street must belong to a building, a furniture tile
must belong to an object, and a door tile must lead somewhere; the content tests
fail otherwise.

A table's stamp lists its chairs (`seats`), and the game fills some of them —
never none, never all, since the open chair is yours. A table whose dealer deals
a game in `TABLES` seats that game's own players as themselves; any other table
seats strangers. Who sits where is worked out from the map by
`src/world/seating.ts`, never written down, so placing a table is all it takes.

Some stamps have several looks — every slot bank does — and two placed in one
room are drawn differently without being told to (`placementVariants` in
`src/overworld/stampArt.ts`). Placing the same bank twice gives two banks.
A room should not be one rug on a bare floor: the content tests fail on a
five-by-five square of floor with nothing on it, and its floor should not be
the same floor as another room in its town.

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

**Triggers:** `talkTo` (a character), `interact` (a fixture — the beat gets
first refusal over its action, and the next talk does the usual thing),
`enterArea` (walking in through a door, off an edge or off a bus; not loading a
save, not getting up from a table — unless it says `onLoad: true`, for a beat
that must happen before anything else there: the opening, or Marcus and Dana
the moment you get up from his table a winner. An `onLoad` beat is asked
whenever you find yourself somewhere without walking in, so a reload in the
middle of it starts it again), `caught` (the
collectors catch you: the beat plays with them standing over you, and the
shakedown follows its last line), `standOn` (typed and validated, **not yet
fired** by the overworld).

**Conditions** (all must hold): `flag`, `period`, `dayAtLeast`, `cashAtLeast`,
`hasItem`, `hasLesson`, `eventDone`, `chapter`, and the ones that let the story
see losing:

| Condition | Holds when | Example |
|---|---|---|
| `cashBelow` | you hold less than `amount` | `{ kind: 'cashBelow', amount: 100 }` — broke |
| `debt` | you owe a sponsor (or, with no `sponsorId`, anybody) `none`, `owing` (on time) or `overdue` (the stake was missed) | `{ kind: 'debt', sponsorId: 'cass', status: 'owing' }` |
| `hunted` | collectors are working the town you are in — anybody's, or one sponsor's | `{ kind: 'hunted', sponsorId: 'wen' }` |
| `challenge` | the match is `unplayed`, `lost` (she is making you wait), `rematch` (she will play you now) or `won` | `{ kind: 'challenge', status: ['lost', 'rematch'] }` |
| `count` | something has happened `atLeast`/`atMost` times (at least once by default; `atMost: 0` is never): `busted`, `challengeLost`, or a sponsor's `staked`, `repaid`, `missed`, `caught` | `{ kind: 'count', of: 'repaid', sponsorId: 'cass' }` |
| `canPay` | you owe this sponsor and hold enough to pay all of it now — the condition on a "pay her back" answer | `{ kind: 'canPay', sponsorId: 'cass' }` |

**The record.** The run remembers what has gone wrong, because nobody can talk
about a setback the state has forgotten: `record` in `state.ts` counts busts
(a session, shakedown or gamble that leaves you below `BUST_LINE`, the cheapest
seat on the ladder), matches lost, and for each sponsor the stakes taken,
repaid, missed and collected on. The mechanics count; beats read it with
`count`. A paid debt leaves the debt list but stays in the record.

**Flags** are a data list, `src/world/flags.ts`: each says what it means set
and clear, which is how the editor reads a condition out loud. Adding one is a
line there. `wonPokerNight`, `beatFinalRival`, `hasPenthouse`; `cameBack`, set
by a beat that marks climbing back from a setback (Ray's when you are back at
boat money after going broke; Marcus's after a rematch won); `marcusSeesYouOff`,
set while Marcus is seeing you off to Silver Creek (from Dana at your door the
night of the first game till he leaves you on the casino floor); and the flags
choices set (below): `metDana`, `askedDanaWhy`, `toldDanaToWatch`,
`brushedOffDana`, `askedNadiaWho`, `toldNadiaLeaveMarcus`, `trustsDana`,
`cutDanaOff`, `turnedDownMarcus`, `stakedKit`.

**The chapter** is how far up the ladder the run has got: the furthest town set
foot in, by bus or on foot (`chapterOf` in `state.ts`). `{ kind: 'chapter',
cityId: 'riverbend' }` holds from the moment you first walk into Riverbend until
you first walk into Crescent Harbor, whichever way you go afterwards. It is the
story's clock: town-specific beats ask for it, and characters' chapters key on
it. [STORYBOARD.md](STORYBOARD.md) is the whole run written against it.

**Actions**, in order: `dialogue`, `choice`, `if`, `moveNpc`, `movePlayer`,
`wait`, `setFlag`, `clearFlag`, `giveItem`, `giveCash`, `takeStake`, `repay`,
`unlockCity`, `unlockTable`, `startTable`, `startPokerNight`, `teleport`,
`ride`, `advancePeriod`, `advanceDay`, `playSound`, `fade`.

**Choices.** A `choice` puts a question to the player with two to four answers,
each a `label`, optional `conditions` (enough cash, a debt to pay) and `then`, the
branch it leads to — lines, flags, cash, a stake taken or repaid, a ride, a
table. Once the branch is done the event carries on after the question, unless
the branch sat you down at a table.

```ts
{
  kind: 'choice',
  speaker: 'kit',
  prompt: 'Stake Kit $10,000?',
  options: [
    {
      label: 'Stake him $10,000',
      conditions: [{ kind: 'cashAtLeast', amount: 10000 }],
      then: [{ kind: 'giveCash', amount: -10000 }, { kind: 'setFlag', flag: 'stakedKit' }],
    },
    { label: 'Not this time', then: [{ kind: 'dialogue', speaker: 'kit', lines: ['Kit: Fair.'] }] },
  ],
}
```

- An answer whose conditions do not hold is shown greyed out with why
  ("needs $10,000"), so the player sees the road not open to them — or left off
  the list with `hidden: true`. **Every choice keeps one answer with no
  conditions**, so there is always a way on; the tests fail otherwise.
- **A choice must change something a later beat reads.** A flag an answer sets
  has to be asked about by some other beat or character (`events.test.ts`), and
  the later beat says so with `if`: `{ kind: 'if', when: [conditions], then:
  [...], else: [...] }` plays one list or the other. Stakes and repayments are
  remembered by the record instead, which the sponsors' beats already read.
- On screen it is the table's pixel buttons, one under another, full width on a
  phone. Keys: an answer's number picks it; ↑ ↓ move the pointer and Enter or
  Space picks.

**People moving.** `moveNpc` walks somebody to a tile — or `to: 'player'`, the
free tile beside you nearest them — along the way a person would go, at
`pace: 'walk'` or `'run'`, and the beat waits until they are there. `from` brings
them on at a tile first (the end of the street) when they were not here;
`youFollow` has the player walk a step behind them; `leaves` has them go once
they get there (through the door they walked to). `movePlayer` walks you
somewhere. Somebody a beat has moved stays where it left them until you leave
the area. `teleport` and `ride` take `with: ['dana']`: they come along and stand
beside you at the other end.

**A ride you do not choose.** `ride` puts you on the 14 to an area and tile,
with `with` sat beside you and `during` — talk, pauses, quiet changes of state;
nothing that walks or changes scene — said on the way. There is no skip button,
and it ends when what is said has been said (and not before it has felt like a
ride). It costs the hour a ride across town always costs.

Rules:

- An event fires **once**, ever, unless marked `repeatable`. It is saved once it
  is over and never half-way: a reload in the middle of one puts you back
  where it started, and the beat has not happened.
- **At most one event per moment.** Two events sharing a trigger must have
  conditions that tell them apart — a flag one way and the other, hours or
  chapters that do not overlap, one waiting on the other with `eventDone`,
  cash at least one amount and below another, different debt or match
  statuses, different collectors, or counts whose ranges do not meet —
  and the tests fail otherwise, because declaration order is not a decision
  anybody made. `canBothFire` in `events.ts` is the rule; the tests and the
  editor share it.
- **A beat that carries you somewhere is still holding the screen when you
  arrive.** A `teleport` or `ride`, down any branch, and a beat for walking into
  that area must be told apart the same way — by the beat's own conditions as
  changed by what it did on the way. The opening sets `metDana` before it takes
  you to the depot, which is how it is told apart from the depot's own beat for
  anybody who arrives without her. `arrivalClashes` is the rule.
- **What a beat does has to make sense down every branch**: everybody and every
  table it names exists, everybody it walks somewhere can stand there, every
  question has a way on. `eventChecks.ts`, shared by the tests and the editor.
- **The street holds still while a beat plays.** Nobody moves, including a
  collector, until the last line is read — nobody but whoever the beat itself is
  walking. The keys and the d-pad do nothing until it is over.
- Actions that finish by themselves all run in one tick. `dialogue`, `choice`,
  `moveNpc`, `movePlayer`, `ride`, `wait` and `fade` suspend until something says
  to carry on. A walk the street cannot finish lands the walker where they were
  going after a while, so no beat can hang on one.
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

The light of the hour is worked out for every street, so every town gets an
evening without being drawn four times. Morning is left clear — it is the hour
the art is drawn for. In the evening the street goes warm and dim; at night it
goes a deep blue, the lamps and lit windows come on, and the Strip's sky glows
purple off its signs. The light is *multiplied* over the street, with a pool
under every lamp post and a halo round everything lit, and whatever glows is
drawn again above the dark, so a lit window is lit rather than merely bluer.
Rooms keep their lamps on whatever the hour.

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
everything) → Dana walks you home, and in the morning Marcus rides the bus out
to Silver Creek with you → the ladder → clubs and private
invitationals → a heads-up Challenge for the penthouse, which you commit to
before you see a card and cannot leave.

**The people.** Every town has an arrival card (what its table costs, what
bankroll moves you on) and a send-off from its face when you have it. Marcus,
Dana, Kit and Hal come up the ladder with you; somebody you know is in every
town, and the content tests hold it so. [STORYBOARD.md](STORYBOARD.md) is the
run act by act.

**The risk axis.** Sponsors stake you. A stake is a loan with a deadline in
days. Miss it and collectors hunt you in the town you are standing in. Skipping
town sets a grace period before they pick the trail back up, and a shakedown
buys three more days. Getting caught costs three quarters of your bankroll —
enough to hurt, not enough to end the run with nothing to rebuy with.

Every sponsor names its `collector`, a character: the face that stands beside
the sponsor while you owe on time, chases you down the street once the stake
runs out, and says its piece (a `caught` beat) before the shakedown. When
several stakes are past due, the one that ran out first sends the collector.

**Losing is part of the story.** No setback ends the run, and each one is met by
somebody who says what to do next. Below the cheapest seat (`BUST_LINE`,
$100) Marcus deals the kitchen table again, wherever he is; the bus home is
free and Basin's local bus passes the hours, so he can always be reached. A
lost match costs the buy-in and a week, and the people who followed you up
meet it. The content tests hold the kitchen table open in every chapter.
[STORYBOARD.md](STORYBOARD.md) §4 is the map of the losing paths.

**The help.** A mentor sells lessons in real, standard poker strategy — pot
odds, position, hand reading. They are teaching, not flavour.

---

## 4. How it looks and sounds

- **Overworld:** original pixel art in the spirit of LeafGreen. Every sprite and
  tile is **drawn at runtime from code** — there are no art assets in this
  repo. Drawings on a 16-unit grid scaled to a 32px tile with nearest-neighbour
  filtering. People are a tile wide and a tile and a half tall, drawn from their
  content: a character from their `look`, so the person in the street is the
  person at the table; a stranger from their id; their clothes from their
  `role` (dealer, officer, clerk…). Nobody wears a floating name — it shows when
  you are standing next to them.
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

**The editor.** `npm run dev`, then `localhost:5173/#editor`. Three tabs — Maps,
Characters, Events — show the content above (in the Events tab an answer's
conditions and branch, an `if`'s two ways and a ride's lines are edited as lists
inside the step, exactly like the event's own) and write it straight back to
`cities.ts`, `characters.ts` and `events.ts`. Each tab checks the content rules
as you type, and the save endpoint runs them again and refuses anything a test
would fail. A save rewrites only the text you changed: comments and hand layout
elsewhere in a character or event survive, and an unchanged save leaves the file
byte for byte as it was. Git is the undo. Code changes — a new kind of trigger,
a new rule — still go through [REQUESTS.md](REQUESTS.md).

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
