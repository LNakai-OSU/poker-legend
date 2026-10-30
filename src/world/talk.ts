/**
 * Who talks at a poker table, and how.
 *
 * Content, like a character's lines: `chatty` is how likely they are to say
 * something at any moment they could (0 is never, 1 is every time), and `mood`
 * picks the voice they say it in (`MOMENT_LINES`, src/game/tableTalk.ts). A
 * character with an entry of their own in `CHARACTERS[id].lines` still uses those
 * for the things they do (bet, fold, win); `chatty` governs how often.
 */
export type Mood = 'jolly' | 'grumpy' | 'dry' | 'nervous'

export interface Talk {
  chatty: number
  mood: Mood
}

/** Somebody nobody has described: says a word now and then, flatly. */
export const DEFAULT_TALK: Talk = { chatty: 0.2, mood: 'dry' }

const t = (chatty: number, mood: Mood): Talk => ({ chatty, mood })

export const TALK: Record<string, Talk> = {
  // The home game and the first floors.
  gus: t(0.95, 'jolly'), // talks through every hand
  pearl: t(0.25, 'dry'),
  omar: t(0.15, 'grumpy'),
  bette: t(0.8, 'jolly'),
  teo: t(0.5, 'nervous'),
  junie: t(0.35, 'dry'),
  marcus: t(0.6, 'nervous'),
  dana: t(0.1, 'dry'),
  ray: t(0.7, 'jolly'),
  sully: t(0.2, 'grumpy'),
  deb: t(0.55, 'grumpy'),
  mack: t(0.1, 'dry'),
  tiny: t(0.85, 'jolly'),
  corinne: t(0.2, 'dry'),
  vance: t(0.5, 'nervous'),
  hollis: t(0.6, 'grumpy'),
  // The houses and their owners.
  lou: t(0.7, 'jolly'),
  odette: t(0.3, 'dry'),
  bellamy: t(0.35, 'dry'),
  ines: t(0.5, 'jolly'),
  vale: t(0.05, 'dry'),
  delphine: t(0.3, 'dry'),
  otto: t(0.4, 'grumpy'),
  adaeze: t(0.1, 'dry'),
  kit: t(0.45, 'jolly'),
  rosa: t(0.8, 'jolly'),
  bernard: t(0.6, 'jolly'),
  lorna: t(0.1, 'dry'),
  dmitri: t(0, 'dry'), // silent
  whitaker: t(0.9, 'jolly'),
  saul: t(0.45, 'grumpy'),
  priya: t(0.15, 'dry'),
  august: t(0.5, 'jolly'),
  rhodes: t(0.3, 'jolly'),
  xue: t(0.2, 'dry'),
  marchetti: t(0, 'dry'), // never shows a hand, never says a word
  kingsley: t(0.7, 'jolly'),
  // The people who collect.
  cass: t(0.4, 'dry'),
  emeka: t(0.2, 'dry'),
  dutch: t(0.3, 'grumpy'),
  abel: t(0.2, 'dry'),
  lowe: t(0.7, 'grumpy'),
  fong: t(0.1, 'dry'),
  // The final table.
  dolores: t(0.85, 'jolly'),
  gaines: t(0.5, 'dry'),
  contessa: t(0.7, 'jolly'),
  zeke: t(0.9, 'jolly'),
  nadia: t(0.3, 'dry'),
}

export const talkOf = (id: string): Talk => TALK[id] ?? DEFAULT_TALK
