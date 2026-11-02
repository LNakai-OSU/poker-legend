import type { EventCondition } from './events'

/**
 * What the people at a table say because of what you did for the town.
 *
 * A hint is a line a seated character says once per sitting, at a card coming
 * down or the end of a hand (so a fold before the flop does not skip it), when
 * its conditions hold: an errand's flag, an errand paid. One is said per moment,
 * so a second-tier hint turns up a hand later. It is flavour; nothing here
 * changes odds or how anyone plays. A *perk* (below) is the one thing that does
 * anything, and all it does is make your reading easier. `tableHints.test.ts` checks each speaker is really seated at the table.
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
    lines: ['(He tugs his left cuff, and you see it as plain as a flag.) Hm. I might fold.'],
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
  // A second hint at the same tables, a hand later.
  {
    id: 'hollis-cuff-talk',
    tableId: 'crescent-main',
    speaker: 'hollis',
    when: [{ kind: 'flag', flag: 'errandSawTheTell' }],
    lines: ['The whole room knows Vance folds when his cuff moves. We pretend not to. It is more polite.'],
  },
  {
    id: 'bette-fishmonger',
    tableId: 'crescent-main',
    speaker: 'bette',
    when: [paid('errand-odalys')],
    lines: ['Hal’s first student sells mackerel off the pier now. The pot-odds napkin is her best work. I have never been so envious of a fish.'],
  },
  {
    id: 'tiny-flowers',
    tableId: 'riverbend-mid',
    speaker: 'tiny',
    when: [{ kind: 'flag', flag: 'errandDutchTold' }],
    lines: ['I tip like I do not know what money is. But even I would not send an old woman lemon sponge and a collector.'],
  },
  {
    id: 'gus-ring',
    tableId: 'riverbend-mid',
    speaker: 'gus',
    when: [paid('errand-cornelius')],
    lines: ['Cornelius got his ring back off Big Betty. Never bet what you love. I say it at the table and then I bet it anyway.'],
  },
  {
    id: 'sully-brad',
    tableId: 'silvercreek-low',
    speaker: 'sully',
    when: [paid('errand-wendell')],
    lines: ['A man called Brad has taken the buffet. He wears a Groucho moustache. Nobody has the heart to ask.'],
  },
  {
    id: 'ray-casserole',
    tableId: 'silvercreek-low',
    speaker: 'ray',
    when: [paid('errand-loretta')],
    lines: ['Somebody brought me a casserole. Tuna. I ate it with one hand. I folded with the other. I am due, you know.'],
  },
  {
    id: 'adaeze-dinghy',
    tableId: 'palmcay-high',
    speaker: 'adaeze',
    when: [paid('errand-pruitt')],
    lines: ['There is a commodore of nothing on the dock, and a woman with a basket of pears. The marina says it is a siege.'],
  },
  {
    id: 'rosa-wedding',
    tableId: 'palmcay-tourist',
    speaker: 'rosa',
    when: [paid('errand-chad')],
    lines: ['A sunburned man and his wife are renewing their vows on Thursday. Bernard says it is Thursday. For once he may be right.'],
  },
  {
    id: 'teo-vacancy',
    tableId: 'mesa-main',
    speaker: 'teo',
    when: [paid('errand-dee')],
    lines: ['The Starlite sign came on last night. Pink. VACANCY. Half the Strip went quiet to look at it.'],
  },
  {
    id: 'whitaker-clip',
    tableId: 'mesa-main',
    speaker: 'whitaker',
    when: [{ kind: 'flag', flag: 'errandObjected' }],
    lines: ['The objection clip has forty thousand views. The couple are not divorced yet. The chat has a pool.'],
  },
  {
    id: 'kingsley-guard',
    tableId: 'lumina-nosebleed',
    speaker: 'kingsley',
    when: [paid('errand-fong')],
    lines: ['Madame Wen’s collector has a greyhound she does not mention. I have never seen Ms. Fong so soft. I am afraid for us all.'],
  },
  {
    id: 'zeke-chip',
    tableId: 'lumina-finale',
    speaker: 'zeke',
    when: [{ kind: 'flag', flag: 'errandTeodoroChip' }],
    lines: ['Chat, the champ is looking at a chip with a nick in it. Eleven thousand of you and not one knows why. I do not either.'],
  },
  {
    id: 'hollis-tilt',
    tableId: 'crescent-main',
    speaker: 'omar',
    when: [{ kind: 'flag', flag: 'errandCoachRead' }],
    lines: ['Hollis is on his third buy-in. The coach says a rebuy makes a man looser, and the coach is right. Look at him.'],
  },
  {
    id: 'bernard-collar',
    tableId: 'palmcay-tourist',
    speaker: 'rosa',
    when: [{ kind: 'flag', flag: 'errandSpotTell' }],
    lines: ['Bernard rubs his collar when he is bluffing. I only say so because you were watching him from the roulette.'],
  },
  {
    id: 'pearl-odds',
    tableId: 'riverbend-mid',
    speaker: 'pearl',
    when: [{ kind: 'flag', flag: 'errandQuizRight' }],
    lines: ['A hundred in the pot and fifty to call is three to one. Wick told you. I heard it from the river.'],
  },
]

/**
 * The one thing an errand's outcome does at a table: what you saw makes the tell
 * easier to see, as an owned item or a night's rest does, and only at these
 * tables. It does not touch odds or how anyone plays.
 */
export interface TablePerk {
  id: string
  tableIds: string[]
  when: EventCondition[]
  /** Added to how clearly a tell shows (items give 0.1-0.2). */
  tellClarity: number
}

export const TABLE_PERKS: TablePerk[] = [
  { id: 'vance-cuff', tableIds: ['crescent-main', 'crescent-headsup'], when: [{ kind: 'flag', flag: 'errandSawTheTell' }], tellClarity: 0.2 },
  { id: 'bernard-collar', tableIds: ['palmcay-tourist'], when: [{ kind: 'flag', flag: 'errandSpotTell' }], tellClarity: 0.15 },
]

/** How much clearer tells show at this table because of what you did for the town. */
export function perkClarity(tableId: string, holds: (c: EventCondition) => boolean): number {
  return TABLE_PERKS.filter((p) => p.tableIds.includes(tableId) && p.when.every(holds)).reduce((sum, p) => sum + p.tellClarity, 0)
}

