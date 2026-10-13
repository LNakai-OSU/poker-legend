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
