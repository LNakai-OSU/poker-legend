import { CHARACTERS } from '../world/characters'
import type { TellKind } from '../engine/types'
import { cueVerdict, styleOf, type Book, type CueVerdict } from './book'
import { tellCue } from './tellFlavor'

/** One opponent's page of the Book of Reads, as lines of text. */
export interface BookEntry {
  id: string
  name: string
  /** What the table card says about them, to remind you who this is. */
  blurb: string
  lines: { text: string; tone: 'plain' | 'good' | 'bad' | 'dim' }[]
}

const VERDICT_TEXT: Record<CueVerdict, { text: string; tone: 'plain' | 'good' | 'bad' | 'dim' }> = {
  strong: { text: 'looks like a strong hand', tone: 'good' },
  weak: { text: 'looks like a weak one', tone: 'bad' },
  unclear: { text: 'means nothing yet', tone: 'plain' },
  unknown: { text: 'too early to say', tone: 'dim' },
}

const CUE_ORDER: TellKind[] = ['chip-tap', 'stillness', 'arm-shift', 'lip-twitch', 'glance']

/**
 * What the book says, most-met first. Only people you have dealt in with are
 * here, and a cue only appears once you have seen it at a showdown.
 */
export function bookEntries(book: Book): BookEntry[] {
  return Object.entries(book)
    .filter(([id, notes]) => notes.hands > 0 && CHARACTERS[id])
    .sort(([, a], [, b]) => b.hands - a.hands)
    .map(([id, notes]) => {
      const lines: BookEntry['lines'] = []
      const style = styleOf(notes)
      lines.push(
        style
          ? { text: `${style.label}: ${Math.round(style.aggression * 100)}% of their moves are bets or raises, ${Math.round(style.folding * 100)}% folds.`, tone: 'plain' }
          : { text: `${notes.hands} hand${notes.hands === 1 ? '' : 's'} so far. Not enough to say how they play.`, tone: 'dim' },
      )
      for (const kind of CUE_ORDER) {
        const record = notes.cues[kind]
        if (!record) continue
        const shown = record.won + record.lost
        const verdict = VERDICT_TEXT[cueVerdict(record)]
        const cue = tellCue({ playerId: id, kind, visibility: 1, meansStrongHand: true })
        lines.push({ text: `${cue}: ${shown} showdown${shown === 1 ? '' : 's'}, they won ${record.won}. ${verdict.text[0].toUpperCase()}${verdict.text.slice(1)}.`, tone: verdict.tone })
      }
      if (!CUE_ORDER.some((kind) => notes.cues[kind])) lines.push({ text: 'No cue seen at a showdown yet. Watch their face, then see what they turn over.', tone: 'dim' })
      if (notes.youTook + notes.tookFromYou > 0) {
        lines.push({ text: `Pots between you: you took ${notes.youTook}, they took ${notes.tookFromYou}.`, tone: 'plain' })
      }
      if (notes.foldedToYou >= 3) lines.push({ text: `Folded to your bets ${notes.foldedToYou} times.`, tone: 'good' })
      return { id, name: CHARACTERS[id].name, blurb: CHARACTERS[id].style, lines }
    })
}
