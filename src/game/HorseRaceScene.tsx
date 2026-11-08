import { useEffect, useMemo, useRef, useState } from 'react'
import { audio } from '../audio/audio'
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
  runningOrder,
  callsFor,
  isPhotoFinish,
  settleBet,
  type RaceCall,
  type BetKind,
  type Horse,
  type RunnerPlan,
} from '../engine/horses'
import { defaultRng } from '../engine/rng'
import { playSound } from '../audio/audio'
import { CasinoStage, centreY, place, themeOfTown } from './CasinoStage'
import { CoinBurst } from './CasinoFx'
import { ChipRow } from './CasinoControls'
import { Panel, PxButton } from './pixel/ui'
import { PixelText } from './pixel/PixelText'
import { INK } from './pixel/ink'
import { CW, FINISH_X, MAX_VIEW, START_X, Stadium, VIEW_H, WORLD_W, type RaceFrame } from './horseStadium'
import type { GameState } from './state'

const STAKES = [10, 50, 200, 1000]
const KINDS: Array<{ kind: BetKind; label: string; hint: string }> = [
  { kind: 'win', label: 'Win', hint: '1st' },
  { kind: 'place', label: 'Place', hint: 'top 2' },
  { kind: 'show', label: 'Show', hint: 'top 3' },
]

const ROW_H = 12
const HORSES_FIT = [{ w: CW + 8, h: VIEW_H + 30 + FIELD_SIZE * (ROW_H + 1) + 3 * 18 + 8 }]

/** Where a horse's middle is round the track: at the gate it is in the stall, at 1 its nose is on the line. */
const STALL_X = START_X + 22
const xOf = (p: number) => STALL_X + Math.min(1, p) * (FINISH_X - 20 - STALL_X) + (p > 1 ? 70 * (1 - Math.exp(-(p - 1) * 9)) : 0)
const ease = (u: number) => u * u * (3 - 2 * u)

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
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const markers = useRef<Array<HTMLSpanElement | null>>([])
  /** Everything the picture loop reads and writes without going through React. */
  const live = useRef({
    cam: 0,
    vw: CW,
    raceMs: -1,
    lastWall: 0,
    fieldAt: 0,
    xs: [] as number[],
    speeds: [] as number[],
    excite: 0.18,
    shake: 0,
    flash: 0,
    banner: null as { text: string; until: number } | null,
    verdict: -1 as -1 | 0 | 1,
    verdictAt: 0,
    mine: null as number | null,
    gateOpen: 0,
    calls: [] as RaceCall[],
    nextCall: 0,
    photoAt: -1,
    nextHoof: 0,
    ambience: null as ReturnType<typeof audio.ambience>,
  })

  const stadium = useMemo(() => new Stadium(field, state.period), [field, state.period])
  const odds = useMemo(() => chances(field), [field])
  const runRef = useRef<Run | null>(null)
  runRef.current = run

  // Every new field: the horses walk in from the paddock to their stalls.
  useEffect(() => {
    const l = live.current
    l.fieldAt = performance.now()
    l.cam = 0
    l.raceMs = -1
    l.gateOpen = 0
    l.verdict = -1
    l.banner = null
    l.xs = field.map(() => xOf(0) - 70)
    l.speeds = field.map(() => 22)
  }, [field])

  // The crowd, for as long as you are in the stand.
  useEffect(() => {
    const l = live.current
    l.ambience = audio.ambience()
    return () => {
      l.ambience?.stop()
      l.ambience = null
    }
  }, [])

  useEffect(() => {
    live.current.mine = phase === 'betting' ? pick : run?.post ?? pick
  }, [pick, phase, run])

  const affordable = STAKES.filter((s) => s <= Math.max(state.cash, STAKES[0]))
  const betting = phase === 'betting'
  const canBet = betting && pick !== null && state.cash >= stake

  const go = () => {
    if (!canBet || pick === null) return
    const finish = drawFinish(field, defaultRng)
    const plans = planRace(finish, defaultRng)
    onResult(-stake)
    playSound('chip')
    playSound('bugle')
    const l = live.current
    l.calls = callsFor(field, plans)
    l.nextCall = 0
    l.photoAt = -1
    l.raceMs = -1
    l.gateOpen = 0
    l.ambience?.swell(0.4)
    setOutcome(null)
    setBoard(null)
    setMessage(`$${stake.toLocaleString()} to ${KINDS.find((k) => k.kind === kind)?.label.toLowerCase()} on ${field[pick].name}. The bugle sounds — they’re at the gate…`)
    setRun({ startedAt: performance.now() + 2600, plans, finish, stake, kind, post: pick })
    setPhase('running')
  }

  // The picture loop: runs the whole time you are watching, race or no race.
  useEffect(() => {
    let raf = 0
    const l = live.current
    l.lastWall = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(64, now - l.lastWall)
      l.lastWall = now
      const r = runRef.current
      const lastFinish = r ? Math.max(...r.plans.map((p) => p.finishMs)) : 0
      const firstFinish = r ? Math.min(...r.plans.map((p) => p.finishMs)) : 0
      const photo = r ? isPhotoFinish(r.plans) : false
      const prog: number[] = field.map(() => 0)
      let rate = 1
      if (r) {
        if (l.raceMs < 0 && now >= r.startedAt) {
          l.raceMs = 0
          l.gateOpen = 0
          l.shake = 0.9
          playSound('gate')
          l.ambience?.swell(0.7)
        }
        if (l.raceMs >= 0) {
          // The last stretch of a close one runs in slow motion.
          if (photo && l.raceMs > firstFinish - 350 && l.raceMs < firstFinish + 900) rate = 0.35
          l.raceMs += dt * rate
        }
      }
      const ms = l.raceMs
      // Where everybody is.
      field.forEach((h) => {
        const post = h.post
        let x: number
        if (r && ms >= 0) {
          prog[post] = progressAt(r.plans[post], ms)
          x = xOf(prog[post])
        } else if (r) {
          x = xOf(0)
        } else if (l.verdict >= 0) {
          x = l.xs[post]
        } else {
          const e = ease(Math.min(1, Math.max(0, (now - l.fieldAt - post * 140) / 2400)))
          x = xOf(0) - 70 * (1 - e)
        }
        const inst = ((x - (l.xs[post] ?? x)) / Math.max(1, dt)) * 1000
        const target = !r && l.verdict < 0 && now - l.fieldAt - post * 140 < 2400 ? 22 : Math.max(0, inst)
        l.speeds[post] = (l.speeds[post] ?? 0) * 0.7 + target * 0.3
        if (l.speeds[post] < 2) l.speeds[post] = 0
        l.xs[post] = x
      })
      const order = runningOrder(r?.plans ?? field.map((h) => ({ post: h.post, finishMs: 1, surge: 0, waves: 2, style: 'stalker' as const, bias: 0, drift: 0 })), ms >= 0 ? ms : 0)
      const leadX = Math.max(...l.xs)
      // The camera: wide on the gate, then after the leader, easing to a stop past the line.
      const target = Math.min(WORLD_W - l.vw, Math.max(0, (r && ms >= 0) || l.verdict >= 0 ? leadX - l.vw * 0.5 : 0))
      l.cam += (target - l.cam) * (ms >= 0 || l.verdict >= 0 ? 0.1 : 0.2)
      if (l.cam < 0.2) l.cam = 0
      const leadProg = Math.max(...prog)
      let excite: number
      if (r && ms >= 0) excite = 0.3 + 0.7 * ease(Math.min(1, Math.max(0, (leadProg - 0.5) / 0.45)))
      else if (r) excite = 0.35
      else if (l.verdict === 1) excite = Math.max(0.5, 1 - (now - l.verdictAt) / 9000)
      else if (l.verdict === 0) excite = 0.12
      else excite = 0.18
      l.excite += (excite - l.excite) * 0.06
      l.shake = Math.max(0, l.shake - dt / 700)
      l.flash = Math.max(0, l.flash - dt / 450)
      if (l.gateOpen < 1 && ms >= 0) l.gateOpen = Math.min(1, ms / 280)
      if (r && ms >= 0 && now >= l.nextHoof && ms < lastFinish) {
        l.nextHoof = now + 170
        playSound('hoof')
      }
      // The announcer.
      if (r && ms >= 0) {
        while (l.nextCall < l.calls.length && l.calls[l.nextCall].at <= ms) {
          const call = l.calls[l.nextCall++]
          setMessage(call.text)
          l.ambience?.swell(call.excite * 0.6)
        }
        if (photo && l.photoAt < 0 && ms >= firstFinish) {
          l.photoAt = ms
          l.flash = 0.95
          l.shake = 0.5
          l.banner = { text: 'PHOTO FINISH', until: now + 2400 }
          playSound('flash')
        }
      }
      const place = field.map((h) => {
        if (!r || ms < 0) return -1
        const plan = r.plans[h.post]
        return ms >= plan.finishMs ? r.finish.indexOf(h.post) : -1
      })
      const banner = l.banner && now < l.banner.until ? l.banner.text : null
      const frameData: RaceFrame = {
        w: l.vw,
        t: now,
        xs: l.xs,
        speeds: l.speeds,
        cam: l.cam,
        gateOpen: l.gateOpen,
        excite: l.excite,
        stretch: leadProg > 0.72 && !!r,
        order,
        progress: prog,
        place,
        mine: l.mine,
        running: !!r && ms >= 0,
        verdict: l.verdict,
        flash: l.flash,
        banner,
        shake: l.shake,
        since: (now - l.verdictAt) / 1000,
      }
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (ctx) stadium.draw(ctx, frameData)
      field.forEach((h) => {
        const m = markers.current[h.post]
        if (m) m.dataset.world = String(Math.round(l.xs[h.post]))
      })
      if (r && ms > lastFinish + 1100) {
        done(r)
        raf = requestAnimationFrame(frame)
        return
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field, stadium])

  const done = (r: Run) => {
    const l = live.current
    const result = settleBet(field, { kind: r.kind, post: r.post }, r.stake, r.finish)
    const winner = field[r.finish[0]]
    l.raceMs = -1
    l.verdictAt = performance.now()
    l.banner = { text: `${winner.name.toUpperCase()} WINS`, until: performance.now() + 3200 }
    setBoard(r.finish)
    setPhase('result')
    setRun(null)
    runRef.current = null
    if (result.won) {
      l.verdict = 1
      onResult(result.returned)
      setOutcome('win')
      setBurst((b) => b + 1)
      playSound('win')
      l.ambience?.swell(1)
      playSound('roar')
      setMessage(`${field[r.post].name} came in ${ordinal(r.finish.indexOf(r.post))}. Pays $${result.returned.toLocaleString()}.`)
    } else {
      l.verdict = 0
      setOutcome('lose')
      playSound('lose')
      setMessage(`${field[r.post].name} finished ${ordinal(r.finish.indexOf(r.post))}. Ticket’s no good — ${winner.name} took it.`)
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
        const vw = Math.max(CW, Math.min(W - 2, MAX_VIEW))
        live.current.vw = vw
        const tx = Math.round((W - CW) / 2)
        const vx = Math.round((W - vw) / 2)
        const ty = centreY(stage, VIEW_H + 4 + 24 + 3 + FIELD_SIZE * (ROW_H + 1) + 3 * 18)
        const btnH = stage.coarse ? Math.ceil(44 / P) : 16
        const rowH = stage.coarse ? Math.ceil(40 / P) : ROW_H
        const dock = ty + VIEW_H + 4
        return (
          <>
            <div style={{ ...place(P, vx, ty, vw, VIEW_H), overflow: 'hidden', outline: `${P}px solid #14101c` }} data-testid="horses-track">
              <canvas
                ref={canvasRef}
                width={vw}
                height={VIEW_H}
                aria-hidden="true"
                style={{ width: vw * P, height: VIEW_H * P, imageRendering: 'pixelated', display: 'block' }}
              />
              {field.map((h) => (
                <span
                  key={h.post}
                  ref={(el) => {
                    markers.current[h.post] = el
                  }}
                  data-testid={`horse-${h.post}`}
                  aria-hidden="true"
                  style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0 }}
                />
              ))}
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
            <CoinBurst burst={burst} W={W} H={stage.H} P={P} x={vx + vw / 2} y={ty + VIEW_H / 2} kind="chips" count={30} />
          </>
        )
      }}
    </CasinoStage>
  )
}

