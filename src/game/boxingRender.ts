import type { Bout, Fighter } from '../engine/boxing'
import { CW, RING_CX, RING_H, RING_HH, RING_HW, RING_CY, feetOf, halfAt, paintRing } from './boxingArt'
import type { Frame, Impact, Person } from './boxingChoreo'
import { CLEAN, POSES, drawPerson, type Look } from './boxingRig'
import { hash2 } from './pixel/color'
import { Raster } from './pixel/raster'
import { drawTiny, tinyWidth } from './pixel/tiny'

/**
 * The arena at fight night, drawn live: a dark hall with a packed crowd that
 * leans in and roars with the fight, spotlights down on the ring, a big board
 * over it, the timekeeper's bell and three judges ringside. The fighters, the
 * referee, the corners and the ring girl are drawn from joints every frame, so a
 * jab is a jab. For the big moments the whole picture punches in on the action.
 */

type Ctx = CanvasRenderingContext2D

const SHIRTS = ['#d84a4a', '#4a7ad8', '#e8c84a', '#48b068', '#f0ece0', '#c868c8', '#e88a3a', '#5ac8d8', '#8a8a98', '#d86a8a']
const SKINS = ['#f4d4b4', '#d8a87a', '#c08654', '#8d5a3b', '#5e3a22', '#ecc6a2']

const lookOf = (f: Fighter): Look => ({
  skin: f.skin,
  hair: f.hair,
  bottom: f.trunks,
  top: null,
  gloves: f.gloves,
  accent: '#f4f0e4',
  build: f.build,
  trim: f.gloves,
})
const REF: Look = { skin: '#d8a87a', hair: '#8a8a90', bottom: '#14101c', top: '#f4f0e4', gloves: null, accent: '#14101c', build: 'lean', tie: true }
const TRAINER_A: Look = { skin: '#cc9a6c', hair: '#2e2018', bottom: '#201818', top: '#c82828', gloves: null, accent: '#f4f0e4', build: 'stocky', trim: '#f4f0e4' }
const TRAINER_B: Look = { skin: '#8d5a3b', hair: '#141414', bottom: '#201818', top: '#2a5ad8', gloves: null, accent: '#f4f0e4', build: 'tall', trim: '#f4f0e4' }
const GIRL: Look = { skin: '#e2b48c', hair: '#d89a3a', bottom: '#f2c84a', top: '#f2c84a', gloves: null, accent: '#fff6c0', build: 'lean', long: true, skirt: true, shoes: '#c82828' }

export class Arena {
  private readonly back: HTMLCanvasElement
  private readonly front: HTMLCanvasElement
  private readonly buf: HTMLCanvasElement
  private readonly looks: [Look, Look]
  private readonly cache = new Map<string, HTMLCanvasElement>()
  private readonly names: [string, string]

  constructor(bout: Bout) {
    const ring = paintRing()
    this.back = ring.back.toCanvas()
    this.front = ring.front.toCanvas()
    this.buf = document.createElement('canvas')
    this.buf.width = CW
    this.buf.height = RING_H
    this.looks = [lookOf(bout.a), lookOf(bout.b)]
    this.names = [bout.a.name.split(' ').pop()!.toUpperCase(), bout.b.name.split(' ').pop()!.toUpperCase()]
  }

  private text(s: string, color: string, scale = 1): HTMLCanvasElement {
    const key = `${s}|${color}|${scale}`
    let c = this.cache.get(key)
    if (!c) {
      const r = new Raster(Math.max(1, tinyWidth(s, scale) + 1), 5 * scale + 1)
      drawTiny(r, s, 0, 0, color, scale)
      c = r.toCanvas()
      this.cache.set(key, c)
    }
    return c
  }

  private crowd(c: Ctx, f: Frame, t: number) {
    const e = f.excite
    for (let y = 8, row = 0; y < 116; y += 5, row++) {
      for (let x = row % 2 ? 2 : 5; x < CW; x += 7) {
        if (Math.abs(x + 2 - RING_CX) < halfAt(y + 2, 16) + 4) continue
        const k = x * 31 + row
        const who = hash2(x, y, 3)
        // Light falls off with the distance from the ring.
        const d = Math.hypot((x - RING_CX) / (CW * 0.6), (y - RING_CY) / (RING_H * 0.8))
        const lit = Math.max(0.42, 1 - d * 0.9)
        const jump = e > 0.4 ? Math.abs(Math.sin(t / (130 + who * 100) + who * 40)) * e * 2.6 : Math.sin(t / 800 + who * 20) * 0.4
        const yy = Math.round(y - jump)
        const shirt = SHIRTS[Math.floor(hash2(k, 1, 4) * SHIRTS.length)]
        const skin = SKINS[Math.floor(hash2(k, 2, 5) * SKINS.length)]
        c.globalAlpha = lit
        c.fillStyle = shirt
        c.fillRect(x - 1, yy + 2, 5, 3)
        c.fillStyle = skin
        c.fillRect(x, yy - 1, 3, 3)
        if (hash2(k, 3, 6) > 0.7) {
          c.fillStyle = ['#2a1a10', '#141010', '#c8a050'][Math.floor(who * 3) % 3]
          c.fillRect(x, yy - 1, 3, 1)
        }
        if (e > 0.6 && who > 0.5) {
          c.fillStyle = skin
          const up = Math.sin(t / 90 + who * 30) > 0 ? 3 : 2
          c.fillRect(x - 1, yy - up, 1, up + 1)
          c.fillRect(x + 3, yy - up + 1, 1, up)
        }
      }
    }
    c.globalAlpha = 1
    // Camera flashes pop in the dark.
    for (let i = 0; i < 5; i++) {
      if (Math.random() < 0.05 + e * 0.35) {
        const fx = Math.floor(Math.random() * CW)
        const fy = 10 + Math.floor(Math.random() * 100)
        if (Math.abs(fx - RING_CX) < halfAt(fy, 16) + 4) continue
        c.fillStyle = '#fffbe0'
        c.fillRect(fx, fy, 2, 2)
        c.fillStyle = 'rgba(255,251,224,0.4)'
        c.fillRect(fx - 1, fy, 4, 2)
        c.fillRect(fx, fy - 1, 2, 4)
      }
    }
  }

  private lights(c: Ctx, f: Frame, t: number) {
    // Rigging across the top and three cones down onto the canvas, breathing a little with the noise of the room.
    c.fillStyle = '#1a1626'
    c.fillRect(0, 0, CW, 3)
    c.fillStyle = '#3a3450'
    c.fillRect(0, 3, CW, 1)
    c.save()
    c.globalCompositeOperation = 'lighter'
    const pulse = 0.5 + f.excite * 0.35
    ;[56, RING_CX, CW - 56].forEach((x, i) => {
      const g = c.createLinearGradient(0, 4, 0, RING_CY + 14)
      const a = (0.1 + 0.05 * Math.sin(t / 400 + i)) * pulse
      g.addColorStop(0, `rgba(255,245,210,${a * 2})`)
      g.addColorStop(1, 'rgba(255,245,210,0)')
      c.fillStyle = g
      c.beginPath()
      c.moveTo(x - 3, 4)
      c.lineTo(x + 3, 4)
      c.lineTo(RING_CX + (x - RING_CX) * 0.4 + 52, RING_CY + 14)
      c.lineTo(RING_CX + (x - RING_CX) * 0.4 - 52, RING_CY + 14)
      c.closePath()
      c.fill()
    })
    const pool = c.createRadialGradient(RING_CX, RING_CY, 8, RING_CX, RING_CY, 112)
    pool.addColorStop(0, `rgba(255,240,200,${0.2 * pulse})`)
    pool.addColorStop(1, 'rgba(255,240,200,0)')
    c.fillStyle = pool
    c.fillRect(0, 0, CW, RING_H)
    c.restore()
    ;[56, RING_CX, CW - 56].forEach((x) => {
      c.fillStyle = '#f8f0c8'
      c.fillRect(x - 3, 3, 7, 2)
      c.fillStyle = '#fffbe8'
      c.fillRect(x - 1, 4, 3, 1)
    })
  }

  private board(c: Ctx, f: Frame, t: number) {
    // The big board over the ring: the fighters, the round, the clock.
    const x = RING_CX - 58
    c.fillStyle = '#0a0812'
    c.fillRect(x - 1, 6, 118, 15)
    c.fillStyle = '#4a4660'
    c.fillRect(x - 1, 6, 118, 1)
    c.fillRect(x - 1, 20, 118, 1)
    c.fillStyle = '#14101c'
    c.fillRect(x, 7, 116, 13)
    const amber = '#ffb030'
    const a = this.text(this.names[0].slice(0, 9), '#ff6a5a')
    const b = this.text(this.names[1].slice(0, 9), '#6aa8ff')
    c.drawImage(a, x + 3, 9)
    c.drawImage(b, x + 113 - a.width * 0 - b.width, 9)
    const mid = this.text(f.board.slice(0, 12), amber)
    c.drawImage(mid, Math.round(RING_CX - mid.width / 2), 9)
    const clk = this.text(f.clock, f.clock === 'REST' ? '#9a9ab0' : '#8aff8a', 1)
    c.drawImage(clk, Math.round(RING_CX - clk.width / 2), 15)
    if (Math.floor(t / 500) % 2 === 0) {
      c.fillStyle = amber
      c.fillRect(x + 56, 8, 1, 1)
    }
  }

  private person(c: Ctx, who: Person, look: Look, scale = 1) {
    const y = feetOf(who.y)
    c.fillStyle = 'rgba(0,0,0,0.32)'
    c.fillRect(Math.round(who.x - 8), Math.round(y - 1), 16, 3)
    drawPerson(c, who.pose, look, who.x, y, who.face, CLEAN, scale)
  }

  private impact(c: Ctx, i: Impact) {
    const y = feetOf(i.yDepth) - i.lift
    const a = 1 - i.age / 460
    const r = 3 + i.force * 6
    if (i.age < 150) {
      const k = 1 - i.age / 150
      c.fillStyle = `rgba(255,255,220,${k})`
      for (let n = 0; n < 8; n++) {
        const ang = (n / 8) * Math.PI * 2 + i.seed * 0.1
        const len = r * (0.6 + 0.5 * k)
        for (let s = 2; s < len; s++) c.fillRect(Math.round(i.x + Math.cos(ang) * s), Math.round(y + Math.sin(ang) * s * 0.8), 1, 1)
      }
      c.fillStyle = `rgba(255,200,60,${k})`
      c.fillRect(Math.round(i.x - 1), Math.round(y - 1), 3, 3)
    }
    // Sweat and spit thrown off the head, falling.
    const n = i.force > 0.5 ? 9 : 4
    for (let k = 0; k < n; k++) {
      const h = hash2(i.seed, k, 7)
      const vx = i.dir * (0.5 + h * 1.4) * (0.5 + i.force)
      const vy = -1.4 - hash2(i.seed, k, 8) * 1.6
      const tt = i.age / 28
      const px = i.x + vx * tt * 3
      const py = y + vy * tt * 3 + 0.5 * 0.5 * tt * tt * 3
      c.fillStyle = k % 3 === 0 ? `rgba(255,255,255,${a})` : `rgba(200,230,255,${a})`
      c.fillRect(Math.round(px), Math.round(py), 1, 1)
    }
  }

  private judges(c: Ctx, f: Frame, t: number, cards: Array<[number, number]>) {
    for (let i = 0; i < 3; i++) {
      const x = CW - 98 + i * 30
      const y = 124
      c.fillStyle = '#2a2a38'
      c.fillRect(x, y - 2, 9, 8)
      c.fillStyle = '#e8d8c8'
      c.fillRect(x + 2, y - 8, 5, 6)
      c.fillStyle = ['#2a1a10', '#8a8a90', '#141010'][i]
      c.fillRect(x + 2, y - 8, 5, 2)
      if (i < f.cardsShown) {
        const [p, q] = cards[i] ?? [0, 0]
        c.fillStyle = '#f4f0e4'
        c.fillRect(x - 6, y - 16, 22, 9)
        c.fillStyle = '#14101c'
        c.fillRect(x - 6, y - 16, 22, 1)
        c.drawImage(this.text(`${p}-${q}`, '#14101c'), x - 3, y - 13)
        c.fillStyle = '#e8d8c8'
        c.fillRect(x - 7, y - 8, 2, 4)
        c.fillRect(x + 15, y - 8, 2, 4)
      } else if (f.cardsShown === 0 && f.board === 'FINAL BELL') {
        c.fillStyle = '#f4f0e4'
        c.fillRect(x + 1, y - 2, 7, 4)
      }
    }
    // The timekeeper and his bell.
    const bx = 14
    const swing = f.bell > 0 ? Math.round(Math.sin(t / 25) * 2 * f.bell) : 0
    c.fillStyle = '#e8c860'
    c.fillRect(bx + swing, 119, 5, 5)
    c.fillStyle = '#c8a040'
    c.fillRect(bx + swing, 123, 5, 1)
    if (f.bell > 0.2) {
      c.fillStyle = `rgba(255,240,150,${f.bell})`
      c.fillRect(bx - 3, 116, 1, 3)
      c.fillRect(bx + 8, 116, 1, 3)
      c.fillRect(bx + 2, 113, 1, 3)
    }
    c.fillStyle = '#2a2a38'
    c.fillRect(34, 121, 9, 6)
    c.fillStyle = '#e8d8c8'
    c.fillRect(36, 115, 5, 6)
    c.fillStyle = '#141010'
    c.fillRect(36, 115, 5, 2)
  }

  private foreground(c: Ctx, f: Frame, t: number) {
    // Ringside, close and dark: heads and shoulders against the glow of the ring.
    for (let x = -6; x < CW + 10; x += 15) {
      const who = hash2(x, 77, 2)
      const jump = f.excite > 0.4 ? Math.abs(Math.sin(t / (150 + who * 90) + who * 20)) * f.excite * 5 : Math.sin(t / 900 + who * 9) * 0.8
      const y = Math.round(146 - jump)
      c.fillStyle = '#0c0a14'
      c.fillRect(x - 2, y + 6, 16, 14)
      c.fillStyle = '#1a1626'
      c.fillRect(x + 1, y - 2, 9, 9)
      c.fillStyle = '#2a2236'
      c.fillRect(x + 1, y - 3, 9, 3)
      if (f.excite > 0.6 && who > 0.4) {
        c.fillStyle = '#1a1626'
        c.fillRect(x - 3, y - 9, 3, 12)
        if (who > 0.7) {
          c.fillStyle = '#f4f0e4'
          c.fillRect(x - 4, y - 12, 5, 4)
        }
      }
    }
  }

  draw(out: Ctx, f: Frame, t: number, cards: Array<[number, number]>): void {
    const c = this.buf.getContext('2d')!
    c.imageSmoothingEnabled = false
    c.fillStyle = '#07060f'
    c.fillRect(0, 0, CW, RING_H)
    this.crowd(c, f, t)
    c.drawImage(this.back, 0, 0)
    this.lights(c, f, t)
    this.board(c, f, t)
    this.judges(c, f, t, cards)
    // The people in the ring, far to near; the stools under the men who are sitting.
    const items: Array<{ y: number; draw: () => void }> = []
    const stool = (x: number, y: number) => {
      c.fillStyle = '#8a8a98'
      c.fillRect(Math.round(x - 7), Math.round(y - 10), 14, 2)
      c.fillStyle = '#5a5a68'
      c.fillRect(Math.round(x - 6), Math.round(y - 8), 2, 8)
      c.fillRect(Math.round(x + 4), Math.round(y - 8), 2, 8)
    }
    ;[f.a, f.b].forEach((v, i) => {
      const y = feetOf(v.y)
      items.push({
        y,
        draw: () => {
          c.fillStyle = 'rgba(0,0,0,0.35)'
          c.fillRect(Math.round(v.x - 10), Math.round(y - 1), 20, 3)
          if (v.seated) stool(v.x, y)
          drawPerson(c, v.pose, this.looks[i], v.x, y, i === 0 ? 1 : -1, v.marks)
        },
      })
    })
    items.push({ y: feetOf(f.ref.y) - 0.5, draw: () => this.person(c, f.ref, REF) })
    items.push({ y: feetOf(f.trainerA.y) - 0.4, draw: () => this.person(c, f.trainerA, TRAINER_A) })
    items.push({ y: feetOf(f.trainerB.y) - 0.4, draw: () => this.person(c, f.trainerB, TRAINER_B) })
    if (f.girl) {
      const g = f.girl
      items.push({
        y: feetOf(g.y),
        draw: () => {
          this.person(c, g, GIRL)
          const gy = feetOf(g.y)
          // The round card, held over her head.
          c.fillStyle = '#14101c'
          c.fillRect(Math.round(g.x - 14), Math.round(gy - 58), 30, 11)
          c.fillStyle = '#f4f0e4'
          c.fillRect(Math.round(g.x - 13), Math.round(gy - 57), 28, 9)
          c.drawImage(this.text(`ROUND ${g.round}`, '#a82828'), Math.round(g.x - 11), Math.round(gy - 55))
        },
      })
    }
    items.sort((p, q) => p.y - q.y).forEach((it) => it.draw())
    c.drawImage(this.front, 0, 0)
    for (const i of f.impacts) this.impact(c, i)
    // Corner talk: a bubble over the trainer who is speaking.
    if (f.talking) {
      const p = f.talking === 'a' ? f.trainerA : f.trainerB
      const bx = Math.round(p.x - 6)
      const by = Math.round(feetOf(p.y) - 52)
      c.fillStyle = '#f4f0e4'
      c.fillRect(bx, by, 14, 8)
      c.fillRect(bx + 5, by + 8, 3, 2)
      c.fillStyle = '#14101c'
      for (let k = 0; k < 3; k++) if (Math.floor(t / 200) % 4 > k) c.fillRect(bx + 3 + k * 4, by + 3, 2, 2)
    }
    this.foreground(c, f, t)
    // The room around the ring falls into the dark.
    const v = c.createRadialGradient(RING_CX, RING_CY, 50, RING_CX, RING_CY, 150)
    v.addColorStop(0, 'rgba(0,0,0,0)')
    v.addColorStop(1, 'rgba(0,0,0,0.5)')
    c.fillStyle = v
    c.fillRect(0, 0, CW, RING_H)
    void RING_HH
    void RING_HW
    void POSES

    // To the screen: punched in on the action, shaken when something lands.
    out.imageSmoothingEnabled = false
    const z = Math.max(1, f.zoom)
    const sw = CW / z
    const sh = RING_H / z
    const sx = Math.round(Math.min(CW - sw, Math.max(0, f.focus.x - sw / 2)))
    const sy = Math.round(Math.min(RING_H - sh, Math.max(0, f.focus.y - sh / 2)))
    const shk = f.shake > 0 ? f.shake : 0
    const dx = shk ? Math.round((Math.random() - 0.5) * shk * 2) : 0
    const dy = shk ? Math.round((Math.random() - 0.5) * shk * 2) : 0
    out.fillStyle = '#07060f'
    out.fillRect(0, 0, CW, RING_H)
    out.drawImage(this.buf, sx, sy, sw, sh, dx, dy, CW, RING_H)
    this.hud(out, f)
  }

  /** The two nameplates under the board: health above, stamina below, and a flash when a man is hurt. */
  private hud(c: Ctx, f: Frame) {
    const plate = (side: 0 | 1) => {
      const v = side === 0 ? f.a : f.b
      const w = 70
      const x = side === 0 ? 4 : CW - 4 - w
      const y = 24
      c.fillStyle = 'rgba(10,8,20,0.78)'
      c.fillRect(x, y, w, 15)
      c.fillStyle = side === 0 ? '#d82a2a' : '#2a5ad8'
      c.fillRect(side === 0 ? x : x + w - 2, y, 2, 15)
      c.drawImage(this.text(this.names[side].slice(0, 12), '#f4f0e4'), x + 5, y + 2)
      const bar = (by: number, pct: number, color: string, back: string) => {
        c.fillStyle = back
        c.fillRect(x + 5, by, w - 10, 3)
        c.fillStyle = color
        const fill = Math.round(((w - 10) * pct) / 100)
        if (side === 0) c.fillRect(x + 5, by, fill, 3)
        else c.fillRect(x + w - 5 - fill, by, fill, 3)
      }
      bar(y + 8, v.hp, v.hp > 55 ? '#3ac860' : v.hp > 25 ? '#f2c84a' : '#e83a3a', '#2a2638')
      bar(y + 12, v.stamina, '#4ab8ff', '#1a2238')
    }
    plate(0)
    plate(1)
    // The clock, always on the screen: the board over the ring is out of shot when the camera is in close.
    if (f.zoom < 1.25) return
    const clock = f.clock === 'REST' ? 'REST' : f.round > 0 && f.board.startsWith('ROUND') ? `RD ${f.round}  ${f.clock}` : f.board
    const img = this.text(clock, f.clock === 'REST' ? '#c8c8d8' : '#8aff8a', 1)
    c.fillStyle = 'rgba(10,8,20,0.78)'
    c.fillRect(Math.round(CW / 2 - img.width / 2) - 4, 2, img.width + 8, 10)
    c.drawImage(img, Math.round(CW / 2 - img.width / 2), 5)
  }
}
