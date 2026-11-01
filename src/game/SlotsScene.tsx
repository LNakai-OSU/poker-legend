import { useEffect, useMemo, useRef, useState } from 'react'
import { SLOT_SYMBOLS, spin, theoreticalReturn, type SlotSymbol, type SpinResult } from '../engine/slots'
import { defaultRng } from '../engine/rng'
import { playSound } from '../audio/audio'
import { CasinoStage, centreY, place, themeOfTown, type Stage } from './CasinoStage'
import { CoinBurst } from './CasinoFx'
import { ChipRow } from './CasinoControls'
import { ArtCanvas } from './TableStage'
import { CABINET, REELS, REELS_H, SYMBOL_H, paintCabinet, stripRaster, symbolRaster } from './pixel/casinoArt'
import { measureText } from './pixel/font'
import { Panel, PxButton } from './pixel/ui'
import { PixelText } from './pixel/PixelText'
import { INK } from './pixel/ink'
import { Raster } from './pixel/raster'
import type { GameState } from './state'

const SLOTS_FIT = [{ w: CABINET.w + 24, h: CABINET.h + 72 }]

/** What a pull may cost. */
const STAKES = [10, 50, 200, 1000]

/** The order the symbols come round on every reel: seven of the commonest to one diamond. */
const STRIP_ORDER = [
  'cherry', 'bell', 'cherry', 'bar', 'cherry', 'bell', 'seven', 'cherry', 'bell', 'bar',
  'cherry', 'diamond', 'bell', 'cherry', 'bar', 'cherry', 'bell', 'seven', 'cherry', 'bar',
]
const N = STRIP_ORDER.length

/** Where on the strip the reels wait before the first pull. */
const RESTING = [6, 11, 0]
/** When each reel stops, from the pull, in milliseconds. */
const STOPS = [520, 720, 920]

const easeOutBack = (u: number) => {
  const c1 = 1.1
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2)
}

/** A pull in progress: where each reel is to stop. */
interface Run {
  id: number
  stops: number[]
}

/**
 * Three reels, each a strip of painted symbols turning behind its window. A reel
 * is drawn pixel by pixel from the strip every frame, blurring in the direction
 * it travels in proportion to how fast it is going, so a fast reel smears and a
 * slowing one sharpens into symbols before it stops, with one small overshoot.
 */
function Reels({ P, run, onStopped }: { P: number; run: Run | null; onStopped: () => void }) {
  const refs = [useRef<HTMLCanvasElement>(null), useRef<HTMLCanvasElement>(null), useRef<HTMLCanvasElement>(null)]
  const strip = useMemo(() => stripRaster(STRIP_ORDER), [])
  const at = useRef<number[]>([...RESTING])
  const stopped = useRef(onStopped)
  stopped.current = onStopped

  useEffect(() => {
    const drawAll = (positions: number[], speeds: number[]) => {
      positions.forEach((p, i) => {
        const canvas = refs[i].current
        if (!canvas) return
        const out = new Raster(REELS.w, REELS_H)
        const blur = Math.min(5, 1 + Math.floor(speeds[i] / 5))
        for (let y = 0; y < REELS_H; y++) {
          for (let x = 0; x < REELS.w; x++) {
            let rr = 0, gg = 0, bb = 0
            for (let k = 0; k < blur; k++) {
              const off = (k - (blur - 1) / 2) * 2.5
              const sy = Math.floor((((p - 1) * SYMBOL_H + y + off) % strip.height + strip.height) % strip.height)
              const c = strip.pixels[sy * strip.width + x]
              rr += c & 0xff
              gg += (c >> 8) & 0xff
              bb += (c >> 16) & 0xff
            }
            out.put(x, y, (255 << 24) | (Math.round(bb / blur) << 16) | (Math.round(gg / blur) << 8) | Math.round(rr / blur))
          }
        }
        // The window's shadow: the reel curves away at the top and bottom edge.
        out.each(0, 0, REELS.w, REELS_H, (_x, y) => {
          const k = Math.abs(y - REELS_H / 2) / (REELS_H / 2)
          return k > 0.68 ? ((Math.round((k - 0.68) * 330) << 24) >>> 0) : null
        })
        out.paint(canvas)
      })
    }
    if (!run) {
      drawAll(at.current, [0, 0, 0])
      return
    }
    const from = [...at.current]
    // Each reel turns a few whole laps more than the one before, then comes to its stop.
    const to = run.stops.map((stop, i) => {
      const base = from[i] - (((from[i] % N) + N) % N)
      let final = base + stop + N * (2 + i)
      if (final < from[i] + N) final += N
      return final
    })
    const started = performance.now()
    let raf = 0
    let finished = 0
    const lastP = [...from]
    const frame = (now: number) => {
      const t = now - started
      const pos: number[] = []
      const speed: number[] = []
      to.forEach((end, i) => {
        const u = Math.min(1, t / STOPS[i])
        const p = from[i] + (end - from[i]) * easeOutBack(u)
        pos.push(p)
        speed.push(Math.abs(p - lastP[i]) * SYMBOL_H)
        lastP[i] = p
        if (u >= 1 && finished < i + 1) finished = i + 1
      })
      drawAll(pos, speed)
      at.current = pos
      if (t < STOPS[2] + 30) raf = requestAnimationFrame(frame)
      else {
        at.current = to.map((e) => e)
        drawAll(at.current, [0, 0, 0])
        stopped.current()
      }
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run?.id])

  return (
    <>
      {refs.map((ref, i) => (
        <canvas
          key={i}
          ref={ref}
          aria-hidden="true"
          width={REELS.w}
          height={REELS_H}
          style={{
            position: 'absolute',
            left: (REELS.x + i * (REELS.w + REELS.gap)) * P,
            top: REELS.y * P,
            width: REELS.w * P,
            height: REELS_H * P,
            imageRendering: 'pixelated',
          }}
        />
      ))}
    </>
  )
}

/** The paytable: each symbol, three of a kind, and what it pays. */
function Paytable({ stage, x, y }: { stage: Stage; x: number; y: number }) {
  const { P, theme } = stage
  const rows = [...SLOT_SYMBOLS].sort((a, b) => b.triplePays - a.triplePays)
  return (
    <Panel theme={theme} scale={P} testId="slot-paytable" style={{ ...place(P, x, y, 66), padding: `${3 * P}px ${4 * P}px` }}>
      <PixelText text="THREE PAY" scale={P} ink={INK.dark} style={{ marginBottom: 2 * P }} />
      {rows.map((s) => (
        <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 18 * P }}>
          <span style={{ position: 'relative', width: 26 * P, height: 18 * P, flex: 'none' }}>
            <ArtCanvas width={26} height={18} scale={P} paint={(c) => symbolRaster(s.id).paint(c)} />
          </span>
          <PixelText text={`x${s.triplePays}`} scale={P} ink={INK.dark} />
        </div>
      ))}
    </Panel>
  )
}

export function SlotsScene({
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
  const [result, setResult] = useState<SpinResult | null>(null)
  const [spinning, setSpinning] = useState(false)
  const [run, setRun] = useState<Run | null>(null)
  const [lamp, setLamp] = useState<0 | 1 | 2>(0)
  const [burst, setBurst] = useState(0)
  const [pulled, setPulled] = useState(false)
  const pending = useRef<SpinResult | null>(null)
  const canPlay = state.cash >= stake && !spinning

  // The marquee's bulbs: a slow blink at rest, a chase while the reels turn or a win is shown.
  const chasing = spinning || (result?.payout ?? 0) > 0
  useEffect(() => {
    const id = window.setInterval(() => setLamp((l) => (chasing ? (((l + 1) % 3) as 0 | 1 | 2) : l === 0 ? 1 : 0)), chasing ? 110 : 700)
    return () => window.clearInterval(id)
  }, [chasing])

  const doSpin = () => {
    if (!canPlay) return
    const final = spin(stake, defaultRng)
    pending.current = final
    setSpinning(true)
    setResult(null)
    setPulled(true)
    window.setTimeout(() => setPulled(false), 260)
    playSound('chip')
    onResult(-stake)
    // Where on each strip the winning faces are: any place that shows the symbol.
    const stops = final.reels.map((symbol: SlotSymbol) => {
      const places = STRIP_ORDER.flatMap((id, i) => (id === symbol.id ? [i] : []))
      return places[Math.floor(defaultRng() * places.length)]
    })
    setRun({ id: (run?.id ?? 0) + 1, stops })
  }

  const settled = () => {
    const final = pending.current
    if (!final) return
    pending.current = null
    setSpinning(false)
    setResult(final)
    if (final.payout > 0) {
      onResult(final.payout)
      playSound(final.payout >= stake * 20 ? 'win' : 'cash')
      setBurst((b) => b + 1)
    }
  }

  const status = spinning
    ? 'Spinning…'
    : result
      ? `${result.label}${result.payout ? ` — won $${result.payout.toLocaleString()}` : ''}`
      : 'Pick a stake and pull.'

  return (
    <CasinoStage
      kind="slots"
      theme={theme}
      title="Slot Row"
      subtitle={`Cash $${state.cash.toLocaleString()} · pays back ${Math.round(theoreticalReturn() * 100)}%`}
      fits={SLOTS_FIT}
      onBack={onBack}
      backLabel="Walk away"
      testId="slots-scene"
    >
      {(stage) => {
        const { P, W } = stage
        const cx = Math.round((W - CABINET.w) / 2)
        const cy = centreY(stage, CABINET.h + 26 + 2 * 16)
        const won = (result?.payout ?? 0) > 0
        const ctrlY = cy + CABINET.h + 3
        const btnH = stage.coarse ? Math.ceil(44 / P) : 16
        const marquee = won ? `WIN $${result!.payout.toLocaleString()}` : spinning ? 'GOOD LUCK' : 'LUCKY SEVENS'
        const zoom = measureText(marquee) * 2 <= CABINET.w - 24 ? 2 : 1
        return (
          <>
            <div style={place(P, cx, cy, CABINET.w, CABINET.h)} data-testid="slot-cabinet">
              <ArtCanvas width={CABINET.w} height={CABINET.h} scale={P} paint={(c) => paintCabinet(theme, lamp).paint(c)} />
              <div
                className={won ? 'casino-blink' : undefined}
                style={{ ...place(P, 8, 7, CABINET.w - 16, 20), display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <PixelText text={marquee} scale={P * zoom} ink={won ? INK.gold : { color: '#ffe9a8', shadow: '#5a1a10' }} />
              </div>
              <div data-testid="slot-reels" style={{ position: 'absolute', inset: 0 }}>
                <Reels P={P} run={run} onStopped={settled} />
                {won && !spinning && (
                  <div
                    className="casino-blink"
                    style={{
                      ...place(P, REELS.x - 2, REELS.y + SYMBOL_H - 1, 3 * REELS.w + 2 * REELS.gap + 4, SYMBOL_H + 2),
                      boxShadow: `0 0 0 ${P}px #f8d048, 0 0 ${6 * P}px ${2 * P}px #f8d04888`,
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </div>
            </div>
            <Lever stage={stage} x={cx + CABINET.w - 2} y={cy + 44} pulled={pulled} disabled={!canPlay} onPull={doSpin} />
            {W >= CABINET.w + 2 * 74 + 12 && <Paytable stage={stage} x={cx - 74} y={cy + 20} />}
            <Panel
              theme={theme}
              scale={P}
              style={{ ...place(P, cx, ctrlY, CABINET.w, 16), display: 'flex', alignItems: 'center', justifyContent: 'center', padding: `0 ${3 * P}px` }}
            >
              <span data-testid="slot-result" style={{ display: 'inline-flex', color: won ? '#2a8a4a' : '#6a5a48' }}>
                <PixelText text={status} scale={P} ink={won ? { color: '#1e7a3c', shadow: '#c8e8d0' } : INK.dark} />
              </span>
            </Panel>
            <div style={{ ...place(P, cx, ctrlY + 19, CABINET.w), display: 'flex', flexDirection: 'column', gap: 2 * P }}>
              <div style={{ display: 'flex', gap: 2 * P }}>
                <ChipRow
                  stakes={STAKES.filter((s) => s <= Math.max(state.cash, STAKES[0]))}
                  value={stake}
                  onPick={setStake}
                  disabled={spinning}
                  P={P}
                  height={btnH}
                  testPrefix="slot-stake"
                />
              </div>
              <div style={{ display: 'flex' }}>
                <PxButton
                  lines={[state.cash < stake ? 'Not enough cash' : `Spin ($${stake})`]}
                  scale={P}
                  role="barCall"
                  height={btnH}
                  flex
                  disabled={!canPlay}
                  testId="slot-spin"
                  onClick={doSpin}
                />
              </div>
            </div>
            <CoinBurst burst={burst} W={W} H={stage.H} P={P} x={cx + CABINET.w / 2} y={cy + CABINET.h - 18} count={44} />
          </>
        )
      }}
    </CasinoStage>
  )
}

/** The arm on the cabinet's side, which can be pulled with a click as well as the button. */
function Lever({ stage, x, y, pulled, disabled, onPull }: { stage: Stage; x: number; y: number; pulled: boolean; disabled: boolean; onPull: () => void }) {
  const { P } = stage
  const frames = useMemo(() => {
    const draw = (down: boolean) => {
      const r = new Raster(14, 50)
      r.rect(0, 14, 4, 22, '#12101a')
      r.rect(0, 15, 3, 20, '#9ca0b4')
      r.vline(0, 15, 20, '#f0f2fa')
      const ball = down ? 34 : 4
      const x0 = down ? 8 : 6
      for (let i = 0; i < 18; i++) {
        const f = i / 17
        const yy = down ? 22 + f * 12 : 22 - f * 16
        r.rect(Math.round(2 + f * (x0 - 2)), Math.round(yy), 3, 3, i % 5 === 0 ? '#e8ecf8' : '#a8aec4')
      }
      r.ellipse(x0 - 3, ball - 1, 9, 9, '#12101a')
      r.ellipse(x0 - 2, ball, 7, 7, '#e83030')
      r.rect(x0 - 1, ball + 1, 2, 2, '#ffb0a0')
      return r
    }
    return [draw(false), draw(true)]
  }, [])
  return (
    <button
      type="button"
      aria-label="Pull the lever"
      disabled={disabled}
      onClick={onPull}
      style={{ ...place(P, x, y, 14, 50), padding: 0, border: 0, background: 'none', cursor: disabled ? 'not-allowed' : 'pointer' }}
    >
      <ArtCanvas width={14} height={50} scale={P} paint={(c) => frames[pulled ? 1 : 0].paint(c)} />
    </button>
  )
}
