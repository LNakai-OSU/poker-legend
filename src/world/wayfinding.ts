import { AREAS } from './content'
import type { AreaDef, Edge, ExitDef } from './types'
import { isWalkable, type TileGrid } from '../overworld/tiles'

/**
 * Which way to walk to get somewhere, on foot.
 *
 * The world is areas joined by doors (`exits`) and by streets running into each
 * other (`edges`). The overworld points at the first leg of the shortest walk
 * to wherever the next step is (`world/nextSteps.ts`), so a new town needs no
 * signposting of its own: its doors and streets already say how it joins up.
 */
export type Hop =
  /** You are there. */
  | { kind: 'here' }
  /** Through this door. */
  | { kind: 'door'; col: number; row: number }
  /** Off this side of the map, into the next street. */
  | { kind: 'edge'; edge: Edge }

type Areas = Record<string, { area: AreaDef }>

/**
 * The first leg of the shortest walk from one area to another, counting each
 * door and each street crossed as one leg; null if there is no walk (a town
 * away is a bus ride, and a shut door is shut). `canPass` can shut a door the
 * map has open: a private room before it has been won.
 */
export function firstHop(
  from: string,
  to: string,
  canPass: (exit: ExitDef, areaId: string) => boolean = () => true,
  areas: Areas = AREAS,
): Hop | null {
  if (from === to) return { kind: 'here' }
  if (!areas[from] || !areas[to]) return null
  const first = new Map<string, Hop>([[from, { kind: 'here' }]])
  const queue = [from]
  while (queue.length > 0) {
    const at = queue.shift()!
    const { area } = areas[at]
    const legs: { toAreaId: string; hop: Hop }[] = [
      ...area.exits
        .filter((exit) => canPass(exit, at))
        .map((exit) => ({ toAreaId: exit.toAreaId, hop: { kind: 'door', col: exit.col, row: exit.row } as Hop })),
      ...(Object.entries(area.edges ?? {}) as [Edge, { toAreaId: string; blocked?: string }][])
        .filter(([, link]) => !link.blocked)
        .map(([edge, link]) => ({ toAreaId: link.toAreaId, hop: { kind: 'edge', edge } as Hop })),
    ]
    for (const leg of legs) {
      if (first.has(leg.toAreaId) || !areas[leg.toAreaId]) continue
      // The leg out of where you are standing is the one to point at.
      const hop = at === from ? leg.hop : first.get(at)!
      if (leg.toAreaId === to) return hop
      first.set(leg.toAreaId, hop)
      queue.push(leg.toAreaId)
    }
  }
  return null
}

/**
 * Where to step off a side of the map: the open tile along that edge nearest
 * the player, so the pointer leads along the street and not to a corner of it.
 */
export function edgeTile(map: TileGrid, edge: Edge, from: { col: number; row: number }): { col: number; row: number } | null {
  const width = map[0].length
  const height = map.length
  const along = edge === 'north' || edge === 'south'
  const tiles = Array.from({ length: along ? width : height }, (_, i) =>
    edge === 'north'
      ? { col: i, row: 0 }
      : edge === 'south'
        ? { col: i, row: height - 1 }
        : edge === 'east'
          ? { col: width - 1, row: i }
          : { col: 0, row: i },
  ).filter((tile) => isWalkable(map, tile.col, tile.row))
  const distance = (tile: { col: number; row: number }) => (along ? Math.abs(tile.col - from.col) : Math.abs(tile.row - from.row))
  return tiles.reduce<{ col: number; row: number } | null>((best, tile) => (!best || distance(tile) < distance(best) ? tile : best), null)
}
