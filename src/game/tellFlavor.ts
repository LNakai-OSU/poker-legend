import type { TellSignal } from '../engine/types'

/**
 * What the player actually sees. Deliberately describes only the observable
 * cue — never whether it means strength or weakness. Working that out is the
 * whole point of the mechanic: which cue appears is driven by the opponent's
 * hand (see STRONG_TELL_KINDS / WEAK_TELL_KINDS in engine/tells), so these
 * strings must stay neutral or they would give the read away for free.
 */
export const TELL_FLAVOR_TEXT: Record<TellSignal['kind'], string> = {
  'arm-shift': 'shifts in their seat',
  'lip-twitch': "'s lip twitches",
  glance: 'glances at their chips',
  stillness: 'goes very still',
  'chip-tap': 'taps the felt',
}

export function tellText(name: string, tell: TellSignal): string {
  const flavor = TELL_FLAVOR_TEXT[tell.kind]
  return flavor.startsWith("'") ? `${name}${flavor}` : `${name} ${flavor}`
}
