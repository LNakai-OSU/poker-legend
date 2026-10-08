import { useMemo, useRef, useState } from 'react'
import { AREAS, CITIES } from '../world/cities'
import {
  DOOR,
  TILE_VOCABULARY,
  isTileWalkable,
  parseMap,
  toSketch,
  type TileGrid,
} from '../overworld/tileRenderer'
import { TILE_THEMES, tileCanvases } from '../overworld/sprites'
import { charactersIn } from '../world/characters'
import { TIME_PERIODS } from '../game/time'

/**
 * Paint a map, and see what the game will draw.
 *
 * Maps are ASCII sketches in source, which is the right format — diffable,
 * reviewable, editable by hand — but a bad format to *design* in: you cannot see
 * a street while you are counting commas, and a row one character short is
 * invisible by eye and fatal on load.
 *
 * This paints with the game's own tile art, at the game's own theme, so what you
 * see here is what the game draws. It writes the sketch back out in exactly the
 * form `parseMap` reads, and the round trip is checked over every map in the
 * game, so opening a map and saving it unchanged cannot quietly rewrite it.
 *
 * Reached at `#editor`. It is a tool, not part of the game.
 */

const CELL = 24

type Marker = { kind: 'poi' | 'door' | 'start' | 'person'; label: string }

export function MapEditor({ onClose }: { onClose: () => void }) {
  const areaIds = useMemo(() => Object.keys(AREAS).sort(), [])
  const [areaId, setAreaId] = useState(areaIds[0])
  const located = AREAS[areaId]
  const area = located.area
  const theme = CITIES[located.cityId].theme ?? 'default'

  const [grid, setGrid] = useState<TileGrid>(() => area.map.map((row) => [...row]))
  const [loadedFrom, setLoadedFrom] = useState(areaId)
  const [brush, setBrush] = useState(TILE_VOCABULARY[0].tile)
  const [showMarkers, setShowMarkers] = useState(true)
  const [period, setPeriod] = useState<(typeof TIME_PERIODS)[number]>('morning')
  const painting = useRef(false)

  // Switching area loads that map. Kept as a render-time comparison rather than
  // an effect so the grid and the area can never be one render out of step.
  if (loadedFrom !== areaId) {
    setLoadedFrom(areaId)
    setGrid(area.map.map((row) => [...row]))
  }

  const canvases = tileCanvases(theme)
  const sketch = toSketch(grid)

  const paint = (col: number, row: number) => {
    setGrid((current) => {
      if (current[row]?.[col] === brush) return current
      const next = current.map((r) => [...r])
      next[row][col] = brush
      return next
    })
  }

  /** Everything already standing on the map, so you do not build over it. */
  const markers = useMemo(() => {
    const found = new Map<string, Marker>()
    found.set(`${area.playerStart.col},${area.playerStart.row}`, { kind: 'start', label: 'start' })
    for (const poi of area.pois) found.set(`${poi.col},${poi.row}`, { kind: 'poi', label: poi.name })
    for (const exit of area.exits) found.set(`${exit.col},${exit.row}`, { kind: 'door', label: exit.label })
    for (const { character, at } of charactersIn(areaId, period)) {
      found.set(`${at.col},${at.row}`, { kind: 'person', label: character.name })
    }
    return found
  }, [area, areaId, period])

  const problems = useMemo(() => check(grid, area, areaId, period), [grid, area, areaId, period])

  return (
    <div style={page}>
      <header style={bar}>
        <strong style={{ fontSize: 15 }}>Map editor</strong>
        <select value={areaId} onChange={(e) => setAreaId(e.target.value)} style={control}>
          {areaIds.map((id) => (
            <option key={id} value={id}>
              {AREAS[id].area.name} — {id}
            </option>
          ))}
        </select>
        <span style={{ color: '#8f8fa6', fontSize: 12 }}>
          {grid[0].length}×{grid.length} · {theme}
        </span>
        <select value={period} onChange={(e) => setPeriod(e.target.value as typeof period)} style={control}>
          {TIME_PERIODS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={showMarkers} onChange={(e) => setShowMarkers(e.target.checked)} />
          who is standing here
        </label>
        <div style={{ flex: 1 }} />
        <button style={control} onClick={() => setGrid(area.map.map((r) => [...r]))}>
          Revert
        </button>
        <button style={control} onClick={onClose}>
          Close
        </button>
      </header>

      <div style={{ display: 'flex', gap: 16, padding: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10, maxWidth: 240 }}>
            {TILE_VOCABULARY.map(({ tile, char, name }) => (
              <button
                key={tile}
                title={`${name}  ${char}`}
                data-testid={`brush-${char}`}
                onClick={() => setBrush(tile)}
                style={{
                  ...swatch,
                  borderColor: brush === tile ? '#f2c14e' : '#2c3d35',
                  boxShadow: brush === tile ? '0 0 0 2px rgba(242,193,78,0.35)' : undefined,
                }}
              >
                <img src={canvases[tile]?.toDataURL()} alt="" width={28} height={28} style={pixelated} />
                {/* Named, not just drawn. Two dark tiles are hard to tell apart
                    at 28px, and on a phone there is no hover to explain them. */}
                <span style={swatchLabel}>{name}</span>
              </button>
            ))}
          </div>
          <div style={{ fontSize: 12, color: '#8f8fa6', maxWidth: 240 }}>
            Click or drag to paint. The art and the tint are the ones the game
            draws this town in.
          </div>

          <div style={{ marginTop: 14, fontSize: 12, display: 'grid', gap: 4, maxWidth: 240 }}>
            <div style={{ color: '#8f8fa6' }}>Already on this map</div>
            {([
              ['start', 'where the player arrives'],
              ['door', 'a doorway'],
              ['poi', 'somebody or something fixed'],
              ['person', 'here at this hour'],
            ] as const).map(([kind, what]) => (
              <div key={kind} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ ...markerDot(kind), position: 'static', width: 9, height: 9 }} />
                <span style={{ color: '#b9b9c9' }}>{what}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, marginBottom: 4, color: '#8f8fa6' }}>Size</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button style={control} onClick={() => setGrid(resize(grid, 0, -1))}>
                − row
              </button>
              <button style={control} onClick={() => setGrid(resize(grid, 0, 1))}>
                + row
              </button>
              <button style={control} onClick={() => setGrid(resize(grid, -1, 0))}>
                − col
              </button>
              <button style={control} onClick={() => setGrid(resize(grid, 1, 0))}>
                + col
              </button>
            </div>
          </div>
        </div>

        <div
          data-testid="editor-grid"
          data-width={grid[0].length}
          data-height={grid.length}
          onPointerDown={() => (painting.current = true)}
          onPointerUp={() => (painting.current = false)}
          onPointerLeave={() => (painting.current = false)}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${grid[0].length}, ${CELL}px)`,
            border: '1px solid #2c3d35',
            lineHeight: 0,
            touchAction: 'none',
            overflow: 'auto',
            maxWidth: '100%',
          }}
        >
          {grid.flatMap((row, r) =>
            row.map((tile, c) => {
              const marker = showMarkers ? markers.get(`${c},${r}`) : undefined
              return (
                <div
                  key={`${c},${r}`}
                  data-cell={`${c},${r}`}
                  title={marker ? `${marker.label} (${c},${r})` : `${c},${r}`}
                  onPointerDown={() => paint(c, r)}
                  onPointerEnter={() => painting.current && paint(c, r)}
                  style={{ position: 'relative', width: CELL, height: CELL, cursor: 'crosshair' }}
                >
                  <img
                    src={canvases[tile]?.toDataURL()}
                    alt=""
                    width={CELL}
                    height={CELL}
                    style={pixelated}
                    draggable={false}
                  />
                  {marker && <span style={markerDot(marker.kind)} />}
                </div>
              )
            }),
          )}
        </div>

        <div style={{ flex: '1 1 320px', minWidth: 300 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <strong style={{ fontSize: 13 }}>Sketch</strong>
            <button
              style={control}
              onClick={() => navigator.clipboard?.writeText(sketch)}
              data-testid="copy-sketch"
            >
              Copy
            </button>
            <span style={{ fontSize: 12, color: '#8f8fa6' }}>paste into cities.ts</span>
          </div>
          <textarea
            readOnly
            data-testid="sketch"
            value={sketch}
            style={{
              width: '100%',
              height: 220,
              background: '#0b0b12',
              color: '#cfe8d6',
              border: '1px solid #2c3d35',
              borderRadius: 6,
              fontFamily: 'monospace',
              fontSize: 11,
              lineHeight: 1.15,
              whiteSpace: 'pre',
              padding: 8,
            }}
          />

          <div style={{ marginTop: 12 }}>
            <strong style={{ fontSize: 13 }}>
              Problems{' '}
              <span data-testid="problem-count" style={{ color: problems.length ? '#e05a5a' : '#3a9d5c' }}>
                ({problems.length})
              </span>
            </strong>
            <ul data-testid="problems" style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 12, lineHeight: 1.6 }}>
              {problems.length === 0 && <li style={{ color: '#3a9d5c' }}>Nothing standing in a wall.</li>}
              {problems.map((problem) => (
                <li key={problem} style={{ color: '#e8b0b0' }}>
                  {problem}
                </li>
              ))}
            </ul>
            <p style={{ fontSize: 12, color: '#8f8fa6', marginTop: 10 }}>
              The same rules the content tests enforce, checked as you paint —
              so a map that is wrong says so here rather than at the next test
              run.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * The content rules, applied to a grid that is not in the game yet.
 *
 * A deliberate echo of `content.test.ts`: the editor cannot import the tests, so
 * it restates the rules that are about the *map* — every fixture reachable,
 * every door approachable, nobody inside a wall.
 */
function check(
  grid: TileGrid,
  area: (typeof AREAS)[string]['area'],
  areaId: string,
  period: (typeof TIME_PERIODS)[number],
): string[] {
  const problems: string[] = []
  const walkable = (col: number, row: number) =>
    row >= 0 && row < grid.length && col >= 0 && col < grid[0].length && isTileWalkable(grid[row][col])
  const approachable = (col: number, row: number) =>
    [
      [col, row + 1],
      [col, row - 1],
      [col - 1, row],
      [col + 1, row],
    ].some(([c, r]) => walkable(c, r))

  if (!walkable(area.playerStart.col, area.playerStart.row)) {
    problems.push(`the player starts in a wall at (${area.playerStart.col},${area.playerStart.row})`)
  }
  for (const poi of area.pois) {
    if (!approachable(poi.col, poi.row)) problems.push(`nobody can reach ${poi.name}`)
  }
  for (const exit of area.exits) {
    if (grid[exit.row]?.[exit.col] !== DOOR) {
      problems.push(`the ${exit.label} doorway is not drawn as a door`)
    }
    if (!approachable(exit.col, exit.row)) {
      problems.push(`there is nowhere to stand in front of ${exit.label}`)
    }
  }
  for (const { character, at } of charactersIn(areaId, period)) {
    if (!walkable(at.col, at.row)) problems.push(`${character.name} is in a wall this ${period}`)
    else if (!approachable(at.col, at.row)) problems.push(`nobody can walk up to ${character.name}`)
  }
  return problems
}

/** Grows or shrinks the map, filling anything new with wall. */
function resize(grid: TileGrid, dCol: number, dRow: number): TileGrid {
  const width = Math.max(3, grid[0].length + dCol)
  const height = Math.max(3, grid.length + dRow)
  const wall = parseMap('#')[0][0]
  return Array.from({ length: height }, (_, row) =>
    Array.from({ length: width }, (_, col) => grid[row]?.[col] ?? wall),
  )
}

const pixelated = { imageRendering: 'pixelated' as const, display: 'block' as const }

const page: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: '#14141f',
  color: '#e8e8f0',
  fontFamily: 'system-ui, sans-serif',
  overflow: 'auto',
  zIndex: 200,
}

const bar: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  alignItems: 'center',
  flexWrap: 'wrap',
  padding: '10px 16px',
  borderBottom: '1px solid #2c3d35',
  background: '#0e1018',
  position: 'sticky',
  top: 0,
}

const control: React.CSSProperties = {
  background: '#1a1f2b',
  color: '#e8e8f0',
  border: '1px solid #2c3d35',
  borderRadius: 6,
  padding: '5px 9px',
  fontSize: 12,
  minHeight: 32,
}

const swatchLabel: React.CSSProperties = {
  display: 'block',
  fontSize: 9,
  lineHeight: 1.3,
  color: '#9a9ab0',
  textAlign: 'center',
  paddingTop: 2,
}

const swatch: React.CSSProperties = {
  padding: 2,
  background: '#0e1018',
  border: '2px solid #2c3d35',
  borderRadius: 6,
  cursor: 'pointer',
  lineHeight: 0,
  minHeight: 0,
  width: 52,
}

function markerDot(kind: Marker['kind']): React.CSSProperties {
  const color = { poi: '#6ea8fe', door: '#f2c14e', start: '#3a9d5c', person: '#e05a5a' }[kind]
  return {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: color,
    boxShadow: '0 0 0 1px rgba(0,0,0,0.6)',
    pointerEvents: 'none',
  }
}

export { TILE_THEMES }
