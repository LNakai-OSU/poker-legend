import { describe, expect, it } from 'vitest'
import { cellAt, groundArt, groundPalette, type GroundArt } from './ground'
import { TILE_VOCABULARY, parseMap, type TileGrid } from './tiles'
import { AREAS, CITIES } from '../world/cities'

/** Draws one square into a 16x16 grid of colours, last write wins, the way a canvas would for opaque paint. */
function rasterize(art: GroundArt, frame = 0): string[][] {
  const pixels = Array.from({ length: 16 }, () => Array.from({ length: 16 }, () => ''))
  art.draw((x, y, w, h, color) => {
    for (let yy = Math.max(0, y); yy < Math.min(16, y + h); yy++) {
      for (let xx = Math.max(0, x); xx < Math.min(16, x + w); xx++) {
        // Translucent shading is laid over what is there; it never replaces a line.
        if (!color.startsWith('rgba')) pixels[yy][xx] = color
      }
    }
  }, frame)
  return pixels
}

const art = (grid: TileGrid, col: number, row: number, theme = 'home') => groundArt(cellAt(grid, col, row), theme)!
const row = (pixels: string[][], y: number) => pixels[y]
const countIn = (pixels: string[][], color: string) => pixels.flat().filter((c) => c === color).length

describe('the road', () => {
  const road = groundPalette('home').road
  // A pavement, two lanes of road, a pavement: the shape of every street in the game.
  const street = parseMap(`
----
====
====
----
`)

  it('puts the centre line on the median and nowhere else', () => {
    // Column 0 is an even column, where the dashes fall.
    const north = rasterize(art(street, 0, 1))
    const south = rasterize(art(street, 0, 2))
    expect(row(north, 15)).toContain(road.median)
    expect(row(south, 0)).toContain(road.median)
    for (let y = 0; y < 15; y++) expect(row(north, y), `north lane, row ${y}`).not.toContain(road.median)
    for (let y = 1; y < 16; y++) expect(row(south, y), `south lane, row ${y}`).not.toContain(road.median)
  })

  it('runs an edge line just inside each kerb', () => {
    const north = rasterize(art(street, 1, 1))
    const south = rasterize(art(street, 1, 2))
    expect(row(north, 3).every((c) => c === road.edge)).toBe(true)
    expect(row(south, 12).every((c) => c === road.edge)).toBe(true)
  })

  it('dashes the centre line, rather than painting it solid', () => {
    const dashed = [0, 1, 2, 3].map((col) => countIn(rasterize(art(street, col, 1)), road.median))
    expect(Math.max(...dashed)).toBeGreaterThan(0)
    expect(Math.min(...dashed)).toBeLessThan(16)
  })

  it('splits a wide road into lanes with a double line down the middle', () => {
    const boulevard = parseMap(`
--
==
==
==
--
`)
    const middle = rasterize(art(boulevard, 0, 2))
    expect(row(middle, 7).every((c) => c === road.median)).toBe(true)
    expect(row(middle, 9).every((c) => c === road.median)).toBe(true)
    expect(row(middle, 8)).not.toContain(road.median)
    // The joins between the outer lanes and the middle one are white dashes.
    const lanes = [0, 1].flatMap((col) => [
      ...row(rasterize(art(boulevard, col, 1)), 15),
      ...row(rasterize(art(boulevard, col, 3)), 0),
    ])
    expect(lanes).toContain(road.edge)
    expect(lanes).not.toContain(road.median)
  })

  it('stripes a crossing and leaves the centre line off it', () => {
    const crossing = parseMap(`
-
z
z
-
`)
    const top = rasterize(art(crossing, 0, 1))
    expect(countIn(top, road.edge)).toBeGreaterThan(40)
    expect(countIn(top, road.median)).toBe(0)
  })

  it('gives the pavement a kerb where it drops to the road', () => {
    const kerb = groundPalette('home').kerb
    // The lip runs the length of the kerb, broken only by the joints between stones.
    const above = rasterize(art(street, 1, 0))
    expect(row(above, 12).filter((c) => c === kerb.lip).length).toBeGreaterThanOrEqual(14)
    expect(row(above, 14)).toContain(kerb.face)
    const below = rasterize(art(street, 1, 3))
    expect(row(below, 0).filter((c) => c === kerb.lip).length).toBeGreaterThanOrEqual(14)
  })
})

describe('where things meet', () => {
  it('puts a stone lip on the water under a quay, and leaves open water plain', () => {
    const water = groundPalette('harbor').water
    const harbour = parseMap(`
+++
~~~
~~~
`)
    const edge = rasterize(art(harbour, 1, 1, 'harbor'))
    expect(row(edge, 1).every((c) => c === water.lipTop)).toBe(true)
    expect(row(edge, 4)).toContain(water.foam)
    const open = rasterize(art(harbour, 1, 2, 'harbor'))
    expect(countIn(open, water.lipTop)).toBe(0)
  })

  it('rims a grass verge where it meets the pavement', () => {
    const grass = groundPalette('home').grass
    const verge = parseMap(`
---
-"-
---
`)
    const pixels = rasterize(art(verge, 1, 1))
    expect(pixels[0][8]).toBe(grass.rim)
    expect(pixels[8][0]).toBe(grass.rim)
  })

  it('does not rim grass against more grass', () => {
    const grass = groundPalette('home').grass
    const lawn = parseMap(`
"""
"""
"""
`)
    expect(countIn(rasterize(art(lawn, 1, 1)), grass.rim)).toBe(0)
  })
})

describe('variety', () => {
  it('does not draw a long pavement as one square repeated', () => {
    const pavement = parseMap(`
${'-'.repeat(24)}
${'-'.repeat(24)}
${'-'.repeat(24)}
`)
    const keys = new Set<string>()
    for (let col = 0; col < 24; col++) keys.add(art(pavement, col, 1).key)
    expect(keys.size).toBeGreaterThan(4)
  })

  it('draws the same square the same way every time', () => {
    const { area } = AREAS['basin']
    for (let r = 0; r < area.map.length; r++) {
      for (let c = 0; c < area.map[0].length; c++) {
        const once = groundArt(cellAt(area.map, c, r), 'home')
        const again = groundArt(cellAt(area.map, c, r), 'home')
        expect(once?.key).toBe(again?.key)
      }
    }
  })

  it('animates water, and only things that move', () => {
    const pond = parseMap(`
~~
--
`)
    expect(art(pond, 0, 0).frames).toBeGreaterThan(1)
    expect(art(pond, 0, 1).frames).toBe(1)
  })

  it('gives each town its own trees rather than one tree recoloured', () => {
    const wood = parseMap(`
TTT
TTT
---
`)
    const styles = new Set(Object.values(CITIES).map((city) => art(wood, 1, 1, city.theme ?? "default").key.split(':')[1]))
    expect(styles.size).toBeGreaterThanOrEqual(6)
  })
})

describe('coverage', () => {
  it('draws every outdoor tile in every town, and nothing indoors', () => {
    const outdoor = TILE_VOCABULARY.filter(({ char }) => '-="T:*+~_z'.includes(char))
    for (const city of Object.values(CITIES)) {
      for (const { tile, name } of outdoor) {
        const patch = [[tile, tile, tile], [tile, tile, tile], [tile, tile, tile]]
        expect(groundArt(cellAt(patch, 1, 1), city.theme ?? "default"), `${name} in ${city.name}`).not.toBeNull()
      }
    }
    const carpet = parseMap(',,,\n,,,\n,,,')
    expect(groundArt(cellAt(carpet, 1, 1), 'home')).toBeNull()
  })
})
