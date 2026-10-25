import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Application, Container, Graphics, Sprite, Text } from 'pixi.js'
import { buildStampScene, buildTileLayer, isWalkable, LAYER, TILE_SIZE, type TileGrid } from './tileRenderer'
import { LightMap, townLight } from './lighting'
import { RIM_PAD, rimTexture } from './rimLight'
import { PERIOD_LIGHT, type PeriodLight, type TimePeriod } from '../game/time'
import type { PlacedStamp } from '../world/stamps'
import { DELTAS, GridPlayer, type Direction } from './GridPlayer'
import { Npc, type NpcConfig } from './Npc'
import { SeatedPerson, sitterOrigin, type SeatedConfig } from './sitters'
import { STAMP_BY_ID, seatTile } from '../world/stamps'
import { COLLECTOR_FIGURE, HERO_FIGURE } from './casting'
import { alertBubbleTexture } from './objectArt'
import { PERSON_RISE, figureKey, type Figure } from './characterArt'
import { DialogueBox } from '../game/DialogueBox'
import { TouchControls, useIsTouchDevice } from './TouchControls'
import { cameraOffset } from './camera'
import type { Edge } from '../world/types'
import { Minimap } from './Minimap'
import { pathBeside, pathTo, type Tile } from './paths'

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

/**
 * A movement a beat has asked the street for. The scene walks it, and says
 * when it has landed — and where, when it was "next to the player".
 */
export interface SceneCue {
  id: number
  /** `'player'`, or the id of the interactable who walks. */
  who: string
  to: Tile | 'player'
  /** CSS-free speed: art pixels a second, at the map's own scale. */
  speed: number
  /** The player walks a step behind them. */
  youFollow: boolean
  /** Gone once they get there. */
  leaves: boolean
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
  /** People sitting at the tables among those objects. Scenery: they take their tile, and say nothing. */
  seated?: SeatedConfig[]
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
   * walk in is not read while you walk straight out the other side. Nobody but
   * whoever the beat itself is walking (`cues`).
   */
  paused?: boolean
  /** Movements a beat has asked for, played in order of id. */
  cues?: SceneCue[]
  /** A cue has landed; `at` is where, for somebody who walked up to the player. */
  onCueDone?: (id: number, at?: Tile) => void
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
  seated = [],
  chaser,
  onCaught,
  exits = [],
  onExit,
  areaName = '',
  theme = 'default',
  openEdges,
  onLeaveEdge,
  paused = false,
  cues,
  onCueDone,
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
  const onCueDoneRef = useRef(onCueDone)
  onCueDoneRef.current = onCueDone
  const cuesRef = useRef(cues ?? [])
  cuesRef.current = cues ?? []
  // Set once the Pixi scene is up: bring the people on the map in line with the
  // list, and start whatever walks a beat has asked for. Until then, no-ops —
  // the scene catches up with both as soon as it is built.
  const syncPeopleRef = useRef<(list: Interactable[]) => void>(() => {})
  const playCuesRef = useRef<(list: SceneCue[]) => void>(() => {})
  const syncSeatedRef = useRef<(list: SeatedConfig[]) => void>(() => {})
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

  // People come and go while you stand here: a beat brings somebody on, walks
  // them to you, and they leave. The street follows the list.
  useEffect(() => {
    syncPeopleRef.current(interactables)
    syncSeatedRef.current(seated)
    playCuesRef.current(cues ?? [])
  })

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
      actors.addChild(player.sprite)
      // Everybody standing on the map. Not fixed: a beat can bring somebody on
      // and walk them off again (see `syncPeople`).
      const npcs: Npc[] = []
      // Everybody sitting at a table: see `syncSeated`.
      const sitters: SeatedPerson[] = []
      // Names are not hung over everybody all the time — a street of floating
      // captions reads as a debug view. A name shows over whoever you are
      // standing next to, which is the person "E" would talk to.
      // The whole world is scaled up, which would blow the captions up with it;
      // counter-scale them so they stay a readable size.
      const addNpc = (cfg: Interactable) => {
        const npc = new Npc({ ...cfg })
        npcs.push(npc)
        actors.addChild(npc.sprite)
        npc.label.scale.set(1 / zoom)
        const anchor = npc.captionAnchor()
        npc.label.position.set(anchor.x, anchor.y - 1)
        overlay.addChild(npc.label)
        return npc
      }
      const removeNpc = (npc: Npc) => {
        const at = npcs.indexOf(npc)
        if (at >= 0) npcs.splice(at, 1)
        npc.sprite.destroy({ children: true })
        npc.label.destroy()
      }
      for (const cfg of interactables) addNpc(cfg)
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
      const people = () => [
        player.sprite,
        ...npcs.map((n) => n.sprite),
        ...sitters.map((s) => s.sprite),
        ...(hunter ? [hunter.sprite] : []),
      ]
      // After dark, everybody (not the signs and gulls) has a rim of moonlight
      // round them, so a dark coat on a dark road is still a person.
      const figures = () => [
        player.sprite,
        ...npcs.filter((n) => n.isPerson).map((n) => n.sprite),
        ...sitters.map((s) => s.sprite),
        ...(hunter ? [hunter.sprite] : []),
      ]
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

      // People sitting at the tables. Scenery, but they follow the list as the
      // people standing about do: a beat that stands somebody in a chair finds
      // it empty.
      const syncSeated = (list: SeatedConfig[]) => {
        const wanted = new Map(list.map((cfg) => [cfg.sitter.id, cfg]))
        for (const sitter of [...sitters]) {
          const cfg = wanted.get(sitter.config.sitter.id)
          if (cfg && figureKey(cfg.figure) === figureKey(sitter.config.figure)) continue
          sitters.splice(sitters.indexOf(sitter), 1)
          rims.get(sitter.sprite)?.destroy()
          rims.delete(sitter.sprite)
          sitter.sprite.destroy({ children: true })
        }
        for (const cfg of list) {
          if (sitters.some((s) => s.config.sitter.id === cfg.sitter.id)) continue
          const sitter = new SeatedPerson(cfg)
          sitters.push(sitter)
          actors.addChild(sitter.sprite)
        }
      }
      syncSeated(seated)
      syncSeatedRef.current = syncSeated
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
      const npcAt = (col: number, row: number, except?: Npc) =>
        npcs.some((n) => n !== except && n.config.col === col && n.config.row === row) ||
        sitters.some(({ config: { sitter } }) => sitter.col === col && sitter.row === row)
      const isOccupied = (col: number, row: number) =>
        npcAt(col, row) || (hunter !== null && hunter.col === col && hunter.row === row)
      const isDoorTile = (col: number, row: number) => exits.some((e) => e.col === col && e.row === row)

      /** Brings the people on the map in line with the list: newcomers on, the departed off, the moved moved. */
      const syncPeople = (list: Interactable[]) => {
        const wanted = new Set(list.map((cfg) => cfg.id))
        for (const npc of [...npcs]) if (!wanted.has(npc.config.id) && !npc.walking) removeNpc(npc)
        for (const cfg of list) {
          const npc = npcs.find((n) => n.config.id === cfg.id)
          if (!npc) addNpc(cfg)
          else if (!npc.walking && (npc.config.col !== cfg.col || npc.config.row !== cfg.row)) npc.place(cfg.col, cfg.row)
        }
      }
      syncPeopleRef.current = syncPeople

      // A beat walking people about. One walk at a time is what the content
      // asks for, but nothing here depends on it.
      const started = new Set<number>()
      /** Where the player is being walked, a tile at a time, and what to say once there. */
      let playerWalk: { trail: Tile[]; leader: Npc | null; leaderHome: boolean; done: () => void } | null = null
      const towards = (from: Tile, to: Tile): Direction =>
        to.col > from.col ? 'right' : to.col < from.col ? 'left' : to.row > from.row ? 'down' : 'up'

      const startCue = (cue: SceneCue) => {
        started.add(cue.id)
        const report = (at?: Tile) => onCueDoneRef.current?.(cue.id, at)
        const here = { col: player.col, row: player.row }
        if (cue.who === 'player') {
          if (cue.to === 'player') return report()
          const path = pathTo(map, here, cue.to, (c, r) => isOccupied(c, r), isDoorTile)
          if (!path) {
            player.place(cue.to.col, cue.to.row)
            return report()
          }
          player.speedPxPerSec = cue.speed
          playerWalk = { trail: path, leader: null, leaderHome: true, done: () => report() }
          return
        }
        const npc = npcs.find((n) => n.config.id === cue.who)
        if (!npc) return report()
        const from = { col: npc.config.col, row: npc.config.row }
        const blocked = (c: number, r: number) => npcAt(c, r, npc) || (c === player.col && r === player.row)
        const path =
          cue.to === 'player'
            ? pathBeside(map, from, here, (c, r) => npcAt(c, r, npc), isDoorTile)
            : pathTo(map, from, cue.to, blocked, isDoorTile)
        const arrive = () => {
          if (cue.to === 'player') {
            // Face to face, as anybody does who has run to catch you up.
            npc.turn(towards({ col: npc.config.col, row: npc.config.row }, here))
            player.face(towards(here, { col: npc.config.col, row: npc.config.row }))
          }
          const at = { col: npc.config.col, row: npc.config.row }
          if (cue.leaves) removeNpc(npc)
          report(cue.leaves ? undefined : at)
        }
        if (!path) {
          // Nowhere to walk: stand them where they were going rather than hang the beat.
          if (cue.to !== 'player' && isWalkable(map, cue.to.col, cue.to.row)) npc.place(cue.to.col, cue.to.row)
          return arrive()
        }
        if (cue.youFollow) {
          player.speedPxPerSec = cue.speed
          const walk = { trail: [] as Tile[], leader: npc, leaderHome: false, done: arrive }
          playerWalk = walk
          npc.onStep = (left) => walk.trail.push(left)
          npc.walk(path, cue.speed, () => {
            npc.onStep = null
            walk.leaderHome = true
          })
          return
        }
        npc.walk(path, cue.speed, arrive)
      }
      playCuesRef.current = (list: SceneCue[]) => {
        for (const cue of [...list].sort((a, b) => a.id - b.id)) if (!started.has(cue.id)) startCue(cue)
      }

      /** One frame of the player being walked: the next tile of the trail, once the last step has landed. */
      const walkPlayer = () => {
        const walk = playerWalk
        if (!walk || player.moving) return
        const next = walk.trail[0]
        if (!next) {
          if (!walk.leaderHome) return
          playerWalk = null
          player.speedPxPerSec = PLAYER_SPEED
          walk.done()
          return
        }
        if (next.col === player.col && next.row === player.row) {
          walk.trail.shift()
          return
        }
        if (!player.isAdjacentTo(next.col, next.row)) {
          // Not a step away: find the way to it, through whoever is not in it.
          const way = pathTo(map, { col: player.col, row: player.row }, next, (c, r) => npcAt(c, r), isDoorTile)
          if (way && way.length > 0) walk.trail.splice(0, 1, ...way)
          else {
            player.place(next.col, next.row)
            walk.trail.shift()
          }
          return
        }
        player.tryMove(towards({ col: player.col, row: player.row }, next), map, (c, r) => npcAt(c, r))
        if (player.moving) walk.trail.shift()
        else {
          // Somebody in the way of a scripted walk: step through rather than stand there forever.
          player.place(next.col, next.row)
          walk.trail.shift()
        }
      }

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
        for (const sitter of sitters) sitter.update(ticker.deltaMS)
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
        walkPlayer()
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
        // Where the world is drawn on the canvas, so the browser suite can find
        // a tile's pixels.
        const view = `${world.x},${world.y},${zoom}`
        if (wrapper && wrapper.dataset.view !== view) wrapper.dataset.view = view
        // Where everybody is actually drawn, a tile at a time, so the suite can
        // watch somebody a beat is walking rather than only where they will end.
        if (wrapper) {
          const people = npcs
            .map((n) => `${n.config.id}@${Math.round(n.sprite.x / TILE_SIZE)},${Math.round(n.sprite.y / TILE_SIZE) - 1}`)
            .join(';')
          if (wrapper.dataset.people !== people) wrapper.dataset.people = people
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

      // Whatever arrived while the scene was being built.
      syncPeople(interactablesRef.current)
      playCuesRef.current(cuesRef.current)
    })()

    return () => {
      cancelled = true
      syncPeopleRef.current = () => {}
      syncSeatedRef.current = () => {}
      playCuesRef.current = () => {}
      window.removeEventListener('keydown', keydown)
      window.removeEventListener('keyup', keyup)
      lightMapToFree?.destroy()
      app?.destroy(true)
    }
  }, [])

  const talking = interactables.find((i) => i.id === talkingId) ?? null

  const chairs = useMemo(
    () =>
      (stamps ?? []).flatMap((table) =>
        (STAMP_BY_ID[table.stampId]?.seats ?? []).map((seat, index) => {
          const at = seatTile(seat)
          const origin = sitterOrigin(seat)
          const sitter = seated.find(
            ({ sitter: s }) => s.table.col === table.col && s.table.row === table.row && s.seat === index,
          )?.sitter
          return {
            stampId: table.stampId,
            table: [table.col, table.row],
            seat: index,
            facing: seat.facing,
            col: table.col + at.col,
            row: table.row + at.row,
            // The sitter's picture, and the cushion, in world pixels.
            x: (table.col * 16 + origin.x) * (TILE_SIZE / 16),
            y: (table.row * 16 + origin.y) * (TILE_SIZE / 16),
            seatY: (table.row * 16 + seat.y) * (TILE_SIZE / 16),
            taken: sitter ? (sitter.characterId ?? 'stranger') : null,
          }
        }),
      ),
    [stamps, seated],
  )

  return (
    <div
      ref={wrapperRef}
      data-testid="overworld"
      data-pois={JSON.stringify(
        interactables.map((i) => ({ id: i.id, name: i.name, col: i.col, row: i.row })),
      )}
      data-exits={JSON.stringify(exits)}
      // Every chair at every table, taken or not, and where its sitter is drawn
      // in world pixels: the browser suite compares a taken chair with an empty
      // one to see that somebody is really sitting there.
      data-chairs={JSON.stringify(chairs)}
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
                : interactables.some((i) => i.col === c && i.row === r) ||
                    seated.some(({ sitter }) => sitter.col === c && sitter.row === r)
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
      {/* Nothing to press while a beat has the screen: its own box says what to do. */}
      {prompt && !paused && (
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
      {isTouch && !talking && !paused && (
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

/** How fast the player walks under their own steam, which a scripted walk sets back. */
const PLAYER_SPEED = 220

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
