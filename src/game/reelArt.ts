import type { ReelScene } from '../world/events'
import { HERO_FIGURE, figureForCharacter } from '../overworld/casting'
import { CHARACTERS } from '../world/characters'
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


function disc(c: Ctx, color: string, cx: number, cy: number, r: number) {
  c.fillStyle = color
  for (let dy = -r; dy <= r; dy++) {
    const w = Math.floor(Math.sqrt(r * r - dy * dy))
    c.fillRect(Math.round(cx - w), Math.round(cy + dy), w * 2 + 1, 1)
  }
}

/** Soft banded sky from `top` to `bottom` colours, in flat strips. */
function skyBands(c: Ctx, colors: string[], h = REEL_H) {
  const step = Math.ceil(h / colors.length)
  colors.forEach((color, i) => rect(c, color, 0, i * step, REEL_W, step))
}

function cloud(c: Ctx, x: number, y: number, s: number, color = '#ffffff', shade = '#d6e6f6') {
  rect(c, shade, x, y + 3 * s, 20 * s, 3 * s)
  rect(c, color, x + 2 * s, y + 2 * s, 16 * s, 3 * s)
  rect(c, color, x + 5 * s, y, 7 * s, 3 * s)
  rect(c, color, x + 11 * s, y + s, 5 * s, 3 * s)
}

/** A bird in flight, wings up or down, as a handful of pixels. */
function bird(c: Ctx, x: number, y: number, flap: boolean, color: string, s = 1) {
  rect(c, color, x - s, y, 3 * s, s)
  if (flap) {
    rect(c, color, x - 4 * s, y - 2 * s, 3 * s, s)
    rect(c, color, x + 2 * s, y - 2 * s, 3 * s, s)
    rect(c, color, x - 2 * s, y - s, s, s)
    rect(c, color, x + 2 * s, y - s, s, s)
  } else {
    rect(c, color, x - 5 * s, y + s, 4 * s, s)
    rect(c, color, x + 2 * s, y + s, 4 * s, s)
    rect(c, color, x - 2 * s, y, s, s)
    rect(c, color, x + 2 * s, y, s, s)
  }
}

function envelope(c: Ctx, x: number, y: number, paper: string, edge: string, band?: string) {
  rect(c, edge, x - 1, y - 1, 34, 22)
  rect(c, paper, x, y, 32, 20)
  for (let i = 0; i < 12; i++) {
    rect(c, edge, x + i, y + i, 1, 1)
    rect(c, edge, x + 31 - i, y + i, 1, 1)
  }
  if (band) rect(c, band, x + 2, y + 15, 28, 3)
  rect(c, '#9a9aa8', x + 20, y + 3, 8, 1)
}

function drawBathroomSet(c: Ctx, t: number, settled: boolean) {
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
    // In at the door on the right, to the middle sink, and then up to the mirror, unless you are there already.
    const arrive = settled ? 1 : Math.min(1, t / 1800)
    const x = 140 - arrive * (140 - 70)
    const facing = arrive < 1 ? 'left' : 'up'
    const frame = (arrive < 1 ? Math.floor(t / 150) % 3 : 0) as WalkFrame
    drawPerson(c, HERO_FIGURE, facing, frame, { x: Math.round(x), y: 40 })
    if (settled) {
      // Marcus, in his sports jacket, from the door to your shoulder, and then standing there.
      const marcus = figureForCharacter('marcus', CHARACTERS.marcus)
      const come = Math.min(1, Math.max(0, (t - 500) / 1500))
      const mx = 150 - come * 50
      drawPerson(c, marcus, 'left', (come < 1 ? Math.floor(t / 150) % 3 : 0) as WalkFrame, { x: Math.round(mx), y: 40 })
    }
}

const SCENES: Record<ReelScene, (c: Ctx, t: number, notes?: Notification[]) => void> = {
  // The title card is its own component (`LogoFlash`); this is only what is behind it.
  logo(c) {
    rect(c, '#05040a', 0, 0, REEL_W, REEL_H)
  },
  // Hal's tape is its own component (`TapePanel`); this is only what is behind it.
  tape(c) {
    rect(c, '#05040a', 0, 0, REEL_W, REEL_H)
  },
  // Marcus's map is its own component (`RoutePanel`); this is only what is behind it.
  route(c) {
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
    drawBathroomSet(c, t, false)
  },
  // The same room a moment later: you are already at the sink, and Marcus comes in at the door and
  // walks over to you. (Cut to from the walk-in, so the walk is not played twice.)
  sink(c, t) {
    drawBathroomSet(c, t, true)
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

  // The morning before the game: a blue sky, a few clouds that bob about, a bird a long way up.
  sky(c, t) {
    skyBands(c, ['#2f7fd8', '#3a8ae0', '#4a96e6', '#5fa5ec', '#78b6f0', '#94c6f4', '#b0d6f8'])
    cloud(c, 14 + Math.sin(t / 1600) * 4, 16 + Math.sin(t / 700) * 2, 2)
    cloud(c, 86 + Math.sin(t / 1300 + 2) * 5, 30 + Math.sin(t / 650 + 1) * 2, 2)
    cloud(c, 120 + Math.cos(t / 1900) * 4, 10 + Math.sin(t / 800 + 3) * 2, 1)
    cloud(c, 40 + Math.cos(t / 1700) * 4, 54 + Math.sin(t / 900 + 5) * 2, 1)
    const bx = ((t / 60) % 200) - 20
    bird(c, bx, 40 + Math.sin(t / 500) * 4, Math.floor(t / 320) % 2 === 0, '#1c2a46', 1)
  },
  // The bus window: the town sliding past, and you, with your chin on your hand, not looking at any of it.
  busride(c, t) {
    rect(c, '#2a2e3a', 0, 0, REEL_W, REEL_H)
    rect(c, '#1c1f28', 0, 66, REEL_W, 24)
    // The window.
    rect(c, '#5a6070', 52, 6, 100, 60)
    c.save()
    c.beginPath()
    c.rect(55, 9, 94, 54)
    c.clip()
    skyBands(c, ['#4a96e6', '#6fb0ee', '#94c6f4', '#b8dcf8'], 63)
    cloud(c, 80 + Math.sin(t / 1800) * 6, 14, 1)
    const scroll = (t / 25) % 80
    for (let i = -1; i < 4; i++) {
      const bx = 55 + i * 40 - scroll
      const h = 18 + ((i + 5) * 13) % 22
      rect(c, i % 2 ? '#7a6a62' : '#6a5a72', bx, 63 - h, 30, h)
      for (let y = 63 - h + 4; y < 60; y += 7) for (let x = bx + 3; x < bx + 27; x += 8) rect(c, '#e8d890', x, y, 3, 3)
    }
    rect(c, '#3a3a44', 55, 56, 94, 7)
    // The poles that go by.
    const pole = 55 + ((200 - t / 8) % 120)
    rect(c, '#2a2a34', pole, 9, 3, 54)
    c.restore()
    rect(c, '#44485a', 52, 36, 100, 2)
    // The seat back and you, side on, looking out.
    rect(c, '#4a2f3a', 8, 54, 40, 36)
    rect(c, '#5c3a48', 8, 54, 40, 4)
    drawPerson(c, HERO_FIGURE, 'right', 0, { x: 22, y: 38 + Math.round(Math.sin(t / 420)), scale: 2 })
  },
  // The sun, low and enormous, and a bird crossing it. The thing the whole film is for.
  sunbird(c, t) {
    skyBands(c, ['#3a74c8', '#5a8ad8', '#8aa0e0', '#c8a8d0', '#f0b8a0', '#f8cf90', '#fbe4a8'])
    const pulse = Math.floor(t / 600) % 2
    disc(c, '#fbe9b0', 80, 52, 30 + pulse)
    disc(c, '#fff4c8', 80, 52, 24)
    disc(c, '#ffffe8', 80, 52, 17)
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + t / 5000
      rect(c, '#fff0b8', 80 + Math.cos(a) * 40, 52 + Math.sin(a) * 40, 2, 2)
    }
    cloud(c, 8 + Math.sin(t / 2000) * 3, 60, 1, '#fbe0c8', '#e8b8a8')
    cloud(c, 112 + Math.cos(t / 2200) * 3, 66, 1, '#fbe0c8', '#e8b8a8')
    // Across the disc, slowly, wings working and then gliding.
    const x = 20 + ((t / 70) % 130)
    const y = 52 + Math.sin(t / 900) * 5
    const gliding = Math.floor(t / 1400) % 2 === 1
    bird(c, x, y, !gliding && Math.floor(t / 280) % 2 === 0, '#10131f', 2)
  },
  // Running for it: the street, the apartments at the end of it.
  run(c, t) {
    skyBands(c, ['#58a4ec', '#78b8f0', '#9ccaf4', '#bcdcf6'], 56)
    rect(c, '#7a7a86', 0, 56, REEL_W, 8)
    rect(c, '#52525e', 0, 64, REEL_W, 26)
    rect(c, '#f0e8c0', 0, 76, REEL_W, 1)
    for (let x = -((t / 20) % 24); x < REEL_W; x += 24) rect(c, '#6a6a76', x, 66, 12, 1)
    // The building.
    rect(c, '#8a4a3a', 100, 8, 58, 50)
    for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) rect(c, (r + k) % 3 ? '#d8d090' : '#3a4a6a', 106 + k * 13, 14 + r * 11, 8, 7)
    rect(c, '#5a2a22', 120, 38, 18, 20)
    rect(c, '#e8d890', 130, 48, 2, 2)
    rect(c, '#f4f0d8', 112, 4, 34, 6)
    drawLabel(c, 'FLATS', 120, 4, '#3a2418')
    // You, running flat out.
    const x = Math.min(96, -16 + t / 14)
    drawPerson(c, HERO_FIGURE, 'right', (Math.floor(t / 90) % 3) as WalkFrame, { x: Math.round(x), y: 40 })
  },
  // The hall: wallpaper, a runner, a landlady's door with a line of light under it, and you on tiptoe.
  hallway(c, t) {
    rect(c, '#4a3a38', 0, 0, REEL_W, REEL_H)
    for (let x = 0; x < REEL_W; x += 8) rect(c, '#54423e', x, 0, 4, 56)
    rect(c, '#2a1f1c', 0, 56, REEL_W, 34)
    rect(c, '#6a2a2e', 0, 70, REEL_W, 12)
    rect(c, '#8a4a3a', 0, 70, REEL_W, 1)
    rect(c, '#e8d890', 14, 8, 6, 5)
    // Her door: brass number, a peephole, light underneath.
    rect(c, '#3a2418', 62, 14, 28, 44)
    rect(c, '#5a3a2a', 64, 16, 24, 40)
    rect(c, '#c9a24a', 72, 20, 8, 5)
    rect(c, '#e8d890', 75, 32, 2, 2)
    rect(c, '#f4e8a0', 64, 56, 24, 1)
    // Your door at the end.
    rect(c, '#3a2418', 128, 14, 26, 44)
    rect(c, '#4a2f20', 130, 16, 22, 40)
    // Tiptoe: slow steps, up on the toes, and a bounce on each.
    const x = Math.min(112, -16 + t / 32)
    const bob = Math.abs(Math.sin(t / 220)) < 0.3 ? -1 : 0
    drawPerson(c, HERO_FIGURE, 'right', (Math.floor(t / 320) % 3) as WalkFrame, { x: Math.round(x), y: 40 + bob })
    // The board in front of her door that always creaks.
    if (x > 52 && x < 72 && Math.floor(t / 300) % 2 === 0) drawLabel(c, 'creak', 58, 34, '#d8c8a8')
  },
  // The floor inside your door: a mat and three envelopes that came under it.
  envelopes(c, t) {
    rect(c, '#5a4030', 0, 0, REEL_W, REEL_H)
    for (let x = 0; x < REEL_W; x += 20) rect(c, '#4a3224', x, 0, 1, REEL_H)
    rect(c, '#3a4a5a', 28, 8, 104, 74)
    rect(c, '#46586a', 32, 12, 96, 66)
    envelope(c, 38, 18, '#f0ecdc', '#9a9588')
    envelope(c, 82, 30, '#f2e8c0', '#b09a5a')
    envelope(c, 50, 48, '#f4f0e4', '#9a9588', '#c83a32')
    // A foot in the door, going nowhere: only the glint of the light.
    const glint = Math.floor(t / 400) % 2
    rect(c, glint ? '#fff8d8' : '#e8d890', 136, 8, 14, 1)
  },
  // The notice, close: red at the top, rent due, and a line you do not want to read twice.
  notice(c, t) {
    rect(c, '#2a2420', 0, 0, REEL_W, REEL_H)
    rect(c, '#f4f2ea', 40, 4, 80, 84)
    rect(c, '#c83a32', 40, 4, 80, 12)
    drawLabel(c, 'FINAL NOTICE', 50, 7, '#fff4e8')
    drawLabel(c, 'RENT OVERDUE', 48, 22, '#2a2a34')
    for (let i = 0; i < 5; i++) rect(c, '#b4b4c0', 48, 36 + i * 6, 56 - (i % 2) * 14, 2)
    drawLabel(c, 'AMOUNT DUE', 48, 66, '#5a5a68')
    drawLabel(c, '$ 940.00', 48, 75, '#a8281f')
    // A stamp that thumps in.
    const on = Math.min(1, t / 400)
    if (on > 0.5) {
      const drop = Math.round((1 - on) * 6)
      rect(c, '#c83a32', 86, 46 + drop, 32, 13)
      drawLabel(c, 'LATE', 94, 49 + drop, '#fff4e8')
    }
  },
  // Marcus's invitation: a playing-card shaped card, felt green, a spade, and four lines of scrawl.
  invite(c, t) {
    rect(c, '#2a2420', 0, 0, REEL_W, REEL_H)
    rect(c, '#e8d890', 36, 4, 88, 82)
    rect(c, '#1f6a44', 39, 7, 82, 76)
    rect(c, '#18522f', 42, 10, 76, 70)
    // The spade.
    ;[2, 4, 6, 8, 10, 12, 12, 12, 10, 4, 2, 2, 4, 8].forEach((w, i) => rect(c, '#f4f0d8', 80 - w / 2, 14 + i, w, 1))
    drawLabel(c, "MARCUS'S", 56, 44, '#f2c14e')
    drawLabel(c, 'POKER NIGHT', 52, 53, '#f2c14e')
    drawLabel(c, 'FRIDAY . 8 PM', 52, 64, '#f4f0d8')
    drawLabel(c, 'BRING CASH', 56, 72, '#f4f0d8')
    if (Math.floor(t / 500) % 2) rect(c, '#f2c14e', 42, 10, 3, 3)
  },
  // The computer: a search engine that is not quite one.
  poogle(c, t) {
    rect(c, '#2a2e3a', 0, 0, REEL_W, REEL_H)
    rect(c, '#14161e', 12, 4, 136, 80)
    rect(c, '#f2f4f8', 15, 7, 130, 74)
    rect(c, '#dfe3ec', 15, 7, 130, 11)
    rect(c, '#9aa4b8', 19, 10, 3, 3)
    rect(c, '#9aa4b8', 25, 10, 3, 3)
    rect(c, '#fff', 32, 8, 100, 9)
    drawLabel(c, 'www.poogle.com', 35, 8, '#7a8498')
    const logo: [string, string][] = [['P', '#3a6ac8'], ['o', '#d8453a'], ['o', '#f2c14e'], ['g', '#3a6ac8'], ['l', '#3aa05a'], ['e', '#d8453a']]
    logo.forEach(([ch, color], i) => drawLabel(c, ch, 62 + i * 8, 20, color))
    rect(c, '#c5ccda', 34, 34, 92, 11)
    rect(c, '#fff', 35, 35, 90, 9)
    const typed = 'how to play poker'.slice(0, Math.min(17, Math.floor(t / 110)))
    drawLabel(c, typed, 38, 36, '#1c1c28')
    if (Math.floor(t / 400) % 2 === 0) rect(c, '#1c1c28', 38 + measureText(typed), 36, 1, 7)
    if (t > 2400) {
      for (let i = 0; i < 3; i++) {
        rect(c, '#3a6ac8', 22, 54 + i * 9, 40, 2)
        rect(c, '#b4b8c4', 22, 58 + i * 9, 100 - i * 14, 1)
      }
      rect(c, '#c83a32', 130, 53, 11, 9)
    }
    rect(c, '#3a3f50', 60, 84, 40, 6)
  },
  // The bookshelf: spines, a shelf of names, and one book that wants taking down.
  shelf(c, t) {
    rect(c, '#2a1f18', 0, 0, REEL_W, REEL_H)
    const tones = ['#7a2a2a', '#2a4a7a', '#3a6a3a', '#6a5a2a', '#5a3a6a', '#8a5a2a', '#2a5a5a', '#9a8a6a', '#4a2a3a']
    for (let row = 0; row < 3; row++) {
      const y = 6 + row * 28
      rect(c, '#5a3a22', 6, y + 22, 148, 4)
      rect(c, '#8a5a32', 6, y + 22, 148, 1)
      let x = 8
      let i = row * 7
      while (x < 150) {
        const w = 4 + ((i * 5) % 4)
        const h = 16 + ((i * 7) % 7)
        rect(c, tones[(i * 3) % tones.length], x, y + 22 - h, w, h)
        rect(c, '#e8d890', x + 1, y + 22 - h + 3, w - 2, 1)
        x += w + 1
        i++
      }
    }
    // The one on the middle shelf, pulled out an inch and lit.
    const glow = Math.floor(t / 500) % 2
    rect(c, glow ? '#f4e8a0' : '#d8c880', 76, 28, 9, 26)
    rect(c, '#2a4a7a', 77, 30, 7, 24)
    rect(c, '#e8d890', 78, 33, 5, 1)
    rect(c, '#e8d890', 78, 36, 5, 1)
    const plate = (text: string, y: number, color: string) => {
      const w = measureText(text) + 6
      rect(c, '#14100c', Math.round((REEL_W - w) / 2), y - 2, w, 11)
      drawLabel(c, text, Math.round((REEL_W - w) / 2) + 3, y, color)
    }
    plate('A HISTORY OF PHILOSOPHY', 15, '#f4e8a0')
    plate('CAMUS . KANT . PLATO', 78, '#c8b898')
  },
  // Bed: a lamp going down, a book going slack, a few z's.
  bed(c, t) {
    rect(c, '#10122a', 0, 0, REEL_W, REEL_H)
    rect(c, '#1c2040', 112, 8, 30, 30)
    rect(c, '#2a3058', 114, 10, 26, 26)
    disc(c, '#f4f0d8', 132, 20, 4)
    rect(c, '#2a1f18', 0, 70, REEL_W, 20)
    rect(c, '#4a3a2a', 20, 52, 108, 22)
    rect(c, '#3a2f4a', 22, 56, 70, 14)
    rect(c, '#5a4a7a', 22, 56, 70, 4)
    rect(c, '#e8e4d8', 24, 48, 26, 12)
    rect(c, '#d4c0a0', 28, 46, 12, 12)
    rect(c, '#3a2a1c', 28, 44, 12, 5)
    // The book, open on your chest, rising and falling and finally still.
    const sink = Math.min(4, Math.floor(t / 1500))
    const breathe = Math.round(Math.sin(t / 700))
    rect(c, '#f0ecdc', 54, 50 + sink + breathe, 22, 8)
    rect(c, '#2a4a7a', 53, 49 + sink + breathe, 24, 2)
    rect(c, '#9a9aa8', 56, 53 + sink + breathe, 8, 1)
    // The lamp, and its light draining away.
    const power = Math.max(0, 1 - t / 5000)
    rect(c, '#5a3a22', 130, 58, 14, 16)
    rect(c, '#3a2418', 136, 50, 2, 8)
    rect(c, power > 0.3 ? '#f2c14e' : '#7a6228', 130, 42, 14, 8)
    if (power > 0.05) {
      c.globalAlpha = 0.18 * power
      rect(c, '#f2c14e', 100, 40, 60, 40)
      c.globalAlpha = 1
    }
    for (let i = 0; i < 3; i++) {
      const age = (t / 20 + i * 40) % 120
      if (t > 1200) drawLabel(c, 'z', 50 + age / 3 + i * 4, 40 - age / 4, '#9aa4c8')
    }
  },
  // The door, shaking: somebody on the other side with a fist.
  knock(c, t) {
    rect(c, '#1a1424', 0, 0, REEL_W, REEL_H)
    const hit = Math.floor(t / 260) % 4 === 0 ? 2 : Math.floor(t / 130) % 2
    const dx = hit
    rect(c, '#3a2a30', 32 + dx, 2, 96, 86)
    rect(c, '#5a3a2a', 36 + dx, 6, 88, 82)
    rect(c, '#4a2f20', 42 + dx, 12, 32, 30)
    rect(c, '#4a2f20', 86 + dx, 12, 32, 30)
    rect(c, '#4a2f20', 42 + dx, 48, 32, 34)
    rect(c, '#4a2f20', 86 + dx, 48, 32, 34)
    rect(c, '#c9a24a', 104 + dx, 46, 6, 5)
    rect(c, '#8a8a96', 98 + dx, 30, 3, 14)
    disc(c, '#f4e8a0', 80 + dx, 24, 2)
    rect(c, '#f4e8a0', 36, 86, 88, 2)
    if (Math.floor(t / 260) % 2 === 0) drawLabel(c, 'BANG BANG BANG', 42, 76, '#f2c14e')
    else drawLabel(c, 'BANG!', 8, 30, '#c83a32')
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
  // The chase down the alley is its own component (`AlleyChase`); this is only what is behind it.
  chase(c) {
    rect(c, '#05040a', 0, 0, REEL_W, REEL_H)
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
