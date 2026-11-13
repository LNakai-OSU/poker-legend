import { describe, expect, it } from 'vitest'
import { EVENTS } from './events'
import { CASINO_GOALS, GOAL_ORDER } from './goals'
import { ROUTE } from './route'
import { roadSign } from './roadSign'

const planLines = () => {
  const event = EVENTS.find((e) => e.id === 'dana-walks-you-home')!
  const reel = event.actions.find((a) => a.kind === 'reel' && a.panels[0].scene === 'route')
  if (reel?.kind !== 'reel') throw new Error('the plan is gone')
  return reel.panels[0].lines
}

describe('the road to the penthouse', () => {
  it('runs from home through every casino town to Lumina', () => {
    expect(ROUTE.map((s) => s.cityId)).toEqual(['apartment', 'silverCreek', 'riverbend', 'crescentHarbor', 'palmCay', 'neonMesa', 'portoLumina'])
  })

  it("Marcus's plan names every stop in order, with the numbers the goals hold", () => {
    const lines = planLines()
    const stops = lines.map((l) => l.stop).filter((s): s is number => s !== undefined)
    expect(stops).toEqual([0, 1, 2, 3, 4, 5, 6])
    for (const goal of GOAL_ORDER) {
      const stop = ROUTE.findIndex((s) => s.cityId === goal.cityId)
      const said = lines.find((l) => l.stop === stop)!.text
      expect(said, goal.cityId).toContain(`$${goal.winTarget.toLocaleString('en-US')}`)
      expect(said, goal.cityId).toContain(ROUTE[stop].bankroll > 0 ? `$${ROUTE[stop].bankroll.toLocaleString('en-US')}` : '')
    }
  })

  it('has a sign for every goal that says its target', () => {
    for (const g of Object.values(CASINO_GOALS)) expect(roadSign(g.cityId)).toContain(`$${g.winTarget.toLocaleString('en-US')}`)
  })
})
