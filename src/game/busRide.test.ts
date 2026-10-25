import { describe, expect, it } from 'vitest'
import { CITY_ORDER } from '../world/cities'
import { CHARACTERS } from '../world/characters'
import { INK } from '../overworld/pixelArt'
import {
  BUS_H,
  BUS_W,
  BUS_WINDOWS,
  WHEEL_SIZE,
  drawBusBody,
  drawBusWheel,
} from '../overworld/art/busArt'
import { HOME_ROAD, artGrid, companionsOf, rideRoad, roadRows, seatRiders } from './busRide'

describe('the road out of the bus window', () => {
  it('is the road into the town you are going to, for every town on the ladder', () => {
    const roads = CITY_ORDER.map((cityId) => rideRoad({ cityId }))
    for (const [i, road] of roads.entries()) {
      expect(road, `the ride to ${CITY_ORDER[i]} runs along the depot`).not.toBe(HOME_ROAD)
      expect(roadRows(road).length, `${road} has no road from side to side`).toBeGreaterThanOrEqual(2)
    }
    expect(new Set(roads).size, 'two towns share one road').toBe(roads.length)
  })

  it('is the same road whether the ride names the town or a street in it', () => {
    expect(rideRoad({ areaId: 'sc-street' })).toBe(rideRoad({ cityId: 'silverCreek' }))
  })

  it('is the depot at home, where there is no road out of town to show', () => {
    expect(rideRoad({ cityId: 'apartment' })).toBe(HOME_ROAD)
    expect(rideRoad({ areaId: 'marcus-house' })).toBe(HOME_ROAD)
    expect(rideRoad({})).toBe(HOME_ROAD)
    expect(roadRows(HOME_ROAD).length).toBeGreaterThanOrEqual(2)
  })
})

describe('who sits where on the bus', () => {
  const marcus = companionsOf(['marcus'])
  const riders = seatRiders(marcus, 'road-silvercreek:Silver Creek')

  it('sits you at a window, and whoever rides with you at the window beside yours', () => {
    const you = riders.find((r) => r.figure.role === 'player')
    const him = riders.find((r) => r.characterId === 'marcus')
    expect(you && him).toBeTruthy()
    expect(Math.abs(you!.window - him!.window)).toBe(1)
    expect(him!.figure.look.skin).toBe(CHARACTERS.marcus.look.skin)
  })

  it('never puts two people in one seat, or anybody outside the windows', () => {
    const windows = riders.map((r) => r.window)
    expect(new Set(windows).size).toBe(windows.length)
    for (const w of windows) expect(w >= 0 && w < BUS_WINDOWS.length).toBe(true)
  })

  it('leaves a seat or two empty, and seats the same strangers on the same ride', () => {
    expect(riders.length).toBeLessThan(BUS_WINDOWS.length)
    expect(seatRiders(marcus, 'road-silvercreek:Silver Creek')).toEqual(riders)
  })

  it('names nobody who does not exist', () => {
    expect(companionsOf(['marcus', 'nobody-at-all']).map((c) => c.id)).toEqual(['marcus'])
  })
})

describe('the bus is drawn like the street', () => {
  const body = artGrid(BUS_W, BUS_H, (px) => drawBusBody(px))

  it('has a dark outline along its roof, as everything in the street does', () => {
    for (let x = 4; x < BUS_W - 4; x++) {
      let top: string | null = null
      for (let y = 0; y < BUS_H && top === null; y++) top = body[y * BUS_W + x]
      expect(top, `column ${x} of the roof has no outline`).toBe(INK)
    }
  })

  it('has its windows cut out, so the people inside show through', () => {
    for (const w of BUS_WINDOWS) {
      const middle = body[(w.y + Math.floor(w.h / 2)) * BUS_W + w.x + Math.floor(w.w / 2)]
      expect(middle).toBeNull()
    }
  })

  it('turns its wheels: every frame differs from the last', () => {
    const frames = [0, 1, 2].map((f) => artGrid(WHEEL_SIZE, WHEEL_SIZE, (px) => drawBusWheel(px, f)).join(','))
    expect(new Set(frames).size).toBe(3)
  })
})
