import { describe, expect, it } from 'vitest'
import { ROUNDS, drawCard, drawResult, planFight } from '../engine/boxing'
import { mulberry32 } from '../engine/rng'
import { buildRun, frameAt, idleFrame, INTRO_MS } from './boxingChoreo'

function runFor(seed: number) {
  const rng = mulberry32(seed)
  const bout = drawCard(rng)[seed % 3]
  const result = drawResult(bout, rng)
  const plan = planFight(result, rng)
  return { bout, result, plan, run: buildRun(0, bout, null, result, plan, 0, rng) }
}

describe('the fight as staged', () => {
  it('every frame is a real picture: finite joints, men inside the ring, health that only falls', () => {
    for (let seed = 1; seed < 40; seed++) {
      const { run, plan } = runFor(seed)
      let lastA = 100
      let lastB = 100
      for (let ms = 0; ms <= run.endAt + 200; ms += 90) {
        const f = frameAt(run, ms)
        for (const v of [f.a, f.b]) {
          expect(v.pose.every(Number.isFinite)).toBe(true)
          expect(v.pose).toHaveLength(24)
          expect(Number.isFinite(v.x)).toBe(true)
          expect(v.x).toBeGreaterThan(0)
          expect(v.x).toBeLessThan(236)
          expect(v.y).toBeGreaterThanOrEqual(0)
          expect(v.y).toBeLessThanOrEqual(1)
          expect(v.stamina).toBeGreaterThanOrEqual(8)
          expect(v.stamina).toBeLessThanOrEqual(100)
        }
        expect(f.hp[0]).toBeLessThanOrEqual(lastA)
        expect(f.hp[1]).toBeLessThanOrEqual(lastB)
        lastA = f.hp[0]
        lastB = f.hp[1]
        expect(f.zoom).toBeGreaterThanOrEqual(1)
        expect(f.slow).toBeGreaterThan(0)
      }
      expect(lastA).toBe(plan.endA)
      expect(lastB).toBe(plan.endB)
    }
  })

  it('opens with the introductions, rings a bell for every round and ends with a verdict', () => {
    for (let seed = 1; seed < 30; seed++) {
      const { run, result, plan } = runFor(seed)
      const bells = run.events.filter((e) => e.sfx === 'bell').length
      const rounds = plan.rounds.length
      // The opening bell, a bell ending and a bell starting every round after the first, and the last bell.
      expect(bells).toBeGreaterThanOrEqual(rounds + (result.method === 'decision' ? 1 : 0))
      expect(run.events[0].text).toMatch(/Ladies and gentlemen/)
      expect(run.events.some((e) => /In the red corner/.test(e.text ?? ''))).toBe(true)
      expect(run.events.some((e) => /In the blue corner/.test(e.text ?? ''))).toBe(true)
      expect(run.spans[0].start).toBe(INTRO_MS)
      expect(run.spans).toHaveLength(rounds)
      const sorted = [...run.events].sort((x, y) => x.at - y.at)
      expect(run.events).toEqual(sorted)
      if (result.method === 'decision') {
        expect(run.cardsAt).toHaveLength(3)
        expect(frameAt(run, run.endAt - 100).cardsShown).toBe(3)
        expect(frameAt(run, run.endAt - 100).verdict).toBe(result.winner)
      } else {
        expect(frameAt(run, run.endAt - 100).verdict).toBe(result.winner)
        expect(run.events.some((e) => /KO|TKO|knockout|waves it off|over/i.test(e.text ?? ''))).toBe(true)
      }
      expect(run.endAt).toBeLessThan(ROUNDS * 20000 + 60000)
    }
  })

  it('knockdowns put a man flat and the count runs to eight', () => {
    let seen = 0
    for (let seed = 1; seed < 80 && seen < 3; seed++) {
      const { run } = runFor(seed)
      const b = run.beats.find((x) => x.ex.knockdown)
      if (!b) continue
      seen++
      const downed = b.ex.by === 'a' ? 'b' : 'a'
      const f = frameAt(run, b.start + b.hitAt + 900)
      const lying = (downed === 'a' ? f.a : f.b).pose
      // Lying down: the head is as low as the hips.
      expect(lying[1]).toBeGreaterThan(-12)
      expect(run.events.filter((e) => e.text === 'Eight…').length).toBeGreaterThanOrEqual(1)
    }
    expect(seen).toBeGreaterThan(0)
  })

  it('the idle frame for the card is two men waiting in their corners', () => {
    const { bout } = runFor(3)
    const f = idleFrame(bout, 5000)
    expect(f.a.x).toBeLessThan(f.b.x)
    expect(f.over).toBe(false)
  })
})
