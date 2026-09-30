import type { MissionDef, SponsorDef } from './types'

// ---------------------------------------------------------------------------
// Sponsors — money now, a deadline, and people who come looking.
// ---------------------------------------------------------------------------

export const SPONSORS: Record<string, SponsorDef> = {
  cass: {
    id: 'cass',
    name: 'Cass',
    principal: 1500,
    interestRate: 0.25,
    dueInDays: 3,
    pitch: [
      'Cass: I watched you play. You’re better than this room.',
      'Cass: I’ll put you in for 1,500. You hand me back 1,875 inside three days.',
      'Cass: If you can’t, I send someone. Nothing personal.',
    ],
  },
  emeka: {
    id: 'emeka',
    name: 'Mr. Emeka',
    principal: 6000,
    interestRate: 0.3,
    dueInDays: 3,
    pitch: [
      'Mr. Emeka: You play a patient game. I like patient.',
      'Mr. Emeka: Six thousand, back to me at 7,800 in three days.',
      'Mr. Emeka: Be somewhere I can find you when it’s due.',
    ],
  },
  consortium: {
    id: 'consortium',
    name: 'The Consortium',
    principal: 40000,
    interestRate: 0.4,
    dueInDays: 2,
    pitch: [
      'Broker: We back players. You’d be a line item.',
      'Broker: Forty thousand. Fifty-six back, two days.',
      'Broker: We don’t renegotiate and we don’t lose track of people.',
    ],
  },
  wen: {
    id: 'wen',
    name: 'Madame Wen',
    principal: 150000,
    interestRate: 0.5,
    dueInDays: 2,
    pitch: [
      'Madame Wen: The buy-in upstairs is beyond you. I can fix that.',
      'Madame Wen: One hundred fifty. Two hundred twenty-five back, two days.',
      'Madame Wen: Everyone at your level has taken this deal once.',
    ],
  },
}

// ---------------------------------------------------------------------------
// Missions
// ---------------------------------------------------------------------------

export const MISSIONS: Record<string, MissionDef> = {
  'riverbend-marker': {
    id: 'riverbend-marker',
    title: 'Prove It',
    brief: [
      'Deb: Everyone says they can play. You want a real game around here?',
      'Deb: Take down five pots. Then we talk.',
    ],
    goalText: 'Win 5 hands total',
    goal: { kind: 'handsWonTotal', value: 5 },
    rewardCash: 400,
    doneText: ['Deb: Huh. All right. That’s 400 for the trouble.'],
  },
  'crescent-suit': {
    id: 'crescent-suit',
    title: 'Dress The Part',
    brief: [
      'Doorman: The room upstairs has standards, and you are not currently meeting them.',
      'Doorman: Come back in a real suit and I’ll make it worth it.',
    ],
    goalText: 'Own a tailored suit',
    goal: { kind: 'ownItem', itemId: 'tailored-suit' },
    rewardCash: 900,
    doneText: ['Doorman: Now you look like someone. Here — 900, and the room knows your face.'],
  },
  'palmcay-tourist': {
    id: 'palmcay-tourist',
    title: 'The Big One',
    brief: [
      'Rosa: You see Bernard over there? He plays every hand and he never leaves.',
      'Rosa: Stack a real pot off this island and I’ll cut you in.',
    ],
    goalText: 'Win a pot of $1,500 or more',
    goal: { kind: 'biggestPot', value: 1500 },
    rewardCash: 2500,
    doneText: ['Rosa: I heard about that pot before you sat down. 2,500, as promised.'],
  },
  'crescent-courier': {
    id: 'crescent-courier',
    title: 'Something For The Door',
    brief: [
      'Tailor: A customer left a jacket and never came back for it.',
      'Tailor: Play enough real hands that I believe you\u2019ll wear it properly, and it\u2019s yours.',
    ],
    goalText: 'Win 20 hands total',
    goal: { kind: 'handsWonTotal', value: 20 },
    rewardCash: 0,
    rewardItemId: 'tailored-suit',
    doneText: ['Tailor: Take it. It was cut for someone your size and he is not coming back.'],
  },
  'mesa-read': {
    id: 'mesa-read',
    title: 'Eyes Open',
    brief: [
      'Fixer: Up here everyone’s studied. Nobody twitches for free.',
      'Fixer: Go learn to read people properly, then come find me.',
    ],
    goalText: 'Complete the mentor’s lesson on tells',
    goal: { kind: 'hasLesson', lessonId: 'tells' },
    rewardCash: 12000,
    doneText: ['Fixer: Now you’re worth talking to. Twelve, and my number.'],
  },
}

