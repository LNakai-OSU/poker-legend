import { describe, expect, it } from 'vitest'
import { TABLE_HINTS, TABLE_PERKS, perkClarity } from './tableHints'
import { TABLES } from './content'
import { EVENTS, conditionHolds } from './events'
import { initialState, type GameState } from '../game/state'
import { STORY_FLAG_IDS } from './flags'

describe('table hints', () => {
  it('are said by somebody who is seated there, about something that exists', () => {
    for (const hint of TABLE_HINTS) {
      const table = TABLES[hint.tableId]
      expect(table, hint.id).toBeDefined()
      const seated = table.opponents.map((o) => (typeof o === 'string' ? o : o.character))
      expect(seated, `${hint.id}: ${hint.speaker} is not at ${hint.tableId}`).toContain(hint.speaker)
      for (const c of hint.when) {
        if (c.kind === 'flag') expect(STORY_FLAG_IDS).toContain(c.flag)
        if (c.kind === 'eventDone') expect(EVENTS.some((e) => e.id === c.eventId), `${hint.id}: ${c.eventId}`).toBe(true)
      }
      expect(hint.lines.length).toBeGreaterThan(0)
    }
  })

  it('keep the perk small, and only for the tables and flags it names', () => {
    for (const perk of TABLE_PERKS) {
      expect(perk.tellClarity).toBeLessThanOrEqual(0.25)
      if (perk.id === 'wick-price' || perk.id === 'ilse-rebuy') expect(perk.tellClarity).toBeLessThanOrEqual(0.1)
      for (const id of perk.tableIds) expect(TABLES[id], perk.id).toBeDefined()
    }
    const on = (c: { kind: string; flag?: string }) => c.kind === 'flag' && c.flag === 'errandSawTheTell'
    expect(perkClarity('crescent-main', on as never)).toBeCloseTo(0.2)
    expect(perkClarity('crescent-main', () => false)).toBe(0)
    expect(perkClarity('silvercreek-low', () => true)).toBe(0)
  })

  it('pay a secret kept for Wendell at Lou’s table, and nothing for one sold to Nico', () => {
    const at = (completedEventIds: string[], sold: boolean): GameState => {
      const base = initialState()
      return { ...base, completedEventIds, flags: { ...base.flags, errandWendellSold: sold } }
    }
    const clarity = (s: GameState) => perkClarity('silvercreek-boss', (c) => conditionHolds(c, s))
    expect(clarity(at(['errand-wendell-done'], false))).toBeCloseTo(0.1)
    expect(clarity(at(['errand-wendell-done'], true))).toBe(0)
    expect(clarity(at([], false))).toBe(0)
    // Lou says something either way, so the choice is felt at the boss's table.
    const said = (s: GameState) => TABLE_HINTS.filter((h) => h.tableId === 'silvercreek-boss' && h.when.every((c) => conditionHolds(c, s))).map((h) => h.id)
    expect(said(at(['errand-wendell-done'], false))).toContain('lou-stack')
    expect(said(at(['errand-wendell-done'], true))).toEqual(['lou-nico'])
  })
})
