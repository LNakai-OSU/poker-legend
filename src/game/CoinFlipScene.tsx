import { useEffect, useMemo, useRef, useState } from 'react'
import { MAX_RIDE, flip, inspect, type Hustler, type Side } from '../engine/coinflip'
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
const CW = 236
const COIN = 30
const COIN_H = 36
const FIT = [{ w: CW + 8, h: 190 }]
/** How long the coin is in the air. */
const AIR_MS = 1100

const money = (n: number) => `$${n.toLocaleString()}`

/** The coin: a gold disc seen at one of six turns, face up on frames 0 and 3. */
function coinRaster(frame: number, face: Side | null): Raster {
  const r = new Raster(COIN, COIN_H)
  const widths = [28, 22, 12, 4, 12, 22]
  const w = widths[frame % 6]
  const cx = COIN / 2
  const cy = COIN_H / 2
  r.ellipse(cx - w / 2, cy - 14, w, 28, '#8a6410')
  if (w > 3) r.ellipse(cx - w / 2 + 1, cy - 13, Math.max(1, w - 2), 26, '#f2c84a')
  if (w > 10) r.ellipse(cx - w / 2 + 3, cy - 11, Math.max(1, w - 6), 22, '#d8a828')
  if (w >= 22 && face) {
    if (face === 'heads') {
      // A bust in profile.
      r.rect(cx - 3, cy - 7, 6, 7, '#8a6410')
      r.rect(cx - 5, cy - 3, 3, 3, '#8a6410')
      r.rect(cx - 7, cy + 2, 14, 5, '#8a6410')
    } else {
      // A star.
      r.rect(cx - 1, cy - 8, 3, 16, '#8a6410')
      r.rect(cx - 8, cy - 1, 17, 3, '#8a6410')
      r.rect(cx - 5, cy - 5, 3, 3, '#8a6410')
      r.rect(cx + 3, cy - 5, 3, 3, '#8a6410')
      r.rect(cx - 5, cy + 3, 3, 3, '#8a6410')
      r.rect(cx + 3, cy + 3, 3, 3, '#8a6410')
    }
  }
  return r
}

type Phase = 'call' | 'air' | 'won' | 'lost'

export function CoinFlipScene({
  state,
  who,
  fairness,
  limit,
  onResult,
  onBack,
}: {
  state: GameState
  who: string
  fairness: number
  limit: number
  onResult: (delta: number) => void
  onBack: () => void
}) {
  const theme = themeOfTown(state.cityId)
  const hustler: Hustler = useMemo(() => ({ fairness, limit }), [fairness, limit])
  const stakes = STAKES.filter((s) => s <= limit)
  const [stake, setStake] = useState(stakes[0])
  const [call, setCall] = useState<Side>('heads')
  const [phase, setPhase] = useState<Phase>('call')
  const [frame, setFrame] = useState(0)
  const [landed, setLanded] = useState<Side | null>(null)
  /** What is on the table right now: the stake, doubled for every flip let ride. */
  const [pot, setPot] = useState(0)
  const [rides, setRides] = useState(0)
  const [message, setMessage] = useState(`${who}: Call it in the air. Even money.`)
  const [outcome, setOutcome] = useState<'win' | 'lose' | null>(null)
  const [burst, setBurst] = useState(0)
  const pending = useRef<{ landed: Side; won: boolean } | null>(null)
  const potRef = useRef(0)
  potRef.current = pot

  const coin = useMemo(() => coinRaster(frame, phase === 'air' ? null : landed), [frame, phase, landed])

  useEffect(() => {
    if (phase !== 'air') return
    const tick = setInterval(() => setFrame((f) => f + 1), 70)
    const land = setTimeout(() => {
      clearInterval(tick)
      const r = pending.current!
      setFrame(0)
      setLanded(r.landed)
      if (r.won) {
        setPhase('won')
        setOutcome('win')
        setPot((p) => p * 2)
        playSound('win')
        setBurst((b) => b + 1)
        setMessage(`${r.landed === 'heads' ? 'Heads' : 'Tails'}. You called it. ${who} scowls.`)
      } else {
        setPhase('lost')
        setOutcome('lose')
        setPot(0)
        playSound('lose')
        setMessage(`${r.landed === 'heads' ? 'Heads' : 'Tails'}. ${who}: Tough. Again?`)
      }
    }, AIR_MS)
    return () => {
      clearInterval(tick)
      clearTimeout(land)
    }
  }, [phase, who])

  const throwCoin = (first: boolean, at: number) => {
    pending.current = flip(hustler, call, defaultRng)
    if (first) {
      onResult(-at)
      setPot(at)
      setRides(0)
    }
    playSound('chip')
    setOutcome(null)
    setLanded(null)
    setPhase('air')
    setMessage(`${money(at)} on ${call}. Up it goes…`)
  }

  const canFlip = phase === 'call' || phase === 'lost'
  const startFlip = () => {
    if (!canFlip || state.cash < stake) return
    throwCoin(true, stake)
  }
  const letItRide = () => {
    if (phase !== 'won' || rides >= MAX_RIDE) return
    setRides((n) => n + 1)
    throwCoin(false, pot)
  }
  const take = () => {
    if (phase !== 'won') return
    onResult(pot)
    setMessage(`You take ${money(pot)} and leave the rest of the street to the pigeons.`)
    setPot(0)
    setPhase('call')
  }
  const leave = () => {
    // Walking off mid-ride takes the winnings: the pot is yours, not forfeit.
    if (phase === 'won') onResult(potRef.current)
    onBack()
  }

  const affordable = stakes.filter((s) => s <= Math.max(state.cash, stakes[0]))
  return (
    <CasinoStage
      kind="coinflip"
      theme={theme}
      title={who}
      subtitle={`Cash ${money(state.cash)} · up to ${money(limit)} a flip`}
      fits={FIT}
      onBack={leave}
      backLabel="Walk away"
      testId="coinflip-scene"
    >
      {(stage) => {
        const { P, W } = stage
        const tx = Math.round((W - CW) / 2)
        const ty = centreY(stage, 180)
        const btnH = stage.coarse ? Math.ceil(44 / P) : 16
        return (
          <>
            <Panel
              theme={theme}
              scale={P}
              style={{ ...place(P, tx, ty, CW, 24), padding: `${3 * P}px ${4 * P}px`, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
            >
              <span data-testid="coinflip-message" data-outcome={outcome ?? ''} data-phase={phase} style={{ display: 'flex' }}>
                <PixelText
                  text={message}
                  scale={P}
                  wrap
                  maxLines={2}
                  ink={outcome === 'win' ? { color: '#1e7a3c', shadow: '#c8e8d0' } : outcome === 'lose' ? { color: '#a82828', shadow: '#f0d0d0' } : { color: '#5a4a38', shadow: '#d8d0c0' }}
                />
              </span>
            </Panel>
            <div
              data-testid="coinflip-coin"
              data-landed={landed ?? ''}
              style={{ ...place(P, tx + (CW - COIN) / 2, ty + 28, COIN, COIN_H), marginTop: phase === 'air' ? -Math.abs(Math.sin(frame * 0.55)) * 14 * P : 0 }}
            >
              <ArtCanvas width={COIN} height={COIN_H} scale={P} paint={(c) => coin.paint(c)} />
            </div>
            <div style={{ ...place(P, tx, ty + 68, CW), display: 'flex', flexDirection: 'column', gap: 2 * P }}>
              <span style={{ display: 'flex', justifyContent: 'center' }}>
                <PixelText text={pot > 0 ? `On the table: ${money(pot)}${rides ? ` · rode ${rides}` : ''}` : 'Nothing on the table'} scale={P} ink={INK.gold} />
              </span>
              <div style={{ display: 'flex', gap: 2 * P }}>
                <PxButton lines={['Heads']} scale={P} role={call === 'heads' ? 'raise' : 'plain'} selected={call === 'heads'} height={btnH} flex disabled={!canFlip} testId="coinflip-heads" onClick={() => setCall('heads')} />
                <PxButton lines={['Tails']} scale={P} role={call === 'tails' ? 'raise' : 'plain'} selected={call === 'tails'} height={btnH} flex disabled={!canFlip} testId="coinflip-tails" onClick={() => setCall('tails')} />
              </div>
              <div style={{ display: 'flex', gap: 2 * P }}>
                <ChipRow stakes={affordable} value={stake} onPick={setStake} disabled={!canFlip} P={P} height={btnH} testPrefix="coinflip-stake" />
              </div>
              {phase === 'won' ? (
                <div style={{ display: 'flex', gap: 2 * P }}>
                  <PxButton lines={[`Take ${money(pot)}`]} scale={P} role="barCall" height={btnH} flex testId="coinflip-take" onClick={take} />
                  <PxButton
                    lines={[rides >= MAX_RIDE ? 'He won’t go again' : `Let it ride`]}
                    scale={P}
                    role="raise"
                    height={btnH}
                    flex
                    disabled={rides >= MAX_RIDE}
                    testId="coinflip-ride"
                    onClick={letItRide}
                  />
                </div>
              ) : (
                <PxButton
                  lines={[phase === 'air' ? 'In the air…' : `Flip for ${money(stake)}`]}
                  scale={P}
                  role="barCall"
                  height={btnH}
                  width={CW}
                  disabled={!canFlip || state.cash < stake}
                  testId="coinflip-go"
                  onClick={startFlip}
                />
              )}
              <PxButton
                lines={['Look at the coin']}
                scale={P}
                role="plain"
                height={btnH}
                width={CW}
                disabled={phase === 'air'}
                testId="coinflip-inspect"
                onClick={() => {
                  setOutcome(null)
                  setMessage(inspect(hustler))
                }}
              />
            </div>
            <CoinBurst burst={burst} W={W} H={stage.H} P={P} x={tx + CW / 2} y={ty + 44} kind="coins" count={26} />
          </>
        )
      }}
    </CasinoStage>
  )
}
