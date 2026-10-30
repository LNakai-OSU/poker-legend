import { describe, expect, it } from 'vitest'
import { checkpointAt, cleanCash, isPlaytester } from './playtest'
import { initialState } from './state'

describe('playtest tools', () => {
  it('only the playtest name has them', () => {
    expect(isPlaytester('playtest')).toBe(true)
    for (const n of ['', 'playtester', 'Playtest', 'gus']) expect(isPlaytester(n)).toBe(false)
  })

  it('cash is whole and never negative', () => {
    expect(cleanCash(-5)).toBe(0)
    expect(cleanCash(12.6)).toBe(13)
    expect(cleanCash(NaN)).toBe(0)
  })

  it('a checkpoint arrives in the town with everything before it done', () => {
    const at = checkpointAt(initialState(), 'palmCay')
    expect(at.cityId).toBe('palmCay')
    expect(at.unlockedCityIds).toEqual(expect.arrayContaining(['silverCreek', 'riverbend', 'crescentHarbor', 'palmCay']))
    expect(at.casino.bossBeaten).toEqual(expect.arrayContaining(['silverCreek', 'riverbend', 'crescentHarbor']))
    expect(at.casino.bossBeaten).not.toContain('palmCay')
    expect(at.cash).toBeGreaterThanOrEqual(0)
  })

  it('jumping back keeps what was done', () => {
    const far = checkpointAt(initialState(), 'neonMesa')
    const back = checkpointAt(far, 'silverCreek')
    expect(back.cityId).toBe('silverCreek')
    expect(back.casino.bossBeaten).toEqual(far.casino.bossBeaten)
  })
})
