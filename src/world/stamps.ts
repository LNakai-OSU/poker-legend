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
