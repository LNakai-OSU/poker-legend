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
| When it goes wrong | A setback with a next goal: broke → the kitchen table; owing → the sponsor and their collector; the match lost → a week and a rematch | §4, wherever it happens |
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
| Collectors | Dutch, Abel, Mr. Lowe, Ms. Fong — the sponsors' people | — | — | Dutch | Abel | — | Mr. Lowe | Ms. Fong | — |
| Repaid sponsors | Cass and Mr. Emeka, back once you have paid them | — | — | — | — | — | Mr. Emeka | Cass, at the rail | Cass |

Dana appears in all seven towns, Kit in five, Marcus in three (and the
penthouse). Every town has at least one of Dana or Kit; the content tests hold
it to that.

**Arcs in one line each.**

- **Marcus** — stuck → proud, and rides the 14 out with you to see you in →
  visits to check it is real → watches → hosts the
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
  nine days. **Thread:** Dana watching — and the first time you step outside,
  she is the one who runs up the street to fetch you. **Payoff:** you take the
  whole table; Marcus and Dana make their excuses and name the bus; Dana walks
  you home; in the morning Marcus rides the 14 out to Silver Creek with you and
  walks you in. He covers the rent while you are gone (the receipt is under the
  door when you come home — §4).
- **Turn:** stuck → winning → carried out of town by the people who lost to you.

| Beat | Who / where | Trigger | Conditions | Event id | Status |
|---|---|---|---|---|---|
| Rent, the note on the table | Your apartment | POI lines | — | `apartment-window`, `apartment-note` (POIs) | built |
| Rent day, if the game is still unwon on day ten: Marcus has vouched for you | Your apartment | interact window | day ≥ 10, not wonPokerNight | `rent-day` | built |
| **The opening.** The first time you step out of your door, Dana runs up Basin Street to catch you ("You walk fast for somebody with nowhere to be"), you answer her (**choice**: why do you watch / then watch tonight / mind your own business), she walks you to the end of the street, and rides the 14 with you to Eastgate (a forced ride: no skip, the hour passes, it is afternoon) and goes in at Marcus's door ahead of you | Dana, Basin Street → depot → the 14 → Eastgate | enterArea basin (also on load) | not wonPokerNight, first night not played, Dana not met, not night | `dana-walks-you-to-the-bus` | built |
| …or, for a run that reached the depot without her: she is waiting at the stop, and the same ride | Dana, the depot | enterArea depot (also on load) | as above | `dana-at-the-depot` | built |
| "Tonight. My place." | Marcus, Basin Street, morning | talkTo marcus | not wonPokerNight, morning (from day 2; on the day of the opening he is out for ice) | `marcus-reminds-you` (repeatable) | built |
| The Friday game. Dana is at the table as herself (a chapter of her schedule, from the opening until she walks you home) | Marcus's place, afternoon on — where Dana has just left you | talkTo marcus | not wonPokerNight | `poker-night` → poker night | built |
| **After the game.** The moment you get up a winner: Marcus ("You played that like you had done it for years… my cards were cold all night") and Dana ("His cards were fine. He played them like they were on fire… I was watching you instead of my cards") make their excuses; Dana remembers your answer on the 14; they name the next step — **the 14 from the depot runs out to Silver Creek, the fare is nothing, a hundred buys a seat at the low-stakes table** — and Marcus says he will put you on the bus himself in the morning. The game has run late (it is night). Dana walks you home ("He has set two alarms, which frightens me. I will be around"); you sleep (a day passes); morning, and Marcus is hammering on your door | Marcus and Dana, his front room → Basin Street → your flat | enterArea marcus-house **onLoad** (fires on getting up from his table, and on a reload) | wonPokerNight, chapter Basin, afternoon on, old send-off not heard | `dana-walks-you-home` | built |
| **Marcus rides out with you.** Step outside and he is on your step: the rent is on his tab ("I told your landlord on the stairs"); he walks you to the depot and rides the 14 out with you (forced ride, the hour passes) telling the Porto Lumina story — the long pull is planted; off the bus at Silver Creek ("Carpet and cigarettes. Real poker"), he walks you into the casino: the pit boss seats the low-stakes table, a hundred to sit, six hundred is the riverboat; "Go and be a story I can tell", and he takes the 14 home. Arriving this way counts as visiting Silver Creek | Marcus, Basin Street → depot → the 14 → Silver Creek Approach → the casino floor | enterArea basin **onLoad** | wonPokerNight, `marcusSeesYouOff`, after `dana-walks-you-home`, chapter Basin | `marcus-rides-out-with-you` | built |
| *Kept for saves that won before the two beats above:* the casino nudge, and Dana taking your measure. A new run is in Silver Creek before it could talk to either | Marcus / Dana | talkTo | wonPokerNight, chapter Basin | `marcus-sends-you-off`, `dana-takes-your-measure` | legacy |

### Act 1 — Silver Creek · gate: $600 for the riverboat

- **Face:** Ray, who has been "due" for thirty years. **Want:** turn a $100
  buy-in into boat money. **Problem:** the room eats people. **Thread:** rival —
  Kit is a rumour here. **Payoff:** Ray sends you on.
- **Turn:** hope → seeing what staying looks like → leaving a man behind.

| Beat | Who / where | Trigger | Conditions | Event id | Status |
|---|---|---|---|---|---|
| Marcus walks you in to the low-stakes table and goes home (Act 0, `marcus-rides-out-with-you`) | Marcus, casino floor | — | — | `marcus-rides-out-with-you` | built |
| Arrival card: the table, the buy-in, the $600 that buys the boat — for anybody who got here on their own (Marcus says it himself) | Valet, Silver Creek Approach | enterArea sc-street | `marcusSeesYouOff` clear, `marcus-rides-out-with-you` not done | `arrive-silvercreek` | built |
| Ray's thirty years — and if Marcus walked you in, "Hang on to him. This room eats friends" | Ray, street | talkTo ray | chapter Silver Creek | `ray-is-due` | built |
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
| Kit asks for a stake — you are the sponsor now, and you decide (**choice**: stake him $10,000, if you have it / not this time) | Kit, waterfront | talkTo kit | hasPenthouse | `kit-after` | built |
| Staked: "Twenty thousand. Your ten, and ten for being the only one who said yes." (+$20,000) | Kit | talkTo kit | after `kit-after`, stakedKit | `kit-pays-you-back` | built |
| "I had money on her. Do not tell her." | Hal, Penthouse Lift | talkTo hal | hasPenthouse | `hal-after` | built |

---

## 4. When it goes wrong — the losing paths

Losing is part of the run, not the end of it. Every setback is noticed by
somebody who knows you, costs something real (the mechanics are unchanged: a
shakedown takes three quarters and leaves the debt; a lost match keeps the
buy-in and makes you wait a week), and leaves a **next goal and a way back**.
Nothing soft-locks: the content tests hold the kitchen table open in every
chapter, and the bus home is free.

Conditions these beats use (GAME_BIBLE §2): `cashBelow`, `debt`, `hunted`,
`challenge`, `count`, the `caught` trigger and the `cameBack` flag. The run's
`record` remembers busts, matches lost, and each sponsor's stakes taken, repaid,
missed and collected on.

### The paths in one line each

| Setback | What it costs | Who meets it | Next goal | Way back |
|---|---|---|---|---|
| **Broke** — below the cheapest seat ($100) | the roll | Ray (Silver Creek), Dana (Silver Creek), Marcus (wherever he is) | win the kitchen table | Marcus deals his home game again: the bus home is free, and the win is a roll to climb from |
| **Short for the room** — Harbor Room needs $1,000 | the town you are in | Hal | twenty buy-ins | back down to the riverboat ($300), climb again |
| **Owing** — a stake running | days | the sponsor, and their collector standing beside them | pay before the day | pay at the sponsor |
| **A stake missed** | the hunt | the sponsor ("he is out looking for you") | pay, or skip town | paying calls the hunt off; skipping town buys a day |
| **Caught** | three quarters of what you carry; the debt stands | the sponsor's collector, in person | the debt, three days of grace | rebuild, pay; the sponsor notices you paid late |
| **The match lost** | the $120,000, and a week | Nadia, Marcus, Dana, Hal, Kit | $120,000 again and seven days | the rematch; win it and Marcus tells the comeback |
| **The first poker night lost** | nothing but pride | Marcus | win it | he deals you back in, as often as it takes |

### Broke — Basin and Silver Creek

| Beat | Who / where | Trigger | Conditions | Event id | Status |
|---|---|---|---|---|---|
| Walked out of the first night a loser: "the chairs are still warm" | Marcus, his place | talkTo marcus | not wonPokerNight, after `poker-night`, afternoon on | `poker-night-again` (repeatable) | built |
| "Cleaned out? Welcome. Thirty years a member" — go home, Marcus still deals, the bus home is free | Ray, Silver Creek | talkTo ray | after `ray-is-due`, cash below $100 | `ray-busted` (repeatable) | built |
| "Everyone goes broke at that table once. Go home. Win it back" | Dana, Silver Creek floor | talkTo dana | chapter Silver Creek, after `dana-silvercreek`, cash below $100 | `dana-silvercreek-broke` | built |
| Home again: the rent receipt under the door — Marcus has paid every week; the room and the game are still yours | your apartment | enterArea home | wonPokerNight, chapter past Basin | `rent-receipt` | built |
| **The kitchen table.** "You look like the first night. Nobody stays broke at my table" → **choice**: deal me in (the home game) / not tonight, I will climb back myself (sets `turnedDownMarcus`, which Ray and Dana remember) | Marcus, Basin | talkTo marcus | wonPokerNight, cash below $100, any chapter he is home (not Palm Cay; Lumina only before Nadia sends the car), no penthouse | `marcus-deals-you-back-in` (repeatable) | built |
| …on holiday: "I brought cards. I always bring cards" | Marcus, Palm Cay | talkTo marcus | chapter Palm Cay, after `marcus-on-holiday`, cash below $100 | `marcus-deals-on-holiday` (repeatable) | built |
| …at the rail: "It is always the kitchen table" | Marcus, Porto Lumina | talkTo marcus | chapter Lumina, after `marcus-at-the-rail`, no penthouse, cash below $100 | `marcus-deals-at-the-rail` (repeatable) | built |
| …in the penthouse: "Winner hosts. So host" | Marcus, lift lobby | talkTo marcus | penthouse, after `marcus-upstairs`, cash below $100 | `marcus-deals-upstairs` (repeatable) | built |
| **Comeback**: "Six hundred. From nothing. I have never once done that." Sets `cameBack` | Ray | talkTo ray | after `ray-sees-you-off`, busted at least once, cash ≥ $600 | `ray-sees-you-back` | built |
| Short of the Harbor Room: Hal's bankroll rule (twenty buy-ins) and the boat back down | Hal, Harbor Boulevard | interact hal | after `hal-first-lesson`, cash below $1,000 | `hal-short-for-the-harbor` | built |

### The rent — Basin's first line, paid off

| Beat | Trigger | Conditions | Event id | Status |
|---|---|---|---|---|
| Day one: "Rent is due in nine days" | window | before the Friday game is won | `apartment-window` (POI `lockedLines`) | built |
| Day ten, still unwon: "Rent day came and went" — Marcus has vouched for you: COME AND WIN IT OFF ME | interact apartment-window | day ≥ 10, not wonPokerNight | `rent-day` | built |
| Marcus covers it the morning he rides out with you ("I told your landlord on the stairs: rent is on my tab"); the window says so after ("He told the landlord so, loudly, on the stairs") | enterArea basin / window | wonPokerNight | `marcus-rides-out-with-you`, `apartment-window` | built |
| The receipt under the door when you come home — not the night Dana walks you home (`marcusSeesYouOff` tells them apart) | enterArea home | chapter past Basin | `rent-receipt` | built |

### Owing, missed, caught — the sponsors and their people

Each sponsor names a collector (`collector` in `npcs.ts`), who is a character
with a face. While you owe on time they stand beside the sponsor (a chapter
keyed on `debt … owing`); once the stake runs out they are the one chasing you
down the street, and when they catch you they speak before the shakedown
(`caught` beats, first time and every time after).

| Sponsor (town) | Collector | Owing | Overdue | Repaid on time | Repaid after being late | Caught (first / again) | Returns later |
|---|---|---|---|---|---|---|---|
| Cass (Riverbend) | **Dutch** — her brother-in-law, yellow slicker, leaves you bus fare | `cass-owing` | `cass-overdue` | `cass-repaid` "You came back. Nobody comes back." | `cass-repaid-late` | `caught-by-dutch` / `-again` | at the Lumina rail: `cass-at-the-top`, `cass-after-you-won` |
| Mr. Emeka (Harbor) | **Abel** — very polite, very thorough | `emeka-owing` | `emeka-overdue` | `emeka-repaid` | `emeka-repaid-late` | `caught-by-abel` / `-again` | on the Mesa Strip: `emeka-at-the-mesa` |
| The Consortium (Mesa) | **Mr. Lowe** — one of the two men hunting Kit | `consortium-owing` | `consortium-overdue` | `consortium-repaid` | `consortium-repaid-late` | `caught-by-lowe` / `-again` | — |
| Madame Wen (Lumina) | **Ms. Fong** — her bookkeeper; a ledger, not a bat | `wen-owing` | `wen-overdue` | `wen-repaid` | `wen-repaid-late` | `caught-by-fong` / `-again` | — |

All sponsor beats are `interact` on the sponsor and fire once: the next talk is
the stake menu, so a beat never stands between you and paying.

### The match lost — the rematch path to the penthouse

| Beat | Who / where | Trigger | Conditions | Event id | Status |
|---|---|---|---|---|---|
| The loss screen: the buy-in is gone, the rematch is a week out | — | the table | — | `FinaleLostScene` | built |
| "Not tonight. Come back as somebody else. Somebody I have not read about." | Nadia, casino | interact nadia | match `lost` | `nadia-makes-you-wait` | built |
| "I watched every hand. You were not unlucky. She was better tonight." Build it back: $120,000 and a week | Marcus, at the rail | talkTo marcus | after `marcus-at-the-rail`, match lost/rematch, cash ≥ $100 | `marcus-after-the-loss` | built |
| "She knew your river raise before you made it. I told her. So do the other thing." | Dana, casino | talkTo dana | after `dana-reveal`, match lost/rematch | `dana-after-the-loss` | built |
| The heads-up lesson that answers her: defend the big blind wide, three-bet back, stop limping the button | Hal, waterfront | talkTo hal | after `hal-on-the-eve`, match lost/rematch | `hal-after-the-loss` | built |
| Kit: "You did not take Wen's money, so you can come back from this. I could not." | Kit, waterfront | talkTo kit | after `kit-lumina`, match lost/rematch, owe Wen nothing | `kit-after-the-loss` | built |
| Kit: "You took Wen's money. I said do not be me" — and how the debt works from inside it | Kit, waterfront | talkTo kit | after `kit-lumina`, match lost/rematch, owe Wen | `kit-told-you` | built |
| The week is up: "You came back. They mostly do not." | Nadia | interact nadia | match `rematch` | `nadia-rematch` | built |
| "She has racked it up again. You have the money. I have the ice." | Marcus | talkTo marcus | after `marcus-after-the-loss`, match rematch, cash ≥ $120,000 | `marcus-rematch-night` | built |
| **Comeback**: "Lost it, came back for it, took it. That is the version I am telling." Sets `cameBack` | Marcus, lift lobby | talkTo marcus | penthouse, after `marcus-upstairs`, lost the match at least once | `marcus-second-time` | built |

### Kit's debt arc pays off either way

Kit is what the debt looks like when it happens to somebody. His arc now ends
whichever way the match goes:

- **Before the match**, after `kit-lumina`: the Consortium's men caught him off
  the boat — three quarters of everything, and the debt did not move
  (`kit-caught`). The mechanic, shown on somebody else first.
- **You lose**: his warning about Madame Wen pays off both ways — heeded
  (`kit-after-the-loss`) or not (`kit-told-you`).
- **You win**: he asks you for a stake (`kit-after`) and you decide. Stake him
  and he squares the Consortium on your money and pays you back doubled
  (`kit-pays-you-back`); say no and he squares it himself at the nosebleed
  (`kit-squares-up`).

### The comeback, read back

`cameBack` is set by the comeback beats (Ray's, Marcus's second time). Before
the match, Dana tells you the letter Nadia kept on her desk was the one about
the night you went broke and came back (`dana-the-letter-she-kept`): the
setback is part of why the top is interested in you.

### The choices, and who remembers them

A choice is only worth putting to the player if something later is different
because of it. Each of these sets a flag (or a line in the record) that a later
beat reads; `events.test.ts` fails on a flag an answer sets that nothing reads.

| Beat | The question | Answers | What it sets | Who remembers |
|---|---|---|---|---|
| `dana-walks-you-to-the-bus` / `dana-at-the-depot` | What do you say to Dana? | Why were you watching? · Then watch tonight · Mind your own business | `askedDanaWhy` · `toldDanaToWatch` · `brushedOffDana` | Dana straight after the first night (`dana-walks-you-home`; `dana-takes-your-measure` for older saves), Dana's reveal in Lumina (`dana-reveal`) |
| `cass-offers` | Take Cass's money? | Take the $1,500 · Not today | the record (`staked`) | Kit at the Harbor (`kit-harbor`); every Cass beat after |
| `cass-owing`, `emeka-owing`, `consortium-owing`, `wen-owing` | Pay them back now? | Pay now (only if you can cover it) · Not yet | the record (`repaid` on time) | the sponsor's repaid beats, Cass and Mr. Emeka later up the ladder |
| `cass-overdue`, `emeka-overdue`, `consortium-overdue`, `wen-overdue` | Pay what you owe? | Pay what I owe (only if you can) · I cannot. Not yet | the record (`repaid`, after `missed`) — and the hunt is called off | the sponsor's repaid-late beats |
| `wen-offers` | Take Madame Wen's money? | Take the $150,000 · No. Kit warned me | the record (`staked`), a debt | Kit after a lost match (`kit-after-the-loss` / `kit-told-you`) |
| `marcus-deals-you-back-in` and the three like it | Sit down at the kitchen table? | Deal me in · Not tonight. I will climb back myself | `turnedDownMarcus` (cleared if you later sit down) | Ray's comeback (`ray-sees-you-back`), the letter Nadia kept (`dana-the-letter-she-kept`) |
| `nadia-names-the-match` | What do you say to her? | I will be ready · Who has been writing to you? · Leave Marcus out of this | `askedNadiaWho` · `toldNadiaLeaveMarcus` | Dana's reveal; Marcus at the rail |
| `dana-reveal` | How do you take it? | I am glad it was you · You could have told me · Stay away from my games | `trustsDana` · — · `cutDanaOff` | Dana after the win (`dana-after`), after a loss (`dana-after-the-loss`) |
| `kit-after` | Stake Kit $10,000? | Stake him (only with $10,000) · Not this time | `stakedKit`, −$10,000 | `kit-pays-you-back` (+$20,000) or `kit-squares-up` |

## 5. What the audit found (2026-10-21)

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

## 6. Still missing (proposed)

- **Palm Cay has no sponsor**, and Silver Creek no mission. Ray could ask you to
  sit in for him for one session (a mission: play one table).
- **The on-foot route has no bankroll gate.** You can walk from Basin to Porto
  Lumina on day one; the ladder is only enforced by the bus and the buy-ins. The
  chapter therefore follows your feet. Whether the road should be gated is a
  design call for the user.
- **Editor.** The character tab edits a schedule, not chapters; chapters survive
  a save untouched but cannot be edited there yet.
- **The opening only catches the depot.** A save from before the opening that
  is already in Eastgate or Marcus's place, or one at night (the 14 at night
  would put you there next morning, with Marcus out), skips it. New runs always
  have it.
- **More choices.** The first poker night is still not a question ("You in?"),
  Mr. Emeka and the Consortium have no first-meeting offer beat (their menu is
  the offer), and Nadia does not remember after the match what you asked her.
- **The opening is two beats with the same answers written twice**
  (`dana-walks-you-to-the-bus`, `dana-at-the-depot`), because the editor writes
  events as plain literals and cannot keep a shared constant.
- **The kitchen table pays the same at every stage.** The comeback home game is
  the opening game ($1,500 to the winner), which is a real climb from broke in
  Silver Creek and pocket change at the Mesa. A stake-sized home game would
  need `startPokerNight` to take a size.
- **Collectors only work the street you arrive on.** A hunted player in a shop
  or casino is safe until they step back out; Dutch cannot walk into a room.
- **Losing below Silver Creek is the only bust beat with a town face.** Deb
  (Riverbend), Rosa (Palm Cay) and the Fixer (Mesa) say nothing when you go
  broke in their towns; Marcus does, wherever he is.

### Done since the audit (2026-10-22)

- Losses have a story (§4): `debt`, `hunted`, `cashBelow`, `challenge` and
  `count` conditions, the `caught` trigger, the run's record and `cameBack`.
- Sponsors return: each notices you owing, late and square; their collectors
  are people; Cass and Mr. Emeka turn up later once repaid.
- The rent pays off.
- Walking out of the first poker night a loser is no longer a soft-lock.

### Done since (2026-10-22, choices and the opening)

- **Choices** (`choice`, with `if` for a later beat to read them), stakes and
  repayments as actions, and the table above. The editor edits them.
- **The opening**: Dana runs to you, walks you to the 14 and rides it with you
  to Marcus's door. The content model can now walk people (`moveNpc` with a
  pace, `from`, `youFollow`, `leaves`; `movePlayer`), bring them along
  (`teleport`/`ride` `with`), and put you on a bus you cannot get off (`ride`).
- A beat is saved only once it is over, and the opening fires on a load as
  well, so a reload in the middle of it starts it again.

### Done since (2026-10-23, the night of the first game)

- **After the win** the player is no longer left in Marcus's front room with
  nothing said. `dana-walks-you-home` plays the moment they get up from his
  table: excuses, the bus named with its real fare and buy-in, the walk home,
  a night's sleep. `marcus-rides-out-with-you` plays when they step outside the
  next morning: Marcus takes them out to Silver Creek and onto the casino floor.
- **Getting up from a table asks `onLoad` beats**, as loading a save does: it is
  finding yourself in the room, not walking into it. That is the post-win
  trigger, and it makes both beats reload-safe with nothing new in the model.
- **`marcusSeesYouOff`** spans the night (set by Dana at your door, cleared by
  Marcus in the casino). It is what tells the night home apart from the rent
  receipt, and the ride in apart from the Silver Creek arrival card.
- **Dana sits in on the first night as herself.** Marcus's room had a fixture
  named Dana at the card table in every chapter; it is now a chapter of her
  schedule, from the opening until she walks you home.

Left, for the user to decide:

- **Marcus's ride costs the hour**, like every forced ride; the bus you take
  yourself out of town costs a day, and walking the reservation road costs
  nothing. So the ride neither hands out a day (walking is cheaper still) nor
  costs one. A forced ride out of town could be made to cost the day instead.
- **The old send-offs** (`marcus-sends-you-off`, `dana-takes-your-measure`)
  only fire for saves that won before this; delete them once those do not
  matter. The editor tests use `dana-takes-your-measure` as a fixture.

---

## 7. The frame — a televised final, and the road that led to it (2026-10-27)

The run no longer begins in the flat. It begins at the final table of the
**Legends Invitational**, on television, with the player the short stack by a
mile. The lights trip; the broadcast cuts to dead air; the player goes to the
bathroom with the lenders texting them, looks in the mirror — "how did I get
here?" — and the game cuts back to the flat above the bakery. Everything from
Basin up is the answer. It ends where it began: the same table, the same
deficit, and the player plays it out.

### The pieces

| Piece | What it is | Where |
|---|---|---|
| **Prologue** | Studio → booth → bathroom → phone → mirror → "some time earlier". Plays once, on a new game. Skippable. | event `prologue` (enterArea `home`, onLoad) |
| **`reel` action** | A short film in front of the street: a set drawn at runtime (`studio`, `booth`, `bathroom`, `mirror`, `phone`, `alley`, `rail`, `night`), an optional LIVE ticker, lines turned like a text box, a Skip button. The first non-map scene an event can show. | `world/events.ts` (`reel`), `game/ReelScene.tsx`, `game/reelArt.ts` |
| **Interludes** | Chip Van Doren (oversells) and Dr. Priyanka Anand (the numbers, apologising for them) fill the dead air with a "Road to the Final" package. One after every hop up the ladder, appended to each town's send-off; they react to what you did (busted, owing) and each **scouts one town's lunatic** — and what they say is true at the table. Sets `scouted*` flags; the Record page lists the reads. | the six send-offs in `events.ts`; `SideNav.tsx` |
| **The final table** | Six-handed (you and five): Nadia, Reverend Gaines, the Contessa, Bernard, Zeke. You sit down with 15,000 (7.5 big blinds) against 720,000 across the table. No buy-in, no cashing out; `proof` ($120,000 in the bank, not spent) is what lets you in, `prize` ($750,000) is what winning pays. | `TABLES['lumina-finale']`; events `nadia-names-the-match`, `final-table-start` |
| **Losing it** | Out of chips → the back door, the sponsors' people on your heels (Dutch, Mr. Lowe, Ms. Fong), your friends getting in their way (**choice**: fire stairs → Marcus with a banquet chair; the kitchen → Dana lying in four languages; walk out → Hal on pot odds, forty minutes; Kit too if you staked him) → back to the rail, back to the same table at the same deficit. There is no rematch week: you replay until you win. | event `final-lost` (trigger `finaleLost`) |
| **Winning it** | The commentators lose it, the rail (Marcus, Dana, Dolores) comes over the ropes, the credits roll, then the ending card and open play. | event `final-won` (trigger `finaleWon`) |

### The lunatics

One per town, grounded and sleazy, each a different way of being wrong at a
card table. Each is on the floor in their own town, scouted in the interlude
after it, and — except Dolores, who is on the rail — seated at the final.

| Town | Lunatic | The bit | Plays | At the final |
|---|---|---|---|---|
| Silver Creek | **Lucky Dolores**, 74 | A rabbit foot, a system, a late husband and a blue chair that took him | station, novice | the rail ("rub the foot, honey") |
| Riverbend | **Reverend Gaines** | Tithes ten percent of every pot to "the boat fund" | nit, competent, deep | seat |
| Crescent Harbor | **The Contessa** | "Of the Lyon Valmonts. Or Leeds." The accent slips when she is thrown | maniac, sharp | seat |
| Palm Cay | **Bernard** | Two days at the table; believes it is Thursday | whale, novice, three times deep | seat |
| Neon Mesa | **Zeke "KingPin"** | Streams every hand to eleven thousand people, one of whom is his mum | regular, competent | seat |

Hal teaches the nerd's side of the game; Dr. Anand is the nerd on the air.

### Also changed with it

- Walking into an empty chair at any table offers a seat (Space or X); the
  dealer is not needed. Betting works with the arrows and Space at every
  table.
- The heads-up rematch week is gone. The beats written for it
  (`nadia-makes-you-wait`, the `challenge` conditions) are now only reachable
  by a save that quit mid-way; `nadia-rematch` takes you straight back to the
  table.

### Still to do

- More of the broadcast: a mid-hand commentary option at the table (proposed,
  not built — decided against it for now to keep the table quiet).
- Bust beats for Deb/Rosa/the Fixer and a stake-sized home game (§6) are
  unchanged.
- Per-town lunatic *beats* beyond their lines (a talk event each) are not
  written; today they are met in their lines, the interludes and the table.
