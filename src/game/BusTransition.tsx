import { useEffect, useMemo, useRef, useState } from 'react'
import { Application, Container, Graphics, Sprite, Texture } from 'pixi.js'
import { buildStampScene, buildTileLayer, LAYER, TILE_SIZE } from '../overworld/tileRenderer'
import { LightMap, townLight } from '../overworld/lighting'
import { personFrames, type Figure } from '../overworld/characterArt'
import { lookFromId } from '../overworld/casting'
import {
  BUS_H,
  BUS_W,
  BUS_WINDOWS,
  DRIVER_WINDOW,
  WHEEL_SIZE,
  WHEEL_TOP,
  WHEEL_XS,
  drawBusBody,
  drawBusGlass,
  drawBusInterior,
  drawBusWheel,
  drawSeatTops,
} from '../overworld/art/busArt'
import { AREAS } from '../world/cities'
import { PERIOD_LIGHT, type TimePeriod } from './time'
import { HOME_ROAD, companionsOf, paintArt, roadRows, seatRiders, themeOfArea } from './busRide'
import { PxButton } from './pixel/ui'
import { PixelText } from './pixel/PixelText'
import { INK } from './pixel/ink'
import { frameStyle, type FrameSpec } from './pixel/frame'
import { buttonHeight } from './tableLayout'
import { useViewport } from './useViewport'
import { useMenuKeys } from './keys'

/**
 * The 14, on the road.
 *
 * A side-on shot of the bus running along the road into the town you are going
 * to, drawn from the same code as the street: the road's own tiles and objects
 * scroll past a tile at a time, in the hour's light, and in the bus's windows
 * sit you, whoever is riding with you, and a few strangers — the same sprites
 * that walk about the town. The destination is on a board in the corner, as it
 * is on the front of a bus, and the caption is the line about the ride.
 *
 * It ends on its own after a few seconds. A ride a beat put you on has no skip
 * and no end of its own: the beat ends it once what is said on the way is said.
 */

interface BusTransitionProps {
  /** Where the bus is going, for the destination board. */
  destination?: string
  /** A line about the ride. */
  caption?: string
  /** Called when the ride is over. A forced ride has no end of its own: the beat that started it ends it. */
  onArrive?: () => void
  /** Character ids of the people riding with you, sat either side of you. */
  companions?: string[]
  /**
   * A ride a beat put you on. Nobody gets off it early: there is no skip
   * button, and it does not end by itself — the beat ends it once what is said
   * on the way has been said.
   */
  forced?: boolean
  /** The road out of the window: an area with road from side to side (see `rideRoad`). */
  road?: string
  /** The hour, for the light. */
  period?: TimePeriod
}

/** How long the ride lasts. Long enough to feel like distance, short enough to sit through. */
const RIDE_MS = 4200
/** How fast the road goes by, in tiles a second. */
const TILES_PER_SECOND = 5
/** Canvas pixels per art unit in the world: 16-unit art on a 32px tile. */
const ART = TILE_SIZE / 16

/** The destination board: black, with an amber edge, like the blind on the front of a bus. */
const BOARD_FRAME: FrameSpec = {
  rings: ['#141418', '#b8862a', '#3a2c14'],
  lower: ['#141418', '#8a6420', '#2a200e'],
  fill: '#0c0c10',
  radius: 2,
}
/** The caption: the dark text box the rest of the game's boxes are. */
const CAPTION_FRAME: FrameSpec = {
  rings: ['#141418', '#6a7cb8', '#3a4778'],
  lower: ['#141418', '#44518a', '#283058'],
  fill: 'rgba(14, 16, 26, 0.94)',
  radius: 3,
}
const TRACK_FRAME: FrameSpec = { rings: ['#141418', '#2c3352'], fill: '#10121c', radius: 1 }

function textureOf(canvas: HTMLCanvasElement): Texture {
  const texture = Texture.from(canvas)
  texture.source.scaleMode = 'nearest'
  return texture
}

export function BusTransition({
  destination,
  caption,
  onArrive,
  companions = [],
  forced = false,
  road = HOME_ROAD,
  period = 'morning',
}: BusTransitionProps) {
  const [done, setDone] = useState(false)
  const view = useViewport()
  // Off once: the timer and the button, or a double click on it, are one stop.
  const arrived = useRef(false)
  const arrive = () => {
    if (arrived.current || !onArrive) return
    arrived.current = true
    onArrive()
  }
  const host = useRef<HTMLDivElement>(null)
  const overlay = useRef<HTMLDivElement>(null)
  const companionKey = companions.join(',')
  const riding = useMemo(() => companionsOf(companionKey ? companionKey.split(',') : []), [companionKey])
  const riders = useMemo(() => seatRiders(riding, `${road}:${destination ?? ''}`), [riding, road, destination])

  useEffect(() => {
    const timer = window.setTimeout(() => setDone(true), RIDE_MS)
    return () => window.clearTimeout(timer)
  }, [])

  // Arriving is automatic; the button is there for anyone who would rather not
  // wait, which is the same bargain the table makes between hands.
  useEffect(() => {
    if (!done || forced || !onArrive) return
    const timer = window.setTimeout(arrive, 450)
    return () => window.clearTimeout(timer)
  }, [done])

  // Space, E or Enter step off, as the button does; a forced ride has no button.
  useMenuKeys(overlay, { active: !forced })

  useEffect(() => {
    const container = host.current
    if (!container) return
    let app: Application | null = null
    let cancelled = false
    const lightMaps: LightMap[] = []
    const made: Texture[] = []
    const make = (canvas: HTMLCanvasElement) => {
      const texture = textureOf(canvas)
      made.push(texture)
      return texture
    }

    ;(async () => {
      const area = AREAS[road]?.area ?? AREAS[HOME_ROAD].area
      const instance = new Application()
      await instance.init({
        background: area.background,
        resizeTo: container,
        antialias: false,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      })
      if (cancelled) {
        instance.destroy(true)
        return
      }
      app = instance
      instance.canvas.setAttribute('data-testid', 'bus-canvas')
      container.appendChild(instance.canvas)

      const zoom = instance.screen.width < 560 ? 1 : 2
      const theme = themeOfArea(road)
      const light = townLight(theme, PERIOD_LIGHT[period])
      const lamps = !!light && light.lamps > 0
      const ambient = light ? parseInt(light.ambient.slice(1), 16) : 0xffffff
      const map = area.map
      const mapW = map[0].length * TILE_SIZE
      const mapH = map.length * TILE_SIZE

      // The road, as many times side by side as it takes to cover the screen
      // with one to spare, so it can run past for as long as the ride lasts.
      const world = new Container()
      world.scale.set(zoom)
      const copies = Math.ceil(instance.screen.width / (mapW * zoom)) + 1
      for (let k = 0; k < copies; k++) {
        const strip = buildTileLayer(map, theme)
        strip.sortableChildren = true
        const stamps = buildStampScene(area.stamps ?? [])
        strip.addChild(stamps.under, stamps.over, stamps.litUnder, stamps.litOver)
        if (light) {
          const artW = map[0].length * (TILE_SIZE / 2)
          const artH = map.length * (TILE_SIZE / 2)
          const lightMap = new LightMap(artW, artH, stamps.lights, stamps.glow(artW, artH), 2)
          lightMap.sprite.zIndex = LAYER.lightMap
          strip.addChild(lightMap.sprite)
          lightMap.setPeriod(light)
          lightMaps.push(lightMap)
        }
        stamps.litUnder.visible = lamps
        stamps.litOver.visible = lamps
        stamps.over.tint = ambient
        strip.x = k * mapW
        world.addChild(strip)
      }
      instance.stage.addChild(world)

      // The bus, in layers: the cabin, the people in it, the seat tops in
      // front of them, the bodywork with its windows cut out, the glass, the
      // wheels.
      const bus = new Container()
      bus.scale.set(zoom)
      const interior = new Sprite(make(paintArt(BUS_W, BUS_H, (px) => drawBusInterior(px, lamps))))
      bus.addChild(interior)
      const people = new Container()
      bus.addChild(people)
      const seated = riders.map((rider) => {
        const frames = personFrames(rider.figure)
        const sprite = new Sprite(frames.upper[rider.facing])
        const w = BUS_WINDOWS[rider.window]
        sprite.position.set((w.x + w.w / 2 - 8) * ART, (w.y + 1) * ART)
        people.addChild(sprite)
        return { rider, sprite, frames, baseY: sprite.y }
      })
      const driver: Figure = {
        role: 'local',
        look: { ...lookFromId('the-14-driver', 'Driver'), hat: 'cap', hatColor: '#2c7d8e' },
      }
      const driverSprite = new Sprite(personFrames(driver).upper.right)
      driverSprite.position.set((DRIVER_WINDOW.x + DRIVER_WINDOW.w / 2 - 9) * ART, (DRIVER_WINDOW.y + 1) * ART)
      people.addChild(driverSprite)
      bus.addChild(new Sprite(make(paintArt(BUS_W, BUS_H, (px) => drawSeatTops(px, lamps)))))
      const body = new Sprite(make(paintArt(BUS_W, BUS_H, (px) => drawBusBody(px, undefined, lamps))))
      bus.addChild(body)
      bus.addChild(new Sprite(make(paintArt(BUS_W, BUS_H, (px) => drawBusGlass(px, lamps)))))
      const wheelFrames = [0, 1, 2].map((f) => make(paintArt(WHEEL_SIZE, WHEEL_SIZE, (px) => drawBusWheel(px, f))))
      const wheels = WHEEL_XS.map((x) => {
        const wheel = new Sprite(wheelFrames[0])
        wheel.position.set(x * ART, WHEEL_TOP * ART)
        bus.addChild(wheel)
        return wheel
      })
      // After dark the bodywork takes the hour's colour, as everything in the
      // street does; the cabin is lit from inside and keeps its own.
      body.tint = ambient
      for (const wheel of wheels) wheel.tint = ambient
      if (!lamps) {
        interior.tint = ambient
        people.tint = ambient
      }
      // Headlamps on the road ahead, once the lamps are lit.
      if (lamps) {
        const beam = new Graphics()
        const fx = (BUS_W - 1) * ART
        beam
          .poly([fx, 30 * ART, fx + 70 * ART, 22 * ART, fx + 70 * ART, 50 * ART, fx, 34 * ART])
          .fill({ color: 0xfff0b0, alpha: 0.22 })
        beam.blendMode = 'add'
        bus.addChildAt(beam, 0)
      }
      instance.stage.addChild(bus)

      // What stands on the near pavement — a lamp post, a sign — is in front
      // of the bus, so it is drawn again over it, in the hour's colour.
      const rows = roadRows(road)
      const lastRoad = rows.length > 0 ? rows[rows.length - 1] : 7
      const near = (area.stamps ?? []).filter((s) => s.row === lastRoad + 1)
      const front = new Container()
      front.scale.set(zoom)
      if (near.length > 0) {
        for (let k = 0; k < copies; k++) {
          const stamps = buildStampScene(near)
          const strip = new Container()
          strip.sortableChildren = true
          strip.addChild(stamps.under, stamps.over, stamps.litUnder, stamps.litOver)
          stamps.under.tint = ambient
          stamps.over.tint = ambient
          stamps.litUnder.visible = lamps
          stamps.litOver.visible = lamps
          strip.x = k * mapW
          front.addChild(strip)
        }
      }
      instance.stage.addChild(front)

      // Where the bus sits: on the nearer lane, wheels on its kerb side, in
      // the middle of the screen; the road is placed under it.
      const kerb = ((rows.length > 0 ? rows[rows.length - 1] : 7) + 1) * TILE_SIZE - 3 * ART
      const busTop = kerb - (WHEEL_TOP + WHEEL_SIZE) * ART
      const screenW = instance.screen.width
      const screenH = instance.screen.height
      let worldY = Math.round(screenH / 2 - (busTop + BUS_H) * zoom)
      if (mapH * zoom >= screenH) worldY = Math.min(0, Math.max(screenH - mapH * zoom, worldY))
      else worldY = Math.round((screenH - mapH * zoom) / 2)
      world.y = worldY
      front.y = worldY
      const busX = Math.round((screenW - BUS_W * ART * zoom) / 2)
      bus.position.set(busX, worldY + busTop * zoom)
      const busY = bus.y

      const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
      const speed = (still ? 2 : TILES_PER_SECOND) * TILE_SIZE
      let travelled = 0
      let elapsed = 0
      instance.ticker.add((ticker) => {
        elapsed += ticker.deltaMS
        travelled += (speed * ticker.deltaMS) / 1000
        // A whole art pixel at a time, as everything in the street moves.
        const step = Math.floor(travelled / ART) * ART
        world.x = -(step % mapW) * zoom
        front.x = world.x
        const turn = Math.floor(step / (5 * ART)) % 3
        for (const wheel of wheels) wheel.texture = wheelFrames[turn]
        if (still) return
        // The road comes up through the bus: a bump every so often, and the
        // people in it a beat behind, each in their own time.
        const bump = Math.floor(elapsed / 140) % 5 === 0 ? ART : 0
        bus.y = busY + bump * zoom
        for (const { rider, sprite, frames, baseY } of seated) {
          const bob = Math.floor((elapsed + rider.phase * 110) / 280) % 2 === 0 ? 0 : ART
          sprite.y = baseY + bob
          // You and the people with you blink now and then; strangers face front.
          if (rider.facing === 'down') {
            const blink = (Math.floor(elapsed / 100) + rider.phase * 7) % 38 === 0
            sprite.texture = blink ? frames.upperBlink.down : frames.upper.down
          }
        }
      })
    })()

    return () => {
      cancelled = true
      for (const lightMap of lightMaps) lightMap.destroy()
      app?.destroy(true, { children: true })
      for (const texture of made) texture.destroy(true)
    }
  }, [road, period, riders])

  const scale = view.w < 700 || view.h < 600 ? 2 : 3
  // Clear of the ☰ and the speaker in the top right corner.
  const boxW = Math.min(view.w - 32, 460)
  const boardW = Math.min(boxW, view.w - 132)
  const names = riding.map((r) => r.character.name)

  return (
    <div
      data-testid="bus-ride"
      data-forced={forced || undefined}
      data-road={road}
      data-riders={JSON.stringify(riders.map((r) => ({ window: r.window, who: r.characterId ?? (r.figure.role === 'player' ? 'you' : 'stranger') })))}
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        boxSizing: 'border-box',
        overflow: 'hidden',
        background: '#0a0d16',
      }}
    >
      <div ref={host} style={{ position: 'absolute', inset: 0 }} />

      <div
        ref={overlay}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          padding: 'max(12px, env(safe-area-inset-top)) 16px max(12px, env(safe-area-inset-bottom))',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'grid', gap: 8, justifyItems: 'start', maxWidth: boxW }}>
          {/* The board on the front of the bus: the number and where it is going. */}
          <div
            data-testid="bus-destination"
            style={{ ...frameStyle(BOARD_FRAME, scale), padding: `${2 * scale}px ${4 * scale}px`, display: 'flex', gap: 4 * scale, alignItems: 'flex-start', maxWidth: boardW }}
          >
            <PixelText text="14" scale={scale} ink={{ color: '#ffb030', shadow: '#4a2a08' }} />
            <PixelText
              text={(destination ?? 'Out of town').toUpperCase()}
              scale={scale}
              wrap
              ink={{ color: '#ffd060', shadow: '#4a2a08' }}
            />
          </div>
          <div style={{ ...frameStyle(CAPTION_FRAME, scale), padding: `${3 * scale}px ${4 * scale}px`, display: 'grid', gap: 2 * scale, width: '100%' }}>
            <PixelText text={caption ?? 'The window is cold. The town goes past.'} scale={scale === 3 ? 2 : scale} wrap />
            {names.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 * scale, alignItems: 'center' }}>
                <PixelText text="Riding with" scale={scale === 3 ? 2 : scale} ink={INK.dim} />
                {names.map((name) => (
                  <span key={name} data-testid="bus-companion" title={name} style={{ display: 'inline-flex' }}>
                    <PixelText text={name} scale={scale === 3 ? 2 : scale} ink={INK.gold} />
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {!forced && (
          <div style={{ display: 'grid', gap: 8, justifyItems: 'center', pointerEvents: 'auto' }}>
            <div style={{ ...frameStyle(TRACK_FRAME, 2), width: 'min(320px, 70vw)', height: 10 }}>
              <div className="deal-countdown" style={{ height: '100%', background: '#ffd060', animationDuration: `${RIDE_MS}ms` }} />
            </div>
            <PxButton
              testId="bus-skip"
              lines={[done ? 'Step off' : 'Skip the ride']}
              scale={2}
              role={done ? 'primary' : 'plain'}
              height={buttonHeight(1, 2, view.coarse)}
              onClick={arrive}
            />
          </div>
        )}
      </div>
    </div>
  )
}
