import type { ReelScene } from '../world/events'

/**
 * The sets of the short films, drawn at runtime like everything else: a small
 * canvas of flat rectangles, scaled up with nearest-neighbour. Each is a room
 * the story cuts to — the studio of the televised final, the bathroom, the
 * commentators' booth — and none needs more than a dozen shapes to read.
 */

export const REEL_W = 160
export const REEL_H = 90

type Ctx = CanvasRenderingContext2D

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

const SCENES: Record<ReelScene, (c: Ctx, t: number) => void> = {
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
  // Cold tile, a row of sinks, one stall door, a fluorescent tube that hums.
  bathroom(c, t) {
    rect(c, '#9db3ae', 0, 0, REEL_W, REEL_H)
    for (let y = 0; y < REEL_H; y += 10) rect(c, '#8aa19c', 0, y, REEL_W, 1)
    for (let x = 0; x < REEL_W; x += 10) rect(c, '#8aa19c', x, 0, 1, REEL_H)
    rect(c, '#4a5a58', 0, 64, REEL_W, 26)
    rect(c, '#e8ecea', 20, 40, 34, 4)
    rect(c, '#cfd6d4', 22, 44, 30, 14)
    rect(c, '#e8ecea', 100, 40, 34, 4)
    rect(c, '#cfd6d4', 102, 44, 30, 14)
    rect(c, '#5a3a2a', 64, 10, 28, 56)
    rect(c, '#3a2418', 66, 12, 24, 52)
    const hum = Math.floor(t / 90) % 11 === 0
    rect(c, hum ? '#8b8b6a' : '#f4f2c8', 60, 2, 40, 3)
  },
  // The mirror, close: a face that has not slept.
  mirror(c, t) {
    rect(c, '#2a3438', 0, 0, REEL_W, REEL_H)
    rect(c, '#8fa4a8', 30, 6, 100, 78)
    rect(c, '#b8c9cc', 34, 10, 92, 70)
    person(c, 80, 30, '#c8a07a', '#2a2a3a', '#2a1c14')
    rect(c, '#e8e8f0', 76, 36, 3, 3)
    rect(c, '#e8e8f0', 84, 36, 3, 3)
    // A tear that runs down on a loop.
    const drip = Math.floor(t / 120) % 12
    rect(c, '#8ec8f0', 84, 38 + drip, 1, 2)
    rect(c, '#6a8088', 24, 80, 112, 4)
  },
  // A phone on the sink: a lit screen with a lender's name on it.
  phone(c, t) {
    rect(c, '#2a3438', 0, 0, REEL_W, REEL_H)
    rect(c, '#cfd6d4', 0, 60, REEL_W, 30)
    rect(c, '#111111', 62, 18, 36, 62)
    const buzz = Math.floor(t / 250) % 2
    rect(c, buzz ? '#3a6ac8' : '#2f58a8', 65, 22, 30, 54)
    rect(c, '#f2f2f6', 68, 28, 24, 3)
    rect(c, '#f2f2f6', 68, 36, 18, 3)
    rect(c, '#e0605d', 68, 48, 24, 8)
    rect(c, '#f2f2f6', 72, 50, 16, 3)
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
export function drawReel(canvas: HTMLCanvasElement, scene: ReelScene, t: number) {
  const c = canvas.getContext('2d')
  if (!c) return
  c.imageSmoothingEnabled = false
  SCENES[scene](c, t)
}
