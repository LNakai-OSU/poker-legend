import { describe, expect, it } from 'vitest'
import { APRON } from './pixel/tableArt'
import {
  SEAT,
  feltMinHeight,
  layoutFelt,
  layoutScene,
  overlaps,
  type Rect,
  type SceneNeeds,
} from './tableLayout'

const CASH: SceneNeeds = {
  kind: 'cash',
  opponents: 5,
  sampleAmount: '12,345',
  infoTexts: [],
  title: 'Riverboat 2/5 · $2/$5',
  subtitle: 'Wallet: $250,000',
}

function describeRect(name: string, r: Rect) {
  return `${name} x:${r.x}-${r.x + r.w} y:${r.y}-${r.y + r.h}`
}

/** Every pair of blocks on the felt that must not touch, named for the failure message. */
function clashes(w: number, h: number, count: number): string[] {
  const t = layoutFelt(w, h, count)
  const blocks: [string, Rect][] = [
    ...t.seats.map((s, i): [string, Rect] => [`seat ${i}`, s]),
    ['band', t.band],
    ['board', t.board],
    ['hero', t.hero],
    ['hero cards', t.heroCards],
  ]
  const problems: string[] = []
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const [an, a] = blocks[i]
      const [bn, b] = blocks[j]
      if (overlaps(a, b)) problems.push(`${describeRect(an, a)} overlaps ${describeRect(bn, b)}`)
    }
    const [name, r] = blocks[i]
    if (r.x < 0 || r.x + r.w > w || r.y < 0 || r.y + r.h > t.h - APRON) {
      problems.push(`${describeRect(name, r)} is off a ${w}x${t.h} table`)
    }
  }
  return problems
}

describe('the table layout', () => {
  it('never lets anything touch the board, the pot or anybody else', () => {
    for (let count = 1; count <= 5; count++) {
      for (let w = 236; w <= 440; w += 6) {
        const min = feltMinHeight(w, count)
        for (let h = min; h <= min + 90; h += 10) {
          expect(clashes(w, h, count), `${count} opponents on ${w}x${h}`).toEqual([])
        }
      }
    }
  })

  it('gives every seat the same fixed width', () => {
    for (let count = 1; count <= 5; count++) {
      const t = layoutFelt(400, 300, count)
      expect(new Set(t.seats.map((s) => s.w))).toEqual(new Set([SEAT.w]))
      expect(t.hero.w).toBe(SEAT.w)
      expect(t.seats).toHaveLength(count)
    }
  })

  it('puts your cards below the board, not on it', () => {
    for (let count = 1; count <= 5; count++) {
      for (const w of [242, 284, 440]) {
        const t = layoutFelt(w, feltMinHeight(w, count), count)
        expect(t.heroCards.y).toBeGreaterThanOrEqual(t.board.y + t.board.h)
        expect(t.hero.y).toBeGreaterThanOrEqual(t.board.y + t.board.h)
      }
    }
  })
})

describe('the scene at a given window', () => {
  const windows: [string, number, number, number, boolean][] = [
    ['laptop', 1100, 800, 1, false],
    ['short laptop', 1366, 500, 1, false],
    ['small laptop', 1024, 560, 1, false],
    ['wide short', 1280, 620, 1, false],
    ['retina', 1440, 820, 2, false],
    ['iPhone 13', 390, 844, 3, true],
    ['iPhone 13 in Safari', 390, 664, 3, true],
    ['iPhone SE', 375, 667, 2, true],
    ['small Android', 360, 640, 3, true],
  ]

  it('fits every window it is tested at, with whole device pixels per art pixel', () => {
    for (const [name, w, h, dpr, coarse] of windows) {
      for (let opponents = 1; opponents <= 5; opponents++) {
        const scene = layoutScene(
          { w, h, dpr, coarse },
          { ...CASH, opponents, infoTexts: ['Calling 1,234 into 12,345 — you need 33% to break even'] },
        )
        const device = scene.scale * dpr
        expect(Math.abs(device - Math.round(device)), `${name}: ${scene.scale}`).toBeLessThan(1e-9)
        expect(scene.h * scene.scale, `${name} with ${opponents} opponents`).toBeLessThanOrEqual(h)
        expect(scene.felt.x + scene.felt.w).toBeLessThanOrEqual(scene.w)
        if (scene.side) expect(scene.dock.x).toBeGreaterThanOrEqual(scene.felt.x + scene.felt.w)
        else expect(scene.dock.y).toBeGreaterThanOrEqual(scene.felt.y + scene.felt.h)
      }
    }
  })

  it('draws a laptop at two pixels to the art pixel and a phone at four device pixels', () => {
    expect(layoutScene({ w: 1100, h: 800, dpr: 1, coarse: false }, CASH).scale).toBe(2)
    expect(layoutScene({ w: 390, h: 844, dpr: 3, coarse: true }, CASH).scale).toBeCloseTo(4 / 3)
  })
})
