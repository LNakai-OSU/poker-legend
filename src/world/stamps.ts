import type { PoiAction } from './types'

/**
 * Things bigger than a tile.
 *
 * A poker table in the overworld was four `FFFF` furniture tiles and a house was
 * a block of `#` with a `D` punched in it. Everything in the world that should
 * be an *object* was a patch of texture, which is why every casino floor read as
 * the same room: there was nothing in the game that was a poker table, only
 * tiles that were not walkable.
 *
 * A stamp is a named object with a footprint, its own art, and what it should be
 * wired up to when you place it. Placing one does three things:
 *
 *  1. writes its tiles into the grid — so collision, pathing, the content tests
 *     and everything else that reads the grid keep working with no changes at
 *     all, and a map still means something without any art;
 *  2. records itself, so the renderer can draw one object across the footprint
 *     rather than a grid of repeated textures;
 *  3. offers its wiring — a house comes with its doorway, a poker table comes
 *     with the table it seats you at.
 */

/** Which tray a stamp appears in. */
export type StampCategory = 'building' | 'casino' | 'street' | 'interior'

/** What placing a stamp offers to connect up. */
export type StampWiring =
  /** A doorway. The editor asks which area it leads to. */
  | { kind: 'exit'; at: { col: number; row: number }; label: string }
  /** Something to walk up to and interact with. The editor asks which one. */
  | { kind: 'poi'; at: { col: number; row: number }; name: string; action: PoiAction['kind'] }

export interface StampDef {
  id: string
  name: string
  category: StampCategory
  /**
   * The tiles it lays down, in the same characters a map is written in, plus
   * `?` for "leave whatever is already here".
   *
   * This is what makes the footprint real: the walls of a house are `#` and are
   * unwalkable because they are walls, not because a stamp said so. And `?` is
   * what stops a poker table laying a square of indoor floor down on a road —
   * only the felt itself is the table; the space around it belongs to the room
   * it was put in.
   */
  tiles: string
  /** A sentence about what it is for, shown in the editor. */
  about: string
  wiring?: StampWiring
}

/** A stamp that has been put somewhere. */
export interface PlacedStamp {
  stampId: string
  col: number
  row: number
}

/** In a stamp's tiles, "whatever is already here". */
export const KEEP = '?'

/** The footprint of a stamp, in tiles. */
export function stampSize(stamp: StampDef): { cols: number; rows: number } {
  const rows = stamp.tiles.split('\n').filter((row) => row.length > 0)
  return { cols: Math.max(...rows.map((row) => row.length)), rows: rows.length }
}

/**
 * The footprint of a building: solid wall, with a doorway in the bottom row at
 * `door` (counted from the left) if it has one you can go through. A building
 * whose door stays shut has its door drawn by its art and no `D` at all, so
 * nobody can walk onto a doorway that leads nowhere.
 */
function walls(cols: number, rows: number, door?: number): string {
  const solid = '#'.repeat(cols)
  const front = door === undefined ? solid : solid.slice(0, door) + 'D' + solid.slice(door + 1)
  return [...Array(rows - 1).fill(solid), front].join('\n')
}

/** A building of the town, with or without a door that opens. */
function building(
  id: string,
  name: string,
  about: string,
  cols: number,
  rows: number,
  door?: { col: number; label: string },
): StampDef {
  return {
    id,
    name,
    category: 'building',
    about,
    tiles: walls(cols, rows, door?.col),
    wiring: door ? { kind: 'exit', at: { col: door.col, row: rows - 1 }, label: door.label } : undefined,
  }
}

/**
 * Every stamp you can place.
 *
 * Deliberately a short list of things this game actually contains. A library of
 * a hundred generic props would be a worse version of a tileset; these are the
 * objects a poker town is made of.
 */
export const STAMPS: StampDef[] = [
  {
    id: 'poker-table',
    name: 'Poker table',
    category: 'casino',
    about: 'An oval felt with seats round it. Walk up to the rail to sit down.',
    tiles: ['????', '?FF?', '????'].join('\n'),
    // Behind the table rather than on the felt, where a dealer stands.
    wiring: { kind: 'poi', at: { col: 2, row: 0 }, name: 'Dealer', action: 'table' },
  },
  {
    id: 'slot-bank',
    name: 'Slot bank',
    category: 'casino',
    about: 'A row of machines against a wall.',
    tiles: ['FFF', '???'].join('\n'),
    wiring: { kind: 'poi', at: { col: 1, row: 0 }, name: 'Slot Machines', action: 'slots' },
  },
  {
    id: 'craps-pit',
    name: 'Craps table',
    category: 'casino',
    about: 'The long table, with room to stand along both sides.',
    tiles: ['?????', '?FFF?', '?????'].join('\n'),
    wiring: { kind: 'poi', at: { col: 2, row: 0 }, name: 'Craps Table', action: 'craps' },
  },
  {
    id: 'bar',
    name: 'Bar',
    category: 'interior',
    about: 'A counter with bottles behind it.',
    tiles: ['FFFFF', '?????'].join('\n'),
  },
  {
    id: 'townhouse',
    name: 'Townhouse',
    category: 'building',
    about: 'A narrow house with its own front door.',
    tiles: ['#####', '#####', '#####', '##D##'].join('\n'),
    wiring: { kind: 'exit', at: { col: 2, row: 3 }, label: 'Door' },
  },
  {
    id: 'shopfront',
    name: 'Shopfront',
    category: 'building',
    about: 'A wider building with a window either side of the door.',
    tiles: ['######', '######', '######', '###D##'].join('\n'),
    wiring: { kind: 'exit', at: { col: 3, row: 3 }, label: 'Shop' },
  },
  // --- Basin ---------------------------------------------------------------
  building('bakery-basin', 'Bakery, flats over', 'Your building: the bakery downstairs and your door beside it.', 7, 4, { col: 4, label: 'Home' }),
  building('house-basin-a', 'Basin terrace house', 'Red brick under red shingle, a window box, a door that stays shut.', 5, 4),
  building('pawn-basin', 'Pawnbroker', 'Three gold balls and a grille over the window.', 5, 4),
  building('tenement-basin', 'Walk-up', 'Three floors, a fire escape and a water tank on the roof.', 5, 4),
  building('checks-basin', 'Checks Cashed', 'A yellow sign, barred windows, OPEN buzzing in the glass.', 6, 4),
  building('house-basin-b', 'Clapboard house', 'Pale blue boards, a slate roof with a dormer in it.', 5, 4),
  building('bingo-basin', 'Bingo hall', 'A long low hall with a marquee that never stops chasing.', 11, 4),
  building('patels', "Patel's", 'The corner shop: green awning, fruit out front, ice by the door.', 6, 4, { col: 3, label: "Patel's" }),
  building('barber-seventh', 'Barber', 'The pole turning, a chair in the window.', 5, 4),
  building('laundromat', 'Laundromat', 'A row of washers behind the glass and steam off the roof.', 6, 4, { col: 2, label: 'Laundromat' }),
  building('hotel-seventh', 'Cheap hotel', 'Its name down the corner in red neon.', 5, 4),
  building('diner-blueplate', 'The Blue Plate', 'A stainless diner with its name on the roof.', 7, 3, { col: 3, label: 'The Blue Plate' }),
  building('donuts-seventh', 'Doughnut shop', 'A giant doughnut on the roof.', 6, 3),
  building('garage-seventh', 'Auto repair', 'Two bays, tyres stacked by the office.', 9, 3),
  building('house-eastgate-a', 'Porch house', 'Cream boards, green shutters, a porch over the door.', 5, 4),
  building('house-marcus', "Marcus's house", 'Gable end to the street, porch light on, a note on the door.', 5, 4, { col: 2, label: "Marcus's" }),
  building('house-eastgate-b', 'Bay-window house', 'Yellow brick, a dish on the wall.', 5, 4),
  building('cottage-eastgate', 'Cottage', 'More roof than house.', 4, 3),
  building('lockup-eastgate', 'Lock-up garages', 'Two roll-up doors, one of them tagged.', 4, 3),
  // --- Silver Creek ----------------------------------------------------------
  building('casino-silvercreek', 'Silver Creek Casino', 'A Western false front, its name in lights, a red carpet down to the forecourt.', 13, 5, { col: 6, label: 'Casino' }),
  building('hotel-silvercreek-w', 'Hotel wing', 'Pueblo adobe with a shaded portal; the hotel side.', 7, 4),
  building('hotel-silvercreek-e', 'Buffet wing', 'Pueblo adobe with a shaded portal; the buffet side.', 7, 4),
  building('giftshop-silvercreek', 'Trading post', 'GIFTS on a timber false front, a porch, a cactus in a pot.', 5, 3, { col: 2, label: 'Gift Shop' }),
  building('motel-silvercreek', 'Motel office', 'A tall sign buzzing VACANCY.', 5, 3),
  // --- Riverbend -------------------------------------------------------------
  {
    id: 'riverboat',
    name: 'Riverboat',
    category: 'building',
    about: 'A stern-wheeler moored at the quay, its gangway down to the boards. Put it on the water.',
    tiles: ['??????##????', '??#######???', '?#########??', '?#########??', '???????D????'].join('\n'),
    wiring: { kind: 'exit', at: { col: 7, row: 4 }, label: 'Riverboat' },
  },
  building('diner-riverbend', 'The Landing Diner', 'Blue clapboard, a tin porch, EAT pointing at the door.', 6, 3, { col: 2, label: 'Diner' }),
  building('outfitters-riverbend', 'Dockside Outfitters', 'Barn-red boards, canoes on end against the wall.', 6, 3, { col: 3, label: 'Outfitters' }),
  // --- Crescent Harbor -------------------------------------------------------
  building('club-harbor', 'The Harbour Room', 'Oxblood brick, brass lamps, black railings and no name on the door.', 5, 5, { col: 2, label: 'The Harbour Room' }),
  building('supper-harbor', 'Supper club', 'Art deco limestone with a blade sign and a marquee in bulbs.', 5, 5, { col: 2, label: 'Supper Club' }),
  building('cardroom-harbor', 'Harbor Card Room', 'Stone, a mansard of dormers, a portico with its name on the frieze.', 7, 5, { col: 3, label: 'Card Room' }),
  building('menswear-harbor', 'Tailor', 'A narrow green shopfront with two suits in the window.', 5, 5, { col: 2, label: 'Menswear' }),
  building('autorow-harbor', 'Auto Row', 'A sawtooth showroom with cars behind the glass.', 8, 5, { col: 2, label: 'Auto Row' }),
  // --- Palm Cay --------------------------------------------------------------
  building('marina-palmcay', 'Marina Motors', 'A white boathouse with a speedboat in the bay.', 6, 4, { col: 3, label: 'Marina Motors' }),
  building('casino-palmcay', 'The Cay Room', 'Pink render, a Mission gable, an arcade, torches at the door.', 9, 5, { col: 4, label: 'Cay Room' }),
  building('hotel-palmcay', 'Resort hotel', 'Lemon render and striped balcony awnings.', 8, 4),
  building('boutique-palmcay', 'Cay Boutique', 'Mint render and a sun hat in the window.', 5, 3, { col: 2, label: 'Boutique' }),
  building('grill-palmcay', 'Shoreline Grill', 'A thatched shack with a surfboard for a sign.', 5, 3, { col: 2, label: 'Shoreline Grill' }),
  // --- Neon Mesa -------------------------------------------------------------
  building('casino-mesa', 'Mesa Casino', 'MESA in pink neon the width of the building, a marquee, a red carpet.', 11, 6, { col: 5, label: 'Mesa Casino' }),
  building('luxury-mesa', 'Mesa Luxury', 'Black glass ruled in gold, a watch spot-lit in the window.', 5, 6, { col: 2, label: 'Mesa Luxury' }),
  building('motors-mesa', 'Mesa Motors', 'Parking decks over a showroom with a car on a turntable.', 7, 6, { col: 3, label: 'Mesa Motors' }),
  building('club-mesa', 'Ultraviolet', 'Black, UV neon, searchlights, a rope to queue behind.', 7, 6, { col: 3, label: 'Ultraviolet' }),
  building('tower-mesa-a', 'Aria tower', 'A hotel tower across the Strip, helipad on the roof.', 10, 4),
  building('garage-mesa', 'Parking garage', 'Decks of cars under a WIN BIG billboard.', 10, 4),
  building('tower-mesa-b', 'Desert Rose tower', 'A rose-gold tower across the Strip.', 10, 4),
  // --- Porto Lumina ----------------------------------------------------------
  building('tower-lumina', 'Penthouse tower', 'Marble and glass, a lit crown, the lift lobby at its foot.', 6, 6, { col: 2, label: 'Penthouse Lift' }),
  building('casino-lumina', 'Casino Lumina', 'A verdigris dome, six columns, marble steps to the water.', 11, 6, { col: 5, label: 'Casino' }),
  building('atelier-lumina', 'Lumina Atelier', 'A mansard, iron balconies, ATELIER in gold on black lacquer.', 7, 6, { col: 3, label: 'Atelier' }),
  building('hotel-lumina', 'Grand Hotel', 'An arcade of arches the length of the block.', 26, 3),
  {
    id: 'bus-shelter',
    name: 'Bus shelter',
    category: 'street',
    about: 'Somewhere to wait, with the route pasted inside.',
    tiles: ['###', '???'].join('\n'),
  },
  {
    id: 'fountain',
    name: 'Fountain',
    category: 'street',
    about: 'A basin you can walk all the way round.',
    tiles: ['+++', '+~+', '+++'].join('\n'),
  },
  {
    id: 'parked-car',
    name: 'Parked car',
    category: 'street',
    about: 'At the kerb, facing down the street.',
    tiles: ['F', 'F'].join('\n'),
  },
  {
    id: 'planter',
    name: 'Planter',
    category: 'street',
    about: 'A raised bed, for breaking up a long pavement.',
    tiles: ['**', '**'].join('\n'),
  },
]

export const STAMP_BY_ID: Record<string, StampDef> = Object.fromEntries(
  STAMPS.map((stamp) => [stamp.id, stamp]),
)

export function findStamp(id: string): StampDef | undefined {
  return STAMP_BY_ID[id]
}
