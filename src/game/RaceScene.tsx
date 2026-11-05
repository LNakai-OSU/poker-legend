import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { mulberry32 } from '../engine/rng'
import { CHARACTERS } from '../world/characters'
import { findItem } from '../world/content'
import { RACES, ownedCars, repairCost, tunedStats, type RaceDef } from '../world/racing'
import type { CarStats, ShopItemDef } from '../world/types'
import { playSound } from '../audio/audio'
import { MenuScreen, buttonStyle } from './MenuScenes'
import { TYPE, UI_FONT } from './pixel/webFont'
import { useCrispScale } from './useCrispScale'
import {
  LANES,
  placeOf,
  runOut,
  settle,
  startRace,
  stepRace,
  type Driver,
  type Hazard,
  type Input,
  type Race,
  type Racer,
  type Settlement,
} from './race'
import type { GameState } from './state'

/**
 * The street race: a straight road seen from above, three lanes, your hands on
 * left, right and brake. Everything that happens on the road is `race.ts`; this
 * is the lobby, the pictures and the keys.
 *
 * The bet is taken, the clock moves and a pink-slipped car leaves your garage
 * the moment the lights go (`onCommit`), so closing the tab on a bad start is
 * not a way out. What is paid back comes at the line (`onFinish`).
 */

const W = 200
const H = 240
const ROAD_L = 40
const LANE_W = 40
const ROAD_R = ROAD_L + LANE_W * LANES
const ME_Y = 196
const STEP = 1 / 60

export interface RaceCommit {
  stake: number
  /** The car put up on a pink slip, which leaves your garage until the race is decided. */
  slipCarId: string | null
}

export interface RaceOutcome {
  /** Cash back from the line: your stake and winnings, or nothing, or minus the repairs. */
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
  result?: Settlement
}

const SIDES: Record<string, { grass: string; kerb: string; road: string; lamp: string }> = {
  crescentHarbor: { grass: '#2c3e4c', kerb: '#c8d0d8', road: '#34363e', lamp: '#f4e4a8' },
  palmCay: { grass: '#d8c890', kerb: '#f4f0e0', road: '#4a4650', lamp: '#fff2c0' },
  neonMesa: { grass: '#1c1030', kerb: '#d848b0', road: '#26202e', lamp: '#58e0ff' },
}

const TRAFFIC_PAINT = ['#8a8a96', '#6a8a7a', '#9a7a6a', '#7a7aa0', '#a09a6a']

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16)
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)))
  const r = ch((n >> 16) & 255)
  const g = ch((n >> 8) & 255)
  const b = ch(n & 255)
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

function laneX(lane: number): number {
  return ROAD_L + LANE_W * (lane + 0.5)
}

function drawCar(c: CanvasRenderingContext2D, cx: number, cy: number, paint: string, o: { braking?: boolean; wrecked?: boolean; you?: boolean } = {}) {
  const x = Math.round(cx)
  const y = Math.round(cy)
  c.fillStyle = 'rgba(0,0,0,0.3)'
  c.fillRect(x - 6, y - 11, 14, 26)
  c.fillStyle = '#10101a'
  c.fillRect(x - 8, y - 9, 2, 6)
  c.fillRect(x + 6, y - 9, 2, 6)
  c.fillRect(x - 8, y + 4, 2, 6)
  c.fillRect(x + 6, y + 4, 2, 6)
  c.fillRect(x - 7, y - 13, 14, 26)
  c.fillStyle = o.wrecked ? shade(paint, 0.5) : paint
  c.fillRect(x - 6, y - 12, 12, 24)
  c.fillStyle = shade(paint, 1.25)
  c.fillRect(x - 5, y - 12, 10, 5)
  c.fillStyle = '#18243a'
  c.fillRect(x - 5, y - 6, 10, 5)
  c.fillStyle = shade(paint, 0.8)
  c.fillRect(x - 5, y + 1, 10, 5)
  c.fillStyle = '#18243a'
  c.fillRect(x - 5, y + 6, 10, 2)
  c.fillStyle = o.braking ? '#ff5050' : '#a02424'
  c.fillRect(x - 6, y + 11, 3, 2)
  c.fillRect(x + 3, y + 11, 3, 2)
  if (o.braking) {
    c.fillStyle = 'rgba(255,80,80,0.28)'
    c.fillRect(x - 8, y + 13, 16, 3)
  }
}

function drawHazard(c: CanvasRenderingContext2D, h: Hazard, y: number) {
  const x = laneX(h.lane)
  if (h.kind === 'traffic') {
    drawCar(c, x, y, TRAFFIC_PAINT[h.id % TRAFFIC_PAINT.length])
  } else if (h.kind === 'oil') {
    c.fillStyle = '#0c0c14'
    c.beginPath()
    c.ellipse(x, y, 15, 9, 0, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = 'rgba(120,90,200,0.35)'
    c.beginPath()
    c.ellipse(x - 3, y - 2, 8, 3, 0, 0, Math.PI * 2)
    c.fill()
  } else {
    for (const dx of [-8, 0, 8]) {
      c.fillStyle = '#10101a'
      c.fillRect(x + dx - 4, y - 2, 8, 6)
      c.fillStyle = '#f07828'
      c.fillRect(x + dx - 3, y - 6, 6, 8)
      c.fillStyle = '#f4f0e0'
      c.fillRect(x + dx - 3, y - 3, 6, 2)
    }
  }
}

function drawFrame(c: CanvasRenderingContext2D, race: Race, me: Racer, cityId: string, countdown: number | null) {
  const side = SIDES[cityId] ?? SIDES.crescentHarbor
  const cam = me.dist
  const yOf = (dist: number) => ME_Y - (dist - cam)
  c.fillStyle = side.grass
  c.fillRect(0, 0, W, H)
  // Verge stripes and posts scroll at the road's speed, which is how speed is seen.
  for (let k = Math.floor((cam - 60) / 24); k < Math.floor((cam + 240) / 24); k++) {
    const y = yOf(k * 24)
    c.fillStyle = k % 2 ? shade(side.grass, 1.12) : shade(side.grass, 0.92)
    c.fillRect(0, y - 12, ROAD_L - 6, 12)
    c.fillRect(ROAD_R + 6, y - 12, W - ROAD_R - 6, 12)
  }
  c.fillStyle = side.road
  c.fillRect(ROAD_L, 0, ROAD_R - ROAD_L, H)
  for (let k = Math.floor((cam - 60) / 22); k < Math.floor((cam + 240) / 22); k++) {
    const y = yOf(k * 22)
    c.fillStyle = k % 2 ? side.kerb : '#c43a3a'
    c.fillRect(ROAD_L - 4, y - 11, 4, 11)
    c.fillRect(ROAD_R, y - 11, 4, 11)
  }
  c.fillStyle = 'rgba(244,240,224,0.55)'
  for (let k = Math.floor((cam - 40) / 30); k < Math.floor((cam + 240) / 30); k++) {
    const y = yOf(k * 30)
    for (let l = 1; l < LANES; l++) c.fillRect(ROAD_L + LANE_W * l - 1, y - 14, 2, 14)
  }
  for (let k = Math.floor((cam - 60) / 60); k < Math.floor((cam + 240) / 60); k++) {
    const y = yOf(k * 60)
    for (const lx of [ROAD_L - 14, ROAD_R + 14]) {
      c.fillStyle = 'rgba(255,240,170,0.16)'
      c.beginPath()
      c.ellipse(lx, y, 12, 12, 0, 0, Math.PI * 2)
      c.fill()
      c.fillStyle = '#10101a'
      c.fillRect(lx - 1, y - 1, 3, 3)
      c.fillStyle = side.lamp
      c.fillRect(lx, y, 1, 1)
    }
  }
  // The start line and the finish.
  for (const [dist, chequer] of [[0, false], [race.length, true]] as const) {
    const y = yOf(dist)
    if (y < -14 || y > H + 14) continue
    for (let i = 0; i < (ROAD_R - ROAD_L) / 8; i++) {
      for (let j = 0; j < 2; j++) {
        c.fillStyle = chequer ? ((i + j) % 2 ? '#10101a' : '#f4f0e0') : 'rgba(244,240,224,0.7)'
        if (chequer || j === 0) c.fillRect(ROAD_L + i * 8, y - 8 + j * 8, 8, 8)
      }
    }
  }
  for (const h of race.hazards) {
    const y = yOf(h.at + h.speed * race.t)
    if (y > -20 && y < H + 20) drawHazard(c, h, y)
  }
  // Furthest back first, you on top.
  const order = [...race.racers].sort((a, b) => (a.isPlayer ? 1 : 0) - (b.isPlayer ? 1 : 0) || b.dist - a.dist)
  for (const r of order) {
    const y = yOf(r.dist)
    if (y < -20 || y > H + 20) continue
    drawCar(c, ROAD_L + LANE_W * (r.x + 0.5), y, r.paint, { wrecked: r.crashed, you: r.isPlayer })
    if (r.crashed) {
      c.fillStyle = 'rgba(30,30,40,0.7)'
      for (let i = 0; i < 5; i++) {
        const a = (race.t * 1.6 + i / 5) % 1
        c.fillRect(Math.round(ROAD_L + LANE_W * (r.x + 0.5) - 6 + i * 3), Math.round(y - 10 - a * 24), 5, 5)
      }
    }
    if (r.slide > 0) {
      c.fillStyle = 'rgba(240,240,255,0.5)'
      c.fillRect(Math.round(ROAD_L + LANE_W * (r.x + 0.5)) - 9, Math.round(y + 14), 18, 2)
    }
  }
  if (countdown !== null) {
    c.fillStyle = 'rgba(0,0,0,0.35)'
    c.fillRect(0, 70, W, 60)
    c.fillStyle = countdown > 0 ? '#f4d03c' : '#60e070'
    c.font = 'bold 34px monospace'
    c.textAlign = 'center'
    c.fillText(countdown > 0 ? String(countdown) : 'GO', W / 2, 114)
    c.textAlign = 'start'
  }
}

function ordinal(n: number): string {
  return n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`
}

function statLine(stats: CarStats): string {
  return `Speed ${stats.topSpeed} · Handling ${stats.handling} · Grip ${stats.grip}`
}

const card: CSSProperties = {
  border: '1px solid #2e2e40', borderRadius: 8, padding: 'clamp(10px, 3vw, 16px)', marginBottom: 12,
}

function Card({ children }: { children: ReactNode }) {
  return <div style={card}>{children}</div>
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
  const [hud, setHud] = useState({ place: 1, of: 1, speed: 0, left: 0, slide: false })
  const active = useRef<Active | null>(null)
  const [done, setDone] = useState<Active | null>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const input = useRef({ left: false, right: false, brake: false })
  const finished = useRef(false)
  const P = useCrispScale(W, H + 60, 4)

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
    const race = startRace(def.length, def.traffic, [mine, ...rivals], mulberry32(Math.floor(Math.random() * 2 ** 31)))
    active.current = { def, stake, car, race, repair: repairCost(car) }
    finished.current = false
    input.current = { left: false, right: false, brake: false }
    onCommit({ stake, slipCarId: def.pinkSlip ? car.id : null })
    setDone(null)
    setHud({ place: 1, of: race.racers.length, speed: 0, left: def.length, slide: false })
    setPhase('countdown')
  }

  // The road.
  useEffect(() => {
    if (phase !== 'countdown' && phase !== 'racing') return
    const a = active.current
    const el = canvas.current
    if (!a || !el) return
    const c = el.getContext('2d')!
    c.imageSmoothingEnabled = false
    const me = a.race.racers.find((r) => r.isPlayer)!
    let frame = 0
    let last = performance.now()
    const began = last
    let acc = 0
    let beeped = 4
    let endedAt = -1
    let hudAt = 0
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const sinceStart = (now - began) / 1000
      if (sinceStart < 3) {
        const n = 3 - Math.floor(sinceStart)
        if (n !== beeped) {
          beeped = n
          playSound('chip')
        }
        drawFrame(c, a.race, me, a.def.cityId, n)
      } else {
        if (beeped !== 0) {
          beeped = 0
          playSound('deal')
          setPhase('racing')
        }
        acc += dt
        const key: Input = {
          steer: input.current.left === input.current.right ? 0 : input.current.left ? -1 : 1,
          brake: input.current.brake,
        }
        while (acc >= STEP) {
          acc -= STEP
          stepRace(a.race, STEP, key)
          if ((me.crashed || me.finish !== null) && endedAt < 0) {
            endedAt = a.race.t
            playSound(me.crashed ? 'lose' : 'chip')
          }
        }
        drawFrame(c, a.race, me, a.def.cityId, sinceStart < 3.6 ? 0 : null)
        if (now - hudAt > 90) {
          hudAt = now
          setHud({
            place: placeOf(a.race, 'you'),
            of: a.race.racers.length,
            speed: Math.round(me.v),
            left: Math.max(0, Math.round(a.race.length - me.dist)),
            slide: me.slide > 0,
          })
        }
        // A beat to see it happen, then the rest of the field finishes without you.
        if (endedAt >= 0 && a.race.t - endedAt > 1.4 && !finished.current) {
          finished.current = true
          runOut(a.race)
          const result = settle(a.race, 'you', {
            stake: a.stake,
            pays: a.def.pays,
            pinkSlip: a.def.pinkSlip !== undefined,
            repair: a.repair,
          })
          a.result = result
          const slip = a.def.pinkSlip
          // The stake went out when the lights did; this is what comes back.
          const back = result.cash > 0 ? a.stake + result.cash : result.crashed ? -a.repair : 0
          onFinish({
            delta: slip ? 0 : back,
            carsWon: slip && result.wonCar ? [slip.prizeCarId, a.car.id] : [],
          })
          playSound(result.place === 1 ? 'win' : 'fold')
          setDone(a)
          setPhase('result')
          return
        }
      }
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
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
      else if (k === ' ' || k === 'ArrowDown' || k === 's' || k === 'S' || k === 'Shift') input.current.brake = down
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
    const hold = (key: 'left' | 'right' | 'brake') => ({
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
          width: '100vw', minHeight: '100vh', background: '#0b0b12', color: '#e8e8f0', fontFamily: UI_FONT,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        <div data-testid="race-hud" style={{ width: W * P, display: 'flex', justifyContent: 'space-between', fontSize: TYPE.body }}>
          <span>{ordinal(hud.place)} of {hud.of}</span>
          <span>{hud.slide ? 'SLIDING' : `${hud.speed * 3.6 | 0} km/h`}</span>
          <span>{hud.left} m</span>
        </div>
        <canvas
          ref={canvas}
          width={W}
          height={H}
          style={{ width: W * P, height: H * P, imageRendering: 'pixelated', display: 'block', touchAction: 'none' }}
        />
        <div style={{ width: W * P, display: 'flex', gap: 8 }}>
          <button style={pad} aria-label="Steer left" {...hold('left')}>◀</button>
          <button style={pad} aria-label="Brake" {...hold('brake')}>Brake</button>
          <button style={pad} aria-label="Steer right" {...hold('right')}>▶</button>
        </div>
        <div style={{ color: '#7a7a90', fontSize: TYPE.small }}>← → or A D to steer · Space to brake</div>
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
        : r.crashed
          ? `You wrecked it. The bet is gone and the repairs are $${done.repair.toLocaleString()}.`
          : `${r.winner} won. Your $${done.stake.toLocaleString()} is gone.`
    return (
      <MenuScreen
        title={r.crashed ? 'Wrecked' : `${ordinal(r.place)} of ${done.race.racers.length}`}
        subtitle={`${done.def.name} · Cash: $${state.cash.toLocaleString()}`}
        onBack={onBack}
        backLabel="Leave"
      >
        <Card>
          <div data-testid="race-result">{line}</div>
        </Card>
        <button style={buttonStyle} onClick={() => { setPhase('lobby'); setPickedCar(null) }}>Back to the start line</button>
      </MenuScreen>
    )
  }

  // The start line.
  const bestRating = car?.car ? tunedStats(car.car, state.ownedItemIds) : null
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
          {bestRating && car && (
            <div style={{ color: '#9a9ab0', fontSize: TYPE.body, marginTop: 8 }}>
              {statLine(bestRating)} · A wreck costs ${repairCost(car).toLocaleString()} to fix
            </div>
          )}
        </Card>
      )}
      {races.map((def) => (
        <Card key={def.id}>
          <div style={{ color: '#f2c14e' }}>{def.name}</div>
          <div style={{ color: '#9a9ab0', fontSize: TYPE.body, margin: '4px 0 8px' }}>{def.blurb}</div>
          <div style={{ fontSize: TYPE.body, marginBottom: 8 }}>
            Against {def.field.map((d) => `${CHARACTERS[d.character]?.name ?? d.character} (${findItem(d.carId)?.name})`).join(', ')}
          </div>
          {def.pinkSlip ? (
            <div>
              <div style={{ color: '#ff9a8a', fontSize: TYPE.body, marginBottom: 8 }}>
                You put up {car ? `your ${car.name}` : 'your car'}. Win and you drive home in the {findItem(def.pinkSlip.prizeCarId)?.name}.
                Lose and yours is gone.
              </div>
              <button data-testid={`race-${def.id}`} style={car ? buttonStyle : { ...buttonStyle, opacity: 0.5 }} disabled={!car} onClick={() => begin(def, 0)}>
                Race for the pink slip
              </button>
            </div>
          ) : (
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
          )}
          {!def.pinkSlip && (
            <div style={{ color: '#7a7a90', fontSize: TYPE.small, marginTop: 6 }}>
              First place pays {def.pays}× your bet. Anything else loses it, and a wreck costs the repairs on top.
            </div>
          )}
        </Card>
      ))}
    </MenuScreen>
  )
}
