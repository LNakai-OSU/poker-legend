import { describe, expect, it } from 'vitest'
import { EVENTS, type GameEvent, type ReelLine } from './events'
import { parseCards } from './tape'
import { bestHand, compareHandStrength, HAND_CATEGORY_NAMES } from '../engine/handRank'
import { measureText } from '../game/pixel/font'

/** Every line of every tape in the game, with the event it is in. */
function tapeLines(): { event: GameEvent; line: ReelLine }[] {
  const out: { event: GameEvent; line: ReelLine }[] = []
  const walk = (event: GameEvent, actions: unknown) => {
    if (Array.isArray(actions)) return void actions.forEach((a) => walk(event, a))
    if (!actions || typeof actions !== 'object') return
    const a = actions as Record<string, unknown>
    if (a.kind === 'reel') {
      for (const panel of a.panels as { scene: string; lines: ReelLine[] }[]) {
        if (panel.scene === 'tape') for (const line of panel.lines) out.push({ event, line })
      }
    }
    for (const v of Object.values(a)) if (v && typeof v === 'object') walk(event, v)
  }
  for (const e of EVENTS) walk(e, e.actions)
  return out
}

describe("Hal's tape", () => {
  const lines = tapeLines()

  it('has a tape, with exhibits on its board', () => {
    expect(lines.length).toBeGreaterThan(25)
    expect(lines.filter((l) => l.line.show).length).toBeGreaterThan(20)
    const kinds = new Set(lines.map((l) => l.line.show?.kind))
    for (const kind of ['hands', 'board', 'seats', 'bets']) expect(kinds.has(kind as never), `no ${kind} exhibit`).toBe(true)
  })

  it('shows real cards: every card parses, none is dealt twice, and the hand named is the hand shown', () => {
    for (const { line } of lines) {
      const ex = line.show
      if (!ex) continue
      if (ex.kind === 'hands') {
        const strengths = ex.hands.map((h) => {
          const cards = parseCards(h.cards)
          expect(new Set(cards.map((c) => `${c.rank}${c.suit}`)).size, `${h.title} repeats a card`).toBe(cards.length)
          if (h.make) for (const m of parseCards(h.make)) expect(cards.some((c) => c.rank === m.rank && c.suit === m.suit), `${h.title}: ${h.make} is not in the hand`).toBe(true)
          if (h.rank) expect(HAND_CATEGORY_NAMES[bestHand(cards).category], `${h.title} is not a ${h.rank}`).toBe(h.rank)
          return cards.length >= 5 ? bestHand(cards) : null
        })
        // A tick and a cross are only honest if the engine agrees who wins.
        const [a, b] = strengths
        if (ex.hands.length === 2 && a && b && ex.hands[0].verdict) {
          const first = compareHandStrength(a, b)
          expect(first > 0 ? 'wins' : 'loses', `${ex.hands[0].title} against ${ex.hands[1].title}`).toBe(ex.hands[0].verdict)
        }
      }
      if (ex.kind === 'board') {
        const mine = parseCards(ex.hole)
        const shared = parseCards(ex.board)
        const all = [...mine, ...shared]
        expect(mine.length).toBe(2)
        expect(shared.length).toBeLessThanOrEqual(5)
        expect(new Set(all.map((c) => `${c.rank}${c.suit}`)).size, `${ex.hole} / ${ex.board} repeats a card`).toBe(all.length)
        if (ex.make) for (const m of parseCards(ex.make)) expect(all.some((c) => c.rank === m.rank && c.suit === m.suit), `${ex.make} is not on the table`).toBe(true)
        if (ex.rank) expect(HAND_CATEGORY_NAMES[bestHand(all).category], `${ex.hole} + ${ex.board}`).toBe(ex.rank)
      }
    }
  })

  it('fits on the board: one line of chalk, and chips no taller than the slate', () => {
    for (const { line } of lines) {
      const ex = line.show
      if (!ex) continue
      if (ex.note) expect(measureText(ex.note), `"${ex.note}" is too long for the board`).toBeLessThanOrEqual(236)
      if (ex.kind === 'hands') for (const h of ex.hands) for (const t of [h.title, h.sub ?? '']) expect(measureText(t), `"${t}" runs into the cards`).toBeLessThanOrEqual(90)
      if (ex.kind === 'bets') for (const b of [ex.pot, ...ex.bets.map((x) => x.chips)]) expect(b).toBeLessThanOrEqual(9)
    }
  })

  it('keeps every line short enough for the box', () => {
    for (const { line } of lines) expect(line.text.length, line.text).toBeLessThanOrEqual(150)
  })
})
