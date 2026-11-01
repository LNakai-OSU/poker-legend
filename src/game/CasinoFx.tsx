import { useEffect, useRef } from 'react'
import { Raster } from './pixel/raster'

/** A coin (or chip) in flight: art pixels from the stage's top left. */
interface Piece {
  x: number
  y: number
  vx: number
  vy: number
  spin: number
  hue: number
}

const COIN_INKS = ['#f8d048', '#e0a820', '#fff0a0', '#c88818']
const CHIP_INKS = ['#c82828', '#2e9450', '#3070c8', '#e8e8f0', '#8a4fbd', '#e8b830']

/**
 * A shower of coins or chips from one point, for a win: thrown up, falling, and
 * bouncing once on the way down. Painted pixel by pixel on a canvas laid over the
 * whole stage, so the coins are the same size as every other pixel in the scene.
 * Does nothing at all until `burst` changes from zero.
 */
export function CoinBurst({
  burst,
  W,
  H,
  P,
  x,
  y,
  count = 36,
  kind = 'coins',
}: {
  burst: number
  W: number
  H: number
  P: number
  x: number
  y: number
  count?: number
  kind?: 'coins' | 'chips'
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas || burst === 0) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const pieces: Piece[] = Array.from({ length: reduce ? 8 : count }, () => ({
      x,
      y,
      vx: (Math.random() - 0.5) * 70,
      vy: -(35 + Math.random() * 55),
      spin: Math.random() * 6,
      hue: Math.floor(Math.random() * 4),
    }))
    const ink = kind === 'coins' ? COIN_INKS : CHIP_INKS
    let last = performance.now()
    let raf = 0
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const r = new Raster(W, H)
      let alive = 0
      for (const p of pieces) {
        p.vy += 150 * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.spin += dt * 14
        if (p.y > H - 4 && p.vy > 0) {
          p.vy *= -0.4
          p.vx *= 0.7
          p.y = H - 4
        }
        if (p.y >= H - 4 && Math.abs(p.vy) < 12) continue
        if (p.x < -4 || p.x > W + 4) continue
        alive++
        // A coin turning edge-on: wide, narrow, wide.
        const wide = Math.abs(Math.cos(p.spin)) > 0.45
        const face = ink[(p.hue + (wide ? 0 : 3)) % ink.length]
        const px = Math.round(p.x)
        const py = Math.round(p.y)
        if (kind === 'coins') {
          r.rect(px, py, wide ? 4 : 2, 4, '#3a2808')
          r.rect(px + 1, py + 1, wide ? 2 : 0, 2, face)
          if (wide) r.put(px + 1, py + 1, '#fff6c0')
        } else {
          r.rect(px, py, wide ? 5 : 3, 3, '#18141c')
          r.rect(px + 1, py, wide ? 3 : 1, 2, face)
        }
      }
      r.paint(canvas)
      if (alive > 0) raf = requestAnimationFrame(frame)
      else canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [burst])
  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      width={W}
      height={H}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: W * P,
        height: H * P,
        imageRendering: 'pixelated',
        pointerEvents: 'none',
        zIndex: 20,
      }}
    />
  )
}

