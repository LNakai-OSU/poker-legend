import { describe, expect, it } from 'vitest'
import { ENDING_FILM } from './ending'

describe('the ending film', () => {
  it('holds the player at stops that climb along the room', () => {
    const at = ENDING_FILM.walk.stops.map((s) => s.at)
    expect(at).toEqual([...at].sort((a, b) => a - b))
    expect(at[0]).toBe(0)
  })

  it('never reveals more of the thread than there is', () => {
    const { beats, thread } = ENDING_FILM.phone
    let last = 0
    for (const beat of beats) {
      expect(beat.upTo).toBeGreaterThanOrEqual(last)
      expect(beat.upTo).toBeLessThanOrEqual(thread.length)
      last = beat.upTo
    }
    expect(last).toBe(thread.length)
  })

  it('ends on the player saying it', () => {
    const lines = ENDING_FILM.window
    expect(lines[lines.length - 1]).toMatchObject({ you: true, text: "I've made it..." })
  })

  it('has something to say in every shot', () => {
    for (const lines of [ENDING_FILM.stage, ENDING_FILM.photo, ENDING_FILM.papers.lines, ENDING_FILM.ledger.lines, ENDING_FILM.window, ENDING_FILM.after.lines]) {
      expect(lines.length).toBeGreaterThan(0)
      for (const l of lines) expect(l.text.trim()).not.toBe('')
    }
  })

  it('costs more than it pays: the statement leaves you with less than a fifth of the prize', () => {
    const { prize, deductions, heldShare } = ENDING_FILM.ledger
    const net = prize - deductions.reduce((a, d) => a + d.amount, 0)
    expect(net).toBeGreaterThan(0)
    expect(net * (1 - heldShare)).toBeLessThan(prize * 0.2)
  })

  it('credits everyone it names, and ends on a thank-you', () => {
    const { entries, thanks } = ENDING_FILM.credits
    for (const e of entries) {
      expect(e.role.trim()).not.toBe('')
      expect(e.name.trim()).not.toBe('')
    }
    expect(thanks[0]).toBe('THANK YOU FOR PLAYING')
  })
})
