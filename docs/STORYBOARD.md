# Poker Legend — Storyboard

The run from the flat above the bakery to the penthouse, beat by beat: who
carries the player through each town, what the town wants from them, and what
changes when they leave. [GAME_BIBLE.md](GAME_BIBLE.md) holds the rules this
obeys; this document is the story written against them.

Every beat here is data: an event in `src/world/events.ts`, a character or a
chapter of their schedule in `src/world/characters.ts`, or a POI in
`src/world/cities.ts`. Status marks: **built** is in the game, **proposed** is
designed but not written yet.

---

## 1. The spine

**Logline.** You climb from Marcus's kitchen table to Nadia Okonkwo's
penthouse, and three people come up the ladder with you: the friend you leave
behind, the woman who has been watching you for somebody else, and the rival
who is always one town ahead — until she isn't.

**Three pulls, at three distances.**

| Distance | What pulls | Where it is said |
|---|---|---|
| Short — this town | The bankroll that buys the next ticket, stated when you arrive and acknowledged when you have it | an arrival beat and a send-off beat in every town |
| Mid — a thread | A rival (Kit), a debt (Cass → Emeka → Consortium → Wen, worn by Kit), a mentor (Hal) | at least one in every town |
| Long — the Challenge | The penthouse in Porto Lumina, and the woman who has kept it four years | named in Basin by Marcus, again by Kit, Hal, Dana, and every arrival card from the Mesa on |

**The chapter.** The story's clock is how far up the ladder the run has got:
the furthest town the player has set foot in, on foot or by bus. Characters
move town to town by chapter (`chapters` in their overworld presence), and
beats ask for it (`{ kind: 'chapter', cityId }`). Going back down the ladder
does not rewind the story: Ray is still at Silver Creek, but Dana has moved on.

---

## 2. The recurring cast

| Who | Role | Basin | Silver Creek | Riverbend | Crescent Harbor | Palm Cay | Neon Mesa | Porto Lumina | After |
|---|---|---|---|---|---|---|---|---|---|
| **Marcus** | Friend, the heart. Ends at the penthouse. | host | — | — | — | on holiday | — | at the rail | upstairs |
| **Dana** | The watcher. Nadia's scout; the reveal. | watching | casino corner | riverboat bar | supper club | casino, nights, keeping out of Marcus's way | Ultraviolet | casino floor | lift lobby |
| **Kit** | Rival, one town ahead; the debt made flesh. | — | heard of | on the dock | outside the Harbour Room | at the tables | on the Strip, owing | broke, hunted | asks you for a stake |
| **Hal** | Mentor. Taught Nadia once. | — | — | — | lessons | — | lessons | the eve of the match | upstairs |
| **Nadia** | Final rival. | named | — | named | named | — | hinted | the match | — |
| Sponsors | Cass, Mr. Emeka, the Consortium, Madame Wen | — | — | Cass | Emeka | — | Consortium | Wen | — |

Dana appears in all seven towns, Kit in five, Marcus in three (and the
penthouse). Every town has at least one of Dana or Kit; the content tests hold
it to that.

**Arcs in one line each.**

- **Marcus** — stuck → proud → visits to check it is real → watches → hosts the
  Friday game at the penthouse ("winner hosts").
- **Dana** — silent at the table → turns up wherever you go → *I'm the someone*:
  she has written Nadia a letter from every room you played in → stays on as
  your scout.
- **Kit** — a rumour → a sneer on the dock → a door ahead of you → takes the
  Consortium's money → loses to Nadia in forty hands, hunted → asks you, now the
  one with money, for a stake. Kit is what the debt mechanic looks like when it
  happens to somebody.
- **Hal** — sells lessons → names Nadia, his old student → "after the Mesa it is
  just her" → turns up the night before anyway, with the one heads-up lesson he
  never sold.

---

## 3. The run, act by act

Each act: the town's face, its want (short-term goal), its problem, its thread,
its payoff, and the emotional turn. Then the beats, in the order a player meets
them.

### Act 0 — Basin (home) · gate: win Marcus's game

- **Face:** Marcus. **Want:** the Friday game. **Problem:** broke, rent due in
  nine days. **Thread:** Dana watching. **Payoff:** you take the whole table.
- **Turn:** stuck → leaving.

| Beat | Who / where | Trigger | Conditions | Event id | Status |
|---|---|---|---|---|---|
| Rent, the note on the table | Your apartment | POI lines | — | `apartment-window`, `apartment-note` (POIs) | built |
| "Tonight. My place." | Marcus, Basin Street, morning | talkTo marcus | not wonPokerNight, morning | `marcus-reminds-you` (repeatable) | built |
| The Friday game | Marcus's place, afternoon on | talkTo marcus | not wonPokerNight | `poker-night` → poker night | built |
| **The casino nudge.** Marcus, cleaned out and proud, sends you to Silver Creek and tells you the Porto Lumina story — the long pull is planted | Marcus | talkTo marcus | wonPokerNight, chapter Basin | `marcus-sends-you-off` | built |
| Dana takes your measure; "I'll be around" | Dana | talkTo dana | wonPokerNight, chapter Basin | `dana-takes-your-measure` | built |

### Act 1 — Silver Creek · gate: $600 for the riverboat

- **Face:** Ray, who has been "due" for thirty years. **Want:** turn a $100
  buy-in into boat money. **Problem:** the room eats people. **Thread:** rival —
  Kit is a rumour here. **Payoff:** Ray sends you on.
- **Turn:** hope → seeing what staying looks like → leaving a man behind.

| Beat | Who / where | Trigger | Conditions | Event id | Status |
|---|---|---|---|---|---|
| Arrival card: the table, the buy-in, the $600 that buys the boat | Valet, Silver Creek Approach | enterArea sc-street | — | `arrive-silvercreek` | built |
| Ray's thirty years | Ray, street | talkTo ray | chapter Silver Creek | `ray-is-due` | built |
| Dana in the corner; Kit cleaned this table out last month | Dana, casino floor, evening/night | talkTo dana | chapter Silver Creek | `dana-silvercreek` | built |
| Send-off: "That is boat money." | Ray | talkTo ray | chapter Silver Creek, after `ray-is-due`, cash ≥ $600 | `ray-sees-you-off` | built |

### Act 2 — Riverbend Landing · gate: $2,500 for the Harbor

- **Face:** Deb. **Want:** be taken seriously (Deb's *Prove It*). **Problem:**
  first debt — Cass offers rope. **Thread:** rival met; debt introduced.
  **Payoff:** Deb's respect.
- **Turn:** an outsider → somebody the boat knows.

| Beat | Who / where | Trigger | Conditions | Event id | Status |
|---|---|---|---|---|---|
| Arrival card; "a kid on the dock was asking after Marcus's friend" | Deckhand, the Landing | enterArea rb-street | — | `arrive-riverbend` | built |
| **Kit, on the dock**, leaving: names himself, the ladder, the penthouse; dares you to take Cass's money | Kit, the Landing, morning/afternoon | talkTo kit | chapter Riverbend | `kit-on-the-dock` | built |
| Deb on Kit: "people like that don't stay anywhere" | Deb, the Landing | talkTo deb | chapter Riverbend | `deb-on-kit` | built |
| Deb's test: win five pots | Deb, the diner | mission | — | `riverbend-marker` (mission) | built |
| Cass's stake; the deckhand's warning | Cass, the Landing | sponsor | — | `cass` (sponsor) | built |
| Dana at the riverboat bar: "I write letters. Someone likes to read about the games." | Dana, riverboat, evening/night | talkTo dana | chapter Riverbend | `dana-riverbend` | built |
| Send-off: "Harbor money." | Deb | talkTo deb | chapter Riverbend, after `deb-on-kit`, cash ≥ $2,500 | `deb-sends-you-on` | built |

### Act 3 — Crescent Harbor · gate: $8,000 for the island

- **Face:** Hal. **Want:** the room that knows your name (suit, club, Back
  Room). **Problem:** you are neither dressed nor known. **Thread:** mentor;
  rival a door ahead; Mr. Emeka's money. **Payoff:** the Back Room, Hal's
  blessing.
- **Turn:** learning that the game has a theory, and that the woman at the top
  learned it from the same man.

| Beat | Who / where | Trigger | Conditions | Event id | Status |
|---|---|---|---|---|---|
| Arrival card: five-ten, a suit, a name, the Back Room | Woman in a Suit, Harbor Boulevard | enterArea ch-street | — | `arrive-crescent` | built |
| **Hal's first lesson** — he taught Nadia Okonkwo; start with position | Hal | interact hal | — | `hal-first-lesson` | built |
| Kit outside the Harbour Room: already through the Back Room door; practise heads up on Vance | Kit, Harbor Boulevard, evening/night | talkTo kit | chapter Harbor | `kit-harbor` | built |
| Dana at the supper club: Hal taught her too; she stopped playing and started watching | Dana, supper club, evening | talkTo dana | chapter Harbor | `dana-harbor` | built |
| The suit, the doorman, the seamstress; Vance heads up; the Back Room invite | various | missions, venue, tables | — | existing | built |
| Send-off: "The island will have you. Take the tells lesson before the Mesa." | Hal | interact hal | after `hal-first-lesson`, cash ≥ $8,000 | `hal-sends-you-on` | built |

### Act 4 — Palm Cay · gate: $30,000 for the Mesa

- **Face:** Rosa, and the whale she points you at. **Want:** Bernard's stack.
  **Problem:** Kit is at your table, and home has come to see you. **Thread:**
  rival face to face; the friend at the midpoint. **Payoff:** Rosa's cut;
  Marcus goes home believing it.
- **Turn:** the midpoint mirror — Marcus sees who you have become, and Kit
  decides to borrow her way to the top.

| Beat | Who / where | Trigger | Conditions | Event id | Status |
|---|---|---|---|---|---|
| Arrival card; "somebody from your home town was asking for you" | Lifeguard, Cay Promenade | enterArea pc-street | — | `arrive-palmcay` | built |
| **Marcus on holiday**: "I wanted to see if it was true." | Marcus, promenade / grill | talkTo marcus | wonPokerNight, chapter Palm Cay | `marcus-on-holiday` | built |
| Kit at the tables: has had most of Bernard; short of Lumina money; going to the Consortium | Kit, Cay Room, afternoon/evening (also seated at both tables) | talkTo kit | chapter Palm Cay | `kit-palmcay` | built |
| Rosa's job: stack a real pot off Bernard | Rosa | mission | — | `palmcay-tourist` | built |
| Send-off: "Thirty grand. I am going home before I start believing in things." | Marcus | talkTo marcus | after `marcus-on-holiday`, cash ≥ $30,000 | `marcus-goes-home` | built |

### Act 5 — Neon Mesa · gate: $90,000 for Lumina

- **Face:** the Fixer, and Lorna across the heads-up table. **Want:** the
  Invitational. **Problem:** everyone is studied; the Consortium's two-day
  money. **Thread:** debt, worn by Kit; mentor's last lessons; Dana closing in.
  **Payoff:** Dana tells you she will want to meet you.
- **Turn:** the rival breaks first; the watcher stops pretending she is only
  watching.

| Beat | Who / where | Trigger | Conditions | Event id | Status |
|---|---|---|---|---|---|
| Arrival card: ten thousand to sit; ninety and they put you on the plane | Tout, the Strip | enterArea nm-street | — | `arrive-mesa` | built |
| Hal, last stop: "After the Mesa it is just her." | Hal | interact hal-mesa | — | `hal-mesa-last-stop` | built |
| **Kit, owing**: day two, eleven short, going to Lumina to challenge Nadia | Kit, the Strip, morning/night | talkTo kit | chapter Mesa | `kit-mesa` | built |
| Dana at Ultraviolet: August reads her letters too; "she will want to meet you" | Dana, Ultraviolet, evening/night | talkTo dana | chapter Mesa | `dana-mesa` | built |
| The Fixer's job; Lorna heads up; the Consortium; the Invitational | various | existing | — | existing | built |
| Send-off: "Ninety. Take the plane." | Dana | talkTo dana | after `dana-mesa`, cash ≥ $90,000 | `dana-sends-you-up` | built |

### Act 6 — Porto Lumina · the Challenge, $120,000 heads up

- **Face:** Nadia Okonkwo. **Want:** the penthouse. **Problem:** the buy-in,
  and Madame Wen offering it. **Thread:** Kit as the warning; Dana's reveal;
  Hal's last lesson; Marcus at the rail. **Payoff:** the match.
- **Turn:** everything that followed you up the ladder turns out to have been
  pointing here.

| Beat | Who / where | Trigger | Conditions | Event id | Status |
|---|---|---|---|---|---|
| Arrival card: thirty at the nosebleed, a hundred and twenty for the match | Photographer, the waterfront | enterArea pl-street | — | `arrive-lumina` | built |
| **Kit, broken**: forty hands; the Consortium's men; "don't take Wen's money" | Kit, waterfront, morning/afternoon | talkTo kit | chapter Lumina, no penthouse | `kit-lumina` | built |
| **Nadia names the match** — she knows the kitchen table; somebody has been writing to her; she has sent a car for Marcus | Nadia, casino | interact nadia | — | `nadia-names-the-match` | built |
| **Dana's reveal**: "I'm the someone." | Dana, casino floor, evening/night | talkTo dana | chapter Lumina, no penthouse | `dana-reveal` | built |
| Marcus at the rail: "Whatever happens, the kitchen table is still in my kitchen." | Marcus, waterfront / casino | talkTo marcus | after `nadia-names-the-match`, no penthouse | `marcus-at-the-rail` | built |
| Hal on the eve: the heads-up lesson he never sold (button posts the small blind, acts first pre-flop and last after; open wide from it) | Hal, waterfront, evening/night | talkTo hal | chapter Lumina, no penthouse | `hal-on-the-eve` | built |
| Madame Wen's stake | Wen | sponsor | — | `wen` (sponsor) | built |
| The Challenge | Nadia | table | — | `lumina-finale` → ending / loss scene | built |

### Aftermath — forty-one floors up

The ending scene hands back to the overworld; the cast is waiting in the lift
lobby and on the waterfront. "There is just the game, whenever you want it" —
and the people who got you there.

| Beat | Who / where | Trigger | Conditions | Event id | Status |
|---|---|---|---|---|---|
| "Winner hosts. I'll bring the ice." | Marcus, Penthouse Lift | talkTo marcus | hasPenthouse | `marcus-upstairs` | built |
| Nadia's note: "Watch for the next one." Dana stays on as your scout | Dana, Penthouse Lift | talkTo dana | hasPenthouse | `dana-after` | built |
| Kit asks for a stake — you are the sponsor now | Kit, waterfront | talkTo kit | hasPenthouse | `kit-after` | built |
| "I had money on her. Do not tell her." | Hal, Penthouse Lift | talkTo hal | hasPenthouse | `hal-after` | built |

---

## 4. What the audit found (2026-10-21)

Before this pass the run had three scripted beats, all in Basin. Everything
after the bus was mechanics with captions.

- **No recurring cast.** Marcus and Dana stayed in Basin forever; Hal was two
  POIs with two faces; Kit sat at two tables in one town; Nadia appeared only at
  the end yet said "I have watched you come up", which nothing supported.
- **Dead spots.** Silver Creek had no story at all; Palm Cay had a mission and
  no thread; no town said what its goal was or noticed when you reached it.
- **No long pull.** The penthouse was never mentioned before Porto Lumina.
- **No aftermath.** After the match nobody you had met reacted.
- **The engine could not carry people between towns.** A schedule was one place
  per period, forever. Only `talkTo` triggers were wired; `enterArea`,
  `interact` and `standOn` type-checked and validated but never fired.

### What changed in the content model

| Gap | Fix |
|---|---|
| A character could not move with the story | `overworld.chapters`: schedules that apply once their conditions hold; the last that holds replaces the usual one |
| No way to ask how far the run has got | `{ kind: 'chapter', cityId }` — the furthest town set foot in |
| Walking into a town did not count as visiting it | Walking in now marks the town visited, as the bus always did |
| `enterArea` and `interact` never fired | Both fire: entering an area (not loading a save into one), and talking to a POI, where the event gets first refusal over its action |
| The overworld kept moving under an event's text box | The scene, and any collector, pauses while an event runs |
| The rule "two events may not share a moment" only understood flags and hours | It also understands chapters and one beat waiting on another (`eventDone`), in one function shared by the tests and the editor |

---

## 5. Still missing (proposed)

- **Losses have no story.** A beat can ask for cash at least *n* but not at
  most, nor about debts, being caught, or a lost Challenge. Wanted: a `debt`
  condition (owing a sponsor, overdue) so Cass's collector can have lines, and
  a flag for a lost Challenge so Marcus and Hal can say something to it.
- **Sponsors are a menu.** Cass, Emeka and Wen never return. A paid-off Cass
  ("You came back. Nobody comes back.") needs the debt condition above.
- **The rent.** "Rent is due in nine days" has no payoff. Proposed: the
  neighbour's line changes once you have left Basin, and Marcus mentions the
  landlord on holiday.
- **Palm Cay has no sponsor**, and Silver Creek no mission. Ray could ask you to
  sit in for him for one session (a mission: play one table).
- **The on-foot route has no bankroll gate.** You can walk from Basin to Porto
  Lumina on day one; the ladder is only enforced by the bus and the buy-ins. The
  chapter therefore follows your feet. Whether the road should be gated is a
  design call for the user.
- **Editor.** The character tab edits a schedule, not chapters; chapters survive
  a save untouched but cannot be edited there yet.
