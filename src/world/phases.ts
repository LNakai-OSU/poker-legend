import type { Archetype, Habit, SkillTier } from '../engine/types'

/**
 * A boss who changes during the match.
 *
 * A heads-up match against one fixed style is a puzzle you solve in ten hands
 * and then run over. These are the turns in the middle: a boss who has been
 * winning gets loose, one who is losing digs in, one who has been reading you
 * starts using it. Each is data on the boss's `seat`; the table applies them
 * between hands.
 *
 * Rule 2 holds: a phase changes *how they play* (their style, their skill, the
 * tell they give off), never the cards. Phases stack in list order, so a later
 * one overrides the fields it sets.
 */
export interface PlayPhase {
  /** All the conditions must hold. */
  when: PhaseWhen
  /** What changes about how they play while it holds. */
  set: { archetype?: Archetype; skillTier?: SkillTier; habit?: Habit }
  /** Said once, when the phase begins. */
  says?: string[]
  /** A line over the felt when it begins. */
  announce?: string
}

export interface PhaseWhen {
  /** Their stack, as a share of the one they sat down with. */
  stackBelow?: number
  stackAbove?: number
  /** Hands played in the match so far. */
  afterHand?: number
  /**
   * How often *you* have bet or raised, of your decisions this match (needs ten
   * of them before it means anything). They are reading you, and it shows.
   */
  youAggressionAbove?: number
  youAggressionBelow?: number
}

export interface PhaseContext {
  stackRatio: number
  /** Hands completed so far. */
  hands: number
  /** Your share of bets and raises this match, or null while there is too little to go on. */
  youAggression: number | null
}

export function phaseHolds(when: PhaseWhen, ctx: PhaseContext): boolean {
  if (when.stackBelow !== undefined && !(ctx.stackRatio < when.stackBelow)) return false
  if (when.stackAbove !== undefined && !(ctx.stackRatio > when.stackAbove)) return false
  if (when.afterHand !== undefined && !(ctx.hands >= when.afterHand)) return false
  if (when.youAggressionAbove !== undefined && !(ctx.youAggression !== null && ctx.youAggression > when.youAggressionAbove)) return false
  if (when.youAggressionBelow !== undefined && !(ctx.youAggression !== null && ctx.youAggression < when.youAggressionBelow)) return false
  return true
}

export interface ResolvedStyle {
  archetype?: Archetype
  skillTier: SkillTier
  habit?: Habit
  /** Which phases hold, by index. */
  active: number[]
}

/** How they play right now: their seat, with every phase that holds laid over it. */
export function resolveStyle(
  base: { archetype?: Archetype; skillTier: SkillTier; habit?: Habit },
  phases: PlayPhase[] | undefined,
  ctx: PhaseContext,
): ResolvedStyle {
  const style: ResolvedStyle = { archetype: base.archetype, skillTier: base.skillTier, habit: base.habit, active: [] }
  ;(phases ?? []).forEach((phase, i) => {
    if (!phaseHolds(phase.when, ctx)) return
    style.active.push(i)
    if (phase.set.archetype) style.archetype = phase.set.archetype
    if (phase.set.skillTier) style.skillTier = phase.set.skillTier
    if (phase.set.habit) style.habit = phase.set.habit
  })
  return style
}
