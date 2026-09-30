import type { AvatarLook } from '../game/avatars'

/**
 * Who each opponent is at the table. The engine decides what they do; this
 * decides how it feels to sit across from them — how they look, how they're
 * described, and what they say while they're taking your money.
 */
export interface Personality {
  /** Shown under their name, e.g. "Calls everything". */
  style: string
  look: AvatarLook
  lines: {
    /** On sitting down with them. */
    greeting: string[]
    raise: string[]
    call: string[]
    fold: string[]
    /** They won the pot. */
    win: string[]
    /** You won the pot. */
    lose: string[]
  }
}

const DEFAULT_LINES: Personality['lines'] = {
  greeting: ['Good luck.'],
  raise: ['Raise.'],
  call: ['Call.'],
  fold: ['Fold.'],
  win: ['That one is mine.'],
  lose: ['Nice hand.'],
}

function person(
  style: string,
  look: AvatarLook,
  lines: Partial<Personality['lines']>,
): Personality {
  return { style, look, lines: { ...DEFAULT_LINES, ...lines } }
}

export const PERSONALITIES: Record<string, Personality> = {
  // --- the home game --------------------------------------------------------
  marcus: person(
    'Your friend. Plays scared.',
    { skin: '#8d5a3b', hair: '#241a12', hairStyle: 'short', shirt: '#6ea8fe', accessory: 'none' },
    {
      greeting: ['Marcus: Alright, no hard feelings tonight, yeah?'],
      raise: ['Marcus: ...okay. Raise.', 'Marcus: I think I have to raise here.'],
      call: ['Marcus: Ugh. Call.', 'Marcus: Fine, call.'],
      fold: ['Marcus: Nope. Nope nope nope.', 'Marcus: Take it.'],
      win: ['Marcus: YES. Finally.', 'Marcus: Did you see that?'],
      lose: ['Marcus: Of course. Of course you had it.'],
    },
  ),
  dana: person(
    'Quiet. Watches everything.',
    { skin: '#e0b48c', hair: '#5c3a22', hairStyle: 'tied', shirt: '#b56576', accessory: 'none' },
    {
      greeting: ['Dana: Deal them.'],
      raise: ['Dana: Raise.', 'Dana: More.'],
      call: ['Dana: I call.'],
      fold: ['Dana: No.'],
      win: ['Dana: Mm.'],
      lose: ['Dana: Hm. Noted.'],
    },
  ),

  // --- Silver Creek ---------------------------------------------------------
  ray: person(
    'Plays every hand he is dealt.',
    { skin: '#c78a5e', hair: '#7a7a7a', hairStyle: 'bald', shirt: '#7a8b5a', accessory: 'cap' },
    {
      greeting: ['Ray: I am due. I can feel it.'],
      raise: ['Ray: Why not!', 'Ray: Let us find out.'],
      call: ['Ray: I have come this far.', 'Ray: Curiosity call.'],
      fold: ['Ray: ...this one time.'],
      win: ['Ray: TOLD you I was due!'],
      lose: ['Ray: Bah. Next one.'],
    },
  ),
  sully: person(
    'Grinds small pots.',
    { skin: '#6f4429', hair: '#191919', hairStyle: 'short', shirt: '#4a6b8a', accessory: 'glasses' },
    {
      greeting: ['Sully: Evening.'],
      raise: ['Sully: Bump it.'],
      call: ['Sully: Price is right.'],
      fold: ['Sully: Not at that price.'],
      win: ['Sully: Appreciated.'],
      lose: ['Sully: Well played.'],
    },
  ),

  // --- Riverbend ------------------------------------------------------------
  deb: person(
    'Been here longer than you.',
    { skin: '#d8a077', hair: '#8a5a2b', hairStyle: 'long', shirt: '#9c6644', accessory: 'earring' },
    {
      greeting: ['Deb: You are new. That is fine. Everyone is, once.'],
      raise: ['Deb: Raise, sweetheart.'],
      call: ['Deb: Call. Show me.'],
      fold: ['Deb: All yours.'],
      win: ['Deb: Told you I have been here longer.'],
      lose: ['Deb: Alright. That was good.'],
    },
  ),
  mack: person(
    'Tight. Waits for a hand.',
    { skin: '#c08a5e', hair: '#2b2118', hairStyle: 'short', shirt: '#3d4a5c', accessory: 'none' },
    {
      greeting: ['Mack: Let us keep it civil.'],
      raise: ['Mack: Raise.'],
      call: ['Mack: Call.'],
      fold: ['Mack: Fold. Easy.'],
      win: ['Mack: That is why I waited.'],
      lose: ['Mack: Hm.'],
    },
  ),
  tiny: person(
    'Has not folded since noon.',
    { skin: '#e8b98f', hair: '#c24a2b', hairStyle: 'short', shirt: '#d9a441', accessory: 'none' },
    {
      greeting: ['Tiny: HERE we go. I love this table.'],
      raise: ['Tiny: Let us make it interesting!', 'Tiny: RAISE. Why not!'],
      call: ['Tiny: Call! Obviously call.', 'Tiny: I am not folding, are you kidding?'],
      fold: ['Tiny: ...fine. FINE.'],
      win: ['Tiny: HA! Drinks on me!'],
      lose: ['Tiny: Ohh, that is beautiful. Deal again!'],
    },
  ),

  // --- Crescent Harbor ------------------------------------------------------
  corinne: person(
    'Does this for a living.',
    { skin: '#e3bb95', hair: '#3b2a1c', hairStyle: 'tied', shirt: '#5c5470', accessory: 'none' },
    {
      greeting: ['Corinne: You are in my game now.'],
      raise: ['Corinne: Raise.', 'Corinne: I do not mind a bigger pot.'],
      call: ['Corinne: Call.'],
      fold: ['Corinne: Take it.'],
      win: ['Corinne: Thank you.'],
      lose: ['Corinne: Mm. You had it.'],
    },
  ),
  vance: person(
    'Thinks about it too long.',
    { skin: '#a8673f', hair: '#1c1c1c', hairStyle: 'short', shirt: '#2f6b5c', accessory: 'glasses' },
    {
      greeting: ['Vance: Give me a second to settle in.'],
      raise: ['Vance: ...raise.'],
      call: ['Vance: Call, I suppose.'],
      fold: ['Vance: I do not like it. Fold.'],
      win: ['Vance: Good. Good.'],
      lose: ['Vance: I knew it. I knew it and I called anyway.'],
    },
  ),
  hollis: person(
    'Third buy-in tonight.',
    { skin: '#f0c9a0', hair: '#d8d0c0', hairStyle: 'short', shirt: '#b5532f', accessory: 'none' },
    {
      greeting: ['Hollis: Do not worry about me. I am having fun.'],
      raise: ['Hollis: More! More.'],
      call: ['Hollis: Sure, call.', 'Hollis: I want to see it.'],
      fold: ['Hollis: Eh.'],
      win: ['Hollis: There we are! Back in it.'],
      lose: ['Hollis: Ohh. Another one. Rack me up again.'],
    },
  ),
  delphine: person(
    'Runs the back room.',
    { skin: '#7a4b2e', hair: '#141414', hairStyle: 'long', shirt: '#1f1f2e', accessory: 'earring' },
    {
      greeting: ['Delphine: I invited you. Do not embarrass me.'],
      raise: ['Delphine: Raise.'],
      call: ['Delphine: I call.'],
      fold: ['Delphine: Yours.'],
      win: ['Delphine: As expected.'],
      lose: ['Delphine: Good. Genuinely.'],
    },
  ),
  otto: person(
    'Never folds. Ever.',
    { skin: '#dba97e', hair: '#6b5a3a', hairStyle: 'bald', shirt: '#7a5c9e', accessory: 'none' },
    {
      greeting: ['Otto: I am only here for the company.'],
      raise: ['Otto: Up!'],
      call: ['Otto: Call, call, call.'],
      fold: ['Otto: This is unusual for me.'],
      win: ['Otto: Oh! Marvellous.'],
      lose: ['Otto: Well spent.'],
    },
  ),

  // --- Palm Cay -------------------------------------------------------------
  adaeze: person(
    'Patient. Punishes mistakes.',
    { skin: '#66402a', hair: '#141414', hairStyle: 'tied', shirt: '#2f7a6b', accessory: 'none' },
    {
      greeting: ['Adaeze: Take your time. I have all week.'],
      raise: ['Adaeze: Raise.'],
      call: ['Adaeze: Call.'],
      fold: ['Adaeze: Not this one.'],
      win: ['Adaeze: Thank you kindly.'],
      lose: ['Adaeze: That was well done.'],
    },
  ),
  kit: person(
    'Aggressive. Very good.',
    { skin: '#eac6a0', hair: '#c9a227', hairStyle: 'short', shirt: '#1f1f2e', accessory: 'shades' },
    {
      greeting: ['Kit: Let us not waste each other’s afternoon.'],
      raise: ['Kit: Raise.', 'Kit: Pressure.'],
      call: ['Kit: Call.'],
      fold: ['Kit: Have it.'],
      win: ['Kit: Predictable.'],
      lose: ['Kit: Huh. Alright.'],
    },
  ),
  kit2: person(
    'Aggressive. Very good.',
    { skin: '#eac6a0', hair: '#c9a227', hairStyle: 'short', shirt: '#1f1f2e', accessory: 'shades' },
    {
      greeting: ['Kit: You again.'],
      raise: ['Kit: Raise.'],
      call: ['Kit: Call.'],
      fold: ['Kit: Have it.'],
      win: ['Kit: Predictable.'],
      lose: ['Kit: Huh. Alright.'],
    },
  ),
  rosa: person(
    'Knows everyone on the island.',
    { skin: '#c98b5f', hair: '#4a2c1a', hairStyle: 'long', shirt: '#d96c6c', accessory: 'none' },
    {
      greeting: ['Rosa: Bernard is the one you want. Not me.'],
      raise: ['Rosa: Raise.'],
      call: ['Rosa: Call.'],
      fold: ['Rosa: Nope.'],
      win: ['Rosa: Sorry! Not sorry.'],
      lose: ['Rosa: Ah, you got me.'],
    },
  ),
  bernard: person(
    'Two days at this table.',
    { skin: '#f2cfa8', hair: '#b8b8b8', hairStyle: 'short', shirt: '#4a9dd9', accessory: 'visor' },
    {
      greeting: ['Bernard: Is it Thursday? Someone said it was Thursday.'],
      raise: ['Bernard: I raise! Is that right? I raise.'],
      call: ['Bernard: Call. I always call.', 'Bernard: I want to SEE it.'],
      fold: ['Bernard: Hm? Oh. Fold, then.'],
      win: ['Bernard: Oh, lovely! Another round!'],
      lose: ['Bernard: Ha! Wonderful. Again.'],
    },
  ),

  // --- Neon Mesa ------------------------------------------------------------
  lorna: person(
    'Studied. Relentless.',
    { skin: '#e6c0a0', hair: '#2a2a2a', hairStyle: 'short', shirt: '#3a3a56', accessory: 'none' },
    {
      greeting: ['Lorna: Solver line or feel? We will find out.'],
      raise: ['Lorna: Raise.'],
      call: ['Lorna: Call.'],
      fold: ['Lorna: Fold.'],
      win: ['Lorna: Standard.'],
      lose: ['Lorna: Interesting line.'],
    },
  ),
  'lorna-hu': person(
    'Heads-up specialist.',
    { skin: '#e6c0a0', hair: '#2a2a2a', hairStyle: 'short', shirt: '#3a3a56', accessory: 'none' },
    {
      greeting: ['Lorna: One on one. No hiding.'],
      raise: ['Lorna: Raise.'],
      call: ['Lorna: Call.'],
      fold: ['Lorna: Yours.'],
      win: ['Lorna: Standard.'],
      lose: ['Lorna: Good.'],
    },
  ),
  dmitri: person(
    'Silent. Enormous stack.',
    { skin: '#d9b48f', hair: '#3a2a1a', hairStyle: 'short', shirt: '#22222e', accessory: 'shades' },
    {
      greeting: ['Dmitri: ...'],
      raise: ['Dmitri: Raise.'],
      call: ['Dmitri: Call.'],
      fold: ['Dmitri: No.'],
      win: ['Dmitri: Mm.'],
      lose: ['Dmitri: ...'],
    },
  ),
  whitaker: person(
    'Rich. Cheerfully bad.',
    { skin: '#f0cba4', hair: '#a89878', hairStyle: 'short', shirt: '#8a5c2f', accessory: 'none' },
    {
      greeting: ['Whitaker: I am told I am a fish. I think that is rude.'],
      raise: ['Whitaker: Let us liven it up.'],
      call: ['Whitaker: Call! I am invested now.'],
      fold: ['Whitaker: Reluctantly.'],
      win: ['Whitaker: Ha! See, not a fish.'],
      lose: ['Whitaker: Fine. Fine! Another.'],
    },
  ),
  saul: person(
    'Old school. Sharp.',
    { skin: '#c99a6e', hair: '#c8c8c8', hairStyle: 'bald', shirt: '#4a4a5c', accessory: 'glasses' },
    {
      greeting: ['Saul: Forty years I have sat in this seat.'],
      raise: ['Saul: Raise.'],
      call: ['Saul: I will look you up.'],
      fold: ['Saul: Too rich.'],
      win: ['Saul: Experience.'],
      lose: ['Saul: Good for you, kid.'],
    },
  ),
  priya: person(
    'Best player in the room.',
    { skin: '#8a5a38', hair: '#141414', hairStyle: 'long', shirt: '#2f2f4a', accessory: 'none' },
    {
      greeting: ['Priya: I will be honest, I have looked you up.'],
      raise: ['Priya: Raise.'],
      call: ['Priya: Call.'],
      fold: ['Priya: Fold.'],
      win: ['Priya: Thank you.'],
      lose: ['Priya: That was the right line.'],
    },
  ),
  august: person(
    'Runs the invitational.',
    { skin: '#e0b48c', hair: '#5a5a5a', hairStyle: 'short', shirt: '#1a1a28', accessory: 'none' },
    {
      greeting: ['August: You are here because someone vouched. Remember that.'],
      raise: ['August: Raise.'],
      call: ['August: Call.'],
      fold: ['August: Take it.'],
      win: ['August: Naturally.'],
      lose: ['August: Hm. Good.'],
    },
  ),
  rhodes: person(
    'A philanthropist, allegedly.',
    { skin: '#f0cba4', hair: '#8a7a5a', hairStyle: 'bald', shirt: '#9e2f2f', accessory: 'none' },
    {
      greeting: ['Rhodes: I am not very good. I am very rich. It balances.'],
      raise: ['Rhodes: Why not, raise.'],
      call: ['Rhodes: Call. Always call.'],
      fold: ['Rhodes: Hm, no.'],
      win: ['Rhodes: Oh! Splendid.'],
      lose: ['Rhodes: Worth every penny.'],
    },
  ),

  // --- Porto Lumina ---------------------------------------------------------
  xue: person(
    'Nosebleed regular.',
    { skin: '#e8c09a', hair: '#141414', hairStyle: 'short', shirt: '#1f2e3a', accessory: 'none' },
    {
      greeting: ['Xue: We play big here. I hope you understand that.'],
      raise: ['Xue: Raise.'],
      call: ['Xue: Call.'],
      fold: ['Xue: No.'],
      win: ['Xue: Good.'],
      lose: ['Xue: Well played.'],
    },
  ),
  marchetti: person(
    'Never shows a hand.',
    { skin: '#d0a070', hair: '#2a2018', hairStyle: 'short', shirt: '#2a2a2a', accessory: 'shades' },
    {
      greeting: ['Marchetti: Pleasure.'],
      raise: ['Marchetti: Raise.'],
      call: ['Marchetti: Call.'],
      fold: ['Marchetti: Yours.'],
      win: ['Marchetti: Grazie.'],
      lose: ['Marchetti: Bravo.'],
    },
  ),
  kingsley: person(
    'Here to be seen losing.',
    { skin: '#f2d0ad', hair: '#c0a060', hairStyle: 'short', shirt: '#6b2f7a', accessory: 'none' },
    {
      greeting: ['Kingsley: My accountant hates this room.'],
      raise: ['Kingsley: Up it!'],
      call: ['Kingsley: Call, of course.'],
      fold: ['Kingsley: Must I?'],
      win: ['Kingsley: HA! Photograph that.'],
      lose: ['Kingsley: Marvellous. Again!'],
    },
  ),
  nadia: person(
    'Four years in the penthouse.',
    { skin: '#5e3a22', hair: '#0f0f0f', hairStyle: 'tied', shirt: '#101018', accessory: 'none' },
    {
      greeting: [
        'Nadia: I have watched you come up. It has been a pleasure.',
        'Nadia: Let us see if it was worth watching.',
      ],
      raise: ['Nadia: Raise.', 'Nadia: I think you will fold.'],
      call: ['Nadia: Call.', 'Nadia: I do not believe you.'],
      fold: ['Nadia: Take it. That one was yours.'],
      win: ['Nadia: The room stays mine, then.'],
      lose: ['Nadia: ...that was very good.'],
    },
  ),
}

const FALLBACK: Personality = person(
  'Regular.',
  { skin: '#d9a07a', hair: '#2b2118', hairStyle: 'short', shirt: '#4a4a66', accessory: 'none' },
  {},
)

export function personalityFor(opponentId: string): Personality {
  return PERSONALITIES[opponentId] ?? FALLBACK
}
