import { estimateEquity } from './ai'
import type { Rng } from './rng'
import type { Card, SkillTier, TellSignal } from './types'

const TELL_KINDS: TellSignal['kind'][] = ['arm-shift', 'lip-twitch', 'glance', 'stillness', 'chip-tap']

/** Chance a tell is noticeable at all this street, by opponent skill — this is
 * the main lever for "tells get subtler as players get better": a sharp or
 * elite opponent simply gives away almost nothing to read. */
const TELL_FREQUENCY: Record<SkillTier, number> = {
  novice: 0.85,
  amateur: 0.6,
  competent: 0.35,
  sharp: 0.15,
  elite: 0.04,
}

/** Chance a manifested tell is actually misleading, by opponent skill — better
 * players are more likely to give a false read (deliberately or not). */
const TELL_DECEPTION_CHANCE: Record<SkillTier, number> = {
  novice: 0.03,
  amateur: 0.08,
  competent: 0.15,
  sharp: 0.25,
  elite: 0.4,
}

const STRONG_HAND_EQUITY_THRESHOLD = 0.55

/**
 * Rolls whether an opponent gives off a readable tell right now, and if so,
 * whether it correlates truthfully with their actual hand strength. Returns
 * null when nothing is noticeable this street (the common case for skilled
 * players).
 */
export function generateTell(
  playerId: string,
  holeCards: Card[],
  board: Card[],
  skillTier: SkillTier,
  rng: Rng,
): TellSignal | null {
  if (rng() > TELL_FREQUENCY[skillTier]) return null

  const equity = estimateEquity(holeCards, board, 1, rng, 60)
  let meansStrongHand = equity > STRONG_HAND_EQUITY_THRESHOLD
  if (rng() < TELL_DECEPTION_CHANCE[skillTier]) meansStrongHand = !meansStrongHand

  const kind = TELL_KINDS[Math.floor(rng() * TELL_KINDS.length)]
  const visibility = TELL_FREQUENCY[skillTier] * (0.6 + rng() * 0.4)

  return { playerId, visibility, meansStrongHand, kind }
}
