import { SS } from './boxingRig'

export { SS }

/** Art pixels. */
export const CW = 236
export const RING_H = 150
/**
 * The ring is a diamond seen from above and to one side: its centre, and how far
 * its left and right corners and its far and near corners are from it.
 */
export const RING_CX = 118
export const RING_CY = 78
export const RING_HW = 104
export const RING_HH = 46
/** Where a fighter's feet are at the far and near ends of the floor they use. */
export const FEET_BACK = 58
export const FEET_FRONT = 102
/** Where each man sits between rounds: red in the left-hand corner of the diamond, blue in the right. */
export const CORNER_A_X = 34
export const CORNER_B_X = 202

/** Feet y for a depth from 0 (far) to 1 (near). */
export const feetOf = (depth: number) => FEET_BACK + depth * (FEET_FRONT - FEET_BACK)

/** How far from the centre line a fighter's middle may be at this depth before he is in the ropes. */
export function reach(depth: number): number {
  const half = RING_HW * (1 - Math.abs(feetOf(depth) - RING_CY) / RING_HH)
  return Math.max(8, half - 12)
}

/** The half-width of the diamond at a height, or 0 outside it. */
export function halfAt(y: number, grow = 0): number {
  const f = 1 - Math.abs(y - RING_CY) / (RING_HH + grow)
  return f > 0 ? (RING_HW + grow * 2) * f : 0
}


type Ctx = CanvasRenderingContext2D

function layer(): { canvas: HTMLCanvasElement; c: Ctx } {
  const canvas = document.createElement('canvas')
  canvas.width = CW * SS
  canvas.height = RING_H * SS
  const c = canvas.getContext('2d')!
  c.scale(SS, SS)
  return { canvas, c }
}

const poly = (c: Ctx, pts: Array<[number, number]>) => {
  c.beginPath()
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)))
  c.closePath()
}

/**
 * The ring from above, at twice the pixel density of the rest of the game: a
 * canvas of planks with a worn centre logo on a red apron with white piping,
 * three ropes on each side with a catch of light on every one, steel posts with
 * padded corners. In two layers, because the near ropes go in front of whoever
 * is fighting and the far ones behind.
 */
export function paintRing(): { back: HTMLCanvasElement; front: HTMLCanvasElement } {
  const B = layer()
  const F = layer()
  const b = B.c
  const f = F.c
  const { RING_CX: CX, RING_CY: CY, RING_HW: HW, RING_HH: HH } = { RING_CX, RING_CY, RING_HW, RING_HH }
  // The hall floor ringside, polished, with the tables.
  const floor = b.createLinearGradient(0, 112, 0, RING_H)
  floor.addColorStop(0, '#2a2038')
  floor.addColorStop(1, '#120e1c')
  b.fillStyle = floor
  b.fillRect(0, 112, CW, RING_H - 112)
  b.fillStyle = '#4a3a64'
  b.fillRect(0, 112, CW, 0.5)
  b.fillStyle = 'rgba(255,255,255,0.03)'
  for (let x = 0; x < CW; x += 10) b.fillRect(x, 113, 0.5, RING_H - 113)
  const table = (x: number, w: number, label: string) => {
    const g = b.createLinearGradient(0, 126, 0, 140)
    g.addColorStop(0, '#8a5a32')
    g.addColorStop(0.2, '#6a4426')
    g.addColorStop(1, '#2a1a0e')
    b.fillStyle = g
    b.fillRect(x, 126, w, 14)
    b.fillStyle = '#b07a44'
    b.fillRect(x, 126, w, 0.5)
    b.fillStyle = '#f2c84a'
    b.font = `bold 5px sans-serif`
    b.textAlign = 'center'
    b.fillText(label, x + w / 2, 135)
  }
  table(8, 44, 'TIMEKEEPER')
  table(CW - 112, 104, 'JUDGES')
  // The shadow the ring throws on the floor.
  const sh = b.createRadialGradient(CX, CY + HH + 6, 10, CX, CY + HH + 6, 130)
  sh.addColorStop(0, 'rgba(0,0,0,0.5)')
  sh.addColorStop(1, 'rgba(0,0,0,0)')
  b.fillStyle = sh
  b.fillRect(0, 90, CW, 60)
  const top: [number, number] = [CX, CY - HH]
  const right: [number, number] = [CX + HW, CY]
  const bottom: [number, number] = [CX, CY + HH]
  const left: [number, number] = [CX - HW, CY]
  // The apron: the platform's skirt under the two near sides, red with white piping and a sponsor.
  const APRON = 8
  const apron = b.createLinearGradient(0, CY, 0, CY + HH + APRON)
  apron.addColorStop(0, '#a02020')
  apron.addColorStop(1, '#5a0c0c')
  for (const [a, c2] of [[left, bottom], [bottom, right]] as Array<[[number, number], [number, number]]>) {
    b.fillStyle = apron
    poly(b, [a, c2, [c2[0], c2[1] + APRON], [a[0], a[1] + APRON]])
    b.fill()
    b.strokeStyle = '#f0e8d8'
    b.lineWidth = 0.7
    b.beginPath()
    b.moveTo(a[0], a[1] + 0.4)
    b.lineTo(c2[0], c2[1] + 0.4)
    b.stroke()
    b.strokeStyle = 'rgba(0,0,0,0.5)'
    b.beginPath()
    b.moveTo(a[0], a[1] + APRON - 0.4)
    b.lineTo(c2[0], c2[1] + APRON - 0.4)
    b.stroke()
  }
  // The canvas: planks with a sheen, running along the ring.
  const mat = b.createLinearGradient(CX - HW, CY - HH, CX + HW, CY + HH)
  mat.addColorStop(0, '#d8d0b8')
  mat.addColorStop(0.5, '#e6dfc8')
  mat.addColorStop(1, '#c8bfa6')
  b.fillStyle = mat
  poly(b, [top, right, bottom, left])
  b.fill()
  b.save()
  poly(b, [top, right, bottom, left])
  b.clip()
  b.strokeStyle = 'rgba(120,108,84,0.35)'
  b.lineWidth = 0.4
  for (let k = -14; k <= 14; k++) {
    const t = k / 14
    b.beginPath()
    b.moveTo(CX + t * HW, CY - HH * (1 - Math.abs(t)))
    b.lineTo(CX + t * HW + HW * 0.0, CY + HH * (1 - Math.abs(t)))
    b.stroke()
  }
  for (let k = -9; k <= 9; k++) {
    const t = k / 9
    b.beginPath()
    b.moveTo(left[0] + (top[0] - left[0]) * (0.5 + t / 2), left[1] + (top[1] - left[1]) * (0.5 + t / 2))
    b.lineTo(bottom[0] + (right[0] - bottom[0]) * (0.5 + t / 2), bottom[1] + (right[1] - bottom[1]) * (0.5 + t / 2))
    b.stroke()
  }
  // The worn centre: a red ring and a logo, scuffed by a thousand fights.
  b.translate(CX, CY)
  b.scale(1, HH / HW)
  const rg = b.createRadialGradient(0, 0, 4, 0, 0, 34)
  rg.addColorStop(0, '#d83030')
  rg.addColorStop(0.55, '#c02828')
  rg.addColorStop(0.6, '#f4f0e4')
  rg.addColorStop(0.72, '#f4f0e4')
  rg.addColorStop(0.76, '#b83a3a')
  rg.addColorStop(1, '#a83030')
  b.fillStyle = rg
  b.beginPath()
  b.arc(0, 0, 34, 0, Math.PI * 2)
  b.fill()
  b.fillStyle = '#f4f0e4'
  b.font = 'bold 9px sans-serif'
  b.textAlign = 'center'
  b.fillText('MESA', 0, -1)
  b.font = 'bold 5px sans-serif'
  b.fillText('ARENA', 0, 6)
  b.restore()
  // The ring's lit edge: a white tape line round the canvas.
  b.strokeStyle = 'rgba(255,255,255,0.7)'
  b.lineWidth = 0.6
  poly(b, [top, right, bottom, left])
  b.stroke()

  // The ropes: a catch of light on top, a shadow beneath, a little sag between the posts.
  const ropes: Array<[string, number]> = [['#d82a2a', 6], ['#f4f0e4', 12], ['#2a6ad8', 18]]
  const rope = (c: Ctx, a: [number, number], z: [number, number]) => {
    for (const [color, h] of ropes) {
      const mx = (a[0] + z[0]) / 2
      const my = (a[1] + z[1]) / 2 - h + 1.2
      c.strokeStyle = 'rgba(0,0,0,0.35)'
      c.lineWidth = 1.8
      c.beginPath()
      c.moveTo(a[0], a[1] - h + 2)
      c.quadraticCurveTo(mx, my + 2, z[0], z[1] - h + 2)
      c.stroke()
      c.strokeStyle = color
      c.lineWidth = 1.8
      c.beginPath()
      c.moveTo(a[0], a[1] - h)
      c.quadraticCurveTo(mx, my, z[0], z[1] - h)
      c.stroke()
      c.strokeStyle = 'rgba(255,255,255,0.45)'
      c.lineWidth = 0.5
      c.beginPath()
      c.moveTo(a[0], a[1] - h - 0.7)
      c.quadraticCurveTo(mx, my - 0.7, z[0], z[1] - h - 0.7)
      c.stroke()
    }
  }
  rope(b, left, top)
  rope(b, top, right)
  rope(f, left, bottom)
  rope(f, bottom, right)
  const post = (c: Ctx, [x, y]: [number, number], pad: string) => {
    const steel = c.createLinearGradient(x - 2.5, 0, x + 2.5, 0)
    steel.addColorStop(0, '#8a8a9a')
    steel.addColorStop(0.4, '#e0e0ea')
    steel.addColorStop(1, '#4a4a5a')
    c.fillStyle = 'rgba(0,0,0,0.35)'
    c.fillRect(x - 3.5, y + 0.5, 7, 2)
    c.fillStyle = steel
    c.fillRect(x - 2, y - 27, 4, 29)
    c.fillStyle = '#f4f4fa'
    c.fillRect(x - 2.5, y - 27.5, 5, 2)
    // Turnbuckle pads up the post, in the corner's colour.
    const pg = c.createLinearGradient(x - 3, 0, x + 3, 0)
    pg.addColorStop(0, shadeHex(pad, 1.2))
    pg.addColorStop(1, shadeHex(pad, 0.6))
    c.fillStyle = pg
    c.fillRect(x - 3, y - 22, 6, 17)
    c.fillStyle = 'rgba(255,255,255,0.35)'
    c.fillRect(x - 2.5, y - 22, 1, 17)
    c.fillStyle = 'rgba(0,0,0,0.3)'
    c.fillRect(x - 3, y - 14, 6, 0.5)
  }
  post(b, top, '#f4f0e4')
  post(f, left, '#d82a2a')
  post(f, right, '#2a5ad8')
  post(f, bottom, '#f4f0e4')
  return { back: B.canvas, front: F.canvas }
}

function shadeHex(hex: string, k: number): string {
  const n = parseInt(hex.slice(1, 7), 16)
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)))
  return `rgb(${ch((n >> 16) & 255)},${ch((n >> 8) & 255)},${ch(n & 255)})`
}
