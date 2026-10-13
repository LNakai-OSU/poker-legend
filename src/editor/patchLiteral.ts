import {
  PatchError,
  columnAt,
  indentAt,
  isPlainObject,
  print,
  printProperty,
  printValueAfterColon,
  sameValue,
  startsLine,
  type ArrayNode,
  type Item,
  type Node,
  type ObjectNode,
  type Property,
} from './literal.js'

/**
 * Turns one value into another by touching as little text as possible.
 *
 * The obvious way to save an edited character is to print the whole entry
 * afresh. That throws away every comment inside it — the note on why Marcus
 * deals from home, why Vance has a second way of talking — and reflows every
 * line somebody laid out by hand. So instead this walks the old text and the
 * new value side by side and rewrites only what differs: a changed line of
 * dialogue is one string replaced, a removed schedule entry is its lines taken
 * out, and everything that did not change keeps its bytes, comments and all.
 *
 * Entries of a list are matched by what they say before they are matched by
 * where they are, so moving an action up the list moves its text — and any
 * comment on it — rather than rewriting two actions in place.
 */

export interface Edit {
  start: number
  end: number
  text: string
}

export interface Diff {
  edits: Edit[]
  /** What changed, in words. */
  notes: string[]
}

/** Applies non-overlapping edits to `text`, whose first character is at `offset` in the source. */
export function applyEdits(text: string, edits: Edit[], offset = 0): string {
  const sorted = [...edits].sort((a, b) => b.start - a.start || b.end - a.end)
  let out = text
  let limit = Infinity
  for (const edit of sorted) {
    if (edit.end > limit) throw new PatchError('two changes overlap; nothing was written')
    out = out.slice(0, edit.start - offset) + edit.text + out.slice(edit.end - offset)
    limit = edit.start
  }
  return out
}

interface Context {
  source: string
  width: number
}

/** The edits that make `node` (which currently says `before`) say `after`. */
export function diffValue(
  source: string,
  node: Node,
  before: unknown,
  after: unknown,
  path: string,
  width: number,
): Diff {
  const notes: string[] = []
  const edits = diffNode({ source, width }, node, before, after, path, notes)
  return { edits, notes }
}

function diffNode(ctx: Context, node: Node, before: unknown, after: unknown, path: string, notes: string[]): Edit[] {
  if (sameValue(before, after)) return []
  if (node.type === 'opaque') {
    throw new PatchError(`${path} is written as an expression (${node.text}) the editor cannot change`)
  }
  if (node.type === 'object' && isPlainObject(after) && isPlainObject(before)) {
    return diffObject(ctx, node, before, after, path, notes)
  }
  if (node.type === 'array' && Array.isArray(after) && Array.isArray(before)) {
    return diffArray(ctx, node, before, after, path, notes)
  }
  notes.push(`changed ${path}`)
  return [
    {
      start: node.start,
      end: node.end,
      text: print(after, indentAt(ctx.source, node.start), columnAt(ctx.source, node.start), 1, ctx.width),
    },
  ]
}

/** One line from its first character to just past its newline. */
function lineSpan(source: string, from: number, to: number): { start: number; end: number } {
  const start = source.lastIndexOf('\n', from - 1) + 1
  const newline = source.indexOf('\n', to)
  return { start, end: newline === -1 ? source.length : newline + 1 }
}

/** Whether nothing follows `at` on its line. */
function endsLine(source: string, at: number): boolean {
  const newline = source.indexOf('\n', at)
  return source.slice(at, newline === -1 ? source.length : newline).trim().length === 0
}

/** Where an entry's text, comma and same-line comment end. */
function itemTail(item: Item): number {
  return item.tailEnd ?? item.commaEnd ?? item.end
}

/** Whether every entry sits on lines of its own. */
function isMultiline(source: string, items: Item[]): boolean {
  return items.length > 0 && items.every((item) => startsLine(source, item.leadStart) && endsLine(source, itemTail(item)))
}

function hasComments(items: Item[]): boolean {
  return items.some((item) => item.leadStart !== item.start || item.tailEnd !== null)
}

function diffObject(
  ctx: Context,
  node: ObjectNode,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  path: string,
  notes: string[],
): Edit[] {
  const { source } = ctx
  const afterKeys = Object.keys(after).filter((key) => after[key] !== undefined)
  const kept = node.props.filter((prop) => after[prop.key] !== undefined)
  const added = afterKeys.filter((key) => !node.props.some((prop) => prop.key === key))
  const removed = node.props.filter((prop) => after[prop.key] === undefined)
  const sub = (prop: Property) => diffProperty(ctx, prop, before[prop.key], after[prop.key], `${path}.${prop.key}`, notes)

  if (kept.length === 0) {
    // Nothing of the old object survives, so there is nothing to keep in place.
    notes.push(`rewrote ${path}`)
    return [{ start: node.start, end: node.end, text: print(after, indentAt(source, node.start), columnAt(source, node.start), 1, ctx.width) }]
  }
  for (const key of added) notes.push(`added ${path}.${key}`)
  for (const prop of removed) notes.push(`removed ${path}.${prop.key}`)

  if (added.length === 0 && removed.length === 0) return kept.flatMap(sub)

  /** The kept property each new one goes after, in the order the editor gave them. */
  const anchorOf = (key: string): Property | null => {
    const preceding = afterKeys.slice(0, afterKeys.indexOf(key)).reverse()
    for (const candidate of preceding) {
      const prop = kept.find((p) => p.key === candidate)
      if (prop) return prop
    }
    return null
  }

  if (isMultiline(source, node.props)) {
    const edits: Edit[] = kept.flatMap(sub)
    const indent = indentAt(source, node.props[0].start)
    const line = (key: string) => `${' '.repeat(indent)}${printProperty(key, after[key], indent, indent, ctx.width)},`
    for (const prop of removed) {
      const span = lineSpan(source, prop.leadStart, itemTail(prop))
      edits.push({ start: span.start, end: span.end, text: '' })
    }
    const byAnchor = new Map<Property | null, string[]>()
    for (const key of added) {
      const anchor = anchorOf(key)
      byAnchor.set(anchor, [...(byAnchor.get(anchor) ?? []), key])
    }
    for (const [anchor, keys] of byAnchor) {
      if (anchor === null) {
        const first = kept[0]
        const at = lineSpan(source, first.leadStart, first.leadStart).start
        edits.push({ start: at, end: at, text: keys.map((key) => `${line(key)}\n`).join('') })
      } else {
        if (anchor.commaEnd === null) edits.push({ start: anchor.end, end: anchor.end, text: ',' })
        const at = lineSpan(source, anchor.leadStart, itemTail(anchor)).end
        edits.push({ start: at, end: at, text: keys.map((key) => `${line(key)}\n`).join('') })
      }
    }
    return edits
  }

  // Written on one line, or near enough: `{ period: 'morning', col: 9, lines: [...] }`.
  // Rebuilt from its surviving pieces, each carrying its own edits.
  if (hasComments(node.props)) {
    throw new PatchError(`${path} has comments between its entries on one line; edit it by hand`)
  }
  const indent = indentAt(source, node.start)
  const pieces: string[] = []
  // Where on the line the next piece starts, so a new list knows whether it fits.
  let column = columnAt(source, node.start) + 2
  for (const key of afterKeys) {
    const prop = kept.find((p) => p.key === key)
    const piece = prop
      ? applyEdits(source.slice(prop.start, prop.end), sub(prop), prop.start)
      : printProperty(key, after[key], indent, column, ctx.width)
    pieces.push(piece)
    const lastLine = piece.slice(piece.lastIndexOf('\n') + 1)
    column = (piece.includes('\n') ? lastLine.length : column + piece.length) + 2
  }
  return [{ start: node.start, end: node.end, text: `{ ${pieces.join(', ')} }` }]
}

function diffProperty(
  ctx: Context,
  prop: Property,
  before: unknown,
  after: unknown,
  path: string,
  notes: string[],
): Edit[] {
  if (sameValue(before, after)) return []
  const node = prop.value
  const deeper =
    (node.type === 'object' && isPlainObject(after) && isPlainObject(before)) ||
    (node.type === 'array' && Array.isArray(after) && Array.isArray(before)) ||
    node.type === 'opaque'
  if (deeper) return diffNode(ctx, node, before, after, path, notes)
  // A plain value: replaced from the colon on, so a long sentence that was
  // wrapped over several lines can come back as one, or the other way round.
  notes.push(`changed ${path}`)
  const indent = indentAt(ctx.source, prop.start)
  return [
    {
      start: prop.colonEnd,
      end: node.end,
      text: printValueAfterColon(after, indent, columnAt(ctx.source, prop.colonEnd), ctx.width),
    },
  ]
}

function diffArray(
  ctx: Context,
  node: ArrayNode,
  before: unknown[],
  after: unknown[],
  path: string,
  notes: string[],
): Edit[] {
  const { source } = ctx
  const items = node.items
  if (items.length !== before.length) throw new PatchError(`${path} does not say what the editor thinks it says`)

  // Which old entry each new entry is: first by position, then by an exact match
  // anywhere (a move), then the leftovers in order (an edit).
  const from: Array<number | null> = after.map(() => null)
  const used = new Set<number>()
  after.forEach((value, j) => {
    if (j < before.length && sameValue(before[j], value)) {
      from[j] = j
      used.add(j)
    }
  })
  after.forEach((value, j) => {
    if (from[j] !== null) return
    const i = before.findIndex((old, index) => !used.has(index) && sameValue(old, value))
    if (i !== -1) {
      from[j] = i
      used.add(i)
    }
  })
  after.forEach((value, j) => {
    if (from[j] !== null) return
    const sameKind = (index: number) =>
      !used.has(index) && Array.isArray(before[index]) === Array.isArray(value) && isPlainObject(before[index]) === isPlainObject(value)
    const i = sameKind(j) && j < before.length ? j : before.findIndex((_, index) => sameKind(index))
    if (i !== -1) {
      from[j] = i
      used.add(i)
    }
  })

  const inPlace = after.length === before.length && from.every((i, j) => i === j)
  const sub = (i: number, j: number) => diffNode(ctx, items[i].value, before[i], after[j], `${path}[${j}]`, notes)
  if (inPlace) return after.flatMap((_, j) => sub(j, j))

  const removedCount = before.length - used.size
  const addedCount = from.filter((i) => i === null).length
  notes.push(
    addedCount === 0 && removedCount === 0
      ? `reordered ${path}`
      : `${path}: ${[addedCount && `${addedCount} added`, removedCount && `${removedCount} removed`].filter(Boolean).join(', ')}`,
  )

  if (after.length === 0) return [{ start: node.start, end: node.end, text: '[]' }]

  const multiline = isMultiline(source, items)
  if (!multiline && hasComments(items)) {
    throw new PatchError(`${path} has comments between its entries on one line; edit it by hand`)
  }
  const lastTail = items.length > 0 ? itemTail(items[items.length - 1]) : node.start + 1
  if (/\/[/*]/.test(source.slice(lastTail, node.end - 1))) {
    throw new PatchError(`${path} ends with a comment the editor would have to move; edit it by hand`)
  }

  const lineIndent = indentAt(source, node.start)
  const closeIndent = startsLine(source, node.end - 1) ? indentAt(source, node.end - 1) : lineIndent
  const elementIndent = multiline ? indentAt(source, items[0].start) : closeIndent + 2

  /** An old entry's text — with its comments, when there is room for them — and its edits. */
  const pieceOf = (i: number, j: number, withComments: boolean) => {
    const item = items[i]
    const startAt = withComments ? item.leadStart : item.start
    const text = applyEdits(source.slice(startAt, item.end), sub(i, j), startAt)
    const tail = withComments && item.tailEnd !== null ? source.slice(item.commaEnd!, item.tailEnd) : ''
    return { text, tail }
  }

  // A list of plain lines that fits on one line is written on one, as the file
  // writes short lists — so a list that grew and shrank again comes back as it was.
  const primitives = after.every((value) => !Array.isArray(value) && !isPlainObject(value))
  if (!multiline || (primitives && !hasComments(items))) {
    const pieces = after.map((value, j) => {
      const i = from[j]
      return i === null ? print(value, lineIndent, 0, 1, ctx.width) : pieceOf(i, j, false).text
    })
    const flat = `[${pieces.join(', ')}]`
    const fits = columnAt(source, node.start) + flat.length + 2 <= ctx.width && !flat.includes('\n')
    if (fits) return [{ start: node.start, end: node.end, text: flat }]
    // Grown past the edge of the line: one entry per line, the way the file
    // writes a long list.
    const inner = ' '.repeat(lineIndent + 2)
    const reprinted = after.map((value, j) => {
      const i = from[j]
      return i === null ? print(value, lineIndent + 2, lineIndent + 2, 1, ctx.width) : pieceOf(i, j, false).text
    })
    return [
      {
        start: node.start,
        end: node.end,
        text: `[\n${reprinted.map((piece) => `${inner}${piece},\n`).join('')}${' '.repeat(lineIndent)}]`,
      },
    ]
  }

  const inner = ' '.repeat(elementIndent)
  const rows = after.map((value, j) => {
    const i = from[j]
    if (i === null) return `${inner}${print(value, elementIndent, elementIndent, 1, ctx.width)},`
    const { text, tail } = pieceOf(i, j, true)
    return `${inner}${text},${tail}`
  })
  return [{ start: node.start, end: node.end, text: `[\n${rows.join('\n')}\n${' '.repeat(closeIndent)}]` }]
}
