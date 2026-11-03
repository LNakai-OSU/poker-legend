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
      { stampId: 'cottage-eastgate', col: 9, row: 3 },
      { stampId: 'cottage-eastgate', col: 19, row: 3 },
      // The court: a lamp by the office, a guest's car at the door, the yard's leftovers.
      { stampId: 'lamp-western', col: 8, row: 4 },
      { stampId: 'parked-car-blue-e', col: 6, row: 8 },
      { stampId: 'tumbleweed', col: 4, row: 7 },
      { stampId: 'tyre-stack', col: 12, row: 7 },
      { stampId: 'tumbleweed', col: 18, row: 7 },
      { stampId: 'tyre-stack', col: 21, row: 8 },
      { stampId: 'crates', col: 23, row: 7 },
      // Fat Nico's car up by the road, boot open; Loretta's bed of marigolds by her door.
      { stampId: 'parked-car-yellow-w', col: 16, row: 3 },
      { stampId: 'flowerbed-adobe-2', col: 23, row: 5 },
      // The hitcher's bench at the roadside.
      { stampId: 'bench-rustic', col: 23, row: 2 },
      { stampId: 'saguaro', col: 2, row: 1 },
      { stampId: 'rocks-red', col: 10, row: 1 },
      // The errands: the phone with its cord cut, the notice board, the woodpile.
      { stampId: 'phone-box', col: 3, row: 8 },
      { stampId: 'noticeboard', col: 11, row: 9 },
      { stampId: 'woodpile', col: 14, row: 10 },
      // The trucker's rig, as far as it got: a tyre and his tools.
      { stampId: 'tyre-stack', col: 5, row: 12 },
      { stampId: 'tool-chest', col: 7, row: 12 },
      // The wash: cacti, red rock, brush.
      { stampId: 'barrel-cactus', col: 5, row: 11 },
      { stampId: 'saguaro', col: 8, row: 10 },
      { stampId: 'tumbleweed', col: 9, row: 12 },
      { stampId: 'rocks-red', col: 11, row: 11 },
      { stampId: 'rocks-red-2', col: 16, row: 10 },
      { stampId: 'rocks-red-2', col: 1, row: 12 },
      { stampId: 'saguaro', col: 20, row: 11 },
      { stampId: 'barrel-cactus', col: 22, row: 11 },
      { stampId: 'tumbleweed', col: 21, row: 12 },
      { stampId: 'saguaro', col: 24, row: 9 },
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
      { stampId: 'flowerbed-timber-2', col: 7, row: 4 },
      { stampId: 'tree-street', col: 1, row: 1 },
      { stampId: 'bush', col: 5, row: 1 },
      { stampId: 'bush-flowering', col: 8, row: 1 },
      // The road end: the pay phone on its post, Wick's tree.
      { stampId: 'phone-box', col: 20, row: 1 },
      { stampId: 'tree-street', col: 26, row: 2 },
      // The old ferry deck: a gas lamp at the landing, bollards at the far end.
      { stampId: 'lamp-quay', col: 17, row: 4 },
      { stampId: 'bollard-mooring', col: 23, row: 6 },
      { stampId: 'bollard-mooring', col: 23, row: 7 },
      { stampId: 'speedboat', col: 22, row: 9 },
      // The bait stand: the board, the drying rack, a box of tackle.
      { stampId: 'noticeboard', col: 10, row: 9 },
      { stampId: 'fish-rack', col: 12, row: 9 },
      { stampId: 'crates', col: 13, row: 10 },
      // The bank: reeds, trees, a picket fence round nothing in particular.
      { stampId: 'reeds', col: 17, row: 9 },
      { stampId: 'reeds', col: 17, row: 11 },
      { stampId: 'tree-street', col: 2, row: 9 },
      { stampId: 'tree-street', col: 6, row: 10 },
      { stampId: 'tree-street', col: 12, row: 10 },
      { stampId: 'bush', col: 14, row: 12 },
      { stampId: 'fence-picket-4', col: 1, row: 12 },
    ],
  },
  // The Fish Pier: a quay of stone, a pawn trailer, a stall, and a light on a rock at the end of a jetty.
  {
    id: 'ch-outskirts',
    base: '+',
    gap: [9, 11],
    // The jetty is two planks wide, so whoever stands at the end of it is not standing in the only way out to the light.
    paints: [['~', 15, 1, 26, 12], [':', 22, 2, 26, 7], ['B', 15, 6, 21, 7]],
    stamps: [
      { stampId: 'cottage-eastgate', col: 3, row: 3 },
      { stampId: 'cottage-eastgate', col: 23, row: 3 },
      // The pawn trailer's yard.
      { stampId: 'crates', col: 2, row: 6 },
      { stampId: 'tyre-stack', col: 1, row: 7 },
      // The quay: lamps, a teak bench, the salt-rusted phone.
      { stampId: 'lamp-quay', col: 8, row: 2 },
      { stampId: 'lamp-harbor', col: 11, row: 3 },
      { stampId: 'phone-box', col: 13, row: 2 },
      { stampId: 'bench-teak', col: 9, row: 5 },
      { stampId: 'bollard-mooring', col: 14, row: 4 },
      { stampId: 'bollard-mooring', col: 15, row: 7 },
      { stampId: 'bollard-mooring', col: 21, row: 7 },
      // The fish stall and the menders.
      { stampId: 'crates', col: 11, row: 9 },
      { stampId: 'crates', col: 13, row: 9 },
      { stampId: 'bollard-mooring', col: 14, row: 9 },
      { stampId: 'net-heap', col: 6, row: 9 },
      { stampId: 'noticeboard', col: 8, row: 10 },
      { stampId: 'net-heap', col: 1, row: 10 },
      { stampId: 'lamp-quay', col: 3, row: 9 },
      { stampId: 'lamp-harbor', col: 14, row: 10 },
    ],
  },
  // Lagoon Beach: a hut, a dock out into the still water, palms.
  {
    id: 'pc-outskirts',
    base: ':',
    gap: [22, 24],
    // The lagoon and its jetty, a boardwalk down off the road, and a tide pool
    // left in the sand.
    paints: [['~', 2, 8, 17, 12], ['B', 9, 8, 9, 10], ['B', 23, 1, 23, 4], ['~', 24, 12, 25, 12]],
    stamps: [
      { stampId: 'cottage-eastgate', col: 3, row: 2 },
      { stampId: 'flowerbed-coral-2', col: 9, row: 2 },
      { stampId: 'bush-flowering', col: 8, row: 4 },
      // The board and the phone hut, up by the road.
      { stampId: 'noticeboard', col: 14, row: 2 },
      { stampId: 'phone-box', col: 22, row: 1 },
      { stampId: 'lamp-tiki', col: 26, row: 1 },
      { stampId: 'palm-tall', col: 12, row: 3 },
      { stampId: 'palm-tall', col: 19, row: 2 },
      { stampId: 'bush-flowering', col: 25, row: 5 },
      // The dock: a bench to wait on, a bollard, the boxes off the boat.
      { stampId: 'bench-stone', col: 9, row: 6 },
      { stampId: 'bollard-mooring', col: 8, row: 7 },
      { stampId: 'crates', col: 12, row: 6 },
      { stampId: 'crates', col: 14, row: 7 },
      { stampId: 'palm-tall', col: 15, row: 6 },
      { stampId: 'speedboat', col: 3, row: 10 },
      // The traps, under tiki torches along the sand.
      { stampId: 'crab-traps', col: 16, row: 6 },
      { stampId: 'lamp-tiki', col: 18, row: 6 },
      { stampId: 'lamp-tiki', col: 19, row: 8 },
      { stampId: 'palm-tall', col: 24, row: 8 },
      { stampId: 'palm-tall', col: 18, row: 10 },
      { stampId: 'palm-tall', col: 26, row: 10 },
      { stampId: 'bush-flowering', col: 21, row: 11 },
      { stampId: 'crab-traps', col: 18, row: 12 },
      { stampId: 'net-heap', col: 19, row: 12 },
      { stampId: 'crates', col: 22, row: 12 },
      // Brenda's palm at the water, the little shrine by it, a rock off the point.
      { stampId: 'palm-tall', col: 6, row: 6 },
      { stampId: 'shrine', col: 3, row: 7 },
      { stampId: 'rocks-red', col: 26, row: 8 },
      // Reeds where the lagoon meets the sand.
      { stampId: 'reeds', col: 18, row: 8 },
      { stampId: 'reeds', col: 1, row: 12 },
    ],
  },
  // The Boneyard: where the Strip's dead signs come to lie down, and a chapel that never closes.
  {
    id: 'nm-outskirts',
    base: ':',
    gap: [14, 16],
    // The track down off the road, and the path worn across the yard from the
    // chapel to the bench under the lamp.
    paints: [['_', 14, 1, 16, 4], ['_', 15, 5, 15, 7], ['_', 4, 7, 24, 7], ['_', 10, 8, 10, 8]],
    stamps: [
      // The chapel, its fan palm, and the arch you get married under.
      { stampId: 'cottage-eastgate', col: 3, row: 3 },
      { stampId: 'palm-planter', col: 2, row: 5 },
      { stampId: 'chapel-arch', col: 8, row: 5 },
      { stampId: 'noticeboard', col: 12, row: 5 },
      { stampId: 'saguaro', col: 11, row: 3 },
      // Dee's sign, the one billboard still standing, and the car somebody parked under it.
      { stampId: 'billboard-mesa', col: 19, row: 3 },
      { stampId: 'parked-car-white-e', col: 19, row: 5 },
      { stampId: 'rocks-red-2', col: 24, row: 3 },
      { stampId: 'saguaro', col: 25, row: 5 },
      { stampId: 'dead-letter', col: 16, row: 8 },
      // The bench under the buzzing lamp.
      { stampId: 'bench-chrome', col: 20, row: 8 },
      { stampId: 'lamp-chrome', col: 22, row: 7 },
      // The boneyard proper: letters off dead casinos, lying where they were dropped.
      { stampId: 'dead-letter', col: 10, row: 9 },
      { stampId: 'dead-letter', col: 9, row: 10 },
      { stampId: 'dead-letter', col: 11, row: 10 },
      { stampId: 'tyre-stack', col: 13, row: 8 },
      { stampId: 'tyre-stack', col: 5, row: 9 },
      { stampId: 'scrap-heap', col: 12, row: 12 },
      { stampId: 'rocks-red-2', col: 15, row: 11 },
      { stampId: 'crates', col: 18, row: 11 },
      { stampId: 'tyre-stack', col: 22, row: 10 },
      { stampId: 'crates', col: 22, row: 12 },
      { stampId: 'dead-letter', col: 26, row: 10 },
      // The pay phone in the pink light, and the desert round it all.
      { stampId: 'phone-box', col: 3, row: 11 },
      { stampId: 'rocks-red', col: 2, row: 11 },
      { stampId: 'barrel-cactus', col: 7, row: 11 },
      { stampId: 'tumbleweed', col: 8, row: 12 },
      { stampId: 'tumbleweed', col: 14, row: 6 },
      { stampId: 'tumbleweed', col: 25, row: 8 },
      { stampId: 'tumbleweed', col: 19, row: 12 },
      { stampId: 'barrel-cactus', col: 26, row: 12 },
      { stampId: 'rocks-red', col: 26, row: 1 },
      // Lights either side of the track, so the way back to the road shows at night.
      { stampId: 'lamp-chrome', col: 13, row: 1 },
      { stampId: 'lamp-chrome', col: 17, row: 1 },
      // A candle for somebody by the chapel; more red rock.
      { stampId: 'shrine', col: 7, row: 4 },
      { stampId: 'rocks-red-2', col: 2, row: 9 },
      { stampId: 'rocks-red', col: 8, row: 2 },
    ],
  },
  // The Belvedere: marble terraces over the water, cypresses, a bench nobody walks to.
  {
    id: 'pl-outskirts',
    base: '+',
    gap: [10, 12],
    // The garden, the water, a lawn on the lower terrace and a bed of flowers by it.
    paints: [['"', 1, 1, 8, 5], ['~', 16, 7, 26, 12], ['"', 1, 8, 3, 9], ['*', 5, 10, 6, 10]],
    stamps: [
      // Cypresses either side of the stair down from the road.
      { stampId: 'cypress-pot', col: 9, row: 1 },
      { stampId: 'cypress-pot', col: 13, row: 1 },
      // The garden: a clipped hedge, a bed of blue and white, the brass phone.
      { stampId: 'hedge-3', col: 4, row: 1 },
      { stampId: 'bush-flowering', col: 7, row: 2 },
      { stampId: 'phone-box', col: 2, row: 2 },
      { stampId: 'flowerbed-granite-2', col: 4, row: 3 },
      { stampId: 'bench-stone', col: 5, row: 5 },
      { stampId: 'lamp-gilded', col: 7, row: 5 },
      // The upper terrace: the notice, the bench nobody walks to, the hedge with a dog in it.
      { stampId: 'cypress-pot', col: 14, row: 3 },
      { stampId: 'noticeboard', col: 16, row: 3 },
      { stampId: 'bench-stone', col: 18, row: 2 },
      { stampId: 'cypress-pot', col: 20, row: 3 },
      { stampId: 'lamp-gilded', col: 19, row: 4 },
      { stampId: 'hedge-3', col: 22, row: 4 },
      { stampId: 'hedge-3', col: 22, row: 5 },
      // The lower terrace over the water: the lamp waiting for its lighter, the planters to be moved.
      { stampId: 'lamp-gilded', col: 12, row: 7 },
      { stampId: 'cypress-pot', col: 15, row: 6 },
      { stampId: 'planter-marble-2', col: 14, row: 9 },
      { stampId: 'cypress-pot', col: 7, row: 9 },
      { stampId: 'lamp-gilded', col: 15, row: 10 },
      { stampId: 'planter-marble-2', col: 2, row: 10 },
      { stampId: 'cypress-pot', col: 1, row: 11 },
      { stampId: 'bench-stone', col: 4, row: 12 },
      { stampId: 'planter-marble-2', col: 10, row: 12 },
      { stampId: 'flowerbed-granite-2', col: 12, row: 12 },
      // Lamps at the head of the stair, so the way back up shows after dark.
      { stampId: 'lamp-gilded', col: 8, row: 1 },
      { stampId: 'lamp-gilded', col: 14, row: 1 },
      // A shrine at the end of the lawn, a candle always lit in it.
      { stampId: 'shrine', col: 1, row: 7 },
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
