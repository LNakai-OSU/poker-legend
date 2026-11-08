import { mulberry32, type Rng } from './rng'

/**
 * Fight night at the Mesa arena: a card of three bouts, each between two named
 * fighters you can bet on.
 *
 * A fighter has a hidden strength (how often they beat a given opponent), a
 * punch (how often a win ends early) and a chin (how often a loss does). From
 * those, every bout has exact chances for five bets — either man to win, either
 * man to win by knockout, or the fight to go the distance — and the board pays
 * the fair price less the house's takeout, rounded down to the nickel. Nothing is
 * nudged for drama: the result is drawn first, and the fight you watch is a
 * story told to fit it.
 */

export const TAKEOUT = 0.12
export const MIN_RETURN = 1.05
export const ROUNDS = 6
export const BOUTS = 3

export interface Fighter {
  id: string
  name: string
  nick: string
  /** Hidden: how often they beat an equal-sized opponent, in the Bradley-Terry sense. */
  strength: number
  /** 1..5: how often a win ends early. */
  power: number
  /** 1..5: how well a loss is survived. */
  chin: number
  wins: number
  losses: number
  kos: number
  /** Trunks, gloves and skin, for the sprite. */
  trunks: string
  gloves: string
  skin: string
  hair: string
  build: 'lean' | 'stocky' | 'tall'
}

const F = (
  id: string,
  name: string,
  nick: string,
  strength: number,
  power: number,
  chin: number,
  record: [number, number, number],
  look: Pick<Fighter, 'trunks' | 'gloves' | 'skin' | 'hair' | 'build'>,
): Fighter => ({ id, name, nick, strength, power, chin, wins: record[0], losses: record[1], kos: record[2], ...look })

export const ROSTER: Fighter[] = [
  F('ortega', 'Danny Ortega', 'The Landlord', 3.2, 4, 3, [21, 3, 14], { trunks: '#d82a2a', gloves: '#d82a2a', skin: '#d8a87a', hair: '#141414', build: 'stocky' }),
  F('pike', 'Marcus Pike', 'Quiet Storm', 2.4, 2, 4, [15, 5, 4], { trunks: '#2a6ad8', gloves: '#f4f0e4', skin: '#74482c', hair: '#141414', build: 'lean' }),
  F('vance', 'Lou Vance', 'Sunday Punch', 1.8, 5, 1, [11, 9, 10], { trunks: '#f2c84a', gloves: '#2a2a30', skin: '#f4d4b4', hair: '#b07a3a', build: 'tall' }),
  F('okafor', 'Femi Okafor', 'The Accountant', 3.6, 3, 4, [24, 2, 11], { trunks: '#30a050', gloves: '#f4f0e4', skin: '#5e3a22', hair: '#141414', build: 'tall' }),
  F('rusk', 'Gus Rusk', 'Glass Jaw Gus', 1.2, 4, 1, [8, 14, 6], { trunks: '#8a8a98', gloves: '#c82828', skin: '#ecc6a2', hair: '#8a5a2b', build: 'stocky' }),
  F('chen', 'Mia Chen', 'Paper Cut', 2.8, 2, 3, [17, 4, 5], { trunks: '#c050d0', gloves: '#c050d0', skin: '#e2b48c', hair: '#141414', build: 'lean' }),
  F('bellamy', 'Tobias Bellamy', 'Big Tobacco', 2.0, 4, 3, [13, 8, 9], { trunks: '#3a2a18', gloves: '#c8a040', skin: '#cc9a6c', hair: '#4a2e1c', build: 'stocky' }),
  F('sato', 'Ren Sato', 'Last Orders', 3.0, 3, 2, [19, 6, 8], { trunks: '#f4f0e4', gloves: '#d82a2a', skin: '#e2b48c', hair: '#141414', build: 'lean' }),
  F('duval', 'Etienne Duval', 'The Sommelier', 2.2, 3, 3, [14, 7, 6], { trunks: '#7a1424', gloves: '#7a1424', skin: '#ecc6a2', hair: '#2e2018', build: 'tall' }),
  F('kowalski', 'Walt Kowalski', 'Brick', 1.6, 3, 5, [10, 10, 2], { trunks: '#b8482a', gloves: '#2a2a30', skin: '#f4d4b4', hair: '#8a8a90', build: 'stocky' }),
  F('reyes', 'Inez Reyes', 'Cold Open', 3.4, 5, 2, [20, 3, 17], { trunks: '#4fe8ff', gloves: '#14182a', skin: '#c08654', hair: '#141414', build: 'lean' }),
  F('moss', 'Calvin Moss', 'Rent Due', 2.6, 3, 3, [16, 6, 7], { trunks: '#2a9a3a', gloves: '#f2c84a', skin: '#8d5a3b', hair: '#141414', build: 'tall' }),
]

export interface Bout {
  a: Fighter
  b: Fighter
  /** The headliner has the last slot. */
  main: boolean
}

/** The card for one evening: three bouts between six different fighters, never a mismatch past three to one. */
export function drawCard(rng: Rng): Bout[] {
  for (let attempt = 0; attempt < 200; attempt++) {
    const pool = [...ROSTER]
    const six: Fighter[] = []
    while (six.length < BOUTS * 2) six.push(pool.splice(Math.floor(rng() * pool.length), 1)[0])
    const ok = [0, 2, 4].every((i) => Math.max(six[i].strength, six[i + 1].strength) / Math.min(six[i].strength, six[i + 1].strength) <= 3)
    if (!ok) continue
    return [0, 2, 4].map((i, n) => ({ a: six[i], b: six[i + 1], main: n === BOUTS - 1 }))
  }
  const six = ROSTER.slice(0, 6)
  return [0, 2, 4].map((i, n) => ({ a: six[i], b: six[i + 1], main: n === BOUTS - 1 }))
}

/** A card is the same for everyone who is there on the same evening. */
export function cardFor(day: number, periodIndex: number): Bout[] {
  return drawCard(mulberry32(day * 977 + periodIndex * 131 + 7))
}

/** How often a win by `att` over `def` ends in a knockout. */
export function koRate(att: Fighter, def: Fighter): number {
  return Math.min(0.7, Math.max(0.08, 0.12 + 0.12 * (att.power - def.chin)))
}

export type BetKind = 'winA' | 'winB' | 'koA' | 'koB' | 'distance'

export interface BoutChances {
  winA: number
  winB: number
  koA: number
  koB: number
  distance: number
}

export function boutChances(bout: Bout): BoutChances {
  const { a, b } = bout
  const winA = a.strength / (a.strength + b.strength)
  const winB = 1 - winA
  const koA = winA * koRate(a, b)
  const koB = winB * koRate(b, a)
  return { winA, winB, koA, koB, distance: 1 - koA - koB }
}

export function returnPerDollar(chance: number): number {
  const fair = (1 - TAKEOUT) / chance
  return Math.max(MIN_RETURN, Math.floor(fair * 20) / 20)
}

export function payLabel(chance: number): string {
  return `x${returnPerDollar(chance).toFixed(2)}`
}

export type Method = 'ko' | 'decision'

export interface Result {
  winner: 'a' | 'b'
  method: Method
  /** The round a knockout comes in; the last round for a decision. */
  round: number
}

export function drawResult(bout: Bout, rng: Rng): Result {
  const c = boutChances(bout)
  const winner = rng() < c.winA ? 'a' : 'b'
  const att = winner === 'a' ? bout.a : bout.b
  const def = winner === 'a' ? bout.b : bout.a
  const ko = rng() < koRate(att, def)
  // Knockouts come early more often than late.
  const round = ko ? 1 + Math.min(ROUNDS - 1, Math.floor(Math.pow(rng(), 1.25) * ROUNDS)) : ROUNDS
  return { winner, method: ko ? 'ko' : 'decision', round }
}

export function betWins(kind: BetKind, r: Result): boolean {
  switch (kind) {
    case 'winA':
      return r.winner === 'a'
    case 'winB':
      return r.winner === 'b'
    case 'koA':
      return r.winner === 'a' && r.method === 'ko'
    case 'koB':
      return r.winner === 'b' && r.method === 'ko'
    case 'distance':
      return r.method === 'decision'
  }
}

export function settleBet(bout: Bout, kind: BetKind, stake: number, r: Result): { won: boolean; returned: number; net: number } {
  if (!betWins(kind, r)) return { won: false, returned: 0, net: -stake }
  const returned = Math.floor(stake * returnPerDollar(boutChances(bout)[kind]))
  return { won: true, returned, net: returned - stake }
}

// ---------------------------------------------------------------------------
// The fight you watch
// ---------------------------------------------------------------------------

export type Punch = 'jab' | 'cross' | 'hook' | 'uppercut' | 'body'
/** How a man stops a punch that does not land. */
export type Defense = 'block' | 'slip' | 'parry' | 'duck' | 'clinch'
/** What the man throwing it does with his feet first. */
export type Footwork = 'advance' | 'circle' | 'retreat' | 'hold'

export interface Exchange {
  /** Who throws it. */
  by: 'a' | 'b'
  /** The first punch thrown. */
  punch: Punch
  /** Follow-ups in a combination; the last punch of the string is the one that lands, if any does. */
  combo: Punch[]
  landed: boolean
  /** How the other man answers a miss. Only a miss has one. */
  defense?: Defense
  step: Footwork
  /** Health the one hit loses, out of 100. */
  damage: number
  /** The punch that ends it. */
  finisher?: boolean
  /** The hit puts the other man on the canvas; he is up again before the next. */
  knockdown?: boolean
  /** Thrown straight off a slip or a parry: a counter. */
  counter?: boolean
  /** A hit that lands where it says: the head or the body. */
  target?: 'head' | 'body'
  /** A heavy shot: the man feels it. */
  power?: boolean
  /** The hit rocks him: his legs go and the other man follows in. */
  stagger?: boolean
  /** The hit opens a cut. */
  cut?: boolean
}

export interface RoundPlan {
  exchanges: Exchange[]
}

/** One judge's card. */
export interface ScoreCard {
  judge: string
  /** Each round as [red, blue], on the ten-point must system. */
  rounds: Array<[number, number]>
  a: number
  b: number
}

export interface FightPlan {
  rounds: RoundPlan[]
  /** What each man has left at the end, out of 100. */
  endA: number
  endB: number
  /** The three judges' cards, over the rounds fought. */
  cards: ScoreCard[]
  /** How the fight was stopped if it was: counted out, or waved off by the referee. */
  stoppage?: 'ko' | 'tko'
}

const PUNCHES: Punch[] = ['jab', 'jab', 'jab', 'cross', 'cross', 'hook', 'hook', 'uppercut', 'body', 'body']
const DEFENSES: Defense[] = ['block', 'block', 'slip', 'slip', 'parry', 'duck', 'clinch']
const STEPS: Footwork[] = ['advance', 'advance', 'circle', 'circle', 'retreat', 'hold']
/** Exchanges in a round: about a quarter of a three-minute round, staged. */
export const PER_ROUND = 16

const pick = <T,>(items: T[], rng: Rng): T => items[Math.floor(rng() * items.length)]

export type FightStyle = 'slugger' | 'boxer' | 'swarmer' | 'counter'

/** How a man fights, from what he is: the hard hitters walk forward, the tall and the lean box from range. */
export function styleOf(f: Fighter): FightStyle {
  if (f.power >= 4 && f.chin <= 3) return 'slugger'
  if (f.build === 'stocky') return 'swarmer'
  if (f.build === 'lean' && f.power <= 3) return 'counter'
  return 'boxer'
}

/** Southpaw or orthodox, settled by the name so that it is the same man every night. */
export function southpaw(f: Fighter): boolean {
  let h = 0
  for (const ch of f.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h % 4 === 0
}

const JUDGES = ['J. Harlan', 'M. Okonkwo', 'P. Strand', 'L. Duarte', 'K. Ebert', 'R. Villanueva']

/**
 * Three cards on the ten-point must system: the round goes to whoever did the
 * damage, 10-9 and now and then 10-10 when it is too close to call, 10-8 when
 * there was a knockdown and 10-7 for two. Judges see rounds differently, so a
 * close fight can be split, but the winner is always on the winning end of at
 * least two cards, because the result was drawn first.
 */
export function scoreFight(rounds: RoundPlan[], winner: 'a' | 'b', method: Method, rng: Rng): ScoreCard[] {
  const per = rounds.map((r) => {
    let a = 0
    let b = 0
    let downsA = 0
    let downsB = 0
    for (const e of r.exchanges) {
      if (!e.landed) continue
      if (e.by === 'a') {
        a += e.damage
        if (e.knockdown) downsB++
      } else {
        b += e.damage
        if (e.knockdown) downsA++
      }
    }
    return { diff: a - b, downsA, downsB }
  })
  const names = [...JUDGES]
  const cards: ScoreCard[] = [0, 1, 2].map(() => {
    const judge = names.splice(Math.floor(rng() * names.length), 1)[0]
    const rs: Array<[number, number]> = per.map((p) => {
      const d = p.diff + (rng() - 0.5) * 9
      if (Math.abs(d) < 0.8 && rng() < 0.35) return [10, 10]
      const win = d > 0 ? 'a' : 'b'
      const downs = win === 'a' ? p.downsB : p.downsA
      const loserPts = downs >= 2 ? 7 : downs === 1 ? 8 : 9
      return win === 'a' ? [10, loserPts] : [loserPts, 10]
    })
    return { judge, rounds: rs, a: 0, b: 0 }
  })
  const total = (c: ScoreCard) => {
    c.a = c.rounds.reduce((s, r) => s + r[0], 0)
    c.b = c.rounds.reduce((s, r) => s + r[1], 0)
  }
  cards.forEach(total)
  if (method === 'decision') {
    const ours = (c: ScoreCard) => (winner === 'a' ? c.a - c.b : c.b - c.a)
    // Pull the cards the right way, turning the closest round in the loser's favour, until two of three agree with the result.
    for (let pass = 0; pass < 12 && cards.filter((c) => ours(c) > 0).length < 2; pass++) {
      const c = [...cards].filter((x) => ours(x) <= 0).sort((x, y) => ours(y) - ours(x))[0]
      const idx = c.rounds.findIndex((r) => (winner === 'a' ? r[0] <= r[1] : r[1] <= r[0]))
      if (idx < 0) break
      c.rounds[idx] = winner === 'a' ? [10, 9] : [9, 10]
      total(c)
    }
  }
  return cards
}

/**
 * A fight that fits the result: the winner lands the better punches, a knockout
 * ends on a landed hook in its round, and a decision leaves both men standing
 * with the winner less hurt. Along the way there is footwork, combinations,
 * blocks, slips and clinches for a miss, counters off the slips, the body shots
 * that slow a man down, a man rocked and followed in on, and now and then a
 * knockdown — usually of the loser, occasionally of the winner, who gets up.
 */
export function planFight(result: Result, rng: Rng): FightPlan {
  const win = result.winner
  const lose = win === 'a' ? 'b' : 'a'
  const roundsRun = result.method === 'ko' ? result.round : ROUNDS
  const total = roundsRun * PER_ROUND
  const ex: Exchange[] = []
  // Some rounds belong to the loser: a man who is going to lose can still have his good three minutes.
  const bias = Array.from({ length: roundsRun }, () => 0.62 + (rng() - 0.5) * 0.36)
  for (let i = 0; i < total; i++) {
    const byWinner = rng() < bias[Math.floor(i / PER_ROUND)]
    const landed = rng() < (byWinner ? 0.66 : 0.42)
    const comboLen = rng() < 0.3 ? 1 + Math.floor(rng() * 2) : 0
    ex.push({
      by: byWinner ? win : lose,
      punch: pick(PUNCHES, rng),
      combo: Array.from({ length: comboLen }, () => pick(PUNCHES, rng)),
      landed,
      defense: landed ? undefined : pick(DEFENSES, rng),
      step: pick(STEPS, rng),
      damage: 0,
    })
  }
  // A counter: the man who slipped or parried answers straight away.
  for (let i = 1; i < total - 1; i++) {
    const prev = ex[i - 1]
    if (!prev.landed && (prev.defense === 'slip' || prev.defense === 'parry' || prev.defense === 'duck') && rng() < 0.55) {
      const e = ex[i]
      e.by = prev.by === 'a' ? 'b' : 'a'
      e.counter = true
      e.punch = prev.defense === 'duck' ? pick(['body', 'hook', 'uppercut'], rng) : pick(['cross', 'hook', 'jab'], rng)
      e.combo = []
      if (!e.landed && rng() < 0.55) {
        e.landed = true
        e.defense = undefined
      }
    }
  }
  const landedBy = (by: 'a' | 'b') => ex.filter((e) => e.by === by && e.landed)
  const land = (e: Exchange) => {
    e.landed = true
    e.defense = undefined
  }
  const ensure = (by: 'a' | 'b', n: number) => {
    let have = landedBy(by).length
    for (const e of ex) {
      if (have >= n) break
      if (e.finisher) continue
      if (e.by === by && !e.landed) {
        land(e)
        have++
      }
    }
    // A short fight with too few of their punches: hand them some of the other man's.
    for (const e of ex) {
      if (have >= n) break
      if (e.finisher || e.by === by) continue
      e.by = by
      land(e)
      have++
    }
  }
  ensure(win, 4)
  let stoppage: FightPlan['stoppage']
  if (result.method === 'ko') {
    const end = ex[ex.length - 1]
    end.by = win
    land(end)
    end.punch = rng() < 0.5 ? 'hook' : 'uppercut'
    end.combo = []
    end.finisher = true
    end.counter = false
    stoppage = rng() < 0.4 ? 'tko' : 'ko'
  }
  ensure(lose, 2)

  const loserLeft = result.method === 'ko' ? 0 : 12 + Math.floor(rng() * 24)
  const winnerLeft = Math.max(loserLeft + 12, 40 + Math.floor(rng() * 45))
  const spend = (by: 'a' | 'b', amount: number) => {
    // A man cannot land more punches than he has damage to give: the surplus are blocked or missed.
    let hits = landedBy(by)
    while (hits.length > amount) {
      const spare = hits.filter((h) => !h.finisher)
      const e = spare[Math.floor(rng() * spare.length)]
      e.landed = false
      e.defense = pick(DEFENSES, rng)
      hits = landedBy(by)
    }
    let remaining = amount
    hits.forEach((h, i) => {
      const weights = hits.length - i
      const share = i === hits.length - 1 ? remaining : Math.round((remaining / weights) * (0.75 + rng() * 0.5))
      h.damage = Math.max(1, Math.min(remaining, share))
      remaining -= h.damage
    })
  }
  spend(win, 100 - loserLeft)
  spend(lose, 100 - winnerLeft)

  // Where the hits land, and which of them are heavy, rock a man or open a cut.
  const cutDone = { a: false, b: false }
  ex.forEach((e, i) => {
    if (!e.landed) return
    e.target = e.punch === 'body' || (e.combo.length === 0 && e.punch === 'hook' && rng() < 0.12) ? 'body' : 'head'
    if (!e.combo.length && e.target === 'body') e.punch = 'body'
    const hurt = e.by === win ? 100 - loserLeft : 100 - winnerLeft
    const avg = hurt / Math.max(1, landedBy(e.by).length)
    e.power = e.damage >= Math.max(3, avg * 1.2)
    if (e.power && !e.finisher && e.target === 'head' && i < total - 2 && rng() < 0.7) e.stagger = true
    const victim = e.by === 'a' ? 'b' : 'a'
    if (e.power && e.target === 'head' && !cutDone[victim] && i >= PER_ROUND && !e.finisher && rng() < 0.35) {
      e.cut = true
      cutDone[victim] = true
    }
  })

  // A knockdown in some fights: a heavy shot past the first round. Mostly the winner's, sometimes the loser's.
  const downBy = rng() < 0.15 ? lose : win
  if (rng() < 0.3) {
    const candidates = ex.filter((e, i) => e.by === downBy && e.landed && !e.finisher && i >= PER_ROUND && i < ex.length - 3 && e.damage >= 4)
    if (candidates.length > 0) {
      const e = pick(candidates, rng)
      e.knockdown = true
      e.power = true
      e.target = 'head'
      e.stagger = false
    }
  }

  const rounds: RoundPlan[] = []
  for (let r = 0; r < roundsRun; r++) rounds.push({ exchanges: ex.slice(r * PER_ROUND, (r + 1) * PER_ROUND) })
  return { rounds, endA: win === 'a' ? winnerLeft : loserLeft, endB: win === 'a' ? loserLeft : winnerLeft, cards: scoreFight(rounds, win, result.method, rng), stoppage }
}

/** The fighter's record as it reads on the poster. */
export function recordOf(f: Fighter): string {
  return `${f.wins}-${f.losses}, ${f.kos} KO`
}

/** The cards in the announcer's words: "58-56, 57-57, 59-55". */
export function readCards(cards: ScoreCard[], winner: 'a' | 'b'): string {
  return cards.map((c) => (winner === 'a' ? `${c.a}-${c.b}` : `${c.b}-${c.a}`)).join(', ')
}

/** A line the ring announcer reads, for the result. */
export function verdict(bout: Bout, r: Result, plan?: FightPlan): string {
  const w = r.winner === 'a' ? bout.a : bout.b
  if (r.method === 'ko') return `${w.name} wins by ${plan?.stoppage === 'tko' ? 'TKO' : 'knockout'} in round ${r.round}.`
  if (!plan) return `${w.name} wins on the judges’ cards after ${ROUNDS}.`
  const votes = plan.cards.filter((c) => (r.winner === 'a' ? c.a > c.b : c.b > c.a)).length
  return `${w.name} wins by ${votes === 3 ? 'unanimous' : 'split'} decision: ${readCards(plan.cards, r.winner)}.`
}
