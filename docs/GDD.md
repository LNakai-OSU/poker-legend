# Poker Legend — Game Design Document

Living doc. Update this as design decisions are made or revised; future build
requests should reference sections here ("build Phase 3 per GDD §5") instead
of re-explaining context.

## 1. High Concept

Story-driven poker RPG. Overworld exploration (Pokémon LeafGreen-style top-down
movement) between story/social beats, dropping into a fully-simulated,
realistic-odds poker engine whenever the player sits at a table. Player rises
from a broke 20-something to a poker legend across an escalating ladder of
casino cities, risking real debt along the way.

Platforms: browser (primary dev target) + iPhone (via Capacitor wrap of the
same web app). Poker variant: Texas Hold'em only.

## 2. Core Loop

Overworld (walk / bus / drive, talk to NPCs, shop, take side missions) → sit
at a table → hard-cut to strict casino-sim mode (real deck, real odds, real
AI) → win money → spend on gear/travel or buy into higher stakes → unlock next
location.

## 3. Story Beats / Progression

- **Apartment intro.** Player starts in a small apartment. A friend invites
  them to a home poker night.
- **Poker night (hard gate).** Player must win *all* the chips at the table.
  Losing restarts the poker night from its beginning — this is the first
  checkpoint boundary in the game.
- **Casino nudge.** After winning, the friends (CPUs) suggest the casino.
  Player takes the bus.
- **Local rez casino.** Lobby, slot machines, craps, and other table games as
  ambient/flavor content. The **low-stakes poker table is the real
  progression gate** here.
- **Location ladder.** Winning at one casino's stakes unlocks travel to the
  next, bigger casino/city. Ladder (confirmed):
  1. Local rez casino (start)
  2. Mid-tier regional city A
  3. Mid-tier regional city B (and optionally a third mid-tier stop)
  4. Vegas-parallel (second-to-final)
  5. Macau-parallel (final)
  Each city has its own navigable map: casino floor, restaurants, clubs,
  shops (clothes, cars/bikes), and NPCs offering small money/item missions.
- **Sponsors & debt.** NPCs who observe the player's skill at private games
  may offer to stake them into bigger games (lending money to play). Losing a
  staked game puts the player in debt. Debt has a deadline; if unpaid,
  collectors are sent after the player. Fail state: getting caught by
  collectors before reaching a new location in time → restart from the last
  checkpoint.
- **Mentor NPC.** Gives poker lessons grounded in real, established poker
  strategy (not made up heuristics).
- **Whale NPC archetype.** Recurring high-stakes, low-skill player type —
  obvious tells, erratic/unpredictable hands. A target of opportunity, not a
  gate.
- **Endgame.** A final heads-up match (with smaller heads-up opportunities
  earlier in the game as a taste of the format) determines whether the player
  earns the penthouse ending in the Macau-parallel city. After that, the game
  becomes an open-ended "hang out and play poker" state.

## 4. Casino Simulation Systems

- **Deck/odds.** Standard 52-card deck, real shuffling (proper RNG, no fudging
  odds for narrative convenience), real Texas Hold'em hand evaluation.
- **AI opponents.** Skill scales with the stakes of the table: bet sizing
  logic, bluff frequency, hand-reading ability all increase together. Low
  stakes = weak, exploitable AI. High stakes = strong, disciplined AI.
- **Tells.** Visual cues on opponents (e.g. a shifting arm, a twitching lip)
  that correlate with hand strength/bluffing. Tells get subtler and less
  reliable as stakes rise and opponent skill increases — by the top tables
  they should be nearly imperceptible or absent.
- **Whales.** Bad players with obvious tells and/or wide, unpredictable
  hand ranges, regardless of the stakes they happen to be sitting at.
- **Other casino games** (slots, craps, etc.) are ambient/flavor at this
  stage — not a design priority versus the poker engine. Depth here is a
  later decision, not part of the MVP.
- **Debt/sponsorship.** Loan terms, repayment deadline, and a pursuit-based
  fail state (collectors) if the deadline passes unpaid.
- **Checkpoints.** Tied to location transitions (arriving at a new city/casino
  is a checkpoint). Losing the poker-night gate or getting caught in debt
  rolls the player back to their last checkpoint.

## 5. World

- Overworld rendering: tile-based 2D, top-down, LeafGreen-derived movement
  feel — but using original art, not reused Pokémon assets.
- Each city map includes: casino floor, restaurants, clubs, shops (clothing,
  vehicles), and NPCs with small missions that pay out money or items.
- Table/game view uses a distinct, more realistic visual language from the
  overworld's pixel-art style.

## 6. Characters

- **Player** — customizable 20-something.
- **Friend(s)** — host the inciting poker night.
- **Mentor** — real-strategy poker lessons.
- **Sponsors** — offer staking deals, source of the debt mechanic.
- **Collectors** — debt enforcers, the pursuit fail-state.
- **Whales** — high-money, low-skill recurring opponent type.
- **Final rival** — endgame heads-up opponent.

## 7. Economy

- Income: poker winnings (and small mission payouts).
- Spending: buy-ins, clothes, vehicles, mentor lessons, possibly lodging.
- Risk axis: sponsor debt, with a real fail state attached.

## 8. Art & Audio Direction

- Overworld: original pixel art in the spirit of Pokémon LeafGreen.
- Table view: distinct, more realistic casino visual mode.
- (Audio direction: not yet specified — revisit later.)

## 9. Build Phasing

See `TECHDESIGN.md` for the technical architecture and the current phase
breakdown. Design intent: playable MVP first (apartment → poker night → bus →
local casino → low-stakes table, fully real poker engine), then layer in the
economy/debt system, mid-tier cities, mentor/whale content, and finally the
Vegas-parallel and Macau-parallel endgame.

## Open / Deferred Decisions

- Exact number of mid-tier cities: 2 or 3 (leaning 3 for a smoother stakes
  ramp — confirm when we get there).
- Depth of slots/craps/other non-poker casino games.
- Audio direction.
- Character customization depth (appearance only, or stat-like traits?).
