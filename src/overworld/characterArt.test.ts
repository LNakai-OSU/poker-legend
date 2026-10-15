import { describe, expect, it } from 'vitest'
import {
  NPC_ROLES,
  PERSON_H,
  PERSON_HAIR_STYLES,
  PERSON_W,
  personPixels,
  ramp,
  visualKey,
  type Facing,
  type Figure,
  type PersonLook,
  type WalkFrame,
} from './characterArt'
import { OBJECT_KINDS, objectPixels } from './objectArt'

const LOOK: PersonLook = {
  skin: '#d9a07a',
  hair: '#4a3020',
  hairStyle: 'short',
  shirt: '#4a7ac8',
  accessory: 'none',
}
const FACINGS: Facing[] = ['down', 'up', 'left', 'right']
const FRAMES: WalkFrame[] = [0, 1, 2]

const luminance = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return 0.2126 * ((n >> 16) & 0xff) + 0.7152 * ((n >> 8) & 0xff) + 0.0722 * (n & 0xff)
}
const rows = (pixels: (string | null)[]) =>
  Array.from({ length: PERSON_H }, (_, y) => pixels.slice(y * PERSON_W, (y + 1) * PERSON_W))
const topRow = (pixels: (string | null)[]) => rows(pixels).findIndex((row) => row.some(Boolean))

/** Every combination the game can ask for, so a bad pixel map fails here rather than on screen. */
const everyone: Figure[] = [
  ...NPC_ROLES.map((role) => ({ role, look: LOOK })),
  ...PERSON_HAIR_STYLES.map((hairStyle) => ({ role: 'local' as const, look: { ...LOOK, hairStyle } })),
  ...(['glasses', 'shades', 'cap', 'visor', 'earring'] as const).map((accessory) => ({
    role: 'local' as const,
    look: { ...LOOK, accessory },
  })),
  ...(['shorts', 'skirt'] as const).map((lower) => ({ role: 'local' as const, look: { ...LOOK, lower } })),
]

describe('people', () => {
  it('draws every role, hairstyle and accessory in every facing and walk frame', () => {
    for (const figure of everyone) {
      for (const facing of FACINGS) {
        for (const frame of FRAMES) {
          const pixels = personPixels(figure, facing, frame)
          expect(pixels).toHaveLength(PERSON_W * PERSON_H)
          // Stands on its tile: the outline under the feet is the tile's bottom row.
          expect(rows(pixels)[PERSON_H - 1].some(Boolean), `${figure.role}/${figure.look.hairStyle} ${facing}${frame}`).toBe(true)
          // Rises over the tile behind it, as a LeafGreen sprite does.
          expect(topRow(pixels)).toBeLessThan(8)
        }
      }
    }
  })

  it('outlines in dark shades, never pure black', () => {
    for (const figure of everyone) {
      for (const facing of FACINGS) {
        expect(personPixels(figure, facing, 0)).not.toContain('#000000')
      }
    }
  })

  it('faces right as the mirror image of facing left', () => {
    for (const frame of FRAMES) {
      const left = rows(personPixels({ role: 'dealer', look: LOOK }, 'left', frame))
      const right = rows(personPixels({ role: 'dealer', look: LOOK }, 'right', frame))
      expect(right).toEqual(left.map((row) => [...row].reverse()))
    }
  })

  it('walks: each stride differs from standing, and the two feet differ from each other', () => {
    for (const facing of FACINGS) {
      const [stand, left, right] = FRAMES.map((frame) => personPixels({ role: 'local', look: LOOK }, facing, frame).join())
      expect(left).not.toBe(stand)
      expect(right).not.toBe(stand)
      expect(left).not.toBe(right)
    }
  })

  it('blinks', () => {
    for (const facing of ['down', 'left', 'right'] as Facing[]) {
      const open = personPixels({ role: 'local', look: LOOK }, facing, 0).join()
      expect(personPixels({ role: 'local', look: LOOK }, facing, 0, true).join()).not.toBe(open)
    }
  })

  it('draws a child shorter than a grown-up, under the same head', () => {
    const adult = personPixels({ role: 'local', look: LOOK }, 'down', 0)
    const child = personPixels({ role: 'kid', look: LOOK }, 'down', 0)
    expect(topRow(child)).toBeGreaterThan(topRow(adult))
  })

  it('tells people apart by how they look, not by fields the drawing ignores', () => {
    const dealer = (shirt: string): Figure => ({ role: 'dealer', look: { ...LOOK, shirt } })
    // A waistcoat covers the shirt: two dealers in different shirts are one dealer.
    expect(visualKey(dealer('#ff0000'))).toBe(visualKey(dealer('#00ff00')))
    expect(visualKey({ role: 'local', look: LOOK })).not.toBe(
      visualKey({ role: 'local', look: { ...LOOK, hair: '#c04a2a' } }),
    )
  })
})

describe('ramp', () => {
  it('runs light to dark: highlight, base, shadow, outline', () => {
    for (const color of ['#4a7ac8', '#ececf2', '#25252e', '#e9a630', '#3a9d5c']) {
      const [hi, base, lo, out] = ramp(color).map(luminance)
      expect(hi).toBeGreaterThanOrEqual(base)
      expect(base).toBeGreaterThan(lo)
      expect(lo).toBeGreaterThan(out)
    }
    for (const skin of ['#f4d4b4', '#c08654', '#5e3a22']) {
      const [hi, base, lo, out] = ramp(skin, 'skin').map(luminance)
      expect(hi).toBeGreaterThan(base)
      expect(base).toBeGreaterThan(lo)
      expect(lo).toBeGreaterThan(out)
    }
  })
})

describe('objects', () => {
  it('draws every object standing on its tile', () => {
    for (const kind of OBJECT_KINDS) {
      const pixels = objectPixels(kind)
      expect(pixels).toHaveLength(PERSON_W * PERSON_H)
      expect(rows(pixels)[PERSON_H - 1].some(Boolean), kind).toBe(true)
    }
  })
})
