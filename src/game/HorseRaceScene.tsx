import { useEffect, useMemo, useRef, useState } from 'react'
import {
  FIELD_SIZE,
  TAKEOUT,
  chanceOf,
  chances,
  drawField,
  drawFinish,
  payLabel,
  ordinal,
  planRace,
  progressAt,
  settleBet,
  type BetKind,
  type Horse,
  type RunnerPlan,
} from '../engine/horses'
import { defaultRng } from '../engine/rng'
import { playSound } from '../audio/audio'
import { CasinoStage, centreY, place, themeOfTown } from './CasinoStage'
import { CoinBurst } from './CasinoFx'
import { ChipRow } from './CasinoControls'
import { ArtCanvas } from './TableStage'
import { Panel, PxButton } from './pixel/ui'
import { PixelText } from './pixel/PixelText'
import { INK } from './pixel/ink'
import { CW, FAR_PARALLAX, FAR_W, FAR_H, SPR_H, SPR_W, START_X, TRACK_H, WORLD_W, horseLeft, horseRaster, horseTop, laneTop, paintFar, paintNear } from './horseArt'
import type { GameState } from './state'

const STAKES = [10, 50, 200, 1000]
const KINDS: Array<{ kind: BetKind; label: string; hint: string }> = [
  { kind: 'win', label: 'Win', hint: '1st' },
  { kind: 'place', label: 'Place', hint: 'top 2' },
  { kind: 'show', label: 'Show', hint: 'top 3' },
]

const ROW_H = 12
const HORSES_FIT = [{ w: CW + 8, h: TRACK_H + 30 + FIELD_SIZE * (ROW_H + 1) + 3 * 18 + 8 }]

type Dust = { x: number; y: number; vx: number; age: number; size: number }

type Phase = 'betting' | 'running' | 'result'

interface Run {
  startedAt: number
  plans: RunnerPlan[]
  finish: number[]
  stake: number
  kind: BetKind
  post: number
}

const SELECTED_INK = { color: '#7a3a08', shadow: '#f0e0b0' }

export function HorseRaceScene({
  state,
  onResult,
  onBack,
}: {
  state: GameState
  onResult: (delta: number) => void
  onBack: () => void
}) {
  const theme = themeOfTown(state.cityId)
  const [field, setField] = useState<Horse[]>(() => drawField(defaultRng))
  const [phase, setPhase] = useState<Phase>('betting')
  const [pick, setPick] = useState<number | null>(null)
  const [kind, setKind] = useState<BetKind>('win')
  const [stake, setStake] = useState(STAKES[0])
  const [message, setMessage] = useState('Pick a horse, a ticket and a stake.')
  const [outcome, setOutcome] = useState<'win' | 'lose' | null>(null)
  const [burst, setBurst] = useState(0)
  const [run, setRun] = useState<Run | null>(null)
  const [board, setBoard] = useState<number[] | null>(null)
  const sprites = useRef<Array<HTMLCanvasElement | null>>([])
  const frames = useRef<number[]>([])
  const nearRef = useRef<HTMLDivElement | null>(null)
  const farRef = useRef<HTMLDivElement | null>(null)
  const dustRef = useRef<HTMLCanvasElement | null>(null)
  const dust = useRef<Dust[]>([])
  const cam = useRef(0)
  /** CSS pixels per art pixel, kept for the race loop that moves sprites outside React's render. */
  const scaleRef = useRef(1)

  const far = useMemo(() => paintFar(), [])
  const near = useMemo(() => paintNear(), [])
  const rasters = useMemo(() => field.map((h) => [0, 1, 2, 3].map((f) => horseRaster(h, f))), [field])
  const odds = useMemo(() => chances(field), [field])

  const draw = (post: number, frame: number) => {
    const canvas = sprites.current[post]
    if (canvas) rasters[post][frame].paint(canvas)
    frames.current[post] = frame
  }

  /** Puts the world where the camera is: the track, the grandstand behind it, every horse. */
  const layout = (lefts: number[]) => {
    const P = scaleRef.current
    if (nearRef.current) nearRef.current.style.left = `${-Math.round(cam.current) * P}px`
    if (farRef.current) farRef.current.style.left = `${-Math.round(cam.current * FAR_PARALLAX) * P}px`
    lefts.forEach((x, post) => {
      const el = sprites.current[post]
      if (el) {
        el.style.left = `${Math.round(x - cam.current) * P}px`
        el.dataset.world = String(Math.round(x))
      }
    })
  }

  // Every new field: the horses stand at the gate and the camera is at the start.
  useEffect(() => {
    cam.current = 0
    dust.current = []
    field.forEach((h) => draw(h.post, 0))
    layout(field.map(() => horseLeft(0)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field])

  const affordable = STAKES.filter((s) => s <= Math.max(state.cash, STAKES[0]))
  const betting = phase === 'betting'
  const canBet = betting && pick !== null && state.cash >= stake

  const go = () => {
    if (!canBet || pick === null) return
    const finish = drawFinish(field, defaultRng)
    const plans = planRace(finish, defaultRng)
    onResult(-stake)
    playSound('chip')
    setOutcome(null)
    setBoard(null)
    setMessage(`$${stake.toLocaleString()} to ${KINDS.find((k) => k.kind === kind)?.label.toLowerCase()} on ${field[pick].name}. They’re at the gate…`)
    setRun({ startedAt: performance.now() + 900, plans, finish, stake, kind, post: pick })
    setPhase('running')
  }

  useEffect(() => {
    if (!run || phase !== 'running') return
    const lastFinish = Math.max(...run.plans.map((p) => p.finishMs))
    let raf = 0
    let called = 0
    const frame = (now: number) => {
      const ms = now - run.startedAt
      const lefts: number[] = []
      run.plans.forEach((plan) => {
        lefts[plan.post] = ms <= 0 ? horseLeft(0) : horseLeft(progressAt(plan, ms))
        const f = ms <= 0 ? 0 : Math.floor(Math.max(0, ms) / 62 + plan.post) % 4
        if (frames.current[plan.post] !== f) draw(plan.post, f)
      })
      // The camera follows the leader, keeping him a little ahead of centre, and stops at the line.
      const leaderX = Math.max(...lefts)
      const target = Math.min(WORLD_W - CW, Math.max(0, leaderX - 120))
      cam.current += (target - cam.current) * 0.14
      layout(lefts)
      const ctx = dustRef.current?.getContext('2d')
      if (ctx && dustRef.current) {
        const Pp = scaleRef.current
        ctx.clearRect(0, 0, dustRef.current.width, dustRef.current.height)
        if (ms > 0) {
          for (const plan of run.plans) {
            if (progressAt(plan, ms) < 1.02 && Math.random() < 0.55) {
              dust.current.push({ x: lefts[plan.post] + 2, y: laneTop(plan.post) + 11 + Math.random() * 2, vx: -0.4 - Math.random() * 0.6, age: 0, size: 2 + Math.floor(Math.random() * 2) })
            }
          }
        }
        dust.current = dust.current.filter((d) => d.age < 22)
        for (const d of dust.current) {
          d.x += d.vx
          d.y -= 0.12
          d.age++
          ctx.fillStyle = `rgba(214, 186, 140, ${0.5 * (1 - d.age / 22)})`
          ctx.fillRect(Math.round(d.x - cam.current) * Pp, Math.round(d.y) * Pp, d.size * Pp, d.size * Pp)
        }
      }
      if (ms > 0 && called === 0) {
        called = 1
        playSound('deal')
        setMessage('And they’re off!')
      }
      if (ms > lastFinish * 0.45 && called === 1) {
        called = 2
        const lead = [...run.plans].sort((a, b) => progressAt(b, ms) - progressAt(a, ms))[0]
        setMessage(`${field[lead.post].name} leads at the half.`)
      }
      if (ms > lastFinish * 0.85 && called === 2) {
        called = 3
        const lead = [...run.plans].sort((a, b) => progressAt(b, ms) - progressAt(a, ms))[0]
        setMessage(`Into the stretch — ${field[lead.post].name} in front!`)
      }
      if (ms > lastFinish + 900) {
        done(run)
        return
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, phase])

  const done = (r: Run) => {
    const result = settleBet(field, { kind: r.kind, post: r.post }, r.stake, r.finish)
    setBoard(r.finish)
    setPhase('result')
    setRun(null)
    if (result.won) {
      onResult(result.returned)
      setOutcome('win')
      setBurst((b) => b + 1)
      playSound('win')
      setMessage(`${field[r.post].name} came in ${ordinal(r.finish.indexOf(r.post))}. Pays $${result.returned.toLocaleString()}.`)
    } else {
      setOutcome('lose')
      playSound('lose')
      setMessage(`${field[r.post].name} finished ${ordinal(r.finish.indexOf(r.post))}. Ticket’s no good.`)
    }
  }

  const nextRace = () => {
    setField(drawField(defaultRng))
    setPick(null)
    setPhase('betting')
    setOutcome(null)
    setBoard(null)
    setMessage('Pick a horse, a ticket and a stake.')
  }

  const kindInfo = KINDS.find((k) => k.kind === kind)!
  return (
    <CasinoStage
      kind="horses"
      theme={theme}
      title="Racebook"
      subtitle={`Cash $${state.cash.toLocaleString()} · takeout ${Math.round(TAKEOUT * 100)}%`}
      fits={HORSES_FIT}
      onBack={onBack}
      backLabel="Walk away"
      testId="horses-scene"
    >
      {(stage) => {
        const { P, W } = stage
        scaleRef.current = P
        const tx = Math.round((W - CW) / 2)
        const ty = centreY(stage, TRACK_H + 4 + 24 + 3 + FIELD_SIZE * (ROW_H + 1) + 3 * 18)
        const btnH = stage.coarse ? Math.ceil(44 / P) : 16
        const rowH = stage.coarse ? Math.ceil(40 / P) : ROW_H
        const dock = ty + TRACK_H + 4
        return (
          <>
            <div style={{ ...place(P, tx, ty, CW, TRACK_H), overflow: 'hidden' }} data-testid="horses-track">
              <div ref={farRef} style={{ position: 'absolute', left: 0, top: 0, width: FAR_W * P, height: FAR_H * P }}>
                <ArtCanvas width={FAR_W} height={FAR_H} scale={P} paint={(c) => far.paint(c)} />
              </div>
              <div ref={nearRef} style={{ position: 'absolute', left: 0, top: 0, width: WORLD_W * P, height: TRACK_H * P }}>
                <ArtCanvas width={WORLD_W} height={TRACK_H} scale={P} paint={(c) => near.paint(c)} />
              </div>
              {field.map((h) => (
                <ScaledSprite key={h.post} post={h.post} P={P} sprites={sprites} />
              ))}
              <canvas
                ref={dustRef}
                aria-hidden="true"
                width={CW * P}
                height={TRACK_H * P}
                style={{ position: 'absolute', left: 0, top: 0, width: CW * P, height: TRACK_H * P, pointerEvents: 'none', zIndex: 30 }}
              />
            </div>
            <Panel
              theme={theme}
              scale={P}
              style={{ ...place(P, tx, dock, CW, 24), padding: `${3 * P}px ${4 * P}px`, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
            >
              <span data-testid="horses-message" data-outcome={outcome ?? ''} style={{ display: 'flex' }}>
                <PixelText
                  text={message}
                  scale={P}
                  wrap
                  maxLines={2}
                  ink={outcome === 'win' ? { color: '#1e7a3c', shadow: '#c8e8d0' } : outcome === 'lose' ? { color: '#a82828', shadow: '#f0d0d0' } : { color: '#5a4a38', shadow: '#d8d0c0' }}
                />
              </span>
            </Panel>
            <div style={{ ...place(P, tx, dock + 27, CW), display: 'flex', flexDirection: 'column', gap: 1 * P }} data-testid="horses-board">
              {field.map((h) => {
                const p = chanceOf(odds, { kind, post: h.post })
                const finished = board ? board.indexOf(h.post) : -1
                const mine = (betting ? pick : run?.post ?? pick) === h.post
                const label = `${h.post + 1}  ${h.name}`
                return (
                  <div key={h.post} style={{ display: 'flex', gap: 2 * P }}>
                    <PxButton
                      lines={[label]}
                      scale={P}
                      role={mine ? 'raise' : 'plain'}
                      selected={mine}
                      height={rowH}
                      flex
                      disabled={!betting}
                      testId={`horse-pick-${h.post}`}
                      onClick={() => {
                        setPick(h.post)
                        playSound('check')
                      }}
                    />
                    <div style={{ width: 50 * P, height: rowH * P, display: 'flex', alignItems: 'center', justifyContent: 'center' }} data-testid={`horse-odds-${h.post}`}>
                      <PixelText text={finished >= 0 ? ordinal(finished) : payLabel(p)} scale={P} ink={finished === 0 ? INK.gold : mine ? SELECTED_INK : INK.light} />
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ ...place(P, tx, dock + 27 + FIELD_SIZE * (rowH + 1) + 2, CW), display: 'flex', flexDirection: 'column', gap: 2 * P }}>
              {betting ? (
                <>
                  <div style={{ display: 'flex', gap: 2 * P }}>
                    {KINDS.map((k) => (
                      <PxButton
                        key={k.kind}
                        lines={[`${k.label} · ${k.hint}`]}
                        scale={P}
                        role={kind === k.kind ? 'raise' : 'plain'}
                        selected={kind === k.kind}
                        height={btnH}
                        flex
                        testId={`horses-kind-${k.kind}`}
                        onClick={() => setKind(k.kind)}
                      />
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 2 * P }}>
                    <ChipRow stakes={affordable} value={stake} onPick={setStake} P={P} height={btnH} testPrefix="horses-stake" />
                  </div>
                  <PxButton
                    lines={[pick === null ? 'Pick a horse' : `$${stake.toLocaleString()} to ${kindInfo.label.toLowerCase()} on ${field[pick].name}`]}
                    scale={P}
                    role="barCall"
                    height={btnH}
                    width={CW}
                    disabled={!canBet}
                    testId="horses-go"
                    onClick={go}
                  />
                </>
              ) : phase === 'result' ? (
                <PxButton lines={['Next race']} scale={P} role="barCall" height={btnH} width={CW} testId="horses-next" onClick={nextRace} />
              ) : null}
            </div>
            <CoinBurst burst={burst} W={W} H={stage.H} P={P} x={tx + CW / 2} y={ty + TRACK_H / 2} kind="chips" count={30} />
          </>
        )
      }}
    </CasinoStage>
  )
}

/** One runner's canvas, moved by the race loop a whole art pixel at a time. */
function ScaledSprite({ post, P, sprites }: { post: number; P: number; sprites: React.MutableRefObject<Array<HTMLCanvasElement | null>> }) {
  return (
    <canvas
      ref={(el) => {
        sprites.current[post] = el
      }}
      data-testid={`horse-${post}`}
      aria-hidden="true"
      width={SPR_W}
      height={SPR_H}
      style={{ position: 'absolute', left: (START_X - 1) * P, top: horseTop(post) * P, width: SPR_W * P, height: SPR_H * P, imageRendering: 'pixelated', zIndex: 10 + post }}
    />
  )
}
