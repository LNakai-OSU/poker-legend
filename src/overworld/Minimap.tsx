import { useEffect, useRef } from 'react'
import { DOOR, FURNITURE, GRASS, ROAD, SIDEWALK, WALL, WATER, type TileGrid } from './tiles'

/**
 * A corner map of the block you are standing on.
 *
 * The camera only ever shows a dozen tiles at a time, which made a street feel
 * like a corridor and left no way to tell where the bus stop was without walking
 * the whole length of it. This draws the area at a glance: where the roads go,
 * which buildings have doors, who is standing about, and where you are.
 */

const TILE_COLORS: Record<number, string> = {
  [WALL]: '#20242e',
  [FURNITURE]: '#2b3040',
  [WATER]: '#1d3a52',
  [ROAD]: '#3a3f4b',
  [SIDEWALK]: '#4b5160',
  [GRASS]: '#2f4a38',
  [DOOR]: '#c8963c',
}
const DEFAULT_TILE = '#363c48'

/** Pixels per tile. Three keeps a 30-wide boulevard under 100px on a phone. */
const SCALE = 3

export interface MinimapMarker {
  col: number
  row: number
  /** Doors, people and the way out of town each get their own colour. */
  kind: 'poi' | 'exit' | 'chaser'
}

export function Minimap({
  map,
  player,
  markers,
  areaName,
}: {
  map: TileGrid
  player: { col: number; row: number }
  markers: MinimapMarker[]
  areaName: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const width = map[0].length
    const height = map.length
    const dpr = window.devicePixelRatio || 1
    canvas.width = width * SCALE * dpr
    canvas.height = height * SCALE * dpr
    canvas.style.width = `${width * SCALE}px`
    canvas.style.height = `${height * SCALE}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, width * SCALE, height * SCALE)

    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        ctx.fillStyle = TILE_COLORS[map[row][col]] ?? DEFAULT_TILE
        ctx.fillRect(col * SCALE, row * SCALE, SCALE, SCALE)
      }
    }

    for (const marker of markers) {
      ctx.fillStyle =
        marker.kind === 'exit' ? '#8ad4ff' : marker.kind === 'chaser' ? '#e05a5a' : '#c084fc'
      ctx.fillRect(marker.col * SCALE, marker.row * SCALE, SCALE, SCALE)
    }

    // Drawn last and a pixel larger so the player is never hidden under a marker.
    ctx.fillStyle = '#f2c14e'
    ctx.fillRect(player.col * SCALE - 1, player.row * SCALE - 1, SCALE + 2, SCALE + 2)
  }, [map, player.col, player.row, markers])

  return (
    <div
      data-testid="minimap"
      data-player={`${player.col},${player.row}`}
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        padding: 6,
        borderRadius: 6,
        background: 'rgba(10,10,16,0.82)',
        border: '1px solid #2c3d5e',
        fontFamily: 'monospace',
        pointerEvents: 'none',
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block', imageRendering: 'pixelated' }} />
      <div style={{ fontSize: 9, color: '#9aa4b8', marginTop: 4, textAlign: 'center' }}>{areaName}</div>
    </div>
  )
}
