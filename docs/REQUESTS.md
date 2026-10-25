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
- [ ] Table UI: add small/big blind chips; make the dealer button match them visually; make it clear when blinds change; help the player see what they hold (pairs, "doubles") during the first poker night; option to see the winners' cards; the hand outro plays too fast.
- [x] Overworld/UI: side nav menu for the hamburger menu; a small desktop window makes the game think it is mobile; the bus animation does not look like the rest of the game; pressing "Let's Go" before the casino should take the player inside automatically.
  - **Side menu:** the ☰ opens a pixel-framed panel that slides in from the right (`src/game/SideNav.tsx`): day, money, reputation and debts; Bag (items and lessons), Jobs, Record; sound, volume; New game with a confirm. Arrows/WASD move, Space/E/Enter pick, Escape goes up a page and closes it, a tap off it or the X closes it, and Escape opens it from the street. The street is paused while it is open. *Decided:* the map editor is **not** in it — `App.tsx` keeps it at `#editor` so players never stumble in.
  - **Small window ≠ phone:** touch controls are now decided by the device (coarse pointer, or touch points with no hover or a phone/tablet user agent), never the window's width (`src/game/device.ts`). A small desktop window keeps the keyboard and "Press E"; only the layout scales.
  - **Bus:** redrawn in the street's own pixel art — the 14 side on, on the road into the town you're going to, that road's tiles and objects scrolling past in the hour's light, you and whoever rides with you at the windows in your street sprites (`BusTransition.tsx`, `busRide.ts`, `art/busArt.ts`). Forced story rides work as before.
  - **"Let's go" → inside:** every town's arrival card now ends by walking you to the casino/card-room door and in (content only, in `events.ts`). *Decided:* this applies in all six towns, including Riverbend and Palm Cay, whose cards mention somebody outside (Kit on the dock, Marcus on the promenade) — they're still there when you walk back out. Revisit if you'd rather those two leave you on the street.
  - **Also (coordinator request):** Space, E and Enter all talk/turn the page/pick wherever one did; arrows or WASD move the cursor in every list and menu; Escape leaves menu scenes. A double click is one press. See TECHDESIGN "Controls".
- [ ] Casinos: all slot machines playable; casinos more populated as they become more exclusive.
- Liked: the sound effects.
