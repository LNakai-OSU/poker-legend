import type { TellSignal } from '../engine/types'

/**
 * What the player actually sees. Deliberately describes only the observable
 * cue — never whether it means strength or weakness. Working that out is the
 * whole point of the mechanic: which cue appears is driven by the opponent's
 * hand (see STRONG_TELL_KINDS / WEAK_TELL_KINDS in engine/tells), so these
 * strings must stay neutral or they would give the read away for free.
 *
 * They are also kept short. A tell is drawn under its own seat, and a seat on a
 * six-handed table is about as wide as its name plate — a sentence that does not
 * fit in two lines there is a sentence written across the next player's hand.
 *
 * Several phrasings per cue, so two opponents reacting on the same street do not
 * both produce the identical sentence. Every phrasing for a given cue has to
 * describe the *same* physical behaviour, because the cue is the signal: if one
 * wording for `stillness` read as agitation it would invert the read.
 */
export const TELL_FLAVOR_TEXT: Record<TellSignal['kind'], string[]> = {
  'arm-shift': [
    ' shifts in their seat',
    ' re-settles their arms',
    ' leans back a little',
    ' shifts their weight',
  ],
  'lip-twitch': [
    "'s lip twitches",
    "'s mouth tightens",
    ' presses their lips together',
    "'s jaw moves slightly",
  ],
  glance: [
    ' glances at their chips',
    ' looks at their stack, then up',
    ' checks their stack again',
    "'s eyes flick to their chips",
  ],
  stillness: [
    ' goes very still',
    ' stops moving entirely',
    ' has not moved at all',
    ' sits perfectly motionless',
  ],
  'chip-tap': [
    ' taps the felt',
    ' taps a chip on the table',
    ' drums a finger on the felt',
    ' rolls a chip in their fingers',
  ],
}

/**
 * A stable phrasing per player and cue, so the same opponent describes the same
 * behaviour the same way all session — that consistency is what a player learns —
 * while different opponents at the same table read differently.
 */
function phrasingIndex(playerId: string, kind: TellSignal['kind'], count: number): number {
  let hash = 0
  for (const char of `${playerId}:${kind}`) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0
  }
  return Math.abs(hash) % count
}

export function tellText(name: string, tell: TellSignal): string {
  const options = TELL_FLAVOR_TEXT[tell.kind]
  const flavor = options[phrasingIndex(tell.playerId, tell.kind, options.length)]
  return `${name}${flavor}`
}
