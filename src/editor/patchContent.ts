import {
  PatchError,
  evaluate,
  matches,
  parseLiteral,
  printKey,
  print,
  type ArrayNode,
  type Node,
  type ObjectNode,
} from './literal.js'
import { applyEdits, diffValue } from './patchLiteral.js'

/**
 * Edits `characters.ts` and `events.ts` in place, one entry at a time.
 *
 * The editor sends the entry as it loaded it (`before`) and as it wants it
 * (`after`). The entry is found in the source, checked to still say `before` —
 * if somebody changed the file since the page loaded, that is refused rather
 * than overwritten — and then rewritten only where it differs, so comments and
 * hand layout everywhere else in it survive. See `patchLiteral.ts`.
 *
 * After patching, the entry is read back out of the new text and has to say
 * exactly `after`. A save that would write something other than what was asked
 * for never reaches the file.
 *
 * Pure: source in, source out.
 */

export { PatchError }

export interface EntryEdit {
  id: string
  /** The entry as the editor loaded it. Absent when creating a new one. */
  before?: unknown
  after: unknown
}

export interface PatchResult {
  source: string
  notes: string[]
}

/** The characters file is written a little wider than the rest: a `look` is one line. */
const CHARACTER_WIDTH = 110
const EVENT_WIDTH = 100

const CHARACTERS_DECLARATION = /export const CHARACTERS: Record<string, CharacterDef> = \{/g
const EVENTS_DECLARATION = /export const EVENTS: GameEvent\[\] = \[/g

/** Finds the one place a declaration starts, refusing if there are none or several. */
function findOnce(source: string, pattern: RegExp, what: string): number {
  const found = [...source.matchAll(pattern)]
  if (found.length === 0) throw new PatchError(`cannot find ${what} in the source`)
  if (found.length > 1) throw new PatchError(`${what} is declared more than once`)
  return found[0].index + found[0][0].length - 1
}

/** The `CHARACTERS` object, parsed. */
export function charactersNode(source: string): ObjectNode {
  const node = parseLiteral(source, findOnce(source, CHARACTERS_DECLARATION, 'CHARACTERS'))
  if (node.type !== 'object') throw new PatchError('CHARACTERS is not an object')
  return node
}

/** The `EVENTS` list, parsed. */
export function eventsNode(source: string): ArrayNode {
  const node = parseLiteral(source, findOnce(source, EVENTS_DECLARATION, 'EVENTS'))
  if (node.type !== 'array') throw new PatchError('EVENTS is not a list')
  return node
}

/** Every character, as the source says it — for checking the parser against the game. */
export function readCharacters(source: string): Record<string, unknown> {
  return evaluate(charactersNode(source)) as Record<string, unknown>
}

/** Every event, as the source says it. */
export function readEvents(source: string): unknown[] {
  return evaluate(eventsNode(source)) as unknown[]
}

function characterEntry(source: string, id: string): { container: ObjectNode; value: Node } | null {
  const container = charactersNode(source)
  const found = container.props.filter((prop) => prop.key === id)
  if (found.length > 1) throw new PatchError(`"${id}" is defined twice in CHARACTERS`)
  return found.length === 0 ? null : { container, value: found[0].value }
}

function eventEntry(source: string, id: string): { container: ArrayNode; value: Node } | null {
  const container = eventsNode(source)
  const found = container.items.filter((item) => {
    if (item.value.type !== 'object') return false
    const idProp = item.value.props.find((prop) => prop.key === 'id')
    return idProp?.value.type === 'string' && idProp.value.value === id
  })
  if (found.length > 1) throw new PatchError(`two events are called "${id}"`)
  return found.length === 0 ? null : { container, value: found[0].value }
}

/** Checks that only the entry's own text moved. */
function onlyInside(before: string, after: string, start: number, end: number) {
  const tail = before.length - end
  if (after.slice(0, start) !== before.slice(0, start) || after.slice(after.length - tail) !== before.slice(end)) {
    throw new PatchError('the change reached outside the entry; nothing was written')
  }
}

/**
 * Rewrites one existing entry, or adds a new one at the end of its list.
 *
 * `locate` finds the entry by id in any version of the source, so the result
 * can be read back and checked.
 */
function saveEntry(
  source: string,
  edit: EntryEdit,
  options: {
    what: string
    width: number
    locate: (source: string, id: string) => { value: Node } | null
    append: (source: string) => string
  },
): PatchResult {
  const { id, before, after } = edit
  const existing = options.locate(source, id)
  let next: string
  let notes: string[]

  if (before === undefined) {
    if (existing) throw new PatchError(`there is already a ${options.what} called "${id}"`)
    next = options.append(source)
    notes = [`added ${options.what} ${id}`]
  } else {
    if (!existing) throw new PatchError(`no ${options.what} called "${id}" in the source`)
    if (!matches(existing.value, before)) {
      throw new PatchError(
        `${id} in the source is not what the editor loaded — the file changed underneath it. Reload and try again.`,
      )
    }
    const diff = diffValue(source, existing.value, before, after, id, options.width)
    next = applyEdits(source, diff.edits)
    onlyInside(source, next, existing.value.start, existing.value.end)
    notes = diff.notes
  }

  // Read it back. What is in the file now must be exactly what was asked for.
  const written = options.locate(next, id)
  if (!written || !matches(written.value, after)) {
    throw new PatchError(`saving ${id} would not have written what was asked; nothing was written`)
  }
  if (next === source) return { source, notes: ['nothing changed'] }
  return { source: next, notes }
}

/** Saves one character into the source of `characters.ts`. */
export function saveCharacter(source: string, edit: EntryEdit): PatchResult {
  if (!/^[a-z][A-Za-z0-9]*$/.test(edit.id)) {
    throw new PatchError(`"${edit.id}" is not a character id: lower-case letters and digits, starting with a letter`)
  }
  return saveEntry(source, edit, {
    what: 'character',
    width: CHARACTER_WIDTH,
    locate: characterEntry,
    append: (text) => {
      const container = charactersNode(text)
      const last = container.props[container.props.length - 1]
      const entry = `  ${printKey(edit.id)}: ${print(edit.after, 2, 4 + edit.id.length, 1, CHARACTER_WIDTH)},\n`
      if (!last) throw new PatchError('CHARACTERS is empty; add the first one by hand')
      // On the line after the last character's.
      const at = text.indexOf('\n', last.tailEnd ?? last.commaEnd ?? last.end) + 1
      const comma = last.commaEnd === null ? [{ start: last.end, end: last.end, text: ',' }] : []
      return applyEdits(text, [...comma, { start: at, end: at, text: entry }])
    },
  })
}

/** Saves one event into the source of `events.ts`. */
export function saveEvent(source: string, edit: EntryEdit): PatchResult {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(edit.id)) {
    throw new PatchError(`"${edit.id}" is not an event id: lower-case words joined with hyphens`)
  }
  const afterId = (edit.after as { id?: unknown } | null)?.id
  if (afterId !== edit.id) throw new PatchError(`an event's id cannot be changed by saving it (${String(afterId)})`)
  return saveEntry(source, edit, {
    what: 'event',
    width: EVENT_WIDTH,
    locate: eventEntry,
    append: (text) => {
      const container = eventsNode(text)
      const last = container.items[container.items.length - 1]
      const entry = `  ${print(edit.after, 2, 2, 1, EVENT_WIDTH)},\n`
      if (!last) throw new PatchError('EVENTS is empty; add the first one by hand')
      const at = text.indexOf('\n', last.tailEnd ?? last.commaEnd ?? last.end) + 1
      const comma = last.commaEnd === null ? [{ start: last.end, end: last.end, text: ',' }] : []
      return applyEdits(text, [...comma, { start: at, end: at, text: entry }])
    },
  })
}
