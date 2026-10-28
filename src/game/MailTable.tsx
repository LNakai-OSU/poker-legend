import { useEffect, useRef, useState } from 'react'
import type { ReelLine } from '../world/events'
import { HERO_FIGURE } from '../overworld/casting'
import { PERSON_H, PERSON_W, seatedPixels } from '../overworld/characterArt'
import { isActionKey, useKeyLayer } from './keys'
import { useTouchFirst } from './device'
import { TABLE_THEMES } from './tableThemes'
import { Panel } from './pixel/ui'
import { PixelText } from './pixel/PixelText'
import { INK } from './pixel/ink'
import { snap, useCrispScale } from './useCrispScale'
import { Raster } from './pixel/raster'
import { drawText } from './pixel/font'
import { playSound } from '../audio/audio'

/**
 * Day one, at the kitchen table, going through the mail.
 *
 * The first scene in the flat: the player in their own sprite at the table
 * under the one lamp, with the pile in front of them. The first envelope is the
 * landlord's — a final notice, OVERDUE stamped on it — and the second is the
 * invitation to Marcus's game. Each is turned over with Space (or E, X, a tap);
 * nothing moves on by itself.
 */

const W = 200
const H = 112
const THEME = TABLE_THEMES.home

/** The room, drawn once: wallpaper, a window on the night, floorboards, the table. */
function drawRoom(): Raster {
  const r = new Raster(W, H)
  // Wallpaper: faded stripes, a tide mark of damp along the top.
  for (let x = 0; x < W; x += 8) {
    r.rect(x, 0, 8, 76, x % 16 === 0 ? '#4a4258' : '#443c52')
    r.rect(x + 3, 0, 1, 76, '#554c64')
  }
  r.rect(0, 0, W, 6, '#3a3446')
  for (let x = 0; x < W; x += 13) r.rect(x, 6, 9, 2, '#352f40')
  // Skirting and floorboards.
  r.rect(0, 74, W, 3, '#2a2230')
  r.rect(0, 77, W, 35, '#3a2a22')
  for (let y = 80; y < H; y += 7) r.rect(0, y, W, 1, '#2a1c16')
  for (let x = 0; x < W; x += 29) r.rect(x, 77, 1, 35, '#2a1c16')
  // A window onto the night: city lights across the road, a bakery sign below.
  r.rect(14, 12, 44, 46, '#6a5a48')
  r.rect(17, 15, 38, 40, '#0a1026')
  for (let i = 0; i < 22; i++) r.set(19 + ((i * 11) % 34), 17 + ((i * 7) % 24), i % 3 ? '#f4e8a0' : '#fff')
  r.rect(17, 40, 38, 15, '#14182e')
  for (let i = 0; i < 10; i++) r.rect(19 + i * 3, 42 + ((i * 5) % 9), 2, 2, i % 2 ? '#f2c14e' : '#f4e8a0')
  r.rect(35, 15, 2, 40, '#6a5a48')
  r.rect(17, 34, 38, 2, '#6a5a48')
  r.rect(12, 58, 48, 3, '#7a6a58')
  // The bakery's neon through the glass.
  drawText(r, 'BAKERY', 20, 48, '#f06090')
  // A calendar with the days crossed off, and a cheap print.
  r.rect(150, 14, 24, 30, '#e8e4d0')
  r.rect(150, 14, 24, 6, '#a8281f')
  for (let i = 0; i < 20; i++) {
    const cx = 152 + (i % 5) * 4
    const cy = 22 + Math.floor(i / 5) * 5
    r.rect(cx, cy, 3, 3, '#cfcab4')
    if (i < 15) {
      r.set(cx, cy, '#a82828')
      r.set(cx + 1, cy + 1, '#a82828')
      r.set(cx + 2, cy + 2, '#a82828')
    }
  }
  r.rect(110, 18, 22, 16, '#6a5a48')
  r.rect(112, 20, 18, 12, '#2a5a4a')
  r.rect(116, 24, 10, 4, '#f2c14e')
  // The table: a laminate top on four thin legs, one with a folded beer mat under it.
  r.rect(46, 86, 118, 5, '#8a6a46')
  r.rect(46, 91, 118, 2, '#4a3422')
  r.rect(50, 93, 4, 18, '#4a3422')
  r.rect(156, 93, 4, 18, '#4a3422')
  r.rect(50, 109, 4, 3, '#8a8a8a')
  // A cold mug, the pile's neighbour; a paper bag from the bakery downstairs.
  r.rect(144, 78, 9, 8, '#d8d4c4')
  r.rect(145, 79, 7, 2, '#3a2418')
  r.rect(153, 80, 3, 4, '#d8d4c4')
  r.rect(56, 80, 12, 7, '#c8a878')
  r.rect(56, 80, 12, 2, '#a88858')
  return r
}

const ROOM = drawRoom()
let roomCanvas: HTMLCanvasElement | null = null
const roomPicture = () => (roomCanvas ??= ROOM.toCanvas())

type Step = 'pile' | 'rent' | 'invite'

export function MailTable({ lines, onDone }: { lines: ReelLine[]; onDone: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [step, setStep] = useState<Step>('pile')
  const [tick, setTick] = useState(0)
  const finished = useRef(false)
  const isTop = useKeyLayer(true)
  const touch = useTouchFirst()

  useEffect(() => {
    const timer = window.setInterval(() => setTick((t) => t + 1), 90)
    return () => window.clearInterval(timer)
  }, [])

  const advance = () => {
    if (finished.current) return
    playSound(step === 'pile' ? 'deal' : 'dialogue')
    if (step === 'pile') setStep('rent')
    else if (step === 'rent') setStep('invite')
    else {
      finished.current = true
      onDone()
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isActionKey(e) || !isTop()) return
      e.preventDefault()
      if (!e.repeat) advance()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step])

  // The room, the player, the pile, and the lamp over it all.
  useEffect(() => {
    let frame = 0
    const t0 = performance.now()
    const draw = () => {
      const el = canvas.current
      if (el) {
        const t = performance.now() - t0
        const c = el.getContext('2d')!
        c.imageSmoothingEnabled = false
        c.drawImage(roomPicture(), 0, 0)
        // The player behind the table, head down over the post.
        const blink = Math.floor(t / 2600) % 2 === 0 && t % 2600 < 140
        const pixels = seatedPixels(HERO_FIGURE, 'down', blink)
        const sx = 86
        const sy = 64 + (step === 'pile' ? 0 : 1)
        for (let y = 0; y < PERSON_H; y++) {
          for (let x = 0; x < PERSON_W; x++) {
            const colour = pixels[y * PERSON_W + x]
            if (!colour) continue
            c.fillStyle = colour
            c.fillRect(sx + x, sy + y, 1, 1)
          }
        }
        // The table top over their lap.
        c.drawImage(roomPicture(), 46, 86, 118, 7, 46, 86, 118, 7)
        c.fillStyle = '#8a6a46'
        c.fillRect(46, 86, 118, 5)
        // The pile: envelopes slid over one another, the top one the landlord's.
        const pile: Array<[number, number, number, string]> = [
          [96, 82, 16, '#e8e4d0'],
          [100, 81, 16, '#dcd8c0'],
          [92, 83, 16, '#cfc8b0'],
        ]
        for (const [px, py, w, col] of pile) {
          c.fillStyle = col
          c.fillRect(px, py, w, 6)
          c.fillStyle = 'rgba(0,0,0,0.15)'
          c.fillRect(px, py + 5, w, 1)
        }
        if (step === 'pile') {
          c.fillStyle = '#c82828'
          c.fillRect(104, 82, 6, 2)
        }
        // The lamp: a pendant over the table, its cone breathing a little.
        c.fillStyle = '#2a2a34'
        c.fillRect(104, 0, 1, 40)
        c.fillStyle = '#8a7a3a'
        c.fillRect(96, 40, 17, 5)
        c.fillStyle = '#f4e8a0'
        c.fillRect(98, 45, 13, 2)
        const a = 0.1 + 0.015 * Math.sin(t / 700)
        c.fillStyle = `rgba(244,232,160,${a})`
        c.beginPath()
        c.moveTo(98, 47)
        c.lineTo(111, 47)
        c.lineTo(150, 100)
        c.lineTo(60, 100)
        c.closePath()
        c.fill()
        c.fillStyle = 'rgba(8,6,16,0.28)'
        c.fillRect(0, 0, W, 14)
      }
      frame = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(frame)
  }, [step])

  const P = useCrispScale(W, H + 48, 4)
  const reaction = step === 'rent' ? lines[0] : step === 'invite' ? lines[1] : null
  const narration = step === 'pile' ? 'The mail. You have been stepping over it since Tuesday.' : null

  return (
    <div
      data-testid="mail-table"
      data-step={step}
      onClick={advance}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', height: '100%', paddingTop: 4, userSelect: 'none' }}
    >
      <div style={{ position: 'relative', width: W * P, height: H * P, flex: 'none' }}>
        <canvas ref={canvas} width={W} height={H} style={{ width: W * P, height: H * P, imageRendering: 'pixelated', display: 'block' }} />
        {step === 'rent' && (
          <Letter P={P} key="rent" tilt={-2} lines={RENT} stamp="OVERDUE" />
        )}
        {step === 'invite' && (
          <Letter P={P} key="invite" tilt={1.5} lines={INVITE} />
        )}
      </div>
      <Panel
        theme={THEME}
        scale={P}
        testId="mail-line"
        style={{ width: W * P, boxSizing: 'border-box', padding: `${3 * P}px ${4 * P}px`, minHeight: 30 * P, marginTop: 2 * P, flex: 'none' }}
      >
        {reaction && (
          <div style={{ marginBottom: 2 * P }}>
            <PixelText text="You" scale={P} ink={{ color: '#a8281f', shadow: '#e8c8c0' }} />
          </div>
        )}
        <PixelText text={reaction ? reaction.text : (narration ?? ' ')} scale={P} wrap ink={INK.dark} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: P }}>
          <PixelText
            text={touch ? 'tap ▸' : 'space ▸'}
            scale={P}
            ink={{ color: '#8a8a98', shadow: '#dcdce4' }}
            style={{ opacity: Math.floor(tick / 5) % 2 ? 0.3 : 1 }}
          />
        </div>
      </Panel>
    </div>
  )
}

const RENT = {
  head: 'ROSEWOOD PROPERTY MANAGEMENT',
  title: 'FINAL NOTICE',
  body: ['Unit 2B, above the bakery.', 'Rent of $640 is now OVERDUE.', 'Pay in full within nine days or the unit will be reclaimed.'],
}
const INVITE = {
  head: 'YOU ARE INVITED',
  title: 'FRIDAY NIGHT. MY PLACE.',
  body: ['Kitchen table. One deck.', 'Winner takes the whole pot.', 'Bring cash you can stand to lose.', '— Marcus'],
}

/** A letter held up in front of the room, tilted a little, with its stamp thumped on after it arrives. */
function Letter({ P, tilt, lines, stamp }: { P: number; tilt: number; lines: typeof RENT; stamp?: string }) {
  const paper = '#f4f0dc'
  // The type on the page is smaller than the type in the box: it is paper, not a menu.
  const t = snap(Math.max(1, P / 2))
  return (
    <div
      data-testid="letter"
      style={{
        position: 'absolute',
        left: 150 * P,
        top: 3 * P,
        width: 84 * P,
        padding: `${3 * P}px ${4 * P}px`,
        boxSizing: 'border-box',
        background: paper,
        border: `${P}px solid #8a7a58`,
        boxShadow: `${2 * P}px ${3 * P}px 0 rgba(0,0,0,0.45)`,
        transform: `translateX(-50%) rotate(${tilt}deg)`,
        animation: 'letter-in 380ms ease-out both',
      }}
    >
      <PixelText text={lines.head} scale={t} wrap ink={{ color: '#5a4a38', shadow: '#e0d8bc' }} />
      <div style={{ margin: `${2 * t}px 0` }}>
        <PixelText text={lines.title} scale={t} wrap ink={{ color: '#a8281f', shadow: '#f0d0c8' }} />
      </div>
      {lines.body.map((line) => (
        <div key={line} style={{ marginBottom: t }}>
          <PixelText text={line} scale={t} wrap ink={{ color: '#3a3a48', shadow: '#e0d8bc' }} />
        </div>
      ))}
      {stamp && (
        <div
          data-testid="stamp"
          style={{
            position: 'absolute',
            right: 2 * P,
            top: 10 * t,
            padding: `${t}px ${2 * t}px`,
            border: `${t}px solid #c82828`,
            transform: 'rotate(-14deg)',
            animation: 'stamp-thump 300ms 520ms cubic-bezier(.2,1.6,.4,1) both',
          }}
        >
          <PixelText text={stamp} scale={t + 1} ink={{ color: '#c82828', shadow: '#f0d0c8' }} />
        </div>
      )}
    </div>
  )
}
