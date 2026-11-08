/**
 * The ending film, played once the heads-up match is won and before the
 * summary card. It is the whole of what follows the win, and it is a bummer on
 * purpose: you got the thing, and it cost the rest.
 *
 * Ten shots, drawn by `game/EndingFilm.tsx` — the stage after the last hand,
 * the montage of the rise and the vices it fed, the walk through the penthouse, the photo on the desk, the divorce papers,
 * the settlement statement, the phone, the window, the credits, and one more
 * thing after them. What is said, written and sent in them is here.
 *
 * Narration has no speaker. A line with `you: true` is the player's own, and a
 * line with `who` is somebody else's, shown under their name.
 */

export interface EndingLine {
  text: string
  you?: boolean
  /** Somebody else, named over the line. */
  who?: string
}

/** One row of the settlement statement. `held` rows are what the petition has frozen. */
export interface LedgerRow {
  label: string
  amount: number
}

/** One message in Marcus's thread. Nothing in it is ever from the player. */
export interface EndingMessage {
  /** The small stamp over it: a day, or "Missed call". */
  when: string
  text: string
  missedCall?: boolean
}

export interface EndingCredit {
  role: string
  name: string
}

export interface EndingFilm {
  /** The stage, the moment the last chip goes across. */
  stage: EndingLine[]
  /** The montage between the stage and the penthouse: the win, her, the money, the things, the nights, the fall. One line per panel. */
  montage: EndingLine[]
  /** The walk in. `stops` are the places along the room, in art pixels from the door, where a line holds you. */
  walk: { stops: { at: number; line: EndingLine }[] }
  photo: EndingLine[]
  papers: {
    lines: EndingLine[]
    court: string
    title: string
    body: string
    petitioner: string
    respondent: string
    stamp: string
  }
  ledger: {
    lines: EndingLine[]
    title: string
    subtitle: string
    prize: number
    /** Taken out of the prize, in order. */
    deductions: LedgerRow[]
    /** What is left is frozen by this much, as a fraction. */
    heldLabel: string
    heldShare: number
    footnote: string
  }
  phone: {
    contact: string
    unread: number
    thread: EndingMessage[]
    /** Each press lets the thread climb to `upTo` messages. */
    beats: { line: EndingLine; upTo: number }[]
  }
  window: EndingLine[]
  credits: { title: string; entries: EndingCredit[]; thanks: string[] }
  /** After the credits: the phone, at first light. */
  after: { contact: string; lines: EndingLine[] }
}

export const ENDING_FILM: EndingFilm = {
  stage: [
    { text: 'The river is a blank. Nadia turns her cards over, and that is the end of it.' },
    { text: 'Confetti. Ten seconds of a whole room on its feet. Marcus has both arms up. Dana, who never raises her voice, is shouting. Every one of them is cheering for the screen.' },
    { who: 'Chip', text: 'I HAVE NEVER SEEN ANYTHING LIKE IT IN MY LIFE! Dr. Anand has stopped doing the maths and is just holding the desk.' },
    { who: 'Nadia', text: "Don't make that face. I wore that chair for six years. Wait until you see how quiet the lift is." },
    { text: 'The cameras follow her out. The feed cuts to an advert for a bank. You are still standing at the table.' },
    { text: 'Somebody is already sweeping the confetti. Nobody on the rail came over the ropes.' },
  ],
  montage: [
    { text: 'You lift the trophy. It is heavier than it looks, and for one night nobody in the building is lying about what you are.' },
    { text: 'That autumn you meet her. She says you tilt your head when you bluff. You marry her anyway.' },
    { text: 'The money arrives as a number you have to say twice. Then the sponsors send flowers, and then contracts.' },
    { text: 'A car with no roof. A boat. A house on the hill, and a watch that cost more than the flat above the bakery.' },
    { text: 'Then the nights. Somebody is always pouring. You stop counting whose name is on the bottle, and then whose is on the bill.' },
    { text: 'Four in the morning, at any table that will take your money. The phone lights up on the felt. You turn it over.' },
    { text: 'A dinner for two, kept warm until it was not. She leaves the candle lit. You were three tables from home.' },
    { text: 'Dawn finds you where you stopped. One stack of chips is still perfectly neat. It is the last tidy thing you own.' },
  ],
  walk: {
    stops: [
      { at: 0, line: { text: 'Porto Lumina. Forty-one floors up. The lift attendant did not ask who you were.' } },
      { at: 170, line: { text: 'Every wall of the room is a night you won. You cannot remember most of them.' } },
      { at: 330, line: { text: 'Medals. Plaques. A trophy with your name cut into it twice, and nobody to show.' } },
    ],
  },
  photo: [
    { text: 'On the desk, in a gold frame: you, and her.' },
    { text: 'Both of you laughing at something just off camera.' },
    { text: 'It was taken the night before the first buy-in. You have not worked out which of you stopped.' },
  ],
  papers: {
    lines: [
      { text: 'Beside it, a stack of paper. It has been there a while. You walked past it on the way in.' },
      { text: 'Her signature is on the last page. The line beside it is blank.' },
      { text: 'It would take a pen. The pen is right there. You have had since the Invitational to find it.' },
    ],
    court: 'SUPERIOR COURT OF PORTO LUMINA',
    title: 'PETITION FOR DISSOLUTION OF MARRIAGE',
    body:
      'The parties have lived apart since the Invitational. The marriage is irretrievably broken.',
    petitioner: 'PETITIONER',
    respondent: 'RESPONDENT',
    stamp: 'FILED',
  },
  ledger: {
    lines: [
      { text: 'Under the petition, the settlement statement from the Invitational. You have read it once.' },
      { text: 'Seven hundred and fifty thousand dollars, as the commentators said it. This is what it weighs.' },
      { text: 'Her lawyers asked for half of what is left, and the court said yes before you finished reading the line.' },
    ],
    title: 'LEGENDS INVITATIONAL',
    subtitle: 'STATEMENT OF SETTLEMENT',
    prize: 750000,
    deductions: [
      { label: 'Tax withheld, 36%', amount: 270000 },
      { label: 'Backers, 25% of gross', amount: 187500 },
      { label: 'Counsel, Okafor & Pratt', amount: 61000 },
      { label: 'Penthouse service charge', amount: 18400 },
    ],
    heldLabel: 'Frozen pending petition, 50%',
    heldShare: 0.5,
    footnote: 'Funds release on signature of the respondent.',
  },
  phone: {
    contact: 'Marcus',
    unread: 63,
    thread: [
      { when: 'OCT 14', text: 'Friday game is at 8. Ice is bought.' },
      { when: 'OCT 21', text: 'That final. UNREAL. Call me!!' },
      { when: 'OCT 22', text: 'Missed call', missedCall: true },
      { when: 'OCT 29', text: 'Hey. You alright?' },
      { when: 'NOV 2', text: 'Two weeks and nothing. Pick up.' },
      { when: 'NOV 9', text: 'I heard about the divorce. I am sorry.' },
      { when: 'NOV 16', text: 'Not mad. Just pick up.' },
      { when: 'TODAY', text: 'Whenever you are ready. I am still here.' },
    ],
    beats: [
      { line: { text: 'Your phone. Marcus, again.' }, upTo: 2 },
      { line: { text: 'Calls you let ring. Messages you swiped away in the lift.' }, upTo: 5 },
      { line: { text: 'He was on the rail and you did not look up. He is not asking for anything. He just keeps asking if you are alright.' }, upTo: 8 },
      { line: { text: 'Sixty-three unread. You have not answered one, because the answer is no.' }, upTo: 8 },
    ],
  },
  window: [
    { text: 'You put it face down on the desk, and walk to the glass.' },
    { text: 'The harbour is lit all the way out. Nobody on it knows your name tonight.' },
    { text: 'You let out a long breath, and it clouds the window, and goes.' },
    { text: "I've made it...", you: true },
  ],
  credits: {
    title: 'POKER LEGEND',
    entries: [
      { role: 'THE SHORT STACK', name: 'You' },
      { role: 'THE KITCHEN TABLE', name: 'Marcus, who is still calling' },
      { role: 'THE WATCHER', name: 'Dana, who wrote it down' },
      { role: 'THE ONE WHO WAS DUE', name: 'Ray, still due' },
      { role: 'THE FOOT', name: 'Lucky Dolores' },
      { role: 'THE TITHE', name: 'Reverend Gaines' },
      { role: 'THE ACCENT', name: 'The Contessa' },
      { role: 'THE THURSDAY', name: 'Bernard' },
      { role: 'THE CHAT', name: 'Zeke "KingPin"' },
      { role: 'THE COACH WHO NEVER SOLD THE LAST LESSON', name: 'Hal' },
      { role: 'THE FIVE-SECOND MIRACLE', name: 'Chip Van Doren' },
      { role: 'THE APOLOGY FOR THE MATHS', name: 'Dr. Priyanka Anand' },
      { role: 'THE FINAL BOSS', name: 'Nadia Okonkwo' },
      { role: 'THE WIFE', name: 'Not credited. Not reachable.' },
      { role: 'THE FRUIT BASKET', name: 'Nobody will say who sent it' },
    ],
    thanks: ['THANK YOU FOR PLAYING', 'Call somebody.'],
  },
  after: {
    contact: 'Marcus',
    lines: [
      { text: 'First light. The glass has gone grey, and the harbour with it.' },
      { text: 'The phone lights the desk. Marcus. He was always up early.' },
      { text: 'You watch it ring. You watch your thumb not move. It stops.' },
      { text: 'Missed call. Sixty-four unread.' },
    ],
  },
}

/** What you did about Wen's paper on the penthouse (`final-won`), if you found out about it. */
export type PenthouseDebt = 'settled' | 'wen' | 'fund'

/** The settlement statement, changed by what you did about the penthouse's debt. */
export function ledgerFor(debt?: PenthouseDebt): EndingFilm['ledger'] {
  const base = ENDING_FILM.ledger
  if (debt === 'settled') {
    return {
      ...base,
      lines: [...base.lines, { text: 'One more row, which you chose: the paper Madame Wen held on the room, paid in full. The penthouse is in your name alone.' }],
      deductions: [...base.deductions, { label: 'Wen, paper on the room', amount: 150000 }],
      footnote: 'Paid in full. Release on signature.',
    }
  }
  if (debt === 'wen') {
    return {
      ...base,
      lines: [...base.lines, { text: 'At the foot, in small type: the penthouse is held against a prior charge. Madame Wen has the pen. You have the keys.' }],
      footnote: 'Room held by M. Wen. Release on signature.',
    }
  }
  if (debt === 'fund') {
    return {
      ...base,
      lines: [...base.lines, { text: 'A row you chose: a fund, in the room’s name, for whoever is short next. It is the only line on the page you do not mind.' }],
      deductions: [...base.deductions, { label: 'Penthouse Stake, seed', amount: 50000 }],
      footnote: 'Open to any player. Release on signature.',
    }
  }
  return base
}
