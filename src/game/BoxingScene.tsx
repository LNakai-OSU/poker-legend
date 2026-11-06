import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BOUTS,
  ROUNDS,
  TAKEOUT,
  boutChances,
  cardFor,
  drawResult,
  payLabel,
  planFight,
  recordOf,
  settleBet,
  verdict,
  type BetKind,
  type Bout,
  type Fighter,
  type Result,
} from '../engine/boxing'
import { TIME_PERIODS } from './time'
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
import { CW, FIG_H, FIG_W, RING_H, SPR_H, SPR_W, POSES, boxerRaster, figureRaster, feetOf, paintRing, type FigureKind, type FigurePose, type Pose } from './boxingArt'
import { buildRun, frameAt, type Frame, type Run } from './boxingChoreo'
import type { GameState } from './state'

const STAKES = [10, 50, 200, 1000]
const BOUT_ROW = 13
const FIT = [{ w: CW + 8, h: RING_H + 4 + 24 + 4 + BOUTS * (BOUT_ROW + 1) + 4 + 2 * 18 + 18 + 18 + 4 }]

const money = (n: number) => `$${n.toLocaleString()}`
const last = (f: Fighter) => f.name.split(' ').pop()!

type Phase = 'card' | 'fight'

interface Done {
  result: Result
  net: number
  bet: Run['bet']
}

export function BoxingScene({
  state,
  onResult,
  onCommit,
  onBack,
}: {
  state: GameState
  onResult: (delta: number) => void
  onCommit: () => void
  onBack: () => void
}) {
  const theme = themeOfTown(state.cityId)
  // The card is fixed on the way in: the clock moves on when the first bell rings.
  const open = true
  const [card] = useState<Bout[]>(() => cardFor(state.day, TIME_PERIODS.indexOf(state.period)))
  const [phase, setPhase] = useState<Phase>('card')
  const [sel, setSel] = useState(0)
  const [kind, setKind] = useState<BetKind>('winA')
  const [stake, setStake] = useState(STAKES[0])
  const [done, setDone] = useState<Record<number, Done>>({})
  const [run, setRun] = useState<Run | null>(null)
  const [hp, setHp] = useState<[number, number]>([100, 100])
  const [roundNo, setRoundNo] = useState(0)
  const [clockText, setClockText] = useState('3:00')
  const [message, setMessage] = useState('Pick a bout, a bet and a stake — or just watch.')
  const [outcome, setOutcome] = useState<'win' | 'lose' | null>(null)
  const [burst, setBurst] = useState(0)
  const committed = useRef(false)
  const sprites = useRef<Record<string, HTMLCanvasElement | null>>({})
  const holders = useRef<Record<string, HTMLDivElement | null>>({})
  const shown = useRef<Record<string, string>>({})
  const lastText = useRef<string | null>(null)
  const scaleRef = useRef(1)
  const [girlRound, setGirlRound] = useState(1)

  const ring = useMemo(() => paintRing(), [])
  const bout = card[Math.min(sel, card.length - 1)]
  const rasters = useMemo(
    () => card.map((b) => [b.a, b.b].map((f) => Object.fromEntries(POSES.map((p) => [p, boxerRaster(f, p)])) as Record<Pose, Raster>)),
    [card],
  )
  const figures = useMemo(() => {
    const out: Record<string, Raster> = {}
    for (const kind of ['ref', 'trainerA', 'trainerB', 'girl'] as FigureKind[]) for (const pose of [0, 1, 2] as FigurePose[]) out[`${kind}${pose}`] = figureRaster(kind, pose)
    return out
  }, [])

  /** Puts a sprite on its canvas once; the same picture is not painted twice. */
  const paintSprite = (key: string, id: string, make: () => Raster, flip = false) => {
    const canvas = sprites.current[key]
    if (!canvas || shown.current[key] === id) return
    const src = make()
    const out = new Raster(src.width, src.height)
    out.blit(src, 0, 0, flip)
    out.paint(canvas)
    shown.current[key] = id
  }

  const place2 = (key: string, x: number, feet: number, h: number, z: number) => {
    const el = holders.current[key]
    if (!el) return
    const P = scaleRef.current
    el.style.left = `${Math.round(x) * P}px`
    el.style.top = `${Math.round(feet - h + 1) * P}px`
    el.style.zIndex = String(Math.round(z * 10))
  }

  /** Draws a frame of the fight: the men, the referee, the trainers and the ring girl. */
  const applyFrame = (f: Frame, index: number) => {
    paintSprite('a', `${index}${f.a}`, () => rasters[index][0][f.a])
    paintSprite('b', `${index}${f.b}`, () => rasters[index][1][f.b], true)
    place2('a', f.pos.ax, feetOf(f.pos.ay), SPR_H, feetOf(f.pos.ay))
    place2('b', f.pos.bx, feetOf(f.pos.by), SPR_H, feetOf(f.pos.by))
    paintSprite('ref', `ref${f.ref.pose}`, () => figures[`ref${f.ref.pose}`])
    place2('ref', f.ref.x, feetOf(f.ref.y), FIG_H, feetOf(f.ref.y) - 0.5)
    const lean: FigurePose = f.corner ? 2 : 0
    paintSprite('tA', `tA${lean}`, () => figures[`trainerA${lean}`])
    paintSprite('tB', `tB${lean}`, () => figures[`trainerB${lean}`])
    const g = holders.current.girl
    if (g) {
      g.style.display = f.girl ? 'block' : 'none'
      if (f.girl) {
        place2('girl', f.girl.x, 130, FIG_H, 200)
        paintSprite('girl', `girl${Math.floor(performance.now() / 260) % 2}`, () => figures[`girl${Math.floor(performance.now() / 260) % 2}`])
        setGirlRound((r) => (r === f.girl!.round ? r : f.girl!.round))
      }
    }
  }

  // Standing in their corners while the card is on the board.
  useEffect(() => {
    if (run) return
    shown.current = {}
    const idle: Frame = {
      a: 'guard0',
      b: 'guard0',
      pos: { ax: 80, bx: 122, ay: 0.5, by: 0.5 },
      hp: [100, 100],
      round: 0,
      ref: { x: 109, y: 0.1, pose: 0 },
      girl: null,
      corner: false,
      clock: '3:00',
      text: null,
      over: false,
    }
    applyFrame(idle, sel)
    setHp([100, 100])
    setRoundNo(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, run])

  const chances = useMemo(() => (bout ? boutChances(bout) : null), [bout])
  const fought = done[sel] !== undefined
  const allDone = Object.keys(done).length === card.length
  const affordable = STAKES.filter((s) => s <= Math.max(state.cash, STAKES[0]))
  const canBet = open && phase === 'card' && !fought && state.cash >= stake

  const start = (withBet: boolean) => {
    if (!open || phase !== 'card' || fought) return
    if (withBet && state.cash < stake) return
    const bet = withBet ? { kind, stake } : null
    if (bet) {
      onResult(-bet.stake)
      playSound('chip')
    }
    if (!committed.current) {
      committed.current = true
      onCommit()
    }
    const result = drawResult(bout, defaultRng)
    const r = buildRun(sel, bout, bet, result, planFight(result, defaultRng), performance.now() + 400, defaultRng)
    setOutcome(null)
    setHp([100, 100])
    lastText.current = null
    setRun(r)
    setPhase('fight')
    setMessage(`${bout.a.name} against ${bout.b.name}. ${ROUNDS} rounds.`)
  }

  useEffect(() => {
    if (!run) return
    let raf = 0
    const frame = (now: number) => {
      const f = frameAt(run, now - run.startedAt)
      applyFrame(f, run.index)
      setHp((h) => (h[0] === f.hp[0] && h[1] === f.hp[1] ? h : f.hp))
      setRoundNo((n) => (n === f.round ? n : f.round))
      setClockText((c) => (c === f.clock ? c : f.clock))
      if (f.text && f.text !== lastText.current) {
        lastText.current = f.text
        setMessage(f.text)
        playSound(/DOWN/.test(f.text) ? 'lose' : /Round|Seconds/.test(f.text) ? 'deal' : 'check')
      }
      if (f.over) {
        finish(run)
        return
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run])

  const finish = (r: Run) => {
    let net = 0
    let text = verdict(r.bout, r.result)
    let result: 'win' | 'lose' | null = null
    if (r.bet) {
      const s = settleBet(r.bout, r.bet.kind, r.bet.stake, r.result)
      net = s.net
      if (s.won) {
        onResult(s.returned)
        result = 'win'
        setBurst((b) => b + 1)
        playSound('win')
        text += ` Your ticket pays ${money(s.returned)}.`
      } else {
        result = 'lose'
        playSound('lose')
        text += ' Your ticket is no good.'
      }
    } else {
      playSound('deal')
    }
    setDone((d) => ({ ...d, [r.index]: { result: r.result, net, bet: r.bet } }))
    setOutcome(result)
    setMessage(text)
    setRun(null)
    setPhase('card')
    const next = card.findIndex((_, i) => i !== r.index && !(i in done) && i !== r.index)
    if (next >= 0) setSel(next)
  }

  const kinds: Array<{ kind: BetKind; label: string }> = bout
    ? [
        { kind: 'winA', label: `${last(bout.a)}` },
        { kind: 'winB', label: `${last(bout.b)}` },
        { kind: 'distance', label: 'Distance' },
        { kind: 'koA', label: `${last(bout.a)} KO` },
        { kind: 'koB', label: `${last(bout.b)} KO` },
      ]
    : []

  return (
    <CasinoStage
      kind="boxing"
      theme={theme}
      title="Mesa Arena"
      subtitle={`Cash ${money(state.cash)} · takeout ${Math.round(TAKEOUT * 100)}%`}
      fits={FIT}
      onBack={onBack}
      backLabel="Leave the arena"
      testId="boxing-scene"
    >
      {(stage) => {
        const { P, W } = stage
        scaleRef.current = P
        const tx = Math.round((W - CW) / 2)
        const ty = centreY(stage, FIT[0].h)
        const btnH = stage.coarse ? Math.ceil(44 / P) : 16
        const rowH = stage.coarse ? Math.ceil(40 / P) : BOUT_ROW
        const below = ty + RING_H + 4
        const barW = 84
        return (
          <>
            <div style={place(P, tx, ty, CW, RING_H)} data-testid="boxing-ring" data-round={roundNo} data-phase={phase}>
              <ArtCanvas width={CW} height={RING_H} scale={P} paint={(c) => ring.back.paint(c)} />
              {(
                [
                  ['tA', 0, 100, FIG_W, FIG_H],
                  ['tB', CW - FIG_W, 100, FIG_W, FIG_H],
                  ['ref', 109, 62, FIG_W, FIG_H],
                  ['a', 80, 72, SPR_W, SPR_H],
                  ['b', 122, 72, SPR_W, SPR_H],
                ] as const
              ).map(([key, x, feet, w, h]) => (
                <div
                  key={key}
                  ref={(el) => {
                    holders.current[key] = el
                  }}
                  style={{ position: 'absolute', left: x * P, top: (feet - h + 1) * P, width: w * P, height: h * P, pointerEvents: 'none' }}
                >
                  <div style={{ position: 'absolute', left: (w * 0.15) * P, bottom: -1 * P, width: w * 0.7 * P, height: 5 * P, borderRadius: '50%', background: 'rgba(0,0,0,0.3)' }} />
                  <canvas
                    ref={(el) => {
                      sprites.current[key] = el
                    }}
                    data-testid={key === 'a' ? 'boxer-0' : key === 'b' ? 'boxer-1' : `fig-${key}`}
                    aria-hidden="true"
                    width={w}
                    height={h}
                    style={{ width: w * P, height: h * P, imageRendering: 'pixelated', display: 'block', position: 'relative' }}
                  />
                </div>
              ))}
              <div style={{ position: 'absolute', left: 0, top: 0, zIndex: 1500, pointerEvents: 'none' }}>
                <ArtCanvas width={CW} height={RING_H} scale={P} paint={(c) => ring.front.paint(c)} />
              </div>
              <div
                ref={(el) => {
                  holders.current.girl = el
                }}
                data-testid="ring-girl"
                style={{ position: 'absolute', display: 'none', width: FIG_W * P, height: FIG_H * P, pointerEvents: 'none' }}
              >
                <div style={{ position: 'absolute', left: -15 * P, top: -12 * P, width: 46 * P, height: 11 * P, background: '#f4f0e4', border: `${P}px solid #14101c`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PixelText text={`ROUND ${girlRound}`} scale={P} ink={{ color: '#a82828', shadow: null }} />
                </div>
                <canvas
                  ref={(el) => {
                    sprites.current.girl = el
                  }}
                  aria-hidden="true"
                  width={FIG_W}
                  height={FIG_H}
                  style={{ width: FIG_W * P, height: FIG_H * P, imageRendering: 'pixelated', display: 'block' }}
                />
              </div>
              {bout
                ? ([bout.a, bout.b] as const).map((f, side) => (
                    <div key={f.id} style={{ position: 'absolute', top: 2 * P, zIndex: 3000, [side === 0 ? 'left' : 'right']: 4 * P, width: barW * P }}>
                      <PixelText text={f.name} scale={P} ink={INK.light} />
                      <div style={{ marginTop: P, height: 5 * P, background: '#14101c', border: `${P}px solid #f4f0e4` }}>
                        <div
                          data-testid={`boxing-hp-${side}`}
                          style={{
                            width: `${hp[side]}%`,
                            height: '100%',
                            marginLeft: side === 1 ? 'auto' : 0,
                            background: hp[side] > 55 ? '#3ac860' : hp[side] > 25 ? '#f2c84a' : '#e83a3a',
                          }}
                        />
                      </div>
                    </div>
                  ))
                : null}
              <div style={{ position: 'absolute', top: 125 * P, left: 0, zIndex: 3000, width: CW * P, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
                <PixelText text={roundNo > 0 ? `RD ${roundNo}  ${clockText}` : ''} scale={P} ink={INK.gold} />
              </div>
            </div>
            <Panel
              theme={theme}
              scale={P}
              style={{ ...place(P, tx, below, CW, 24), padding: `${3 * P}px ${4 * P}px`, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
            >
              <span data-testid="boxing-message" data-outcome={outcome ?? ''} data-phase={phase} style={{ display: 'flex' }}>
                <PixelText
                  text={message}
                  scale={P}
                  wrap
                  maxLines={2}
                  ink={outcome === 'win' ? { color: '#1e7a3c', shadow: '#c8e8d0' } : outcome === 'lose' ? { color: '#a82828', shadow: '#f0d0d0' } : { color: '#5a4a38', shadow: '#d8d0c0' }}
                />
              </span>
            </Panel>
            {open ? (
              <>
                <div style={{ ...place(P, tx, below + 27, CW), display: 'flex', flexDirection: 'column', gap: P }} data-testid="boxing-card">
                  {card.map((b, i) => {
                    const d = done[i]
                    const label = `${b.main ? 'MAIN  ' : ''}${last(b.a)} v ${last(b.b)}${d ? `  ·  ${d.result.winner === 'a' ? last(b.a) : last(b.b)}${d.result.method === 'ko' ? ' KO' : ''}` : `  ·  ${recordOf(b.a)} / ${recordOf(b.b)}`}`
                    return (
                      <PxButton
                        key={i}
                        lines={[label]}
                        scale={P}
                        role={sel === i ? 'raise' : 'plain'}
                        selected={sel === i}
                        height={rowH}
                        width={CW}
                        disabled={phase === 'fight'}
                        testId={`boxing-bout-${i}`}
                        onClick={() => {
                          setSel(i)
                          setOutcome(null)
                        }}
                      />
                    )
                  })}
                </div>
                <div style={{ ...place(P, tx, below + 27 + BOUTS * (rowH + 1) + 3, CW), display: 'flex', flexDirection: 'column', gap: 2 * P }}>
                  {phase === 'card' && !allDone && !fought && chances ? (
                    <>
                      <div style={{ display: 'flex', gap: 2 * P }}>
                        {kinds.slice(0, 3).map((k) => (
                          <PxButton
                            key={k.kind}
                            lines={[`${k.label} ${payLabel(chances[k.kind])}`]}
                            scale={P}
                            role={kind === k.kind ? 'raise' : 'plain'}
                            selected={kind === k.kind}
                            height={btnH}
                            flex
                            testId={`boxing-bet-${k.kind}`}
                            onClick={() => setKind(k.kind)}
                          />
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 2 * P }}>
                        {kinds.slice(3).map((k) => (
                          <PxButton
                            key={k.kind}
                            lines={[`${k.label} ${payLabel(chances[k.kind])}`]}
                            scale={P}
                            role={kind === k.kind ? 'raise' : 'plain'}
                            selected={kind === k.kind}
                            height={btnH}
                            flex
                            testId={`boxing-bet-${k.kind}`}
                            onClick={() => setKind(k.kind)}
                          />
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 2 * P }}>
                        <ChipRow stakes={affordable} value={stake} onPick={setStake} P={P} height={btnH} testPrefix="boxing-stake" />
                      </div>
                      <div style={{ display: 'flex', gap: 2 * P }}>
                        <PxButton lines={[`Bet ${money(stake)} & watch`]} scale={P} role="barCall" height={btnH} flex disabled={!canBet} testId="boxing-go" onClick={() => start(true)} />
                        <PxButton lines={['Just watch']} scale={P} role="plain" height={btnH} flex testId="boxing-watch" onClick={() => start(false)} />
                      </div>
                    </>
                  ) : null}
                </div>
              </>
            ) : null}
            <CoinBurst burst={burst} W={W} H={stage.H} P={P} x={tx + CW / 2} y={ty + RING_H / 2} kind="chips" count={30} />
          </>
        )
      }}
    </CasinoStage>
  )
}
