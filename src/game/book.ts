import type { HandResult } from '../engine/table'
import type { TellKind } from '../engine/types'
import type { ActionKind } from './actionTag'

/**
 * The Book of Reads: what you have actually seen each opponent do.
 *
 * Nothing here is told to the player. Every number is a count of something that
 * happened in front of them, so the page is a notebook they would have kept
 * themselves — and because each named opponent has their own tells (`Habit`),
 * what it says about Mack says nothing about Deb.
 */

/** What happened after a cue was on show: did they go on to win the showdown? */
export interface CueRecord {
  won: number
  lost: number
}

export interface OpponentNotes {
  /** Sittings you have shared a table with them. */
  sittings: number
  hands: number
  /** Their decisions, and how many of them were a bet or raise / a fold. */
  decisions: number
  aggressive: number
  folds: number
  /** Cues seen before a showdown, and how that showdown went for them. */
  cues: Partial<Record<TellKind, CueRecord>>
  /** Pots they won that you were in. */
  tookFromYou: number
  /** Pots you won that they were in. */
  youTook: number
  /** Times they folded after you had bet or raised. */
  foldedToYou: number
  /** The last big pot between you, and who took it. */
  lastBigPot?: 'you' | 'them'
}

export type Book = Record<string, OpponentNotes>

export const emptyNotes = (): OpponentNotes => ({
  sittings: 0,
  hands: 0,
  decisions: 0,
  aggressive: 0,
  folds: 0,
  cues: {},
  tookFromYou: 0,
  youTook: 0,
  foldedToYou: 0,
})

/** A pot is big when it is this many big blinds: enough to remember. */
export const BIG_POT_BLINDS = 20

/** Folds the session's notes into the saved book. */
export function mergeBook(book: Book, session: Book): Book {
  const next: Book = { ...book }
  for (const [id, add] of Object.entries(session)) {
    const had = next[id] ?? emptyNotes()
    const cues: OpponentNotes['cues'] = { ...had.cues }
    for (const [kind, record] of Object.entries(add.cues) as [TellKind, CueRecord][]) {
      const before = cues[kind] ?? { won: 0, lost: 0 }
      cues[kind] = { won: before.won + record.won, lost: before.lost + record.lost }
    }
    next[id] = {
      sittings: had.sittings + add.sittings,
      hands: had.hands + add.hands,
      decisions: had.decisions + add.decisions,
      aggressive: had.aggressive + add.aggressive,
      folds: had.folds + add.folds,
      cues,
      tookFromYou: had.tookFromYou + add.tookFromYou,
      youTook: had.youTook + add.youTook,
      foldedToYou: had.foldedToYou + add.foldedToYou,
      lastBigPot: add.lastBigPot ?? had.lastBigPot,
    }
  }
  return next
}

/** Old saves have no book; anything that is not one becomes empty. */
export function cleanBook(value: unknown): Book {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}
  const book: Book = {}
  for (const [id, raw] of Object.entries(value as Record<string, Partial<OpponentNotes>>)) {
    if (typeof raw !== 'object' || raw === null) continue
    const base = emptyNotes()
    const count = (n: unknown, fallback: number) => (typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : fallback)
    book[id] = {
      sittings: count(raw.sittings, base.sittings),
      hands: count(raw.hands, base.hands),
      decisions: count(raw.decisions, base.decisions),
      aggressive: count(raw.aggressive, base.aggressive),
      folds: count(raw.folds, base.folds),
      cues: typeof raw.cues === 'object' && raw.cues !== null ? raw.cues : {},
      tookFromYou: count(raw.tookFromYou, base.tookFromYou),
      youTook: count(raw.youTook, base.youTook),
      foldedToYou: count(raw.foldedToYou, base.foldedToYou),
      lastBigPot: raw.lastBigPot === 'you' || raw.lastBigPot === 'them' ? raw.lastBigPot : undefined,
    }
  }
  return book
}

const AGGRESSIVE: ActionKind[] = ['bet', 'raise', 'allin']

/**
 * Watches one sitting and counts what it sees. Fed by the table scene, one
 * event at a time; it holds no references to the engine so it can be tested
 * with plain values.
 */
export class SessionTracker {
  private notes: Book = {}
  private handCues = new Map<string, Set<TellKind>>()
  private youAggressed = false
  private foldedAfterYou = new Set<string>()
  private inHand = new Set<string>()
  private yours = { decisions: 0, aggressive: 0 }

  private bigBlind: number

  constructor(bigBlind: number) {
    this.bigBlind = bigBlind
  }

  /** The blinds change in a tournament. */
  setBigBlind(bigBlind: number): void {
    this.bigBlind = bigBlind
  }

  private of(id: string): OpponentNotes {
    return (this.notes[id] ??= emptyNotes())
  }

  /** Somebody at the table this sitting: counts once, however many hands. */
  seat(id: string): void {
    if (this.notes[id]) return
    this.of(id).sittings = 1
  }

  startHand(opponentIds: string[]): void {
    this.handCues.clear()
    this.foldedAfterYou.clear()
    this.youAggressed = false
    this.inHand = new Set(opponentIds)
    for (const id of opponentIds) {
      this.seat(id)
      this.of(id).hands += 1
    }
  }

  /** Somebody acts. `you` is only tracked to know when to count a fold to you. */
  action(id: string, kind: ActionKind): void {
    if (id === 'you') {
      this.yours.decisions += 1
      if (AGGRESSIVE.includes(kind)) {
        this.youAggressed = true
        this.yours.aggressive += 1
      }
      return
    }
    const notes = this.of(id)
    notes.decisions += 1
    if (AGGRESSIVE.includes(kind)) notes.aggressive += 1
    if (kind === 'fold') {
      notes.folds += 1
      if (this.youAggressed) this.foldedAfterYou.add(id)
    }
  }

  /** A cue is on somebody's face right now. */
  tell(id: string, kind: TellKind): void {
    const kinds = this.handCues.get(id) ?? new Set<TellKind>()
    kinds.add(kind)
    this.handCues.set(id, kinds)
  }

  /** The hand is over: settle what the cues turned out to mean. */
  endHand(result: HandResult): void {
    const real = result.pots.filter((pot) => !pot.uncalled)
    const won = (id: string) => real.some((pot) => pot.winnerIds.includes(id))
    const youWon = won('you')
    const showdown = new Set(result.revealed.map((r) => r.playerId))

    for (const [id, kinds] of this.handCues) {
      // A cue only means something once the cards are turned over.
      if (!showdown.has(id)) continue
      const notes = this.of(id)
      for (const kind of kinds) {
        const record = (notes.cues[kind] ??= { won: 0, lost: 0 })
        if (won(id)) record.won += 1
        else record.lost += 1
      }
    }

    for (const id of this.inHand) {
      const notes = this.of(id)
      const contested = real.filter((pot) => pot.eligiblePlayerIds.includes('you') && pot.eligiblePlayerIds.includes(id))
      for (const pot of contested) {
        const big = pot.amount >= this.bigBlind * BIG_POT_BLINDS
        if (pot.winnerIds.includes('you') && !pot.winnerIds.includes(id)) {
          notes.youTook += 1
          if (big) notes.lastBigPot = 'you'
        } else if (pot.winnerIds.includes(id) && !pot.winnerIds.includes('you')) {
          notes.tookFromYou += 1
          if (big) notes.lastBigPot = 'them'
        }
      }
      if (youWon && this.foldedAfterYou.has(id)) notes.foldedToYou += 1
    }
  }

  /**
   * How you have been playing this sitting: your share of bets and raises, once
   * there are enough decisions to say. Bosses who read you use it.
   */
  youAggression(): number | null {
    return this.yours.decisions < 10 ? null : this.yours.aggressive / this.yours.decisions
  }

  /** What has been seen so far, for the book and for the table's own memory. */
  snapshot(): Book {
    return this.notes
  }

  notesOn(id: string): OpponentNotes | undefined {
    return this.notes[id]
  }
}

/** How a cue has panned out, as a player would read it off their own notes. */
export type CueVerdict = 'strong' | 'weak' | 'unclear' | 'unknown'

/** Showdowns before the book will commit to a reading. */
export const CUE_SAMPLES = 3

export function cueVerdict(record: CueRecord | undefined): CueVerdict {
  if (!record) return 'unknown'
  const total = record.won + record.lost
  if (total < CUE_SAMPLES) return 'unknown'
  const share = record.won / total
  if (share >= 0.7) return 'strong'
  if (share <= 0.35) return 'weak'
  return 'unclear'
}

/** How they play, in a word, once there are enough decisions to say. */
export function styleOf(notes: OpponentNotes): { label: string; aggression: number; folding: number } | null {
  if (notes.decisions < 12) return null
  const aggression = notes.aggressive / notes.decisions
  const folding = notes.folds / notes.decisions
  const label =
    aggression >= 0.38 ? 'Bets and raises a lot' : folding >= 0.45 ? 'Folds more often than not' : aggression <= 0.12 ? 'Rarely raises' : 'Plays it straight'
  return { label, aggression, folding }
}
