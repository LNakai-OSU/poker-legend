/**
 * The ending film, played once the heads-up match is won and before the
 * summary card. It is five shots — the walk through the penthouse, the photo on
 * the desk, the papers beside it, the phone, the window — drawn by
 * `game/EndingFilm.tsx`. What is said, written and sent in them is here.
 *
 * Narration has no speaker. A line with `you: true` is the player's own, and is
 * shown under their name.
 */

export interface EndingLine {
  text: string
  you?: boolean
}

/** One message in Marcus's thread. Nothing in it is ever from the player. */
export interface EndingMessage {
  /** The small stamp over it: a day, or "Missed call". */
  when: string
  text: string
  missedCall?: boolean
}

export interface EndingFilm {
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
  phone: {
    contact: string
    unread: number
    thread: EndingMessage[]
    /** Each press lets the thread climb to `upTo` messages. */
    beats: { line: EndingLine; upTo: number }[]
  }
  window: EndingLine[]
}

export const ENDING_FILM: EndingFilm = {
  walk: {
    stops: [
      { at: 0, line: { text: 'Porto Lumina. Forty-one floors up.' } },
      { at: 170, line: { text: 'Every wall of the room is a night you won.' } },
      { at: 330, line: { text: 'Medals. Plaques. A trophy with your name cut into it twice.' } },
    ],
  },
  photo: [
    { text: 'On the desk, in a gold frame: you, and her.' },
    { text: 'Both of you laughing at something just off camera.' },
    { text: 'It was taken before the first buy-in.' },
  ],
  papers: {
    lines: [
      { text: 'Beside it, a stack of paper. It has been there a while.' },
      { text: 'Her signature is on the last page. The line beside it is blank.' },
    ],
    court: 'SUPERIOR COURT OF PORTO LUMINA',
    title: 'PETITION FOR DISSOLUTION OF MARRIAGE',
    body:
      'The parties have lived apart since the Invitational. The marriage is irretrievably broken.',
    petitioner: 'PETITIONER',
    respondent: 'RESPONDENT',
    stamp: 'FILED',
  },
  phone: {
    contact: 'Marcus',
    unread: 63,
    thread: [
      { when: 'OCT 14', text: 'Friday game is at 8. Ice is bought.' },
      { when: 'OCT 21', text: 'Saw the final. UNREAL. Call me!!' },
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
      { line: { text: 'He is not asking for anything. He just keeps asking if you are alright.' }, upTo: 8 },
      { line: { text: 'Sixty-three unread. You have not answered one.' }, upTo: 8 },
    ],
  },
  window: [
    { text: 'You put it face down on the desk, and walk to the glass.' },
    { text: 'The harbour is lit all the way out. Nobody on it knows your name tonight.' },
    { text: 'You let out a long breath, and it clouds the window, and goes.' },
    { text: "I've made it...", you: true },
  ],
}
