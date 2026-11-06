import { ROUNDS, type BetKind, type Bout, type Defense, type Exchange, type FightPlan, type Punch, type Result } from '../engine/boxing'
import type { Rng } from '../engine/rng'
import { CORNER_A_X, CORNER_B_X, CW, RING_CX, SPR_W, reach, type Pose } from './boxingArt'

/**
 * The fight as it is staged: where each man stands, what he is doing with his
 * hands and feet, who is in the ring with them and what the room is saying, at
 * any moment. `planFight` decides who lands what; this turns that into a
 * timeline and `frameAt` reads it, so the picture can never disagree with the
 * result and the whole thing can be tested without a screen.
 */

/** Positions: x is a sprite's left edge in art pixels; y is depth, 0 at the back ropes and 1 at the front. */
export interface Pos {
  ax: number
  bx: number
  ay: number
  by: number
}

const DIST_MIN = 34
const DIST_MAX = 60
export const EX_MS = 520
export const COMBO_MS = 220
export const DOWN_MS = 1700
export const ROUND_MS = 2800
const WALK_MS = 600
const WIND_UP = 110
const CORNERS: Pos = { ax: CORNER_A_X, bx: CORNER_B_X, ay: 0.9, by: 0.9 }

interface Beat {
  start: number
  dur: number
  round: number
  ex: Exchange
  seq: Punch[]
  from: Pos
  to: Pos
  /** When the last punch of the string arrives, from the start of the beat. */
  hitAt: number
}

interface Rest {
  start: number
  round: number
  prev: Pos
  next: Pos
}

export interface Run {
  index: number
  bout: Bout
  result: Result
  plan: FightPlan
  startedAt: number
  bet: { kind: BetKind; stake: number } | null
  beats: Beat[]
  rests: Rest[]
  events: Array<{ at: number; text: string }>
  /** When each round's fighting starts and ends. */
  spans: Array<{ start: number; end: number }>
  endAt: number
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Where the feet go in one exchange: closing, backing off, circling, and being driven back by a clean shot. */
function evolve(p: Pos, ex: Exchange, rng: Rng): void {
  const att = ex.by
  const dir = rng() < 0.5 ? -1 : 1
  if (ex.step === 'advance') {
    if (att === 'a') p.ax += 6
    else p.bx -= 6
  } else if (ex.step === 'retreat') {
    if (att === 'a') p.ax -= 8
    else p.bx += 8
  } else if (ex.step === 'circle') {
    p.ay += dir * 0.3
    p.by += dir * 0.3
    p.ax += dir * 5
    p.bx += dir * 5
  }
  if (ex.landed) {
    if (att === 'a') p.bx += 4
    else p.ax -= 4
  }
  if (ex.defense === 'clinch') {
    p.bx = p.ax + DIST_MIN
    p.by = p.ay
  }
  p.ay = clamp(p.ay, 0, 1)
  p.by = clamp(p.ay * 0.7 + p.by * 0.3, 0, 1)
  if (p.bx - p.ax < DIST_MIN) {
    if (att === 'a') p.bx = p.ax + DIST_MIN
    else p.ax = p.bx - DIST_MIN
  }
  if (p.bx - p.ax > DIST_MAX) {
    if (att === 'a') p.ax = p.bx - DIST_MAX
    else p.bx = p.ax + DIST_MAX
  }
  fit(p, att)
  if (ex.finisher) {
    // Driven into the corner for the last shot.
    p.ay = 0.5
    p.by = 0.5
    if (att === 'a') {
      p.bx = loHi(p.by)[1]
      p.ax = p.bx - DIST_MIN - 2
    } else {
      p.ax = loHi(p.ay)[0]
      p.bx = p.ax + DIST_MIN + 2
    }
  }
}

/** The left and right limits of a sprite's left edge at this depth: inside the ropes. */
function loHi(depth: number): [number, number] {
  const r = reach(depth)
  return [RING_CX - r - SPR_W / 2, RING_CX + r - SPR_W / 2]
}

/** Keeps both men inside the ropes and a punch apart, giving ground to whoever was not throwing. */
function fit(p: Pos, att: 'a' | 'b'): void {
  for (let pass = 0; pass < 2; pass++) {
    const [la, ha] = loHi(p.ay)
    const [lb, hb] = loHi(p.by)
    p.ax = clamp(p.ax, la, ha)
    p.bx = clamp(p.bx, lb, hb)
    if (p.bx - p.ax < DIST_MIN) {
      if (att === 'a') p.bx = p.ax + DIST_MIN
      else p.ax = p.bx - DIST_MIN
    }
    if (p.bx - p.ax > DIST_MAX) {
      if (att === 'a') p.ax = p.bx - DIST_MAX
      else p.bx = p.ax + DIST_MAX
    }
  }
}

const ADVICE_BEHIND = [
  'You are giving it away. Throw the right hand.',
  'Get off the ropes. Jab, then move.',
  'Work the body, he is slowing down.',
]
const ADVICE_AHEAD = [
  'You are winning it. Stay on the jab, keep moving.',
  'Hands up. Do not walk into the big one.',
  'Box him. Do not brawl.',
]

export function buildRun(index: number, bout: Bout, bet: Run['bet'], result: Result, plan: FightPlan, startedAt: number, rng: Rng): Run {
  const beats: Beat[] = []
  const rests: Rest[] = []
  const events: Run['events'] = []
  const spans: Run['spans'] = []
  const name = (who: 'a' | 'b') => (who === 'a' ? bout.a : bout.b).name
  let pos: Pos = { ax: 80, bx: 122, ay: 0.5, by: 0.5 }
  let prevEnd: Pos = { ...CORNERS }
  let t = 0
  let hpA = 100
  let hpB = 100
  plan.rounds.forEach((round, ri) => {
    const n = ri + 1
    pos = { ax: 70 + Math.round(rng() * 20), bx: 0, ay: 0.5, by: 0.5 }
    pos.bx = pos.ax + 42
    rests.push({ start: t, round: n, prev: prevEnd, next: { ...pos } })
    const behindA = hpA < hpB
    const advice = (n === 1 ? ['Box smart. Find your range.'] : behindA ? ADVICE_BEHIND : ADVICE_AHEAD)[ri % 3 % (n === 1 ? 1 : 3)]
    const cornerOf = n === 1 || behindA ? bout.a : bout.b
    events.push({ at: t + 250, text: n === 1 ? `Round 1. ${bout.a.name} in the red corner, ${bout.b.name} in the blue.` : `${cornerOf.name}’s corner: ${advice}` })
    events.push({ at: t + ROUND_MS - 700, text: `Seconds out. Round ${n} of ${ROUNDS}.` })
    t += ROUND_MS
    const roundStart = t
    for (const ex of round.exchanges) {
      const from = { ...pos }
      evolve(pos, ex, rng)
      const seq = [ex.punch, ...ex.combo]
      const dur = EX_MS + COMBO_MS * ex.combo.length + (ex.knockdown ? DOWN_MS : 0)
      const hitAt = WIND_UP + COMBO_MS * (seq.length - 1) + 100
      beats.push({ start: t, dur, round: n, ex, seq, from, to: { ...pos }, hitAt })
      const def = ex.by === 'a' ? 'b' : 'a'
      if (ex.landed) {
        if (ex.by === 'a') hpB -= ex.damage
        else hpA -= ex.damage
        if (seq.length > 1 && !ex.finisher) events.push({ at: t + hitAt, text: `${name(ex.by)} lets the combination go.` })
        if (ex.knockdown) {
          events.push({ at: t + hitAt + 120, text: `DOWN! ${name(def)} is on the canvas.` })
          for (let i = 0; i < 4; i++) events.push({ at: t + hitAt + 500 + i * 250, text: ['One…', 'Two…', 'Three…', 'Four…'][i] })
          events.push({ at: t + dur - 380, text: `${name(def)} beats the count.` })
        }
      } else if (ex.defense === 'clinch') {
        events.push({ at: t + hitAt, text: 'They tie up. The referee is in.' })
      }
      t += dur
      prevEnd = { ...pos }
    }
    spans.push({ start: roundStart, end: t })
  })
  const koTail = result.method === 'ko'
  if (koTail) {
    const hit = beats[beats.length - 1]
    const loser = result.winner === 'a' ? bout.b : bout.a
    events.push({ at: hit.start + hit.hitAt + 120, text: `DOWN! ${loser.name} is hurt badly.` })
    for (let i = 0; i < 10; i++) events.push({ at: hit.start + hit.hitAt + 500 + i * 190, text: ['One…', 'Two…', 'Three…', 'Four…', 'Five…', 'Six…', 'Seven…', 'Eight…', 'Nine…', 'Ten. It is over.'][i] })
  } else {
    events.push({ at: t + 200, text: 'The final bell. It goes to the judges.' })
  }
  events.sort((x, y) => x.at - y.at)
  return { index, bout, result, plan, startedAt, bet, beats, rests, events, spans, endAt: t + (koTail ? 2600 : 2000) }
}

export interface Frame {
  a: Pose
  b: Pose
  pos: Pos
  hp: [number, number]
  round: number
  ref: { x: number; y: number; pose: 0 | 1 | 2 }
  /** The ring girl crossing the ring with her card, if she is. */
  girl: { x: number; round: number } | null
  /** Trainers lean in: the men are on their stools. */
  corner: boolean
  /** The round clock, counting down from three minutes. */
  clock: string
  text: string | null
  over: boolean
}

const mix = (a: number, b: number, u: number) => a + (b - a) * u
const lerpPos = (p: Pos, q: Pos, u: number): Pos => ({ ax: mix(p.ax, q.ax, u), bx: mix(p.bx, q.bx, u), ay: mix(p.ay, q.ay, u), by: mix(p.by, q.by, u) })
const ease = (u: number) => u * u * (3 - 2 * u)

const PUNCH_POSE: Record<Punch, Pose> = { jab: 'jab', cross: 'cross', hook: 'hook', uppercut: 'upper', body: 'body' }
const DEFENSE_POSE: Record<Defense, Pose> = { block: 'block', parry: 'block', slip: 'slip', duck: 'duck', clinch: 'clinch' }

export function frameAt(run: Run, ms: number): Frame {
  const t = Math.max(0, ms)
  let hpA = 100
  let hpB = 100
  for (const b of run.beats) {
    if (!b.ex.landed || t < b.start + b.hitAt) continue
    if (b.ex.by === 'a') hpB -= b.ex.damage
    else hpA -= b.ex.damage
  }
  const hp: [number, number] = [Math.max(0, hpA), Math.max(0, hpB)]
  let text: string | null = null
  for (const e of run.events) if (e.at <= t) text = e.text
  const bob = (Math.floor(t / 260) % 2) as 0 | 1
  const guard = (side: 0 | 1): Pose => ((bob + side) % 2 === 0 ? 'guard0' : 'guard1')
  const roundNow = run.beats.find((x) => t < x.start + x.dur)?.round ?? run.spans.length
  const span = run.spans[roundNow - 1]
  const u = span ? clamp((t - span.start) / (span.end - span.start), 0, 1) : 1
  const left = Math.round(180 * (1 - u))
  const clock = t < (span?.start ?? 0) ? 'REST' : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`
  const base = { hp, text, clock, over: t >= run.endAt, girl: null as Frame['girl'], corner: false }
  const mid = (p: Pos) => ({ x: (p.ax + p.bx) / 2 + 9, y: Math.min(p.ay, p.by) * 0.5 })

  // Between rounds: to the corners, onto the stools, the ring girl across the ring, back out.
  const rest = run.rests.find((r) => t >= r.start && t < r.start + ROUND_MS)
  if (rest) {
    const tt = t - rest.start
    let pos: Pos
    let a: Pose = guard(0)
    let b: Pose = guard(1)
    let corner = false
    if (tt < WALK_MS) pos = lerpPos(rest.prev, CORNERS, ease(tt / WALK_MS))
    else if (tt < ROUND_MS - WALK_MS) {
      pos = CORNERS
      a = 'sit'
      b = 'sit'
      corner = true
    } else pos = lerpPos(CORNERS, rest.next, ease((tt - (ROUND_MS - WALK_MS)) / WALK_MS))
    const progress = (tt - 300) / (ROUND_MS - 600)
    return {
      ...base,
      a,
      b,
      pos,
      round: rest.round,
      ref: { x: CW / 2 - 8, y: 0.1, pose: bob },
      girl: progress >= 0 && progress <= 1 ? { x: -18 + progress * (CW + 20), round: rest.round } : null,
      corner,
    }
  }

  const beat = run.beats.find((x) => t >= x.start && t < x.start + x.dur)
  const lastBeat = run.beats[run.beats.length - 1]
  if (!beat) {
    // After the last exchange: a man down for a knockout, the winner's hand raised for a decision.
    const pos = lastBeat.to
    const winner = run.result.winner
    const since = t - (lastBeat.start + lastBeat.dur)
    const ko = run.result.method === 'ko'
    const a: Pose = ko ? (winner === 'a' ? 'guard0' : 'down') : since > 500 && winner === 'a' ? 'win' : guard(0)
    const b: Pose = ko ? (winner === 'b' ? 'guard0' : 'down') : since > 500 && winner === 'b' ? 'win' : guard(1)
    const loserX = winner === 'a' ? pos.bx : pos.ax
    const winnerX = winner === 'a' ? pos.ax : pos.bx
    return {
      ...base,
      a: ko && since > 900 && winner === 'a' ? 'win' : a,
      b: ko && since > 900 && winner === 'b' ? 'win' : b,
      pos,
      round: lastBeat.round,
      ref: ko ? { x: loserX + 20 * (winner === 'a' ? -1 : 1), y: 0.3, pose: 2 } : { x: winnerX + 9, y: 0.3, pose: since > 500 ? 2 : bob },
      corner: false,
    }
  }

  const local = t - beat.start
  const ex = beat.ex
  const pos = lerpPos(beat.from, beat.to, ease(Math.min(1, local / (beat.dur * 0.8))))
  const att = ex.by === 'a' ? 0 : 1
  const dirSign = att === 0 ? 1 : -1
  const poses: [Pose, Pose] = [guard(0), guard(1)]
  const shift = [0, 0]
  const last = beat.seq.length - 1
  beat.seq.forEach((p, k) => {
    const s = WIND_UP + k * COMBO_MS
    if (local >= s && local < s + 190) {
      poses[att] = PUNCH_POSE[p]
      shift[att] += 3 * dirSign
      // Earlier punches in a string are covered up; the last is the one that counts.
      if (k < last) poses[1 - att] = 'block'
    }
  })
  const sl = WIND_UP + last * COMBO_MS
  const def = 1 - att
  let down = false
  if (ex.landed) {
    if (ex.finisher || ex.knockdown) {
      if (local >= sl + 90) {
        const upAt = ex.finisher ? Infinity : beat.dur - 350
        if (local < upAt) {
          poses[def] = 'down'
          down = true
        }
      }
    } else if (local >= sl + 90 && local < sl + 370) {
      poses[def] = 'hit'
      shift[def] -= 3 * dirSign
    }
  } else if (ex.defense && local >= sl + 50 && local < sl + 310) {
    poses[def] = DEFENSE_POSE[ex.defense]
    if (ex.defense === 'clinch') poses[att] = 'clinch'
    if (ex.defense === 'slip') shift[def] += 2 * dirSign
  }
  const refPos = mid(pos)
  return {
    ...base,
    a: poses[0],
    b: poses[1],
    pos: { ...pos, ax: pos.ax + shift[0], bx: pos.bx + shift[1] },
    round: beat.round,
    ref: down
      ? { x: def === 0 ? pos.ax + 28 : pos.bx - 8, y: Math.min(1, (def === 0 ? pos.ay : pos.by) + 0.1), pose: 2 }
      : { x: refPos.x, y: refPos.y, pose: bob },
    corner: false,
  }
}
