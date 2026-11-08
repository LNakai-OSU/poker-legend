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
import { audio, playSound } from '../audio/audio'
import { CasinoStage, centreY, place, themeOfTown } from './CasinoStage'
import { CoinBurst } from './CasinoFx'
import { ChipRow } from './CasinoControls'
import { Panel, PxButton } from './pixel/ui'
import { PixelText } from './pixel/PixelText'
import { CW, RING_H, SS } from './boxingArt'
import { buildRun, frameAt, idleFrame, type Run } from './boxingChoreo'
import { Arena } from './boxingRender'
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
  const [speed, setSpeed] = useState<1 | 3>(1)
  const [message, setMessage] = useState('Pick a bout, a bet and a stake — or just watch.')
  const [outcome, setOutcome] = useState<'win' | 'lose' | null>(null)
  const [burst, setBurst] = useState(0)
  const committed = useRef(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const lastText = useRef<string | null>(null)
  const speedRef = useRef<1 | 3>(1)
  speedRef.current = speed
  const bout = card[Math.min(sel, card.length - 1)]
  const arenas = useMemo(() => card.map((b) => new Arena(b)), [card])

  const chances = useMemo(() => (bout ? boutChances(bout) : null), [bout])
  const fought = done[sel] !== undefined
  const allDone = Object.keys(done).length === card.length
  const affordable = STAKES.filter((s) => s <= Math.max(state.cash, STAKES[0]))
  const canBet = open && phase === 'card' && !fought && state.cash >= stake

  // Standing in their corners while the card is on the board; the crowd murmurs.
  useEffect(() => {
    if (run) return
    let raf = 0
    const arena = arenas[Math.min(sel, arenas.length - 1)]
    const frame = (now: number) => {
      const ctx = canvasRef.current?.getContext('2d')
      if (ctx && bout) arena.draw(ctx, idleFrame(bout, now), now, [])
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    setHp([100, 100])
    setRoundNo(0)
    return () => cancelAnimationFrame(raf)
  }, [sel, run, arenas, bout])

  // The crowd's noise, for as long as you are in the arena.
  const ambience = useRef<ReturnType<typeof audio.ambience>>(null)
  useEffect(() => {
    ambience.current = audio.ambience()
    return () => {
      ambience.current?.stop()
      ambience.current = null
    }
  }, [])

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
    const arena = arenas[run.index]
    const cards = run.plan.cards.map((c): [number, number] => [c.a, c.b])
    // The fight has a clock of its own: it runs slow for the moment of a heavy shot, and fast if you ask.
    let v = -400
    let wall = performance.now()
    let heard = -1e9
    let level = 0
    const cam = { z: 1, x: CW / 2, y: 78 }
    const frame = (now: number) => {
      const dt = Math.min(64, now - wall)
      wall = now
      const f = frameAt(run, v)
      const prev = v
      v += dt * f.slow * speedRef.current
      for (const e of run.events) {
        if (e.at > prev && e.at <= v) {
          if (e.sfx) playSound(e.sfx)
          if (e.swell) ambience.current?.swell(e.swell)
        }
      }
      if (now - level > 250) {
        level = now
        ambience.current?.set(0.15 + f.excite * 0.6)
      }
      const ctx = canvasRef.current?.getContext('2d')
      // The camera eases to wherever the shot wants it, never jumps.
      cam.z += (f.zoom - cam.z) * 0.1
      cam.x += (f.focus.x - cam.x) * 0.12
      cam.y += (f.focus.y - cam.y) * 0.12
      if (ctx) arena.draw(ctx, { ...f, zoom: cam.z, focus: { x: cam.x, y: cam.y } }, now, cards)
      setHp((h) => (h[0] === f.hp[0] && h[1] === f.hp[1] ? h : f.hp))
      setRoundNo((n) => (n === f.round ? n : f.round))
      if (f.text && f.text !== lastText.current) {
        lastText.current = f.text
        setMessage(f.text)
      }
      void heard
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
    let text = verdict(r.bout, r.result, r.plan)
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
        const tx = Math.round((W - CW) / 2)
        const ty = centreY(stage, FIT[0].h)
        const btnH = stage.coarse ? Math.ceil(44 / P) : 16
        const rowH = stage.coarse ? Math.ceil(40 / P) : BOUT_ROW
        const below = ty + RING_H + 4
        return (
          <>
            <div style={{ ...place(P, tx, ty, CW, RING_H), outline: `${P}px solid #14101c` }} data-testid="boxing-ring" data-round={roundNo} data-phase={phase}>
              <canvas
                ref={canvasRef}
                width={CW * SS}
                height={RING_H * SS}
                aria-hidden="true"
                data-testid="boxing-canvas"
                style={{ width: CW * P, height: RING_H * P, display: 'block' }}
              />
              {bout
                ? ([bout.a, bout.b] as const).map((f, side) => (
                    <div key={f.id} style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0, overflow: 'hidden' }}>
                      <div data-testid={`boxing-hp-${side}`} style={{ width: `${hp[side]}%`, height: 1 }} />
                    </div>
                  ))
                : null}
              <span data-testid="ring-girl" aria-hidden="true" style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0 }} />
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
                  {phase === 'fight' ? (
                    <PxButton lines={[speed === 1 ? 'Speed up ×3' : 'Normal speed']} scale={P} role="plain" height={btnH} width={CW} testId="boxing-speed" onClick={() => setSpeed((s) => (s === 1 ? 3 : 1))} />
                  ) : null}
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
