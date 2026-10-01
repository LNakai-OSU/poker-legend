import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Application } from 'pixi.js'
import { buildTileLayer, isWalkable, TILE_SIZE, type TileGrid } from './tileRenderer'
import { DELTAS, GridPlayer, type Direction } from './GridPlayer'
import { Npc, type NpcConfig } from './Npc'
import { DialogueBox } from '../game/DialogueBox'
import { TouchControls, useIsTouchDevice } from './TouchControls'
import { cameraOffset } from './camera'
import { Minimap } from './Minimap'

const MOVE_KEYS: Record<string, Direction> = {
  ArrowUp: 'up', w: 'up', W: 'up',
  ArrowDown: 'down', s: 'down', S: 'down',
  ArrowLeft: 'left', a: 'left', A: 'left',
  ArrowRight: 'right', d: 'right', D: 'right',
}

/** Taps held while the player is mid-step. Two keeps mashing responsive without
 * queueing up a long unwanted walk. */
const MAX_BUFFERED_TAPS = 2

/**
 * Tiles are authored at 32px, which leaves the world as a small island in a
 * large window. Scaling the whole world container keeps the art pixel-crisp
 * (nearest-neighbour, integer factor) while filling the screen.
 */
const WORLD_ZOOM = 2

/**
 * Below this width the world is drawn at half the zoom.
 *
 * At 2x on a phone the viewport holds about ten tiles, which on a 24-wide street
 * meant the screen contained the player and some empty pavement — no shopfront, no
 * person, nothing to walk towards. An overworld you cannot navigate is the whole
 * premise of the game gone on the form factor it is meant for.
 */
const NARROW_SCREEN_PX = 560

function zoomFor(width: number): number {
  return width < NARROW_SCREEN_PX ? WORLD_ZOOM / 2 : WORLD_ZOOM
}

export interface Interactable extends NpcConfig {
  lines: string[]
  /** Called after the player clicks through all dialogue lines. Omit for flavor-only objects. */
  onFinish?: () => void
}

export interface ChaserConfig {
  name: string
  col: number
  row: number
  color?: number
  /** Milliseconds between steps — keep above the player's to leave room to escape. */
  stepMs?: number
}

export interface SceneExit {
  col: number
  row: number
  label: string
}

interface OverworldSceneProps {
  map: TileGrid
  playerStart: { col: number; row: number }
  interactables: Interactable[]
  /** Door tiles: walking into one leaves this area. */
  exits?: SceneExit[]
  onExit?: (exit: SceneExit) => void
  background?: string
  /** Optional persistent corner UI, e.g. a wallet readout. */
  hud?: ReactNode
  /** A pursuer that hunts the player across the grid. */
  chaser?: ChaserConfig
  onCaught?: () => void
  /** Labels the corner map. */
  areaName?: string
}

export function OverworldScene({
  map,
  playerStart,
  interactables,
  background = '#101018',
  hud,
  chaser,
  onCaught,
  exits = [],
  onExit,
  areaName = '',
}: OverworldSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [prompt, setPrompt] = useState<string | null>(null)
  // Only changes once per tile stepped, so driving React from it is cheap.
  const [playerTile, setPlayerTile] = useState(playerStart)
  const [talkingId, setTalkingId] = useState<string | null>(null)
  const talkingRef = useRef<string | null>(null)
  // Callbacks are read from refs inside the Pixi ticker, which is created once.
  const onCaughtRef = useRef(onCaught)
  onCaughtRef.current = onCaught
  const onExitRef = useRef(onExit)
  onExitRef.current = onExit
  // Touch input drives the same paths as the keyboard rather than synthesising
  // key events, so the Pixi ticker reads it straight from these refs.
  const touchDirRef = useRef<Direction | null>(null)
  const interactRef = useRef<() => void>(() => {})
  const isTouch = useIsTouchDevice()

  useEffect(() => {
    talkingRef.current = talkingId
  }, [talkingId])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let app: Application | null = null
    let cancelled = false
    const keysDown = new Set<string>()
    // Held keys are *sampled* once per frame, so a tap that goes down and back up
    // between two frames is never seen at all — at 60fps that is any press under
    // ~17ms, which is most deliberate single-square taps. Every fresh keydown is
    // therefore queued here as well, and the queue is what a tap is served from.
    const tapQueue: Direction[] = []

    const keydown = (e: KeyboardEvent) => {
      const direction = MOVE_KEYS[e.key]
      if (!direction) return
      // Browsers auto-repeat a held key; only the first press is a new tap.
      if (!keysDown.has(e.key) && tapQueue.length < MAX_BUFFERED_TAPS) tapQueue.push(direction)
      keysDown.add(e.key)
    }
    const keyup = (e: KeyboardEvent) => keysDown.delete(e.key)

    ;(async () => {
      const instance = new Application()
      await instance.init({
        background,
        resizeTo: container,
        antialias: false,
        // Without this the canvas renders at CSS resolution and the browser
        // upscales it on a retina phone, which turns the pixel art to mush.
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      })
      if (cancelled) {
        instance.destroy(true)
        return
      }
      app = instance
      container.appendChild(instance.canvas)

      // Fixed for the life of the scene; a rotation remounts it.
      const zoom = zoomFor(instance.screen.width)
      const world = buildTileLayer(map)
      const player = new GridPlayer(playerStart.col, playerStart.row)
      const npcs = interactables.map((cfg) => new Npc(cfg))
      // The whole world is scaled up, which would blow the name plates up with
      // it; counter-scale them so they stay a readable caption size.
      for (const npc of npcs) {
        npc.label.scale.set(1 / zoom)
        npc.label.position.set(TILE_SIZE / 2, -1)
      }
      // Signs over the doors. Every exit already carried a label in the content —
      // "Card Room", "Menswear", "Auto Row" — and none of it was ever drawn, so a
      // boulevard was six identical brown rectangles and the only way to find out
      // which was which was to walk into each one.
      const doorSigns = exits.map((exit) => {
        const sign = new Npc({
          id: `sign-${exit.col}-${exit.row}`,
          name: exit.label,
          col: exit.col,
          row: exit.row,
        })
        // The label only; the doorway itself is already drawn by the tile layer.
        sign.sprite.removeChildren()
        sign.label.scale.set(1 / zoom)
        sign.label.position.set(TILE_SIZE / 2, -1)
        sign.label.style.fill = '#f0d9a0'
        sign.sprite.addChild(sign.label)
        return sign
      })

      world.addChild(player.sprite, ...npcs.map((n) => n.sprite), ...doorSigns.map((s) => s.sprite))

      let hunter: GridPlayer | null = null
      let hunterLabel: Npc | null = null
      if (chaser) {
        hunter = new GridPlayer(chaser.col, chaser.row, chaser.color ?? 0xe05a5a, 150)
        hunterLabel = new Npc({
          id: 'chaser-label',
          name: chaser.name,
          col: chaser.col,
          row: chaser.row,
          color: chaser.color ?? 0xe05a5a,
        })
        // The label rides along with the pursuer; the body is the GridPlayer.
        hunterLabel.sprite.visible = true
        world.addChild(hunter.sprite, hunterLabel.sprite)
      }
      instance.stage.addChild(world)

      world.scale.set(zoom)
      const worldWidth = map[0].length * TILE_SIZE * zoom
      const worldHeight = map.length * TILE_SIZE * zoom
      const centerCamera = () => {
        world.position.set(
          cameraOffset(instance.screen.width, worldWidth, (player.pixelX + TILE_SIZE / 2) * zoom),
          cameraOffset(instance.screen.height, worldHeight, (player.pixelY + TILE_SIZE / 2) * zoom),
        )
      }
      centerCamera()

      // Everyone standing in the world occupies their tile. Walking through a
      // person looks broken and makes the crowd feel like scenery.
      const occupied = new Set(npcs.map((n) => `${n.config.col},${n.config.row}`))
      const isOccupied = (col: number, row: number) =>
        occupied.has(`${col},${row}`) || (hunter !== null && hunter.col === col && hunter.row === row)

      const findAdjacent = () => npcs.find((n) => player.isAdjacentTo(n.config.col, n.config.row))

      let leaving = false

      /**
       * A step, except that a door is opened from in front of it rather than
       * stood on. Walking on top of a doorway and only then being whisked
       * somewhere else looked like the player had fallen through the floor; now
       * they stop on the tile before it, turn to face it, and the door takes
       * them through.
       */
      const step = (direction: Direction) => {
        if (leaving) return
        const [dc, dr] = DELTAS[direction]
        const door = exits.find((e) => e.col === player.col + dc && e.row === player.row + dr)
        if (door) {
          // Face the door and stay put. The transition is the move.
          player.face(direction)
          leaving = true
          onExitRef.current?.(door)
          return
        }
        player.tryMove(direction, map, isOccupied)
      }

      const tryInteract = () => {
        if (talkingRef.current) return
        const adjacent = findAdjacent()
        if (adjacent) setTalkingId(adjacent.config.id)
      }
      interactRef.current = tryInteract

      const interact = (e: KeyboardEvent) => {
        if (e.key !== 'e' && e.key !== 'E' && e.key !== 'Enter') return
        tryInteract()
      }

      window.addEventListener('keydown', keydown)
      window.addEventListener('keydown', interact)
      window.addEventListener('keyup', keyup)

      let sinceHunterStep = 0
      let caught = false
      let elapsed = 0
      const stepMs = chaser?.stepMs ?? 430
      // People breathe; props don't. Each NPC bobs on its own phase so a row
      // of them doesn't move in lockstep.
      const idlers = npcs
        .filter((n) => (n.config.art ?? 'person') === 'person')
        .map((n, i) => ({ npc: n, baseY: n.sprite.y, phase: i * 1.7 }))

      instance.ticker.add((ticker) => {
        elapsed += ticker.deltaMS
        for (const idler of idlers) {
          idler.npc.sprite.y = idler.baseY + Math.sin(elapsed / 620 + idler.phase) * 1.4
        }

        if (talkingRef.current) {
          // Taps aimed at the dialogue box must not become steps once it closes.
          tapQueue.length = 0
        } else {
          const touchDir = touchDirRef.current
          const heldKey = keysDown.values().next().value
          if (touchDir) {
            step(touchDir)
            tapQueue.length = 0
          } else if (heldKey !== undefined) {
            // Still held: walk continuously, and drop the buffered tap that
            // started this hold so releasing doesn't add a phantom extra step.
            step(MOVE_KEYS[heldKey])
            tapQueue.length = 0
          } else if (tapQueue.length > 0 && !player.moving) {
            // Released already. Serve the tap now, one step per press — and only
            // between tiles, so a tap during a step is honoured after it lands.
            step(tapQueue.shift()!)
          }
        }
        player.update(ticker.deltaMS)

        if (hunter && !caught) {
          sinceHunterStep += ticker.deltaMS
          if (sinceHunterStep >= stepMs && !hunter.moving) {
            sinceHunterStep = 0
            stepToward(hunter, player.col, player.row, map)
            if (hunterLabel) hunterLabel.sprite.position.set(hunter.pixelX, hunter.pixelY)
          }
          hunter.update(ticker.deltaMS)
          if (hunterLabel) hunterLabel.sprite.position.set(hunter.pixelX, hunter.pixelY)

          if (hunter.col === player.col && hunter.row === player.row) {
            caught = true
            onCaughtRef.current?.()
          }
        }

        centerCamera()

        // Published for automated tests so they can verify each step landed
        // rather than assuming a synthetic keypress was observed, and so the
        // browser suite can find things by name instead of hard-coding tiles
        // that move every time a map is edited.
        const wrapper = wrapperRef.current
        if (wrapper && wrapper.dataset.playerCol !== String(player.col)) {
          wrapper.dataset.playerCol = String(player.col)
        }
        if (wrapper && wrapper.dataset.playerRow !== String(player.row)) {
          wrapper.dataset.playerRow = String(player.row)
        }
        setPlayerTile((current) =>
          current.col === player.col && current.row === player.row
            ? current
            : { col: player.col, row: player.row },
        )

        if (talkingRef.current) {
          setPrompt(null)
        } else {
          const adjacent = findAdjacent()
          setPrompt(adjacent ? adjacent.config.name : null)
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
    <div
      ref={wrapperRef}
      data-testid="overworld"
      data-pois={JSON.stringify(
        interactables.map((i) => ({ id: i.id, name: i.name, col: i.col, row: i.row })),
      )}
      data-exits={JSON.stringify(exits)}
      // The walkable grid, so the browser suite can path by breadth-first search
      // instead of walking greedily at a target and giving up when furniture gets
      // in the way. A greedy walker could also blunder into a doorway and leave
      // the room it was trying to cross, which made failures look like missing
      // content. People are in here too, since they block movement: a route
      // planned without them walks into a shoulder and stops short.
      // 'w' walkable, 'd' a door, 'o' someone standing there, '#' solid.
      data-grid={map
        .map((row, r) =>
          row
            .map((_, c) =>
              exits.some((e) => e.col === c && e.row === r)
                ? 'd'
                : interactables.some((i) => i.col === c && i.row === r)
                  ? 'o'
                  : isWalkable(map, c, r)
                    ? 'w'
                    : '#',
            )
            .join(''),
        )
        .join('/')}
      style={{ position: 'relative', width: '100vw', height: '100vh' }}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {chaser && <div className="hunt-vignette" />}
      <Minimap
        map={map}
        player={playerTile}
        areaName={areaName}
        markers={[
          ...interactables.map((i) => ({ col: i.col, row: i.row, kind: 'poi' as const })),
          ...exits.map((e) => ({ col: e.col, row: e.row, kind: 'exit' as const })),
          ...(chaser ? [{ col: chaser.col, row: chaser.row, kind: 'chaser' as const }] : []),
        ]}
      />
      {hud && (
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            color: '#e8e8f0',
            fontFamily: 'monospace',
            background: 'rgba(10,10,16,0.8)',
            padding: '6px 12px',
            borderRadius: 4,
            lineHeight: 1.5,
          }}
        >
          {hud}
        </div>
      )}
      {prompt && (
        <div
          style={{
            position: 'absolute',
            // Along the bottom, clear of the wallet panel, the minimap and the
            // settings button, all of which live along the top edge. On a phone
            // this used to land in the middle of that pile.
            // Clear of the touch d-pad, which owns the bottom of a phone screen.
            bottom: isTouch
              ? 'calc(max(16px, env(safe-area-inset-bottom)) + 180px)'
              : 'calc(max(16px, env(safe-area-inset-bottom)) + 8px)',
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#e8e8f0',
            fontFamily: 'monospace',
            background: 'rgba(10,10,16,0.88)',
            border: '1px solid #2c3d5e',
            padding: '4px 10px',
            borderRadius: 4,
            pointerEvents: 'none',
          }}
        >
          {isTouch ? `Tap E to talk to ${prompt}` : `Press E to talk to ${prompt}`}
        </div>
      )}
      {isTouch && !talking && (
        <TouchControls
          onHold={(direction) => { touchDirRef.current = direction }}
          onAction={() => interactRef.current()}
        />
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

/** Greedy pursuit: close the bigger gap first, fall back to the other axis when blocked. */
function stepToward(hunter: GridPlayer, targetCol: number, targetRow: number, map: TileGrid) {
  const dCol = targetCol - hunter.col
  const dRow = targetRow - hunter.row
  const horizontal: Direction = dCol > 0 ? 'right' : 'left'
  const vertical: Direction = dRow > 0 ? 'down' : 'up'

  const preferred: Direction[] =
    Math.abs(dCol) >= Math.abs(dRow) ? [horizontal, vertical] : [vertical, horizontal]

  for (const direction of preferred) {
    if (direction === 'left' && dCol === 0) continue
    if (direction === 'right' && dCol === 0) continue
    if (direction === 'up' && dRow === 0) continue
    if (direction === 'down' && dRow === 0) continue
    const [dc, dr] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[direction]
    if (isWalkable(map, hunter.col + dc, hunter.row + dr)) {
      hunter.tryMove(direction, map)
      return
    }
  }
}
