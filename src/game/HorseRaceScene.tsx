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
import { Raster } from './pixel/raster'
import type { GameState } from './state'

const STAKES = [10, 50, 200, 1000]
const KINDS: Array<{ kind: BetKind; label: string; hint: string }> = [
  { kind: 'win', label: 'Win', hint: '1st' },
  { kind: 'place', label: 'Place', hint: 'top 2' },
  { kind: 'show', label: 'Show', hint: 'top 3' },
]

/** Art pixels. */
const CW = 236
const LANE = 11
const TRACK_H = FIELD_SIZE * LANE + 8
const SPRITE_W = 17
const SPRITE_H = 12
const START_X = 16
const LINE_X = CW - 14
const ROW_H = 12
const HORSES_FIT = [{ w: CW + 8, h: TRACK_H + 30 + FIELD_SIZE * (ROW_H + 1) + 3 * 18 + 8 }]

const COATS: Record<Horse['coat'], { body: string; dark: string }> = {
  bay: { body: '#8a4a28', dark: '#2a160c' },
  chestnut: { body: '#b0602c', dark: '#6a3414' },
  grey: { body: '#b8bcc4', dark: '#5a5e68' },
  black: { body: '#2c2a34', dark: '#0c0a10' },
  palomino: { body: '#d8b060', dark: '#f0e0b0' },
}

/** A racehorse in profile, facing right, in one of two strides, with a jockey up in the horse's silks. */
function horseRaster(horse: Horse, frame: 0 | 1): Raster {
  const r = new Raster(SPRITE_W, SPRITE_H)
  const { body, dark } = COATS[horse.coat]
  // Tail, then the body, the neck and the head.
  r.rect(0, 4, 3, 1, dark)
  r.rect(0, 5, 2, 2, dark)
  r.rect(2, 4, 10, 4, body)
  r.rect(3, 3, 8, 1, body)
  r.rect(11, 2, 3, 4, body)
  r.rect(13, 1, 3, 3, body)
  r.rect(15, 3, 1, 2, body)
  r.set(13, 0, dark)
  r.rect(11, 2, 1, 3, dark)
  r.set(15, 2, '#15101a')
  // Legs: stretched out at full gallop, gathered under the belly between strides.
  const legs =
    frame === 0
      ? [[10, 8], [11, 9], [12, 10], [11, 10], [8, 8], [8, 9], [4, 8], [3, 9], [2, 10], [3, 10]]
      : [[10, 8], [10, 9], [10, 10], [11, 10], [7, 8], [8, 9], [4, 8], [4, 9], [4, 10], [5, 10]]
  for (const [x, y] of legs) r.set(x, y, y === 10 ? dark : body)
  // The jockey, crouched low over the withers.
  r.rect(6, 1, 4, 3, horse.silks)
  r.rect(9, 0, 2, 2, '#f0c8a0')
  r.set(9, 0, horse.silks)
  r.set(10, 0, horse.silks)
  r.set(6, 4, '#f4f0e4')
  r.outline('#15101a')
  return r
}

/** The track: rail, six lanes of dirt, the gates and the line. */
function paintTrack(): Raster {
  const r = new Raster(CW, TRACK_H)
  r.rect(0, 0, CW, TRACK_H, '#2f6a34')
  r.each(0, 0, CW, TRACK_H, (x, y) => ((x + y) % 7 === 0 ? '#2a6030' : null))
  r.rect(0, 0, CW, 2, '#f4f0e4')
  r.rect(0, 2, CW, 1, '#b8b4a8')
  r.rect(0, TRACK_H - 3, CW, 1, '#b8b4a8')
  r.rect(0, TRACK_H - 2, CW, 2, '#f4f0e4')
  for (let i = 0; i < FIELD_SIZE; i++) {
    const y = 4 + i * LANE
    r.each(0, y, CW, LANE, (x, py) => {
      const base = i % 2 ? '#a87c4c' : '#b88c58'
      if ((x * 7 + py * 13) % 11 === 0) return '#8a6238'
      return base
    })
    if (i > 0) r.hline(0, y, CW, '#e8dcc0')
  }
  // The starting gate, and the finish line as a chequered strip.
  r.rect(START_X - 3, 4, 2, FIELD_SIZE * LANE, '#4a3a2a')
  for (let y = 4; y < 4 + FIELD_SIZE * LANE; y += 2) {
    r.rect(LINE_X, y, 2, 2, (y / 2) % 2 ? '#15101a' : '#f4f0e4')
    r.rect(LINE_X + 2, y, 2, 2, (y / 2) % 2 ? '#f4f0e4' : '#15101a')
  }
  return r
}

/** Where the horse's left edge is on the track, in art pixels. */
function horseX(progress: number): number {
  const toLine = LINE_X - SPRITE_W + 2 - START_X
  const x = START_X + Math.min(1, progress) * toLine + (progress > 1 ? (progress - 1) * 60 : 0)
  return Math.min(x, CW - SPRITE_W - 1)
}

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
  /** CSS pixels per art pixel, kept for the race loop that moves sprites outside React's render. */
  const scaleRef = useRef(1)

  const track = useMemo(() => paintTrack(), [])
  const rasters = useMemo(() => field.map((h) => [horseRaster(h, 0), horseRaster(h, 1)]), [field])
  const odds = useMemo(() => chances(field), [field])

  const draw = (post: number, frame: 0 | 1) => {
    const canvas = sprites.current[post]
    if (canvas) rasters[post][frame].paint(canvas)
    frames.current[post] = frame
  }

  // Every new field: the horses stand at the gate.
  useEffect(() => {
    field.forEach((h) => {
      draw(h.post, 0)
      const el = sprites.current[h.post]
      if (el) el.style.left = `${(START_X - 1) * scaleRef.current}px`
    })
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
      const pace = (p: number) => {
        const stride = (Math.floor(Math.max(0, ms) / 110) + p) % 2 === 0 ? 0 : 1
        return stride as 0 | 1
      }
      run.plans.forEach((plan) => {
        const el = sprites.current[plan.post]
        if (!el) return
        const x = ms <= 0 ? START_X - 1 : horseX(progressAt(plan, ms))
        el.style.left = `${Math.round(x) * scaleRef.current}px`
        const f = ms <= 0 ? 0 : pace(plan.post)
        if (frames.current[plan.post] !== f) draw(plan.post, f)
      })
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
            <div style={place(P, tx, ty, CW, TRACK_H)} data-testid="horses-track">
              <ArtCanvas width={CW} height={TRACK_H} scale={P} paint={(c) => track.paint(c)} />
              {field.map((h) => (
                <div key={h.post} style={{ position: 'absolute', left: 0, top: (4 + h.post * LANE - 1) * P, width: CW * P, height: SPRITE_H * P, pointerEvents: 'none' }}>
                  <div style={{ position: 'absolute', left: 3 * P, top: 3 * P }}>
                    <PixelText text={`${h.post + 1}`} scale={P} ink={{ color: '#f4f0e4', shadow: '#3a2a18' }} />
                  </div>
                  <ScaledSprite
                    post={h.post}
                    P={P}
                    sprites={sprites}
                  />
                </div>
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
      width={SPRITE_W}
      height={SPRITE_H}
      style={{ position: 'absolute', left: (START_X - 1) * P, top: 0, width: SPRITE_W * P, height: SPRITE_H * P, imageRendering: 'pixelated' }}
    />
  )
}
