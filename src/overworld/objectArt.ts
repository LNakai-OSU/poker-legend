import { Texture } from 'pixi.js'

/**
 * Small things you can walk up to that are not people.
 *
 * A POI was drawn as a person unless told otherwise, so the note Marcus left on
 * your table was a man in a blue shirt standing in your kitchen, and a gull on a
 * post was a gull-shaped stranger. These are the few that needed art of their
 * own. Same grid, scale and outline as the people: 16 units wide, up to 24 tall,
 * standing on their tile.
 */

export type ObjectKind = 'note' | 'gull' | 'stall' | 'viewer'

export const OBJECT_KINDS: ObjectKind[] = ['note', 'gull', 'stall', 'viewer']

const W = 16
const H = 24

interface PixelMap {
  rows: string[]
  colors: Record<string, string>
  /** The dark edge drawn round the whole silhouette. */
  outline: string
}

/** Rows are aligned to the bottom of the 24-row canvas: the last row stands on the tile's bottom edge. */
const OBJECTS: Record<ObjectKind, PixelMap> = {
  // A side table with Marcus's note on it, and the pen he left.
  note: {
    outline: '#2a1a14',
    colors: {
      W: '#d49a5c', w: '#b07a44', v: '#8a5a32', d: '#6a4226',
      P: '#f6f2e6', p: '#d8d0bc', i: '#3a3a5a', r: '#c03a3a',
    },
    rows: [
      '................',
      '...PPPPPP.......',
      '..WPiiPiPpWWW...',
      '.WWPPiiPPpWrWw..',
      '.WWpPPPPppWWWw..',
      '.wwwwwwwwwwwwv..',
      '..vvvvvvvvvvv...',
      '...d.......d....',
      '...d.......d....',
      '...v.......v....',
      '...v.......v....',
      '................',
    ],
  },
  // It watches you the whole way past.
  gull: {
    outline: '#22262e',
    colors: {
      W: '#f4f6f8', w: '#d4d8de', g: '#9aa4b0', G: '#6a7480', e: '#141418',
      y: '#f0c040', o: '#d88a2a', P: '#8a6a4a', p: '#6a4e36', q: '#4a3626',
    },
    rows: [
      '................',
      '......WWW.......',
      '.....WWeWyy.....',
      '.....WWWWo......',
      '..gGGWWWW.......',
      '.gGGgWWWWw......',
      '..GGgwWWww......',
      '....wwwww.......',
      '.....y.y........',
      '....PPPPPp......',
      '....PPPPpp......',
      '.....PPpq.......',
      '.....PPpq.......',
      '.....PPpq.......',
      '.....PPpq.......',
      '.....PPpq.......',
      '.....PPpq.......',
      '.....Ppqq.......',
      '....pppqqq......',
      '................',
    ],
  },
  // An honesty box and fruit nobody is minding.
  stall: {
    outline: '#2a1a16',
    colors: {
      R: '#d84a4a', r: '#a83232', W: '#f4ece0', w: '#d8ccb8',
      P: '#8a6a44', p: '#6a4e30', T: '#b08850', t: '#8a6438', d: '#5a3e24',
      a: '#e05a3a', o: '#f0a030', g: '#7ab83a', y: '#f0d050', b: '#3a2a20',
    },
    rows: [
      '.RRWWRRWWRRWWRR.',
      'RRWWRRWWRRWWRRWW',
      'rrwwrrwwrrwwrrww',
      '.P............P.',
      '.P............P.',
      '.P............P.',
      '.P.aoa.ygy.ob.P.',
      '.PaaoaoyggyoobbP',
      'TTTTTTTTTTTTTTTT',
      'tttttttttttttttt',
      '.TdTTdTTdTTdTTd.',
      '.tdttdttdttdttd.',
      '.d............d.',
      '................',
    ],
  },
  // Coin-operated binoculars, pointed at the tower.
  viewer: {
    outline: '#161c22',
    colors: {
      B: '#4a8a8e', b: '#2e6266', c: '#1e4448', L: '#a8e0f0', l: '#6aa8c0',
      M: '#a0a8b0', m: '#6a7480', n: '#4a525c', y: '#e8c040',
    },
    rows: [
      '................',
      '...BBBBBBBB.....',
      '..LBBBBBBBBc....',
      '..lBByBBBbbc....',
      '..LBBBBBBbbc....',
      '...cccccccc.....',
      '......Mn........',
      '.....MMmn.......',
      '......Mn........',
      '......Mn........',
      '......Mn........',
      '......Mn........',
      '......Mn........',
      '......Mn........',
      '......Mn........',
      '.....MMmnn......',
      '....mmmmnnn.....',
      '................',
    ],
  },
}

/** The object's pixels as colours, row by row, on the full 16x24 canvas. */
export function objectPixels(kind: ObjectKind): (string | null)[] {
  const { rows, colors, outline } = OBJECTS[kind]
  const out: (string | null)[] = new Array(W * H).fill(null)
  const top = H - rows.length
  rows.forEach((row, r) => {
    for (let x = 0; x < W; x++) {
      const ch = row[x]
      if (ch === undefined || ch === '.') continue
      const color = colors[ch]
      if (!color) throw new Error(`unknown pixel "${ch}" in the ${kind} drawing`)
      out[(top + r) * W + x] = color
    }
  })
  // Close the silhouette, as the people are closed.
  const filled = out.slice()
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (filled[y * W + x]) continue
      const touches = [[0, -1], [0, 1], [-1, 0], [1, 0]].some(([dx, dy]) => {
        const nx = x + dx
        const ny = y + dy
        return nx >= 0 && ny >= 0 && nx < W && ny < H && filled[ny * W + nx] !== null
      })
      if (touches) out[y * W + x] = outline
    }
  }
  return out
}

const SCALE = 2
const cache = new Map<ObjectKind, Texture>()

export function objectTexture(kind: ObjectKind): Texture {
  const hit = cache.get(kind)
  if (hit) return hit
  const canvas = document.createElement('canvas')
  canvas.width = W * SCALE
  canvas.height = H * SCALE
  const ctx = canvas.getContext('2d')!
  const pixels = objectPixels(kind)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const color = pixels[y * W + x]
      if (!color) continue
      ctx.fillStyle = color
      ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE)
    }
  }
  const texture = Texture.from(canvas)
  texture.source.scaleMode = 'nearest'
  cache.set(kind, texture)
  return texture
}

export function isObjectKind(art: string): art is ObjectKind {
  return (OBJECT_KINDS as string[]).includes(art)
}

/**
 * The "!" that pops over somebody who has seen you — here, the man sent to
 * collect. A speech bubble rather than a caption: it says *he has noticed you*
 * without anybody having to read a word.
 */
const ALERT = [
  '.oooooooo.',
  'oWWWWWWWWo',
  'oWWWrrWWWo',
  'oWWWrrWWWo',
  'oWWWrrWWWo',
  'oWWWRRWWWo',
  'oWWWWWWWWo',
  'oWWWrrWWWo',
  'oWWWWWWWWo',
  '.oooWWoooo',
  '....oWo...',
  '.....o....',
]

let alertTexture: Texture | null = null

export function alertBubbleTexture(): Texture {
  if (alertTexture) return alertTexture
  const colors: Record<string, string> = { o: '#1e1a26', W: '#fbfbfd', r: '#d8343c', R: '#a82430' }
  const canvas = document.createElement('canvas')
  canvas.width = ALERT[0].length * SCALE
  canvas.height = ALERT.length * SCALE
  const ctx = canvas.getContext('2d')!
  ALERT.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = colors[row[x]]
      if (!color) continue
      ctx.fillStyle = color
      ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE)
    }
  })
  alertTexture = Texture.from(canvas)
  alertTexture.source.scaleMode = 'nearest'
  return alertTexture
}
