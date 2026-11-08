import { shade } from './pixel/color'

/**
 * A boxer is a handful of joints, not a bitmap: where the head, shoulders, hips,
 * gloves and feet are, in pixels from the middle of his feet on the canvas. A
 * pose is those points; a punch is a blend from one pose to the next. Elbows and
 * knees are found from the points either side, so limbs keep their length however
 * far a glove travels, and every frame is a fresh drawing: a jab, a slipped
 * cross and a hook that lands all look like the thing they are.
 *
 * Everyone faces right; the other corner is the same drawing mirrored.
 */

export type Pose = number[]

const KEYS = ['H', 'SF', 'SR', 'P', 'EF', 'ER', 'GF', 'GR', 'KF', 'KR', 'FF', 'FR'] as const
type Key = (typeof KEYS)[number]
const make = (spec: Record<Key, [number, number]>): Pose => KEYS.flatMap((k) => spec[k])
const at = (p: Pose, k: Key): [number, number] => {
  const i = KEYS.indexOf(k) * 2
  return [p[i], p[i + 1]]
}
export const mixPose = (a: Pose, b: Pose, u: number): Pose => a.map((v, i) => v + (b[i] - v) * u)
/** Moves some of a pose's points: the head, the gloves, the whole body. */
export function nudge(p: Pose, moves: Partial<Record<Key, [number, number]>>): Pose {
  const out = [...p]
  for (const k of Object.keys(moves) as Key[]) {
    const i = KEYS.indexOf(k) * 2
    out[i] += moves[k]![0]
    out[i + 1] += moves[k]![1]
  }
  return out
}
export const shift = (p: Pose, dx: number, dy: number): Pose => p.map((v, i) => v + (i % 2 ? dy : dx))

const guard = make({
  H: [3, -33], SF: [2, -27], SR: [0, -27], P: [0, -14],
  EF: [4, -21], ER: [1, -20], GF: [10, -28], GR: [6, -30],
  KF: [5, -7], KR: [-2, -7], FF: [7, 0], FR: [-6, 0],
})

/** Everything a man can be doing, by name. */
export const POSES = {
  guard,
  guard1: nudge(shift(guard, 0.6, 1.2), { GF: [-0.5, 0.5], GR: [0.5, -0.5], FF: [-0.6, 0], FR: [0.6, 0] }),
  // The punches: the load, then the arrival.
  jabWind: nudge(guard, { GF: [-3, 1], SF: [-1, 0], H: [-1, 0], FF: [1, 0] }),
  jab: nudge(guard, { GF: [10, 0], EF: [8, 4], SF: [3, 0], SR: [1, 0], H: [3, 0], P: [1.5, 0], FF: [3, 0], KF: [2, 0] }),
  crossWind: nudge(guard, { GR: [-3, 2], ER: [-2, 2], SR: [-1, 0], P: [-1, 0], FR: [-1, 0] }),
  cross: nudge(guard, { GR: [14, 0], ER: [9, -1], SR: [4, 0], SF: [1, 0], H: [4, 0], P: [3, 0], KF: [3, 0], FF: [4, 0], FR: [-3, -1], KR: [0, -1], GF: [-1, 1] }),
  hookWind: nudge(guard, { GF: [-4, 4], EF: [0, -2], SF: [-2, 0], P: [-1, 0], H: [-1, 1] }),
  hook: nudge(guard, { GF: [11, 1], EF: [8, -5], SF: [3, 0], SR: [1, 0], H: [3, 0], P: [2, 0], FF: [3, 0], KF: [2, 0], GR: [-1, 1] }),
  upperWind: nudge(guard, { GR: [-1, 11], ER: [-3, 6], P: [0, 2], H: [1, 2], SF: [0, 2], SR: [0, 2], KF: [1, 3], KR: [-1, 3], FF: [1, 0], FR: [-1, 0] }),
  upper: nudge(guard, { GR: [11, 1], ER: [8, -1], SR: [3, 0], SF: [2, 0], H: [3, -1], P: [1, -0.5], FF: [3, 0], KF: [2, 0] }),
  bodyWind: nudge(guard, { P: [-1, 2], H: [3, 4], SF: [2, 3], SR: [1, 3], GR: [-2, 6], KF: [1, 2], KR: [-1, 2] }),
  body: nudge(guard, { P: [2, 2], H: [7, 4], SF: [5, 3], SR: [3, 3], GF: [9, 10], EF: [8, 4], GR: [4, 2], ER: [3, 0], FF: [4, 0], KF: [3, 2], KR: [0, 2] }),
  // The answers.
  block: nudge(guard, { GF: [-1, -4], GR: [-2, -3], EF: [-1, 1], ER: [-1, 1], H: [-1, 1] }),
  parry: nudge(guard, { GF: [4, 1], EF: [3, 0] }),
  slip: nudge(guard, { H: [-4, 1], SF: [-2, 0], SR: [-3, 0], P: [-1, 0], GF: [-2, 0], GR: [-3, 0] }),
  roll: nudge(guard, { H: [-1, 4], SF: [1, 3], SR: [0, 3], P: [-1, 1.5], GF: [-1, 3], GR: [-2, 3], KF: [1, 2], KR: [0, 2] }),
  duck: nudge(guard, { H: [5, 7], SF: [5, 6], SR: [3, 6], P: [0, 5], KF: [3, 3], KR: [-2, 3], FF: [3, 0], FR: [-3, 0], GF: [6, 4], GR: [3, 4], EF: [4, 3], ER: [2, 3] }),
  clinch: nudge(guard, { H: [7, 0], SF: [5, 0], SR: [3, 0], GF: [13, 1], GR: [11, 3], EF: [8, 4], ER: [7, 5] }),
  // The damage.
  hit: make({
    H: [-3, -35], SF: [-1, -27], SR: [-2, -27], P: [-2, -14.3],
    EF: [1, -22], ER: [-3, -22], GF: [4, -23], GR: [-1, -25],
    KF: [4, -7], KR: [-4, -7], FF: [7, 0], FR: [-7, 0],
  }),
  hitBody: make({
    H: [6, -28], SF: [4, -23], SR: [3, -23], P: [-1, -13],
    EF: [5, -18], ER: [3, -17], GF: [8, -19], GR: [6, -18],
    KF: [5, -6], KR: [-2, -6], FF: [7, 0], FR: [-6, 0],
  }),
  stagger0: make({
    H: [2, -29], SF: [2, -24], SR: [0, -24], P: [-1, -12],
    EF: [4, -18], ER: [0, -18], GF: [7, -17], GR: [-1, -16],
    KF: [8, -5], KR: [-5, -6], FF: [9, 0], FR: [-8, 0],
  }),
  stagger1: make({
    H: [-2, -29], SF: [-1, -24], SR: [-3, -24], P: [-3, -12],
    EF: [2, -19], ER: [-3, -18], GF: [4, -19], GR: [-4, -17],
    KF: [6, -6], KR: [-7, -5], FF: [8, 0], FR: [-10, 0],
  }),
  fall: make({
    H: [-7, -30], SF: [-4, -24], SR: [-5, -24], P: [-4, -12],
    EF: [1, -26], ER: [-3, -27], GF: [5, -27], GR: [0, -29],
    KF: [4, -8], KR: [-5, -6], FF: [5, 0], FR: [-8, 0],
  }),
  kneel: make({
    H: [-3, -24], SF: [-3, -18], SR: [-4, -18], P: [-5, -6],
    EF: [1, -12], ER: [-2, -10], GF: [6, -9], GR: [0, -4],
    KF: [6, -11], KR: [-4, -1], FF: [9, 0], FR: [-9, 0],
  }),
  down: make({
    H: [-19, -5], SF: [-12, -5], SR: [-12, -4], P: [-3, -4],
    EF: [-10, -9], ER: [-14, -9], GF: [-6, -8], GR: [-10, -7],
    KF: [5, -13], KR: [3, -12], FF: [9, -1], FR: [6, -1],
  }),
  // Between rounds and after.
  sit: make({
    H: [1, -29], SF: [0, -22], SR: [-1, -22], P: [-1, -10],
    EF: [4, -16], ER: [2, -15], GF: [9, -13], GR: [7, -14],
    KF: [9, -12], KR: [8, -11], FF: [10, 0], FR: [7, 0],
  }),
  win: make({
    H: [1, -34], SF: [2, -27], SR: [0, -27], P: [0, -14],
    EF: [7, -33], ER: [-3, -34], GF: [9, -41], GR: [-4, -43],
    KF: [4, -7], KR: [-3, -7], FF: [6, 0], FR: [-6, 0],
  }),
  // People who are not fighting.
  stand: make({
    H: [1, -34], SF: [1, -27], SR: [0, -27], P: [0, -14],
    EF: [2, -21], ER: [-1, -21], GF: [3, -14], GR: [-2, -14],
    KF: [2, -7], KR: [-2, -7], FF: [3, 0], FR: [-3, 0],
  }),
  walk0: make({
    H: [1, -34], SF: [1, -27], SR: [0, -27], P: [0, -14],
    EF: [4, -21], ER: [-4, -21], GF: [7, -15], GR: [-6, -16],
    KF: [5, -7], KR: [-4, -7], FF: [7, 0], FR: [-6, -1],
  }),
  walk1: make({
    H: [1, -34], SF: [1, -27], SR: [0, -27], P: [0, -14],
    EF: [-3, -21], ER: [3, -21], GF: [-6, -16], GR: [6, -15],
    KF: [-3, -7], KR: [4, -7], FF: [-6, -1], FR: [6, 0],
  }),
  count: make({
    H: [1, -34], SF: [1, -27], SR: [0, -27], P: [0, -14],
    EF: [6, -31], ER: [-1, -21], GF: [8, -40], GR: [-2, -14],
    KF: [2, -7], KR: [-2, -7], FF: [3, 0], FR: [-3, 0],
  }),
  countLow: make({
    H: [7, -30], SF: [4, -24], SR: [3, -24], P: [-1, -12],
    EF: [8, -22], ER: [2, -18], GF: [12, -26], GR: [3, -12],
    KF: [4, -6], KR: [-3, -6], FF: [6, 0], FR: [-5, 0],
  }),
  separate: make({
    H: [1, -34], SF: [1, -27], SR: [0, -27], P: [0, -14],
    EF: [7, -24], ER: [-6, -24], GF: [12, -26], GR: [-11, -26],
    KF: [2, -7], KR: [-2, -7], FF: [3, 0], FR: [-3, 0],
  }),
  lean: make({
    H: [7, -31], SF: [4, -26], SR: [3, -26], P: [-1, -14],
    EF: [8, -22], ER: [4, -20], GF: [13, -26], GR: [8, -16],
    KF: [4, -7], KR: [-3, -7], FF: [6, 0], FR: [-5, 0],
  }),
  card: make({
    H: [1, -34], SF: [1, -27], SR: [0, -27], P: [0, -14],
    EF: [5, -34], ER: [-3, -34], GF: [4, -45], GR: [-2, -45],
    KF: [2, -7], KR: [-2, -7], FF: [3, 0], FR: [-3, 0],
  }),
} satisfies Record<string, Pose>

export type PoseName = keyof typeof POSES

export interface Look {
  skin: string
  hair: string
  /** Trunks, or the trousers or skirt a person in clothes wears. */
  bottom: string
  /** A shirt or jacket; null for a bare chest. */
  top: string | null
  gloves: string | null
  accent: string
  build: 'lean' | 'stocky' | 'tall'
  shoes?: string
  long?: boolean
  tie?: boolean
  skirt?: boolean
  bald?: boolean
  /** A bar of tape or a belt in the second colour. */
  trim?: string
}

export interface Marks {
  /** 0..1 how much the face has taken: reddening, then a swollen eye. */
  head: number
  /** 0..1 how red the ribs are. */
  body: number
  cut: boolean
  /** How sweaty he is, 0..1. */
  sweat: number
  /** Mouth open, mouthguard showing. */
  gasp: boolean
}
export const CLEAN: Marks = { head: 0, body: 0, cut: false, sweat: 0, gasp: false }

type Ctx = CanvasRenderingContext2D

const INK = '#14101c'

function seg(c: Ctx, x0: number, y0: number, x1: number, y1: number, th: number, color: string) {
  c.fillStyle = color
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))))
  const t = Math.max(1, Math.round(th))
  for (let i = 0; i <= n; i++) {
    c.fillRect(Math.round(x0 + ((x1 - x0) * i) / n - t / 2), Math.round(y0 + ((y1 - y0) * i) / n - t / 2), t, t)
  }
}

/** A two-bone limb from a to b, the joint on whichever side is nearer the hint. Returns where the limb actually ends. */
function limb(a: [number, number], b: [number, number], l1: number, l2: number, hint: [number, number]): { mid: [number, number]; end: [number, number] } {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const dist = Math.hypot(dx, dy) || 0.001
  const d = Math.min(l1 + l2 - 0.05, Math.max(Math.abs(l1 - l2) + 0.05, dist))
  const ux = dx / dist
  const uy = dy / dist
  const along = (l1 * l1 - l2 * l2 + d * d) / (2 * d)
  const h = Math.sqrt(Math.max(0, l1 * l1 - along * along))
  const px = a[0] + ux * along
  const py = a[1] + uy * along
  const m1: [number, number] = [px - uy * h, py + ux * h]
  const m2: [number, number] = [px + uy * h, py - ux * h]
  const mid = Math.hypot(m1[0] - hint[0], m1[1] - hint[1]) < Math.hypot(m2[0] - hint[0], m2[1] - hint[1]) ? m1 : m2
  return { mid, end: [a[0] + ux * d, a[1] + uy * d] }
}

/**
 * Draws one person at (x, y) — the middle of his feet — in a pose. `face` is 1 for
 * looking right, -1 for left. `scale` stretches the whole drawing.
 */
export function drawPerson(c: Ctx, pose: Pose, look: Look, x: number, y: number, face: 1 | -1, marks: Marks = CLEAN, scale = 1): void {
  const skin = look.skin
  const dim = shade(skin, 0.8)
  const tall = look.build === 'tall' ? 1.06 : look.build === 'stocky' ? 0.96 : 1
  const tw = look.build === 'stocky' ? 9 : look.build === 'lean' ? 7 : 8
  c.save()
  c.translate(Math.round(x), Math.round(y))
  c.scale(face * scale * tall, scale * tall)
  const H = at(pose, 'H')
  const SF = at(pose, 'SF')
  const SR = at(pose, 'SR')
  const P = at(pose, 'P')
  const sh: [number, number] = [(SF[0] + SR[0]) / 2, (SF[1] + SR[1]) / 2]
  const shoe = look.shoes ?? '#201818'

  // Legs.
  const leg = (hip: [number, number], foot: [number, number], hint: [number, number], color: string) => {
    const l = limb(hip, foot, 8.2, 8.2, hint)
    seg(c, hip[0], hip[1], l.mid[0], l.mid[1], 3.4, color)
    seg(c, l.mid[0], l.mid[1], l.end[0], l.end[1], 2.8, color)
    c.fillStyle = shoe
    c.fillRect(Math.round(foot[0] - 2), Math.round(foot[1] - 2), 6, 2)
    c.fillStyle = '#e8e4dc'
    c.fillRect(Math.round(foot[0] - 2), Math.round(foot[1] - 1), 6, 1)
  }
  const legColor = look.skirt ? skin : look.top ? look.bottom : skin
  leg([P[0] - 1, P[1]], at(pose, 'FR'), at(pose, 'KR'), look.top && !look.skirt ? shade(look.bottom, 0.85) : dim)
  // The near leg, over the far.
  leg([P[0] + 1, P[1]], at(pose, 'FF'), at(pose, 'KF'), legColor)

  // The rear arm, behind the body.
  const arm = (shoulder: [number, number], glove: [number, number], hint: [number, number], color: string, front: boolean) => {
    const l = limb(shoulder, glove, 7.2, 7.2, hint)
    seg(c, shoulder[0], shoulder[1], l.mid[0], l.mid[1], 3, look.top && look.gloves === null ? look.top : color)
    seg(c, l.mid[0], l.mid[1], l.end[0], l.end[1], 2.6, color)
    if (look.gloves) {
      const g = look.gloves
      const gx = Math.round(l.end[0])
      const gy = Math.round(l.end[1])
      c.fillStyle = INK
      c.fillRect(gx - 3, gy - 3, 7, 7)
      c.fillStyle = g
      c.fillRect(gx - 2, gy - 2, 5, 5)
      c.fillStyle = shade(g, 1.35)
      c.fillRect(gx - 2, gy - 2, 5, 1)
      c.fillRect(gx - 2, gy - 2, 1, 3)
      c.fillStyle = shade(g, 0.7)
      c.fillRect(gx - 2, gy + 2, 5, 1)
      // The cuff and tape at the wrist, back along the forearm.
      const wx = l.end[0] + (l.mid[0] - l.end[0]) * 0.3
      const wy = l.end[1] + (l.mid[1] - l.end[1]) * 0.3
      c.fillStyle = '#f4f0e4'
      c.fillRect(Math.round(wx - 1), Math.round(wy - 1), 3, 3)
      void front
    } else {
      c.fillStyle = skin
      c.fillRect(Math.round(l.end[0] - 1), Math.round(l.end[1] - 1), 3, 3)
    }
  }
  arm(SR, at(pose, 'GR'), at(pose, 'ER'), dim, false)

  // Torso, shoulders broader than the waist; a vest or bare chest.
  const dx = P[0] - sh[0]
  const dy = P[1] - sh[1]
  const rows = Math.max(4, Math.round(Math.hypot(dx, dy) / 1.2))
  for (let i = 0; i <= rows; i++) {
    const u = i / rows
    const cx = sh[0] + dx * u
    const cy = sh[1] + dy * u
    const w = tw + 1 - u * 1.8
    c.fillStyle = look.top ?? skin
    c.fillRect(Math.round(cx - w / 2), Math.round(cy), Math.round(w), 2)
  }
  if (!look.top) {
    // Ribs and a dark line down the middle, red where he has been hit; sweat catches the light.
    const rx = Math.round(sh[0] + dx * 0.55)
    const ry = Math.round(sh[1] + dy * 0.55)
    c.fillStyle = dim
    c.fillRect(rx - 2, ry, 4, 1)
    c.fillRect(rx - 2, ry + 2, 4, 1)
    if (marks.body > 0.05) {
      c.fillStyle = `rgba(200,50,50,${0.25 + marks.body * 0.5})`
      c.fillRect(rx - 1, ry - 2, 4, 5)
    }
    if (marks.sweat > 0.1) {
      c.fillStyle = 'rgba(255,255,255,0.55)'
      c.fillRect(Math.round(sh[0]) - 1, Math.round(sh[1]) + 1, 3, 1)
      c.fillRect(rx + 1, ry - 3, 1, 2)
    }
  } else if (look.tie) {
    c.fillStyle = '#14101c'
    c.fillRect(Math.round(sh[0] + dx * 0.05) + 1, Math.round(sh[1] + 1), 3, 2)
  } else if (look.trim) {
    c.fillStyle = look.trim
    c.fillRect(Math.round(sh[0] - tw / 2), Math.round(sh[1]), tw + 1, 2)
  }

  // Trunks, skirt or trousers from the waist.
  const bottomH = look.skirt ? 12 : 7
  c.fillStyle = look.bottom
  c.fillRect(Math.round(P[0] - tw / 2 - 0.5), Math.round(P[1] - 2), tw + 1, bottomH)
  c.fillStyle = look.accent
  c.fillRect(Math.round(P[0] - tw / 2 - 0.5), Math.round(P[1] - 2), tw + 1, 2)
  if (!look.skirt) {
    c.fillStyle = shade(look.bottom, 0.8)
    c.fillRect(Math.round(P[0] - tw / 2 - 0.5), Math.round(P[1] + bottomH - 3), tw + 1, 1)
  }
  if (look.trim && !look.top) {
    c.fillStyle = look.trim
    c.fillRect(Math.round(P[0] + tw / 2 - 1), Math.round(P[1]), 1, 5)
  }

  // Neck and head.
  c.fillStyle = skin
  c.fillRect(Math.round((H[0] + sh[0]) / 2 - 1), Math.round(H[1] + 3), 3, Math.max(2, Math.round(sh[1] - H[1] - 3)))
  const hx = Math.round(H[0])
  const hy = Math.round(H[1])
  c.fillStyle = INK
  c.fillRect(hx - 5, hy - 5, 10, 10)
  c.fillStyle = skin
  c.fillRect(hx - 4, hy - 4, 8, 9)
  c.fillRect(hx + 4, hy - 1, 1, 3)
  c.fillStyle = dim
  c.fillRect(hx - 4, hy + 3, 8, 1)
  // Hair or a bald head, the ear.
  if (!look.bald) {
    c.fillStyle = look.hair
    c.fillRect(hx - 4, hy - 5, 8, 3)
    c.fillRect(hx - 5, hy - 4, 2, look.long ? 11 : 4)
    c.fillRect(hx + 2, hy - 3, 2, 1)
  }
  c.fillStyle = dim
  c.fillRect(hx - 2, hy - 1, 2, 2)
  // Face: brow, eye, nose, mouth.
  const swollen = marks.head > 0.45
  c.fillStyle = look.hair
  c.fillRect(hx + 1, hy - 2, 3, 1)
  c.fillStyle = swollen ? '#7a3a6a' : INK
  c.fillRect(hx + 2, hy - 1, 2, swollen ? 2 : 1)
  if (swollen) {
    c.fillStyle = '#3a1a3a'
    c.fillRect(hx + 2, hy, 2, 1)
  }
  c.fillStyle = dim
  c.fillRect(hx + 4, hy + 1, 1, 1)
  if (marks.gasp) {
    c.fillStyle = INK
    c.fillRect(hx + 1, hy + 2, 4, 2)
    c.fillStyle = '#f4f0e4'
    c.fillRect(hx + 1, hy + 2, 3, 1)
  } else {
    c.fillStyle = shade(skin, 0.55)
    c.fillRect(hx + 2, hy + 3, 2, 1)
  }
  if (marks.head > 0.12) {
    c.fillStyle = `rgba(210,60,60,${0.15 + marks.head * 0.45})`
    c.fillRect(hx + 1, hy + 1, 3, 3)
    c.fillRect(hx - 3, hy - 1, 2, 3)
  }
  if (marks.cut) {
    c.fillStyle = '#d82020'
    c.fillRect(hx + 1, hy - 3, 3, 1)
    c.fillRect(hx + 3, hy - 2, 1, 5)
    c.fillStyle = '#a01010'
    c.fillRect(hx + 4, hy + 2, 1, 4)
  }
  if (marks.sweat > 0.1) {
    c.fillStyle = 'rgba(255,255,255,0.6)'
    c.fillRect(hx - 2, hy - 4, 2, 1)
    c.fillRect(hx + 1, hy + 4, 1, 1)
  }

  // The lead arm over the body.
  arm(SF, at(pose, 'GF'), at(pose, 'EF'), skin, true)
  c.restore()
}
