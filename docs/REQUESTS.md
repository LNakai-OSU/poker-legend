# Requests

Changes you want that the editor can't make by itself. Write in plain English —
there is no format to learn. Claude reads this file, does the work, ticks the
box, and writes what it did underneath.

**Use the editor instead** (`npm run dev`, then `localhost:5173/#editor`) when
the change is painting a map, moving a door or a fixture, placing an object,
or editing a character's lines or an event's dialogue. Use this file for
everything else: new sequences, new kinds of object, new rules, "this feels
wrong".

## How to write one

Add a heading and say what you want. Useful things to include, if you know
them — none are required:

- **Where** — a town, a street, a room ("Marcus's place", "the riverboat").
- **When** — a time of day, or what has to have happened first.
- **Who** — which characters, and what they say. Quote dialogue exactly if the
  wording matters to you.
- **Then** — what happens next. "Then", "after that" and "once that's done"
  are all fine; sequences are the thing this file is best at.

```markdown
## Dana stops you after the first poker night
Once you've beaten Marcus, Dana catches you at the door:
  Dana: "You took him."
  Dana: "Don't spend it all on bus fare."
Then Marcus comes out and waves. Then fade to the next morning.

- [ ] not started
```

Leave `- [ ] not started` under it. Claude changes it to `- [x] done` and adds
a note: which files changed, the commit, and anything it decided on your
behalf that you might want to revisit.

---

<!-- Write new requests below this line. Newest at the bottom. -->

## Playtester notes (2026-10-24)
- [x] Table UI: add small/big blind chips; make the dealer button match them visually; make it clear when blinds change; help the player see what they hold (pairs, "doubles") during the first poker night; option to see the winners' cards; the hand outro plays too fast.
  - **Blinds:** the small- and big-blind seats wear round S / B chips in the same style as the dealer's D button (`tableMarkerUrl` in `pixel/chips.ts`); the pot line reads "Pot 3 · Blinds 1/2". At the first poker night a raise reads "Blinds up: 20/40 — every bet costs more now" and holds 4.5s. *Decided:* the chips show at every table, not only once the position lesson is bought.
  - **What you hold:** the first poker night shows a green line over the buttons ("You hold a pair of Queens — a double", then the best hand once the board is out) from `game/handHint.ts`.
  - **Winners' cards:** a hand won by everyone folding now has a "See their cards" button (the engine keeps the winner's cards as `HandResult.held`; nothing shows unless asked).
  - **Outro:** the result banner holds 5s (was 2.6s) and the bust gate waits as long.
- [x] Overworld/UI: side nav menu for the hamburger menu; a small desktop window makes the game think it is mobile; the bus animation does not look like the rest of the game; pressing "Let's Go" before the casino should take the player inside automatically.
  - **Side menu:** the ☰ opens a pixel-framed panel that slides in from the right (`src/game/SideNav.tsx`): day, money, reputation and debts; Bag (items and lessons), Jobs, Record; sound, volume; New game with a confirm. Arrows/WASD move, Space/E/Enter pick, Escape goes up a page and closes it, a tap off it or the X closes it, and Escape opens it from the street. The street is paused while it is open. *Decided:* the map editor is **not** in it — `App.tsx` keeps it at `#editor` so players never stumble in.
  - **Small window ≠ phone:** touch controls are now decided by the device (coarse pointer, or touch points with no hover or a phone/tablet user agent), never the window's width (`src/game/device.ts`). A small desktop window keeps the keyboard and "Press E"; only the layout scales.
  - **Bus:** redrawn in the street's own pixel art — the 14 side on, on the road into the town you're going to, that road's tiles and objects scrolling past in the hour's light, you and whoever rides with you at the windows in your street sprites (`BusTransition.tsx`, `busRide.ts`, `art/busArt.ts`). Forced story rides work as before.
  - **"Let's go" → inside:** every town's arrival card now ends by walking you to the casino/card-room door and in (content only, in `events.ts`). *Decided:* this applies in all six towns, including Riverbend and Palm Cay, whose cards mention somebody outside (Kit on the dock, Marcus on the promenade) — they're still there when you walk back out. Revisit if you'd rather those two leave you on the street.
  - **Also (coordinator request):** Space, E and Enter all talk/turn the page/pick wherever one did; arrows or WASD move the cursor in every list and menu; Escape leaves menu scenes. A double click is one press. See TECHDESIGN "Controls".
- [x] Casinos: all slot machines playable; casinos more populated as they become more exclusive.
  - **Slots:** every machine in a bank is playable — `addSlotMachines` in `cities.ts` derives a 'slots' POI for each cabinet of every `slot-bank*` stamp. Stand on the stool and face it; E now picks the POI you face before any other beside you (dealers stand behind some stools).
  - **Crowds:** areas have a `crowd` 0–1 (`CROWD` in `cities.ts`: Silver Creek 0, Riverboat .2, Harbor .4, Palm Cay .6, Mesa .8, Lumina 1) that raises the least number of strangers at a table. *Decided:* only tables without a named game fill up; tables whose game seats particular people still seat exactly them. Revisit if you want strangers on slot stools too (they'd block machines).
- Liked: the sound effects.

## Storyline, the televised frame (2026-10-27)
- [x] A storyline through the whole game: a televised high-stakes final you are losing, a bathroom breakdown, a flashback to Marcus's night, narrative and characters in every casino, and a multi-way final table played from a huge deficit (replayed until won, with a back-door chase on a loss and credits on a win). Grounded and sleazy, a lunatic per town, a poker nerd here and there, commentators between acts.
  - Everything is written up in `docs/STORYBOARD.md` §7. New: the `reel` event action and `ReelScene`; four new characters (Dolores, Gaines, the Contessa, Zeke); events `prologue`, `final-table-start`, `final-lost`, `final-won` and a commentator interlude on each town's send-off; the six-handed `lumina-finale` (15,000 vs 720,000).
  - *Decided for you:* Dolores is on the rail rather than seated (the table only takes five opponents); Bernard, Palm Cay's regular, takes a seat; the entry is "proof of funds" ($120,000 held, not spent) rather than a buy-in; commentary is between acts only, not mid-hand.
- [x] Sit down at any open chair from any side of the table without talking to the pit boss.
  - Facing an empty chair offers it ("Press Space or X to sit down"); Space or X takes it. Chairs that would wall the room off stay plain walkable tiles. *Decided:* only tables a dealer deals a game at offer a seat.
- [x] Spacebar and arrows to bet.
  - ← → (or A D) move between Fold / Check / Call / Raise; ↑ ↓ (W S) step the raise through min, the pot fractions and all-in; Space, X, E or Enter does it. The pointer starts on check or call so a stray press is never a raise. Same keys at the poker night. A hint line under the buttons on a keyboard device.

## Playtester notes (2026-10-29, phone)
- [x] Mobile freezes on the corridor frame ("Do not run…"); fonts too small; make each player's action (check, raise…) obvious in all gameplay.
  - **Freeze:** the corridor's thoughts only answered keys, so a phone could never turn them. A tap anywhere on the corridor now does (`CorridorWalk.tsx`).
  - **Fonts:** the betting menu (buttons, odds, coaching lines) is drawn 1.5× the table's pixels (`dockZoom` in `tableLayout.ts`), and the layout prefers a slightly smaller table with a readable menu over the reverse. *Decided:* seat names/stacks and the header sign are unchanged for now — they sit in fixed-size plates; enlarging them means a bigger seat. Say if you want that next.
  - **Actions:** each opponent's last action is a coloured banner over their portrait — CHECK / CALL (blue), BET (green), RAISE (orange), ALL IN (red), FOLD (grey). It lasts the street (a fold the hand). Same at the kitchen table and every cash table (`actionTag.ts`). *Decided:* no banner on your own seat; your action is already in the log line.

## Playtester notes (2026-10-29, phone, round 2)
- [x] Larger seat names, stacks and header sign; move player descriptions into a box shown on click; much bigger table cards (like the GG Poker reference).
  - **Text:** names, stacks, your plate and the header sign are drawn 1.5× (`TEXT_ZOOM`); seat plates widened to 64 and a stack too long for the plate falls back to normal size.
  - **Descriptions:** gone from under the seats; tap an opponent to open a box with their name and description, tap it (or the seat) again to close (`info-<id>`). Tells and showdown hands still show under the seat.
  - **Cards:** board and your hole cards are now 2× the card art (44×60, were 33×45). *Decided:* on a short phone the whole table scales down a step to fit them; the layout now weighs menu text size against table size (`score` in `layoutScene`) rather than always preferring either.

## Story mechanics (2026-10-29)
- [x] A goal in every town besides money: each casino gets a private room, entered by winning a minimum at that casino, holding a head-to-head boss who is a better poker player in each town; no travelling to the next casino until the boss is beaten; the win target rises town to town.
  - **How it works:** see GAME_BIBLE "Casino goals". Win targets $400 / $1,200 / $4,000 / $12,000 / $40,000 (net, at the town's poker tables). Bosses: Lou Brannigan (Silver Creek, novice), Capt. Odette Marsh (Riverbend, amateur), Mr. Bellamy (Harbor, competent), Inés Calloway (Palm Cay, sharp), Solomon Vale (Mesa, elite), at $500 / $1,500 / $5,000 / $15,000 / $50,000 a side, winner takes all, no rebuys.
  - *Decided:* the room unlocks for good once the target is reached; only poker tables count (not slots or craps); a lost match costs the buy-in and a day but can be retried at once; towns you have already visited are never locked, so existing saves are not stranded (and older saves count as having beaten the bosses behind them). Lumina has no boss — it ends on the final table.
  - *Decided:* the first boss is `novice`-tier so the ladder can climb one of the five engine tiers per town; the pressure at Silver Creek is the stake, not the play. Say if you want it harder at the bottom (it would need a sixth tier in `ai.ts`).
- [x] No walking between towns: stopped before the entrance of Silver Creek (and every other casino town) with "Oop, just the highway over there."
  - Every edge that crossed from one town to the next is now `blocked` on both sides, so each town's highway is a dead-end spur you can walk out onto and back. From the apartment you are stopped at the depot's east end. The bus is the only way between towns.

## Saving, accounts, map, saloon walls, table talk (2026-10-30)
- [x] Save from the menu; accounts that work across devices and survive updates; world map; saloon decor; chatty and grumpy characters.
  - **Save:** ☰ → Save writes your exact tile (`resume` on the save; `saveHere` in `game/save.ts`). Next load puts you on it. The next automatic save (entering a new area, any state change on the street) replaces it, as asked. Not offered at a table or mid-scene — the menu says so. *Decided:* "automatic savepoint" = the existing autosave, which already runs on every street-state change.
  - **Accounts:** need a server, and this is a static GitHub Pages site, so I wrote one: `server/worker.ts`, a Cloudflare Worker + KV (name + PBKDF2-hashed password; the save is stored as opaque JSON). **You have to deploy it once — see `server/README.md` — and set the `VITE_SYNC_URL` Actions variable** (the Pages workflow already passes it). Until then the game behaves as before (name only, this device). With it on: sign-in asks for a password on any device that hasn't logged that name in; saves are copied to the account about 1.5s after each autosave and immediately on Save; on login the newer of device and account wins. Old names on a browser can claim their name by "Create account" and their local run uploads.
  - **Updates:** the server never interprets a save, and `reconcile` already merges any old save over fresh state, so new fields never strand a run (tests in `game/save.test.ts`). Changing an existing field's meaning still needs a migration there.
  - **Not done / revisit:** no password reset, no rate limiting on the worker, no email. Saves expire never.
  - **World map:** tap the corner map or ☰ → World map. Laid out from the town data (`game/WorldMap.tsx`), so new towns appear by themselves: streets, casino, private room, other places; unreached towns dimmed; "you" marked.
  - **Saloon:** the repeated "$500" posters in the Silver Creek room (`pixel/rooms.ts`) are now a rotation of horseshoe, sunset, antlers, trade blanket, sheriff's star and a dead man's hand. Other rooms had no such banners.
  - **Talk:** `world/talk.ts` gives each character `chatty` (0 silent … 1) and `mood` (jolly, grumpy, dry, nervous); Dmitri and Marchetti never speak, Gus/Whitaker/Dolores/Zeke nearly always. Besides their own actions they now remark when the flop, turn and river come down, when you raise or shove, and when you fold (`game/tableTalk.ts`), one speaker at a time. Tune it by editing the numbers in `talk.ts`.

## Playtest account (2026-10-30)
- [x] Account `playtest` / `playtest` with tools for checking scenes without playing to them.
  - ☰ → **Playtest tools** (`game/PlaytestPanel.tsx`): set cash (typed or presets), day and time of day, **checkpoints** (arrive in any town as if you had played to it: earlier towns visited, rooms open, bosses beaten, enough cash — `checkpointAt` in `game/playtest.ts`), and a filterable list of every scripted scene with Play / Reset. ☰ → World map: every place is clickable and takes you there. Arrival scenes still fire, as they would for a player.
  - *Decided:* gated by the name alone (`isPlaytester`); the deployed server holds the name behind the password above, which is weak and written here on purpose — change it if the game goes public. Nobody else sees any of it.

## Table layout: bigger table, one-row menu, bigger talk (2026-10-30)
- [x] Go with: Wide Felt (A) + Broadcast caption (B) + Tap-to-Reveal (E) pieces + upright phones (D). Sketches: the "Table Layout Options" artifact.
  - **A, wide felt:** at the casino tables the betting menu is one row under the table (Fold, Check/Call, Raise) instead of a column beside it. **Raise** opens a sheet of sizes (slider, min, ½, ¾, pot, 1½×, 2×, all in) beside your cards, never over them; picking one bets and closes it, and the arrow keys open it too. Seats are compact (face left, name and stack right, cards and the bet on one row under it), which took the shortest table from ~320 to ~230 art pixels tall — that is what lets a 1280×720 laptop draw the whole scene at 2 pixels per art pixel instead of 1 (cards and faces twice the size). `layoutScene`, `SEAT`, `CAPTION` in `game/tableLayout.ts`.
  - **B, caption:** table talk, tells and what a showdown turned over are one line at the top of the menu in the menu's type, with the speaker's face (`game/TableCaption.tsx`), instead of a bubble and a line at every seat. Speech stays 3.2s and a tap clears it.
  - **E, tap to reveal:** at Marcus's first poker night "Blinds up" now waits for a tap (or Escape; Space/Enter/E stay "bet") and clears at the next street. The pot line still carries the blinds. *Decided:* pot-odds and hand-read lines from lessons stay in the menu for now (tests and lessons lean on them); folding them into a tap pop-up is the next step if you want it.
  - **D, phones upright:** no separate layout yet. The same scene scales to the window's width (board across the full width), and the sheet widens to two columns. A true portrait arrangement (opponents in a top strip) is not built; say if you want it after you've tried the phone.
  - **Marcus's kitchen table** keeps its full side menu on landscape phones (a test holds it); only the casino tables changed.
  - `scripts/table-shot.mjs` screenshots a table at four window sizes (OUT=dir, RAISE=1, SPEECH=1).

- [x] *Redo (2026-10-30): "the betting menu looks nothing like the example."* The casino table's menu is now the sketch's bar: a dark full-width strip along the foot of the window with three big buttons across it (Fold red, Call/Check green, Raise gold, text twice the frame's pixel size), the keys hint under them, and one line above for what was just said, noticed or done (`BAR`, `PxButton textZoom`, the `bare` bar in `TableScene.dock`). The felt widened to 520 art pixels so it fills ~80% of a laptop window, and the pot pill (with the blinds) is 1.5× bigger. Results and rebuys are still read in a pale panel inside the bar. Raise sizes still open in the sheet beside your cards. *Not matched yet:* the board's cards are still 2× card art (the sketch's are larger), and your cards are not fanned.
