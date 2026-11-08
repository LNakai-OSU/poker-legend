import { ROUNDS, southpaw, styleOf, verdict, type BetKind, type Bout, type Defense, type Exchange, type FightPlan, type Punch, type Result } from '../engine/boxing'
import type { Rng } from '../engine/rng'
import type { SoundName } from '../audio/audio'
import { CORNER_A_X, CORNER_B_X, CW, RING_CX, feetOf, reach } from './boxingArt'
import { POSES, mixPose, nudge, shift, type Marks, type Pose, type PoseName } from './boxingRig'

/**
 * The fight as it is staged: where each man stands, what his hands and feet are
 * doing, who is in the ring with him and what the room is saying, at any moment.
 * `planFight` decides who lands what; this turns that into a timeline and
 * `frameAt` reads it, so the picture can never disagree with the result and the
 * whole thing can be tested without a screen.
 *
 * Positions: x is the middle of a man's feet in art pixels; y is depth, 0 at the
 * back ropes and 1 at the front.
 */
export interface Pos {
  ax: number
  bx: number
  ay: number
  by: number
}

const DIST_MIN = 30
const DIST_MAX = 48
export const EX_MS = 560
export const COMBO_MS = 230
export const DOWN_MS = 2700
export const ROUND_MS = 3600
export const INTRO_MS = 8200
const WALK_MS = 700
const WIND_MS = 120
const STRIKE_MS = 70
const HOLD_MS = 50
const RECOVER_MS = 190
const CORNERS: Pos = { ax: CORNER_A_X, bx: CORNER_B_X, ay: 0.55, by: 0.55 }

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
  len: number
  round: number
  prev: Pos
  next: Pos
  intro: boolean
}

export interface RunEvent {
  at: number
  text?: string
  sfx?: SoundName
  /** How much the crowd reacts, 0..1; it dies away over a second or two. */
  swell?: number
  /** Whose corner is talking, for the speech bubble. */
  corner?: 'a' | 'b'
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
  events: RunEvent[]
  /** When each round's fighting starts and ends. */
  spans: Array<{ start: number; end: number }>
  /** When each judge's card is read, and when the winner is named. */
  cardsAt: number[]
  decisionAt: number
  endAt: number
  /** When the shot that ends a stoppage lands. */
  koAt: number
  /** The man who goes out, for a stoppage. */
  loser: 'a' | 'b'
  tko: boolean
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
    if (att === 'a') p.bx += ex.power ? 7 : 4
    else p.ax -= ex.power ? 7 : 4
  }
  if (ex.defense === 'clinch') {
    p.bx = p.ax + DIST_MIN - 6
    p.by = p.ay
  }
  p.ay = clamp(p.ay, 0, 1)
  p.by = clamp(p.ay * 0.7 + p.by * 0.3, 0, 1)
  fit(p, att)
  if (ex.finisher) {
    // Driven back onto the ropes for the last shot.
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

/** The left and right limits of a man's middle at this depth: inside the ropes. */
function loHi(depth: number): [number, number] {
  const r = reach(depth)
  return [RING_CX - r, RING_CX + r]
}

/** Keeps both men inside the ropes and a punch apart, giving ground to whoever was not throwing. */
function fit(p: Pos, att: 'a' | 'b'): void {
  for (let pass = 0; pass < 3; pass++) {
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
  'You need this round. Go and take it.',
]
const ADVICE_AHEAD = [
  'You are winning it. Stay on the jab, keep moving.',
  'Hands up. Do not walk into the big one.',
  'Box him. Do not brawl.',
  'Breathe. Stick to the plan.',
]
const ADVICE_HURT = ['Look at me. Look at me! You with me?', 'Stay off the ropes. Hold if you have to.', 'Do not trade with him. Survive this one.']

const PUNCH_LINES: Record<Punch, string[]> = {
  jab: ['Sharp jab.', 'The jab snaps his head back.', 'Stiff jab, right on the nose.'],
  cross: ['Right hand lands!', 'Straight right down the pipe.', 'He walked onto that cross.'],
  hook: ['Left hook!', 'The hook catches him flush.', 'Big hook, he felt that.'],
  uppercut: ['Uppercut!', 'Uppercut, from nowhere.', 'The uppercut lifts his chin.'],
  body: ['To the body.', 'Digging to the ribs.', 'Body shot — you can hear that in the back row.'],
}
const DEF_LINES: Record<Defense, string[]> = {
  block: ['Blocked on the gloves.', 'He covers up.'],
  slip: ['Slipped it, beautiful head movement.', 'Rolls under it.'],
  parry: ['Parried, and he is looking for the counter.', 'Gets a glove on it.'],
  duck: ['Ducks under the hook.', 'Down and under.'],
  clinch: ['They tie up. The referee is in.', 'Clinch. He wants a breather.'],
}
const pickLine = (items: string[], n: number) => items[n % items.length]

const STYLE_WORDS = { slugger: 'a heavy-handed slugger', boxer: 'a stylish boxer', swarmer: 'a relentless swarmer', counter: 'a patient counter-puncher' }

export function buildRun(index: number, bout: Bout, bet: Run['bet'], result: Result, plan: FightPlan, startedAt: number, rng: Rng): Run {
  const beats: Beat[] = []
  const rests: Rest[] = []
  const events: RunEvent[] = []
  const spans: Run['spans'] = []
  const name = (who: 'a' | 'b') => (who === 'a' ? bout.a : bout.b).name
  const surname = (who: 'a' | 'b') => name(who).split(' ').pop()!
  const loser: 'a' | 'b' = result.winner === 'a' ? 'b' : 'a'
  const tko = plan.stoppage === 'tko'
  let pos: Pos
  let prevEnd: Pos = { ...CORNERS }
  let t = 0
  let hpA = 100
  let hpB = 100
  let lineN = 0

  // The introductions: the announcer, the red corner, the blue corner, the referee's instructions.
  const intro = (f: Bout['a'], corner: string) => {
    const s = STYLE_WORDS[styleOf(f)]
    return `In the ${corner} corner, “${f.nick}” ${f.name}. ${f.wins}-${f.losses}, ${f.kos} KOs. ${s[0].toUpperCase()}${s.slice(1)}${southpaw(f) ? ', and a southpaw' : ''}.`
  }
  rests.push({ start: 0, len: INTRO_MS, round: 1, prev: { ...CORNERS }, next: { ax: 82, bx: 124, ay: 0.5, by: 0.5 }, intro: true })
  events.push({ at: 300, text: bout.main ? 'Ladies and gentlemen, the main event of the evening! Six rounds of boxing!' : 'Ladies and gentlemen, six rounds of boxing, here at the Mesa Arena.', sfx: 'roar', swell: 0.5 })
  events.push({ at: 2300, text: intro(bout.a, 'red'), sfx: 'cheer', swell: 0.7, corner: 'a' })
  events.push({ at: 4900, text: intro(bout.b, 'blue'), sfx: 'cheer', swell: 0.7, corner: 'b' })
  events.push({ at: 7000, text: 'The referee calls them together. Protect yourselves at all times. Touch gloves…' })
  events.push({ at: INTRO_MS - 150, text: 'Seconds out. Round 1.', sfx: 'bell', swell: 0.9 })
  t = INTRO_MS
  pos = { ...rests[0].next }

  plan.rounds.forEach((round, ri) => {
    const n = ri + 1
    if (ri > 0) {
      const next: Pos = { ax: 70 + Math.round(rng() * 20), bx: 0, ay: 0.5, by: 0.5 }
      next.bx = next.ax + 42
      rests.push({ start: t, len: ROUND_MS, round: n, prev: prevEnd, next, intro: false })
      const behindA = hpA < hpB
      const who: 'a' | 'b' = behindA ? 'a' : 'b'
      const adv = Math.min(hpA, hpB) < 30 ? ADVICE_HURT : behindA ? ADVICE_BEHIND : ADVICE_AHEAD
      events.push({ at: t + 120, text: `End of round ${n - 1}. ${hpA === hpB ? 'Dead even.' : `${surname(hpA > hpB ? 'a' : 'b')} is ahead on damage.`}`, sfx: 'bell', swell: 0.5 })
      events.push({ at: t + 1500, text: `${name(who)}’s corner: “${adv[(ri + index) % adv.length]}”`, corner: who })
      events.push({ at: t + ROUND_MS - 750, text: `Seconds out. Round ${n} of ${ROUNDS}.`, sfx: 'bell', swell: 0.8 })
      pos = next
      t += ROUND_MS
    }
    const roundStart = t
    round.exchanges.forEach((ex, exI) => {
      const from = { ...pos }
      evolve(pos, ex, rng)
      const seq = [ex.punch, ...ex.combo]
      const dur = EX_MS + COMBO_MS * ex.combo.length + (ex.stagger ? 700 : 0) + (ex.knockdown ? DOWN_MS : 0)
      const hitAt = WIND_MS + COMBO_MS * (seq.length - 1) + STRIKE_MS
      beats.push({ start: t, dur, round: n, ex, seq, from, to: { ...pos }, hitAt })
      const def: 'a' | 'b' = ex.by === 'a' ? 'b' : 'a'
      const at = t + hitAt
      const last = seq[seq.length - 1]
      if (ex.landed) {
        if (ex.by === 'a') hpB -= ex.damage
        else hpA -= ex.damage
        events.push({ at, sfx: ex.power ? 'heavy' : last === 'jab' ? 'jab' : 'punch', swell: ex.power ? 0.7 : 0.25 })
        if (ex.finisher) {
          // The last shot is called below.
        } else if (ex.knockdown) {
          events.push({ at: at + 100, text: `DOWN! ${name(def)} is on the canvas!`, sfx: 'thud', swell: 1 })
          const words = ['One…', 'Two…', 'Three…', 'Four…', 'Five…', 'Six…', 'Seven…', 'Eight…']
          words.forEach((w, i) => events.push({ at: at + 520 + i * 250, text: w, sfx: i === 0 ? undefined : 'check' }))
          events.push({ at: at + 2550, text: `${name(def)} beats the count and the referee lets them fight.`, swell: 0.8 })
        } else if (ex.stagger) {
          events.push({ at: at + 100, text: `${surname(def)} is HURT! His legs have gone!`, swell: 0.9 })
        } else if (ex.cut) {
          events.push({ at: at + 120, text: `${surname(def)} is cut! The blood is running.`, swell: 0.6 })
        } else if (ex.power || seq.length > 1 || ex.counter || exI % 4 === 0) {
          const line = ex.counter
            ? `Counter! ${pickLine(PUNCH_LINES[last], lineN++)}`
            : seq.length > 1
              ? `${surname(ex.by)} lets the combination go. ${pickLine(PUNCH_LINES[last], lineN++)}`
              : pickLine(PUNCH_LINES[last], lineN++)
          events.push({ at: at + 80, text: line })
        }
      } else {
        events.push({ at: t + WIND_MS + STRIKE_MS, sfx: ex.defense === 'block' || ex.defense === 'clinch' ? 'block' : 'whoosh' })
        if (ex.defense && (ex.defense === 'clinch' || exI % 5 === 2)) events.push({ at: at + 60, text: pickLine(DEF_LINES[ex.defense], lineN++) })
      }
      t += dur
      prevEnd = { ...pos }
    })
    spans.push({ start: roundStart, end: t })
  })

  const lastBeat = beats[beats.length - 1]
  const koAt = lastBeat.start + lastBeat.hitAt
  const cardsAt: number[] = []
  let decisionAt = 0
  let endAt: number
  if (result.method === 'ko') {
    if (tko) {
      events.push({ at: koAt + 100, text: `${name(loser)} is out on his feet — and the referee steps in!`, sfx: 'thud', swell: 1 })
      events.push({ at: koAt + 1500, text: `That’s it! The referee waves it off. ${name(result.winner)} wins by TKO.`, sfx: 'roar', swell: 1 })
      endAt = koAt + 5200
    } else {
      const words = ['One…', 'Two…', 'Three…', 'Four…', 'Five…', 'Six…', 'Seven…', 'Eight…', 'Nine…', 'Ten. It is over!']
      events.push({ at: koAt + 100, text: `DOWN! ${name(loser)} is hurt badly!`, sfx: 'thud', swell: 1 })
      words.forEach((w, i) => events.push({ at: koAt + 700 + i * 340, text: w, sfx: i === 9 ? 'roar' : 'check', swell: i === 9 ? 1 : undefined }))
      endAt = koAt + 700 + 10 * 340 + 3200
    }
  } else {
    const done = lastBeat.start + lastBeat.dur
    events.push({ at: done + 150, text: 'The final bell! That’s the fight — it goes to the judges.', sfx: 'bell', swell: 0.9 })
    events.push({ at: done + 2200, text: 'Ladies and gentlemen, we go to the scorecards…', swell: 0.5 })
    plan.cards.forEach((c, i) => {
      const at = done + 4200 + i * 1700
      cardsAt.push(at)
      const tied = c.a === c.b
      events.push({ at, text: `Judge ${c.judge} scores it ${Math.max(c.a, c.b)}-${Math.min(c.a, c.b)}${tied ? '' : ` for ${c.a > c.b ? name('a') : name('b')}`}.`, swell: 0.4 })
    })
    decisionAt = done + 4200 + 3 * 1700 + 400
    events.push({ at: decisionAt, text: verdict(bout, result, plan), sfx: 'roar', swell: 1 })
    endAt = decisionAt + 3600
  }
  events.sort((x, y) => x.at - y.at)
  return { index, bout, result, plan, startedAt, bet, beats, rests, events, spans, cardsAt, decisionAt, endAt, koAt, loser, tko }
}

export interface FighterView {
  pose: Pose
  /** The middle of his feet. */
  x: number
  /** Feet y in depth, 0..1. */
  y: number
  marks: Marks
  hp: number
  stamina: number
  /** He is sitting on the stool: draw it. */
  seated: boolean
}

export interface Person {
  pose: Pose
  x: number
  y: number
  face: 1 | -1
}

export interface Impact {
  x: number
  /** Depth of the man who was hit. */
  yDepth: number
  /** How high up him, in art pixels above his feet. */
  lift: number
  age: number
  /** 0 a flick, 1 a big one. */
  force: number
  /** Which way it throws sweat: 1 right, -1 left. */
  dir: 1 | -1
  seed: number
}

export interface Frame {
  a: FighterView
  b: FighterView
  ref: Person
  trainerA: Person
  trainerB: Person
  /** The ring girl crossing the ring with her card, if she is. */
  girl: (Person & { round: number }) | null
  /** Who is speaking in a corner, to put a bubble up. */
  talking: 'a' | 'b' | null
  round: number
  /** The round clock, counting down from three minutes. */
  clock: string
  text: string | null
  hp: [number, number]
  over: boolean
  /** How loud the room is, 0..1. */
  excite: number
  zoom: number
  focus: { x: number; y: number }
  shake: number
  /** The clock may be slowed for the moment of a shot. */
  slow: number
  impacts: Impact[]
  /** The scorecards read out so far. */
  cardsShown: number
  /** The man whose hand is up. */
  verdict: 'a' | 'b' | null
  /** The bell, just rung, 1 fading to 0. */
  bell: number
  /** The big board's headline. */
  board: string
}

const mix = (a: number, b: number, u: number) => a + (b - a) * u
const lerpPos = (p: Pos, q: Pos, u: number): Pos => ({ ax: mix(p.ax, q.ax, u), bx: mix(p.bx, q.bx, u), ay: mix(p.ay, q.ay, u), by: mix(p.by, q.by, u) })
const ease = (u: number) => u * u * (3 - 2 * u)
const easeOut = (u: number) => 1 - (1 - u) * (1 - u)
const c01 = (u: number) => clamp(u, 0, 1)

const WIND: Record<Punch, PoseName> = { jab: 'jabWind', cross: 'crossWind', hook: 'hookWind', uppercut: 'upperWind', body: 'bodyWind' }
const HIT: Record<Punch, PoseName> = { jab: 'jab', cross: 'cross', hook: 'hook', uppercut: 'upper', body: 'body' }
const LUNGE: Record<Punch, number> = { jab: 4, cross: 5, hook: 4, uppercut: 3, body: 4 }
const DEFENSE_POSE: Record<Defense, PoseName> = { block: 'block', parry: 'parry', slip: 'slip', duck: 'duck', clinch: 'clinch' }

/** Standing guard: two frames of a bob, lower as he tires. */
function guardPose(t: number, side: number, tired: number, style: ReturnType<typeof styleOf>): Pose {
  const u = 0.5 + 0.5 * Math.sin(t / (style === 'swarmer' ? 120 : 170) + side * 1.7)
  const g = shift(mixPose(POSES.guard, POSES.guard1, u), Math.sin(t / 260 + side) * 0.8, 0)
  return tired > 0.02 ? nudge(g, { GF: [-tired, 3 * tired], GR: [-tired, 3.5 * tired], H: [tired, 1.5 * tired] }) : g
}

export function frameAt(run: Run, ms: number): Frame {
  const t = Math.max(0, ms)
  const styleA = styleOf(run.bout.a)
  const styleB = styleOf(run.bout.b)
  // What each man has taken and spent, up to this moment.
  let hpA = 100
  let hpB = 100
  const taken = { a: { head: 0, body: 0, cut: false }, b: { head: 0, body: 0, cut: false } }
  const spent = { a: 0, b: 0 }
  let roundSeen = 0
  let lastHit = -1e9
  let lastPower = -1e9
  const impacts: Impact[] = []
  for (const b of run.beats) {
    if (b.start > t) break
    const att = b.ex.by
    const def = att === 'a' ? 'b' : 'a'
    if (b.round !== roundSeen) {
      roundSeen = b.round
      spent.a = Math.max(0, spent.a - 28)
      spent.b = Math.max(0, spent.b - 28)
    }
    const thrown = b.seq.length * (b.ex.power ? 1.6 : 1.1)
    spent[att] += t >= b.start + b.hitAt ? thrown : thrown * 0.4
    if (!b.ex.landed || t < b.start + b.hitAt) continue
    if (att === 'a') hpB -= b.ex.damage
    else hpA -= b.ex.damage
    if (b.ex.target === 'body') taken[def].body += b.ex.damage
    else taken[def].head += b.ex.damage
    if (b.ex.cut) taken[def].cut = true
    spent[def] += b.ex.damage * 0.12
    lastHit = b.start + b.hitAt
    if (b.ex.power || b.ex.finisher) lastPower = b.start + b.hitAt
    const age = t - (b.start + b.hitAt)
    if (age < 460) {
      impacts.push({
        x: att === 'a' ? b.to.bx : b.to.ax,
        yDepth: att === 'a' ? b.to.by : b.to.ay,
        lift: b.ex.target === 'body' ? 17 : 29,
        age,
        force: b.ex.finisher || b.ex.knockdown ? 1 : b.ex.power ? 0.7 : 0.25,
        dir: att === 'a' ? 1 : -1,
        seed: Math.round(b.start),
      })
    }
  }
  const hp: [number, number] = [Math.max(0, hpA), Math.max(0, hpB)]
  const stamina: [number, number] = [clamp(100 - spent.a * 1.5, 8, 100), clamp(100 - spent.b * 1.5, 8, 100)]
  let text: string | null = null
  let talking: Frame['talking'] = null
  let bell = 0
  let swell = 0
  for (const e of run.events) {
    if (e.at > t) break
    if (e.text) text = e.text
    if (e.corner && t - e.at < 1900) talking = e.corner
    if (e.sfx === 'bell' && t - e.at < 500) bell = 1 - (t - e.at) / 500
    if (e.swell !== undefined) swell = Math.max(swell, e.swell * Math.exp(-(t - e.at) / 1500))
  }
  const bob = (Math.floor(t / 260) % 2) as 0 | 1
  const roundNow = run.beats.find((x) => t < x.start + x.dur)?.round ?? run.spans.length
  const span = run.spans[roundNow - 1]
  const u = span ? clamp((t - span.start) / (span.end - span.start), 0, 1) : 1
  const left = Math.round(180 * (1 - u))
  const clock = !span || t < span.start ? 'REST' : t >= span.end ? '0:00' : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`
  const sta = (who: 'a' | 'b') => stamina[who === 'a' ? 0 : 1]
  const marksOf = (who: 'a' | 'b', gasp: boolean): Marks => ({
    head: c01(taken[who].head / 40),
    body: c01(taken[who].body / 25),
    cut: taken[who].cut,
    sweat: c01(0.15 + (roundSeen / 6) * 0.55 + (100 - sta(who)) / 160),
    gasp: gasp || sta(who) < 38,
  })
  const tired = (who: 'a' | 'b') => c01((60 - sta(who)) / 50)
  const view = (who: 'a' | 'b', pose: Pose, x: number, y: number, gasp = false, seated = false): FighterView => ({
    pose,
    x,
    y,
    marks: marksOf(who, gasp),
    hp: hp[who === 'a' ? 0 : 1],
    stamina: sta(who),
    seated,
  })
  const idle = mixPose(POSES.stand, POSES.walk0, 0.15 * bob)
  const people = (refPose: Pose, refX: number, refY: number, over: { ta?: Pose; tb?: Pose } = {}): Pick<Frame, 'ref' | 'trainerA' | 'trainerB'> => ({
    ref: { pose: refPose, x: refX, y: refY, face: 1 },
    trainerA: { pose: over.ta ?? idle, x: CORNER_A_X - 16, y: 0.5, face: 1 },
    trainerB: { pose: over.tb ?? idle, x: CORNER_B_X + 16, y: 0.5, face: -1 },
  })
  const base = {
    hp,
    text,
    clock,
    over: t >= run.endAt,
    girl: null as Frame['girl'],
    talking,
    cardsShown: run.cardsAt.filter((c) => t >= c).length,
    bell,
    impacts,
    shake: 0,
    slow: 1,
    zoom: 1,
    focus: { x: CW / 2, y: 78 },
    verdict: null as Frame['verdict'],
    board: `ROUND ${roundNow}`,
  }
  const calm = 0.28 + swell * 0.7
  const guardA = guardPose(t, 0, tired('a'), styleA)
  const guardB = guardPose(t, 1, tired('b'), styleB)

  // The introductions and the rests: the corners, the stools, the trainers working, the card carried round.
  const rest = run.rests.find((r) => t >= r.start && t < r.start + r.len)
  if (rest) {
    const tt = t - rest.start
    const len = rest.len
    if (rest.intro) {
      const walk = len - 1100
      const pos = tt < walk ? CORNERS : lerpPos(CORNERS, rest.next, ease((tt - walk) / 1100))
      // Each man throws his arms up when his name is read.
      const raise = (from: number) => (tt >= from && tt < from + 1800 ? mixPose(POSES.guard, POSES.win, ease(c01(Math.min((tt - from) / 300, (from + 1800 - tt) / 300)))) : null)
      const pa = tt > walk ? guardA : (raise(2500) ?? mixPose(POSES.stand, guardA, 0.5))
      const pb = tt > walk ? guardB : (raise(5100) ?? mixPose(POSES.stand, guardB, 0.5))
      const closeUp = tt > 1900 && tt < 4400 ? 'a' : tt > 4400 && tt < 6800 ? 'b' : null
      return {
        ...base,
        round: 1,
        board: 'MESA ARENA',
        a: view('a', pa, pos.ax, pos.ay),
        b: view('b', pb, pos.bx, pos.by),
        ...people(tt > 6900 ? POSES.stand : idle, tt > 6900 ? RING_CX : RING_CX + 28, 0.45),
        excite: 0.35 + swell * 0.6,
        focus: { x: closeUp === 'a' ? CORNERS.ax : closeUp === 'b' ? CORNERS.bx : CW / 2, y: 80 },
        zoom: closeUp ? 1.6 : 1,
      }
    }
    let pos: Pos
    let seated = false
    if (tt < WALK_MS) pos = lerpPos(rest.prev, CORNERS, ease(tt / WALK_MS))
    else if (tt < len - WALK_MS) {
      pos = CORNERS
      seated = true
    } else pos = lerpPos(CORNERS, rest.next, ease((tt - (len - WALK_MS)) / WALK_MS))
    const wipe = Math.sin(tt / 150) > 0
    const lean = (on: boolean) => (on ? POSES.lean : mixPose(POSES.lean, POSES.stand, 0.35))
    const progress = (tt - 400) / (len - 800)
    return {
      ...base,
      round: rest.round,
      board: `ROUND ${rest.round}`,
      a: view('a', seated ? POSES.sit : guardA, pos.ax, pos.ay, seated, seated),
      b: view('b', seated ? POSES.sit : guardB, pos.bx, pos.by, seated, seated),
      ...people(mixPose(POSES.stand, POSES.walk0, bob * 0.2), CW / 2 + 4, 0.2, seated ? { ta: lean(wipe), tb: lean(!wipe) } : {}),
      girl: progress >= 0 && progress <= 1 ? { pose: bob ? POSES.walk0 : POSES.walk1, x: -18 + progress * (CW + 20), y: 0.8, face: 1, round: rest.round } : null,
      excite: calm * 0.8,
    }
  }

  const beat = run.beats.find((x) => t >= x.start && t < x.start + x.dur)
  const lastBeat = run.beats[run.beats.length - 1]
  if (!beat) {
    // After the last exchange: a stoppage, or the final bell and the cards.
    const pos = lastBeat.to
    const winner = run.result.winner
    const wPos = winner === 'a' ? pos.ax : pos.bx
    const lPos = winner === 'a' ? pos.bx : pos.ax
    if (run.result.method === 'ko') {
      const koT = t - run.koAt
      const winAt = run.tko ? 1700 : 700 + 10 * 340
      const winnerGuard = winner === 'a' ? guardA : guardB
      const winnerPose = mixPose(winnerGuard, POSES.win, ease(c01((koT - winAt) / 350)))
      let loserPose: Pose
      let loserX: number
      if (run.tko) {
        loserPose = koT < 300 ? mixPose(POSES.hit, POSES.stagger0, c01(koT / 300)) : koT < 1700 ? mixPose(POSES.stagger0, POSES.stagger1, 0.5 + 0.5 * Math.sin(koT / 160)) : mixPose(POSES.stagger1, POSES.kneel, ease(c01((koT - 1700) / 600)))
        loserX = lPos + (winner === 'a' ? 3 : -3) * c01(koT / 600)
      } else {
        loserPose = koT < 160 ? mixPose(POSES.hit, POSES.fall, c01(koT / 160)) : koT < 520 ? mixPose(POSES.fall, POSES.down, ease(c01((koT - 160) / 360))) : POSES.down
        loserX = lPos + (winner === 'a' ? 6 : -6) * ease(c01(koT / 520))
      }
      const flatPose = (w: 'a' | 'b') => (w === winner ? winnerPose : loserPose)
      const refPose = run.tko ? (koT > 900 && koT < 2600 ? POSES.separate : POSES.stand) : koT > 650 ? mixPose(POSES.countLow, POSES.count, 0.5 + 0.5 * Math.sin(koT / 170)) : POSES.stand
      const rushed = ease(c01((koT - (run.tko ? 2300 : 4200)) / 800))
      const zoomT = ease(c01(koT / 300)) * (1 - ease(c01((koT - (run.tko ? 3200 : 5400)) / 600)))
      return {
        ...base,
        a: view('a', flatPose('a'), winner === 'a' ? pos.ax : loserX, pos.ay, winner !== 'a' && !run.tko),
        b: view('b', flatPose('b'), winner === 'b' ? pos.bx : loserX, pos.by, winner !== 'b' && !run.tko),
        ...people(refPose, (wPos + lPos) / 2 - (winner === 'a' ? 6 : -6), Math.max(0, pos.ay - 0.4)),
        trainerA: { pose: POSES.walk0, x: mix(CORNER_A_X - 16, run.loser === 'a' ? lPos - 14 : wPos - 18, rushed), y: 0.9, face: 1 },
        trainerB: { pose: POSES.walk1, x: mix(CORNER_B_X + 16, run.loser === 'b' ? lPos + 14 : wPos + 18, rushed), y: 0.9, face: -1 },
        round: lastBeat.round,
        excite: 1,
        zoom: 1.5 + 0.5 * zoomT,
        focus: { x: (wPos + lPos) / 2, y: feetOf(pos.ay) - 20 },
        shake: 4 * c01(1 - koT / 380),
        slow: koT < 520 ? 0.3 : 1,
        verdict: koT > winAt ? winner : null,
        board: koT > 900 ? (run.tko ? 'TKO' : 'KNOCKOUT') : `ROUND ${lastBeat.round}`,
        clock: '0:00',
      }
    }
    // A decision: breathing hard, the bell, the cards, a hand raised.
    const since = t - (lastBeat.start + lastBeat.dur)
    const decided = run.decisionAt > 0 && t >= run.decisionAt
    const hand = ease(c01((t - run.decisionAt) / 500))
    const aPose = decided && winner === 'a' ? mixPose(guardA, POSES.win, hand) : since > 600 ? mixPose(POSES.stand, guardA, 0.35) : guardA
    const bPose = decided && winner === 'b' ? mixPose(guardB, POSES.win, hand) : since > 600 ? mixPose(POSES.stand, guardB, 0.35) : guardB
    const apart = ease(c01(since / 1500))
    const ax = mix(pos.ax, RING_CX - 26, apart)
    const bx = mix(pos.bx, RING_CX + 26, apart)
    const refX = decided ? (winner === 'a' ? ax : bx) + 10 : RING_CX
    return {
      ...base,
      a: view('a', aPose, ax, mix(pos.ay, 0.55, apart), true),
      b: view('b', bPose, bx, mix(pos.by, 0.55, apart), true),
      ...people(decided ? POSES.count : POSES.stand, refX, 0.15),
      round: lastBeat.round,
      excite: decided ? 1 : 0.45 + swell * 0.5,
      clock: '0:00',
      verdict: decided ? winner : null,
      board: decided ? 'DECISION' : 'FINAL BELL',
      zoom: decided ? 1.7 : 1.25,
      focus: { x: decided ? refX : RING_CX, y: 78 },
    }
  }

  // The fight: the feet, then the hands.
  const local = t - beat.start
  const ex = beat.ex
  const pos = lerpPos(beat.from, beat.to, ease(Math.min(1, local / (beat.dur * 0.55))))
  const att: 0 | 1 = ex.by === 'a' ? 0 : 1
  const def = 1 - att
  const sgn = att === 0 ? 1 : -1
  const guards: [Pose, Pose] = [guardA, guardB]
  const poses: [Pose, Pose] = [guardA, guardB]
  const shiftX = [0, 0]
  const gasp = [false, false]
  const lastK = beat.seq.length - 1
  const sLast = WIND_MS + lastK * COMBO_MS
  let slow = 1
  // The attacker: for each punch in the string, the load, the arrival, the hold and the recovery.
  for (let k = 0; k <= lastK; k++) {
    const p = beat.seq[k]
    const w0 = k * COMBO_MS
    const s0 = w0 + WIND_MS
    const h0 = s0 + STRIKE_MS
    const r0 = h0 + HOLD_MS
    const r1 = r0 + RECOVER_MS
    if (local < w0 || local >= r1) continue
    if (k < lastK && local >= (k + 1) * COMBO_MS) continue
    if (local < s0) poses[att] = mixPose(guards[att], POSES[WIND[p]], ease(c01((local - w0) / WIND_MS)))
    else if (local < h0) poses[att] = mixPose(POSES[WIND[p]], POSES[HIT[p]], easeOut(c01((local - s0) / STRIKE_MS)))
    else if (local < r0) poses[att] = POSES[HIT[p]]
    else poses[att] = mixPose(POSES[HIT[p]], guards[att], ease(c01((local - r0) / RECOVER_MS)))
    // The step in behind the punch, and back.
    const lunge = local < h0 ? easeOut(c01((local - w0) / (WIND_MS + STRIKE_MS))) : 1 - ease(c01((local - h0) / (RECOVER_MS + HOLD_MS)))
    shiftX[att] = LUNGE[p] * lunge * sgn
    // The earlier punches in a string are taken on the gloves.
    if (k < lastK && local >= s0 - 30 && local < r0 + 60) {
      poses[def] = mixPose(guards[def], POSES.block, easeOut(c01((local - s0 + 30) / 70)))
      shiftX[def] = -1.5 * sgn
    }
  }
  const since = local - (sLast + STRIKE_MS)
  if (ex.landed) {
    if (since > -12 && since < 60 && ex.power) slow = 0.12
    if ((ex.knockdown || ex.finisher) && since > -12 && since < 380) slow = 0.3
    if (since >= 0) {
      const snap = ex.target === 'body' ? POSES.hitBody : POSES.hit
      if (ex.knockdown) {
        let pose: Pose
        if (since < 150) pose = mixPose(guards[def], POSES.fall, easeOut(c01(since / 150)))
        else if (since < 480) pose = mixPose(POSES.fall, POSES.down, ease(c01((since - 150) / 330)))
        else if (since < 1950) pose = POSES.down
        else if (since < 2350) pose = mixPose(POSES.down, POSES.kneel, ease(c01((since - 1950) / 400)))
        else pose = mixPose(POSES.kneel, POSES.stagger0, ease(c01((since - 2350) / 350)))
        poses[def] = pose
        shiftX[def] += -sgn * (6 + 6 * ease(c01(since / 480)))
        gasp[def] = true
        // The attacker is sent back to a neutral corner.
        shiftX[att] += -sgn * 3 * ease(c01(since / 700))
      } else if (ex.finisher) {
        poses[def] = mixPose(guards[def], POSES.hit, easeOut(c01(since / 110)))
      } else if (ex.stagger) {
        const settle = ease(c01(since / 140))
        const gone = since > 140 ? mixPose(POSES.stagger0, POSES.stagger1, Math.sin(since / 120) * 0.5 + 0.5) : mixPose(POSES.hit, POSES.stagger0, settle)
        poses[def] = since > 560 ? mixPose(gone, guards[def], ease(c01((since - 560) / 140))) : gone
        shiftX[def] += -sgn * (4 + 3 * settle)
        gasp[def] = true
        // The attacker follows in with a short second shot.
        if (since > 150 && since < 420) poses[att] = mixPose(guards[att], POSES[WIND.cross], 0.5 * Math.sin(((since - 150) / 270) * Math.PI))
      } else if (since < 330) {
        poses[def] = since < 90 ? mixPose(guards[def], snap, easeOut(c01(since / 90))) : mixPose(snap, guards[def], ease(c01((since - 90) / 240)))
        shiftX[def] += -sgn * 3 * Math.sin((since / 330) * Math.PI)
        gasp[def] = true
      }
    }
  } else if (ex.defense) {
    const d = ex.defense
    const dt = local - (sLast + 20)
    if (dt > -40 && dt < 420) {
      const e = dt < 120 ? easeOut(c01((dt + 40) / 160)) : 1 - ease(c01((dt - 120) / 300))
      poses[def] = mixPose(guards[def], POSES[DEFENSE_POSE[d]], e)
      if (d === 'slip') shiftX[def] += -sgn * 2 * e
      if (d === 'clinch') poses[att] = mixPose(poses[att], POSES.clinch, e)
    }
    // A miss over-reaches: the attacker is a little off-balance.
    if (dt > 60 && dt < 360) poses[att] = mixPose(poses[att], POSES.stagger0, 0.25 * Math.sin(((dt - 60) / 300) * Math.PI))
  }
  // The referee: between them, kneeling over a man who is down, or pulling a clinch apart.
  let refPose: Pose = mixPose(POSES.stand, POSES.walk0, bob * 0.25)
  let refX = (pos.ax + pos.bx) / 2 + 3
  let refY = Math.max(0, Math.min(pos.ay, pos.by) - 0.45)
  if (ex.landed && ex.knockdown && since > 400) {
    refPose = since > 520 && since < 2200 ? mixPose(POSES.countLow, POSES.count, 0.5 + 0.5 * Math.sin(since / 200)) : POSES.stand
    refX = (def === 0 ? pos.ax : pos.bx) - sgn * 12
    refY = Math.max(0, (def === 0 ? pos.ay : pos.by) - 0.35)
  } else if (!ex.landed && ex.defense === 'clinch' && local > sLast + 120) {
    refPose = POSES.separate
    refY = Math.max(0, pos.ay - 0.3)
  }
  const downNow = ex.landed && ex.knockdown && since > 100 && since < 2300
  const zoomT = downNow ? ease(c01(since / 260)) * (1 - ease(c01((since - 1900) / 380))) : 0
  const hot = ex.landed && ex.power && since >= 0 && since < 300 ? 1 : 0
  const centre = (pos.ax + pos.bx) / 2
  const recent = t - lastPower < 260 ? 1 - (t - lastPower) / 260 : 0
  return {
    ...base,
    a: view('a', poses[0], pos.ax + shiftX[0], pos.ay, gasp[0]),
    b: view('b', poses[1], pos.bx + shiftX[1], pos.by, gasp[1]),
    ...people(refPose, refX, refY),
    round: beat.round,
    excite: clamp(calm + (t - lastHit < 600 ? 0.25 : 0) + (ex.landed && ex.knockdown ? 0.5 : 0) + (beat.round >= 5 ? 0.15 : 0), 0.2, 1),
    zoom: 1.5 + 0.45 * zoomT + 0.06 * hot,
    focus: { x: downNow ? (def === 0 ? pos.ax : pos.bx) : centre, y: feetOf((pos.ay + pos.by) / 2) - 20 },
    shake: Math.max(recent * 2.2, hot * 1.2),
    slow,
  }
}

/** The two men in their corners, waiting, for the card screen before the first bell. */
export function idleFrame(bout: Bout, t: number): Frame {
  const stub = {
    index: 0,
    bout,
    result: { winner: 'a', method: 'decision', round: ROUNDS },
    plan: { rounds: [], endA: 100, endB: 100, cards: [] },
    startedAt: 0,
    bet: null,
    beats: [],
    rests: [{ start: 0, len: 1e9, round: 1, prev: CORNERS, next: CORNERS, intro: true }],
    events: [],
    spans: [],
    cardsAt: [],
    decisionAt: 0,
    endAt: 1e12,
    koAt: 0,
    loser: 'b',
    tko: false,
  } as Run
  return frameAt(stub, 1e5 + t)
}
