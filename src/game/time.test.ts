import { describe, expect, it } from 'vitest'
import { PERIOD_LIGHT, TIME_PERIODS, periodAfter, periodIndex } from './time'
import { advanceDay, advancePeriod, initialState, takeStake } from './state'

describe('the clock', () => {
  it('runs morning to night and round again', () => {
    expect(periodAfter('morning').period).toBe('afternoon')
    expect(periodAfter('afternoon').period).toBe('evening')
    expect(periodAfter('evening').period).toBe('night')
    expect(periodAfter('night').period).toBe('morning')
  })

  it('counts a day for every time it passes midnight', () => {
    expect(periodAfter('morning', 3)).toEqual({ period: 'night', daysPassed: 0 })
    expect(periodAfter('morning', 4)).toEqual({ period: 'morning', daysPassed: 1 })
    expect(periodAfter('evening', 2)).toEqual({ period: 'morning', daysPassed: 1 })
    expect(periodAfter('night', 9)).toEqual({ period: 'morning', daysPassed: 3 })
  })

  it('stands still rather than running backwards', () => {
    expect(periodAfter('evening', 0)).toEqual({ period: 'evening', daysPassed: 0 })
    expect(periodAfter('evening', -3)).toEqual({ period: 'evening', daysPassed: 0 })
  })

  it('gives every period a light to be seen in', () => {
    // Morning is the hour the art is drawn for; everything else is lit against it.
    expect(PERIOD_LIGHT.morning).toBeNull()
    expect(periodIndex('morning')).toBe(0)
    const brightness = (hex: string) => {
      const n = parseInt(hex.slice(1), 16)
      return ((n >> 16) & 0xff) * 0.299 + ((n >> 8) & 0xff) * 0.587 + (n & 0xff) * 0.114
    }
    const later = TIME_PERIODS.slice(1).map((period) => PERIOD_LIGHT[period]!)
    for (const [i, light] of later.entries()) {
      expect(light, `${TIME_PERIODS[i + 1]} has no light`).toBeTruthy()
      // Each hour of the day darker than the one before it.
      if (i > 0) expect(brightness(light.ambient)).toBeLessThan(brightness(later[i - 1].ambient))
    }
    // The evening is warm and the night is blue; the lamps are on for both.
    const [, evening, night] = later
    const channel = (hex: string, shift: number) => (parseInt(hex.slice(1), 16) >> shift) & 0xff
    expect(channel(evening.ambient, 16)).toBeGreaterThan(channel(evening.ambient, 0))
    expect(channel(night.ambient, 0)).toBeGreaterThan(channel(night.ambient, 16))
    expect(evening.lamps).toBeGreaterThan(0)
    expect(night.lamps).toBe(1)
  })
})

describe('time passing in a run', () => {
  it('starts a new game in the morning', () => {
    expect(initialState().period).toBe('morning')
  })

  it('does not spend a day to move the clock on', () => {
    const state = advancePeriod(initialState())
    expect(state.period).toBe('afternoon')
    expect(state.day).toBe(1)
  })

  it('rolls into the next day when the night runs out', () => {
    const state = advancePeriod({ ...initialState(), period: 'night' })
    expect(state.period).toBe('morning')
    expect(state.day).toBe(2)
  })

  it('puts you into the next morning after something that costs a day', () => {
    // A session at the table runs long. You come out of it the following day,
    // not at the hour you sat down.
    const played = advanceDay({ ...initialState(), period: 'evening' })
    expect(played).toMatchObject({ day: 2, period: 'morning' })
  })

  it('sets the collectors on you for sitting out a debt past midnight', () => {
    // Staying out late is still letting the day turn over, and a debt that came
    // due while you were walking around is still overdue.
    let state = takeStake(
      { ...initialState(), cityId: 'riverbend' },
      { id: 'cass', name: 'Cass' },
      1000,
      0.25,
      1,
    )
    state = { ...state, period: 'night' }
    state = advancePeriod(state, 8)
    expect(state).toMatchObject({ day: 3, period: 'night' })
    expect(state.huntedInCityId).toBe('riverbend')
  })
})
