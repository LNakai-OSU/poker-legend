import { parseMap } from '../overworld/tileRenderer'
import { STAMP_BY_ID, KEEP, type PlacedStamp } from './stamps'

/**
 * The country round each town: where the errands are.
 *
 * Every town has one, off the side of its own stretch of road (the road a town's
 * bus comes in on is walkable only as far as the town's outskirts, and these are
 * the outskirts). Each is a small open map in the town's own ground, written as
 * a base terrain with rectangles painted over it and objects stamped on top, so
 * that a stamp's tiles and the grid cannot disagree.
 */

export const OUTSKIRTS_WIDTH = 28
export const OUTSKIRTS_HEIGHT = 14

type Paint = [char: string, col0: number, row0: number, col1: number, row1: number]

interface OutskirtsSpec {
  id: string
  /** The ground everywhere not painted. */
  base: string
  /** The columns the road above is joined to by, along the top edge. */
  gap: [number, number]
  paints?: Paint[]
  stamps: PlacedStamp[]
}

function build(spec: OutskirtsSpec) {
  const grid = Array.from({ length: OUTSKIRTS_HEIGHT }, (_, row) =>
    Array.from({ length: OUTSKIRTS_WIDTH }, (_, col) =>
      row === 0 || row === OUTSKIRTS_HEIGHT - 1 || col === 0 || col === OUTSKIRTS_WIDTH - 1 ? 'T' : spec.base,
    ),
  )
  for (const [char, c0, r0, c1, r1] of spec.paints ?? []) {
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) grid[r][c] = char
  }
  for (let c = spec.gap[0]; c <= spec.gap[1]; c++) grid[0][c] = spec.base
  for (const placed of spec.stamps) {
    STAMP_BY_ID[placed.stampId].tiles.split('\n').forEach((line, r) => {
      ;[...line].forEach((ch, c) => {
        if (ch !== KEEP) grid[placed.row + r][placed.col + c] = ch
      })
    })
  }
  return parseMap(grid.map((row) => row.join('')).join('\n'))
}

const SPECS: OutskirtsSpec[] = [
  // The Sand Dollar Motor Court, a pawn-and-bait trailer and a lot of dust.
  {
    id: 'sc-outskirts',
    base: ':',
    gap: [13, 15],
    paints: [['_', 13, 1, 15, 5], ['_', 3, 6, 24, 8]],
    stamps: [
      { stampId: 'motel-silvercreek', col: 3, row: 3 },
      { stampId: 'cottage-eastgate', col: 19, row: 3 },
      { stampId: 'saguaro', col: 24, row: 9 },
      { stampId: 'saguaro', col: 8, row: 10 },
      { stampId: 'rocks-red', col: 11, row: 11 },
      { stampId: 'rocks-red-2', col: 16, row: 10 },
      { stampId: 'barrel-cactus', col: 5, row: 11 },
      { stampId: 'tyre-stack', col: 21, row: 8 },
      { stampId: 'cottage-eastgate', col: 9, row: 3 },
      { stampId: 'tyre-stack', col: 12, row: 7 },
      { stampId: 'crates', col: 23, row: 7 },
    ],
  },
  // Muddy Bend: a houseboat on the bank, a bait stand, the old ferry deck over the brown water.
  {
    id: 'rb-outskirts',
    base: '"',
    gap: [14, 16],
    paints: [['_', 14, 1, 16, 6], ['~', 18, 4, 26, 12], ['B', 17, 6, 23, 7]],
    stamps: [
      { stampId: 'cottage-eastgate', col: 3, row: 3 },
      { stampId: 'cottage-eastgate', col: 9, row: 3 },
      { stampId: 'speedboat', col: 22, row: 9 },
      { stampId: 'tree-street', col: 2, row: 9 },
      { stampId: 'tree-street', col: 12, row: 10 },
      { stampId: 'tree-street', col: 6, row: 10 },
      { stampId: 'bush', col: 16, row: 12 },
    ],
  },
  // The Fish Pier: a quay of stone, a pawn trailer, a stall, and a light on a rock at the end of a jetty.
  {
    id: 'ch-outskirts',
    base: '+',
    gap: [9, 11],
    paints: [['~', 15, 1, 26, 12], [':', 22, 2, 26, 7], ['B', 15, 6, 21, 6]],
    stamps: [
      { stampId: 'cottage-eastgate', col: 3, row: 3 },
      { stampId: 'cottage-eastgate', col: 23, row: 3 },
      { stampId: 'crates', col: 11, row: 9 },
      { stampId: 'crates', col: 13, row: 9 },
      { stampId: 'bollard-mooring', col: 14, row: 4 },
      { stampId: 'bollard-mooring', col: 14, row: 9 },
      { stampId: 'lamp-quay', col: 8, row: 2 },
      { stampId: 'lamp-quay', col: 3, row: 9 },
    ],
  },
  // Lagoon Beach: a hut, a dock out into the still water, palms.
  {
    id: 'pc-outskirts',
    base: ':',
    gap: [22, 24],
    paints: [['~', 2, 8, 17, 12], ['B', 9, 8, 9, 10]],
    stamps: [
      { stampId: 'cottage-eastgate', col: 3, row: 2 },
      { stampId: 'palm-tall', col: 12, row: 3 },
      { stampId: 'palm-tall', col: 19, row: 2 },
      { stampId: 'palm-tall', col: 15, row: 6 },
      { stampId: 'palm-tall', col: 24, row: 8 },
      { stampId: 'bush-flowering', col: 8, row: 4 },
      { stampId: 'bush-flowering', col: 21, row: 11 },
      { stampId: 'crates', col: 12, row: 6 },
      { stampId: 'crates', col: 14, row: 7 },
      { stampId: 'speedboat', col: 3, row: 10 },
    ],
  },
  // The Boneyard: where the Strip's dead signs come to lie down, and a chapel that never closes.
  {
    id: 'nm-outskirts',
    base: ':',
    gap: [14, 16],
    paints: [['_', 14, 1, 16, 4]],
    stamps: [
      { stampId: 'cottage-eastgate', col: 3, row: 3 },
      { stampId: 'billboard-mesa', col: 19, row: 3 },
      { stampId: 'billboard-mesa', col: 10, row: 9 },
      { stampId: 'saguaro', col: 25, row: 5 },
      { stampId: 'rocks-red', col: 2, row: 11 },
      { stampId: 'rocks-red-2', col: 15, row: 11 },
      { stampId: 'barrel-cactus', col: 7, row: 11 },
      { stampId: 'tyre-stack', col: 13, row: 8 },
      { stampId: 'crates', col: 18, row: 11 },
      { stampId: 'tyre-stack', col: 22, row: 10 },
      { stampId: 'tyre-stack', col: 5, row: 9 },
      { stampId: 'rocks-red-2', col: 24, row: 3 },
      { stampId: 'crates', col: 22, row: 12 },
      { stampId: 'saguaro', col: 11, row: 6 },
    ],
  },
  // The Belvedere: marble terraces over the water, cypresses, a bench nobody walks to.
  {
    id: 'pl-outskirts',
    base: '+',
    gap: [10, 12],
    paints: [['"', 1, 1, 8, 5], ['~', 16, 7, 26, 12]],
    stamps: [
      { stampId: 'cypress-pot', col: 14, row: 3 },
      { stampId: 'cypress-pot', col: 7, row: 9 },
      { stampId: 'cypress-pot', col: 20, row: 3 },
      { stampId: 'bench-stone', col: 4, row: 5 },
      { stampId: 'hedge-3', col: 22, row: 4 },
      { stampId: 'lamp-gilded', col: 11, row: 8 },
      { stampId: 'lamp-gilded', col: 18, row: 5 },
      { stampId: 'planter-marble-2', col: 14, row: 11 },
      { stampId: 'planter-marble-2', col: 2, row: 10 },
      { stampId: 'bench-stone', col: 18, row: 2 },
    ],
  },
]

export const OUTSKIRTS = Object.fromEntries(
  SPECS.map((spec) => [spec.id, { map: build(spec), stamps: spec.stamps }]),
) as Record<string, { map: ReturnType<typeof parseMap>; stamps: PlacedStamp[] }>

/** The columns where each outskirts joins the road above it. */
export const OUTSKIRTS_GAPS = Object.fromEntries(SPECS.map((spec) => [spec.id, spec.gap])) as Record<
  string,
  [number, number]
>
