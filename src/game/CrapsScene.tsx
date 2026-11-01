import { useEffect, useMemo, useRef, useState } from 'react'
import {
  MAX_ODDS_TIMES,
  newCrapsState,
  oddsWinnings,
  resolveSide,
  rollDice,
  type CrapsDecision,
  type CrapsSide,
  type CrapsState,
  type DiceRoll,
} from '../engine/craps'
import { defaultRng } from '../engine/rng'
import { playSound } from '../audio/audio'
import { CasinoStage, centreY, place, themeOfTown } from './CasinoStage'
import { CoinBurst } from './CasinoFx'
import { ChipRow } from './CasinoControls'
import { ArtCanvas } from './TableStage'
import { CRAPS, CRAPS_BOXES, DIE, dieRaster, paintCrapsTable, puckRaster } from './pixel/casinoArt'
import { chipBreakdown, chipStackUrl } from './pixel/chips'
import { Panel, PxButton } from './pixel/ui'
import { PixelText } from './pixel/PixelText'
import { INK } from './pixel/ink'
import { Raster } from './pixel/raster'
import type { GameState } from './state'

const STAKES = [10, 50, 200, 1000]
const CRAPS_FIT = [{ w: CRAPS.w + 16, h: CRAPS.h + 82 }]
/** How long the dice are in the air, in milliseconds. */
const FLIGHT = 950

/** A stack of chips lying on the layout, with its amount. */
function Bet({ amount, P, x, y, label }: { amount: number; P: number; x: number; y: number; label: string }) {
  if (amount <= 0) return null
  const stack = chipStackUrl(chipBreakdown(amount))
  return (
    <div data-testid={label} data-amount={amount} style={{ position: 'absolute', left: Math.round(x) * P, top: Math.round(y) * P, display: 'flex', alignItems: 'flex-end', gap: 2 * P }}>
      <img src={stack.url} alt="" draggable={false} style={{ width: stack.w * P * 1.5, height: stack.h * P * 1.5 }} />
      <PixelText text={amount.toLocaleString()} scale={P} ink={INK.gold} />
    </div>
  )
}

/**
 * Two dice thrown from the shooter's end of the table: they tumble through the air
 * showing a different face every few frames, land with a hop or two, and come to
 * rest on the faces the engine rolled. Drawn as sprites moved a whole art pixel at
 * a time, each with its shadow on the cloth.
 */
function DiceThrow({ P, throwing, at, onLanded }: { P: number; throwing: { id: number; roll: DiceRoll } | null; at: { x: number; y: number }; onLanded: () => void }) {
  const dice = [useRef<HTMLCanvasElement>(null), useRef<HTMLCanvasElement>(null)]
  const shadows = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)]
  const landed = useRef(onLanded)
  landed.current = onLanded
  const faces = useMemo(() => [1, 2, 3, 4, 5, 6].map((f) => dieRaster(f)), [])
  const shown = useRef<[number, number]>([4, 3])

  const draw = (i: number, face: number) => {
    const canvas = dice[i].current
    if (canvas) faces[face - 1].paint(canvas)
  }
  useEffect(() => {
    draw(0, shown.current[0])
    draw(1, shown.current[1])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!throwing) return
    const { roll } = throwing
    const final: [number, number] = [roll.a, roll.b]
    // Where each lands: a little apart, with a different tumble.
    const target = [
      { x: at.x - 14 + Math.round((defaultRng() - 0.5) * 14), y: at.y - 2 + Math.round((defaultRng() - 0.5) * 10) },
      { x: at.x + 6 + Math.round((defaultRng() - 0.5) * 14), y: at.y + 2 + Math.round((defaultRng() - 0.5) * 10) },
    ]
    const start = [{ x: CRAPS.w - 30, y: CRAPS.h - 14 }, { x: CRAPS.w - 22, y: CRAPS.h - 10 }]
    const started = performance.now()
    let raf = 0
    let lastSwap = 0
    const frame = (now: number) => {
      const t = now - started
      const u = Math.min(1, t / FLIGHT)
      const swap = t - lastSwap > 55 + u * 110
      for (let i = 0; i < 2; i++) {
        // Travel with an ease-out, and hop on the way: two bounces getting smaller.
        const travel = 1 - Math.pow(1 - u, 2.2)
        const hop = Math.abs(Math.sin(u * Math.PI * 2.5)) * 22 * Math.pow(1 - u, 1.4) + Math.sin(u * Math.PI) * 10 * (1 - u)
        const x = start[i].x + (target[i].x - start[i].x) * travel
        const y = start[i].y + (target[i].y - start[i].y) * travel - hop
        const el = dice[i].current
        const sh = shadows[i].current
        if (el) {
          el.style.left = `${Math.round(x) * P}px`
          el.style.top = `${Math.round(y) * P}px`
        }
        if (sh) {
          sh.style.left = `${Math.round(x + 1) * P}px`
          sh.style.top = `${Math.round(start[i].y + (target[i].y - start[i].y) * travel + DIE - 3) * P}px`
          sh.style.opacity = `${0.55 - Math.min(0.3, hop / 70)}`
        }
        if (u < 1) {
          if (swap) draw(i, 1 + Math.floor(defaultRng() * 6))
        } else draw(i, final[i])
      }
      if (swap) lastSwap = t
      if (u < 1) raf = requestAnimationFrame(frame)
      else {
        shown.current = final
        landed.current()
      }
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [throwing?.id])

  return (
    <>
      {[0, 1].map((i) => (
        <div key={`s${i}`}>
          <div
            ref={shadows[i]}
            style={{ position: 'absolute', width: (DIE - 3) * P, height: 4 * P, background: '#000', borderRadius: '50%', opacity: 0.5, left: (at.x + i * 20) * P, top: (at.y + DIE - 3) * P }}
          />
          <canvas
            ref={dice[i]}
            data-testid={`die-${i}`}
            aria-hidden="true"
            width={DIE}
            height={DIE}
            style={{ position: 'absolute', left: (at.x + i * 20) * P, top: at.y * P, width: DIE * P, height: DIE * P, imageRendering: 'pixelated' }}
          />
        </div>
      ))}
    </>
  )
}

export function CrapsScene({
  state,
  onResult,
  onBack,
}: {
  state: GameState
  onResult: (delta: number) => void
  onBack: () => void
}) {
  const theme = themeOfTown(state.cityId)
  const [stake, setStake] = useState(STAKES[0])
  const [side, setSide] = useState<CrapsSide>('pass')
  const [craps, setCraps] = useState<CrapsState>(newCrapsState())
  const [dice, setDice] = useState<DiceRoll | null>(null)
  const [message, setMessage] = useState('Place a pass line bet and come out.')
  // The stake stays on the table across rolls until the point resolves.
  const [wagered, setWagered] = useState(0)
  const [odds, setOdds] = useState(0)
  const [flying, setFlying] = useState<{ id: number; roll: DiceRoll } | null>(null)
  const [rolling, setRolling] = useState(false)
  const [burst, setBurst] = useState(0)
  const [last, setLast] = useState<CrapsDecision | null>(null)
  const pending = useRef<{ roll: DiceRoll; before: CrapsState; bet: number; odds: number; side: CrapsSide } | null>(null)
  const table = useMemo(() => paintCrapsTable(theme), [theme])
  const pucks = useMemo(() => [puckRaster(true), puckRaster(false)], [])

  const betting = craps.phase === 'come-out' && wagered === 0
  const canRoll = !rolling && (betting ? state.cash >= stake : true)
  const oddsStake = wagered * MAX_ODDS_TIMES
  const canOdds = !rolling && craps.phase === 'point' && odds === 0 && state.cash >= oddsStake && wagered > 0

  const roll = () => {
    if (!canRoll) return
    let bet = wagered
    if (betting) {
      bet = stake
      setWagered(stake)
      onResult(-stake)
      playSound('chip')
    }
    const thrown = rollDice(defaultRng)
    pending.current = { roll: thrown, before: craps, bet, odds, side }
    setRolling(true)
    setLast(null)
    setMessage('The dice are in the air…')
    setFlying({ id: (flying?.id ?? 0) + 1, roll: thrown })
    playSound('deal')
  }

  const addOdds = () => {
    if (!canOdds) return
    setOdds(oddsStake)
    onResult(-oddsStake)
    playSound('chip')
    setMessage(`$${oddsStake.toLocaleString()} behind the line at true odds.`)
  }

  const landed = () => {
    const p = pending.current
    if (!p) return
    pending.current = null
    const step = resolveSide(p.side, p.before, p.roll)
    setDice(step.roll)
    setCraps(step.state)
    setMessage(step.message)
    setRolling(false)
    if (step.outcome === 'continue') {
      playSound('check')
      return
    }
    setLast(step.outcome)
    if (step.outcome === 'win') {
      const behind = p.odds > 0 && p.before.point ? p.odds + oddsWinnings(p.side, p.before.point, p.odds) : 0
      onResult(p.bet * 2 + behind)
      playSound('win')
      setBurst((b) => b + 1)
    } else if (step.outcome === 'push') {
      onResult(p.bet + p.odds)
      playSound('check')
    } else {
      playSound('lose')
    }
    setWagered(0)
    setOdds(0)
  }

  const point = craps.point
  return (
    <CasinoStage
      kind="craps"
      theme={theme}
      title={side === 'pass' ? 'Craps: Pass Line' : 'Craps: Don’t Pass'}
      subtitle={`Cash $${state.cash.toLocaleString()} · edge ${side === 'pass' ? '1.41' : '1.36'}%`}
      fits={CRAPS_FIT}
      onBack={onBack}
      backLabel="Walk away"
      testId="craps-scene"
    >
      {(stage) => {
        const { P, W } = stage
        const tx = Math.round((W - CRAPS.w) / 2)
        const ty = centreY(stage, CRAPS.h + 4 + 30 + 3 + 36)
        const btnH = stage.coarse ? Math.ceil(44 / P) : 16
        const dock = ty + CRAPS.h + 4
        const lineBox = side === 'pass' ? CRAPS_BOXES.pass : CRAPS_BOXES.dontPass
        const puckAt = point ? CRAPS_BOXES.numbers[point] : null
        return (
          <>
            <div style={place(P, tx, ty, CRAPS.w, CRAPS.h)}>
              <ArtCanvas width={CRAPS.w} height={CRAPS.h} scale={P} paint={(c) => table.paint(c)} />
              {/* The puck: ON over the point's number, OFF on the don't-pass bar. */}
              <div style={{ position: 'absolute', inset: 0 }}>
                <PuckMarker P={P} puck={puckAt ? { x: puckAt.x + puckAt.w / 2 - 8, y: puckAt.y + puckAt.h - 4, on: true } : { x: CRAPS_BOXES.dontPass.x + CRAPS_BOXES.dontPass.w - 24, y: CRAPS_BOXES.dontPass.y, on: false }} rasters={pucks} />
              </div>
              <Bet amount={wagered} P={P} x={lineBox.x + 5} y={lineBox.y - 7} label="craps-line-bet" />
              <Bet amount={odds} P={P} x={CRAPS_BOXES.pass.x + CRAPS_BOXES.pass.w - 38} y={CRAPS_BOXES.pass.y - 7} label="craps-odds-bet" />
              <DiceThrow P={P} throwing={flying} at={{ x: CRAPS.w / 2 - 8, y: 50 }} onLanded={landed} />
            </div>
            <div
              data-testid="craps-dice"
              style={{ ...place(P, tx, ty, CRAPS.w, CRAPS.h), pointerEvents: 'none' }}
              aria-label={dice ? `Dice: ${dice.a} and ${dice.b}` : 'Dice'}
            />
            <Panel
              theme={theme}
              scale={P}
              style={{ ...place(P, tx, dock, CRAPS.w, 30), padding: `${3 * P}px ${4 * P}px`, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
            >
              <PixelText
                text={point ? `Point: ${point}${wagered > 0 ? ` · $${wagered.toLocaleString()} on the ${side === 'pass' ? 'pass line' : 'don’t pass'}` : ''}` : wagered > 0 ? `Come-out roll · $${wagered.toLocaleString()} down` : 'Come-out roll'}
                scale={P}
                ink={INK.dark}
              />
              <span data-testid="craps-message" style={{ display: 'flex', marginTop: 2 * P }}>
                <PixelText
                  text={message}
                  scale={P}
                  wrap
                  maxLines={2}
                  ink={last === 'win' ? { color: '#1e7a3c', shadow: '#c8e8d0' } : last === 'lose' ? { color: '#a82828', shadow: '#f0d0d0' } : { color: '#5a4a38', shadow: '#d8d0c0' }}
                />
              </span>
            </Panel>
            <div style={{ ...place(P, tx, dock + 33, CRAPS.w), display: 'flex', flexDirection: 'column', gap: 2 * P }}>
              <div style={{ display: 'flex', gap: 2 * P }}>
                {betting && (
                  <>
                    <PxButton lines={['Pass line']} scale={P} role={side === 'pass' ? 'raise' : 'plain'} height={btnH} flex selected={side === 'pass'} testId="craps-side-pass" onClick={() => setSide('pass')} />
                    <PxButton lines={['Don’t pass']} scale={P} role={side === 'dontPass' ? 'raise' : 'plain'} height={btnH} flex selected={side === 'dontPass'} testId="craps-side-dont" onClick={() => setSide('dontPass')} />
                  </>
                )}
                {!betting && craps.phase === 'point' && odds === 0 && (
                  <PxButton lines={[`Odds +$${oddsStake.toLocaleString()}`]} scale={P} role="primary" height={btnH} flex disabled={!canOdds} testId="craps-odds" onClick={addOdds} />
                )}
                <PxButton lines={[betting ? `Bet $${stake} and roll` : 'Roll']} scale={P} role="barCall" height={btnH} flex={!betting} width={betting ? 92 : undefined} disabled={!canRoll} testId="craps-roll" onClick={roll} />
              </div>
              {betting && (
                <div style={{ display: 'flex', gap: 2 * P }}>
                  <ChipRow stakes={STAKES.filter((s) => s <= Math.max(state.cash, STAKES[0]))} value={stake} onPick={setStake} P={P} height={btnH} testPrefix="craps-stake" />
                </div>
              )}
            </div>
            <CoinBurst burst={burst} W={W} H={stage.H} P={P} x={tx + CRAPS.w / 2} y={ty + 60} kind="chips" count={30} />
          </>
        )
      }}
    </CasinoStage>
  )
}

function PuckMarker({ P, puck, rasters }: { P: number; puck: { x: number; y: number; on: boolean }; rasters: Raster[] }) {
  return (
    <div style={{ position: 'absolute', left: Math.round(puck.x) * P, top: Math.round(puck.y) * P, width: 17 * P, height: 12 * P, transition: 'left 260ms steps(8), top 260ms steps(8)' }} data-testid="craps-puck" data-on={puck.on}>
      <ArtCanvas width={17} height={12} scale={P} paint={(c) => rasters[puck.on ? 0 : 1].paint(c)} />
    </div>
  )
}
