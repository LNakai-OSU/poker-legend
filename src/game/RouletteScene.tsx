import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import {
  WHEEL_ORDER,
  betKey,
  colorOf,
  settle,
  spinWheel,
  type PlacedBet,
  type PocketColor,
  type RouletteBet,
} from '../engine/roulette'
import { defaultRng } from '../engine/rng'
import { playSound } from '../audio/audio'
import { CasinoStage, centreY, place, themeOfTown, type Stage } from './CasinoStage'
import { CoinBurst } from './CasinoFx'
import { ChipRow, stakeChip } from './CasinoControls'
import { ArtCanvas } from './TableStage'
import { paintRouletteCloth, paintWheel, ROULETTE } from './pixel/casinoArt'
import { chipTopUrl } from './pixel/chips'
import { Panel, PxButton } from './pixel/ui'
import { PixelText } from './pixel/PixelText'
import { INK } from './pixel/ink'
import { Raster } from './pixel/raster'
import type { GameState } from './state'

const STAKES = [10, 50, 200, 1000]
const WHEEL = 104
/** The enlarged, numbered wheel that fills the screen while the ball is in play. */
const BIG = 300
/** How long it stays up after the ball settles. */
const HOLD_MS = 1300
/** How long the ball is in play. */
const SPIN_MS = 4600
const POCKETS = WHEEL_ORDER.length

const FITS = [
  { w: ROULETTE.w + 16, h: WHEEL + ROULETTE.h + 76 },
  { w: WHEEL + ROULETTE.w + 24, h: ROULETTE.h + 86 },
]

const COLOURS: Record<PocketColor, string> = { red: '#b82838', black: '#1c1c24', green: '#1a8a48' }

const short = (n: number) => (n >= 1000 ? `${Math.round(n / 100) / 10}K`.replace('.0', '') : `${n}`)

interface CellDef {
  id: string
  bet: RouletteBet
  x: number
  y: number
  w: number
  h: number
  text: string
  fill: string
}

/** Every place on the cloth a chip can go. */
function cells(): CellDef[] {
  const { cellW, cellH, gridX, gridY, outsideH, zeroW } = ROULETTE
  const out: CellDef[] = [
    { id: 'n0', bet: { kind: 'straight', number: 0 }, x: gridX - zeroW - 1, y: gridY, w: zeroW, h: 3 * cellH, text: '0', fill: COLOURS.green },
  ]
  for (let c = 0; c < 12; c++) {
    for (let r = 0; r < 3; r++) {
      const number = c * 3 + (3 - r)
      out.push({
        id: `n${number}`,
        bet: { kind: 'straight', number },
        x: gridX + c * cellW,
        y: gridY + r * cellH,
        w: cellW,
        h: cellH,
        text: `${number}`,
        fill: COLOURS[colorOf(number)],
      })
    }
  }
  for (let r = 0; r < 3; r++) {
    out.push({
      id: `c${3 - r}`,
      bet: { kind: 'column', column: (3 - r) as 1 | 2 | 3 },
      x: gridX + 12 * cellW + 1,
      y: gridY + r * cellH,
      w: 18,
      h: cellH,
      text: '2:1',
      fill: '#1a4a30',
    })
  }
  const dozenY = gridY + 3 * cellH + 2
  for (let d = 0; d < 3; d++) {
    out.push({
      id: `d${d + 1}`,
      bet: { kind: 'dozen', dozen: (d + 1) as 1 | 2 | 3 },
      x: gridX + d * 4 * cellW,
      y: dozenY,
      w: 4 * cellW,
      h: outsideH,
      text: ['1ST 12', '2ND 12', '3RD 12'][d],
      fill: '#1a4a30',
    })
  }
  const outsideY = dozenY + outsideH + 2
  const outside: Array<[string, RouletteBet, string, string]> = [
    ['half-low', { kind: 'half', half: 'low' }, '1-18', '#1a4a30'],
    ['even', { kind: 'parity', parity: 'even' }, 'EVEN', '#1a4a30'],
    ['red', { kind: 'color', color: 'red' }, 'RED', COLOURS.red],
    ['black', { kind: 'color', color: 'black' }, 'BLACK', COLOURS.black],
    ['odd', { kind: 'parity', parity: 'odd' }, 'ODD', '#1a4a30'],
    ['half-high', { kind: 'half', half: 'high' }, '19-36', '#1a4a30'],
  ]
  // RED and BLACK are the long words, so they get the wider cells.
  const widths = [27, 29, 33, 33, 29, 29]
  let outsideX = gridX
  outside.forEach(([id, bet, text, fill], i) => {
    out.push({ id, bet, x: outsideX, y: outsideY, w: widths[i], h: outsideH, text, fill })
    outsideX += widths[i]
  })
  return out
}

const CELLS = cells()

/**
 * The wheel, redrawn every frame: it turns slowly all the time, and when a spin
 * starts the ball is thrown the other way round the track, loses speed, drops
 * into the pockets with a rattle and rides round in the pocket of the number the
 * engine drew. The ball's landing is worked out first and the throw is made to
 * end exactly there, so what you watch is the number that was drawn.
 */
function Wheel({ P, spin, onLanded }: { P: number; spin: { id: number; number: number } | null; onLanded: (n: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const bigRef = useRef<HTMLCanvasElement>(null)
  const [overlay, setOverlay] = useState<'off' | 'spinning' | 'settled'>('off')
  const turns = useRef(0.13)
  const landed = useRef(onLanded)
  landed.current = onLanded

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    let raf = 0
    let hold = 0
    if (spin) setOverlay('spinning')
    let last = performance.now()
    const started = spin ? last : 0
    const speed = spin ? 0.12 : 0.025
    const pocket = spin ? WHEEL_ORDER.indexOf(spin.number) : 0
    const centre = (pocket + 0.5) / POCKETS
    const land = turns.current + speed * (SPIN_MS / 1000)
    let done = false
    const frame = (now: number) => {
      turns.current += ((now - last) / 1000) * speed
      last = now
      const r = new Raster(WHEEL, WHEEL)
      let ball = null
      if (spin) {
        const p = Math.min(1, (now - started) / SPIN_MS)
        const aboveTurns = land + centre + 6 * Math.pow(1 - p, 2.2)
        const rattle = p > 0.7 ? Math.sin(p * 90) * 0.1 * (1 - p) : 0
        const drop = p < 0.62 ? 0 : p < 0.9 ? Math.pow((p - 0.62) / 0.28, 1.6) : 1
        const abs = p < 1 ? aboveTurns : turns.current + centre
        ball = { angle: abs * Math.PI * 2, drop: Math.max(0, Math.min(1, drop + rattle)) }
        if (p >= 1 && !done) {
          done = true
          landed.current(spin.number)
          setOverlay('settled')
          hold = window.setTimeout(() => setOverlay('off'), HOLD_MS)
        }
      }
      paintWheel(r, WHEEL, turns.current, ball)
      r.paint(canvas)
      if (bigRef.current) {
        const big = new Raster(BIG, BIG)
        paintWheel(big, BIG, turns.current, ball, turns.current, true)
        big.paint(bigRef.current)
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(hold)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spin?.id])

  return (
    <div data-testid="roulette-wheel" style={{ width: WHEEL * P, height: WHEEL * P, position: 'relative' }}>
      <div style={{ position: 'absolute', left: 6 * P, right: 6 * P, bottom: -3 * P, height: 8 * P, background: '#000', opacity: 0.4, borderRadius: '50%' }} />
      <canvas ref={ref} aria-hidden="true" width={WHEEL} height={WHEEL} style={{ position: 'absolute', inset: 0, width: WHEEL * P, height: WHEEL * P, imageRendering: 'pixelated' }} />
      {overlay !== 'off' && (
        <div
          data-testid="roulette-wheel-big"
          onClick={() => overlay === 'settled' && setOverlay('off')}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            background: 'rgba(8, 6, 12, 0.88)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: overlay === 'settled' ? 'auto' : 'none',
          }}
        >
          <canvas
            ref={bigRef}
            aria-hidden="true"
            width={BIG}
            height={BIG}
            style={{ width: 'min(92vw, 92vh)', height: 'min(92vw, 92vh)', imageRendering: 'pixelated' }}
          />
        </div>
      )}
    </div>
  )
}

const cellStyle = (c: CellDef, P: number, lit: boolean, theme: Stage['theme']): CSSProperties => ({
  position: 'absolute',
  left: c.x * P,
  top: c.y * P,
  width: c.w * P,
  height: c.h * P,
  padding: 0,
  margin: 0,
  border: 0,
  background: c.fill,
  boxShadow: `inset 0 0 0 ${P}px ${lit ? '#f8d048' : theme.table.line}, inset 0 ${-2 * P}px 0 0 #00000044`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
})

export function RouletteScene({
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
  const [bets, setBets] = useState<PlacedBet[]>([])
  const [lastBets, setLastBets] = useState<PlacedBet[]>([])
  const [spin, setSpin] = useState<{ id: number; number: number } | null>(null)
  const [spinning, setSpinning] = useState(false)
  const [history, setHistory] = useState<number[]>([])
  const [message, setMessage] = useState('Place your chips on the cloth, then spin.')
  const [net, setNet] = useState<number | null>(null)
  const [winning, setWinning] = useState<number | null>(null)
  const [burst, setBurst] = useState(0)
  const pending = useRef<PlacedBet[]>([])
  const cloth = useMemo(() => paintRouletteCloth(theme), [theme])

  const total = bets.reduce((sum, b) => sum + b.stake, 0)
  const free = state.cash - total
  const stakes = STAKES.filter((s) => s <= Math.max(state.cash, STAKES[0]))

  const put = (bet: RouletteBet) => {
    if (spinning || free < stake) return
    playSound('chip')
    setWinning(null)
    setBets((current) => {
      const key = betKey(bet)
      const at = current.findIndex((b) => betKey(b.bet) === key)
      if (at < 0) return [...current, { bet, stake }]
      return current.map((b, i) => (i === at ? { ...b, stake: b.stake + stake } : b))
    })
  }

  const undo = () => setBets((b) => b.slice(0, -1))
  const clear = () => setBets([])
  const rebet = () => {
    const cost = lastBets.reduce((sum, b) => sum + b.stake, 0)
    if (spinning || cost > state.cash) return
    setWinning(null)
    setBets(lastBets)
  }

  const doSpin = () => {
    if (spinning || total === 0) return
    pending.current = bets
    onResult(-total)
    setSpinning(true)
    setNet(null)
    setWinning(null)
    setMessage('No more bets…')
    playSound('deal')
    setSpin({ id: (spin?.id ?? 0) + 1, number: spinWheel(defaultRng) })
  }

  const landed = (number: number) => {
    const placed = pending.current
    const result = settle(placed, number)
    setSpinning(false)
    setWinning(number)
    setHistory((h) => [number, ...h].slice(0, 10))
    setNet(result.net)
    setLastBets(placed)
    setBets([])
    const name = `${number} ${result.color.toUpperCase()}`
    if (result.returned > 0) {
      onResult(result.returned)
      setMessage(
        result.net > 0
          ? `${name} — you win $${result.net.toLocaleString()}.`
          : result.net === 0
            ? `${name} — you break even.`
            : `${name} — you take back $${result.returned.toLocaleString()}.`,
      )
      if (result.net > 0) {
        playSound(result.net >= 360 ? 'win' : 'cash')
        setBurst((b) => b + 1)
      } else playSound('check')
    } else {
      setMessage(`${name} — the house takes $${total.toLocaleString()}.`)
      playSound('lose')
    }
  }

  return (
    <CasinoStage
      kind="roulette"
      theme={theme}
      title="Roulette"
      subtitle={`Cash $${state.cash.toLocaleString()} · one zero, edge 2.7%`}
      fits={FITS}
      onBack={onBack}
      backLabel="Walk away"
      testId="roulette-scene"
    >
      {(stage) => {
        const { P, W } = stage
        const wide = stage.variant === 1
        const contentW = wide ? WHEEL + 8 + ROULETTE.w : ROULETTE.w
        const ox = Math.max(2, Math.round((W - contentW) / 2))
        const btnH = stage.coarse ? Math.ceil(44 / P) : 16
        const wheelBox = { x: ox, y: centreY(stage, wide ? ROULETTE.h + 4 + 31 + 36 : WHEEL + 4 + ROULETTE.h + 4 + 36) }
        const clothX = wide ? ox + WHEEL + 8 : ox
        const clothY = wide ? stage.top + 4 : wheelBox.y + WHEEL + 4
        const infoX = wide ? ox : ox + WHEEL + 6
        const infoY = wide ? wheelBox.y + WHEEL + 5 : wheelBox.y
        const infoW = wide ? WHEEL : ROULETTE.w - WHEEL - 6
        const infoH = wide ? 40 : WHEEL
        const dockY = (wide ? clothY + ROULETTE.h : clothY + ROULETTE.h) + 4
        const controls = (
            <>
              <div style={{ display: 'flex', gap: 2 * P, marginBottom: 2 * P }}>
                <ChipRow stakes={stakes} value={stake} onPick={setStake} disabled={spinning} P={P} height={btnH} testPrefix="roulette-stake" />
              </div>
              <div style={{ display: 'flex', gap: 2 * P }}>
                <PxButton lines={['Undo']} scale={P} role="fold" height={btnH} flex disabled={spinning || bets.length === 0} testId="roulette-undo" onClick={undo} />
                <PxButton lines={['Clear']} scale={P} role="fold" height={btnH} flex disabled={spinning || bets.length === 0} testId="roulette-clear" onClick={clear} />
                <PxButton lines={['Rebet']} scale={P} role="primary" height={btnH} flex disabled={spinning || lastBets.length === 0 || bets.length > 0} testId="roulette-rebet" onClick={rebet} />
                <PxButton lines={[spinning ? 'Spinning…' : total > 0 ? `Spin ($${total.toLocaleString()})` : 'Spin']} scale={P} role="barCall" height={btnH} width={84} disabled={spinning || total === 0} testId="roulette-spin" onClick={doSpin} />
              </div>
            </>
        )
        return (
          <>
            <div style={place(P, wheelBox.x, wheelBox.y)}>
              <Wheel P={P} spin={spin} onLanded={landed} />
            </div>

            <Panel theme={theme} scale={P} style={{ ...place(P, infoX, infoY, infoW, infoH), padding: `${3 * P}px`, display: 'flex', flexDirection: 'column', gap: 2 * P }}>
              <PixelText text="LAST NUMBERS" scale={P} ink={INK.dark} />
              <div style={{ display: 'flex', gap: P, flexWrap: 'wrap' }} data-testid="roulette-history">
                {history.length === 0 && <PixelText text="None yet" scale={P} ink={{ color: '#7a6a58', shadow: '#d8d0c0' }} />}
                {history.map((n, i) => (
                  <span
                    key={`${i}-${n}`}
                    data-testid="roulette-called"
                    style={{ width: 13 * P, height: 11 * P, background: COLOURS[colorOf(n)], boxShadow: `0 0 0 ${P}px #18141c`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', opacity: i === 0 ? 1 : 0.85 }}
                  >
                    <PixelText text={`${n}`} scale={P} ink={INK.light} />
                  </span>
                ))}
              </div>
              {!wide && (
                <>
                  <PixelText text={`On the cloth: $${total.toLocaleString()}`} scale={P} ink={INK.dark} style={{ marginTop: 'auto' }} />
                  <span data-testid="roulette-result" style={{ display: 'flex' }}>
                    <PixelText
                      text={message}
                      scale={P}
                      wrap
                      maxLines={3}
                      ink={net !== null && net > 0 ? { color: '#1e7a3c', shadow: '#c8e8d0' } : net !== null && net < 0 ? { color: '#a82828', shadow: '#f0d0d0' } : { color: '#5a4a38', shadow: '#d8d0c0' }}
                    />
                  </span>
                </>
              )}
            </Panel>

            <div style={place(P, clothX, clothY, ROULETTE.w, ROULETTE.h)} data-testid="roulette-cloth">
              <ArtCanvas width={ROULETTE.w} height={ROULETTE.h} scale={P} paint={(c) => cloth.paint(c)} />
              {CELLS.map((c) => {
                const placed = bets.find((b) => betKey(b.bet) === betKey(c.bet))
                const lit = winning !== null && c.bet.kind === 'straight' && c.bet.number === winning
                const chip = placed ? stakeChip(placed.stake) : null
                return (
                  <button
                    key={c.id}
                    type="button"
                    data-testid={`roulette-cell-${c.id}`}
                    aria-label={`${c.text}${placed ? `, $${placed.stake} down` : ''}`}
                    disabled={spinning}
                    onClick={() => put(c.bet)}
                    className={lit ? 'casino-blink' : undefined}
                    style={cellStyle(c, P, lit, theme)}
                  >
                    {!(placed && c.w <= 20) && <PixelText text={c.text} scale={P} ink={INK.light} />}
                    {placed && chip && (
                      <span style={{ position: 'absolute', left: c.w > 20 ? `calc(100% - ${9 * P}px)` : '50%', top: '50%', width: 13 * P, height: 13 * P, marginLeft: -6.5 * P, marginTop: -6.5 * P, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                        <img src={chipTopUrl(chip.face, chip.spot)} alt="" draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', imageRendering: 'pixelated' }} />
                        <PixelText text={short(placed.stake)} scale={P} ink={{ color: placed.stake >= 1000 ? '#2a2a36' : '#ffffff', shadow: null }} style={{ position: 'relative' }} />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {wide && (
              <div style={place(P, clothX, dockY, ROULETTE.w)}>
                <Panel theme={theme} scale={P} style={{ padding: `${3 * P}px ${4 * P}px`, marginBottom: 3 * P, display: 'flex', flexDirection: 'column', gap: 2 * P }}>
                  <PixelText text={`On the cloth: $${total.toLocaleString()}`} scale={P} ink={INK.dark} />
                  <span data-testid="roulette-result" style={{ display: 'flex' }}>
                    <PixelText
                      text={message}
                      scale={P}
                      wrap
                      maxLines={2}
                      ink={net !== null && net > 0 ? { color: '#1e7a3c', shadow: '#c8e8d0' } : net !== null && net < 0 ? { color: '#a82828', shadow: '#f0d0d0' } : { color: '#5a4a38', shadow: '#d8d0c0' }}
                    />
                  </span>
                </Panel>
                {controls}
              </div>
            )}
            {!wide && (
              <div style={place(P, ox, dockY, ROULETTE.w)}>
                {controls}
              </div>
            )}
            <CoinBurst burst={burst} W={W} H={stage.H} P={P} x={clothX + ROULETTE.w / 2} y={clothY + 20} kind="chips" count={32} />
          </>
        )

      }}
    </CasinoStage>
  )
}
