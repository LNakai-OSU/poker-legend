import { describe, expect, it } from 'vitest'
import { generateTell, STRONG_TELL_KINDS, WEAK_TELL_KINDS } from './tells'
import { mulberry32 } from './rng'
import type { Card, SkillTier } from './types'

const POCKET_ACES: Card[] = [
  { rank: 14, suit: 'spades' },
  { rank: 14, suit: 'hearts' },
]
const TRASH: Card[] = [
  { rank: 7, suit: 'spades' },
  { rank: 2, suit: 'diamonds' },
]

function sample(tier: SkillTier, hole: Card[], iterations = 400) {
  const rng = mulberry32(99)
  let fired = 0
  let saidStrong = 0
  for (let i = 0; i < iterations; i++) {
    const tell = generateTell('opponent', hole, [], tier, rng)
    if (tell) {
      fired++
      if (tell.meansStrongHand) saidStrong++
    }
  }
  return { fired, saidStrong, iterations }
}

describe('generateTell', () => {
  it('fires far more often against weak players than strong ones', () => {
    const novice = sample('novice', POCKET_ACES)
    const elite = sample('elite', POCKET_ACES)
    // novice ~85% of the time, elite ~4%
    expect(novice.fired / novice.iterations).toBeGreaterThan(0.7)
    expect(elite.fired / elite.iterations).toBeLessThan(0.15)
    expect(novice.fired).toBeGreaterThan(elite.fired * 4)
  })

  it('reads truthfully almost always against a novice holding a monster', () => {
    const { fired, saidStrong } = sample('novice', POCKET_ACES)
    expect(fired).toBeGreaterThan(0)
    expect(saidStrong / fired).toBeGreaterThan(0.85)
  })

  it('reads truthfully against a novice holding trash', () => {
    const { fired, saidStrong } = sample('novice', TRASH)
    expect(fired).toBeGreaterThan(0)
    // 7-2 offsuit is not a strong hand, so the tell should mostly say "weak"
    expect(saidStrong / fired).toBeLessThan(0.2)
  })

  it('is much less reliable against sharp players (deliberate false reads)', () => {
    const novice = sample('novice', POCKET_ACES)
    const sharp = sample('sharp', POCKET_ACES, 1400)
    const noviceTruthRate = novice.saidStrong / novice.fired
    const sharpTruthRate = sharp.saidStrong / sharp.fired
    expect(sharp.fired).toBeGreaterThan(0)
    expect(sharpTruthRate).toBeLessThan(noviceTruthRate)
  }, 30000)

  it('picks the cue from the set matching what the tell means', () => {
    // This is what makes a read learnable at all: the visible cue has to carry
    // the signal, not just the hidden meansStrongHand flag.
    const rng = mulberry32(1234)
    let checked = 0
    for (const tier of ['novice', 'competent', 'elite'] as SkillTier[]) {
      for (const hole of [POCKET_ACES, TRASH]) {
        for (let i = 0; i < 120; i++) {
          const tell = generateTell('opponent', hole, [], tier, rng)
          if (!tell) continue
          checked++
          const expected = tell.meansStrongHand ? STRONG_TELL_KINDS : WEAK_TELL_KINDS
          expect(expected, `${tell.kind} for meansStrongHand=${tell.meansStrongHand}`).toContain(tell.kind)
        }
      }
    }
    expect(checked).toBeGreaterThan(50)
  }, 30000)

  it('shows a strong-hand cue most of the time when a novice holds a monster', () => {
    const rng = mulberry32(8)
    let strongCue = 0
    let fired = 0
    for (let i = 0; i < 300; i++) {
      const tell = generateTell('opponent', POCKET_ACES, [], 'novice', rng)
      if (!tell) continue
      fired++
      if (STRONG_TELL_KINDS.includes(tell.kind)) strongCue++
    }
    expect(fired).toBeGreaterThan(0)
    expect(strongCue / fired).toBeGreaterThan(0.85)
  }, 30000)

  it('shows a weak-hand cue most of the time when a novice holds trash', () => {
    const rng = mulberry32(8)
    let weakCue = 0
    let fired = 0
    for (let i = 0; i < 300; i++) {
      const tell = generateTell('opponent', TRASH, [], 'novice', rng)
      if (!tell) continue
      fired++
      if (WEAK_TELL_KINDS.includes(tell.kind)) weakCue++
    }
    expect(fired).toBeGreaterThan(0)
    expect(weakCue / fired).toBeGreaterThan(0.85)
  }, 30000)

  it('returns a well-formed signal', () => {
    const rng = mulberry32(3)
    let tell = null
    for (let i = 0; i < 50 && !tell; i++) {
      tell = generateTell('ray', POCKET_ACES, [], 'novice', rng)
    }
    expect(tell).not.toBeNull()
    expect(tell!.playerId).toBe('ray')
    expect(tell!.visibility).toBeGreaterThan(0)
    expect(tell!.visibility).toBeLessThanOrEqual(1)
    expect(['arm-shift', 'lip-twitch', 'glance', 'stillness', 'chip-tap']).toContain(tell!.kind)
  })
})
