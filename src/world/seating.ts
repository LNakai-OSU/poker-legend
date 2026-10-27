import { DOOR, isWalkable } from '../overworld/tiles'
import { CHARACTERS, type CharacterDef } from './characters'
import { TABLES } from './content'
import { STAMP_BY_ID, seatTile, stampSize, type PlacedStamp, type SeatFacing } from './stamps'
import type { AreaDef, TableDef } from './types'

/**
 * Who is sitting at the tables.
 *
 * A casino floor was a room of empty chairs with a dealer standing at the head
 * of each table, waiting. Now every table with chairs has players at it — never
 * nobody, and never a full table, because the one open chair is the one you are
 * walking up to take.
 *
 * Nothing here is random. Who sits where is worked out from the map, so the same
 * table looks the same every time you come in, and two tables in one room look
 * different from each other:
 *
 * - **A table with a game** — a dealer whose POI seats you at a table in
 *   `TABLES` — seats the people that game seats, as themselves: the faces you
 *   walk past are the faces across the felt when you sit down. Anybody who is
 *   standing somewhere else in the room at the time keeps their chair empty
 *   rather than being in two places. Somebody standing at the table itself, the
 *   way Nadia waits at hers, already counts as its player.
 * - **A table without one** seats strangers, between one and all-but-one of its
 *   chairs, the number made up from where the table is.
 *
 * Sitters take their tile like anybody standing does, so you cannot walk
 * through them. A chair is left empty rather than filled when somebody sitting
 * in it would wall off any part of the room you could reach before, or leave a
 * POI with no way up to it.
 */

/** Somebody sitting at a table. Scenery: you cannot talk to them. */
export interface Sitter {
  /** Stable and unique on the map — the table's corner and the chair. A stranger's look is made up from it. */
  id: string
  /** The table, as placed. */
  table: PlacedStamp
  /** Which of the table's seats, as listed on its stamp. */
  seat: number
  /** The tile they take. */
  col: number
  row: number
  facing: SeatFacing
  /** Somebody the table's game seats, drawn as themselves. Left out for a stranger. */
  characterId?: string
}

/** One table and who is at it. */
export interface TableSeating {
  table: PlacedStamp
  /** How many chairs it has. */
  seats: number
  /** The game played there, if anybody deals one. */
  tableId?: string
  sitters: Sitter[]
  /** Players of its game standing at it rather than sitting. They count as being at the table. */
  standing: string[]
}

/** The parts of an area seating reads. */
export type SeatingArea = Pick<AreaDef, 'id' | 'map' | 'pois' | 'playerStart' | 'stamps' | 'crowd'>

export interface SeatingOptions {
  /** People standing in the area besides its POIs: whoever the hour puts here. */
  present?: Array<{ id: string; col: number; row: number }>
  /** Tiles nobody may sit on: where the player is arriving. */
  keepClear?: Array<{ col: number; row: number }>
  tables?: Record<string, TableDef>
  characters?: Record<string, CharacterDef>
}

const key = (col: number, row: number) => `${col},${row}`
const SIDES = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const

/** A small seeded generator, so a table is the same table every time. */
function seeded(seed: string): () => number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  let state = h >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Every tile you can walk to from `start` without going through anybody or a door. */
function reachable(area: SeatingArea, start: { col: number; row: number }, blocked: Set<string>): Set<string> {
  const seen = new Set<string>()
  if (!isWalkable(area.map, start.col, start.row)) return seen
  const queue = [start]
  seen.add(key(start.col, start.row))
  while (queue.length > 0) {
    const { col, row } = queue.shift()!
    for (const [dc, dr] of SIDES) {
      const c = col + dc
      const r = row + dr
      const k = key(c, r)
      if (seen.has(k) || blocked.has(k) || !isWalkable(area.map, c, r) || area.map[r][c] === DOOR) continue
      seen.add(k)
      queue.push({ col: c, row: r })
    }
  }
  return seen
}

/** Who sits at every table in an area, table by table, in the order the stamps are listed. */
export function seatingFor(area: SeatingArea, options: SeatingOptions = {}): TableSeating[] {
  const tables = options.tables ?? TABLES
  const characters = options.characters ?? CHARACTERS
  const present = options.present ?? []

  // Who is standing where. A POI that is a character — by id, or by name, the
  // way the casting reads it — is that character standing there.
  const byName = new Map(Object.entries(characters).map(([id, c]) => [c.name, id]))
  const standers = [
    ...area.pois.map((poi) => ({ col: poi.col, row: poi.row, id: characters[poi.id] ? poi.id : byName.get(poi.name) })),
    ...present,
  ]
  const occupied = new Set(standers.map((s) => key(s.col, s.row)))
  const clear = new Set([area.playerStart, ...(options.keepClear ?? [])].map((t) => key(t.col, t.row)))

  // The room as it is with nobody sitting down, to keep it that way.
  const before = reachable(area, area.playerStart, occupied)
  const approachable = (blocked: Set<string>, reach: Set<string>) =>
    standers.filter(({ col, row }) =>
      SIDES.some(([dc, dr]) => !blocked.has(key(col + dc, row + dr)) && reach.has(key(col + dc, row + dr))),
    ).length
  const approachableBefore = approachable(occupied, before)

  // Every table with chairs, and the game dealt at it if a dealer there deals one.
  const placed = (area.stamps ?? []).flatMap((table) => {
    const stamp = STAMP_BY_ID[table.stampId]
    if (!stamp?.seats?.length) return []
    const { cols, rows } = stampSize(stamp)
    const inside = (col: number, row: number) =>
      col >= table.col && col < table.col + cols && row >= table.row && row < table.row + rows
    const dealer = area.pois.find(
      (poi) => poi.action.kind === 'table' && inside(poi.col, poi.row) && tables[poi.action.tableId],
    )
    const game = dealer?.action.kind === 'table' ? tables[dealer.action.tableId] : undefined
    const players = (game?.opponents ?? [])
      .map((ref) => (typeof ref === 'string' ? ref : ref.character))
      .filter((id) => characters[id])
    return [{ table, stamp, seats: stamp.seats, inside, game, players }]
  })

  // One person is at one table. A persona puts the same character at two tables
  // in a room — Vance at the main game and one on one — so the table with the
  // fewest players chooses first: a heads-up game is nothing without its one
  // opponent, and a full ring game barely misses one. Tables without a game,
  // which seat nobody by name, go last.
  const order = placed
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => (a.entry.game ? a.entry.players.length : Infinity) - (b.entry.game ? b.entry.players.length : Infinity) || a.index - b.index)

  const taken = new Set<string>()
  const seatedAlready = new Set<string>()
  const seating: TableSeating[] = new Array(placed.length)
  for (const { entry, index: position } of order) {
    const { table, seats, inside, game, players } = entry
    const seed = `${area.id}@${table.col},${table.row}`
    const next = seeded(seed)
    const capacity = seats.length - 1

    const standing = players.filter((id) => standers.some((s) => s.id === id && inside(s.col, s.row)))
    const named = players
      .filter((id) => !standers.some((s) => s.id === id) && !seatedAlready.has(id))
      .slice(0, Math.max(0, capacity - standing.length))
    const wanted = game
      ? Math.max(named.length, standing.length > 0 ? 0 : 1)
      : crowdedFill(capacity, area.crowd ?? 0, next())

    // The chairs, in an order of their own for this table.
    const chairs = seats
      .map((seat, index) => ({ seat, index, order: next() }))
      .sort((a, b) => a.order - b.order)
    const sitters: Sitter[] = []
    for (const { seat, index } of chairs) {
      if (sitters.length >= wanted) break
      const at = seatTile(seat)
      const col = table.col + at.col
      const row = table.row + at.row
      const k = key(col, row)
      if (!isWalkable(area.map, col, row) || area.map[row][col] === DOOR) continue
      if (occupied.has(k) || taken.has(k) || clear.has(k)) continue
      // Nobody sits down in the only way through.
      const blocked = new Set([...occupied, ...taken, k])
      const after = reachable(area, area.playerStart, blocked)
      const cutOff = [...before].some((tile) => !blocked.has(tile) && !after.has(tile))
      if (cutOff || approachable(blocked, after) < approachableBefore) continue
      taken.add(k)
      const characterId = named[sitters.length]
      if (characterId) seatedAlready.add(characterId)
      sitters.push({
        id: `${seed}#${index}`,
        table,
        seat: index,
        col,
        row,
        facing: seat.facing,
        ...(characterId ? { characterId } : {}),
      })
    }
    seating[position] = { table, seats: seats.length, tableId: game?.id, sitters, standing }
  }
  return seating
}

/**
 * How many strangers sit at a table with no game: anywhere from one chair to
 * all but one, except that a crowded room fills from the bottom up. At crowd 0
 * that is the old spread; at 1 every table is as full as it can be.
 */
export function crowdedFill(capacity: number, crowd: number, roll: number): number {
  const least = Math.min(capacity, Math.max(1, Math.round(capacity * crowd)))
  return least + Math.floor(roll * (capacity - least + 1))
}

/** Everybody sitting down in an area. */
export function sittersIn(area: SeatingArea, options: SeatingOptions = {}): Sitter[] {
  return seatingFor(area, options).flatMap((table) => table.sitters)
}
