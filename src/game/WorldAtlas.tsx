import { useEffect, useRef } from 'react'
import type { AreaDef, CityDef } from '../world/types'
import { DEFAULT_TILE, TILE_COLORS } from '../overworld/Minimap'
import { TYPE } from './pixel/webFont'
import { layoutOf } from './WorldMap'

/** Pixels per tile on the atlas. */
const SCALE = 7

interface Placed {
  area: AreaDef
  x: number
  y: number
}

/**
 * Lays a town's streets on one plane the way you would walk them: each street
 * sits against the side it joins, shifted by the link's offset. Blocked links
 * (the highway out of town) are not followed.
 */
export function placeStreets(city: CityDef, streets: AreaDef[]): { placed: Placed[]; width: number; height: number } {
  const ids = new Set(streets.map((s) => s.id))
  const pos = new Map<string, { x: number; y: number }>()
  const start = streets[0]
  if (!start) return { placed: [], width: 0, height: 0 }
  pos.set(start.id, { x: 0, y: 0 })
  const queue = [start]
  while (queue.length) {
    const a = queue.shift()!
    const at = pos.get(a.id)!
    const aw = a.map[0].length
    const ah = a.map.length
    for (const [side, link] of Object.entries(a.edges ?? {})) {
      if (!link || link.blocked || !ids.has(link.toAreaId) || pos.has(link.toAreaId)) continue
      const b = city.areas[link.toAreaId]
      const off = link.offset ?? 0
      const bw = b.map[0].length
      const bh = b.map.length
      const p =
        side === 'east' ? { x: at.x + aw, y: at.y - off }
        : side === 'west' ? { x: at.x - bw, y: at.y - off }
        : side === 'south' ? { x: at.x - off, y: at.y + ah }
        : { x: at.x - off, y: at.y - bh }
      pos.set(b.id, p)
      queue.push(b)
    }
  }
  const placed = streets.filter((s) => pos.has(s.id)).map((s) => ({ area: s, ...pos.get(s.id)! }))
  const minX = Math.min(...placed.map((p) => p.x))
  const minY = Math.min(...placed.map((p) => p.y))
  for (const p of placed) {
    p.x -= minX
    p.y -= minY
  }
  return {
    placed,
    width: Math.max(...placed.map((p) => p.x + p.area.map[0].length)),
    height: Math.max(...placed.map((p) => p.y + p.area.map.length)),
  }
}

function Terrain({ area }: { area: AreaDef }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx) return
    area.map.forEach((row, r) =>
      row.forEach((t, c) => {
        ctx.fillStyle = TILE_COLORS[t] ?? DEFAULT_TILE
        ctx.fillRect(c * SCALE, r * SCALE, SCALE, SCALE)
      }),
    )
  }, [area])
  return <canvas ref={ref} width={area.map[0].length * SCALE} height={area.map.length * SCALE} style={{ display: 'block' }} />
}

/** One town drawn as the ground it is: streets in place, every door a labelled building. */
export function TownAtlas({
  city,
  here,
  onGoTo,
}: {
  city: CityDef
  here: string | null
  onGoTo?: (areaId: string) => void
}) {
  const layout = layoutOf(city)
  const { placed, width, height } = placeStreets(city, layout.streets)
  const roomsOf = new Map<string, AreaDef[]>()
  if (layout.casino) roomsOf.set(layout.casino.area.id, layout.casino.rooms)
  const isCasino = (id: string) => layout.casino?.area.id === id

  const label = (a: AreaDef, extra = '', gold = false) => {
    const you = a.id === here
    return (
      <span
        key={a.id}
        data-testid={`map-place-${a.id}`}
        data-here={you || undefined}
        role={onGoTo ? 'button' : undefined}
        title={onGoTo ? `Go to ${a.name}` : a.name}
        onClick={onGoTo ? (e) => { e.stopPropagation(); onGoTo(a.id) } : undefined}
        style={{
          display: 'block',
          cursor: onGoTo ? 'pointer' : undefined,
          padding: '1px 5px',
          borderRadius: 3,
          background: gold ? '#3a2a12' : '#1c2230',
          border: `1px solid ${you ? '#fff' : gold ? '#f0d27a' : '#6f86b8'}`,
          boxShadow: you ? '0 0 0 2px #f2c14e' : undefined,
          color: gold ? '#f0d27a' : '#e8e8f0',
          fontSize: TYPE.small,
          whiteSpace: 'nowrap',
          lineHeight: 1.3,
        }}
      >
        {extra}{a.name}{you && <span style={{ color: '#f2c14e' }}> ◀</span>}
      </span>
    )
  }

  return (
    <div style={{ position: 'relative', width: width * SCALE, height: height * SCALE, flex: 'none' }}>
      {placed.map(({ area, x, y }) => {
        const you = area.id === here
        return (
          <div
            key={area.id}
            style={{ position: 'absolute', left: x * SCALE, top: y * SCALE, outline: you ? '2px solid #f2c14e' : '1px solid #0d0f1a', outlineOffset: -1 }}
          >
            <Terrain area={area} />
            <span
              data-testid={`map-place-${area.id}`}
              data-here={you || undefined}
              role={onGoTo ? 'button' : undefined}
              onClick={onGoTo ? (e) => { e.stopPropagation(); onGoTo(area.id) } : undefined}
              style={{ position: 'absolute', left: 3, bottom: 2, fontSize: TYPE.small, color: '#cfd6ee', textShadow: '0 0 3px #000, 0 0 3px #000', cursor: onGoTo ? 'pointer' : undefined }}
            >
              {area.name}{you && ' ◀ you'}
            </span>
            {area.exits
              .filter((e) => city.areas[e.toAreaId] && !ids(placed).has(e.toAreaId))
              .sort((a, b) => a.col - b.col)
              .map((e, i) => {
                const b = city.areas[e.toAreaId]
                const rooms = roomsOf.get(b.id) ?? []
                return (
                  <div
                    key={e.toAreaId}
                    style={{ position: 'absolute', left: e.col * SCALE, top: e.row * SCALE, transform: `translate(-50%, calc(-100% - ${(i % 3) * 22}px))`, display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}
                  >
                    {label(b, isCasino(b.id) ? '♠ ' : '', isCasino(b.id))}
                    {rooms.map((r) => label(r, '🔒 ', true))}
                  </div>
                )
              })}
          </div>
        )
      })}
    </div>
  )
}

const ids = (placed: Placed[]) => new Set(placed.map((p) => p.area.id))
