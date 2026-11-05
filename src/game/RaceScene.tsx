import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { mulberry32 } from '../engine/rng'
import { audio, playSound, type EngineVoice } from '../audio/audio'
import { CHARACTERS } from '../world/characters'
import { findItem } from '../world/content'
import { RACES, ownedCars, repairCost, tunedStats, type RaceDef } from '../world/racing'
import type { CarStats, ShopItemDef } from '../world/types'
import { MenuScreen, buttonStyle } from './MenuScenes'
import { drawText, measureText } from './pixel/font'
import { Raster, pack } from './pixel/raster'
import { TYPE, UI_FONT } from './pixel/webFont'
import { useCrispScale } from './useCrispScale'
import {
  emptyTally,
  placeOf,
  runOut,
  settle,
  startRace,
  stepRace,
  threatOf,
  topSpeedOf,
  type Driver,
  type Race,
  type Racer,
  type Settlement,
  type Tally,
} from './race'
import { buildTrack, nextCorner, shapeOf, type Severity, type TrackShape } from './raceTrack'
import { VIEW_H, VIEW_W, createView, drawRace, shade, type View } from './raceView'
import type { GameState } from './state'

/**
 * The street race: the road in front of you, bending and rising, with the wheel
 * under left and right, brake, and boost. The road, the traffic and the rivals
 * are `race.ts`; the picture is `raceView.ts`; this is the lobby, the controls,
 * the dials and the result.
 *
 * The bet is taken, the clock moves and a pink-slipped car leaves your garage
 * the moment the lights go (`onCommit`), so closing the tab on a bad start is
 * not a way out. What is paid back comes at the line (`onFinish`).
 */

const STEP = 1 / 60

export interface RaceCommit {
  stake: number
  /** The car put up on a pink slip, which leaves your garage until the race is decided. */
  slipCarId: string | null
}

export interface RaceOutcome {
  /** Cash back from the line: the stake and winnings, minus the repairs. */
  delta: number
  /** Cars to put in your garage: the prize, and your own back if you won it. */
  carsWon: string[]
}

type Phase = 'lobby' | 'countdown' | 'racing' | 'result'

interface Active {
  def: RaceDef
  stake: number
  car: ShopItemDef
  race: Race
  repair: number
  period: GameState['period']
  result?: Settlement
  /** The car's best speed and the player's damage, kept for the result screen. */
  topKmh: number
  damage: number
  time: number | null
  /** The road from above, for the minimap and the corner calls. */
  shape: TrackShape
  /** What hurt the car, and how much of it each cost. */
  log: Tally
  dmgBy: Tally
}

function ordinal(n: number): string {
  return n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`
}

function clock(t: number | null): string {
  if (t === null) return '--:--.-'
  const m = Math.floor(t / 60)
  const s = t - m * 60
  return `${m}:${s.toFixed(1).padStart(4, '0')}`
}

function statLine(stats: CarStats): string {
  return `Speed ${stats.topSpeed} · Handling ${stats.handling} · Grip ${stats.grip}`
}

function hashOf(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

/** The road of a race, the same every time. */
function trackOf(def: RaceDef) {
  return buildTrack(def.length, def.track, mulberry32(hashOf(def.id)))
}

function label(v: number, words: [string, string, string, string]): string {
  return v < 0.3 ? words[0] : v < 0.55 ? words[1] : v < 0.75 ? words[2] : words[3]
}

// --- the dials ---------------------------------------------------------------

const HUD_LIGHT = '#f4f0e0'
const HUD_DIM = '#8a8aa0'

function text(h: Raster, s: string, x: number, y: number, color = HUD_LIGHT, align: 'l' | 'c' | 'r' = 'l') {
  const w = measureText(s)
  drawText(h, s, align === 'l' ? x : align === 'c' ? Math.round(x - w / 2) : x - w, y, color, '#0a0a14')
}

function bar(h: Raster, x: number, y: number, w: number, fill: number, color: string, back = '#10101c') {
  h.rect(x - 1, y - 1, w + 2, 6, '#05050c')
  h.rect(x, y, w, 4, back)
  h.rect(x, y, Math.round(w * Math.max(0, Math.min(1, fill))), 4, color)
  h.rect(x, y, Math.round(w * Math.max(0, Math.min(1, fill))), 1, shade(color, 1.35))
}

const SEVERITY = [
  { word: '', color: '#8ad48a' },
  { word: 'TIGHT ', color: '#ffc83a' },
  { word: 'HAIRPIN ', color: '#ff5a4a' },
] as const

const THREAT_WORDS: Record<string, string> = {
  traffic: 'TRAFFIC',
  car: 'CAR',
  wreck: 'WRECK',
  oil: 'OIL',
  cone: 'CONES',
}

function line(h: Raster, x0: number, y0: number, x1: number, y1: number, ink: string) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1)
  for (let i = 0; i <= n; i++) h.set(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), ink)
}

/** The road from above in the corner, with the corners marked and every car on it. */
function drawMinimap(h: Raster, a: Active, me: Racer) {
  const { shape, race } = a
  const bw = 86
  const bh = 44
  const x0 = VIEW_W - bw - 6
  const y0 = 18
  h.rect(x0 - 3, y0 - 3, bw + 6, bh + 6, pack('#05050c', 170))
  const scale = Math.min(bw / Math.max(shape.w, 0.01), bh / Math.max(shape.h, 0.01))
  const ox = x0 + (bw - shape.w * scale) / 2
  const oy = y0 + (bh - shape.h * scale) / 2
  const at = (i: number) => ({ x: ox + shape.points[i].x * scale, y: oy + shape.points[i].y * scale })
  for (let i = 1; i < shape.points.length; i++) {
    const p = at(i - 1)
    const q = at(i)
    line(h, p.x, p.y, q.x, q.y, shape.points[i].dist < me.dist ? '#f2c14e' : '#6a6a88')
  }
  for (const c of shape.corners) {
    const i = Math.min(shape.points.length - 1, Math.round(c.dist / (race.length / (shape.points.length - 1))))
    const p = at(i)
    h.rect(Math.round(p.x) - 1, Math.round(p.y) - 1, 3, 3, SEVERITY[c.severity].color)
  }
  const dot = (r: Racer, big: boolean) => {
    const i = Math.max(0, Math.min(shape.points.length - 1, Math.round((r.dist / race.length) * (shape.points.length - 1))))
    const p = at(i)
    const x = Math.round(p.x)
    const y = Math.round(p.y)
    if (big) {
      h.rect(x - 2, y - 2, 5, 5, '#f4f0e0')
      h.rect(x - 1, y - 1, 3, 3, r.paint)
    } else {
      h.rect(x - 1, y - 1, 3, 3, r.wrecked ? '#4a4a58' : r.paint)
    }
  }
  for (const r of race.racers) if (r !== me) dot(r, false)
  dot(me, true)
}

function drawHud(h: Raster, a: Active, me: Racer, view: View, dt: number, racing: boolean) {
  const race = a.race
  const place = placeOf(race, me.id)
  const kmh = Math.round(me.v * 3.6)
  const vFrac = me.v / topSpeedOf(me.stats)

  // Position and time.
  text(h, ordinal(place), 8, 6, place === 1 ? '#ffd23c' : HUD_LIGHT)
  text(h, `of ${race.racers.length}`, 8, 17, HUD_DIM)
  text(h, clock(racing ? race.t : 0), VIEW_W - 8, 6, HUD_LIGHT, 'r')

  // The whole road in a line, and who is where on it.
  const bx = 82
  const bw = VIEW_W - 164
  h.rect(bx, 10, bw, 2, '#05050c')
  h.rect(bx, 10, bw, 1, '#3a3a52')
  h.rect(bx + bw, 6, 1, 9, '#f4f0e0')
  for (const r of race.racers) {
    const px = bx + Math.round(bw * Math.max(0, Math.min(1, r.dist / race.length)))
    if (r !== me) h.rect(px - 1, 8, 3, 5, r.wrecked ? '#4a4a58' : r.paint)
  }
  const mx = bx + Math.round(bw * Math.max(0, Math.min(1, me.dist / race.length)))
  h.rect(mx - 2, 6, 5, 9, '#f4f0e0')
  h.rect(mx - 1, 7, 3, 7, me.paint)

  // Gaps to the cars either side of you.
  const others = race.racers.filter((r) => r !== me && !r.wrecked)
  const ahead = others.filter((r) => r.dist > me.dist).sort((a, b) => a.dist - b.dist)[0]
  const behind = others.filter((r) => r.dist <= me.dist).sort((a, b) => b.dist - a.dist)[0]
  const gap = (d: number) => `${(d / Math.max(10, me.v)).toFixed(1)}s`
  if (ahead && racing) text(h, `${ahead.name} +${gap(ahead.dist - me.dist)}`, 8, 28, '#ff9a8a')
  if (behind && racing) text(h, `${behind.name} -${gap(me.dist - behind.dist)}`, 8, 39, '#8ad4ff')

  // Speed, the way a dash shows it: the number and a row of ticks that light up.
  text(h, String(kmh), 8, VIEW_H - 40, HUD_LIGHT)
  text(h, 'KM/H', 8 + measureText(String(kmh)) + 4, VIEW_H - 40, HUD_DIM)
  const ticks = 22
  for (let i = 0; i < ticks; i++) {
    const on = i / ticks < vFrac
    const hot = i > ticks * 0.8
    h.rect(8 + i * 4, VIEW_H - 28, 3, 6, on ? (hot ? '#ff5a3a' : '#f4d03c') : '#1c1c2c')
  }

  // Boost and damage.
  const bxr = VIEW_W - 94
  const ready = me.boost >= 0.35
  const flash = ready && Math.floor(view.tick / 8) % 2 === 0
  text(h, me.boosting ? 'BOOST' : ready ? 'BOOST [SHIFT]' : 'BOOST', bxr, VIEW_H - 41, me.boosting ? '#58e8ff' : flash ? '#ffffff' : HUD_DIM)
  bar(h, bxr, VIEW_H - 31, 86, me.boost, me.boosting ? '#58e8ff' : '#2a8ad8')
  text(h, 'DAMAGE', bxr, VIEW_H - 24, HUD_DIM)
  bar(h, bxr, VIEW_H - 14, 86, me.damage, me.damage > 0.66 ? '#ff4a3a' : me.damage > 0.33 ? '#f0a030' : '#48c860')

  drawMinimap(h, a, me)

  // The next corner, called as a rally co-driver would: how bad and how far.
  if (racing && !me.wrecked && me.finish === null) {
    const next = nextCorner(a.shape.corners, me.dist)
    if (next && next.away < 360) {
      const c = next.corner
      const sev = SEVERITY[c.severity as Severity]
      const label = `${sev.word}${c.dir > 0 ? 'RIGHT' : 'LEFT'} ${Math.round(next.away / 10) * 10}m`
      const w = measureText(label)
      const cx = Math.round(VIEW_W / 2 - 4)
      text(h, label, cx, 34, sev.color, 'c')
      // An arrow bent the way it turns.
      const ax = c.dir > 0 ? cx + w / 2 + 6 : cx - w / 2 - 12
      for (let r = 0; r < 4; r++) h.rect(c.dir > 0 ? ax + r : ax + 5 - r, 33 + r, 1, 7 - r * 2, sev.color)
    }
  }

  // What is about to hit you, with the time you have.
  const threat = racing ? threatOf(race, me) : null
  if (threat) {
    const what = THREAT_WORDS[threat.kind] ?? 'OBSTACLE'
    const danger = threat.level === 'danger'
    const blink = Math.floor(view.tick / 6) % 2 === 0
    if (danger && (threat.kind === 'traffic' || threat.kind === 'car' || threat.kind === 'wreck')) {
      text(h, `BRAKE! ${what} AHEAD`, VIEW_W / 2, 56, blink ? '#ff5a4a' : '#ffd0c8', 'c')
    } else if (danger) {
      text(h, `${what} - STEER AWAY`, VIEW_W / 2, 56, blink ? '#ffc83a' : '#fff0c0', 'c')
    } else {
      text(h, `${what} AHEAD`, VIEW_W / 2, 56, '#ffc83a', 'c')
    }
  }

  // Slipstream and slide.
  if (me.draft && racing) text(h, 'SLIPSTREAM', VIEW_W / 2, 24, '#8ad4ff', 'c')
  else if (me.slide > 0.1 && !me.wrecked && racing) text(h, 'SLIDING', VIEW_W / 2, 24, '#ffd23c', 'c')

  // What just happened.
  const m = view.messages[view.messages.length - 1]
  if (m) {
    m.t -= dt
    if (m.t > 0) text(h, m.text, VIEW_W / 2, 44, m.color, 'c')
    else view.messages.pop()
  }
}

// --- the scene ---------------------------------------------------------------

const card: CSSProperties = {
  border: '1px solid #2e2e40', borderRadius: 8, padding: 'clamp(10px, 3vw, 16px)', marginBottom: 12,
}

function Card({ children }: { children: ReactNode }) {
  return <div style={card}>{children}</div>
}

const SEV_COLOR = ['#8ad48a', '#ffc83a', '#ff5a4a']
const SEV_NAME = ['bend', 'tight corner', 'hairpin']

/**
 * The road from above, as it really runs, with its corners numbered in driving
 * order and coloured by how hard they are, and the climb underneath: what a
 * driver walks the course for before a race.
 */
function TrackMap({ def }: { def: RaceDef }) {
  const shape = useMemo(() => shapeOf(trackOf(def)), [def])
  const W = 320
  const pad = 16
  const maxH = 150
  const scale = Math.min((W - 2 * pad) / Math.max(shape.w, 0.01), (maxH - 2 * pad) / Math.max(shape.h, 0.01))
  const mapW = shape.w * scale
  const mapH = shape.h * scale
  const ox = (W - mapW) / 2
  const oy = pad
  const at = (i: number) => ({ x: ox + shape.points[i].x * scale, y: oy + shape.points[i].y * scale })
  const d = shape.points.map((_, i) => `${i ? 'L' : 'M'}${at(i).x.toFixed(1)} ${at(i).y.toFixed(1)}`).join(' ')
  const per = def.length / (shape.points.length - 1)
  const total = oy + mapH + pad
  // The profile.
  const profH = 30
  const lo = Math.min(...shape.heights)
  const range = Math.max(4, shape.relief)
  const hx = (i: number) => pad + (i / (shape.heights.length - 1)) * (W - 2 * pad)
  const hy = (v: number) => total + profH - 4 - ((v - lo) / range) * (profH - 10)
  const area = `M${hx(0)} ${total + profH - 2} ${shape.heights.map((v, i) => `L${hx(i).toFixed(1)} ${hy(v).toFixed(1)}`).join(' ')} L${hx(shape.heights.length - 1)} ${total + profH - 2} Z`
  const hairpins = shape.corners.filter((c) => c.severity === 2).length
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${total + profH + 4}`} width="100%" style={{ maxWidth: 360, display: 'block', background: '#0b0b14', borderRadius: 6 }} aria-label={`${def.track.name} from above`}>
        <path d={d} fill="none" stroke="#1c1c2c" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
        <path d={d} fill="none" stroke="#4a4a68" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        <path d={d} fill="none" stroke="#f2c14e" strokeWidth={1.4} strokeDasharray="5 4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={at(0).x} cy={at(0).y} r={5} fill="#48e070" />
        <text x={at(0).x} y={at(0).y - 9} fontSize={8} fill="#48e070" textAnchor="middle">START</text>
        {(() => {
          const end = at(shape.points.length - 1)
          return (
            <g>
              <rect x={end.x - 5} y={end.y - 5} width={10} height={10} fill="#f4f0e0" />
              <rect x={end.x - 5} y={end.y - 5} width={5} height={5} fill="#10101a" />
              <rect x={end.x} y={end.y} width={5} height={5} fill="#10101a" />
              <text x={end.x} y={end.y - 9} fontSize={8} fill="#f4f0e0" textAnchor="middle">FINISH</text>
            </g>
          )
        })()}
        {shape.corners.map((c) => {
          const p = at(Math.min(shape.points.length - 1, Math.round(c.dist / per)))
          return (
            <g key={c.n}>
              <circle cx={p.x} cy={p.y} r={6.5} fill={SEV_COLOR[c.severity]} stroke="#0b0b14" strokeWidth={1.5} />
              <text x={p.x} y={p.y + 3} fontSize={8.5} fontWeight="bold" fill="#10101a" textAnchor="middle">{c.n}</text>
            </g>
          )
        })}
        <path d={area} fill="#3a4a6a" opacity={0.7} />
        {shape.corners.map((c) => (
          <rect key={c.n} x={hx(Math.round(c.dist / per)) - 1} y={total + profH - 3} width={2} height={3} fill={SEV_COLOR[c.severity]} />
        ))}
        <text x={pad} y={total + 8} fontSize={7.5} fill="#8a8aa0">Elevation</text>
      </svg>
      <div style={{ color: '#9a9ab0', fontSize: TYPE.small, marginTop: 4 }}>
        {shape.corners.length} corners{hairpins ? ` (${hairpins} hairpin${hairpins > 1 ? 's' : ''})` : ''} · {Math.round(shape.climb)} m of climbing ·{' '}
        <span style={{ color: SEV_COLOR[0] }}>● bend</span> <span style={{ color: SEV_COLOR[1] }}>● tight</span> <span style={{ color: SEV_COLOR[2] }}>● hairpin</span>
        {shape.corners.some((c) => c.severity === 2) ? ` · ${SEV_NAME[2]} at ${shape.corners.filter((c) => c.severity === 2).map((c) => `T${c.n}`).join(', ')}: brake early` : ''}
      </div>
    </div>
  )
}

export function RaceScene({
  state,
  raceIds,
  onCommit,
  onFinish,
  onBack,
}: {
  state: GameState
  raceIds: string[]
  onCommit: (commit: RaceCommit) => void
  onFinish: (outcome: RaceOutcome) => void
  onBack: () => void
}) {
  const [phase, setPhase] = useState<Phase>('lobby')
  const [pickedCar, setPickedCar] = useState<string | null>(null)
  const active = useRef<Active | null>(null)
  const [done, setDone] = useState<Active | null>(null)
  const scene = useRef<HTMLCanvasElement>(null)
  const hud = useRef<HTMLCanvasElement>(null)
  const input = useRef({ left: false, right: false, brake: false, boost: false })
  const finished = useRef(false)
  const P = useCrispScale(VIEW_W, VIEW_H + 90, 4)

  const cars = useMemo(() => ownedCars(state.ownedItemIds), [state.ownedItemIds])
  const car = cars.find((c) => c.id === pickedCar) ?? cars[0] ?? null
  const races = raceIds.map((id) => RACES[id]).filter((r) => r !== undefined)

  const begin = (def: RaceDef, stake: number) => {
    if (!car?.car) return
    const mine: Driver = { id: 'you', name: 'You', stats: tunedStats(car.car, state.ownedItemIds), isPlayer: true, skill: 0 }
    const rivals = def.field.map<Driver>((d, i) => ({
      id: d.character,
      name: CHARACTERS[d.character]?.name ?? d.character,
      // Two of the same model should not be the same car: each is a shade off the showroom paint.
      stats: { ...findItem(d.carId)!.car!, paint: shade(findItem(d.carId)!.car!.paint, [0.72, 1.18, 0.55][i % 3]) },
      isPlayer: false,
      skill: d.skill,
    }))
    const race = startRace(
      def.length,
      def.traffic,
      def.track,
      [mine, ...rivals],
      mulberry32(Math.floor(Math.random() * 2 ** 31)),
      mulberry32(hashOf(def.id)),
    )
    active.current = {
      def, stake, car, race, repair: repairCost(car), period: state.period, topKmh: 0, damage: 0, time: null,
      shape: shapeOf(race.track), log: emptyTally(), dmgBy: emptyTally(),
    }
    finished.current = false
    input.current = { left: false, right: false, brake: false, boost: false }
    onCommit({ stake, slipCarId: def.pinkSlip ? car.id : null })
    setDone(null)
    setPhase('countdown')
  }

  // The road, the dials and the engine.
  useEffect(() => {
    if (phase !== 'countdown' && phase !== 'racing') return
    const a = active.current
    const el = scene.current
    const hudEl = hud.current
    if (!a || !el || !hudEl) return
    const c = el.getContext('2d')!
    c.imageSmoothingEnabled = false
    const me = a.race.racers.find((r) => r.isPlayer)!
    const view = createView()
    const dials = new Raster(VIEW_W, VIEW_H)
    const voice: EngineVoice | null = audio.engine()
    let frame = 0
    let last = performance.now()
    const began = last
    let acc = 0
    let beeped = 4
    let endedAt = -1
    let wreckedAt = -1
    let count = 0
    let going = false
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const since = (now - began) / 1000
      count++
      let countdown: number | null = null
      if (since < 3) {
        countdown = 3 - Math.floor(since)
        if (countdown !== beeped) {
          beeped = countdown
          playSound('chip')
        }
      } else {
        if (!going) {
          going = true
          playSound('deal')
          setPhase('racing')
        }
        countdown = since < 3.7 ? 0 : null
        acc += dt
        const key = {
          steer: (input.current.right ? 1 : 0) - (input.current.left ? 1 : 0),
          brake: input.current.brake,
          boost: input.current.boost,
        }
        while (acc >= STEP) {
          acc -= STEP
          stepRace(a.race, STEP, key)
        }
      }
      // Sound first, then the picture (which reads the same events and clears them).
      for (const e of me.events) {
        if (e.kind === 'hit' || e.kind === 'wall') voice?.impact(e.strength)
        else if (e.kind === 'wreck') voice?.impact(1)
        else if (e.kind === 'scrape') voice?.impact(0.2)
        else if (e.kind === 'nearMiss') playSound('check')
      }
      if (me.wrecked && wreckedAt < 0) wreckedAt = since
      voice?.set({
        speed: Math.min(1, me.v / topSpeedOf(me.stats)),
        throttle: me.braking || me.wrecked ? 0.1 : 1,
        slide: me.wrecked ? 0 : Math.max(me.slide, Math.abs(me.skid) * 0.5, me.oil > 0 ? 0.6 : 0),
        boost: me.boosting,
      })
      drawRace(c, a.race, me, view, { period: a.period, countdown, dt, time: since, wreckedFor: wreckedAt < 0 ? 0 : since - wreckedAt })
      if (count % 2 === 0) {
        dials.pixels.fill(0)
        drawHud(dials, a, me, view, dt * 2, going)
        dials.paint(hudEl)
      }
      a.topKmh = Math.max(a.topKmh, Math.round(me.topSpeed * 3.6))

      // A beat to see it happen, then the rest of the field finishes without you.
      if ((me.wrecked || me.finish !== null) && endedAt < 0) endedAt = a.race.t
      if (endedAt >= 0 && a.race.t - endedAt > (me.wrecked ? 2.4 : 1.8) && !finished.current) {
        finished.current = true
        voice?.stop()
        runOut(a.race)
        const result = settle(a.race, 'you', {
          stake: a.stake,
          pays: a.def.pays,
          pinkSlip: a.def.pinkSlip !== undefined,
          repair: a.repair,
        })
        a.result = result
        a.damage = me.damage
        a.log = { ...me.hitLog }
        a.dmgBy = { ...me.damageBy }
        a.time = me.finish
        const slip = a.def.pinkSlip
        onFinish({
          delta: result.payout - result.repairs,
          carsWon: slip && result.wonCar ? [slip.prizeCarId, a.car.id] : [],
        })
        playSound(result.place === 1 ? 'win' : 'fold')
        setDone(a)
        setPhase('result')
        return
      }
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(frame)
      voice?.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase === 'lobby' || phase === 'result'])

  // The wheel.
  useEffect(() => {
    if (phase !== 'countdown' && phase !== 'racing') return
    const set = (e: KeyboardEvent, down: boolean) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key
      if (k === 'ArrowLeft' || k === 'a' || k === 'A') input.current.left = down
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') input.current.right = down
      else if (k === ' ' || k === 'ArrowDown' || k === 's' || k === 'S') input.current.brake = down
      else if (k === 'Shift' || k === 'ArrowUp' || k === 'w' || k === 'W' || k === 'b' || k === 'B') input.current.boost = down
      else return
      e.preventDefault()
      e.stopPropagation()
    }
    const dn = (e: KeyboardEvent) => set(e, true)
    const up = (e: KeyboardEvent) => set(e, false)
    window.addEventListener('keydown', dn, true)
    window.addEventListener('keyup', up, true)
    return () => {
      window.removeEventListener('keydown', dn, true)
      window.removeEventListener('keyup', up, true)
    }
  }, [phase])

  if (phase === 'countdown' || phase === 'racing') {
    const hold = (key: 'left' | 'right' | 'brake' | 'boost') => ({
      onPointerDown: (e: React.PointerEvent) => {
        e.preventDefault()
        input.current[key] = true
      },
      onPointerUp: () => { input.current[key] = false },
      onPointerLeave: () => { input.current[key] = false },
      onPointerCancel: () => { input.current[key] = false },
    })
    const pad: CSSProperties = { ...buttonStyle, flex: 1, padding: '14px 0', fontSize: TYPE.large, touchAction: 'none', userSelect: 'none' }
    return (
      <div
        data-testid="race"
        style={{
          width: '100vw', minHeight: '100vh', background: '#07070d', color: '#e8e8f0', fontFamily: UI_FONT,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        <div style={{ position: 'relative', width: VIEW_W * P, height: VIEW_H * P }}>
          <canvas
            ref={scene}
            width={VIEW_W}
            height={VIEW_H}
            style={{ position: 'absolute', inset: 0, width: VIEW_W * P, height: VIEW_H * P, imageRendering: 'pixelated', touchAction: 'none' }}
          />
          <canvas
            ref={hud}
            data-testid="race-hud"
            width={VIEW_W}
            height={VIEW_H}
            style={{ position: 'absolute', inset: 0, width: VIEW_W * P, height: VIEW_H * P, imageRendering: 'pixelated', pointerEvents: 'none' }}
          />
        </div>
        <div style={{ width: VIEW_W * P, display: 'flex', gap: 8 }}>
          <button style={pad} aria-label="Steer left" {...hold('left')}>◀</button>
          <button style={pad} aria-label="Brake" {...hold('brake')}>Brake</button>
          <button style={{ ...pad, background: '#2a6ab8' }} aria-label="Boost" {...hold('boost')}>Boost</button>
          <button style={pad} aria-label="Steer right" {...hold('right')}>▶</button>
        </div>
        <div style={{ color: '#7a7a90', fontSize: TYPE.small }}>← → steer · Space brake · Shift boost</div>
      </div>
    )
  }

  if (phase === 'result' && done?.result) {
    const r = done.result
    const slip = done.def.pinkSlip
    const line = slip
      ? r.wonCar
        ? `You won ${findItem(slip.prizeCarId)?.name}. ${done.def.beatenLine}`
        : `You lost the ${done.car.name}. ${done.def.winLine}`
      : r.place === 1
        ? `You won $${Math.round(done.stake * done.def.pays).toLocaleString()}. ${done.def.beatenLine}`
        : r.wrecked
          ? 'You wrecked it. The bet is gone and the car is a bill.'
          : `${r.winner} won. Your $${done.stake.toLocaleString()} is gone.`
    return (
      <MenuScreen
        title={r.wrecked ? 'Wrecked' : `${ordinal(r.place)} of ${done.race.racers.length}`}
        subtitle={`${done.def.name} · Cash: $${state.cash.toLocaleString()}`}
        onBack={onBack}
        backLabel="Leave"
      >
        <Card>
          <div data-testid="race-result">{line}</div>
          <div style={{ color: '#9a9ab0', fontSize: TYPE.body, marginTop: 8 }}>
            {r.repairs > 0 ? `Repairs: $${r.repairs.toLocaleString()}. ` : 'Not a scratch on it. '}
            Top speed {done.topKmh} km/h · Damage {Math.round(done.damage * 100)}%
          </div>
          {(() => {
            const names: Record<keyof Tally, string> = { traffic: 'Rear-ended traffic', car: 'Contact with a car', wreck: 'Hit a wreck', wall: 'The wall', cone: 'Cones', oil: 'Oil (a skid, no damage)' }
            const rows = (Object.keys(names) as Array<keyof Tally>).filter((k) => done.log[k] > 0)
            return rows.length === 0 ? null : (
              <div style={{ fontSize: TYPE.body, marginTop: 10 }}>
                <div style={{ color: '#f2c14e', marginBottom: 4 }}>What hurt the car</div>
                {rows.map((k) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', color: '#c8c8d8' }}>
                    <span>{names[k]} ×{done.log[k]}</span>
                    <span>{k === 'oil' ? 'slid' : `${Math.round(done.dmgBy[k] * 100)}% of the car`}</span>
                  </div>
                ))}
              </div>
            )
          })()}
        </Card>
        <Card>
          <div style={{ color: '#f2c14e', marginBottom: 6 }}>Standings</div>
          {r.times.map((t, i) => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: TYPE.body, color: t.id === 'you' ? '#f4f0e0' : '#9a9ab0' }}>
              <span>{ordinal(i + 1)} {t.name}</span>
              <span>{t.wrecked ? 'wrecked' : clock(t.time)}</span>
            </div>
          ))}
        </Card>
        <button style={buttonStyle} onClick={() => { setPhase('lobby'); setPickedCar(null) }}>Back to the start line</button>
      </MenuScreen>
    )
  }

  // The start line.
  const rated = car?.car ? tunedStats(car.car, state.ownedItemIds) : null
  return (
    <MenuScreen title="Street races" subtitle={`Cash: $${state.cash.toLocaleString()} · a race takes a period of the day`} onBack={onBack} backLabel="Leave">
      {cars.length === 0 ? (
        <Card>
          <div>You need a car to race. Auto Row sells a beater; the dealers up the coast sell better.</div>
        </Card>
      ) : (
        <Card>
          <div style={{ color: '#f2c14e', marginBottom: 6 }}>Your car</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {cars.map((c) => (
              <button
                key={c.id}
                data-testid={`pick-${c.id}`}
                style={{ ...buttonStyle, outline: c.id === car?.id ? '2px solid #f2c14e' : 'none' }}
                onClick={() => setPickedCar(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
          {rated && car && (
            <div style={{ color: '#9a9ab0', fontSize: TYPE.body, marginTop: 8 }}>
              {statLine(rated)} · A wreck costs ${repairCost(car).toLocaleString()} to fix; every scrape costs a share of it
            </div>
          )}
        </Card>
      )}
      {races.map((def) => (
        <Card key={def.id}>
          <div>
            <div style={{ color: '#f2c14e' }}>{def.name}</div>
            <div style={{ color: '#9a9ab0', fontSize: TYPE.body, margin: '2px 0 6px' }}>
              {def.track.name} · {(def.length / 1000).toFixed(1)} km · {label(def.track.curviness, ['Flowing', 'Twisty', 'Tight', 'Brutal'])} · {label(def.track.hills, ['Flat', 'Rolling', 'Hilly', 'Mountainous'])}
            </div>
            <div style={{ color: '#9a9ab0', fontSize: TYPE.body, marginBottom: 6 }}>{def.blurb}</div>
            <div style={{ fontSize: TYPE.body, marginBottom: 10 }}>
              Against {def.field.map((d) => `${CHARACTERS[d.character]?.name ?? d.character} (${findItem(d.carId)?.name})`).join(', ')}
            </div>
            <TrackMap def={def} />
          </div>
          {def.pinkSlip ? (
            <div style={{ marginTop: 8 }}>
              <div style={{ color: '#ff9a8a', fontSize: TYPE.body, marginBottom: 8 }}>
                You put up {car ? `your ${car.name}` : 'your car'}. Win and you drive home in the {findItem(def.pinkSlip.prizeCarId)?.name}.
                Lose and yours is gone.
              </div>
              <button data-testid={`race-${def.id}`} style={car ? buttonStyle : { ...buttonStyle, opacity: 0.5 }} disabled={!car} onClick={() => begin(def, 0)}>
                Race for the pink slip
              </button>
            </div>
          ) : (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {def.stakes.map((stake) => {
                  const ok = car !== null && state.cash >= stake
                  return (
                    <button
                      key={stake}
                      data-testid={`race-${def.id}-${stake}`}
                      style={ok ? buttonStyle : { ...buttonStyle, opacity: 0.5 }}
                      disabled={!ok}
                      onClick={() => begin(def, stake)}
                    >
                      Bet ${stake.toLocaleString()}
                    </button>
                  )
                })}
              </div>
              <div style={{ color: '#7a7a90', fontSize: TYPE.small, marginTop: 6 }}>
                First place pays {def.pays}× your bet. Anything else loses it, and the damage to the car is a repair bill on top.
              </div>
            </div>
          )}
        </Card>
      ))}
    </MenuScreen>
  )
}
