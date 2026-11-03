import type { ReelScene } from '../world/events'
import { HERO_FIGURE } from '../overworld/casting'
import { Raster } from './pixel/raster'
import { drawText, measureText, wrapText } from './pixel/font'
import { drawPerson, type WalkFrame } from '../overworld/characterArt'

/**
 * The sets of the short films, drawn at runtime like everything else: a small
 * canvas of flat rectangles, scaled up with nearest-neighbour. Each is a room
 * the story cuts to — the studio of the televised final, the bathroom, the
 * commentators' booth — and none needs more than a dozen shapes to read.
 */

export const REEL_W = 160
export const REEL_H = 90

type Ctx = CanvasRenderingContext2D
type Notification = { from: string; text: string }

/** A line of the pixel font, drawn onto a still. */
function drawLabel(c: Ctx, text: string, x: number, y: number, color: string) {
  const r = new Raster(measureText(text) + 2, 9)
  drawText(r, text, 1, 1, color)
  c.drawImage(r.toCanvas(), x - 1, y - 1)
}

function rect(c: Ctx, color: string, x: number, y: number, w: number, h: number) {
  c.fillStyle = color
  c.fillRect(Math.round(x), Math.round(y), w, h)
}

function person(c: Ctx, x: number, y: number, skin: string, shirt: string, hair: string, headset = false) {
  rect(c, shirt, x - 7, y + 12, 14, 18)
  rect(c, skin, x - 5, y, 10, 11)
  rect(c, hair, x - 5, y - 2, 10, 4)
  rect(c, '#18141c', x - 3, y + 5, 2, 2)
  rect(c, '#18141c', x + 1, y + 5, 2, 2)
  if (headset) {
    rect(c, '#222', x - 6, y + 2, 1, 6)
    rect(c, '#222', x + 5, y + 2, 1, 6)
    rect(c, '#222', x - 6, y + 8, 5, 1)
  }
}

const SCENES: Record<ReelScene, (c: Ctx, t: number, notes?: Notification[]) => void> = {
  // The title card is its own component (`LogoFlash`); this is only what is behind it.
  logo(c) {
    rect(c, '#05040a', 0, 0, REEL_W, REEL_H)
  },
  // The kitchen table and the mail is its own component (`MailTable`).
  mail(c) {
    rect(c, '#05040a', 0, 0, REEL_W, REEL_H)
  },
  // The floodlit final table, a crowd in the dark behind the rail.
  studio(c, t) {
    rect(c, '#0b0a14', 0, 0, REEL_W, REEL_H)
    for (let i = 0; i < 6; i++) rect(c, i % 2 ? '#1c1a30' : '#15132a', 8 + i * 26, 6, 4, 40)
    // Light cones, flickering as if the rig were on its last legs.
    const flick = Math.floor(t / 180) % 7 === 0
    for (let i = 0; i < 4; i++) rect(c, flick ? '#1a1830' : '#3a3558', 26 + i * 36, 0, 8, 6)
    rect(c, '#6a4a2a', 24, 52, 112, 5)
    rect(c, '#1f6a44', 28, 47, 104, 8)
    rect(c, '#18522f', 36, 50, 88, 3)
    const shirts = ['#7a2a2a', '#2a4a7a', '#4a3a6a', '#222222', '#6a6a2a']
    const skins = ['#c8905f', '#8a5a3a', '#e0b890', '#5e3a22', '#f2cfa8']
    skins.forEach((skin, i) => person(c, 34 + i * 24, 28, skin, shirts[i], '#2a2018'))
    for (let i = 0; i < 28; i++) rect(c, '#07060e', 4 + i * 5.6, 64 + (i % 3) * 3, 5, 26)
    rect(c, '#2a2a3a', 0, 86, REEL_W, 4)
  },
  // The back corridor: brick, a row of sconces, the restroom door at the end —
  // and you, in your own sprite, walking to it.
  corridor(c, t) {
    rect(c, '#1a1424', 0, 0, REEL_W, REEL_H)
    for (let row = 0; row < 8; row++) {
      for (let x = row % 2 ? 0 : -8; x < REEL_W; x += 16) rect(c, '#3a2a30', x, row * 6, 15, 5)
    }
    rect(c, '#241c2c', 0, 50, REEL_W, 40)
    rect(c, '#2e2438', 0, 50, REEL_W, 2)
    // Emergency strip along the floor, pulsing.
    const pulse = Math.floor(t / 500) % 2
    rect(c, pulse ? '#c82828' : '#7a1818', 0, 86, REEL_W, 2)
    for (let i = 0; i < 4; i++) {
      rect(c, '#f2c14e', 20 + i * 34, 12, 4, 6)
      rect(c, '#3a2a18', 19 + i * 34, 10, 6, 2)
    }
    // The door, and the sign over it.
    rect(c, '#5a3a2a', 126, 22, 24, 38)
    rect(c, '#3a2418', 128, 24, 20, 34)
    rect(c, '#e8ecea', 128, 12, 20, 7)
    rect(c, '#2a2a30', 130, 14, 16, 3)
    // Walking: frames cycle every 150ms, and the walk ends at the door.
    const x = Math.min(112, -16 + t / 18)
    const walking = x < 112
    const frame = (walking ? Math.floor(t / 150) % 3 : 0) as WalkFrame
    drawPerson(c, HERO_FIGURE, 'right', frame, { x: Math.round(x), y: 36 })
  },
  // Cold tile, a row of sinks, one stall door, a fluorescent tube that hums —
  // you come in at the door and stop at the middle sink.
  bathroom(c, t) {
    rect(c, '#9db3ae', 0, 0, REEL_W, REEL_H)
    for (let y = 0; y < REEL_H; y += 10) rect(c, '#8aa19c', 0, y, REEL_W, 1)
    for (let x = 0; x < REEL_W; x += 10) rect(c, '#8aa19c', x, 0, 1, REEL_H)
    rect(c, '#4a5a58', 0, 64, REEL_W, 26)
    // Three mirrors over three sinks.
    for (const sx of [14, 62, 110]) {
      rect(c, '#6a8088', sx - 1, 14, 38, 30)
      rect(c, '#b8c9cc', sx, 15, 36, 28)
      rect(c, '#e8ecea', sx + 2, 46, 32, 4)
      rect(c, '#cfd6d4', sx + 4, 50, 28, 12)
    }
    // The stall.
    rect(c, '#5a3a2a', 148, 12, 12, 52)
    // The tap running at the middle sink.
    const drip = Math.floor(t / 90) % 4
    rect(c, '#8ec8f0', 79, 52 + drip, 1, 3)
    const hum = Math.floor(t / 90) % 11 === 0
    rect(c, hum ? '#8b8b6a' : '#f4f2c8', 50, 2, 60, 3)
    // In at the door on the right, to the middle sink, and then up to the mirror.
    const arrive = Math.min(1, t / 1800)
    const x = 140 - arrive * (140 - 70)
    const facing = arrive < 1 ? 'left' : 'up'
    const frame = (arrive < 1 ? Math.floor(t / 150) % 3 : 0) as WalkFrame
    drawPerson(c, HERO_FIGURE, facing, frame, { x: Math.round(x), y: 40 })
  },
  // The mirror, close: your own face in your own sprite, large, not having slept.
  mirror(c, t) {
    rect(c, '#2a3438', 0, 0, REEL_W, REEL_H)
    rect(c, '#8fa4a8', 36, 2, 88, 84)
    rect(c, '#b8c9cc', 40, 6, 80, 76)
    const blink = Math.floor(t / 2200) % 3 === 0 && t % 2200 < 160
    drawPerson(c, HERO_FIGURE, 'down', 0, { x: 56, y: 8, scale: 3, blink })
    // A tear that runs down on a loop.
    const drip = Math.floor(t / 130) % 14
    rect(c, '#8ec8f0', 72, 30 + drip, 1, 2)
    rect(c, '#6a8088', 30, 82, 100, 4)
  },
  // A phone on the sink, held close: the lock screen, notifications landing one by one.
  phone(c, t, notes = []) {
    rect(c, '#2a3438', 0, 0, REEL_W, REEL_H)
    rect(c, '#cfd6d4', 0, 76, REEL_W, 14)
    rect(c, '#0b0b10', 14, 0, 132, 90)
    rect(c, '#1c2a4a', 17, 3, 126, 87)
    drawLabel(c, '9:04 PM', 22, 6, '#f2f2f6')
    const buzz = Math.floor(t / 250) % 2
    let y = 15
    notes.forEach((note, i) => {
      const age = t - i * 700
      if (age < 0) return
      const lines = wrapText(note.text, 108).slice(0, 2)
      const h = 13 + lines.length * 8
      if (y + h > 89) return
      const accent = note.from === 'UNKNOWN' ? '#e0605d' : note.from === 'MARCUS' ? '#58c878' : '#f2c14e'
      rect(c, '#e8ecf4', 21, y, 118, h - 1)
      rect(c, accent, 21, y, 2, h - 1)
      drawLabel(c, note.from, 27, y + 2, '#2a2a34')
      lines.forEach((line, k) => drawLabel(c, line, 27, y + 10 + k * 8, '#14141c'))
      y += h
    })
    if (!notes.length) rect(c, buzz ? '#3a6ac8' : '#2f58a8', 25, 20, 110, 30)
  },
  // The booth: two headsets, a monitor between them showing the feed.
  booth(c, t) {
    rect(c, '#14122a', 0, 0, REEL_W, REEL_H)
    rect(c, '#222244', 0, 60, REEL_W, 30)
    rect(c, '#0d0d1a', 54, 14, 52, 32)
    const glow = Math.floor(t / 400) % 2
    rect(c, glow ? '#1f5a44' : '#1a4e3a', 57, 17, 46, 26)
    rect(c, '#e8e8f0', 60, 36, 18, 3)
    person(c, 28, 26, '#f2cfa8', '#c8402f', '#e0a020', true)
    person(c, 130, 26, '#7a4a2e', '#2a4a8a', '#0f0f0f', true)
    rect(c, '#555555', 10, 58, 40, 3)
    rect(c, '#555555', 110, 58, 40, 3)
  },
  // Out the back: brick, a bin, an emergency door standing open on the light.
  alley(c, t) {
    rect(c, '#1a1424', 0, 0, REEL_W, REEL_H)
    for (let row = 0; row < 12; row++) {
      for (let x = row % 2 ? 0 : -8; x < REEL_W; x += 16) rect(c, '#3a2a30', x, row * 6, 15, 5)
    }
    rect(c, '#2a2a30', 0, 70, REEL_W, 20)
    rect(c, '#f4e8a0', 108, 20, 24, 50)
    rect(c, '#2a2230', 106, 18, 28, 4)
    rect(c, '#2d4a3a', 24, 50, 30, 20)
    rect(c, '#1c3226', 24, 48, 32, 4)
    const lamp = Math.floor(t / 300) % 2
    rect(c, lamp ? '#f2c14e' : '#d9a83a', 76, 6, 6, 4)
    rect(c, '#2a2a3a', 78, 10, 2, 60)
    rect(c, '#c82828', 70, 62, 3, 3)
  },
  // The rail: a handful of faces lit from the table, and a hand-lettered sign.
  rail(c, t) {
    rect(c, '#0b0a14', 0, 0, REEL_W, REEL_H)
    rect(c, '#2a1f18', 0, 62, REEL_W, 28)
    const skins = ['#f2cfa8', '#c8905f', '#e0b890', '#8a5a3a', '#5e3a22']
    const hair = ['#4a3a2a', '#222222', '#a8281f', '#2a2018', '#b0b0b8']
    const shirts = ['#6a2a2a', '#2a4a7a', '#3a6a3a', '#7a6a2a', '#5a3a6a']
    skins.forEach((skin, i) => person(c, 24 + i * 28, 30, skin, shirts[i], hair[i]))
    const wave = Math.floor(t / 500) % 2
    rect(c, '#f4f0d8', 62, 18 - wave, 36, 14)
    rect(c, '#a8281f', 66, 22 - wave, 28, 2)
    rect(c, '#a8281f', 66, 26 - wave, 20, 2)
  },
  // A city at night from a long way up: the penthouse, or the road out.
  night(c, t) {
    rect(c, '#080a1a', 0, 0, REEL_W, REEL_H)
    for (let i = 0; i < 40; i++) rect(c, i % 5 ? '#f4f0d8' : '#f2c14e', (i * 37) % REEL_W, (i * 17) % 40, 1, 1)
    const heights = [30, 44, 26, 52, 36, 60, 28, 48, 34, 56, 40, 30]
    const tick = Math.floor(t / 900)
    heights.forEach((h, i) => {
      rect(c, '#14162e', i * 14, 90 - h, 13, h)
      for (let y = 90 - h + 4; y < 86; y += 6) {
        for (let x = i * 14 + 2; x < i * 14 + 11; x += 4) {
          if ((x * 7 + y * 3 + tick * (x % 3)) % 5 < 3) rect(c, '#f2c14e', x, y, 2, 3)
        }
      }
    })
  },
}

/** Draws one set on a REEL_W × REEL_H canvas. `t` is milliseconds, for the things that flicker. */
export function drawReel(canvas: HTMLCanvasElement, scene: ReelScene, t: number, notes?: Notification[]) {
  const c = canvas.getContext('2d')
  if (!c) return
  c.imageSmoothingEnabled = false
  SCENES[scene](c, t, notes)
}
