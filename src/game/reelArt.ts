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
  // The penthouse, forty-one floors up: every wall a trophy case, a desk with a lamp, the harbour in the glass.
  penthouse(c, t) {
    rect(c, '#241a2e', 0, 0, REEL_W, 66)
    for (let x = 0; x < REEL_W; x += 20) rect(c, '#2e2238', x, 4, 1, 60)
    rect(c, '#6a5030', 0, 0, REEL_W, 3)
    rect(c, '#8a6a3a', 0, 3, REEL_W, 1)
    rect(c, '#6a5030', 0, 62, REEL_W, 3)
    // Floor and rug.
    rect(c, '#3a2418', 0, 66, REEL_W, 24)
    for (let y = 70; y < 90; y += 5) rect(c, '#2e1c12', 0, y, REEL_W, 1)
    rect(c, '#c9a14a', 28, 72, 104, 16)
    rect(c, '#5a1f2e', 30, 74, 100, 12)
    for (let x = 36; x < 126; x += 10) rect(c, '#7a2a3a', x, 78, 4, 4)
    // Framed certificates.
    for (const [x, y, w, h] of [[5, 8, 15, 19], [23, 6, 17, 21], [43, 9, 13, 17]] as const) {
      rect(c, '#c9a14a', x, y, w, h)
      rect(c, '#efe6c8', x + 2, y + 2, w - 4, h - 4)
      rect(c, '#9a9484', x + 4, y + 5, w - 8, 1)
      rect(c, '#9a9484', x + 4, y + 8, w - 8, 1)
      rect(c, '#a8281f', x + w / 2 - 1, y + h - 7, 3, 3)
    }
    // A velvet board of medals, ribbon and gold.
    rect(c, '#c9a14a', 4, 30, 54, 28)
    rect(c, '#1a1024', 6, 32, 50, 24)
    for (let i = 0; i < 12; i++) {
      const x = 9 + (i % 6) * 8
      const y = 34 + Math.floor(i / 6) * 11
      rect(c, i % 3 === 0 ? '#a8281f' : i % 3 === 1 ? '#2a4a9a' : '#2a7a4a', x + 1, y, 3, 4)
      rect(c, '#e8b830', x, y + 4, 5, 5)
      rect(c, '#b08a20', x + 1, y + 5, 3, 3)
      if ((Math.floor(t / 260) + i * 5) % 11 === 0) rect(c, '#fffbe0', x + 1, y + 4, 1, 1)
    }
    // The shelves of cups.
    for (const sy of [34, 50]) {
      rect(c, '#6a4a2a', 66, sy + 10, 58, 2)
      for (let i = 0; i < 5; i++) {
        const x = 70 + i * 11
        const tall = i % 2 ? 6 : 9
        rect(c, '#e8b830', x, sy + 10 - 2, 6, 2)
        rect(c, '#b08a20', x + 2, sy + 10 - 2 - tall / 2, 2, tall / 2)
        rect(c, '#f2c14e', x - 1, sy + 10 - 2 - tall - 3, 8, 4)
        rect(c, '#e8b830', x - 2, sy + 10 - tall - 4, 1, 2)
        rect(c, '#e8b830', x + 7, sy + 10 - tall - 4, 1, 2)
        if ((Math.floor(t / 300) + i + sy) % 9 === 0) rect(c, '#fffbe0', x + 1, sy + 10 - tall - 3, 1, 1)
      }
    }
    // The big plaque.
    rect(c, '#c9a14a', 68, 8, 52, 17)
    rect(c, '#14101c', 70, 10, 48, 13)
    drawLabel(c, 'CHAMPION', 76, 12, '#f2c14e')
    // Chandelier.
    rect(c, '#c9a14a', 90, 4, 12, 2)
    for (let i = 0; i < 5; i++) rect(c, (Math.floor(t / 400) + i) % 4 === 0 ? '#fffbe0' : '#f2c14e', 88 + i * 4, 6, 2, 3)
    // The window.
    rect(c, '#14101c', 132, 6, 26, 56)
    rect(c, '#0a0c24', 134, 8, 22, 52)
    for (let i = 0; i < 14; i++) rect(c, i % 3 ? '#f2c14e' : '#f4f0d8', 135 + (i * 7) % 20, 30 + ((i * 5) % 26), 1, 2)
    rect(c, '#14101c', 144, 8, 2, 52)
    // Sofa.
    rect(c, '#4a1220', 4, 56, 46, 10)
    rect(c, '#6a1f2e', 6, 58, 42, 7)
    rect(c, '#7a2a3a', 8, 64, 38, 6)
    rect(c, '#4a1220', 2, 58, 5, 12)
    rect(c, '#4a1220', 47, 58, 5, 12)
    for (let x = 14; x < 44; x += 10) rect(c, '#5a1828', x, 60, 1, 8)
    // Desk, lamp, the frame and papers on it.
    rect(c, '#2a1810', 70, 70, 4, 6)
    rect(c, '#2a1810', 112, 70, 4, 6)
    rect(c, '#5a3418', 66, 62, 56, 4)
    rect(c, '#3a2012', 68, 66, 52, 6)
    rect(c, '#c9a14a', 98, 54, 6, 8)
    rect(c, '#d89a8a', 99, 55, 4, 6)
    rect(c, '#f2eee0', 80, 60, 12, 2)
    rect(c, '#2a2a30', 71, 56, 1, 6)
    rect(c, '#1f6a44', 68, 53, 7, 4)
    rect(c, '#f4e8a0', 66, 63, 2, 1)
    // Whoever has just come in, standing a little way off, breathing.
    drawPerson(c, HERO_FIGURE, 'right', 0, { x: 50, y: 40 + (Math.floor(t / 900) % 2) })
    // A faint vignette so the room feels late.
    rect(c, 'rgba(5,4,10,0.35)', 0, 0, 4, REEL_H)
    rect(c, 'rgba(5,4,10,0.35)', REEL_W - 4, 0, 4, REEL_H)
  },
  // The frame on the desk, close: you and her, laughing, in a better light than this one.
  photo(c, t) {
    rect(c, '#1a1018', 0, 0, REEL_W, REEL_H)
    for (const [x, y, w] of [[8, 10, 14], [130, 18, 12], [20, 44, 10], [140, 50, 14], [118, 6, 8]] as const) {
      rect(c, '#3a2a22', x, y, w, w)
      rect(c, '#4a3626', x + 2, y + 2, w - 4, w - 4)
    }
    rect(c, '#4a2c18', 0, 70, REEL_W, 20)
    rect(c, '#6a4226', 0, 70, REEL_W, 2)
    rect(c, 'rgba(0,0,0,0.35)', 44, 70, 80, 5)
    // Gold frame.
    rect(c, '#c9a14a', 40, 8, 80, 64)
    rect(c, '#8a6a2a', 42, 10, 76, 60)
    rect(c, '#c9a14a', 44, 12, 72, 56)
    // The photograph: a sunset behind the harbour rail.
    const px = 46, py = 14, pw = 68, ph = 52
    rect(c, '#9a4a6a', px, py, pw, 14)
    rect(c, '#e8845a', px, py + 14, pw, 12)
    rect(c, '#f2a65a', px, py + 26, pw, 10)
    rect(c, '#2a4a7a', px, py + 36, pw, 16)
    rect(c, '#f8d890', px + 28, py + 30, 12, 4)
    c.save()
    c.beginPath()
    c.rect(px, py, pw, ph)
    c.clip()
    // Her: dark hair down, red dress, leaning in.
    rect(c, '#1e100a', 82, 22, 26, 44)
    rect(c, '#e8b890', 88, 26, 14, 16)
    rect(c, '#2a1810', 91, 31, 2, 2)
    rect(c, '#2a1810', 97, 31, 2, 2)
    rect(c, '#b8283f', 92, 37, 6, 2)
    rect(c, '#e8b890', 91, 42, 8, 4)
    rect(c, '#c02a44', 80, 46, 30, 22)
    for (let i = 0; i < 4; i++) rect(c, '#f4f0e0', 88 + i * 3, 46 + (i === 1 || i === 2 ? 1 : 0), 2, 2)
    // You, in your own sprite, in your own best jacket, cut off at the chest.
    drawPerson(c, HERO_FIGURE, 'down', 0, { x: 52, y: 20, scale: 2 })
    c.restore()
    // Glass catching the lamp, sliding across slowly.
    const sheen = ((t / 35) % 170) - 40
    c.save()
    c.beginPath()
    c.rect(px, py, pw, ph)
    c.clip()
    c.globalAlpha = 0.14
    for (let i = 0; i < 6; i++) rect(c, '#ffffff', sheen + i, py, 6, ph)
    c.restore()
  },
  // The papers, close: the lamp over them, a ring, a pen that has not been picked up.
  papers(c, t) {
    rect(c, '#2a1810', 0, 0, REEL_W, REEL_H)
    for (let y = 3; y < REEL_H; y += 7) rect(c, '#331f14', 0, y, REEL_W, 1)
    rect(c, '#3a2616', 30, 0, 100, 90)
    // Three sheets in a stack.
    rect(c, '#bdb7a4', 44, 7, 76, 82)
    rect(c, '#d8d2c0', 42, 5, 76, 82)
    rect(c, '#f2eee0', 40, 3, 76, 82)
    const mid = 78
    const centre = (text: string, y: number, color: string) => drawLabel(c, text, mid - Math.round(measureText(text) / 2), y, color)
    centre('COURT OF', 8, '#6a6a7a')
    centre('PETITION FOR', 18, '#14141c')
    centre('DIVORCE', 28, '#14141c')
    rect(c, '#14141c', 48, 37, 60, 1)
    for (let i = 0; i < 5; i++) rect(c, '#b8b4a8', 48, 42 + i * 5, i === 4 ? 36 : 60, 2)
    // Her signature, in ink; the line beside it empty.
    drawLabel(c, 'HER', 48, 66, '#6a6a7a')
    drawLabel(c, 'YOU', 82, 66, '#6a6a7a')
    const sig = [[50, 78], [53, 74], [56, 79], [59, 73], [62, 78], [65, 75], [68, 79], [72, 74]] as const
    sig.forEach(([x, y]) => rect(c, '#1c2a6a', x, y, 3, 1))
    sig.forEach(([x, y]) => rect(c, '#1c2a6a', x + 1, y - 1, 1, 3))
    rect(c, '#14141c', 48, 82, 28, 1)
    rect(c, '#14141c', 82, 82, 28, 1)
    // The tab that says where.
    const blink = Math.floor(t / 700) % 2
    rect(c, blink ? '#f2c14e' : '#d9a83a', 100, 72, 14, 7)
    drawLabel(c, 'X', 104, 72, '#7a1818')
    // The pen, uncapped, set down parallel to the edge.
    rect(c, '#14141c', 124, 40, 4, 34)
    rect(c, '#c9a14a', 124, 40, 4, 3)
    rect(c, '#f2f2f6', 125, 74, 2, 4)
    // A ring on the desk, off the paper, catching the light.
    rect(c, '#c9a14a', 18, 58, 10, 10)
    rect(c, '#3a2616', 20, 60, 6, 6)
    rect(c, '#f2c14e', 18, 58, 10, 2)
    if (Math.floor(t / 500) % 4 === 0) rect(c, '#fffbe0', 26, 59, 2, 2)
  },
  // The phone, close: a thread that only ever runs one way, climbing as it lands.
  messages(c, t, notes = []) {
    rect(c, '#05040a', 0, 0, REEL_W, REEL_H)
    rect(c, '#2a2a34', 24, 0, 112, REEL_H)
    rect(c, '#0e1420', 27, 0, 106, REEL_H)
    rect(c, '#1a2234', 27, 0, 106, 20)
    drawLabel(c, 'MARCUS', 80 - Math.round(measureText('MARCUS') / 2), 3, '#f2f2f6')
    drawLabel(c, '63 UNREAD', 80 - Math.round(measureText('63 UNREAD') / 2), 11, '#e0605d')
    // Lay the thread out, then reveal it a message at a time.
    const BUBBLE_W = 88
    let y = 4
    const laid = notes.map((note) => {
      const lines = wrapText(note.text, BUBBLE_W - 6)
      const top = y
      const h = lines.length * 8 + 5
      y += 10 + h + 3
      return { note, lines, top, h, bottom: y }
    })
    const shown = Math.min(laid.length, Math.floor(t / 1000) + 1)
    const view = 56
    const scrollTo = (n: number) => (n <= 0 ? 0 : Math.max(0, laid[n - 1].bottom - view))
    const frac = Math.min(1, (t - (shown - 1) * 1000) / 350)
    const scroll = scrollTo(shown - 1) + (scrollTo(shown) - scrollTo(shown - 1)) * frac
    c.save()
    c.beginPath()
    c.rect(27, 20, 106, 58)
    c.clip()
    laid.slice(0, shown).forEach(({ note, lines, top, h }) => {
      const by = 22 + top - scroll
      drawLabel(c, note.from, 80 - Math.round(measureText(note.from) / 2), by, '#6a7088')
      rect(c, '#2e3a52', 31, by + 10, BUBBLE_W, h)
      lines.forEach((line, k) => drawLabel(c, line, 34, by + 12 + k * 8, '#f2f2f6'))
    })
    c.restore()
    // The box where an answer would go. Nothing in it.
    rect(c, '#1a2234', 27, 78, 106, 12)
    rect(c, '#0e1420', 31, 80, 98, 8)
    const caret = Math.floor(t / 500) % 2
    if (caret) rect(c, '#9a9ab0', 34, 81, 1, 6)
  },
  // The glass at night, from the back: the harbour lit to the horizon, and you with it.
  window(c, t) {
    rect(c, '#07060c', 0, 0, REEL_W, REEL_H)
    const bands = ['#05061a', '#080a24', '#0c0f30', '#121440', '#1a1a4c', '#262058', '#38285a', '#4a2c58']
    bands.forEach((color, i) => rect(c, color, 12, 6 + i * 6, 136, 6))
    for (let i = 0; i < 30; i++) {
      if ((Math.floor(t / 700) + i) % 9 !== 0) rect(c, i % 4 ? '#f4f0d8' : '#c8d0ff', 14 + ((i * 41) % 130), 7 + ((i * 17) % 28), 1, 1)
    }
    rect(c, '#f4f0d8', 124, 12, 7, 7)
    rect(c, '#080a24', 126, 11, 7, 7)
    // The skyline, windows alive, a tower with a red light.
    const heights = [16, 24, 14, 30, 20, 36, 18, 26, 14, 32, 22, 16, 28]
    const tick = Math.floor(t / 900)
    heights.forEach((h, i) => {
      const x = 12 + i * 10.5
      rect(c, '#0c0e24', x, 54 - h, 10, h)
      for (let wy = 54 - h + 3; wy < 52; wy += 4) {
        for (let wx = x + 2; wx < x + 9; wx += 3) {
          if (((wx | 0) * 7 + wy * 3 + tick * (wx % 3 | 0)) % 5 < 2) rect(c, '#f2c14e', wx, wy, 1, 2)
        }
      }
    })
    rect(c, '#c82828', 12 + 5 * 10.5 + 4, 54 - 36 - 3, 2, 2)
    if (Math.floor(t / 600) % 2) rect(c, '#ff6060', 12 + 5 * 10.5 + 4, 54 - 36 - 3, 2, 2)
    // The harbour, with the city broken up in it.
    rect(c, '#0b1a3a', 12, 54, 136, 16)
    for (let i = 0; i < 18; i++) {
      const x = 14 + ((i * 29) % 130)
      const shimmer = Math.floor((t + i * 130) / 260) % 3
      rect(c, i % 2 ? '#f2c14e' : '#6a7ad8', x, 56 + ((i * 5) % 12), 2 + shimmer, 1)
    }
    // The frame of the window, and the floor you are standing on.
    rect(c, '#07060c', 0, 0, 12, 76)
    rect(c, '#07060c', 148, 0, 12, 76)
    rect(c, '#07060c', 12, 0, 136, 6)
    rect(c, '#07060c', 46, 6, 2, 64)
    rect(c, '#07060c', 112, 6, 2, 64)
    rect(c, '#1a1420', 10, 70, 140, 4)
    rect(c, '#0e0c1c', 0, 74, REEL_W, 16)
    rect(c, '#14102a', 40, 76, 80, 2)
    // You, from behind, very still.
    const sway = Math.floor(t / 1400) % 2
    drawPerson(c, HERO_FIGURE, 'up', 0, { x: 64, y: 30 + sway, scale: 2 })
    // The breath on the glass: a puff, then gone.
    const phase = (t % 4200) / 4200
    if (phase > 0.25 && phase < 0.9) {
      const k = (phase - 0.25) / 0.65
      c.save()
      c.globalAlpha = 0.28 * (1 - k)
      rect(c, '#dfe6ff', 72 - k * 4, 28 - k * 6, 16 + k * 8, 6 + k * 3)
      c.restore()
    }
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
