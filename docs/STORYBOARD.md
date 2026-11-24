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
| **The film.** The televised final, the bathroom, the mirror, "some time earlier": three reels and a scene. One Skip (or Esc) skips all of it; after it, watched or skipped, one line says how to walk, talk and find Jobs | Your apartment | enterArea home **onLoad** | a new game | `prologue` | built |
| Rent, the note on the table; Marcus's note by the door ("SENT SOMEBODY TO FETCH YOU. GO OUTSIDE") | Your apartment | POI lines | — | `apartment-window`, `apartment-note`, `apartment-door-note` (POIs) | built |
| The Jobs page leads with the next step from the first tick: "Go outside. Someone is looking for you." → Dana at the stop → Marcus's door → he will deal you back in → he is at your door | Menu → Jobs | — | `world/nextSteps.ts` | `NEXT_STEPS` (data) | built |
| Rent day, if the game is still unwon on day ten: Marcus has vouched for you | Your apartment | interact window | day ≥ 10, not wonPokerNight | `rent-day` | built |
| **The opening.** The first time you step out of your door, Dana runs up Basin Street to catch you ("You walk fast for somebody with nowhere to be"), you answer her (**choice**: why do you watch / then watch tonight / mind your own business), she walks you to the end of the street, and rides the 14 with you to Eastgate (a forced ride: no skip, the hour passes, it is afternoon) and goes in at Marcus's door ahead of you | Dana, Basin Street → depot → the 14 → Eastgate | enterArea basin (also on load) | not wonPokerNight, first night not played, Dana not met, not night | `dana-walks-you-to-the-bus` | built |
| …or, for a run that reached the depot without her: she is waiting at the stop, and the same ride | Dana, the depot | enterArea depot (also on load) | as above | `dana-at-the-depot` | built |
| …or (**choice**: walk with her / Patel's first) you take a few minutes on your own: she goes on to wait at the stop ("Do not make me come and find you twice"), and Seventh Street is yours | Dana, Basin Street | — | — | `dana-walks-you-to-the-bus`, `danaAtTheStop` | built |
| **Mr Patel's dollar.** The busker has won Patel's dollar at liar's poker eleven mornings running; Patel says watch his foot. Play him (**choice**: call — he is lying / raise to four sevens): call and Patel pays $40 and says Marcus folds to anything loud; raise and you lose to a bluff with a bluff, $10 and "when you know, you call". Teaches the walk, the talk, a choice and the Jobs page | Mr Patel, the bodega → the busker, Seventh Street | interact | — | `errand-patel` (errands.ts), `errandPatelRaised` | built |
| Dana at the stop: what she heard (four sevens, or two sevens and a straight face), then the same ride and Marcus's door; Marcus has had a call from Patel | Dana, the depot → the 14 → Eastgate → Marcus's | enterArea depot (also on load) | `danaAtTheStop`, first night not played, not night | `dana-waits-at-the-stop` | built |
| "Tonight. My place." | Marcus, Basin Street, morning | talkTo marcus | not wonPokerNight, morning (from day 2; on the day of the opening he is out for ice) | `marcus-reminds-you` (repeatable) | built |
| The Friday game. Dana is at the table as herself (a chapter of her schedule, from the opening until she walks you home) | Marcus's place, afternoon on — where Dana has just left you | talkTo marcus | not wonPokerNight | `poker-night` → poker night | built |
| **Lost the first night.** Up from the table without the money: "Everything on the table. I hate that rule. I made that rule"; the chairs stay out, talk to him any night; Dana: "It worked on Tuesday because nobody on Tuesday was watching" | Marcus and Dana, his front room | enterArea marcus-house **onLoad** | first night played, not wonPokerNight, chapter Basin, afternoon on | `poker-night-lost` → `poker-night-again` | built |
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

### Act 6 — Porto Lumina · the tournament, then the Invitational final

- **Face:** Nadia Okonkwo. **Want:** the penthouse. **Problem:** the buy-in,
  and Madame Wen offering it. **Thread:** Kit as the warning; Dana's reveal;
  Hal's last lesson; Marcus at the rail. **Payoff:** the match.
- **Turn:** everything that followed you up the ladder turns out to have been
  pointing here.

| Beat | Who / where | Trigger | Conditions | Event id | Status |
|---|---|---|---|---|---|
| Arrival card: thirty at the nosebleed, twenty to enter the tournament | Photographer, the waterfront | enterArea pl-street | — | `arrive-lumina` | built |
| **Kit, broken**: forty hands; the Consortium's men; "don't take Wen's money" | Kit, waterfront, morning/afternoon | talkTo kit | chapter Lumina, no penthouse | `kit-lumina` | built |
| **Nadia names the match** — greets you at the foyer rope: she knows the kitchen table; somebody has been writing to her; she has sent a car for Marcus; win the Poker Legends tournament to make the final | Nadia, the gap in the foyer rope | standOn pl-casino (20,22) | chapter Lumina | `nadia-names-the-match` | built |
| **The tournament** — the desk at the back ($20,000); ten rounds of ten hands, blinds up each round (100/200 → 2,000/4,000), a knocked-out player replaced from a pool with a stack to suit the stage; after round ten it is the final table, played to one winner; lose and it is $20,000 again from round one | Tournament Desk | table | — | `lumina-tournament` → `tournament-won` / `tournament-lost` | built |
| **The slide** — montage (the buy-in, a hot start, down to $15,000, the lights go), the men's room, Marcus's pep talk, the broadcast back on | — | tournamentWon | — | `tournament-won` → `lumina-finale` | built |
| **Dana's reveal**: "I'm the someone." | Dana, casino floor, evening/night | talkTo dana | chapter Lumina, no penthouse | `dana-reveal` | built |
| Marcus at the rail: "Whatever happens, the kitchen table is still in my kitchen." | Marcus, waterfront / casino | talkTo marcus | after `nadia-names-the-match`, no penthouse | `marcus-at-the-rail` | built |
| Hal on the eve: the heads-up lesson he never sold (button posts the small blind, acts first pre-flop and last after; open wide from it) | Hal, waterfront, evening/night | talkTo hal | chapter Lumina, no penthouse | `hal-on-the-eve` | built |
| Madame Wen's stake | Wen | sponsor | — | `wen` (sponsor) | built |
| The Invitational final | Nadia's table | after `tournament-won` | $15,000 against 720,000 | `lumina-finale` → `final-won` / `final-lost` (back to the same table at $15,000) | built |

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
shakedown takes everything you own but a bus fare and leaves the debt; a lost match keeps the
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
| **A stake missed** | the hunt | the sponsor ("he is out looking for you") | pay (skipping town does not help: they ambush you on arrival) | paying calls the hunt off |
| **Caught** | every possession and all cash but a $20 fare; the debt stands | the sponsor's collector, in person | the debt, three days of grace | rebuild, pay; the sponsor notices you paid late |
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
  the boat — everything, and the debt did not move
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
| **Prologue** | On the game's own table (`cinematic` `bad-beat`): the final of the Legends Invitational, a scripted hand dealt street by street — pocket aces against the Contessa's suited king-queen, nine outs, a flush on the river and a 165,000 pot — then the rig fails, the room goes dark in stutters, and you stand up ("Excuse me, I need the bathroom") and walk out of the light in your street sprite. Then the booth, the corridor, the men's room, the phone, the mirror (all in the street's sprite), and "some time earlier". Plays once, on a new game. Skippable. | event `prologue` (enterArea `home`, onLoad); `game/BadBeatIntro.tsx` |
| **`cinematic` action** | A scripted scene drawn by the game itself rather than a set. One so far: `bad-beat`. | `world/events.ts`, `game/BadBeatIntro.tsx` |
| **`reel` action** | A short film in front of the street: a set drawn at runtime (`studio`, `booth`, `bathroom`, `mirror`, `phone`, `alley`, `rail`, `night`), an optional LIVE ticker, lines turned like a text box, a Skip button. The first non-map scene an event can show. | `world/events.ts` (`reel`), `game/ReelScene.tsx`, `game/reelArt.ts` |
| **Interludes** | Chip Van Doren (oversells) and Dr. Priyanka Anand (the numbers, apologising for them) fill the dead air with a "Road to the Final" package. One after every hop up the ladder, appended to each town's send-off; they react to what you did (busted, owing) and each **scouts one town's lunatic** — and what they say is true at the table. Sets `scouted*` flags; the Record page lists the reads. | the six send-offs in `events.ts`; `SideNav.tsx` |
| **The final table** | Six-handed (you and five): Nadia, Reverend Gaines, the Contessa, Bernard, Zeke. You sit down with 15,000 (7.5 big blinds) against 720,000 across the table. No buy-in, no cashing out; `proof` ($120,000 in the bank, not spent) is what lets you in, `prize` ($750,000) is what winning pays. | `TABLES['lumina-finale']`; events `nadia-names-the-match`, `final-table-start` |
| **Losing it** | Out of chips → the back door, the sponsors' people on your heels (Dutch, Mr. Lowe, Ms. Fong), your friends getting in their way (**choice**: fire stairs → Marcus with a banquet chair; the kitchen → Dana lying in four languages; walk out → Hal on pot odds, forty minutes; Kit too if you staked him) → back to the rail, back to the same table at the same deficit. There is no rematch week: you replay until you win. | event `final-lost` (trigger `finaleLost`) |
| **Winning it** | A sour success, all of it in the ending film: the stage with the confetti coming down on nobody, Nadia's exit, the penthouse, the divorce petition, a settlement statement that leaves you a fifth of the prize, Marcus's unanswered thread, the window, bitter credits, and a last missed call at first light. Then the ending card; back on the street Dana says the one line. | `EndingFilm` (`world/ending.ts`), played as the `ending` cinematic of event `final-won` (trigger `finaleWon`; playable from the playtest panel) |

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
- The tournament in front of the final (2026-11-04): `TableDef.tournament`
  (rules in `engine/tournament.ts`, the between-hands step in
  `game/tournamentFlow.ts`), the `tournamentWon` / `tournamentLost` triggers, the
  `wonTournament` flag (the Invitational table refuses you without it), `standOn`
  beats now actually fire, `final-lost` runs on a lost final (it never did), and the
  Lumina casino is a 40×26 hall with nine tournament tables.
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

---

## 8. The Okonkwo question — a mystery, a rival, a boss each town (built, 2026-11-07)

Status: **built** except where marked. Decisions: the penthouse is Wen's collateral, the debt choice stays, and Kit is a real opponent at the final table. Everything is data — events, flags,
character chapters, a Jobs/Goals line — and fits the content model in the Bible.
Bosses named below (Lou Brannigan, Odette, Bellamy, Inés Calloway, Solomon Vale)
are from `goals.ts`; their lines should be fitted to the voices already in
`characters.ts` when written.

### 8.1 The mystery: *why does Nadia want you?*

The long pull today is "the penthouse." It needs a question under it, one the
player can only answer by going up the ladder. **The question: Nadia Okonkwo has
held the penthouse for four years, and has been reading Dana's letters about a
nobody from a kitchen table. Why does the champion want a challenger?**

**The answer (revealed at Lumina).** The penthouse is not Nadia's. Madame Wen
staked Nadia's first chip, and the debt chain (Cass → Emeka → Consortium → Wen)
is the ladder Nadia climbed; she is still on its top rung. She holds the
penthouse *as Wen's collateral*, and cannot lose on purpose without Wen taking
it. She wants someone who beats her **fairly**, so the loss is nobody's fault
and the debt passes to the winner's name or is settled in the winner's. That is
why Dana's letters were a scouting report and a job interview in one.

This keeps every built beat true (Dana the scout, Wen's stake offered to you,
Kit warned off Wen, Nadia's "Watch for the next one") and gives the ending film's
hollow note ("I've made it...", the unanswered call) a cause: *the penthouse
comes with a creditor.*

**The clues: six, one per stop, found by talking.** Each is one event that sets a
flag `clue<Town>`, fired by a character the player already meets (no new maps).
A **Nadia file** line on the Jobs page shows "Clues: 3/6" and the last one read.

| # | Town | Who says it | The clue |
|---|---|---|---|
| 1 | Basin | Marcus, after the first game | Nadia came through Basin once, years ago: sat at *this* table, won, left her watch under the sugar bowl. He still has it. (Item: **Nadia's watch**, returnable in Lumina.) |
| 2 | Silver Creek | Ray | A girl bought her first stack here with a wedding ring and lost it twice in a night. "Third time she didn't lose." Someone paid her stack: a Mr. W. |
| 3 | Riverbend | Cass | Cass's first sponsor came from the same house as Nadia's: "Everybody up there owes somebody. She just owes the biggest." |
| 4 | Crescent Harbor | Hal | Why they split: he taught her to read people; she couldn't stop. "I told her the table is the only place you are allowed to do that. She took the penthouse for a table that never closes." |
| 5 | Palm Cay | Rosa (or Marcus on holiday) | The Invitational's prize is paid by the Consortium. Nobody has ever seen the champion spend it. |
| 6 | Neon Mesa | Dana, at Ultraviolet | Dana is not Nadia's friend; she is her *employee* ("scout") and has her instructions: find someone who plays fair under pressure. She was told not to say who for. |

**Payoff, tied to clue count.** Dana's reveal (`dana-reveal`) and Nadia's match
read differently by clues found: with all six, Dana tells the whole truth and
Nadia opens the match with one line that proves you did the work (the watch, if
you kept it). With none, the match is what it is today. A found-all run unlocks
one extra post-win beat: **Nadia asks how you want the debt written** (a choice,
see 8.4), which becomes a line in the ending film's settlement statement.

### 8.2 Kit: the rival who answers to how you treat him

Kit is a sneer on the dock, a door ahead, a broken man at Lumina. The player is
only ever a witness. Make them a cause. Three tracked decisions, each a flag:

1. **Riverbend (`kit-on-the-dock`): the dare.** Choice: take Cass's money to
   prove him wrong / refuse it. Kit remembers which.
2. **Palm Cay (`kit-palmcay`): the head-to-head.** New: Kit challenges you to a
   heads-up side match for his share of Bernard (an optional table, `walkIns: []`,
   like a boss's match: buy-in against buy-in). Win and he's rattled and short;
   lose and he leaves richer and lighter-spoken. Neither blocks the ladder.
3. **Neon Mesa (`kit-mesa`): the debt.** He is eleven short and going to Lumina
   anyway. Choice: stake him (needs cash, sets `stakedKit` earlier than the
   aftermath), tip off Mr. Lowe, or say nothing.

**Where it lands (`kit-lumina`, and the tournament):**

- Staked at the Mesa → Kit stands at the rail at the final, pays you back whatever
  happens, and says Wen's real terms (the clue that completes 8.1 even if you
  missed one).
- Left alone → Kit takes Wen's money and is **a seat at the tournament's final
  table**, playing worse than he is: a rival you can *beat*, and it costs you
  something to.
- Tipped off the collector → Kit is hunted, and `kit-after` changes: he asks for
  nothing.

The aftermath's existing stake choice (`kit-after`) stays, so a run that never
helped him still has the door open.

### 8.3 A boss who is a person in each town

Each of the five bosses already has a table and a private room. Give each **one
beat before the match (their room's door) and one after (a line in the street)**,
each tied to the Nadia file so the match is also a conversation. Clue numbers
refer to 8.1, which these can carry in place of the named speaker if the town's
face is busy.

| Town | Boss | Before | After |
|---|---|---|---|
| Silver Creek | Lou Brannigan | He calls Nadia "that girl with the ring" — he was at the table (clue 2 can be his) | He shakes your hand and gives you his seat at the Starlite rail |
| Riverbend | Odette | Odette plays Cass's debt like a hobby and tells you the rope is how they pick who to watch | She cuts your debt interest by half if you owe her sponsor (a one-time perk) |
| Crescent Harbor | Bellamy | "Hal sends me his best pupils. Then they stop writing." | Hal's tells lesson is unlocked free |
| Palm Cay | Inés Calloway | Honeymoon comped by the Consortium — she knows who pays the Invitational (clue 5 can be hers) | She sends a note to the Mesa ahead of you: the Fixer's price drops |
| Neon Mesa | Solomon Vale | He says the Consortium has a champion and it is not Nadia's name on the cheque | He tells you where Kit is hiding and whether you are on the list |

### 8.4 Marcus's phone: the voice that keeps you honest

The ending already ends on Marcus's call, unanswered. Make the whole game that
phone ringing. **One short voicemail from Marcus at the end of each town's boss
match**, queued as a `cinematic`-style line on the next morning's wake (one
event per town, a few lines each, every line waits for a press).

- He reacts to what you did (won the boss, owed a sponsor, staked Kit, kept the
  watch) using the same flags the cast already reads, so two runs hear different
  messages.
- He never gives advice about poker. He talks about the street, the kitchen
  table, and a small running joke the player will recognise by the third
  message.
- The sixth voicemail, at Lumina's arrival, is the one the player has been
  waiting for. The ending's *unanswered* call at first light then lands, because
  the player has answered every other.

**The last choice (post-win, only if every clue was found):** Nadia offers to
hand over the debt, and you pick how to carry it: *settle it with the prize*,
*let Wen hold it and keep the penthouse*, or *give Kit's stake the penthouse's
name*. One line each in the settlement statement; no new mechanics.

### 8.5 Build order (smallest first)

1. Marcus's voicemails (5 events) — pure data, immediate payoff.
2. The clue flags, the six clue events, the Jobs/Goals "Nadia file" line.
3. The five boss beats (10 events).
4. Kit's three choices and the two Lumina variants (including Kit's seat at the
   tournament's final table — the only beat that needs a content-model check:
   can an event seat a named character in a tournament?).
5. Dana's reveal and Nadia's opening lines varying by clue count; the final
   debt choice and its line in `world/ending.ts`.

Open questions for you: (a) is "the penthouse is Wen's collateral" the answer you
want, or should Nadia's secret be something personal? (b) Is a debt settlement
choice too bleak for the ending you have, which currently reads as a cost of
fame? (c) Should Kit's seat at the final table be a real opponent or a cameo?

### 8.6 As built

- **Voicemails.** Not a new trigger: each is an `if` at the head of the arrival
  beat (`arrive-riverbend` … `arrive-lumina`), played when the previous town's
  boss is beaten. They read `trustsDana`/`cutDanaOff` (Riverbend), the Cass debt
  (Harbor), any overdue debt (Palm Cay), any debt (Mesa). The ice joke runs one
  bag → a cooler → a second freezer → the baker's walk-in → "I'm bringing the ice."
- **Clues.** Flags `clueWatch` (Marcus on the 14), `clueRing` (Ray), `clueRope`
  (Deb, not Cass: sponsors have no talk beat), `clueTable` (Hal), `clueConsortium`
  (Marcus on holiday), `clueScout` (Dana at the Mesa). Four are also set by the
  boss beats below, so a save that skipped the first speaker still gets them.
  Saves that skipped Marcus's ride (`clueWatch`) cannot reach six of six.
- **The Nadia file** is `nadiaFile` in `game/progression.ts`, shown on the Jobs
  page from the first clue.
- **Dana's reveal** (`dana-reveal`) tells the whole Wen story with six clues and
  a hint with fewer. The **debt choice** is in `final-won`, before the ending
  film, with six clues only: settle (`penthouseSettled`), leave it with Wen
  (`penthouseWen`), or open a stake fund (`penthouseFund`). `ledgerFor` in
  `world/ending.ts` changes the settlement statement; `dana-after` reads the flag.
  The fund option reads "open a stake fund in the room's name" (what "give Kit's
  stake the penthouse's name" turned into): it makes you the sponsor.
- **Kit.** Riverbend: a choice sets `tookKitsDare`, read by `kit-palmcay`. Palm
  Cay: an optional cash game at `palmcay-kit` (heads up, $5,000, you may rebuy or
  stand up; no outcome flag because tables have no result trigger). Mesa: stake
  him $10,000 (`stakedKit`), tip off Mr. Lowe (`tippedOffKit`) or say nothing
  (`ignoredKit`). At Lumina each has its own beat (`kit-lumina-staked` …); staked
  Kit is repaid at the aftermath; `ignoredKit` seats him at the tournament's
  final table (`guestId` in `stepTournament`, in the shortest chair, once);
  tipped-off Kit asks for nothing (`kit-after-hunted`).
- **Bosses.** Not new events: lines folded into the existing `*-boss-door` (before)
  and `*-boss-sendoff` (after) beats. The "after" perks in §8.3 (debt interest
  halved, Hal's lesson free, the Fixer's price) are **not built**, because each
  needs mechanics, not data; they are lines only.


---

## 8. The philosophy-forward frame (2026-11-17)

The player is a reader of philosophy, and the run is told through it. The "some
time earlier" reel is now the morning of the first game: Kant's sublime at the
bus window, Raskolnikov on the landlady's stairs, Pascal's wager over Marcus's
invitation, Hal's video on Poogle, a History of Philosophy read to sleep, and Dana
at the door. See REQUESTS.md ("Philosophy theme, round 1"). Hal's tape is
no longer at Marcus's table.

---

## 9. The philosophy pass (proposed, 2026-11-17)

Status: **built**, all five steps of 9.7. Steps 1 to 3 (2026-11-17, branch `story-philosophy`): the single lines, the booth pairs, the losing paths, three reels on built sets and the lunatics' beats. Steps 4 and 5 (2026-11-18, branch `story-philosophy-2`): the six new reel sets, the four reels on them, the workroom shelf, Bernard's hint and the leap moved into the lift. Silver Creek's night was built first (9.4). This carries
the opening's philosophy up the whole ladder: each stop has one thinker, each of
the cast has a worldview, and each town has one short existential `reel`, a night
alone with a book. It all fits the content model: lines in built events, a few new
`talkTo` / `enterArea` / `interact` events, table hints, one new flag and five new
reel sets. Nothing here changes a card (rule 1).

### 9.1 Rules for the pass

- **One thinker a stop**, picked for the town's mood, its boss and its lunatic. A second name may come back as a callback, never as a second lecture.
- **Who may say a name.** The player (in thought, in parentheses, and in the reels), Hal (a teacher), Bellamy (has read everything), Vale (wants you to know he has), Gaines (a churchman) and Dr. Anand (the numbers). Everybody else *is* an idea without naming it: Marcus says "some Roman", Kit says "your book with the axe", Dana says "somebody said once".
- **Through the poker, short.** One or two lines a beat, landing on a card, a stack, a tell or a debt. Grounded and a bit sleazy: these books are read in motels.
- **Rule 1 holds.** Philosophy explains variance and never touches it. No line implies the deck owes anybody; several exist to say it does not.
- **The books thin out as the stakes rise.** The player quotes freely in Basin and stops at Lumina: after *The leap* they name nobody until the Greeks come back in the penthouse mirror.
- **Mechanics.** Reel lines wait for a press, as every reel's do. Reels neither cost nor give time (rule 4). New events are one-shot (the default). A flag nobody reads fails `events.test.ts`, so beats here lean on `eventDone`; the one new flag is `rubbedTheFoot`.

### 9.2 The run in one table

| Stop | Thinker, idea | Why here | Existential reel (where) | At the table |
|---|---|---|---|---|
| Basin, the flat | Pascal (the wager; "sit quietly in a room"), Epicurus at Marcus's table | Pascal and Fermat invented this game's maths; Pascal wrote the cruellest line about gamblers. Marcus is bread, water, friends | *Sitting quietly*: the night after the first win (`dana-walks-you-home`) | Expected value: what a call costs against what it might win |
| Silver Creek | Camus, the absurd | Ray "due" thirty years, Lou thirty years in the chair, Dolores's foot (the hope Camus refuses) | *One must imagine*: after Lou (`silvercreek-boss-sendoff`), **built** | Variance; the deck keeps no records |
| Riverbend | Heraclitus, the river; Nietzsche's *Schuld* in passing | A boat on a river, Kit gone a week, Odette's river, the first debt, Gaines's wager with a rake | *The same river*: first night aboard (new `riverbend-deck-night`) | Every hand is a new river; bosses turn (`seat.phases`) |
| Crescent Harbor | Montaigne, "What do I know?" | Hal's tells start with your own (know thyself); Bellamy who has "read" you, and Montaigne's cat; the Contessa, all patchwork | *What do I know?*: after Hal's first lesson (new `harbor-mirror`) | Tells; a bluff is a patch worn on purpose |
| Palm Cay | Seneca, the shortness of life, against Marcus's Epicurus | A resort where time dissolves: Bernard's endless Thursday, Inés's comped honeymoon, Marcus on holiday | *Is it Thursday?*: a night on the beach (new `palmcay-beach`) | Days are scarce (rule 4); Hal's notes are Seneca's evening review |
| Neon Mesa | Plato, the cave and the ring of Gyges | Screens, a streamer, Vale's cameras "off"; Nadia wants someone fair when nobody is looking | *The cave*: after Vale (`mesa-boss-sendoff`) | Tells are shadows, showdown is the light |
| Porto Lumina | Kierkegaard, the leap; Sartre's "hell is other people" at the rope; Nietzsche on a lost final; Hegel for Nadia | A tower forty-one floors up; a hall of nine tables that never thin; the frame catching up with itself; the final-lost loop | *The leap*: the eve of the final (`hal-on-the-eve`) | At seven big blinds the leap is arithmetic; the variance after it is honest |
| Aftermath | The ship of Theseus; Epicurus; the Greeks' wonder | A mirror over a fireplace somebody else lit; "winner hosts" | *The ship*: the penthouse mirror (new `penthouse-mirror`) | none: the poker is over |

The player's own arc: wonder → wager → absurd → flux → the self → time → the cave →
the leap → (recurrence, if the final is lost) → Theseus → wonder. It starts and ends
with the Greeks.

### 9.3 The cast and their worldviews

| Who | Worldview | How it shows |
|---|---|---|
| **You** | The reader | Quotes to cope early, stops quoting at the leap, ends asking whether they are the same ship. |
| **Marcus** | Epicurus: friends, bread, water, a table | Never names him. Brings a paper cup of *water* to the men's room (`tournament-won`); picks the Greek over the Roman at Palm Cay; "winner hosts". The ending's hollowness is what forgetting him looks like. |
| **Dana** | Simone Weil: attention is the rarest generosity | She watches for a living. In `dana-reveal`: "Somebody said paying attention is the rarest kind of generosity. I got paid for it, so I do not know what that makes me." |
| **Hal** | Socrates, with a Sophist's guilt | "Know thyself" is a tells lesson. In `hal-mesa-last-stop`: "Socrates had a pupil like her. Alcibiades. Best mind in Athens, and he turned it on everybody who loved him." (Alcibiades was Socrates's pupil; Plato wrote him down.) Charges for every lesson but the last. |
| **Kit** | Raskolnikov's "extraordinary man" | The prologue's joke ("pull a Raskolnikov") done for real. In `kit-lumina-staked`: "Your axe book. Somebody follows him to Siberia at the end. You are not her. You are close." |
| **Nadia** | Hegel's master who is the slave | Four years looked up at, never recognised, and Wen's collateral. She wants to lose to someone who did not have to sit down. |
| **Chip Van Doren** | Protagoras: the story is the measure | "The odds, Doctor, are a suggestion." |
| **Dr. Anand** | Hume (and Bayes): the deck keeps no records | Apologises for induction; one dry line an interlude (9.5). |
| **Lou · Odette · Bellamy · Inés · Vale** | Sisyphus · Heraclitus · Montaigne's cat (who is reading whom) · Aristippus (pleasure now, Seneca's foil) · Gyges's ring | Lou has pushed one rock thirty years; Odette's river changes every hand; Bellamy asks which of you is the cat; Inés: "life is short, raise"; Vale turns the cameras off and records everything. |
| **Dolores · Gaines · Contessa · Bernard · Zeke** | Hope (the leap Camus refuses) · Pascal's wager with a ten percent rake · Montaigne's patchwork self · Seneca's wasted days · Berkeley's *to be is to be perceived*, inside Plato's cave | Each is a way of being wrong about the cards that is also a way of being wrong about life. |
| **Cass · Emeka · Consortium · Wen** | Nietzsche's creditor (debt before guilt) · Marcus Aurelius (patience, as menace) · Hobbes's Leviathan (a body made of many men) · Hegel's lord at the top of the chain | Nobody names a thinker; the debt chain is the moral ladder under the poker one. |
| **Ms. Fong · Mr. Lowe** | Kafka's ledger · Bentham's panopticon | "She writes small." "We do not lose track of people." |
| **Ray** | The gambler's fallacy | Sisyphus without the smile. |

### 9.4 Town by town

Each: (a) the idea and why; (b) beats: trigger, who, lines; (c) the reel; (d) the
poker tie. Lines are drafts, to be fitted to the voices in `characters.ts`.

#### Basin and the flat: Pascal, and Epicurus at the table

(a) Built in the opening: Kant at the bus window, Raskolnikov on the stairs, Pascal's wager over the invitation, the Greeks' wonder by the bed. Missing: the night *after* the first game, where the player admits it was never only the rent. Pascal fits: he and Fermat invented probability in 1654 to settle a gambler's question, and he wrote that a gambler given each morning what he might win, on condition he does not play, is made miserable.

(b) Beats:
- `poker-night-lost` (the first loss), after Marcus: **You:** "(Pascal would say I bet right and lost. Pascal never had to get past the landlady.)"
- `dana-walks-you-home` (the first win), before the route: **Marcus:** "Bread from downstairs, wine from a man, friends from God knows where. That is a whole life. People get greedy and forget." **You:** "(Epicurus, near enough. Marcus has never read a word of him.)"
- `marcus-rides-out-with-you`, on the 14: **You:** "(Same window as yesterday. Same bird, probably. The sky looks smaller when you are going somewhere.)" Kant's sublime, shrunk by a goal.
- `rent-receipt` (home again, rent paid): **You:** "(Nobody tiptoeing on these stairs any more. Sorry, Fyodor.)"

(c) Reel **"Sitting quietly"**: **built**, in `dana-walks-you-home` between lying down and the morning (faded out; no time passes). The shelf first, then the bed, so the bed set's lamp going down ends it.
- `shelf`: *The flat. Two in the morning. The fridge hums. Marcus's friends' money is under the pillow, and you are up at the shelf.* "I should be asleep. I won. Winners sleep." / "Pascal. 'All of man's misery comes from not being able to sit quietly in a room alone.'" / "He had one about gamblers. Give a man every morning what he would win that day, on condition he does not play, and you have made him unhappy."
- `bed`: *Back to bed with him.* "So it is not the rent." / "...It is a little bit the rent."
- Turn: the want is named; the ending's hollow win has its seed.

(d) The wager is expected value, what a call costs against what it might win: Hal's tape in other words. Pascal and Fermat's *problem of points* (splitting the pot of an interrupted game) is the prologue's power cut; Dr. Anand says so in the first interlude (9.5).

#### Silver Creek: Camus, the absurd

(a) A town of men pushing one rock: Ray "due" thirty years, Lou thirty years in his chair, Dolores rubbing a foot since 1971, which is the hope Camus calls an escape.

(b) Beats:
- `ray-is-due`, after "thirty years": **You:** "(The cards do not know Ray. They do not know anybody. That is the worst thing about them, and the best.)"
- New `dolores-foot` (**built**; talkTo `dolores`, who is on `sc-floor` afternoon to night; no period condition, so any first talk gets it, then her schedule lines as before): **Dolores:** "Rub the foot, honey. Fifty years it has told me to call, and I have called. My Walter never rubbed it. Look where Walter is." Choice: *Rub it* → `setFlag rubbedTheFoot`, **Dolores:** "There. Now it knows you." **You:** "(Camus says hope is the trap. It is very soft, though.)" / *I will take my chances* → **Dolores:** "Brave. Stupid, but brave. Walter was brave." **You:** "(The deck has never met her foot.)" Dolores is not seated at the final (she is on the rail), so the payoff is Chip's, by `if` on `eventDone dolores-foot` then `rubbedTheFoot`: in `final-table-start`, and on the main path at the end of `tournament-won` ("Hold the deal one second. Front row: Lucky Dolores is on the rail, folks, rubbing that rabbit foot FOR / AT our challenger!"), and Dr. Anand says the deck has not noticed (rule 1). Never met her: nothing is said.
- `ray-busted` (busted here; the beat repeats, the thought plays on the first bust only, `count busted atMost 1`): **You:** "(The rock rolled back down. Camus says the walk down after it is the part that is yours.)"

(c) Reel **"One must imagine"**: **built**, at the end of `silvercreek-boss-sendoff` (`night`, `bed`; commit d675e21). The template for the rest: a motel, a paperback, Lou and Dolores as the rock, "I would like to see what the next rock looks like."

(d) Variance. A cooler is a cooler (rule 1); the absurd is playing well and losing. Ray's "due" is the gambler's fallacy, and the game's honesty is what makes it one.

#### Riverbend: Heraclitus, the river

(a) A boat whose wheel turns and arrives nowhere; Kit aboard a week and gone ("people like that do not stay anywhere"); Odette, whose river keeps bad players. The first debt: in German *Schuld* is both debt and guilt, and Nietzsche built a book on it. Gaines is Pascal's wager with a rake, a callback to the opening.

(b) Beats:
- `kit-on-the-dock`, before the dare: **Kit:** "Some people stand on the dock. Some people step over. I read that somewhere." **You:** "(Raskolnikov had that theory. It went great for him.)"
- New `gaines-tithe` (**built**; talkTo `gaines`, on `rb-boat` evening and night): **Gaines:** "Pascal said bet on God, because the downside is nothing. I say ten percent, because the downside is ten percent. I am a reasonable man." **You:** "(Pascal worked out the maths of this game with a man called Fermat. He would want to see the boat.)" **Gaines:** "There is no boat yet. That is what the fund is for." No money changes hands (rule 5). Table hint `gaines-boat` at `lumina-finale`: "Still not tithing? The boat is half built. The front half."
- `cass-offers`, in the branch that takes the stake: **You:** "(Nietzsche says the oldest thing between people is a debt, and guilt came after. I have just shaken on mine by a bollard.)"
- `riverbend-boss-door`: **Odette:** "The river is never the same twice. So I never play the same hand twice. Sit."

(c) Reel **"The same river"**: **built**, new event `riverbend-deck-night` (`enterArea rb-boat` with `onLoad`, so standing up from the night session finds it too; `chapter riverbend`, `period night`, after `arrive-riverbend`, and while the private room is still shut, which keeps it apart from `riverbend-boss-door`). Set **`deck`**. Two variants by `if` on Cass owing or overdue. As built, it opens on Kit's week aboard (Deb's line, "they say"), and adds "Every hand is a new river too. The last one does not owe you this one" (rule 1, said outright).
- *The deck aft of the card room. The wheel turns over and over and arrives nowhere it has not been.* "Kit was on this boat a week ago. Took Tiny for two thousand, tipped a chip, gone."
- "Heraclitus. You cannot step into the same river twice. It is not the same river." / "And you are not the same man." / owing: "The man at Marcus's table would not be on a boat with a stranger's money in his pocket." · not owing: "The man at Marcus's table would not have got on a boat without a friend to hold the door." / "Everything flows, he said. Chips especially."
- Turn: the player notices the change, and the debt makes it concrete.

(d) No hand is owed by the last. The same opponent is a new river by hand twenty: bosses turn (`seat.phases`; Odette goes wild when short), and position rotates every hand.

#### Crescent Harbor: Montaigne, "What do I know?"

(a) A supper club and a card room where everybody performs. Hal teaches tells, and the first tell is your own: *know thyself*. Montaigne went up a tower for ten years to study the one subject he had to hand, himself, and came down with a question on a medal: *Que sais-je?*, what do I know? He also wrote that "we are all patchwork, and each bit, each moment, plays its own game", which is a card room, and that playing with his cat he could not tell whether he was her pastime or she was his, which is Bellamy. The Contessa, of the Lyon Valmonts or Leeds, is patchwork with the stitching on the outside. (Sartre was here in the first draft; he is saved for Lumina's crowded hall, decided 2026-11-17.)

(b) Beats (**built**, except the reel):
- `hal-first-lesson`: **Hal:** "And everybody at that table is reading you. The first tell to find is your own. The Greeks carved it over a door: know thyself. They were not talking about poker. They should have been." **You:** "(Montaigne went up a tower for ten years to study one man, himself. He came down with a question, not an answer: what do I know?)"
- New `contessa-valmont` (**built**; talkTo `contessa`, in `ch-cardroom` evening and night): **Contessa:** "Darling. The Valmonts have played cards since Versailles. We lost the château on a river like tonight's. Bloody — mon dieu — river." **You:** "(Montaigne: we are all patchwork, and each patch plays its own game. Hers has a patch from Leeds. When it shows, she has been thrown.)" / "(That is not philosophy. That is a read.)" **Contessa:** "You are looking at me like a book, darling. Which page? The French ones are mine. Mostly." Table hint `contessa-leeds` at `lumina-finale`: "You are the one who heard the Leeds in me, darling. Nobody hears the Leeds. Raise. Mate. Darling."
- `crescent-boss-door`: **Bellamy:** "You read, I am told. Montaigne, playing with his cat, wondered whether he was not her pastime more than she was his. I have read every book on you. Let us find out which of us is the cat."
- `kit-harbor`: **Kit:** "Somebody says you read on the bus. The one about the man with the axe. He got caught because he felt bad. I do not feel bad."
- Booth, `hal-sends-you-on` (9.5): **Chip:** "A woman of mystery!" **Anand:** "A woman of patchwork. Montaigne said we all are. Hers has the stitching on the outside."

(c) Reel **"What do I know?"**: **built**, new event `harbor-mirror` (`enterArea ch-street`; `chapter crescentHarbor`, `period ['evening','night']`, after `arrive-crescent` and `hal-first-lesson`, and before Bellamy falls, which keeps it apart from `crescent-boss-sendoff` walking you onto the street). Sets **`harborroom`**, then `mirror`. As built, the mirror lines do not repeat `hal-first-lesson`'s Montaigne: "Montaigne had his question struck on a medal: what do I know? I would settle for knowing what my face does with two nines." The Contessa and Bellamy are not named (the player may not have met either yet): "Half the accents in that card room came in on the bus, same as mine."
- `harborroom`: *A room over the supper club, eleven dollars a night. The lighthouse crosses the wall every nine seconds.* "Hal says everybody leaks something. I have been looking for mine all evening."
- `mirror`: "Poker face." / "No. That is a man doing an impression of a poker player." / "Montaigne went up a tower to study himself and came down with a question on a medal: what do I know?" / "We are all patchwork, he said, and each patch plays its own game. The Contessa has a patch from Leeds. Bellamy has a library. I have a man from Basin doing an impression." / "At a card table that is not a lie. It is a bluff. The trick is knowing which patch is playing."
- Turn: the self as patchwork, the question the penthouse mirror finishes (a ship is planks; a man is patches).

(d) Tells (`seat.habit`, the Book of Reads); a bluff is a patch worn on purpose. Bellamy reads your aggression and counters it (his phase): who is the cat changes how he plays, never what is dealt.

#### Palm Cay: Seneca, on the shortness of life

(a) The resort where time dissolves: Bernard two days at the table and sure it is Thursday, Inés's comped honeymoon, Marcus on holiday. Seneca was the richest man in Rome writing about wanting less, and ended his letters quoting Epicurus: the argument between this island and Marcus. Days are the game's scarce resource (rule 4).

(b) Beats:
- `marcus-on-holiday`: **Marcus:** "Read one of your books on the plane. Some Roman, rich as anything, telling everybody to want less. Every letter ends on something a Greek said. Bread, water, friends. I liked the Greek better." **You:** "(Marcus has picked a side in a two-thousand-year argument by lunch.)"
- `palmcay-boss-door`: **Inés:** "Darling, life is short. I never understood people who save things. For what? Raise."
- Table hint `bernard-beach` at `palmcay-tourist`, `eventDone palmcay-beach` (**built**; one of the two is said): **Bernard:** "I saw you on the beach the other night, through the glass. Is it still Thursday? It is a very long Thursday." / "My wife says I am wasting my life. It is my life. I will waste it how I like. Raise!"

(c) Reel **"Is it Thursday?"**: **built**, new event `palmcay-beach` (`enterArea pc-street`; `chapter palmCay`, `period night`, after `arrive-palmcay` and `marcus-on-holiday`, and before Inés falls, apart from `palmcay-boss-sendoff`). Set **`beach`**. As built, it opens on the man behind the glass ("Somebody should tell him what day it is." / "Somebody should tell me."), does not lean on having met Inés ("This island would have comped his room"), and says Marcus "came all this way to sit on a beach for a week", true whether or not he has gone home yet.
- *The beach under the casino. Through the glass behind you, one man is still at a lit table.* "Seneca. 'It is not that we have a short time to live, but that we waste a lot of it.'"
- "He wrote that rich. Inés would have comped his honeymoon." / "Four sessions in a day, and the days are counted. I have spent more of them on this island than I meant to." / "Marcus goes home on Friday. He does not think that is wasting it." / "Seneca would have called him wise. Then gone back to the table."
- Turn: time is the real stake, and the friend going home is what it costs.

(d) A session costs a period (rule 4): the whale pays in hours. The Stoic split between what you control (decisions) and what you do not (cards); Hal's notes when you stand up are Seneca's evening review, the costliest pot-odds mistake and not the result.

#### Neon Mesa: Plato, the cave and the ring

(a) A strip of lit images; Zeke streaming shadows of a card game to eleven thousand; Vale, who turns the cameras off and records everything. The cave is the Strip and, it turns out, the televised final the whole run is framed in. The ring of Gyges (who are you when nobody can see?) is the Okonkwo question: Nadia wants someone fair when nobody is looking.

(b) Beats:
- New `zeke-clip` (**built**; talkTo `zeke`, in `nm-casino` afternoon to night): **Zeke:** "Chat, if I do not clip it, did it happen? No. Chat says you look like a donk. Chat says that about everyone. Chat is mostly my mum." **You:** "(Berkeley: to be is to be perceived. He meant God was watching. Zeke means eleven thousand people and his mum.)" **Zeke:** "Say something for the stream. ...No? Then you did not happen. Sorry. Rules." Table hint `zeke-real` at `lumina-finale`: "Chat, it is the guy from the Mesa. I clipped him in the end, so he is real now. You are welcome."
- `mesa-boss-door`: **Vale:** "Plato has a shepherd who finds a ring that makes him invisible. Do you know what he does with it? Everything. Sit."
- `dana-mesa` (the scout clue): **Dana:** "Her words: fair when nobody is looking. Anybody is fair with a camera on."
- `kit-mesa`, before the stake / tip-off / nothing choice: **You:** "(Nobody would ever know I told Lowe. That is the whole question, isn't it.)"

(c) Reel **"The cave"**: **built**, at the end of `mesa-boss-sendoff`, after Vale leaves and before "Porto Lumina is open to you". Sets **`neon`**, **`stream`**. The interlude is Dana's send-off (`dana-sends-you-up`), not Vale's, so nothing follows it here. As built: the neon line is the LUCKY sign ("never once been right about anybody"); the streamer is "the kid who streams from the casino floor" (the player may not have met Zeke); "Saturday" and Chip's name became "At the final ... somebody in a booth"; the Nadia half of the last line is by `if` on `dana-mesa`.
- `neon`: *A motel walkway over the Strip. Every sign is telling you something. None of it is true.*
- `stream`: "Zeke's stream. Eleven thousand people watching a card table the size of a biscuit. They cannot see the cards. They argue about them anyway." / "Plato. People chained in a cave, watching shadows, sure the shadows are the world." / "That is every table I have sat at. I do not see cards. I see a man touch his cup, and I guess." / "Saturday I am on television. I will be the shadow, and Chip will tell them what I had." / "Vale turned the cameras off to see who I am. So, apparently, does Nadia. Who am I, with them off?"
- Turn: from being watched to being fair unwatched, the question the final asks.

(d) Tells are shadows and showdown is the light: the Book of Reads will not say "strong" before three showdowns (opinion is not knowledge). Vale swaps his tell at hand fourteen: the shadow changes, the cards never do.

#### Porto Lumina: Kierkegaard, the leap

(a) A tower, a hall of nine tables, and the final where the prologue began. Kierkegaard: life is understood backwards but lived forwards (the whole frame, which catches up with itself in the men's room), and anxiety is the dizziness of freedom (the edge of a height). Camus called Kierkegaard's leap philosophical suicide; at seven big blinds the player finds the leap is arithmetic, which settles Silver Creek against Lumina the only way this game can. Nietzsche gets the final-lost loop; Hegel gets Nadia.

(b) Beats:
- `lumina-welcome`, after Dana explains the replacements: **You:** "(Sartre said hell is other people. He never sat at a table where somebody new sits down every time you knock one out.)" Sartre is saved for this hall (decided 2026-11-17): one line, no lecture.
- `tournament-won`, after the `bathroom` panel's "maybe that was the real me": **You:** "Kierkegaard. Life is understood backwards and lived forwards. I have understood it all the way from Basin. Now there are seven big blinds and no more backwards."
- `dana-reveal`, six-clue branch: **Dana:** "Four years up there, and nobody has looked at her who did not owe her or want something. She wants to lose to somebody who did not have to sit down." (Hegel, unnamed; Weil's line from 9.3 closes it.)
- `final-lost`, before the rail: **You:** "Nietzsche asked: if a demon said you would live this exact life again, every hand of it, forever, would you curse him or thank him?" / "Same table. Same fifteen thousand. New cards, though. The demon shuffles."

(c) Reel **"The leap"**: **built**, at the end of `hal-on-the-eve`, after his lesson and **Hal:** "Socrates never charged. I always did. That one was free." Set `lift` (since 2026-11-18; it was `night`), caption *That night. The glass lift up the outside of the tower, forty-one floors, and nobody else in it.* Hal is on `pl-street` only in the evening and at night in this chapter, so the caption's "That night" holds; the reel is faded out and costs no time. The beat can come before the tournament, so the reel knows the push-fold chart but not yet the seven big blinds.
- *That night. The glass lift up the outside of the tower.* "Kierkegaard: anxiety is the dizziness of freedom. You look over the edge, and what frightens you is not falling. It is that you could jump."
- "Hal says when the stack gets short you stop thinking. Seven big blinds, eight, ten: you shove or you fold, and the chart says which." / "Kierkegaard needed faith. I have a push-fold chart. That should feel better than it does." / "Abraham walked up the mountain not knowing. I will know the odds to two decimals. I still will not know." / "Fine." / "Leap."
- Turn: the reading stops; from here the player acts.

(d) Short-stacked, the decision is maths (push or fold); only the variance after it is a leap, and rule 1 keeps it honest. The final-lost loop deals real new cards each time: the situation recurs, the deck never does.

#### The losing paths: Camus, Boethius, Nietzsche (built, decided 2026-11-17)

Losing gets its thinkers too, each on a beat that already plays when it goes wrong. Rule 1 is the point of all three: the cards were fortune, the debt was a signature, and the deck never owes a comeback.
- **A bust** (Camus): `ray-busted`, as above, on the first bust.
- **A collector catches you** (Boethius, *The Consolation of Philosophy*, written in a cell): in each first-catch beat (`caught-by-dutch`, `-abel`, `-lowe`, `-fong`), after the collector speaks (the collector must speak first: `events.test.ts`), and only the first time anybody's collector catches you (`count caught atMost 0`, all sponsors). **You:** "(Boethius wrote his best book in a cell, waiting for the king's men. Fortune turns a wheel, he said. Climb on if you like, but do not complain when the rules of her game bring you down.)" / "(Only the cards were Fortune. This part is a debt, and it has my name on it.)"
- **The final lost** (Nietzsche's recurrence): `final-lost`, a new `alley` panel after the chase, every time, which is the recurrence. **You:** "Nietzsche asked: if a demon told you that you would live this exact life again, every hand of it, forever, would you curse him or thank him?" / "Same table. Same fifteen thousand. New cards, though. The demon shuffles."

#### Aftermath: the ship of Theseus

(a) After the ending film you are forty-one floors up, with a mirror over a fireplace somebody else lit (`pl-pent-fire`). The prologue's mirror asked *how did I get here?*; this one asks *is it still me?*, the Greeks' ship with every plank replaced. Marcus hosting the Friday game upstairs is Epicurus's garden at the top.

(b) Beats:
- New `history-on-the-shelf` (**built**; interact `pl-work-shelf`, `eventDone final-won`; the player's two lines are thoughts, in parentheses): "Three books on probability, two on psychology, one on marriage, still in its wrapper. At the end, a fat paperback you do not remember packing: *A History of Philosophy*. The bookmark is still at the Greeks." **You:** "Wonder, they said. Where it starts." / "...I wonder what Marcus is having for dinner."
- `marcus-upstairs`: **Marcus:** "Forty-one floors and you still need a man to bring the ice." **You:** "(Epicurus kept a garden and fed his friends. Nobody remembers what he won.)"

(c) Reel **"The ship"**: **built**, new event `penthouse-mirror` (interact `pl-pent-fire`, `eventDone final-won`; listed in `tests/ui.mjs` STORY_SEEN). Set `mirror`. After it: "Your phone is on the mantelpiece, face down."
- *Forty-one floors up. A mirror over a fireplace somebody else lit.* "The Greeks kept Theseus's ship in the harbour, and replaced each plank as it rotted." / "When every plank is new, is it the same ship?" / "The flat. Ray's table. Odette's boat. Hal's card room. Inés's sea. Vale's suite. A plank a town." (places the player has been, not the unbuilt reels) / "Marcus is the last original plank." / "He has called twice."
- Turn: the sour win gets its question, and the one answer the game gives: call him back.

### 9.5 The booth: one exchange per interlude

Chip oversells, Dr. Anand corrects; each pair sits beside that interlude's scouting and changes nothing it says. **Built** (2026-11-17), all six.

| Interlude | Exchange |
|---|---|
| `marcus-rides-out-with-you` | **Anand:** "In 1654 Pascal and Fermat worked out how to split the pot of a game that was interrupted." **Chip:** "Nobody is splitting anything, Doctor. The lights will be back." |
| `ray-sees-you-off` | **Anand:** "Ray believes he is due. Hume would point out the deck keeps no records. So would I, with a chart." **Chip:** "The deck has a heart!" **Anand:** "It has fifty-two cards." |
| `deb-sends-you-on` | **Anand:** "The Reverend's tithe is a ten percent rake paid to an insurer nobody has audited." **Chip:** "Faith, Doctor!" |
| `hal-sends-you-on` | **Chip:** "A woman of mystery!" **Anand:** "A woman of patchwork. Montaigne said we all are. Hers has the stitching on the outside." (The booth already says Leeds.) |
| `marcus-goes-home` | **Anand:** "Forty-seven hours at one table. His hourly rate is a negative number with a comma in it." **Chip:** "He is LIVING, Doctor!" **Anand:** "Seneca had a word for what he is doing with his days. It was not that one." |
| `dana-sends-you-up` | **Chip:** "Eleven thousand viewers, folks!" **Anand:** "Watching a phone watching a table. Plato wrote about people like that. They were in a cave." |

### 9.6 New reel sets

| Set | Stop | What it draws (at runtime) | Used by |
|---|---|---|---|
| `deck` | Riverbend | The riverboat rail at night: lanterns smeared on black water, the paddle wheel turning | `riverbend-deck-night` |
| `harborroom` | Crescent Harbor | A rented room over the supper club: washstand, iron bed, a lighthouse beam crossing the wall on a timer | `harbor-mirror` |
| `beach` | Palm Cay | Moonlit sand and surf, the casino's glass lit behind, one silhouette at a table | `palmcay-beach` |
| `neon` | Neon Mesa | The Strip from a motel walkway, signs flickering and buzzing out of step | `mesa-boss-sendoff` |
| `stream` | Neon Mesa | A phone in a hand: a stamp-sized card table, a viewer count, chat scrolling | `mesa-boss-sendoff` |
| `lift` | Porto Lumina | A glass lift climbing the tower, the city falling away, the floor counting up to 41 | `hal-on-the-eve` |

All six are **built** (2026-11-18) and checked on a contact sheet and in the game. Reused as built: `bed`, `shelf` (Basin), `night` (Silver Creek), `mirror`
(Harbor, Aftermath). Each new set is one `ReelScene` member and one draw function in
`game/reelArt.ts`; from the river up, each stop's night gets a look of its own.

### 9.7 Build order (value per hour)

1. **Lines in built events**: 9.4's single lines and 9.5's pairs, about 25 edits; no new events, flags or art. **Built**, with the losing paths (9.4).
2. **Reels on built sets**: *Sitting quietly* (Basin), *The leap* (Lumina), *The ship* (new `penthouse-mirror`). Silver Creek's is built. **Built.**
3. **The lunatics' beats**: `dolores-foot` (with `rubbedTheFoot`, read in `final-table-start`), `gaines-tithe`, `contessa-valmont`, `zeke-clip`, and a table hint each at `lumina-finale` that calls back with `eventDone` (Gaines: "Still not tithing? The boat is half built. The front half."). **Built**; Dolores's callback is Chip's (she is on the rail, not at the table), in `tournament-won` as well as `final-table-start`.
4. **Reels that need new sets**: `riverbend-deck-night`, `harbor-mirror`, `palmcay-beach`, the Mesa's cave. **Built.**
5. **Extras**: `history-on-the-shelf`, Bernard's table hint (`bernard-beach`), the `lift` set (now the leap's). **Built.**

### 9.8 Decided, and open

- *Decided:* one thinker a stop; the player names thinkers and most of the cast embody them; the existential reels vary in placement (after the first win, after a boss, mid-town at night, on the eve, in the aftermath) so they are not a fixed slot; the only new flag is `rubbedTheFoot`.
- *Checked (steps 4 and 5):* `rb-boat` and `pc-street` are reachable at night in their chapters (no door keeps hours; each reel was played in the game from a seeded save at night, the Harbor's and the Cay's by walking out of a shop door); the Mesa's cave sits in Vale's send-off and the interlude in Dana's, so it leaves the interlude untouched; `arrivalClashes` and "two events fighting over the same moment" pass, by the boss-falls and room-open conditions above. The cost of those conditions: a player who opens the boat's private room before any night aboard, or beats Bellamy or Inés before a night on their street, never sees that town's reel. *Checked (steps 1 to 3):* each lunatic's beat is one-shot with no other talk beat on them, so it takes first refusal once and their schedule lines come back; `penthouse-mirror` carries nobody anywhere, so it clashes with no arrival; a film is skipped up to the next thing that is not a film, so the Dolores callback in `tournament-won` sits after the whole film (one extra skip, and only for players who met her) rather than splitting it.
- *Decided by the user (2026-11-17):* (a) Sartre is saved for Lumina (`lumina-welcome`); the Harbor takes Montaigne. (b) The losing paths get thinkers: Camus on the first bust (Ray's), Boethius on the first catch, Nietzsche's recurrence at `final-lost` (9.4). (c) Nietzsche twice (the debt, the recurrence) is fine.
- *Decided while building:* player thoughts are a `dialogue` spoken by `You`, the line in parentheses, so they read as thought and wait for a press like every line. Hal's Alcibiades line is Socrates's pupil, not Plato's (fixed in the doc).

---

## 10. The thinkers in person (built, 2026-11-24)

Alongside §9's reels and thoughts: one philosopher **in person** in each casino town,
in chronological order, each with an invented name and two scenes that move the run
on. Nobody says whose ideas they are living; only the player's thoughts name a thinker
(and not Bojan's, who is a living man). Dana is the first, woven into her own opening
scenes. Rule 1 holds throughout: Severin's "due" is answered by a thought, Konrad's
advice is about how Inés plays, never what she is dealt.

| Town | Who (stands in for) | Scene 1 | Scene 2 |
|---|---|---|---|
| Basin | **Dana** (Thales) | Her own scenes: on the 14 (`DANA_ON_THE_14`, all three ways onto it) the bus that hates a hill, machine four that only eats socks off people who slam the lid, and the wet week she booked every dryer on a forecast, then gave them back (the olive presses). | `dana-walks-you-home`: money is water ("pools round whoever sits still"), and the drain she fell down looking at Jupiter (the well); the player's thought names Thales. One water line in `dana-takes-your-measure` too. |
| Silver Creek | **Mutt** (Diogenes), on the bench by the stop, lantern lit in daylight | Inside `marcus-rides-out-with-you`, between the bus and the casino door: "Not you either" (the honest man), Marcus told to move out of his sun (Alexander), a dollar asked for (`gaveMuttADollar`), and the whole ladder mocked. | `mutt-at-the-stop` (interact `sc-busstop`, Lou beaten): the joys of owning nothing, the dollar remembered either way, and a laugh at the penthouse. The next press is the bus. |
| Riverbend | **Severin Mulroney** (Boethius, by way of Ignatius Reilly): hunting cap, valve, Fortuna | At the end of `arrive-riverbend`, walking up to the boat's table: today of all days, the wheel was about to turn for him. He is a `regular` at `riverbend-mid`, so he is in every hand there, a novice maniac narrating Fortuna (`severin-wheel` hint). | In `riverbend-boss-sendoff`, he runs off the boat after you: you are at the top of the wheel, the worst place on it; "Fortuna gives when she appears to take, and takes when she appears to give." Also a one-line nod in the four first-catch beats. |
| Crescent Harbor | **Professor Kessler** (Kant): waistcoat, watch chain, the same minute every day | In `arrive-crescent`, thrown out of the card room as you reach it: bluffing is lying, and you may not lie even to a murderer at the door; he goes in every week to confirm it is wrong. | `kessler-on-his-walk` (interact `ch-transit`, Bellamy beaten): what is it for, why not mend clocks, "what if we were all gamblers?", and you have made the ferry late (the thought: Rousseau). |
| Palm Cay | **Konrad Hammer** (Nietzsche): linen suit, the moustache | At the end of `arrive-palmcay`, walking up to the Cay Room's big table: cards are escape, and he plays them to overcome; "what does not bust me makes me deeper-stacked". A `regular` at `palmcay-high`, a deep-stacked sharp maniac who shouts AMOR FATI when the first cards come down (`konrad-amor-fati`). | At the start of `palmcay-boss-door`, before Inés: how to beat her, true to her data (let her raise; she pulls up after losing four chips in ten; never let her stack grow by half; quiet is not her nature), then the demon: live it all again? (`saidYesToTheDemon` / `saidNoToTheDemon`), remembered in `final-lost` the first time the final is lost. |
| Neon Mesa | **Gaspard Lemire** (Foucault): bald, turtleneck, a blue cocktail, at a new bar on the Mesa floor | At the end of `arrive-mesa` you go to the bar first ("I could use a drink"): the domes in the ceiling, the prison its prisoners pay to enter, power as a spreadsheet, the dealers' palms. | At the start of `mesa-boss-door`, cheering from the bar: a winner on the floor is a disorder, a winner in the suite is a guest; "the best camera is the one you believe is off". Then Vale. |
| Porto Lumina | **Bojan Kranjc** (Žižek, never named): a protester with a cardboard sign | In `arrive-lumina`, before the steps: you know the house wins and go in anyway; the chips believe for you; ENJOY; the toilets (German, French, Lumina's: flushed before you arrived, which the men's room later is); the penthouse as a chocolate egg's toy. | Added, short: `bojan-after` (talk to him once the penthouse is yours). The sign is turned over: HE GOT THE TOY. |

### What the content model gained

- **`regulars` on a table**: who of its `opponents` is in the lineup at every hour, as a night's guest is on their night (`lineup.ts`). Severin and Konrad.
- **A bar on the Mesa floor** (`bar-neon` and `nm-bartender`); Gaspard stands at it at every hour.
- **New faces**: props `lantern`, `pocketwatch`, `moustache`, `cocktail`, `placard`, and the `earflaps` hunting cap.
- **The arrival card may go on inside**: the walk-in is still the card's last change of place, but a scene may follow it in the room (`events.test.ts`).
- Three flags, each read later: `gaveMuttADollar`, `saidYesToTheDemon`, `saidNoToTheDemon`.

### Decided while building

- Scene 1 at Riverbend and Palm Cay is part of the arrival card (you are walked up to the table), not a talk to the dealer: a walk into a free chair skips the dealer's beat, and an errand already uses the riverboat dealer.
- The bus-stop scenes are the stop's first refusal: the scene plays, and the next press opens the bus.
- A save that passed a town's arrival before this was built meets that town's thinker first in scene 2, whose lines assume scene 1.
