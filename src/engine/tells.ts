import { estimateEquity } from './ai'
import type { Rng } from './rng'
import type { Archetype, Card, SkillTier, TellSignal } from './types'

/**
 * The cue vocabulary is split, so the cue itself is the signal: a player who
 * pays attention can learn that a chip-tap or a sudden freeze means strength,
 * while fidgeting means weakness. Without this split `kind` was picked
 * uniformly and reads were pure noise — nothing to learn, and the "Spotting
 * Tells" lesson bought only a CSS opacity change.
 */
export const STRONG_TELL_KINDS: TellSignal['kind'][] = ['chip-tap', 'stillness']
export const WEAK_TELL_KINDS: TellSignal['kind'][] = ['arm-shift', 'lip-twitch', 'glance']

/**
 * Chance a tell is noticeable at all this street, by opponent skill.
 *
 * This is the main lever for "tells get subtler as players get better": a sharp or
 * elite opponent gives away almost nothing. These numbers used to be far higher —
 * 0.85 for a novice — which put a cue on screen for 99% of hands and 1.9 of every
 * 3 seats. A read that is always there is not a read; it is wallpaper. The lesson
 * that teaches this mechanic says it itself: "a tell is a change, not a
 * behaviour".
 */
const TELL_FREQUENCY: Record<SkillTier, number> = {
  novice: 0.32,
  amateur: 0.22,
  competent: 0.13,
  sharp: 0.06,
  elite: 0.02,
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

/**
 * How far from an even share of the pot a holding has to be before it is worth
 * leaking anything about.
 *
 * A tell is a reaction to feeling good or bad about a hand, and nobody reacts to a
 * hand they feel nothing about. Gating on this is what makes a cue informative:
 * previously strength was "better than 55% heads-up", so at a four-handed table
 * almost every hand qualified as strong and the cue separated a pair-or-better
 * 97% of the time from 82% — a difference no player could use.
 */
const POLARISATION_BAND = 0.12

/** A whale broadcasts honestly no matter what the stakes are. */
const WHALE_FREQUENCY = 0.5
const WHALE_DECEPTION_CHANCE = 0.02

/**
 * Rolls whether an opponent gives off a readable tell right now, and if so,
 * whether it correlates truthfully with their actual hand strength.
 *
 * Returns null when nothing is noticeable — which is now the common case for
 * everybody, not just skilled players.
 */
export function generateTell(
  playerId: string,
  holeCards: Card[],
  board: Card[],
  skillTier: SkillTier,
  rng: Rng,
  archetype: Archetype = 'regular',
  /**
   * Live opponents the hand is actually against. Equity was always computed
   * against exactly one, so a holding that is 56% heads-up — and about 28%
   * against three — was labelled strong at a four-handed table.
   */
  opponentsInHand = 1,
): TellSignal | null {
  const isWhale = archetype === 'whale'
  const frequency = isWhale ? WHALE_FREQUENCY : TELL_FREQUENCY[skillTier]
  const deception = isWhale ? WHALE_DECEPTION_CHANCE : TELL_DECEPTION_CHANCE[skillTier]
  if (rng() > frequency) return null

  const opponents = Math.max(1, opponentsInHand)
  const equity = estimateEquity(holeCards, board, opponents, rng, 60)
  // An even share of the pot is the only sensible yardstick once more than one
  // opponent is in: beating a third of the field is not a strong hand three-handed.
  const evenShare = 1 / (opponents + 1)

  // Nothing to react to, so nothing leaks.
  if (Math.abs(equity - evenShare) < POLARISATION_BAND) return null

  let meansStrongHand = equity > evenShare
  if (rng() < deception) meansStrongHand = !meansStrongHand

  // Picked *after* the deception flip, so a false read shows the cue of the
  // hand strength it is pretending to have — which is exactly what makes a
  // better player unreliable to read rather than simply unreadable.
  const kinds = meansStrongHand ? STRONG_TELL_KINDS : WEAK_TELL_KINDS
  const kind = kinds[Math.floor(rng() * kinds.length)]
  // How far the hand is from neutral also drives how hard it is to hide, so a
  // monster or a complete airball leaks more than a marginal holding.
  const polarisation = Math.min(1, Math.abs(equity - evenShare) / 0.4)
  const visibility = Math.min(1, (0.45 + polarisation * 0.55) * (0.6 + rng() * 0.4))

  return { playerId, visibility, meansStrongHand, kind }
}
