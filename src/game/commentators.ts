import type { AvatarLook, Expression } from './avatars'
import { drawPortrait } from './portraits'
import { Raster } from './pixel/raster'

/**
 * The two voices of the broadcast, drawn as the people at a table are: the same
 * 48 by 48 portraits, with a headset over the top of them.
 */

export type Commentator = 'chip' | 'anand'

export const COMMENTATORS: Record<Commentator, { name: string; tag: string; look: AvatarLook }> = {
  chip: {
    name: 'Chip Van Doren',
    tag: 'PLAY-BY-PLAY',
    look: { skin: '#f2cfa8', hair: '#d99a1e', hairStyle: 'short', shirt: '#c8402f', accessory: 'none' },
  },
  anand: {
    name: 'Dr. Priyanka Anand',
    tag: 'ANALYST',
    look: { skin: '#9a6a46', hair: '#14100e', hairStyle: 'tied', shirt: '#2a4a8a', accessory: 'glasses' },
  },
}

/** Which commentator a reel line belongs to, by the name it is written under. */
export function commentatorFor(who: string): Commentator | null {
  if (who === 'Chip') return 'chip'
  if (who === 'Dr. Anand') return 'anand'
  return null
}

const urls = new Map<string, string>()

/** A commentator's portrait, headset on, in an expression. Cached. */
export function commentatorUrl(who: Commentator, expression: Expression): string {
  const key = `${who}|${expression}`
  const hit = urls.get(key)
  if (hit) return hit
  const r: Raster = drawPortrait(COMMENTATORS[who].look, expression, `booth-${who}`)
  headset(r)
  const url = r.toDataURL()
  urls.set(key, url)
  return url
}

/** A band over the crown, a cup on each ear, and a boom curving round to the mouth. */
function headset(r: Raster) {
  const metal = '#2a2a34'
  const lit = '#5a5a6c'
  // The band: an arch from ear to ear over the top of the head.
  for (let x = 12; x <= 35; x++) {
    const arch = Math.round(7 + Math.pow((x - 23.5) / 11.5, 2) * 7)
    r.set(x, arch, metal)
    r.set(x, arch - 1, lit)
  }
  // The cups.
  r.rect(9, 20, 4, 8, metal)
  r.rect(10, 21, 2, 6, lit)
  r.rect(35, 20, 4, 8, metal)
  r.rect(36, 21, 2, 6, lit)
  // The boom, left side, down to the mouth.
  for (let i = 0; i < 7; i++) r.set(10 + i, 28 + Math.round(i * 0.9), metal)
  r.rect(15, 34, 3, 2, '#c82828')
}
