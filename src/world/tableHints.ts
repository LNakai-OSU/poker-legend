import type { EventCondition } from './events'

/**
 * What the people at a table say because of what you did for the town.
 *
 * A hint is a line a seated character says once per sitting, at the first card
 * that comes down, when its conditions hold: an errand's flag, an errand paid.
 * It is flavour and a tell at most; nothing here changes odds or how anyone
 * plays. `tableHints.test.ts` checks each speaker is really seated at the table.
 */
export interface TableHint {
  id: string
  tableId: string
  /** The character who says it. */
  speaker: string
  when: EventCondition[]
  /** One is chosen. Written as speech: the speaker's name is put in front. */
  lines: string[]
}

const paid = (errand: string): EventCondition => ({ kind: 'eventDone', eventId: `${errand}-done` })

export const TABLE_HINTS: TableHint[] = [
  {
    id: 'teodoro-chip-taken',
    tableId: 'lumina-finale',
    speaker: 'nadia',
    when: [{ kind: 'flag', flag: 'errandTeodoroChip' }],
    lines: ['That chip in your stack. Somebody cut a nick in its edge, a long time ago. Who sent it to you?'],
  },
  {
    id: 'teodoro-chip-left',
    tableId: 'lumina-finale',
    speaker: 'nadia',
    when: [paid('errand-teodoro'), { kind: 'flag', flag: 'errandTeodoroChip', set: false }],
    lines: ['You left your first chip on the felt. Somebody taught you that. I did not think anyone remembered.'],
  },
  {
    id: 'vance-cuff',
    tableId: 'crescent-main',
    speaker: 'vance',
    when: [{ kind: 'flag', flag: 'errandSawTheTell' }],
    lines: ['(He tugs his left cuff.) Hm. I might fold.'],
  },
  {
    id: 'vance-accordion',
    tableId: 'crescent-headsup',
    speaker: 'vance',
    when: [paid('errand-busker')],
    lines: ['I hear the accordion is home. The harbour is quieter for it. I fold to nothing, tonight.'],
  },
  {
    id: 'mack-cass-name',
    tableId: 'riverbend-mid',
    speaker: 'mack',
    when: [{ kind: 'flag', flag: 'errandSalBluffed' }],
    lines: ['Somebody has been dropping Cass’s name for chips. Not at this table, I hope. She has a long memory.'],
  },
  {
    id: 'deb-flowers',
    tableId: 'riverbend-mid',
    speaker: 'deb',
    when: [{ kind: 'flag', flag: 'errandDutchTold' }],
    lines: ['Cass sent Dutch’s mum flowers. Dutch has been gentle all week. It is unnatural, and I have a bet on how long.'],
  },
  {
    id: 'bernard-thursday',
    tableId: 'palmcay-tourist',
    speaker: 'bernard',
    when: [{ kind: 'flag', flag: 'errandBlamedBernard' }],
    lines: ['A woman with a rolling pin asked me whether it was Thursday. I said Friday. She stayed to see.'],
  },
  {
    id: 'xue-greyhound',
    tableId: 'lumina-nosebleed',
    speaker: 'xue',
    when: [paid('errand-fong')],
    lines: ['A greyhound went past Madame Wen’s gate this week, and the guard saluted. Nobody saw. I am told.'],
  },
  {
    id: 'lorna-objection',
    tableId: 'mesa-main',
    speaker: 'lorna',
    when: [{ kind: 'flag', flag: 'errandObjected' }],
    lines: ['Somebody objected at a wedding last night. Live. Eleven thousand watched. I would have objected earlier.'],
  },
]
