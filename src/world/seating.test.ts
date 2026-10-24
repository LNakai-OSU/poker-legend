import { describe, expect, it } from 'vitest'
import { DOOR, isWalkable } from '../overworld/tiles'
import { TIME_PERIODS } from '../game/time'
import { AREAS } from './cities'
import { CHARACTERS, charactersIn } from './characters'
import { TABLES } from './content'
import { seatingFor, type SeatingArea } from './seating'
import { KEEP, STAMPS, STAMP_BY_ID, seatTile, stampSize } from './stamps'
import type { AreaDef } from './types'

/** Every area with a table that has chairs, in every period, with whoever the hour puts there. */
const seatedAreas = Object.values(AREAS)
  .map(({ area }) => area)
  .filter((area) => (area.stamps ?? []).some((s) => STAMP_BY_ID[s.stampId]?.seats?.length))

const cases = seatedAreas.flatMap((area) =>
  TIME_PERIODS.map((period) => {
    const present = charactersIn(area.id, period).map(({ id, at }) => ({ id, col: at.col, row: at.row }))
    return { area, period, present, seating: seatingFor(area, { present }) }
  }),
)

const key = (col: number, row: number) => `${col},${row}`

function reach(area: AreaDef, blocked: Set<string>): Set<string> {
  const seen = new Set([key(area.playerStart.col, area.playerStart.row)])
  const queue = [area.playerStart]
  while (queue.length) {
    const { col, row } = queue.shift()!
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const c = col + dc
      const r = row + dr
      if (seen.has(key(c, r)) || blocked.has(key(c, r)) || !isWalkable(area.map, c, r) || area.map[r][c] === DOOR) continue
      seen.add(key(c, r))
      queue.push({ col: c, row: r })
    }
  }
  return seen
}

describe('the chairs on a table stamp', () => {
  const tables = STAMPS.filter((stamp) => stamp.seats?.length)

  it('every poker table has chairs', () => {
    for (const stamp of STAMPS.filter((s) => s.id.startsWith('poker-table'))) {
      expect(stamp.seats?.length ?? 0, `${stamp.id} has no seats`).toBeGreaterThanOrEqual(2)
    }
  })

  it('puts each chair on floor round the felt, facing it', () => {
    for (const stamp of tables) {
      const rows = stamp.tiles.split('\n')
      const { cols, rows: height } = stampSize(stamp)
      const tiles = new Set<string>()
      for (const seat of stamp.seats!) {
        const { col, row } = seatTile(seat)
        expect(col >= 0 && col < cols && row >= 0 && row < height, `${stamp.id}: a seat is off the table`).toBe(true)
        expect(rows[row][col], `${stamp.id}: a seat is on the felt`).toBe(KEEP)
        expect(tiles.has(key(col, row)), `${stamp.id}: two seats on one tile`).toBe(false)
        tiles.add(key(col, row))
        // The next tile the way they face is felt.
        const ahead = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[seat.facing]
        expect(rows[row + ahead[1]]?.[col + ahead[0]], `${stamp.id}: a chair faces away from the felt`).toBe('F')
      }
    }
  })
})

describe('who sits at the tables', () => {
  it('has seated tables to check', () => {
    expect(seatedAreas.map((a) => a.id)).toEqual(
      expect.arrayContaining(['sc-floor', 'rb-boat', 'ch-cardroom', 'pc-casino', 'nm-casino', 'pl-casino']),
    )
  })

  it('puts between one player and all but one chair at every table', () => {
    for (const { area, period, seating } of cases) {
      for (const table of seating) {
        const at = table.sitters.length + table.standing.length
        const where = `${area.id} (${period}): ${table.table.stampId} at ${table.table.col},${table.table.row}`
        expect(at, `${where} is empty`).toBeGreaterThanOrEqual(1)
        expect(at, `${where} is full`).toBeLessThanOrEqual(table.seats - 1)
      }
    }
  })

  it('seats the same people in the same chairs every time', () => {
    for (const { area, present, seating } of cases) {
      // A fresh copy of the area, so nothing is remembered between calls.
      const copy: SeatingArea = JSON.parse(JSON.stringify(area))
      const again = seatingFor(copy, { present })
      const summary = (s: typeof seating) => s.map((t) => t.sitters.map((x) => [x.id, x.col, x.row, x.characterId ?? '']))
      expect(summary(again), `${area.id} seats differently the second time`).toEqual(summary(seating))
    }
  })

  it('sits nobody on somebody, in a wall, in a doorway or where the player arrives', () => {
    for (const { area, period, present, seating } of cases) {
      const standing = new Set([...area.pois, ...present].map((p) => key(p.col, p.row)))
      const seen = new Set<string>()
      for (const sitter of seating.flatMap((t) => t.sitters)) {
        const where = `${area.id} (${period}): ${sitter.id} at ${sitter.col},${sitter.row}`
        expect(isWalkable(area.map, sitter.col, sitter.row), `${where} is in something solid`).toBe(true)
        expect(area.map[sitter.row][sitter.col], `${where} is in a doorway`).not.toBe(DOOR)
        expect(standing.has(key(sitter.col, sitter.row)), `${where} is on somebody standing`).toBe(false)
        expect(seen.has(key(sitter.col, sitter.row)), `${where} shares a chair`).toBe(false)
        expect(key(sitter.col, sitter.row), `${where} is where the player starts`).not.toBe(
          key(area.playerStart.col, area.playerStart.row),
        )
        seen.add(key(sitter.col, sitter.row))
      }
    }
  })

  it('never walls off any of the room, or anybody in it', () => {
    for (const { area, period, present, seating } of cases) {
      const standing = new Set([...area.pois, ...present].map((p) => key(p.col, p.row)))
      const seats = new Set(seating.flatMap((t) => t.sitters).map((s) => key(s.col, s.row)))
      const before = reach(area, standing)
      const after = reach(area, new Set([...standing, ...seats]))
      for (const tile of before) {
        if (seats.has(tile)) continue
        expect(after.has(tile), `${area.id} (${period}): sitters cut off ${tile}`).toBe(true)
      }
      for (const person of [...area.pois, ...present]) {
        const approaches = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dc, dr]) => key(person.col + dc, person.row + dr))
        const could = approaches.some((t) => before.has(t))
        const can = approaches.some((t) => after.has(t) && !seats.has(t))
        expect(!could || can, `${area.id} (${period}): nobody can get to ${person.id} for the sitters`).toBe(true)
      }
    }
  })

  it("seats a game's own players, each once, and nobody who is standing elsewhere", () => {
    for (const { area, period, present, seating } of cases) {
      const standingIds = new Set([
        ...area.pois.map((p) => (CHARACTERS[p.id] ? p.id : Object.keys(CHARACTERS).find((id) => CHARACTERS[id].name === p.name))),
        ...present.map((p) => p.id),
      ])
      const seated = new Set<string>()
      for (const table of seating) {
        const players = (table.tableId ? TABLES[table.tableId].opponents : []).map((ref) =>
          typeof ref === 'string' ? ref : ref.character,
        )
        for (const sitter of table.sitters) {
          if (!sitter.characterId) continue
          const where = `${area.id} (${period}): ${sitter.characterId}`
          expect(players, `${where} sits at a table that does not seat them`).toContain(sitter.characterId)
          expect(seated.has(sitter.characterId), `${where} is at two tables at once`).toBe(false)
          expect(standingIds.has(sitter.characterId), `${where} is sitting and standing at once`).toBe(false)
          seated.add(sitter.characterId)
        }
        // A stranger only fills a chair when the game has nobody left to put there.
        if (table.tableId && table.sitters.some((s) => !s.characterId)) {
          const free = players.filter((id) => !standingIds.has(id) && !seated.has(id))
          expect(free, `${area.id}: strangers at ${table.tableId} while its players are free`).toEqual([])
        }
      }
    }
  })

  it('shows you the players you will sit down with', () => {
    // The two tables people actually start on, as the story reaches them.
    const at = (areaId: string) => cases.find((c) => c.area.id === areaId && c.period === 'evening')!.seating
    expect(at('sc-floor')[0].sitters.map((s) => s.characterId).sort()).toEqual(['ray', 'sully'])
    expect(at('rb-boat')[0].sitters.map((s) => s.characterId).sort()).toEqual(['deb', 'gus', 'mack', 'pearl', 'tiny'])
  })

  /** A room from a sketch: `#` wall, `.` floor, `F` felt. */
  const room = (...rows: string[]) => rows.map((line) => [...line].map((ch) => (ch === '#' ? 14 : ch === 'F' ? 2 : 3)))
  const dealer = (col: number, row: number, tableId: string) => ({
    id: 'test-dealer',
    name: 'Dealer',
    col,
    row,
    color: 0,
    lines: [],
    action: { kind: 'table' as const, tableId },
  })

  it('leaves a chair empty rather than wall off the room behind it', () => {
    // The corner at 1,2 is only reached through the chair at the left-hand end,
    // and the two top chairs are the only ways up to the dealer at 4,1.
    const map = room(
      '##########',
      '##.......#',
      '#..FFF...#',
      '##.FFF...#',
      '##.......#',
      '##.......#',
      '##########',
    )
    const area: SeatingArea = {
      id: 'test-corner',
      map,
      pois: [dealer(4, 1, 'riverbend-mid')],
      playerStart: { col: 8, row: 5 },
      stamps: [{ stampId: 'poker-table-6', col: 2, row: 1 }],
    }
    const [table] = seatingFor(area)
    const seats = table.sitters.map((s) => key(s.col, s.row))
    expect(seats, 'somebody sat in the way to the corner').not.toContain('2,2')
    expect(seats.includes('3,1') && seats.includes('5,1'), 'both ways up to the dealer were sat in').toBe(false)
    // Five players want five chairs; four are all that can be had.
    expect(seats.length).toBe(4)
  })

  it('leaves a chair empty for somebody standing in it, or for the player arriving', () => {
    const map = room(
      '#########',
      '#.......#',
      '#..FFF..#',
      '#..FFF..#',
      '#.......#',
      '#.......#',
      '#########',
    )
    // Every chair but one is somebody's: a POI, a character the hour put there,
    // and the tile the player is walking in on. Five players want five chairs.
    const area: SeatingArea = {
      id: 'test-crowded',
      map,
      pois: [dealer(4, 1, 'riverbend-mid'), { ...dealer(2, 2, 'riverbend-mid'), id: 'leaning', action: { kind: 'flavor' } }],
      playerStart: { col: 1, row: 5 },
      stamps: [{ stampId: 'poker-table-6', col: 2, row: 1 }],
    }
    const [table] = seatingFor(area, {
      present: [{ id: 'someone', col: 5, row: 1 }],
      keepClear: [{ col: 6, row: 2 }],
    })
    const seats = table.sitters.map((s) => key(s.col, s.row))
    for (const busy of ['2,2', '5,1', '6,2']) expect(seats, `somebody sat on ${busy}`).not.toContain(busy)
    // And 3,1 is the last way up to the dealer, so the two at the bottom are all there is.
    expect(seats.sort()).toEqual(['3,4', '5,4'])
  })

  it('varies how full a table without a game is, from one chair to all but one', () => {
    // The same six-seat table placed all over an empty room, with no dealer.
    const map: number[][] = Array.from({ length: 14 }, (_, r) =>
      Array.from({ length: 24 }, (_, c) => (r === 0 || c === 0 || r === 13 || c === 23 ? 14 : 3)),
    )
    const counts = new Set<number>()
    for (let col = 1; col < 18; col++) {
      for (let row = 1; row < 9; row++) {
        const grid = map.map((line) => [...line])
        // Its felt, as placing it would write.
        for (let r = 1; r <= 2; r++) for (let c = 1; c <= 3; c++) grid[row + r][col + c] = 2
        const [table] = seatingFor({
          id: 'test-room',
          map: grid,
          pois: [],
          playerStart: { col: 22, row: 12 },
          stamps: [{ stampId: 'poker-table-6', col, row }],
        })
        counts.add(table.sitters.length)
      }
    }
    expect([...counts].sort()).toEqual([1, 2, 3, 4, 5])
  })
})
