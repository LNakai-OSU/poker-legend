/**
 * Reads and writes the small subset of TypeScript that content is written in.
 *
 * Characters and events are object literals: strings, numbers, booleans, arrays
 * and nested objects, with comments wherever somebody had something to say. To
 * edit one in place without losing those comments, the editor needs to know
 * where every value *is* in the text, not just what it is — so this parses a
 * literal into nodes that remember their spans.
 *
 * Anything outside that subset — an identifier, a call, a spread — is kept as
 * an opaque node: it can be carried along untouched, but never changed, because
 * nothing here can say what it means.
 *
 * Pure, and tested against the real content files.
 */

export class PatchError extends Error {}

export type Node = ObjectNode | ArrayNode | StringNode | NumberNode | BooleanNode | OpaqueNode

interface Span {
  /** First character of the value. */
  start: number
  /** One past its last character. */
  end: number
}

export interface StringNode extends Span {
  type: 'string'
  value: string
}

export interface NumberNode extends Span {
  type: 'number'
  value: number
}

export interface BooleanNode extends Span {
  type: 'boolean'
  value: boolean
}

/** Something that is not a plain literal, kept as written. */
export interface OpaqueNode extends Span {
  type: 'opaque'
  text: string
}

/**
 * One entry of an object or array, with the comments that belong to it.
 *
 * A comment on a line of its own above an entry is that entry's (`leadStart`);
 * a comment after the comma on the same line is too (`tailEnd`). Moving or
 * deleting the entry moves or deletes them with it.
 */
export interface Item {
  /** Where the entry's leading comments begin, or the entry itself if none. */
  leadStart: number
  /** First character of the entry proper — the key for a property. */
  start: number
  /** One past the end of the value. */
  end: number
  /** One past the separating comma, if there is one. */
  commaEnd: number | null
  /** One past a same-line comment after the comma, if there is one. */
  tailEnd: number | null
  value: Node
}

export interface Property extends Item {
  key: string
  /** One past the `:`. */
  colonEnd: number
}

export interface ObjectNode extends Span {
  type: 'object'
  props: Property[]
}

export interface ArrayNode extends Span {
  type: 'array'
  items: Item[]
}

/** What an opaque node stands for when there is no way to know. */
export const UNKNOWN = Symbol('unknown')

const IDENT_START = /[A-Za-z_$]/
const IDENT = /[A-Za-z0-9_$]/

class Parser {
  pos: number
  readonly source: string
  constructor(source: string, pos: number) {
    this.source = source
    this.pos = pos
  }

  fail(what: string): never {
    const line = this.source.slice(0, this.pos).split('\n').length
    throw new PatchError(`${what} at line ${line}`)
  }

  /** Skips whitespace and comments. */
  skip() {
    const s = this.source
    for (;;) {
      const ch = s[this.pos]
      if (ch === ' ' || ch === '\n' || ch === '\t' || ch === '\r') {
        this.pos++
      } else if (ch === '/' && s[this.pos + 1] === '/') {
        const next = s.indexOf('\n', this.pos)
        this.pos = next === -1 ? s.length : next
      } else if (ch === '/' && s[this.pos + 1] === '*') {
        const close = s.indexOf('*/', this.pos + 2)
        if (close === -1) this.fail('an unclosed comment')
        this.pos = close + 2
      } else {
        return
      }
    }
  }

  /** Skips spaces and a `//` comment on the current line only. */
  skipLineTail(): number | null {
    const s = this.source
    let i = this.pos
    while (s[i] === ' ' || s[i] === '\t') i++
    if (s[i] === '/' && s[i + 1] === '/') {
      const next = s.indexOf('\n', i)
      return next === -1 ? s.length : next
    }
    if (s[i] === '/' && s[i + 1] === '*') {
      const close = s.indexOf('*/', i + 2)
      if (close !== -1 && !s.slice(i, close).includes('\n')) return close + 2
    }
    return null
  }

  value(): Node {
    this.skip()
    const s = this.source
    const ch = s[this.pos]
    if (ch === '{') return this.object()
    if (ch === '[') return this.array()
    if (ch === "'" || ch === '"' || ch === '`') return this.stringExpression()
    if (ch === '-' || (ch >= '0' && ch <= '9')) {
      const start = this.pos
      const number = this.number()
      if (number) return number
      return this.opaque(start)
    }
    const word = /^(true|false)(?![A-Za-z0-9_$])/.exec(s.slice(this.pos, this.pos + 6))
    if (word) {
      const start = this.pos
      this.pos += word[1].length
      return this.maybeOpaque({ type: 'boolean', value: word[1] === 'true', start, end: this.pos })
    }
    return this.opaque(this.pos)
  }

  /**
   * A literal followed by more expression (`1 + x`, `'a'.trim()`) is not a
   * literal. Anything that does not end where a value should end is opaque.
   */
  maybeOpaque<T extends Node>(node: T): Node {
    const save = this.pos
    this.skip()
    const next = this.source[this.pos]
    this.pos = save
    if (next === ',' || next === '}' || next === ']' || next === undefined || next === ')' || next === ';') {
      return node
    }
    return this.opaque(node.start)
  }

  /** Consumes an expression it does not understand, up to the next separator. */
  opaque(start: number): OpaqueNode {
    const s = this.source
    this.pos = start
    let depth = 0
    while (this.pos < s.length) {
      const ch = s[this.pos]
      if (ch === "'" || ch === '"' || ch === '`') {
        this.rawString()
        continue
      }
      if (ch === '/' && (s[this.pos + 1] === '/' || s[this.pos + 1] === '*')) {
        this.skip()
        continue
      }
      if (ch === '(' || ch === '[' || ch === '{') depth++
      else if (ch === ')' || ch === ']' || ch === '}') {
        if (depth === 0) break
        depth--
      } else if (ch === ',' && depth === 0) break
      this.pos++
    }
    let end = this.pos
    while (end > start && /\s/.test(s[end - 1])) end--
    if (end === start) this.fail('a missing value')
    return { type: 'opaque', text: s.slice(start, end), start, end }
  }

  number(): NumberNode | null {
    const match = /^-?\s*(0[xX][0-9a-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|(\d[\d_]*)?\.?\d[\d_]*([eE][+-]?\d+)?)(?![A-Za-z0-9_$])/.exec(
      this.source.slice(this.pos, this.pos + 64),
    )
    if (!match) return null
    const start = this.pos
    const text = match[0]
    this.pos += text.length
    const negative = text.startsWith('-')
    const digits = match[1].replace(/_/g, '')
    const magnitude = Number(digits)
    if (Number.isNaN(magnitude)) this.fail(`a number that is not one ("${text}")`)
    const node: NumberNode = { type: 'number', value: negative ? -magnitude : magnitude, start, end: this.pos }
    const checked = this.maybeOpaque(node)
    return checked.type === 'number' ? checked : null
  }

  /** One quoted string, unescaped. Returns null for a template with `${}`. */
  rawString(): string | null {
    const s = this.source
    const quote = s[this.pos]
    this.pos++
    let out = ''
    let plain = true
    while (this.pos < s.length && s[this.pos] !== quote) {
      const ch = s[this.pos]
      if (quote !== '`' && ch === '\n') this.fail('a string broken across a line')
      if (quote === '`' && ch === '$' && s[this.pos + 1] === '{') {
        plain = false
        // Skip the interpolation, braces and all.
        let depth = 0
        while (this.pos < s.length) {
          if (s[this.pos] === '{') depth++
          else if (s[this.pos] === '}') {
            depth--
            if (depth === 0) break
          }
          this.pos++
        }
        this.pos++
        continue
      }
      if (ch === '\\') {
        const next = s[this.pos + 1]
        this.pos += 2
        switch (next) {
          case 'n':
            out += '\n'
            break
          case 't':
            out += '\t'
            break
          case 'r':
            out += '\r'
            break
          case 'b':
            out += '\b'
            break
          case 'f':
            out += '\f'
            break
          case 'v':
            out += '\v'
            break
          case '0':
            out += '\0'
            break
          case '\n':
            break
          case 'x': {
            out += String.fromCharCode(parseInt(s.slice(this.pos, this.pos + 2), 16))
            this.pos += 2
            break
          }
          case 'u': {
            if (s[this.pos] === '{') {
              const close = s.indexOf('}', this.pos)
              out += String.fromCodePoint(parseInt(s.slice(this.pos + 1, close), 16))
              this.pos = close + 1
            } else {
              out += String.fromCharCode(parseInt(s.slice(this.pos, this.pos + 4), 16))
              this.pos += 4
            }
            break
          }
          default:
            out += next
        }
        continue
      }
      out += ch
      this.pos++
    }
    if (this.pos >= s.length) this.fail('an unclosed string')
    this.pos++
    return plain ? out : null
  }

  /** A string, or several joined with `+` — the way a long sentence is wrapped. */
  stringExpression(): Node {
    const start = this.pos
    let value = ''
    for (;;) {
      const part = this.rawString()
      if (part === null) return this.opaque(start)
      value += part
      const save = this.pos
      this.skip()
      if (this.source[this.pos] === '+') {
        this.pos++
        this.skip()
        const ch = this.source[this.pos]
        if (ch === "'" || ch === '"' || ch === '`') continue
        return this.opaque(start)
      }
      this.pos = save
      break
    }
    return this.maybeOpaque({ type: 'string', value, start, end: this.pos })
  }

  /** Where an entry's leading comments begin: the first comment after the previous line. */
  leadStartOf(from: number, itemStart: number): number {
    // `from` is just past the previous separator (or the open bracket), after any
    // same-line tail comment has been claimed by the previous entry.
    const gap = this.source.slice(from, itemStart)
    const first = gap.search(/\/[/*]/)
    return first === -1 ? itemStart : from + first
  }

  object(): ObjectNode {
    const s = this.source
    const start = this.pos
    this.pos++ // {
    const props: Property[] = []
    let after = this.pos
    for (;;) {
      this.skip()
      if (s[this.pos] === '}') {
        this.pos++
        break
      }
      const keyStart = this.pos
      let key: string
      const ch = s[this.pos]
      if (ch === "'" || ch === '"') {
        const raw = this.rawString()
        if (raw === null) this.fail('a key that is not a plain string')
        key = raw
      } else if (IDENT_START.test(ch ?? '')) {
        let end = this.pos
        while (IDENT.test(s[end] ?? '')) end++
        key = s.slice(this.pos, end)
        this.pos = end
      } else if (ch >= '0' && ch <= '9') {
        let end = this.pos
        while (/[0-9]/.test(s[end] ?? '')) end++
        key = s.slice(this.pos, end)
        this.pos = end
      } else {
        // A spread, a computed key — nothing this can edit around safely.
        this.fail('an object entry that is not a plain key')
      }
      this.skip()
      if (s[this.pos] !== ':') this.fail(`"${key}" with no value (shorthand is not supported)`)
      this.pos++
      const colonEnd = this.pos
      const value = this.value()
      const end = value.end
      this.pos = end
      this.skip()
      let commaEnd: number | null = null
      let tailEnd: number | null = null
      if (s[this.pos] === ',') {
        this.pos++
        commaEnd = this.pos
        tailEnd = this.skipLineTail()
        if (tailEnd !== null) this.pos = tailEnd
      } else if (s[this.pos] !== '}') {
        this.fail(`something unexpected after "${key}"`)
      }
      props.push({ key, leadStart: this.leadStartOf(after, keyStart), start: keyStart, end, commaEnd, tailEnd, colonEnd, value })
      after = this.pos
    }
    return { type: 'object', props, start, end: this.pos }
  }

  array(): ArrayNode {
    const s = this.source
    const start = this.pos
    this.pos++ // [
    const items: Item[] = []
    let after = this.pos
    for (;;) {
      this.skip()
      if (s[this.pos] === ']') {
        this.pos++
        break
      }
      if (s.startsWith('...', this.pos)) this.fail('a spread in a list')
      const itemStart = this.pos
      const value = this.value()
      this.pos = value.end
      this.skip()
      let commaEnd: number | null = null
      let tailEnd: number | null = null
      if (s[this.pos] === ',') {
        this.pos++
        commaEnd = this.pos
        tailEnd = this.skipLineTail()
        if (tailEnd !== null) this.pos = tailEnd
      } else if (s[this.pos] !== ']') {
        this.fail('something unexpected in a list')
      }
      items.push({ leadStart: this.leadStartOf(after, itemStart), start: itemStart, end: value.end, commaEnd, tailEnd, value })
      after = this.pos
    }
    return { type: 'array', items, start, end: this.pos }
  }
}

/** Parses the literal that begins at `at` (an `{`, `[`, string, number...). */
export function parseLiteral(source: string, at: number): Node {
  return new Parser(source, at).value()
}

/** What a node means, with opaque nodes as `UNKNOWN`. */
export function evaluate(node: Node): unknown {
  switch (node.type) {
    case 'string':
    case 'number':
    case 'boolean':
      return node.value
    case 'opaque':
      return UNKNOWN
    case 'array':
      return node.items.map((item) => evaluate(item.value))
    case 'object': {
      const out: Record<string, unknown> = {}
      for (const prop of node.props) out[prop.key] = evaluate(prop.value)
      return out
    }
  }
}

/** Whether a node says exactly `value`, treating opaque nodes as saying anything. */
export function matches(node: Node, value: unknown): boolean {
  switch (node.type) {
    case 'opaque':
      return value !== undefined
    case 'string':
    case 'number':
    case 'boolean':
      return node.value === value
    case 'array':
      return (
        Array.isArray(value) &&
        value.length === node.items.length &&
        node.items.every((item, i) => matches(item.value, value[i]))
      )
    case 'object': {
      if (!isPlainObject(value)) return false
      const keys = Object.keys(value).filter((key) => value[key] !== undefined)
      if (keys.length !== node.props.length) return false
      return node.props.every((prop) => prop.key in value && matches(prop.value, value[prop.key]))
    }
  }
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Deep equality for plain data, ignoring keys whose value is undefined. */
export function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (Array.isArray(a)) {
    return Array.isArray(b) && a.length === b.length && a.every((item, i) => sameValue(item, b[i]))
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keysA = Object.keys(a).filter((k) => a[k] !== undefined)
    const keysB = Object.keys(b).filter((k) => b[k] !== undefined)
    return keysA.length === keysB.length && keysA.every((k) => sameValue(a[k], b[k]))
  }
  return false
}

// ---------------------------------------------------------------------------
// Printing: new values, in the file's own style.
// ---------------------------------------------------------------------------

/** The width the content files are written to. */
export const WIDTH = 100

/** Single quotes, unless the text has an apostrophe and no double quote in it. */
export function quote(text: string): string {
  const q = text.includes("'") && !text.includes('"') ? '"' : "'"
  let out = q
  for (const ch of text) {
    if (ch === q) out += `\\${q}`
    else if (ch === '\\') out += '\\\\'
    else if (ch === '\n') out += '\\n'
    else if (ch === '\r') out += '\\r'
    else if (ch === '\t') out += '\\t'
    else if (ch < ' ') out += `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`
    else out += ch
  }
  return out + q
}

/** A key as written: bare when it can be, quoted when it cannot. */
export function printKey(key: string): string {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : quote(key)
}

/**
 * Whether a value holds whole entries, which the files write one per line
 * however short they are: a list of objects (`schedule`, `actions`), an object
 * of objects (`personas`), a record of lists (a character's `lines`). Lists of
 * plain lines and records of plain values (`look`, `seat`, a trigger, a
 * schedule entry with its few lines) go on one line when they fit.
 */
function holdsEntries(value: unknown): boolean {
  if (Array.isArray(value)) return value.some((child) => isPlainObject(child) || Array.isArray(child))
  if (!isPlainObject(value)) return false
  const children = Object.values(value).filter((child) => child !== undefined)
  if (children.some((child) => isPlainObject(child))) return true
  if (children.some((child) => Array.isArray(child) && child.some((x) => isPlainObject(x)))) return true
  return children.length > 0 && children.every((child) => Array.isArray(child))
}

/** The value on one line, however long that line is. */
function inline(value: unknown): string {
  if (typeof value === 'string') return quote(value)
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new PatchError(`${value} is not a number that can be written`)
    return String(value)
  }
  if (typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return `[${value.map(inline).join(', ')}]`
  if (isPlainObject(value)) {
    const entries = Object.entries(value).filter(([, v]) => v !== undefined)
    if (entries.length === 0) return '{}'
    return `{ ${entries.map(([k, v]) => `${printKey(k)}: ${inline(v)}`).join(', ')} }`
  }
  throw new PatchError(`cannot write ${String(value)} into the source`)
}

/**
 * A value as the file would write it.
 *
 * `indent` is the indentation of the line the value starts on, and `column`
 * where on that line it starts; `suffix` is how many characters must still fit
 * after it (a comma, a closing brace). On one line if it fits, broken one entry
 * per line with trailing commas if it does not — the way the rest of the file is.
 */
export function print(value: unknown, indent: number, column: number, suffix = 1, width = WIDTH): string {
  const flat = inline(value)
  if (!Array.isArray(value) && !isPlainObject(value)) return flat
  if (column + flat.length + suffix <= width && !holdsEntries(value)) return flat
  const inner = ' '.repeat(indent + 2)
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    return `[\n${value.map((item) => `${inner}${print(item, indent + 2, indent + 2, 1, width)},\n`).join('')}${' '.repeat(indent)}]`
  }
  const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined)
  return `{\n${entries.map(([k, v]) => `${inner}${printProperty(k, v, indent + 2, indent + 2, width)},\n`).join('')}${' '.repeat(indent)}}`
}

/**
 * `key: value`, for a property on a line of its own at `indent`.
 *
 * A long sentence is wrapped the way the events file already wraps them, as
 * strings joined with `+` on lines of their own, rather than run off the edge.
 */
export function printProperty(key: string, value: unknown, indent: number, column = indent, width = WIDTH): string {
  return `${printKey(key)}:${printValueAfterColon(value, indent, column + printKey(key).length + 1, width)}`
}

/** Everything after a property's colon, including the space or line break. */
export function printValueAfterColon(value: unknown, indent: number, column: number, width = WIDTH): string {
  if (typeof value === 'string' && column + 1 + quote(value).length + 1 > width && value.length > 40) {
    const inner = indent + 2
    const parts = wrapWords(value, width - inner - 5)
    return `\n${parts.map((part, i) => `${' '.repeat(inner)}${quote(part)}${i < parts.length - 1 ? ' +' : ''}`).join('\n')}`
  }
  return ` ${print(value, indent, column + 1, 1, width)}`
}

/** Splits a sentence into pieces no longer than `width`, at spaces, keeping the spaces. */
function wrapWords(text: string, width: number): string[] {
  const words = text.split(/(?<= )/)
  const parts: string[] = []
  let current = ''
  for (const word of words) {
    if (current.length > 0 && current.length + word.length > width) {
      parts.push(current)
      current = ''
    }
    current += word
  }
  if (current.length > 0) parts.push(current)
  return parts
}

/** The indentation of the line `at` is on. */
export function indentAt(source: string, at: number): number {
  const lineStart = source.lastIndexOf('\n', at - 1) + 1
  let i = lineStart
  while (source[i] === ' ') i++
  return i - lineStart
}

/** The column of `at` on its line. */
export function columnAt(source: string, at: number): number {
  return at - (source.lastIndexOf('\n', at - 1) + 1)
}

/** Whether nothing but indentation stands between the start of the line and `at`. */
export function startsLine(source: string, at: number): boolean {
  const lineStart = source.lastIndexOf('\n', at - 1) + 1
  return source.slice(lineStart, at).trim().length === 0
}
