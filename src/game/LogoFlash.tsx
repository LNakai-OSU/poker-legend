import { useEffect, useRef } from 'react'
import { isActionKey, useKeyLayer } from './keys'
import { Raster } from './pixel/raster'
import { drawText } from './pixel/font'
import { playSound } from '../audio/audio'

/**
 * The tournament's title card, struck in pixels: a white flash, a burst of rays
 * behind a crown and a laurel, the name slammed in in gold and swept with a
 * shine. It is the first thing the game shows, so that whatever follows — the
 * broadcast, the table — is plainly the Legends Invitational.
 */

const W = 240
const H = 135
const TOTAL_MS = 3400

/** A line of pixel type at a whole-number scale, in gold with a shadow and a lit top edge. */
function goldText(text: string, scale: number): HTMLCanvasElement {
  const small = new Raster(text.length * 7 + 4, 14)
  drawText(small, text, 1, 1, '#ffffff')
  const src = small.toCanvas()
  const out = document.createElement('canvas')
  out.width = src.width * scale + scale * 2
  out.height = src.height * scale + scale * 2
  const c = out.getContext('2d')!
  c.imageSmoothingEnabled = false
  // Shadow, body, then the highlight: the same shape three times.
  const tint = (color: string, dx: number, dy: number) => {
    const layer = document.createElement('canvas')
    layer.width = src.width
    layer.height = src.height
    const l = layer.getContext('2d')!
    l.drawImage(src, 0, 0)
    l.globalCompositeOperation = 'source-in'
    l.fillStyle = color
    l.fillRect(0, 0, src.width, src.height)
    c.drawImage(layer, dx, dy, layer.width * scale, layer.height * scale)
  }
  tint('#3a2208', scale * 2, scale * 2)
  tint('#c8901c', scale, scale)
  tint('#f8d048', scale, 0)
  tint('#fff4b0', scale, -Math.max(1, Math.floor(scale / 3)))
  return out
}

/** A crown, five points, jewelled. */
function crown(c: CanvasRenderingContext2D, x: number, y: number) {
  const gold = '#f8d048'
  const shade = '#c8901c'
  const dark = '#5a3a10'
  c.fillStyle = dark
  c.fillRect(x - 1, y + 7, 26, 9)
  c.fillStyle = gold
  c.fillRect(x, y + 8, 24, 7)
  c.fillStyle = shade
  c.fillRect(x, y + 13, 24, 2)
  for (const px of [0, 6, 12, 18, 23]) {
    c.fillStyle = dark
    c.fillRect(x + px - 1, y + (px === 12 ? 0 : 3), 4, 9)
    c.fillStyle = gold
    c.fillRect(x + px, y + (px === 12 ? 1 : 4), 2, 8)
    c.fillStyle = '#fff4b0'
    c.fillRect(x + px, y + (px === 12 ? 1 : 4), 2, 2)
  }
  c.fillStyle = '#d82848'
  c.fillRect(x + 11, y + 10, 3, 3)
  c.fillStyle = '#3888e8'
  c.fillRect(x + 4, y + 11, 2, 2)
  c.fillRect(x + 18, y + 11, 2, 2)
}

/** A laurel branch sweeping up and out from either side of the crown. */
function laurel(c: CanvasRenderingContext2D, cx: number, flip: boolean) {
  const dir = flip ? -1 : 1
  for (let i = 0; i < 9; i++) {
    const x = cx + dir * (18 + i * 6)
    const y = 36 - Math.round(i * i * 0.16)
    c.fillStyle = i % 2 ? '#48b050' : '#2f8a3a'
    c.fillRect(flip ? x - 5 : x, y, 5, 3)
    c.fillStyle = '#88e090'
    c.fillRect(flip ? x - 5 : x + 2, y, 2, 1)
    c.fillStyle = '#c8901c'
    c.fillRect(x, y + 3, 1, 2)
  }
}

export function LogoFlash({ onDone }: { onDone: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const finished = useRef(false)
  const isTop = useKeyLayer(true)
  const title = useRef<{ legends: HTMLCanvasElement; invitational: HTMLCanvasElement; sub: HTMLCanvasElement } | null>(null)

  const done = () => {
    if (finished.current) return
    finished.current = true
    onDone()
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isActionKey(e) || !isTop()) return
      e.preventDefault()
      if (!e.repeat) done()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    title.current = {
      legends: goldText('LEGENDS', 4),
      invitational: goldText('INVITATIONAL', 2),
      sub: goldText('FINAL TABLE · PORTO LUMINA', 1),
    }
    playSound('win')
    let frame = 0
    const t0 = performance.now()
    const draw = () => {
      const el = canvas.current
      const t = performance.now() - t0
      if (el && title.current) {
        const c = el.getContext('2d')!
        c.imageSmoothingEnabled = false
        c.fillStyle = '#05040a'
        c.fillRect(0, 0, W, H)
        // A burst of rays, turning slowly, brighter once the name lands.
        const lit = Math.min(1, Math.max(0, (t - 150) / 500))
        const cx = W / 2
        const cy = 62
        for (let i = 0; i < 18; i++) {
          const a = t / 5200 + (i * Math.PI) / 9
          c.fillStyle = `rgba(248,208,72,${(i % 2 ? 0.1 : 0.05) * lit})`
          c.beginPath()
          c.moveTo(cx, cy)
          c.lineTo(cx + Math.cos(a) * 220, cy + Math.sin(a) * 220)
          c.lineTo(cx + Math.cos(a + 0.12) * 220, cy + Math.sin(a + 0.12) * 220)
          c.closePath()
          c.fill()
        }
        // The slam: the name arrives large and settles, with a pop of brightness.
        const slam = Math.min(1, Math.max(0, (t - 200) / 380))
        const ease = 1 - Math.pow(1 - slam, 3)
        const scale = 1.5 - 0.5 * ease
        const { legends, invitational, sub } = title.current
        if (slam > 0) {
          c.save()
          c.globalAlpha = Math.min(1, slam * 2)
          c.translate(cx, 72)
          c.scale(scale, scale)
          c.translate(-cx, -72)
          laurel(c, cx, false)
          laurel(c, cx, true)
          crown(c, cx - 12, 14)
          c.drawImage(legends, Math.round(cx - legends.width / 2), 44)
          c.drawImage(invitational, Math.round(cx - invitational.width / 2), 80)
          c.restore()
          c.globalAlpha = Math.min(1, Math.max(0, (t - 900) / 400))
          c.drawImage(sub, Math.round(cx - sub.width / 2), 106)
          c.globalAlpha = 1
          // The shine: a bright diagonal band sweeping across the lettering only.
          const sweep = (t - 1000) / 900
          if (sweep > 0 && sweep < 1) {
            const layer = document.createElement('canvas')
            layer.width = W
            layer.height = H
            const l = layer.getContext('2d')!
            l.imageSmoothingEnabled = false
            l.drawImage(legends, Math.round(cx - legends.width / 2), 44)
            l.drawImage(invitational, Math.round(cx - invitational.width / 2), 80)
            l.globalCompositeOperation = 'source-atop'
            const x = -40 + sweep * (W + 80)
            const g = l.createLinearGradient(x - 14, 0, x + 14, 0)
            g.addColorStop(0, 'rgba(255,255,255,0)')
            g.addColorStop(0.5, 'rgba(255,255,255,0.95)')
            g.addColorStop(1, 'rgba(255,255,255,0)')
            l.fillStyle = g
            l.fillRect(0, 0, W, H)
            c.drawImage(layer, 0, 0)
          }
        }
        // The flash that opens it, and the dark that closes it.
        if (t < 260) {
          c.fillStyle = `rgba(255,255,255,${1 - t / 260})`
          c.fillRect(0, 0, W, H)
        }
        if (t > TOTAL_MS - 400) {
          c.fillStyle = `rgba(5,4,10,${Math.min(1, (t - (TOTAL_MS - 400)) / 400)})`
          c.fillRect(0, 0, W, H)
        }
        if (t > TOTAL_MS) done()
      }
      frame = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div
      data-testid="logo-flash"
      onClick={done}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}
    >
      <canvas
        ref={canvas}
        width={W}
        height={H}
        style={{ width: 'min(100vw, calc(100vh * 240 / 135))', aspectRatio: `${W} / ${H}`, imageRendering: 'pixelated', display: 'block' }}
      />
    </div>
  )
}
