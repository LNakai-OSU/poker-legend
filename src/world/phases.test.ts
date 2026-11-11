import { describe, expect, it } from 'vitest'
import { TexasHoldEmTable } from '../engine/table'
import { CHARACTERS } from './characters'
import { CASINO_GOALS } from './goals'
import { phaseHolds, resolveStyle, type PhaseContext, type PlayPhase } from './phases'

const ctx = (over: Partial<PhaseContext> = {}): PhaseContext => ({ stackRatio: 1, hands: 0, youAggression: null, ...over })
const base = { skillTier: 'novice', archetype: 'station' } as const

describe('phases', () => {
  it('hold only when every condition does', () => {
    expect(phaseHolds({ stackBelow: 0.5 }, ctx({ stackRatio: 0.4 }))).toBe(true)
    expect(phaseHolds({ stackBelow: 0.5 }, ctx({ stackRatio: 0.5 }))).toBe(false)
    expect(phaseHolds({ stackBelow: 0.5, afterHand: 5 }, ctx({ stackRatio: 0.4, hands: 4 }))).toBe(false)
  })

  it('wait for ten of your decisions before they read you', () => {
    expect(phaseHolds({ youAggressionAbove: 0.4 }, ctx({ youAggression: null }))).toBe(false)
    expect(phaseHolds({ youAggressionBelow: 0.4 }, ctx({ youAggression: null }))).toBe(false)
    expect(phaseHolds({ youAggressionAbove: 0.4 }, ctx({ youAggression: 0.6 }))).toBe(true)
  })

  it('lay over the seat in order, the last one winning', () => {
    const phases: PlayPhase[] = [
      { when: { afterHand: 2 }, set: { archetype: 'maniac', skillTier: 'sharp' } },
      { when: { afterHand: 4 }, set: { archetype: 'nit' } },
    ]
    expect(resolveStyle(base, phases, ctx({ hands: 1 }))).toMatchObject({ archetype: 'station', skillTier: 'novice', active: [] })
    expect(resolveStyle(base, phases, ctx({ hands: 3 }))).toMatchObject({ archetype: 'maniac', skillTier: 'sharp', active: [0] })
    expect(resolveStyle(base, phases, ctx({ hands: 5 }))).toMatchObject({ archetype: 'nit', skillTier: 'sharp', active: [0, 1] })
  })

  it('give the seat back when they stop holding', () => {
    const phases: PlayPhase[] = [{ when: { stackAbove: 1.5 }, set: { archetype: 'maniac' } }]
    expect(resolveStyle(base, phases, ctx({ stackRatio: 2 })).archetype).toBe('maniac')
    expect(resolveStyle(base, phases, ctx({ stackRatio: 1 })).archetype).toBe('station')
  })
})

describe('the bosses', () => {
  const bosses = Object.values(CASINO_GOALS).map((g) => [g.bossId, CHARACTERS[g.bossId]] as const)

  it.each(bosses)('%s turns during the match', (id, boss) => {
    const phases = boss.seat?.phases ?? []
    expect(phases.length, `${id} plays the same from first hand to last`).toBeGreaterThan(0)
    for (const phase of phases) {
      expect(Object.keys(phase.when).length, `${id} has a phase that always holds`).toBeGreaterThan(0)
      expect(Object.keys(phase.set).length, `${id} has a phase that changes nothing`).toBeGreaterThan(0)
      // In their own voice: the label their greeting opens with.
      const label = boss.lines!.greeting![0].split(':')[0]
      for (const line of phase.says ?? []) expect(line.startsWith(`${label}:`), `${id}: ${line}`).toBe(true)
    }
  })

  it('all say something when they turn, not only change silently', () => {
    for (const [id, boss] of bosses) {
      expect(boss.seat?.phases?.some((p) => p.says && p.announce), `${id} never says anything`).toBe(true)
    }
  })
})

describe('restyling at the table', () => {
  const players = [
    { id: 'you', name: 'You', isHuman: true, skillTier: 'amateur', startingStack: 100 },
    { id: 'lou', name: 'Lou', isHuman: false, skillTier: 'novice', archetype: 'station', startingStack: 100 },
  ] as const

  it('changes how somebody plays between hands and refuses mid-hand', () => {
    const table = new TexasHoldEmTable([...players], { smallBlind: 1, bigBlind: 2 })
    table.restyle('lou', { archetype: 'maniac', skillTier: 'sharp' })
    table.startNewHand()
    // Heads-up the dealer (You) is the small blind and acts first, so Lou is up after the call.
    table.submitAction('you', { type: 'call' })
    expect(table.getAiContext('lou')).toMatchObject({ archetype: 'maniac', skillTier: 'sharp' })
    expect(() => table.restyle('lou', { archetype: 'nit' })).toThrow(/mid-hand/)
  })
})
