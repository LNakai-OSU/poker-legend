import { AREAS, CITIES } from '../world/cities'
import { CHARACTERS, type CharacterDef } from '../world/characters'
import { ROAD } from '../overworld/tiles'
import type { Px } from '../overworld/pixelArt'
import type { Figure, Facing } from '../overworld/characterArt'
import { HERO_FIGURE, figureForCharacter, lookFromId } from '../overworld/casting'
import { BUS_WINDOWS } from '../overworld/art/busArt'

/**
 * What the bus ride shows: a real road out of the world, and who is on board.
 *
 * The ride used to be a cabin built out of CSS boxes — round heads, flat
 * colours, a strip of grey for the town going past — in a game whose every
 * other picture is pixel art drawn from code. It is now the street's own art:
 * the road the bus runs along, tile for tile and object for object as you
 * would walk it, the bus drawn like the parked cars on it, and in its windows
 * the same people, in the same sprites, as in the street.
 */

/** The rows of a map that are road from one side to the other: where a bus can run. */
export function roadRows(areaId: string): number[] {
  const map = AREAS[areaId]?.area.map
  if (!map) return []
  return map.map((row, i) => (row.every((t) => t === ROAD) ? i : -1)).filter((i) => i >= 0)
}

/** The depot: the 14's stop at home, and the road for a ride across town. */
export const HOME_ROAD = 'depot'

/**
 * The road a ride runs along: the one into the town you are going to, or, for a
 * ride across town at home, the depot's.
 *
 * Every town on the ladder has a road area joining it to the last one, and the
 * bus takes it, so the scenery out of the window is the scenery you would have
 * walked past: cactus and red rock to Silver Creek, the river to Riverbend.
 */
export function rideRoad(arrive: { cityId?: string; areaId?: string }): string {
  const cityId = arrive.cityId ?? (arrive.areaId ? AREAS[arrive.areaId]?.cityId : undefined)
  const city = cityId ? CITIES[cityId] : undefined
  if (city) {
    const road = Object.keys(city.areas).find((id) => id.startsWith('road-') && roadRows(id).length >= 2)
    if (road) return road
  }
  return HOME_ROAD
}

/** The town a road belongs to, for its light after dark. */
export function themeOfArea(areaId: string): string {
  const cityId = AREAS[areaId]?.cityId
  return (cityId && CITIES[cityId]?.theme) || 'default'
}

/** Somebody sat at a window. */
export interface Rider {
  /** Which of `BUS_WINDOWS`. */
  window: number
  figure: Figure
  facing: Facing
  /** A character you know, by id; strangers have none. */
  characterId?: string
  /** A few frames out of step with the next person, so they do not bob as one. */
  phase: number
}

/**
 * Who sits where: you in the middle of the bus, the people riding with you
 * either side, and strangers dotted along the rest with a seat or two left
 * empty. The same ride always seats the same strangers.
 *
 * You and the people with you look out of the window, at the street; the
 * strangers face the front, the way people on a bus do.
 */
export function seatRiders(companions: Array<{ id: string; character: CharacterDef }>, seed: string): Rider[] {
  const you = 3
  const beside = [2, 4, 1, 5]
  const riders: Rider[] = [{ window: you, figure: HERO_FIGURE, facing: 'down', phase: 0 }]
  companions.slice(0, beside.length).forEach(({ id, character }, i) => {
    riders.push({ window: beside[i], figure: figureForCharacter(id, character), facing: 'down', characterId: id, phase: i + 1 })
  })
  const taken = new Set(riders.map((r) => r.window))
  let n = 0
  for (let window = 0; window < BUS_WINDOWS.length; window++) {
    if (taken.has(window)) continue
    n++
    // One window in three empty: a bus at this hour is not full.
    if (hashOf(`${seed}:${window}`) % 3 === 0) continue
    const id = `rider-${seed}-${window}`
    riders.push({
      window,
      figure: { role: 'local', look: lookFromId(id) },
      facing: 'right',
      phase: (n * 2) % 5,
    })
  }
  return riders.sort((a, b) => a.window - b.window)
}

/** The companions a forced ride names, as characters. */
export function companionsOf(ids: string[]): Array<{ id: string; character: CharacterDef }> {
  return ids.flatMap((id) => (CHARACTERS[id] ? [{ id, character: CHARACTERS[id] }] : []))
}

function hashOf(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// --- painting ----------------------------------------------------------------

/**
 * A drawing as a grid of colours, row by row, null where nothing was painted:
 * for tests, which have no canvas. 'transparent' clears.
 */
export function artGrid(w: number, h: number, draw: (px: Px) => void): (string | null)[] {
  const out: (string | null)[] = new Array(w * h).fill(null)
  draw((x, y, rw, rh, color) => {
    for (let yy = Math.max(0, y); yy < Math.min(h, y + rh); yy++) {
      for (let xx = Math.max(0, x); xx < Math.min(w, x + rw); xx++) {
        out[yy * w + xx] = color === 'transparent' ? null : color
      }
    }
  })
  return out
}

/** A drawing on a canvas, at `scale` canvas pixels per art unit. 'transparent' clears. */
export function paintArt(w: number, h: number, draw: (px: Px) => void, scale = 2): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = w * scale
  canvas.height = h * scale
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  draw((x, y, rw, rh, color) => {
    if (rw <= 0 || rh <= 0) return
    if (color === 'transparent') {
      ctx.clearRect(x * scale, y * scale, rw * scale, rh * scale)
      return
    }
    ctx.fillStyle = color
    ctx.fillRect(x * scale, y * scale, rw * scale, rh * scale)
  })
  return canvas
}
