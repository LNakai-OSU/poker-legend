import { useEffect, useRef, useState } from 'react'
import { Application } from 'pixi.js'
import { buildTileLayer, TILE_SIZE, type TileGrid } from './tileRenderer'
import { GridPlayer, type Direction } from './GridPlayer'
import { Npc } from './Npc'
import { DialogueBox } from '../game/DialogueBox'

const APARTMENT_MAP: TileGrid = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
]

const MARCUS = { id: 'marcus', name: 'Marcus', col: 8, row: 3, color: 0x6ea8fe }

const MARCUS_LINES = [
  "Marcus: Hey! You still coming through tonight?",
  "Marcus: Bring what you can — winner takes the whole table.",
  "Marcus: Come by around 8. You in?",
]

const MOVE_KEYS: Record<string, Direction> = {
  ArrowUp: 'up', w: 'up', W: 'up',
  ArrowDown: 'down', s: 'down', S: 'down',
  ArrowLeft: 'left', a: 'left', A: 'left',
  ArrowRight: 'right', d: 'right', D: 'right',
}

interface ApartmentSceneProps {
  onStartPokerNight: () => void
}

export function ApartmentScene({ onStartPokerNight }: ApartmentSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [prompt, setPrompt] = useState<string | null>(null)
  const [talking, setTalking] = useState(false)
  const talkingRef = useRef(false)

  useEffect(() => {
    talkingRef.current = talking
  }, [talking])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let app: Application | null = null
    let cancelled = false
    const keysDown = new Set<string>()

    const keydown = (e: KeyboardEvent) => {
      if (e.key in MOVE_KEYS) keysDown.add(e.key)
    }
    const keyup = (e: KeyboardEvent) => keysDown.delete(e.key)

    ;(async () => {
      const instance = new Application()
      await instance.init({ background: '#101018', resizeTo: container, antialias: false })
      if (cancelled) {
        instance.destroy(true)
        return
      }
      app = instance
      container.appendChild(instance.canvas)

      const world = buildTileLayer(APARTMENT_MAP)
      const player = new GridPlayer(2, 5)
      const marcus = new Npc(MARCUS)
      world.addChild(player.sprite, marcus.sprite)
      instance.stage.addChild(world)

      const centerCamera = () => {
        world.position.set(
          instance.screen.width / 2 - player.pixelX - TILE_SIZE / 2,
          instance.screen.height / 2 - player.pixelY - TILE_SIZE / 2,
        )
      }
      centerCamera()

      const interact = (e: KeyboardEvent) => {
        if (e.key !== 'e' && e.key !== 'E' && e.key !== 'Enter') return
        if (talkingRef.current) return
        if (player.isAdjacentTo(marcus.config.col, marcus.config.row)) {
          setTalking(true)
        }
      }

      window.addEventListener('keydown', keydown)
      window.addEventListener('keydown', interact)
      window.addEventListener('keyup', keyup)

      instance.ticker.add((ticker) => {
        if (!talkingRef.current) {
          for (const key of keysDown) {
            player.tryMove(MOVE_KEYS[key], APARTMENT_MAP)
            break
          }
        }
        player.update(ticker.deltaMS)
        centerCamera()
        setPrompt(
          !talkingRef.current && player.isAdjacentTo(marcus.config.col, marcus.config.row)
            ? `Press E to talk to ${marcus.config.name}`
            : null,
        )
      })
    })()

    return () => {
      cancelled = true
      window.removeEventListener('keydown', keydown)
      window.removeEventListener('keyup', keyup)
      app?.destroy(true)
    }
  }, [])

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {prompt && (
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#e8e8f0',
            fontFamily: 'monospace',
            background: 'rgba(10,10,16,0.8)',
            padding: '4px 10px',
            borderRadius: 4,
          }}
        >
          {prompt}
        </div>
      )}
      {talking && (
        <DialogueBox
          speaker={MARCUS.name}
          lines={MARCUS_LINES}
          onFinish={() => {
            setTalking(false)
            onStartPokerNight()
          }}
        />
      )}
    </div>
  )
}
