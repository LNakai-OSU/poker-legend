import { useEffect, useRef, useState } from 'react'
import { Application } from 'pixi.js'
import { buildTileLayer, TILE_SIZE, type TileGrid } from './tileRenderer'
import { GridPlayer, type Direction } from './GridPlayer'
import { Npc, type NpcConfig } from './Npc'
import { DialogueBox } from '../game/DialogueBox'

const MOVE_KEYS: Record<string, Direction> = {
  ArrowUp: 'up', w: 'up', W: 'up',
  ArrowDown: 'down', s: 'down', S: 'down',
  ArrowLeft: 'left', a: 'left', A: 'left',
  ArrowRight: 'right', d: 'right', D: 'right',
}

export interface Interactable extends NpcConfig {
  lines: string[]
  /** Called after the player clicks through all dialogue lines. Omit for flavor-only objects. */
  onFinish?: () => void
}

interface OverworldSceneProps {
  map: TileGrid
  playerStart: { col: number; row: number }
  interactables: Interactable[]
  background?: string
}

export function OverworldScene({ map, playerStart, interactables, background = '#101018' }: OverworldSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [prompt, setPrompt] = useState<string | null>(null)
  const [talkingId, setTalkingId] = useState<string | null>(null)
  const talkingRef = useRef<string | null>(null)

  useEffect(() => {
    talkingRef.current = talkingId
  }, [talkingId])

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
      await instance.init({ background, resizeTo: container, antialias: false })
      if (cancelled) {
        instance.destroy(true)
        return
      }
      app = instance
      container.appendChild(instance.canvas)

      const world = buildTileLayer(map)
      const player = new GridPlayer(playerStart.col, playerStart.row)
      const npcs = interactables.map((cfg) => new Npc(cfg))
      world.addChild(player.sprite, ...npcs.map((n) => n.sprite))
      instance.stage.addChild(world)

      const centerCamera = () => {
        world.position.set(
          instance.screen.width / 2 - player.pixelX - TILE_SIZE / 2,
          instance.screen.height / 2 - player.pixelY - TILE_SIZE / 2,
        )
      }
      centerCamera()

      const findAdjacent = () => npcs.find((n) => player.isAdjacentTo(n.config.col, n.config.row))

      const interact = (e: KeyboardEvent) => {
        if (e.key !== 'e' && e.key !== 'E' && e.key !== 'Enter') return
        if (talkingRef.current) return
        const adjacent = findAdjacent()
        if (adjacent) setTalkingId(adjacent.config.id)
      }

      window.addEventListener('keydown', keydown)
      window.addEventListener('keydown', interact)
      window.addEventListener('keyup', keyup)

      instance.ticker.add((ticker) => {
        if (!talkingRef.current) {
          for (const key of keysDown) {
            player.tryMove(MOVE_KEYS[key], map)
            break
          }
        }
        player.update(ticker.deltaMS)
        centerCamera()
        if (talkingRef.current) {
          setPrompt(null)
        } else {
          const adjacent = findAdjacent()
          setPrompt(adjacent ? `Press E to talk to ${adjacent.config.name}` : null)
        }
      })
    })()

    return () => {
      cancelled = true
      window.removeEventListener('keydown', keydown)
      window.removeEventListener('keyup', keyup)
      app?.destroy(true)
    }
  }, [])

  const talking = interactables.find((i) => i.id === talkingId) ?? null

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
          speaker={talking.name}
          lines={talking.lines}
          onFinish={() => {
            setTalkingId(null)
            talking.onFinish?.()
          }}
        />
      )}
    </div>
  )
}
