/**
 * Pure tile data with no rendering dependencies, so both the renderer and the
 * sprite generator can import it without forming a cycle.
 */

export const TILE_SIZE = 32

/** See TILE_VOCABULARY for what each id means and WALKABLE for what you can stand on. */
export type TileGrid = number[][]

export const FLOOR = 0
export const WALL = 1
export const FURNITURE = 2
/** Casino carpet: dusty red-brown diamonds, the reservation's own. */
export const CARPET = 3
export const WATER = 4
export const ROAD = 5
export const SIDEWALK = 6
export const GRASS = 7
export const DOOR = 8
/** Solid greenery: the natural wall an open outdoor map is bounded with. */
export const TREE = 9
/** Walkable, for beaches, lots and desert verges. */
export const SAND = 10
/** Walkable decoration — flower beds and planting along a path. */
export const FLOWER = 11
/** A paved plaza or forecourt, lighter than a pavement. */
export const PLAZA = 12
/** Solid: fountains, planters, barriers, the base of a sign. */
export const PROP = 13

// --- inside a building -------------------------------------------------------
//
// A room used to be the street turned inside out: exterior brick for walls and
// one speckled floor for every room in the game, so a laundromat, a riverboat
// and a marble casino were the same dark box. A room is now a wall seen from
// above (the dark band round the edge), a back wall seen from the front (the
// face you would hang a picture on), and a floor that says what kind of place
// you are standing in.

/** The top of a wall seen from above: the dark band an interior is framed by. */
export const WALL_TOP = 14
/** Back-wall faces. Each is one material, so two rooms can never be one room in two colours. */
export const PAPER_STRIPE = 15
export const PANEL_WOOD = 16
export const PAPER_DAMASK = 17
export const WALL_TILED = 18
export const WALL_BAMBOO = 19
export const WALL_NEON = 20
export const WALL_MARBLE = 21
export const WALL_CABIN = 22
export const WALL_BAIZE = 23
export const WALL_PAINT = 24
/** Floors. */
export const WOOD_FLOOR = 25
export const CHECKER = 26
export const TILE_FLOOR = 27
export const MARBLE = 28
export const DECK = 29
export const LINO = 30
/** Carpets, one per kind of room that would lay one. */
export const CARPET_GREEN = 31
export const CARPET_TEAL = 32
export const CARPET_NEON = 33
export const CARPET_ROYAL = 34
export const CARPET_VIOLET = 35

const WALKABLE = new Set([
  FLOOR, CARPET, ROAD, SIDEWALK, GRASS, DOOR, SAND, FLOWER, PLAZA,
  WOOD_FLOOR, CHECKER, TILE_FLOOR, MARBLE, DECK, LINO,
  CARPET_GREEN, CARPET_TEAL, CARPET_NEON, CARPET_ROYAL, CARPET_VIOLET,
])

/** The faces of back walls: solid, drawn front-on, with a floor in front of them. */
export const WALL_FACES = new Set([
  PAPER_STRIPE, PANEL_WOOD, PAPER_DAMASK, WALL_TILED, WALL_BAMBOO,
  WALL_NEON, WALL_MARBLE, WALL_CABIN, WALL_BAIZE, WALL_PAINT,
])

/** Floors that are laid as a carpet, and so get a border where they stop. */
export const CARPETS = new Set([CARPET, CARPET_GREEN, CARPET_TEAL, CARPET_NEON, CARPET_ROYAL, CARPET_VIOLET])

/**
 * Every tile, with the character that writes it and a name to show a person.
 *
 * One table, so the parser, the editor's palette and anything else that has to
 * name a tile all read the same list — a tile that exists in one of those and
 * not the others is exactly the kind of gap nobody notices until a map will not
 * load. `?` is never a tile: in a stamp it means "leave what is here".
 */
export const TILE_VOCABULARY: Array<{ tile: number; char: string; name: string }> = [
  { tile: FLOOR, char: '.', name: 'Floor' },
  { tile: WALL, char: '#', name: 'Wall' },
  { tile: FURNITURE, char: 'F', name: 'Furniture' },
  { tile: CARPET, char: ',', name: 'Carpet' },
  { tile: WATER, char: '~', name: 'Water' },
  { tile: ROAD, char: '=', name: 'Road' },
  { tile: SIDEWALK, char: '-', name: 'Pavement' },
  { tile: GRASS, char: '"', name: 'Grass' },
  { tile: DOOR, char: 'D', name: 'Door' },
  { tile: TREE, char: 'T', name: 'Tree' },
  { tile: SAND, char: ':', name: 'Sand' },
  { tile: FLOWER, char: '*', name: 'Flowers' },
  { tile: PLAZA, char: '+', name: 'Plaza' },
  { tile: PROP, char: 'o', name: 'Prop' },
  { tile: WALL_TOP, char: '^', name: 'Wall top' },
  { tile: PAPER_STRIPE, char: 'h', name: 'Striped paper' },
  { tile: PANEL_WOOD, char: 'w', name: 'Wood panelling' },
  { tile: PAPER_DAMASK, char: 'd', name: 'Damask' },
  { tile: WALL_TILED, char: 't', name: 'Tiled wall' },
  { tile: WALL_BAMBOO, char: 'b', name: 'Bamboo wall' },
  { tile: WALL_NEON, char: 'n', name: 'Neon wall' },
  { tile: WALL_MARBLE, char: 'm', name: 'Marble wall' },
  { tile: WALL_CABIN, char: 's', name: 'Cabin wall' },
  { tile: WALL_BAIZE, char: 'g', name: 'Baize and panel' },
  { tile: WALL_PAINT, char: 'p', name: 'Painted wall' },
  { tile: WOOD_FLOOR, char: 'W', name: 'Wood floor' },
  { tile: CHECKER, char: 'K', name: 'Checkerboard' },
  { tile: TILE_FLOOR, char: 'Q', name: 'Tiled floor' },
  { tile: MARBLE, char: 'M', name: 'Marble floor' },
  { tile: DECK, char: 'B', name: 'Deck boards' },
  { tile: LINO, char: 'L', name: 'Shop floor' },
  { tile: CARPET_GREEN, char: ';', name: 'Green carpet' },
  { tile: CARPET_TEAL, char: "'", name: 'Teal carpet' },
  { tile: CARPET_NEON, char: '!', name: 'Neon carpet' },
  { tile: CARPET_ROYAL, char: '&', name: 'Royal carpet' },
  { tile: CARPET_VIOLET, char: '%', name: 'Violet carpet' },
]

/** The character that writes each tile, for turning a grid back into a sketch. */
export const CHAR_FOR_TILE: Record<number, string> = Object.fromEntries(
  TILE_VOCABULARY.map(({ tile, char }) => [tile, char]),
)

/**
 * The tile each character writes.
 *
 * Derived from the vocabulary rather than written out again, because two lists
 * that have to agree are two lists that eventually will not.
 */
const TILE_CHARS: Record<string, number> = Object.fromEntries(
  TILE_VOCABULARY.map(({ tile, char }) => [char, tile]),
)

export function isTileWalkable(tile: number): boolean {
  return WALKABLE.has(tile)
}

/**
 * Turns a grid back into the sketch that would parse to it.
 *
 * The exact inverse of `parseMap`, so a map taken into the editor and brought
 * back out again is the same map.
 */
export function toSketch(grid: TileGrid): string {
  return grid.map((row) => row.map((tile) => CHAR_FOR_TILE[tile] ?? '#').join('')).join('\n')
}

/**
 * Builds a grid from an ASCII sketch so city layouts stay readable in source.
 * Every row has to be the same width.
 */
export function parseMap(sketch: string): TileGrid {
  const lines = sketch.split('\n').filter((line) => line.trim().length > 0)
  const width = Math.max(...lines.map((line) => line.length))
  // Short rows used to be padded with wall, which silently turned a miscounted
  // row into a map with a hole in the side of it — and on maps this size, a row
  // off by one character is very easy to write and impossible to spot by eye.
  const ragged = lines.findIndex((line) => line.length !== width)
  if (ragged !== -1) {
    throw new Error(
      `map row ${ragged} is ${lines[ragged].length} wide, expected ${width}: ${JSON.stringify(lines[ragged])}`,
    )
  }
  return lines.map((line) =>
    Array.from({ length: width }, (_, col) => {
      const char = line[col]
      const tile = TILE_CHARS[char]
      if (tile === undefined) throw new Error(`unknown map character: ${JSON.stringify(char)}`)
      return tile
    }),
  )
}

export function isWalkable(grid: TileGrid, col: number, row: number): boolean {
  if (row < 0 || row >= grid.length || col < 0 || col >= grid[row].length) return false
  return WALKABLE.has(grid[row][col])
}
