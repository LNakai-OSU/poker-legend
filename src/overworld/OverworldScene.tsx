import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Application, Container, Graphics, Sprite, Text } from 'pixi.js'
import { buildStampScene, buildTileLayer, isWalkable, LAYER, TILE_SIZE, type TileGrid } from './tileRenderer'
import { LightMap, townLight } from './lighting'
import { RIM_PAD, rimTexture } from './rimLight'
import { PERIOD_LIGHT, type PeriodLight, type TimePeriod } from '../game/time'
import type { PlacedStamp } from '../world/stamps'
import { DELTAS, GridPlayer, type Direction } from './GridPlayer'
import { Npc, type NpcConfig } from './Npc'
import { COLLECTOR_FIGURE, HERO_FIGURE } from './casting'
import { alertBubbleTexture } from './objectArt'
import { PERSON_RISE, type Figure } from './characterArt'
import { DialogueBox } from '../game/DialogueBox'
import { TouchControls, useIsTouchDevice } from './TouchControls'
import { cameraOffset } from './camera'
import type { Edge } from '../world/types'
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
  /**
   * Offered the interaction before the scene's own text box opens. Returning
   * true means somebody else is handling it — a scripted event taking over the
   * conversation — and this scene should stay out of the way.
   */
  onTalk?: () => boolean
}

export interface ChaserConfig {
  name: string
  col: number
  row: number
  color?: number
  /** Milliseconds between steps — keep above the player's to leave room to escape. */
  stepMs?: number
  /** Who it is: the collector the sponsor sent, drawn as themselves. Defaults to a man in a suit. */
  figure?: Figure
}

export interface SceneExit {
  col: number
  row: number
  label: string
  /**
   * Whether a sign is hung over it. Street doors are signposted; the way out of
   * a room is the gap in its wall, and its name would only sit under your feet.
   */
  signed?: boolean
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
  /** The hour, for its light. See PERIOD_LIGHT. */
  period?: TimePeriod
  /** Out of doors, where the hour's light falls. Rooms keep their lamps on. */
  outdoors?: boolean
  /** Objects bigger than a tile standing on this map. */
  stamps?: PlacedStamp[]
  /** A pursuer that hunts the player across the grid. */
  chaser?: ChaserConfig
  onCaught?: () => void
  /** Labels the corner map. */
  areaName?: string
  /** The town's tile palette. */
  theme?: string
  /**
   * Which sides of this map carry on into another one. Walking off such a side is
   * how streets join: no doorway, no tile to stand on, just the next map.
   */
  openEdges?: Partial<Record<Edge, true>>
  onLeaveEdge?: (edge: Edge, alongAxis: number) => void
  /**
   * Set while a scripted beat has the screen. Nobody moves — not you, not a
   * collector — and nothing else can be talked to, so a beat that fires as you
   * walk in is not read while you walk straight out the other side.
   */
  paused?: boolean
}

export function OverworldScene({
  map,
  playerStart,
  interactables,
  background = '#101018',
  hud,
  period = 'morning',
  outdoors = false,
  stamps,
  chaser,
  onCaught,
  exits = [],
  onExit,
  areaName = '',
  theme = 'default',
  openEdges,
  onLeaveEdge,
  paused = false,
}: OverworldSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [prompt, setPrompt] = useState<string | null>(null)
  // Only changes once per tile stepped, so driving React from it is cheap.
  const [playerTile, setPlayerTile] = useState(playerStart)
  const [talkingId, setTalkingId] = useState<string | null>(null)
  const talkingRef = useRef<string | null>(null)
  // Read through a ref because the interaction handler lives inside the Pixi
  // ticker, which is built once: the list captured at mount goes stale as soon
  // as what an event offers changes, and a stale handler would run yesterday's
  // scene.
  const interactablesRef = useRef(interactables)
  interactablesRef.current = interactables
  // Callbacks are read from refs inside the Pixi ticker, which is created once.
  const onCaughtRef = useRef(onCaught)
  onCaughtRef.current = onCaught
  const onExitRef = useRef(onExit)
  onExitRef.current = onExit
  const onLeaveEdgeRef = useRef(onLeaveEdge)
  onLeaveEdgeRef.current = onLeaveEdge
  const pausedRef = useRef(paused)
  pausedRef.current = paused
  // Touch input drives the same paths as the keyboard rather than synthesising
  // key events, so the Pixi ticker reads it straight from these refs.
  const touchDirRef = useRef<Direction | null>(null)
  const interactRef = useRef<() => void>(() => {})
  // The light is set from the period after mount, and again whenever an event
  // moves the clock on while you are standing in the street.
  const applyLightRef = useRef<(light: PeriodLight | null) => void>(() => {})
  const light = useMemo(() => (outdoors ? townLight(theme, PERIOD_LIGHT[period]) : null), [outdoors, theme, period])
  const lightRef = useRef(light)
  lightRef.current = light
  const isTouch = useIsTouchDevice()

  useEffect(() => {
    talkingRef.current = talkingId
  }, [talkingId])

  // The clock can move on while the scene is up — an event that ends at night.
  useEffect(() => {
    applyLightRef.current(light)
  }, [light])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let app: Application | null = null
    let lightMapToFree: LightMap | null = null
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
      const world = buildTileLayer(map, theme)
      // Objects over the tiles, under everybody who walks about on them, and
      // what of them glows after dark.
      const stampScene = buildStampScene(stamps ?? [])
      world.addChild(stampScene.under, stampScene.over, stampScene.litUnder, stampScene.litOver)
      // The hour's light, multiplied over the street. Only out of doors.
      const artWidth = map[0].length * (TILE_SIZE / 2)
      const artHeight = map.length * (TILE_SIZE / 2)
      const lightMap = outdoors
        ? new LightMap(artWidth, artHeight, stampScene.lights, stampScene.glow(artWidth, artHeight), 2)
        : null
      if (lightMap) {
        lightMapToFree = lightMap
        lightMap.sprite.zIndex = LAYER.lightMap
        world.addChild(lightMap.sprite)
      }
      // Everybody who stands on the map, drawn back to front. People are a tile
      // and a half tall, so a head overlaps the tile behind it, and whoever is
      // further down the screen is in front: sorting by where the feet are is
      // what makes walking behind someone look like walking behind them.
      const actors = new Container()
      actors.sortableChildren = true
      // Door signs are fixed to the buildings, so people walk in front of them.
      const signs = new Container()
      // Captions go over everybody, so a name is never hidden behind a head.
      const overlay = new Container()
      // Bottom up: tiles, objects, the light map, what glows, door signs,
      // people, the fronts of objects and what of them glows, captions. A name
      // over a clerk sorts above their own counter, and a door's sign is read
      // above the dark rather than lost in it.
      world.sortableChildren = true
      signs.zIndex = LAYER.signs
      actors.zIndex = LAYER.actors
      overlay.zIndex = LAYER.captions
      world.addChild(signs, actors, overlay)

      const player = new GridPlayer(playerStart.col, playerStart.row, { figure: HERO_FIGURE })
      const npcs = interactables.map((cfg) => new Npc(cfg))
      actors.addChild(player.sprite, ...npcs.map((n) => n.sprite))
      // Names are not hung over everybody all the time — a street of floating
      // captions reads as a debug view. A name shows over whoever you are
      // standing next to, which is the person "E" would talk to.
      // The whole world is scaled up, which would blow the captions up with it;
      // counter-scale them so they stay a readable size.
      for (const npc of npcs) {
        npc.label.scale.set(1 / zoom)
        const anchor = npc.captionAnchor()
        npc.label.position.set(anchor.x, anchor.y - 1)
        overlay.addChild(npc.label)
      }
      // Signs over the doors. Every exit already carried a label in the content —
      // "Card Room", "Menswear", "Auto Row" — and none of it was ever drawn, so a
      // boulevard was six identical brown rectangles and the only way to find out
      // which was which was to walk into each one. Signposts, so always shown.
      // Each is lettered on a small dark plate with a lit rim, so it reads
      // against a pale fanlight or a busy sign as well as against brick.
      for (const exit of exits) {
        if (exit.signed === false) continue
        const sign = new Container()
        const words = new Text({
          text: exit.label,
          style: {
            fill: '#f6e6b8',
            fontSize: 10,
            fontFamily: 'monospace',
            stroke: { color: '#0c0c14', width: 2, join: 'round' },
          },
        })
        words.anchor.set(0.5, 1)
        const plate = new Graphics()
          .roundRect(-words.width / 2 - 4, -words.height - 2, words.width + 8, words.height + 3, 2)
          .fill({ color: 0x14121c, alpha: 0.86 })
          .stroke({ color: 0xc8a860, width: 1, alpha: 0.9 })
        sign.addChild(plate, words)
        sign.scale.set(1 / zoom)
        sign.position.set(exit.col * TILE_SIZE + TILE_SIZE / 2, exit.row * TILE_SIZE - 2)
        signs.addChild(sign)
      }

      let hunter: GridPlayer | null = null
      let alert: Sprite | null = null
      if (chaser) {
        hunter = new GridPlayer(chaser.col, chaser.row, { figure: chaser.figure ?? COLLECTOR_FIGURE, speedPxPerSec: 150 })
        actors.addChild(hunter.sprite)
        // A "!" over his head instead of a name: he has seen you.
        alert = new Sprite(alertBubbleTexture())
        alert.anchor.set(0.5, 1)
        overlay.addChild(alert)
      }
      instance.stage.addChild(world)

      // Everybody standing in the street is lit by what they stand in: a
      // lamp's pool, a shop window's spill, or the blue of the night.
      const people = () => [player.sprite, ...npcs.map((n) => n.sprite), ...(hunter ? [hunter.sprite] : [])]
      // After dark, everybody (not the signs and gulls) has a rim of moonlight
      // round them, so a dark coat on a dark road is still a person.
      const figures = () => [player.sprite, ...npcs.filter((n) => n.isPerson).map((n) => n.sprite), ...(hunter ? [hunter.sprite] : [])]
      const rims = new Map<Container, Sprite>()
      const rimOf = (person: Container) => {
        let rim = rims.get(person)
        if (!rim) {
          rim = new Sprite()
          rim.anchor.set(0, 1)
          rims.set(person, rim)
          actors.addChild(rim)
        }
        return rim
      }
      let lit: PeriodLight | null = null
      const applyLight = (next: PeriodLight | null) => {
        lit = next
        lightMap?.setPeriod(next)
        const lamps = !!next && next.lamps > 0
        stampScene.litUnder.visible = lamps
        stampScene.litOver.visible = lamps
        // The fronts of things are drawn over the people, so over the light map
        // too; they take the hour's colour as a tint instead.
        stampScene.over.tint = next ? parseInt(next.ambient.slice(1), 16) : 0xffffff
        if (!next) for (const sprite of people()) sprite.tint = 0xffffff
        if (!lamps) for (const rim of rims.values()) rim.visible = false
      }
      applyLightRef.current = applyLight
      applyLight(lightRef.current)

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
        const nextCol = player.col + dc
        const nextRow = player.row + dr

        // Off the side of the map and onto the neighbouring one. The player keeps
        // their position along the shared edge, so a street carries on in a
        // straight line rather than restarting somewhere arbitrary.
        const edge: Edge | null =
          nextRow < 0 ? 'north'
          : nextRow >= map.length ? 'south'
          : nextCol < 0 ? 'west'
          : nextCol >= map[0].length ? 'east'
          : null
        if (edge && openEdges?.[edge]) {
          player.face(direction)
          leaving = true
          onLeaveEdgeRef.current?.(edge, edge === 'north' || edge === 'south' ? player.col : player.row)
          return
        }

        const door = exits.find((e) => e.col === nextCol && e.row === nextRow)
        if (door) {
          // Face the door and stay put. The transition is the move.
          player.face(direction)
          leaving = true
          onExitRef.current?.(door)
          return
        }
        player.tryMove(direction, map, isOccupied)
      }

      /**
       * Somebody you speak to turns to look at you, and you at them — the
       * LeafGreen courtesy. Drawing only: who you can talk to is still decided by
       * standing next to them, exactly as before.
       */
      const meet = (npc: Npc, forMs?: number) => {
        npc.attend(player.col, player.row, forMs)
        const dc = npc.config.col - player.col
        const dr = npc.config.row - player.row
        player.face(dc > 0 ? 'right' : dc < 0 ? 'left' : dr > 0 ? 'down' : 'up')
      }

      const tryInteract = () => {
        if (talkingRef.current || pausedRef.current) return
        const adjacent = findAdjacent()
        if (!adjacent) return
        const interactable = interactablesRef.current.find((i) => i.id === adjacent.config.id)
        // A scripted event gets first refusal: it runs its own conversation,
        // because it has more to say than a text box and a callback.
        if (interactable?.onTalk?.()) {
          meet(adjacent, 6000)
          return
        }
        meet(adjacent)
        setTalkingId(adjacent.config.id)
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
      // Whoever was being talked to last frame, so they can be let go of when
      // the text box closes.
      let wasTalkingTo: string | null = null

      instance.ticker.add((ticker) => {
        elapsed += ticker.deltaMS
        // Idle life: a blink, a glance up the street. Whole frames, never a
        // sub-pixel drift — the art is on a grid and stays on it.
        for (const npc of npcs) npc.update(ticker.deltaMS)
        if (wasTalkingTo !== talkingRef.current) {
          npcs.find((n) => n.config.id === wasTalkingTo)?.release()
          wasTalkingTo = talkingRef.current
        }

        if (talkingRef.current || pausedRef.current) {
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

        if (hunter && !caught && !pausedRef.current) {
          sinceHunterStep += ticker.deltaMS
          if (sinceHunterStep >= stepMs && !hunter.moving) {
            sinceHunterStep = 0
            stepToward(hunter, player.col, player.row, map)
          }
          hunter.update(ticker.deltaMS)

          if (hunter.col === player.col && hunter.row === player.row) {
            caught = true
            onCaughtRef.current?.()
          }
        }
        if (hunter && alert) {
          // Over his hat, bobbing a whole art pixel at a time.
          const bob = Math.floor(elapsed / 260) % 2 === 0 ? 0 : 2
          alert.position.set(
            Math.round(hunter.pixelX + TILE_SIZE / 2),
            Math.round(hunter.pixelY - PERSON_RISE * 2 - bob),
          )
        }

        centerCamera()

        if (lit && lightMap) {
          for (const sprite of people()) {
            // Their feet, in art units: the bottom of their tile, a little in.
            // Nobody goes black, and you least of all.
            const floor = sprite === player.sprite ? 0.72 : 0.56
            sprite.tint = lightMap.tintAt((sprite.x + TILE_SIZE / 2) / 2, (sprite.y - 3) / 2, floor)
          }
          if (lit.lamps > 0) {
            for (const person of figures()) {
              const body = person instanceof Sprite ? person : (person.children[0] as Sprite | undefined)
              const rim = rimOf(person)
              const texture = body && body.visible && person.visible ? rimTexture(body.texture) : null
              rim.visible = !!texture
              if (!texture || !body) continue
              rim.texture = texture
              const bx = person === body ? person.x : person.x + body.x
              const by = person === body ? person.y : person.y + body.y
              rim.position.set(bx - RIM_PAD, by + RIM_PAD)
              rim.zIndex = person.zIndex - 0.5
              rim.alpha = lit.lamps >= 1 ? 0.7 : 0.3
            }
          }
        }

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

        const adjacent = talkingRef.current ? undefined : findAdjacent()
        for (const npc of npcs) npc.label.visible = npc === adjacent && npc.config.labelled !== false
        if (adjacent) {
          // Standing right behind somebody, your head is where their name would
          // go; lift it over both of you.
          const anchor = adjacent.captionAnchor()
          const behindThem = player.col === adjacent.config.col && player.row === adjacent.config.row - 1
          const playerTop = player.pixelY - PERSON_RISE * 2 + 4
          adjacent.label.position.set(anchor.x, (behindThem ? Math.min(anchor.y, playerTop) : anchor.y) - 1)
        }
        setPrompt(adjacent ? adjacent.config.name : null)
      })
    })()

    return () => {
      cancelled = true
      window.removeEventListener('keydown', keydown)
      window.removeEventListener('keyup', keyup)
      lightMapToFree?.destroy()
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
      // Which light the street is in, for the browser suite: 'day' indoors and in the morning.
      data-light={light && period !== 'morning' ? period : 'day'}
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
