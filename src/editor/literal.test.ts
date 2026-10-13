import { describe, expect, it } from 'vitest'
import { PatchError, UNKNOWN, evaluate, matches, parseLiteral, print, printKey, quote } from './literal'
import { applyEdits, diffValue } from './patchLiteral'

/**
 * The parser and printer on shapes the content files do not happen to contain
 * yet. The files themselves are covered by `patchContent.test.ts`; these are
 * the cases somebody will write one day — an escape, a colour constant, a
 * comment in an awkward place — and the editor has to either handle or refuse.
 */

const read = (text: string) => evaluate(parseLiteral(text, 0))

/** Applies the edits that turn `before` into `after` in `text`. */
function patch(text: string, before: unknown, after: unknown, width = 100) {
  const node = parseLiteral(text, 0)
  return applyEdits(text, diffValue(text, node, before, after, 'x', width).edits)
}

describe('reading', () => {
  it('unescapes strings in all three quotes', () => {
    expect(read(String.raw`['it\'s', "say \"hi\"", ${'`'}tab\there${'`'}, 'café', 'a\\b', 'line\nbreak']`)).toEqual([
      "it's",
      'say "hi"',
      'tab\there',
      'café',
      'a\\b',
      'line\nbreak',
    ])
  })

  it('joins a sentence wrapped across lines with +', () => {
    expect(read(`{ about:\n  'one ' +\n  "two's " +\n  'three' }`)).toEqual({ about: "one two's three" })
  })

  it('reads numbers the way JavaScript does', () => {
    expect(read('[0, -3, 2.5, 0xff, 1_000, -0x10]')).toEqual([0, -3, 2.5, 255, 1000, -16])
  })

  it('reads quoted keys, comments anywhere, and trailing commas', () => {
    const text = `{
      // a comment
      'marcus-house': [1, /* inline */ 2,], plain: true, // tail
      /** doc */ off: false,
    }`
    expect(read(text)).toEqual({ 'marcus-house': [1, 2], plain: true, off: false })
  })

  it('keeps what it cannot read as opaque, rather than guessing', () => {
    const value = read("{ color: COLORS.dealer, lines: SPONSORS.cass.pitch, n: 1 + 2, s: 'a'.trim(), t: `x${'${'}y}` }")
    expect(value).toEqual({ color: UNKNOWN, lines: UNKNOWN, n: UNKNOWN, s: UNKNOWN, t: UNKNOWN })
  })

  it('refuses shapes it cannot edit around', () => {
    expect(() => parseLiteral('{ ...rest, a: 1 }', 0)).toThrow(PatchError)
    expect(() => parseLiteral('{ short }', 0)).toThrow(PatchError)
    expect(() => parseLiteral("{ a: 'unclosed }", 0)).toThrow(PatchError)
    expect(() => parseLiteral('[...more]', 0)).toThrow(PatchError)
  })

  it('treats an opaque value as matching anything, but not nothing', () => {
    const node = parseLiteral('{ color: COLORS.dealer, n: 1 }', 0)
    expect(matches(node, { color: 123, n: 1 })).toBe(true)
    expect(matches(node, { n: 1 })).toBe(false)
    expect(matches(node, { color: 1, n: 2 })).toBe(false)
  })
})

describe('patching around what it cannot read', () => {
  const text = "{ name: 'Dealer', color: COLORS.dealer, lines: ['Hi.'] }"
  const before = { name: 'Dealer', color: 0x3a9d5c, lines: ['Hi.'] }

  it('edits beside an expression and leaves the expression alone', () => {
    expect(patch(text, before, { ...before, name: 'Croupier' })).toBe(
      "{ name: 'Croupier', color: COLORS.dealer, lines: ['Hi.'] }",
    )
  })

  it('refuses to change the expression itself', () => {
    expect(() => patch(text, before, { ...before, color: 0xffffff })).toThrow(/expression/)
  })
})

describe('patching lists', () => {
  it('refuses to rebuild a one-line list with comments in it', () => {
    expect(() => patch("['a', /* keep */ 'b']", ['a', 'b'], ['b', 'a'])).toThrow(PatchError)
  })

  it('edits a one-line list with comments in place when nothing moves', () => {
    expect(patch("['a', /* keep */ 'b']", ['a', 'b'], ['a', 'c'])).toBe("['a', /* keep */ 'c']")
  })

  it('keeps a same-line comment with its entry when the list is reordered', () => {
    const text = "[\n  'a', // first\n  'b',\n]"
    expect(patch(text, ['a', 'b'], ['b', 'a', 'c'])).toBe("[\n  'b',\n  'a', // first\n  'c',\n]")
  })

  it('refuses to drop a comment that sits after the last entry', () => {
    const text = "[\n  { a: 1 },\n  // the end\n]"
    expect(() => patch(text, [{ a: 1 }], [{ a: 1 }, { a: 2 }])).toThrow(/ends with a comment/)
  })
})

describe('printing', () => {
  it('quotes the way the files do', () => {
    expect(quote('plain')).toBe("'plain'")
    expect(quote("it's")).toBe(`"it's"`)
    expect(quote(`it's "quoted"`)).toBe(`'it\\'s "quoted"'`)
    expect(quote('back\\slash\nnew')).toBe("'back\\\\slash\\nnew'")
  })

  it('quotes a key only when it has to', () => {
    expect(printKey('marcus')).toBe('marcus')
    expect(printKey('marcus-house')).toBe("'marcus-house'")
  })

  it('writes short records on one line and breaks long ones', () => {
    expect(print({ kind: 'wait', ms: 500 }, 0, 0)).toBe("{ kind: 'wait', ms: 500 }")
    expect(print(['a'.repeat(60), 'b'.repeat(60)], 2, 10)).toBe(`[\n    '${'a'.repeat(60)}',\n    '${'b'.repeat(60)}',\n  ]`)
  })

  it('writes entries one per line however short', () => {
    expect(print([{ a: 1 }], 0, 0)).toBe('[\n  { a: 1 },\n]')
    expect(print({ headsUp: { style: 'x' } }, 0, 0)).toBe("{\n  headsUp: { style: 'x' },\n}")
  })

  it('refuses values that are not data', () => {
    expect(() => print(Number.NaN, 0, 0)).toThrow(PatchError)
    expect(() => print(undefined, 0, 0)).toThrow(PatchError)
  })
})

describe('applying edits', () => {
  it('refuses edits that overlap rather than producing nonsense', () => {
    expect(() =>
      applyEdits('abcdef', [
        { start: 1, end: 4, text: 'X' },
        { start: 3, end: 5, text: 'Y' },
      ]),
    ).toThrow(PatchError)
  })

  it('applies an insertion and a replacement that touch', () => {
    expect(
      applyEdits('abcdef', [
        { start: 2, end: 2, text: '+' },
        { start: 2, end: 4, text: 'XY' },
      ]),
    ).toBe('ab+XYef')
  })
})
