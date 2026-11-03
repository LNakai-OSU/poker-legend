import { describe, expect, it } from 'vitest'
import {
  GARMENTS,
  NPC_ROLES,
  PERSON_BUILDS,
  PERSON_H,
  PERSON_HAIR_STYLES,
  PERSON_PROPS,
  PERSON_W,
  STREET_HATS,
  personPixels,
  seatedPixels,
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
  ...STREET_HATS.map((hat) => ({ role: 'local' as const, look: { ...LOOK, hat } })),
  ...PERSON_PROPS.map((prop) => ({ role: 'local' as const, look: { ...LOOK, prop } })),
  // Every body in every uniform, every garment, every prop and in a skirt.
  ...PERSON_BUILDS.flatMap((build) => [
    ...NPC_ROLES.map((role) => ({ role, look: { ...LOOK, build } })),
    ...GARMENTS.map((garment) => ({ role: 'local' as const, look: { ...LOOK, build, garment, garmentColor: '#8a3a3a' } })),
    ...PERSON_PROPS.map((prop) => ({ role: 'local' as const, look: { ...LOOK, build, prop } })),
    { role: 'local' as const, look: { ...LOOK, build, lower: 'skirt' as const } },
  ]),
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

  /** Which pixels are drawn at all: the outline of somebody, whatever they wear. */
  const silhouette = (figure: Figure, facing: Facing, frame: WalkFrame = 0) =>
    personPixels(figure, facing, frame).map((c) => (c ? '#' : '.')).join('')
  const widest = (pixels: (string | null)[]) =>
    Math.max(...rows(pixels).map((row) => row.filter(Boolean).length))
  const body = (build: (typeof PERSON_BUILDS)[number]): Figure => ({ role: 'local', look: { ...LOOK, build } })

  it('draws every build as a body of its own, not the regular one recoloured', () => {
    for (const facing of FACINGS) {
      const shapes = PERSON_BUILDS.map((build) => silhouette(body(build), facing))
      expect(new Set(shapes).size, `bodies facing ${facing}`).toBe(PERSON_BUILDS.length)
    }
    const down = (build: (typeof PERSON_BUILDS)[number]) => personPixels(body(build), 'down', 0)
    expect(widest(down('heavy')), 'heavy is wider').toBeGreaterThan(widest(down('regular')))
    expect(topRow(down('tall')), 'tall stands taller').toBeLessThan(topRow(down('regular')))
    expect(topRow(down('kid')), 'a child is shorter').toBeGreaterThan(topRow(down('regular')) + 1)
    // The tall body is narrower through the chest than the regular one.
    const chest = (build: (typeof PERSON_BUILDS)[number]) => rows(down(build))[15].filter(Boolean).length
    expect(chest('tall')).toBeLessThan(chest('regular'))
  })

  it('walks every build: each stride differs from standing and from the other', () => {
    for (const build of PERSON_BUILDS) {
      for (const facing of FACINGS) {
        const [stand, left, right] = FRAMES.map((frame) => silhouette(body(build), facing, frame))
        expect(left, `${build} ${facing}`).not.toBe(stand)
        expect(right, `${build} ${facing}`).not.toBe(stand)
        expect(left, `${build} ${facing}`).not.toBe(right)
      }
    }
  })

  it('keeps the cane in the same hand on both steps, and on the other side from behind', () => {
    // At the knee, the cane is the outermost thing on that side: within two
    // columns of the edge, where no leg reaches.
    const knee = (facing: Facing, frame: WalkFrame) => rows(personPixels(body('elder'), facing, frame))[20]
    for (const frame of FRAMES) {
      expect(knee('down', frame).findIndex(Boolean), `facing you, step ${frame}`).toBeLessThanOrEqual(2)
      expect(PERSON_W - 1 - knee('up', frame).findLastIndex(Boolean), `from behind, step ${frame}`).toBeLessThanOrEqual(2)
    }
    // Nobody else has anything out there.
    expect(rows(personPixels(body('regular'), 'down', 0))[20].findIndex(Boolean)).toBeGreaterThan(2)
  })

  it('fits clothes drawn for the regular body onto every other one', () => {
    // A tie, an apron and a jacket's lapels are drawn for a regular chest. On a
    // narrow or a short one they would hang in the air beside it.
    const plain = (build: (typeof PERSON_BUILDS)[number], facing: Facing) => silhouette(body(build), facing)
    const below = (shape: string, build: (typeof PERSON_BUILDS)[number]) => {
      // From the collar down; a hood behind the neck may sit above it.
      const collar = { regular: 13, heavy: 14, tall: 12, elder: 14, kid: 16 }[build]
      return shape.slice(collar * PERSON_W)
    }
    const uniforms = NPC_ROLES.filter((role) => !['tourist', 'waiter', 'player', 'kid', 'local'].includes(role))
    for (const build of PERSON_BUILDS.filter((b) => b !== 'regular' && b !== 'kid')) {
      for (const facing of FACINGS) {
        const bare = below(plain(build, facing), build)
        for (const role of uniforms) {
          expect(below(silhouette({ role, look: { ...LOOK, build } }, facing), build), `${role} on ${build} ${facing}`).toBe(bare)
        }
        for (const garment of GARMENTS) {
          const dressed = silhouette({ role: 'local', look: { ...LOOK, build, garment } }, facing)
          expect(below(dressed, build), `${garment} on ${build} ${facing}`).toBe(bare)
        }
      }
    }
  })

  it('sits every build with its hips on the chair', () => {
    for (const build of PERSON_BUILDS) {
      for (const facing of ['down', 'up'] as Facing[]) {
        const pixels = seatedPixels(body(build), facing)
        // The lap is row 18-19 and nothing hangs below the seat.
        expect(rows(pixels)[18].some(Boolean), `${build} has a lap`).toBe(true)
        expect(pixels.slice(21 * PERSON_W).filter(Boolean).length, `${build} sitting ${facing} still has legs`).toBe(0)
      }
    }
  })

  it('gives every prop and signature hat something to see from the front', () => {
    const bare = personPixels({ role: 'local', look: LOOK }, 'down', 0).join()
    for (const prop of PERSON_PROPS) {
      expect(personPixels({ role: 'local', look: { ...LOOK, prop } }, 'down', 0).join(), prop).not.toBe(bare)
    }
    const hats = new Set(STREET_HATS.map((hat) => silhouette({ role: 'local', look: { ...LOOK, hat } }, 'down')))
    expect(hats.size, 'hats with a shape of their own').toBe(STREET_HATS.length)
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
