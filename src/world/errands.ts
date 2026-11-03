import type { EventAction, EventCondition, GameEvent } from './events'
import type { PoiDef } from './types'
import type { TimePeriod } from '../game/time'
import type { CityId, StoryFlag } from '../game/state'

/**
 * Errands: small jobs the town gives you, for cash.
 *
 * Somebody in town needs something done and cannot do it themselves — usually
 * because they are hiding from somebody they owe. You walk it round the town,
 * and they pay you. The money is there to be climbed back from a bad beat with:
 * each town's errands together are worth about one seat at that town's cheapest
 * table, never more (`errands.test.ts` holds the ratio).
 *
 * An errand is written as a few lines of data and expanded into ordinary events
 * (`eventsOf`) and ordinary fixtures (`errandPois`). What stage you are at is
 * which of the errand's own events have already played, which is what
 * `eventDone` has always been for. Only a leg's `choice` sets a flag (the
 * client's finish and afterword read it), so a decision is remembered.
 *
 *   ask       the client, the first time you talk to them
 *   hint      the client again, while the job is open (repeatable)
 *   legs      each a fixture to visit, in order (the same one twice is fine)
 *   finish    back to the client, who pays (a variant when a choice was made)
 *   after     the client once it is over (repeatable); echoes: others remark on it
 *
 * Nobody here changes how many days you have (rule 4): a leg may pass an hour
 * by waiting, but nothing hands out a day.
 */

export interface ErrandPerson {
  id: string
  name: string
  areaId: string
  col: number
  row: number
  /** What they say once you have done this for them, and to a stranger before it. */
  lines: string[]
  /** A fixture rather than a person: a hedge, an altar, the end of a pier. */
  thing?: boolean
  /**
   * How a fixture is drawn, when it is not a signpost: `none` when the map
   * already draws it as an object (the woodpile, the phone box), so the object
   * is the thing you walk up to and the outskirts are not a field of signposts.
   */
  art?: PoiDef['art']
  look?: PoiDef['look']
  role?: PoiDef['role']
}

export interface ErrandChoiceOption {
  label: string
  /** Speaker-prefixed lines said once it is picked. */
  lines: string[]
  /** Paid on the spot. */
  cash?: number
  /** Set when this answer is picked; read by `Errand.variants` and `echoes`. */
  flag?: StoryFlag
}

export interface ErrandChoice {
  speaker?: string
  prompt: string
  options: ErrandChoiceOption[]
}

/** A different ending for a client when `flag` is set, and what they say afterwards. */
export interface ErrandVariant {
  flag: StoryFlag
  finish: string[]
  reward: number
  after: string[]
  /** What they say once the town's boss is beaten. */
  bossAfter?: string[]
  /** What the Jobs page says to do next once this answer has been given. */
  todo?: string
}

/** Somebody else in town remarking on the job, once it is paid. */
export interface ErrandEcho {
  poi: string
  speaker?: string
  lines: string[]
  /** Only when this flag is set (or, with `flagSet: false`, clear). */
  flag?: StoryFlag
  flagSet?: boolean
}

export interface ErrandLeg {
  /** The fixture or person to visit, by POI id. */
  poi: string
  /** What the Jobs page says to do next. */
  todo: string
  /** Speaker-prefixed lines ("Mabel: …"). A line with no prefix is narration. */
  lines: string[]
  /** A decision at the end of the lines. Each answer may pay at once and set a flag the finish reads. */
  choice?: ErrandChoice
  /** What else happens once the lines are read: time passing, the light going. */
  then?: EventAction[]
  /** Who is speaking, for the text box: a plain name or a character id. */
  speaker?: string
  /**
   * Only at these hours. A leg that waits passes an hour, and the hour after night
   * is the next day, which no errand may hand out (rule 4).
   */
  periods?: TimePeriod[]
  /**
   * What somebody there says at the other hours, while this leg is next: when to
   * come back. Without it, turning up at the wrong hour is a bare stock line.
   * Only for a fixture or a person with nothing else to do: a beat takes the
   * talk, so a line here would shut a shop for those hours.
   */
  closed?: string[]
}

export interface Errand {
  id: string
  title: string
  cityId: CityId
  about: string
  /** The client's POI id. */
  client: string
  clientName: string
  /** Where to find them, for the Jobs page. */
  where: string
  ask: string[]
  hint: string[]
  legs: ErrandLeg[]
  finish: string[]
  /** The most the job pays. Variants may pay less, and a choice may pay on the spot. */
  reward: number
  /** What the client pays in the plain ending, when a variant is the better ending. Defaults to `reward`. */
  defaultReward?: number
  variants?: ErrandVariant[]
  /** Only offered when these hold (another errand's flag, or its being paid). */
  requires?: EventCondition[]
  /** Only at these hours: the ask and every leg. A night job must not advance the period. */
  periods?: TimePeriod[]
  /** What the client says once it is over, in place of their stock line. */
  after: string[]
  /** What the client says once the town's boss is beaten, in place of `after`. */
  bossAfter?: string[]
  echoes?: ErrandEcho[]
  /** New fixtures this errand puts in the world. Existing ones are named by `poi` alone. */
  people: ErrandPerson[]
}

const WAIT: EventAction[] = [{ kind: 'fade', to: 'out' }, { kind: 'advancePeriod' }, { kind: 'fade', to: 'in' }]
const DAYLIGHT: TimePeriod[] = ['morning', 'afternoon', 'evening']
const ALL_PERIODS: TimePeriod[] = ['morning', 'afternoon', 'evening', 'night']

export const ERRANDS: Errand[] = [
  // --- Basin -----------------------------------------------------------------
  // Shape: a first read, before the bus. Two doors and one question, a few minutes
  // on the morning of the first game (Dana offers it: `dana-walks-you-to-the-bus`),
  // and it teaches the walk, the talk, a choice and the Jobs page. Basin has no
  // casino, so it is not counted against a seat; it pays a few dollars.
  {
    id: 'errand-patel',
    where: 'Patel’s Corner Store, the first door on Seventh Street',
    title: 'Mr Patel’s dollar',
    cityId: 'apartment',
    about: 'The busker has won Mr Patel’s dollar at liar’s poker eleven mornings running. Win it back.',
    client: 'patel',
    clientName: 'Mr Patel',
    ask: [
      'Mr Patel: You play cards. Marcus says you play cards. Marcus says many things, but this one I believe.',
      'Mr Patel: Every morning the busker buys one coffee with one dollar, then wins my dollar back. Liar’s poker, on the serial numbers. Eleven mornings.',
      'Mr Patel: Here. My dollar. He is outside with the guitar. Watch his foot: when he is lying, it taps.',
      'He folds the dollar into your hand. It is on your Jobs page now: Esc, or the menu button, then Jobs.',
    ],
    hint: ['Mr Patel: The busker. Outside, on Seventh, with the guitar. Walk up and talk to him. Watch the foot.'],
    legs: [
      {
        poi: 'seventh-busker',
        todo: 'Play the busker on Seventh Street for Mr Patel’s dollar. Watch his foot.',
        lines: [
          'Busker: Patel’s dollar. I would know it anywhere; he folds it in four. Liar’s poker, then. Both serial numbers count.',
          'Busker: I open. Three sevens: between your bill and mine, three sevens. Call me a liar, or go higher.',
          'Your bill has two sevens in it. His right foot is going like a drummer’s.',
        ],
        choice: {
          speaker: 'Busker',
          prompt: 'Three sevens, he says. You hold two. His foot is tapping.',
          options: [
            {
              label: 'Call: he is lying',
              lines: [
                'You turn the bills over. Yours: two sevens. His: not one, and a coffee ring.',
                'Busker: The foot. Patel told you about the foot. Eleven mornings that foot has been loyal to me.',
              ],
            },
            {
              label: 'Raise: four sevens',
              flag: 'errandPatelRaised',
              lines: [
                'Busker: Four? Liar. He turns his bill over: not a seven on it. Two sevens on the table, not four.',
                'Busker: I was bluffing, and so were you, and you bid last. Tell Patel I said thank you.',
              ],
            },
          ],
        },
      },
    ],
    finish: [
      'Mr Patel: He had nothing? He always has nothing? Eleven mornings of nothing!',
      'Mr Patel: Here. Forty, for my dignity. And for nothing: Marcus folds to anything loud. Twenty years I have sold him ice.',
    ],
    variants: [
      {
        flag: 'errandPatelRaised',
        todo: 'The busker took the dollar. Go back to Mr Patel and own up.',
        reward: 10,
        finish: [
          'Mr Patel: Four sevens. You knew he was lying, and you raised him, so he could call you with nothing.',
          'Mr Patel: That is the lesson, and it cost me one dollar, which is a cheap lesson. Ten, for your time. When you know, you call.',
        ],
        after: [
          'Mr Patel: Twelve mornings. Now he brings a second dollar so I have one to lose. It is a kindness. I hate it.',
          'Mr Patel: When you know, you call. Write it on your hand.',
        ],
      },
    ],
    after: [
      'Mr Patel: The busker paid for his coffee this morning. With money. I nearly cried.',
      'Mr Patel: The good pretzels are still for a funeral, by the way. Not yours. Not yet.',
    ],
    echoes: [
      { poi: 'seventh-busker', speaker: 'Busker', flag: 'errandPatelRaised', flagSet: false, lines: ['Busker: I play in boots now. You cannot read a boot.'] },
      { poi: 'seventh-busker', speaker: 'Busker', flag: 'errandPatelRaised', lines: ['Busker: Four sevens! I tell everybody. You are famous on Seventh Street.'] },
    ],
    reward: 40,
    people: [],
  },
  // --- Silver Creek --------------------------------------------------------
  // Shape: a lie to tell. Two fetches, then Fat Nico himself, and what you say to him.
  {
    id: 'errand-wendell',
    where: 'the Sand Dollar Motor Court, down the path south off Reservation Road',
    title: 'Wendell, Room 6',
    cityId: 'silverCreek',
    about: 'A man hiding at the Sand Dollar from a bookie wants a disguise, and then someone to lie to the bookie.',
    client: 'sc-wendell',
    clientName: 'Wendell',
    ask: [
      'Wendell: Psst. Keep walking. No — stop walking, that’s worse. Stand there like you’re reading the motel sign.',
      'Wendell: I owe a man named Fat Nico four hundred dollars on a dog race. The dog won. The photo finish disagreed.',
      'Wendell: He knows my face. He does not know my face in a hat. Nobody does. I have never worn a hat.',
      'Wendell: The valet by the casino sees everything. Ask if Nico’s about, then the gift shop: hat, sunglasses, novelty moustache. Say they’re for Wendell.',
      'Wendell: And if Nico finds you, you’ve never heard of me. Sixty dollars. I’ve been hiding it from myself since March.',
      'Wendell: And keep my secret, and I’ll tell you one. I dealt Lou Brannigan’s back table for six years.',
    ],
    hint: ['Wendell: Check the coast with the valet, then the gift shop. Hat, shades, moustache. Whisper it. Everybody is Fat Nico.'],
    legs: [
      {
        poi: 'sc-valet',
        speaker: 'Valet',
        todo: 'Ask the Valet by the casino whether a big man called Nico is about.',
        lines: [
          'Valet: Big man, thumbs like salamis, asks after a Wendell? Been and gone twice. Left a card.',
          'Valet: The card says “Nico’s Debt Recovery & Catering.” He does both. Not at once, I think.',
          'Valet: Tell Wendell the coast is clear for twenty minutes. Nico’s at the buffet.',
        ],
      },
      {
        poi: 'giftshop',
        speaker: 'Clerk',
        todo: 'Get a hat, sunglasses and a moustache from the gift shop for Wendell.',
        lines: [
          'Clerk: For Wendell? Oh, bless him. The Groucho, not the Selleck. He asked for the Selleck last time and ended up in a ditch.',
          'Clerk: On the house. Fat Nico has been in twice, buying the same moustache. I think they’re both going through something.',
        ],
      },
      {
        poi: 'sc-nico',
        speaker: 'Nico',
        todo: 'Fat Nico is standing on the path with a moustache of his own. Deal with him.',
        lines: [
          'The moustache on the path turns out to belong to a very large man holding a novelty hat. Nico.',
          'Nico: You’ve been to the gift shop. I can smell the plastic. You know a man called Wendell? Owes me four hundred and a rematch.',
        ],
        choice: {
          speaker: 'Nico',
          prompt: 'Nico leans in. “Which room?”',
          options: [
            {
              label: 'Never heard of him',
              lines: ['Nico: Liar. That was a good one, though. I like you. I’ll check the buffet instead.'],
            },
            {
              label: 'Room 6, Sand Dollar',
              cash: 30,
              flag: 'errandWendellSold',
              lines: ['Nico: Appreciate it. For your trouble.', 'You hand the gift-shop bag to a man who, it turns out, was going to need it.'],
            },
          ],
        },
      },
    ],
    finish: [
      'Wendell: The Groucho. Perfect. Hat, shades. Do I look like a man who has never owed anybody anything?',
      'Wendell: Nico walked right past. Looked at me twice. Said, “Nice moustache.” Here — sixty. I’m changing my name to Brad.',
      'Wendell: And Lou, like I promised. He never tells with his face. He tells with his chips: watch the stack, not the man. Six years I watched it.',
    ],
    variants: [
      {
        flag: 'errandWendellSold',
        todo: 'Nico found Wendell. Go back to him anyway, for what he can still pay.',
        reward: 20,
        finish: [
          'The door of Room 6 is open. Wendell is wearing the hat, the shades and an apron that says NICO’S DEBT RECOVERY & CATERING.',
          'Wendell: He found me. He was very nice about it. I’m on the buffet until the debt’s paid. Twenty dollars — it’s what he left in the till for the guy who sold me out.',
          'Wendell: I’m not angry. I’m catering.',
          'Wendell: I was going to tell you how to read Lou Brannigan. Nico has that now too. He says it goes with the apron.',
        ],
        after: [
          'Wendell: Table for one? The prawn ring is excellent. I arranged it myself.',
          'Wendell: Nico lets me keep the hat. He says it’s a good hat. He says it in the voice he uses for debts.',
          'Wendell: I’d be angrier at you if the tips weren’t so good. Catering is, it turns out, what I was always for.',
        ],
      },
    ],
    after: ['Brad: There is no Wendell in Room 6. There is a Brad. Brad is on holiday and is not hiding from anyone.'],
    echoes: [
      { poi: 'giftshop', speaker: 'Clerk', lines: ['Clerk: The Groucho is selling like mad. A man came in asking for “whatever Brad had.” I gave him the Selleck. He ended up in a ditch.'] },
    ],
    reward: 60,
    people: [
      {
        id: 'sc-wendell',
        name: 'Wendell',
        areaId: 'sc-outskirts',
        col: 5,
        row: 6,
        lines: ['Wendell: Quiet. Don’t look at the door. Look at the sign. Read it. NO VACANCY. Good.'],
        look: { hat: 'cap', hatColor: '#6a6a7a' },
      },
      {
        id: 'sc-nico',
        name: 'Fat Nico',
        areaId: 'sc-outskirts',
        col: 16,
        row: 5,
        lines: ['Nico: Seen a man in a hat? No. A man with no hat. No — a man who’s never worn a hat. That’s the one.'],
      },
    ],
  },
  // Shape: a timed wait, then a message to carry back — truth or kindness.
  {
    id: 'errand-loretta',
    where: 'the Sand Dollar Motor Court, south off Reservation Road',
    title: 'A casserole for Ray',
    cityId: 'silverCreek',
    about: 'Ray’s sister runs the motor court and has not seen him eat a hot meal since 1994.',
    client: 'sc-loretta',
    clientName: 'Loretta',
    ask: [
      'Loretta: You walk like someone headed for the casino. Everybody on this road is. The ones coming back don’t walk like that.',
      'Loretta: Loretta. Sand Dollar Motor Court. The sign says No Vacancy and I want you to know that is also a lie. My brother is Ray.',
      'Loretta: He’s been on stool four since before you could tie your shoes. He hasn’t had a hot meal since the first Clinton.',
      'Loretta: This is tuna casserole. Don’t make that face, it’s love. Give it to the bartender. She’ll get it into him between hands.',
      'Loretta: Then come back this afternoon and tell me what he said. I want what he said. Not what you think I want.',
    ],
    hint: ['Loretta: Bartender. Casserole. Ray. Give him an hour to eat, then ask what he said.'],
    legs: [
      {
        poi: 'sc-bartender',
        speaker: 'Bartender',
        periods: ['morning', 'afternoon'],
        closed: ['Bartender: Ray eats between hands at lunch. Bring Loretta’s dish in the morning or the afternoon. After that he won’t look up from the felt.'],
        todo: 'Get Loretta’s casserole to Ray, through the bartender.',
        lines: [
          'Bartender: A casserole? That’s Loretta’s dish. Say no more.',
          'Ray: Is that tuna? Hand it here. Don’t talk to me, I’m due.',
          'Bartender: Give him an hour. He eats with one hand and folds with the other. I’ll hold the dish.',
        ],
        then: WAIT,
      },
      {
        poi: 'sc-bartender',
        speaker: 'Bartender',
        periods: ['afternoon', 'evening', 'night'],
        closed: ['Bartender: Ray hasn’t said a word yet. He says things in the afternoon, if at all. Come back then and ask me.'],
        todo: 'Go back to the bartender once Ray has had his hour (afternoon or later) and ask what he said.',
        lines: [
          'Bartender: Clean dish. Even the crunchy top. I have never seen that man fold so fast.',
          'Bartender: He said something to me for her and then asked me to forget it. I can’t. You’re going to have to carry it.',
          'Ray: …Tell her the dish was good.',
        ],
        choice: {
          speaker: 'Bartender',
          prompt: 'What do you tell Loretta?',
          options: [
            { label: 'He said the dish was good', lines: ['Bartender: That’s what he said. That’s all he said. Four words and a burp.'] },
            {
              label: 'He said he’d be along',
              flag: 'errandLorettaLied',
              lines: ['Bartender: …That’s not what he said. But I will not be the one to stop you.'],
            },
          ],
        },
      },
    ],
    finish: [
      'Loretta: “The dish was good.” Four words. Thirty years, and he’s given me four.',
      'Loretta: I’ll take them. Here, seventy. It’s Room 2 money. Don’t tell him I paid you, he’ll think I’ve gone soft.',
    ],
    variants: [
      {
        flag: 'errandLorettaLied',
        todo: 'Go back to Loretta, who may have guessed.',
        reward: 60,
        finish: [
          'Loretta: “After this hand.” He’s said it since 1994. But you said it warm.',
          'Loretta looks at you a long moment and doesn’t say what she knows.',
          'Loretta: Sixty. I’ll make the bed in Room 2 tonight. It’s made already, so I’ll make it again.',
        ],
        after: ['Loretta: Room 2, made. Twice. He’s “along after this hand.” I’m learning to wait the way you said.'],
      },
    ],
    after: ['Loretta: The dish was good. Four words. I keep them on the shelf with the others. There are no others.'],
    reward: 70,
    people: [
      {
        id: 'sc-loretta',
        name: 'Loretta',
        areaId: 'sc-outskirts',
        col: 21,
        row: 6,
        lines: ['Loretta: Room 2 is made. Always made. Tell him if you see him.'],
        look: { hair: '#b8b4ac', hairStyle: 'bun', garment: 'cardigan', garmentColor: '#6a8a6a' },
      },
    ],
  },
  // Shape: a chip delivery. An urn to a sign, and the last chip out of the cage.
  {
    id: 'errand-dennis',
    where: 'the Smoker, outside the Silver Creek casino',
    title: 'Dennis, one more time',
    cityId: 'silverCreek',
    about: 'The Smoker’s oldest friend wanted to be scattered at the last sign before the highway lets go, and his last chip given back.',
    client: 'sc-smoker',
    clientName: 'Smoker',
    ask: [
      'Smoker: You. New face. Sit. Not literally.',
      'Smoker: My friend Dennis passed in March. Forty years at this casino, mostly at the bar. Lou Brannigan took everything he had at the back table in ’96, and Dennis said it was the best hand he ever lost.',
      'Smoker: His will says to scatter him at the mile sign on Reservation Road. “So the last thing that ever told me not to go further is the last thing I see.”',
      'Smoker: I can’t do it. I’d cry on the highway and somebody would honk. Here — the urn. Read it to him. He liked being told.',
      'Smoker: Then the cage. Dennis left one chip with the cashier the night Lou cleaned him out. “Hold it till I’m ready.” Bring it back. A hundred dollars, his, “to whoever carries me.”',
    ],
    hint: ['Smoker: The mile sign, on the road. Read it to him. Then the cashier in the casino, for his chip.'],
    legs: [
      {
        poi: 'road-sc-sign',
        todo: 'Take Dennis to the mile sign on Reservation Road.',
        lines: [
          'You hold the urn up to the sign. SILVER CREEK 2 MI. Underneath, scratched in: AND NOT ONE MILE FURTHER.',
          'You read it out. Twice, in case he missed it.',
          'A truck goes by and honks. You decide Dennis would have wanted that.',
          'The wind does the rest.',
        ],
      },
      {
        poi: 'sc-cashier',
        speaker: 'Cashier',
        todo: 'Collect Dennis’s last chip from the cashier in the casino.',
        lines: [
          'Cashier: Dennis. Dennis’s chip. I’ve had it in an envelope since ’96. A black one, a hundred dollars, and a lipstick kiss that isn’t mine.',
          'Cashier: The house would have had to cash it. I never could. A chip like that isn’t money, it’s a promise someone didn’t keep to himself.',
          'Cashier: Take it. Tell the Smoker I kept it flat.',
        ],
      },
    ],
    finish: [
      'Smoker: Did a truck honk? …He’d have loved that. And the chip. Flat.',
      'The Smoker turns it over and over, then presses it into your palm, closes your fingers on it.',
      'Smoker: A hundred, like he said. Go on. Lose it slowly. He’d say spread it over a few hands. And never bet it all on a pair of fours.',
    ],
    after: ['Smoker: I told Dolores about the sign. She’s speaking to me again. We’re not discussing the blue chair.'],
    reward: 100,
    people: [],
  },

  // --- Riverbend Landing ---------------------------------------------------
  // Shape: a stand-off in the street. The cake goes past Cass’s runner.
  {
    id: 'errand-dutch',
    where: 'his houseboat at Muddy Bend, south off River Road',
    title: 'Lemon sponge, no questions',
    cityId: 'riverbend',
    about: 'Cass’s collector can’t be seen buying his mother a birthday cake, or carrying one past Cass’s runner.',
    client: 'rb-dutch',
    clientName: 'Dutch',
    ask: [
      'Dutch: Don’t. Don’t say it. I know what I am. I’m the man in the yellow slicker.',
      'Dutch: It’s my mum’s birthday. Eighty-one. She lives on this houseboat, and she believes I work in river logistics.',
      'Dutch: I need a cake. The diner does a lemon sponge. If I walk in there in this slicker, Deb tells the boat, and a man half the Landing owes money to cannot be seen buying a lemon sponge.',
      'Dutch: And Cass has a runner on the street. He’ll ask what it’s for. Say whatever you like. Two hundred, and I won’t know your face for a few days. In a manner of speaking.',
    ],
    hint: ['Dutch: Lemon sponge. The diner. Then past Cass’s runner on the street. Say it with conviction.'],
    legs: [
      {
        poi: 'riverbend-diner',
        speaker: 'Server',
        todo: 'Buy a lemon sponge at the diner, and say it is for you.',
        lines: [
          'Server: A whole lemon sponge. For you. By yourself.',
          'Server: …It’s Dutch’s mum’s birthday, isn’t it. He comes every year at dawn and stands outside pretending to look at a lamp post.',
          'Server: We write Happy Birthday Mum on it. He cries. Don’t tell him I told you.',
        ],
      },
      {
        poi: 'rb-runner',
        speaker: 'Runner',
        todo: 'Get the cake past Cass’s runner on the street.',
        lines: [
          'Runner: That’s a very large cake. Cass’s rule: nobody on this street carries a cake that size unless someone died or someone’s paying.',
          'Runner: Who’s it for?',
        ],
        choice: {
          speaker: 'Runner',
          prompt: 'Who is the cake for?',
          options: [
            { label: 'Me. Sweet tooth.', lines: ['Runner: Fine. Whole thing. In the street. At this hour. I’ll tell Cass you’re unwell.'] },
            {
              label: 'Dutch’s mum, it’s her birthday',
              flag: 'errandDutchTold',
              lines: ['Runner: Dutch has a mum? …Eighty-one? The man in the slicker? Tell nobody I got a bit misty. Cass will want to send something.'],
            },
          ],
        },
      },
    ],
    finish: [
      'Dutch: Lemon sponge. Frosted. “Happy Birthday Mum.” …Hell.',
      'A voice from inside the boat: “Is that my boy?”',
      'Dutch: Coming, Mum! Logistics! …Two hundred. Go. And thank you. If I’m hunting you next week I’ll feel bad about it for about a minute.',
    ],
    variants: [
      {
        flag: 'errandDutchTold',
        todo: 'Go back to Dutch. Cass’s runner has been told; Cass has sent a card.',
        reward: 250,
        finish: [
          'Dutch: Lemon sponge. Frosted. And a card — from Cass. She sent flowers. To my mum. Cass has never sent anyone flowers.',
          'Dutch: You told her runner. I could be angry. I’m holding a card with a violet on it. Two-fifty, from Cass; she says it’s the cake budget.',
          'Dutch: She wants me gentle for the week. I have never once been gentle.',
        ],
        after: ['Dutch: Cass is “checking on Mum.” Every day. I’m not allowed to be scary till Friday. I might ask for a transfer.'],
      },
    ],
    after: ['Dutch: Mum says hello. She asks if you’re eating. Say you’re eating.'],
    echoes: [
      { poi: 'riverbend-diner', speaker: 'Server', lines: ['Server: Dutch’s mum came in for a second sponge. Said her boy brought the first “from a friend.” She’s a sharp one, that woman.'] },
    ],
    reward: 250,
    defaultReward: 200,
    people: [
      {
        id: 'rb-dutch',
        name: 'Dutch',
        areaId: 'rb-outskirts',
        col: 4,
        row: 6,
        lines: ['Dutch: Mum says hello. She asks if you’re eating. Say you’re eating.'],
      },
    ],
  },
  // Shape: a debt owed TO the client, collected two ways. Chips, a witness, and a bluff.
  {
    id: 'errand-sal',
    where: 'the old ferry deck at Muddy Bend, south off River Road',
    title: 'Sal is owed',
    cityId: 'riverbend',
    about: 'Sal won a coin flip against the riverboat dealer and has never been paid.',
    client: 'rb-sal',
    clientName: 'Sal',
    ask: [
      'Sal: Don’t look at the water. Look at me. I want a witness, not a fisherman.',
      'Sal: Tuesday. I flipped the dealer on the riverboat for three hundred. Heads. I won. Fair and square.',
      'Sal: He says the coin was a button. It has been a button since 1998, and he’s never once complained when it came up his way.',
      'Sal: The fisher on the dock saw the flip. Get him to say heads. Then the dealer: get the money. Count it, or lean on it. You play poker — you know how that goes. Half to you.',
    ],
    hint: ['Sal: The fisher on the street, who saw it. Then the riverboat dealer. Count it, or lean on it.'],
    legs: [
      {
        poi: 'rb-fisher',
        speaker: 'Fisher',
        todo: 'Ask the fisher on the dock what he saw of Sal’s coin flip.',
        lines: [
          'Fisher: The flip? I saw it. The button went up, the button came down, and it landed on its edge for four full seconds.',
          'Fisher: Then it fell heads. I’d swear on any bait you like. Tell Sal I said so. Tell the dealer too.',
        ],
      },
      {
        poi: 'riverboat-dealer',
        speaker: 'Dealer',
        todo: 'Collect Sal’s three hundred from the riverboat dealer.',
        lines: [
          'Dealer: Sal sent you. A button doesn’t count. A flip with a button isn’t a bet. It’s a gesture.',
          'The dealer is stacking chips a little too neatly. He has been stacking since you walked in. You have seen this before, across a lot of felt.',
          'Dealer: …Fine. I’m not saying I owe him. I’m saying hypothetically.',
        ],
        choice: {
          speaker: 'Dealer',
          prompt: 'How do you collect?',
          options: [
            {
              label: 'Count it out, slowly',
              lines: [
                'You count the stack out loud. You do not stop. By the third row he is sweating. By the fifth, the three hundred is on the felt.',
                'Dealer: Tell him the house is closed to buttons.',
              ],
            },
            {
              label: 'Mention Cass’s interest',
              flag: 'errandSalBluffed',
              lines: [
                'Dealer: Cass? …Cass has an interest in a button? Here. Here. Take it, don’t say my name, don’t say hers.',
                'The money is on the felt before you’ve finished the sentence. Cass has no interest at all. It was a bluff, and he folded.',
              ],
            },
          ],
        },
      },
    ],
    finish: [
      'Sal pulls the money toward himself with both hands. Three hundred. Heads.',
      'Sal: I was right. About a button. I haven’t been right since 1993. Half is yours, as promised. Spend it before I remember what I owe.',
    ],
    variants: [
      {
        flag: 'errandSalBluffed',
        todo: 'Go back to Sal. You used Cass’s name; he will not like it.',
        reward: 100,
        finish: [
          'Sal counts the money. Then he counts the number of times you must have said the name. His face goes slowly white.',
          'Sal: You said CASS? To the dealer? Cass has no idea about the button. Cass is going to ask why the dealer’s been talking about her.',
          'Sal: A hundred. Take it and go, before the dealer asks around. The rest I need for a boat. I’m going fishing. For nothing. Possibly abroad.',
        ],
        after: ['Sal: I am a fisherman. I am fishing for nothing, quietly, in another county. Have you seen Cass? Don’t tell me.'],
      },
    ],
    after: ['Sal: Three hundred, and heads. Best Tuesday of my life. The button’s under my pillow now.'],
    reward: 150,
    people: [
      {
        id: 'rb-sal',
        name: 'Sal',
        areaId: 'rb-outskirts',
        col: 21,
        row: 6,
        lines: ['Sal: What fish? There are no fish here. I am a fisherman and I am fishing for nothing.'],
      },
    ],
  },
  // Shape: a long afternoon. Bait, then the river, then a ring that was already a lesson.
  {
    id: 'errand-cornelius',
    where: 'the bank at Muddy Bend, south off River Road',
    title: 'Never bet it',
    cityId: 'riverbend',
    about: 'An old man bet his late wife’s ring against a catfish forty years ago.',
    client: 'rb-cornelius',
    clientName: 'Cornelius',
    ask: [
      'Cornelius: Mind the line. Forty years ago on this bank I bet Margaret’s ring against the river that I’d land the big catfish before dark. The river kept the ring. The catfish kept the bet.',
      'Cornelius: Margaret said, “You’re an idiot, Cornelius.” She was right. Six years gone now. I think about that ring less than I should and more than I admit.',
      'Cornelius: Big Betty is still down there. I swear she has it. She has the look.',
      'Cornelius: Mabel’s bait stand sells the only bait Betty respects: Nightcrawler Deluxe. Then cast off the bank, by the reeds. Be patient. I’m too old to be patient and too stubborn to be old.',
    ],
    hint: ['Cornelius: Nightcrawler Deluxe from Mabel. Cast it at the reeds, in daylight. Patience.'],
    legs: [
      {
        poi: 'rb-mabel',
        speaker: 'Mabel',
        todo: 'Buy Nightcrawler Deluxe from Mabel.',
        lines: [
          'Mabel: Nightcrawler Deluxe, for Cornelius. Seventh time I’ve sold it for him. Betty’s never bitten.',
          'Mabel: She’s sixty if she’s a day. Knows every bait there is. Give her something she doesn’t expect — I sing to her, myself.',
        ],
      },
      {
        poi: 'rb-reeds',
        periods: DAYLIGHT,
        closed: ['Cornelius: (calling from up the bank) Not in the dark! Betty only bites by daylight. Any hour before night, and bring the patience.'],
        todo: 'Cast the line off the bank by the reeds, and wait.',
        lines: [
          'You cast the line. The river is a long afternoon.',
          'You sing a little, as advised. The river takes no notice.',
          'Then the rod bends double. It takes both arms. Out of the brown water comes Big Betty, the size of a Labrador, looking at you with enormous contempt.',
          'She coughs. Something small and gold lands in the mud. A ring. Engraved inside: “M. + C. — Never bet it.”',
        ],
        then: WAIT,
      },
    ],
    finish: [
      'Cornelius: …“Never bet it.” She wrote that. She wrote it, and I bet it anyway.',
      'Cornelius: Take this. Not for the ring — you can’t pay for a ring. For the afternoon. Two hundred and twenty. Margaret would say I’m overpaying.',
      'Cornelius: Captain Marsh says the river keeps what you wager it. She’s wrong, once a lifetime. She’d be furious.',
    ],
    after: ['Cornelius: I keep it on a string, round my neck. Betty and I have an understanding now. I do not bet. She does not bite.'],
    reward: 220,
    people: [
      {
        id: 'rb-cornelius',
        name: 'Cornelius',
        areaId: 'rb-outskirts',
        col: 15,
        row: 9,
        lines: ['Cornelius: Betty and I are in the middle of a conversation. Stay out of it.'],
      },
      {
        id: 'rb-mabel',
        name: 'Mabel',
        areaId: 'rb-outskirts',
        col: 10,
        row: 6,
        lines: ['Mabel: Bait, tackle, advice. The bait is cheap. The advice is mostly about men.'],
      },
      {
        id: 'rb-reeds',
        name: 'Reeds',
        areaId: 'rb-outskirts',
        col: 17,
        row: 11,
        thing: true,
        art: 'none',
        lines: ['The water is brown, slow and very quiet. Something large is thinking about you. (It only bites by day.)'],
      },
    ],
  },

  // Shape: a pot-odds quiz. One question to learn the price, a second to use it.
  {
    id: 'errand-quiz',
    where: 'the bank at Muddy Bend, south off River Road',
    title: 'Wick’s pot-odds quiz',
    cityId: 'riverbend',
    about: 'An old fisher quizzes anyone who’ll stand still on pot odds, and has the boat’s bar and wheel ask the questions.',
    client: 'rb-wick',
    clientName: 'Wick',
    ask: [
      'Wick: You play at the boat? Everyone who plays at the boat has lost to a price they never worked out.',
      'Wick: I teach it with a bobber. Two questions: the bartender on the boat asks one, the roulette man the other. Answer plainly. A small fee for the lesson.',
      'Wick: Captain Marsh plays the same way I fish: by the price. She will not forgive you if you ignore it.',
    ],
    hint: ['Wick: The bartender on the boat, then the roulette wheel. Price first. Then what you hold against it.'],
    legs: [
      {
        poi: 'rb-tiny-watcher',
        speaker: 'Bartender',
        todo: 'Answer the bartender’s question for Wick on the riverboat.',
        lines: ['Bartender: Wick’s first. The pot is a hundred. A man bets fifty into it. You must call fifty. What are your pot odds?'],
        choice: {
          speaker: 'Bartender',
          prompt: 'The pot is $100, he bets $50. Your pot odds?',
          options: [
            { label: '2 to 1', lines: ['Bartender: Close, and wrong. His fifty goes in the pot first: a hundred and fifty, for your fifty.'] },
            { label: '3 to 1', flag: 'errandQuizOdds', lines: ['Bartender: Three to one. Fifty to win a hundred and fifty. That means you need to win more than one time in four.'] },
            { label: '1 to 3', lines: ['Bartender: That’s the same ratio the wrong way up. You call fifty to win a hundred and fifty: three to one.'] },
          ],
        },
      },
      {
        poi: 'rb-roulette',
        speaker: 'Croupier',
        todo: 'Take Wick’s second question to the roulette wheel.',
        lines: [
          'Croupier: Second one, and it’s the one that costs money. Same bet: a hundred in, he puts in fifty.',
          'Croupier: You hold four hearts. Nine hearts left in forty-six cards, and one card to come. A bit under one time in five.',
        ],
        choice: {
          speaker: 'Croupier',
          prompt: 'Call fifty to win a hundred and fifty, with a flush draw and one card to come?',
          options: [
            { label: 'Call', lines: ['Croupier: You need to win one in four to break even. You win about one in five. The call loses a little each time.'] },
            {
              label: 'Fold',
              flag: 'errandQuizRight',
              lines: ['Croupier: A little under one in five against the one in four you need. Fold, unless he’ll pay you off later. Wick will say so, loudly.'],
            },
            { label: 'Raise', lines: ['Croupier: Raising a draw can work, but not on this price. You’d be putting in more to win the same one-in-five.'] },
          ],
        },
      },
    ],
    finish: [
      'Wick: Not the fold. Well. A draw is a gift when the price is right, and the price was not.',
      'Wick: Forty for the lesson. I owe the river forty more.',
    ],
    variants: [
      {
        flag: 'errandQuizRight',
        reward: 60,
        finish: [
          'Wick: You folded a flush draw. Nobody folds a flush draw. It is beautiful, and it is the right play.',
          'Wick: Sixty. When you take a seat at the boat, listen for Pearl. She has been waiting to say a thing to somebody.',
        ],
        after: [
          'Wick: A quarter of the time, you need. You folded when you had a fifth. I tell everyone. Nobody folds.',
          'Wick: Mind you, it is not always a fold. With money still to come, a draw is worth more. But you knew the price.',
          'Wick: That is the whole of it. The price, and the honesty to say what you hold.',
        ],
        bossAfter: [
          'Wick: Captain Marsh is beaten, I hear. By the price?',
          'Wick: You folded a draw you loved because the price was wrong. She hates that. Of course she lost.',
        ],
        todo: 'Go back to Wick. You folded the draw, and he will want to say so.',
      },
      {
        flag: 'errandQuizOdds',
        reward: 50,
        finish: [
          'Wick: Three to one, first time. You had the price. Then you let the draw talk you out of it.',
          'Wick: Fifty. Half the lesson is knowing the price. The other half is doing what it says.',
        ],
        after: [
          'Wick: You knew the price and not what to do with it. It is where most people live.',
          'Wick: One in four is what three to one needs. Count your outs and then count them again before you call.',
        ],
        bossAfter: ['Wick: Captain Marsh is beaten, and you only half learned the price. Imagine if you had learned the rest.'],
        todo: 'Go back to Wick. You had the price, but not the play.',
      },
    ],
    defaultReward: 40,
    after: ['Wick: A play that loses a little each time is how a roll leaks. It is the slowest way to go broke. Come back, and I will ask another.'],
    bossAfter: ['Wick: Captain Marsh is beaten, I hear. However you did it, you did it. Keep the price in your head.'],
    reward: 60,
    people: [
      {
        id: 'rb-wick',
        name: 'Wick',
        areaId: 'rb-outskirts',
        col: 24,
        row: 2,
        lines: ['Wick: A bobber is a pot. The fish is the call. Do not say that to anyone; it sounds better in my head.'],
        look: { hat: 'cap', hatColor: '#6a5a3a', hair: '#c8c8cc', hairStyle: 'short' },
      },
    ],
  },


  // --- Crescent Harbor -----------------------------------------------------
  // Shape: a trade at the pawn counter, and a song instead of money.
  {
    id: 'errand-busker',
    where: 'the Busker, on Harbor Boulevard',
    title: 'The accordion in the window',
    cityId: 'crescentHarbor',
    about: 'The Busker pawned his accordion to buy into a heads-up game with Vance, and the pawnbroker wants a song, not money.',
    client: 'ch-busker',
    clientName: 'Busker',
    ask: [
      'Busker: Hat money? No. Different problem.',
      'Busker: I don’t play for the hat. I play for the accordion. I pawned her at the Gull & Anchor on the Fish Pier to buy into the heads-up table against Vance. Vance folded the winning hand. Folded it. The man’s a ghost.',
      'Busker: A busker without an instrument is a man shouting at a harbour. Take my ticket. The pier’s off the Coast Road, west of the Boulevard — there’s a path down through the quay.',
      'Busker: The pawnbroker won’t take cash for her. Never has. He wants a verse. Sing him the last one of the ballad. Three-fifty when she’s back.',
    ],
    hint: ['Busker: Gull & Anchor, on the Fish Pier. Off the Coast Road. Ticket four-four-seven-one. He wants the last verse.'],
    legs: [
      {
        poi: 'ch-pawn',
        speaker: 'Pawnbroker',
        todo: 'Collect the Busker’s accordion from the Gull & Anchor on the Fish Pier, in exchange for a verse.',
        lines: [
          'Pawnbroker: Ticket four-four-seven-one. The accordion. She plays herself at night, you know. Quietly. In the back. It’s unsettling.',
          'Pawnbroker: Loan was eighty. I don’t want eighty. I want the last verse of the “Ballad of the Kind Stranger.” The one about pot odds.',
          'You sing it, badly, to a room of other people’s worst nights. The pawnbroker wipes an eye with a ticket stub.',
          'Pawnbroker: Mr. Bellamy’s doorman borrowed her once, for a private game, and she ate his whole evening. Go on. She’s been wanting to go home.',
        ],
      },
    ],
    finish: [
      'Busker: Oh, you beauty. Come here.',
      'The Busker plays a chord. A small crowd forms, then evaporates, as small crowds do.',
      'Busker: Three-fifty. That’s a night’s hat and tomorrow’s. And a song: “Ballad of the Kind Stranger.” Fourteen verses. The last is about pot odds.',
    ],
    after: ['Busker: The song’s going well. Someone put a fiver in the hat. Possibly in error. I’m not asking.'],
    reward: 350,
    people: [
      {
        id: 'ch-pawn',
        name: 'Pawnbroker',
        areaId: 'ch-outskirts',
        col: 4,
        row: 6,
        lines: ['Pawnbroker: Everything in here is somebody’s worst night.'],
        role: 'clerk',
      },
    ],
  },
  // Shape: a vigil, and a stranger who needs an answer. What you say decides what Fenn gets.
  {
    id: 'errand-fenn',
    where: 'the Breakwater Light, end of the Fish Pier, south off the Coast Road',
    title: 'Keep a lookout',
    cityId: 'crescentHarbor',
    about: 'The keeper of the Breakwater Light owes Mr. Emeka and wants someone on watch for Abel.',
    client: 'ch-fenn',
    clientName: 'Captain Fenn',
    ask: [
      'Fenn: Ahoy. You have the face of a person with a spare evening.',
      'Fenn: Forty years I’ve kept this light. I take bets on the tide table off the fishermen, and lately they’ve been winning, because the tide table I wrote is mostly in my head.',
      'Fenn: Mr. Emeka was kind enough to stake me. Abel has been seen on the quay. He doesn’t run, Abel. He walks. Slowly. It’s worse.',
      'Fenn: Stand watch at the end of the pier while I count what I’ve got. If a tall man in a long grey coat comes along the quay, whistle. Four-fifty for your evening.',
    ],
    hint: ['Fenn: The end of the pier, by day. Grey coat. Whistle if you’re any good. Do what you must if you’re not.'],
    legs: [
      {
        poi: 'ch-lookout',
        periods: DAYLIGHT,
        closed: ['Fenn: (from the lamp room) Come off the pier, you’ll see nothing out there. Abel walks the quay by day. Stand watch any hour before night.'],
        todo: 'Stand watch at the end of the pier.',
        lines: [
          'You take the post at the end of the pier. A gull lands on a bollard and looks at you like a supervisor.',
          'The tide turns. The light comes on over your head, slow and grand, and a little embarrassed about it.',
          'At dusk a tall man in a long grey coat comes along the quay. Unhurried. Hat in his hands. He is looking for Fenn, and he is looking at you.',
        ],
        choice: {
          speaker: 'Abel',
          prompt: 'Abel asks: “Is the Captain in?”',
          options: [
            {
              label: 'Whistle',
              lines: ['You whistle. Abel stops, looks at you for a long time, then at the light, and walks slowly back the way he came.'],
            },
            {
              label: 'Point him to the light',
              cash: 150,
              flag: 'errandFennPointed',
              lines: ['Abel: Thank you. That is the kind of help a man remembers. For you, a little. For the Captain, a conversation.'],
            },
          ],
        },
        then: WAIT,
      },
    ],
    finish: [
      'Fenn: Abel’s been and gone. I heard the whistle, or I heard a man thinking about one.',
      'Fenn: I’ve counted it twice. Four-fifty, and some of it was in my boot. It’s yours. I’ll pay Mr. Emeka the old-fashioned way: late.',
    ],
    variants: [
      {
        flag: 'errandFennPointed',
        todo: 'Abel has found Fenn. Go back to see what is left.',
        reward: 250,
        finish: [
          'Fenn is sitting very straight on the lamp-room stair. He has a grey coat’s worth of conversation on his face.',
          'Fenn: He found me. We had a talk. He did most of it. He took the tide table and half the boot, and he left me my light.',
          'Fenn: Two-fifty is what he didn’t find. You pointed. Some days a man needs a thing pointed. Mr. Emeka will hear about this; Abel is very correct.',
        ],
        after: [
          'Fenn: Abel stops by on Thursdays now. We watch the tide. He does not say what he’s thinking. I have not asked.',
          'Fenn: I owe Mr. Emeka a little less every week, and Abel a little more of my evenings. It is not a bad exchange. It is a quiet one.',
          'Fenn: The whistle would have been cheaper. But then I would not know that Abel likes the light.',
        ],
      },
    ],
    after: ['Fenn: The light is on, the tide is in, and nobody has asked me for money today. A good day. A whistle did that.'],
    reward: 450,
    people: [
      {
        id: 'ch-fenn',
        name: 'Captain Fenn',
        areaId: 'ch-outskirts',
        col: 24,
        row: 6,
        lines: ['Fenn: The light is on, the tide is in, and nobody has asked me for money today. A good day.'],
        look: { hat: 'cap', hatColor: '#2a3a5a', hair: '#d8d8dc', hairStyle: 'short' },
      },
      {
        id: 'ch-lookout',
        name: 'Pier End',
        areaId: 'ch-outskirts',
        col: 19,
        row: 6,
        thing: true,
        lines: ['The end of the Fish Pier. Water on three sides and a long way back to anywhere. A lookout is a daytime job.'],
      },
    ],
  },
  // Shape: read a tell. The maître d’ lies by tugging his cuff, and you have to see it.
  {
    id: 'errand-odalys',
    where: 'her fish stall on the Fish Pier, south off the Coast Road',
    title: 'The napkin behind the bar',
    cityId: 'crescentHarbor',
    about: 'A fishmonger on the pier was Hal’s first student, and left her best work on a napkin the maître d’ will not hand over straight.',
    client: 'ch-odalys',
    clientName: 'Odalys',
    ask: [
      'Odalys: Mackerel, forty a pound. …You’re not here for mackerel. You have the look of someone Hal would sell a lesson to.',
      'Odalys: He taught me first. Before Nadia. Before anyone. I was good. Then I wasn’t, and I walked out onto this pier and stayed.',
      'Odalys: The night I understood pot odds I wrote the formula on a cocktail napkin at the Bellweather. The maître d’ framed it. It’s the only thing I ever wrote that was entirely right.',
      'Odalys: Bring it to me. He’ll try a trick; he has a copy made. He tugs his left cuff when he lies. He has since the Bellweather opened. Watch the cuff.',
    ],
    hint: ['Odalys: The Bellweather, the maître d’. A napkin, in a frame. Watch his left cuff.'],
    legs: [
      {
        poi: 'crescent-supper',
        speaker: 'Maître d’',
        todo: 'Ask the Bellweather’s maître d’ for Odalys’s napkin, and watch his left cuff.',
        lines: [
          'Maître d’: Madam Odalys’s napkin. Behind glass, with its own little light. Nobody has touched it in nineteen years.',
          'Maître d’: She should have it, of course. Mr. Bellamy’s table sends over a bottle every time the pot odds come out right. I have a reputation.',
          'He lays two framed napkins on the lectern, side by side. Identical, down to the wine ring.',
          'Maître d’: The original is the one on the left. I’d stake the house on it. (His left cuff gets a small, quick tug.)',
        ],
        choice: {
          speaker: 'Maître d’',
          prompt: 'Which napkin is the original?',
          options: [
            { label: 'The left one', lines: ['Maître d’: Of course. Wrapped, with the Bellweather’s compliments. Safe journey.'] },
            {
              label: 'The right one',
              flag: 'errandSawTheTell',
              lines: [
                'The maître d’ goes very still. Then, with a face like a man laying down a flush he never meant to show:',
                'Maître d’: …The right. Yes. You have an eye, madam. Take it. Don’t tell the fishmonger it was a test.',
              ],
            },
          ],
        },
      },
    ],
    finish: [
      'Odalys holds it to the light and turns it over, and tuts.',
      'Odalys: Copy. “Pot” has an extra t. He tugged the cuff, didn’t he. You took the left, I take it.',
      'Odalys: Still — three hundred. For the trip, and for being a person who believes a man in a waistcoat. Learn the cuff. Next time you’ll have it.',
    ],
    variants: [
      {
        flag: 'errandSawTheTell',
        todo: 'Take Odalys the real napkin.',
        reward: 500,
        finish: [
          'Odalys reads it with her lips moving, as she must have read it at nineteen.',
          'Odalys: “Fold = never enough.” I meant that as a joke. I was nineteen. It’s the most honest thing I’ve ever said about this game.',
          'Odalys: You saw the cuff. Good. Five hundred — not for the napkin, for the read. It’s the only thing I ever sold that I would sell again.',
        ],
        after: ['Odalys: Take the napkin back to the Bellweather when I’m done. Tell Hal the mackerel’s fresh. And tell him you saw the cuff.'],
      },
    ],
    defaultReward: 300,
    after: ['Odalys: Mackerel. And a lesson, if you want it: never bet money you’re emotionally attached to. Or a man who tugs his cuff.'],
    echoes: [
      { poi: 'crescent-supper', speaker: 'Maître d’', flag: 'errandSawTheTell', lines: ['Maître d’: Madam Odalys’s napkin is out of its frame. The wall looks very bare. I have taken to tugging my right cuff.'] },
      { poi: 'crescent-supper', speaker: 'Maître d’', flag: 'errandSawTheTell', flagSet: false, lines: ['Maître d’: The copy is on my wall, madam; the original is in a fishmonger’s apron. Neither of us will say so.'] },
    ],
    reward: 500,
    people: [
      {
        id: 'ch-odalys',
        name: 'Odalys',
        areaId: 'ch-outskirts',
        col: 12,
        row: 8,
        lines: ['Odalys: Mackerel. And a lesson, if you want it: never bet money you’re emotionally attached to.'],
        look: { hair: '#6a3a2a', hairStyle: 'tied', garment: 'overalls', garmentColor: '#4a6a8a' },
      },
    ],
  },

  // Shape: a coach's notes. Who rebuys, and how he plays after it.
  {
    id: 'errand-coach',
    where: 'the quay, by the pawn trailer, south off the Coast Road',
    title: 'The coach’s notes',
    cityId: 'crescentHarbor',
    about: 'A retired coach wants someone to ask the cardroom about Hollis’s rebuys, and say what it does to a man.',
    client: 'ch-coach',
    clientName: 'Ilse',
    ask: [
      'Ilse: Don’t sit. Stand. Sitting is how people stop paying attention.',
      'Ilse: Wick, up the river in Riverbend, sent word that you can count. I coached Hollis once. He rebuys three times a night, and I want to know what that does to his play.',
      'Ilse: The cashier at the cardroom knows how many times. The barman at the club knows how he plays after. Ask both. Then tell me which of us is right.',
    ],
    hint: ['Ilse: The cashier at the cardroom, for the count. The club’s barman, for the way he plays. Then tell me.'],
    legs: [
      {
        poi: 'ch-cashier',
        speaker: 'Cashier',
        todo: 'Ask the cardroom cashier how many times Hollis rebuys.',
        lines: ['Cashier: Hollis. Three buy-ins, every night, regular as the tide. Sometimes four. I stopped counting; it’s bad for the soul.'],
        choice: {
          speaker: 'Cashier',
          prompt: 'Three buy-ins in a night is…',
          options: [
            { label: 'Bad luck', lines: ['Cashier: Three nights running? Luck doesn’t keep a diary.'] },
            { label: 'Tilt', flag: 'errandCoachTilt', lines: ['Cashier: Tilt. He pays to chase what he lost. The word is old, and so is the habit.'] },
            { label: 'A plan', lines: ['Cashier: A plan, with a man like Hollis? I wish. He buys in to feel something.'] },
          ],
        },
      },
      {
        poi: 'ch-club-barman',
        speaker: 'Barman',
        todo: 'Ask the club’s barman how Hollis plays after a rebuy.',
        lines: [
          'Barman: Hollis? I keep a tally, out of boredom. Before his rebuy, three hands in twenty.',
          'Barman: After the second, eleven in twenty. After the third I stopped counting and started pouring.',
        ],
        choice: {
          speaker: 'Barman',
          prompt: 'After a rebuy, Hollis plays…',
          options: [
            { label: 'Tighter', lines: ['Barman: Tighter? Not once. Watch the man, not the chips.'] },
            { label: 'The same as before', lines: ['Barman: The same? Not on his third buy-in. Not ever.'] },
            { label: 'Looser', flag: 'errandCoachRead', lines: ['Barman: Looser. Wild as a wet cat. You have the right of it.'] },
          ],
        },
      },
    ],
    finish: [
      'Ilse: Not that. Interesting. I shall write it down and be wrong in ink.',
      'Ilse: A hundred. The lesson is that a rebuy is a decision, and Hollis makes it the same way four times.',
    ],
    variants: [
      {
        flag: 'errandCoachRead',
        reward: 150,
        finish: [
          'Ilse: Looser. As I said. The pier will be told, slowly and without gloating.',
          'Ilse: A hundred and fifty. At Hollis’s table, the next time he rebuys, count the pots he enters. It is a quiet gift.',
        ],
        after: [
          'Ilse: Looser after a rebuy. Write it in the margin. I have taught it for twenty years and been believed once.',
          'Ilse: It is the oldest read at the table. A man who has paid twice to be there will pay a third time to be right.',
          'Ilse: Do not exploit it every time. Exploit it once, then go home. That is the whole of discipline.',
        ],
        bossAfter: [
          'Ilse: Mr. Bellamy is beaten. I knew he would fold to somebody who sees a rebuy for what it is.',
          'Ilse: Looser after a loss, tighter after a win. Both are the same weakness. You saw it. That is all coaching ever was.',
        ],
        todo: 'Go back to Ilse. You read Hollis right, and she will want to say so.',
      },
      {
        flag: 'errandCoachTilt',
        reward: 125,
        finish: [
          'Ilse: Tilt. Yes. But you thought he played tighter afterwards; the barman’s tally says otherwise.',
          'Ilse: A hundred and twenty-five. You named the disease and misread the symptom. Half a coach.',
        ],
        after: [
          'Ilse: Tilt is the name. Looser is what it does. Know both and you will see it coming across a table.',
          'Ilse: You had one half. It is the more useful half to be missing, oddly; the other half is just counting.',
        ],
        bossAfter: ['Ilse: Mr. Bellamy is beaten. You knew the name of the thing. Next time, learn how it looks.'],
        todo: 'Go back to Ilse. You named the tilt, but misread what it does.',
      },
    ],
    defaultReward: 100,
    after: ['Ilse: You were wrong about him, and I am right, and the money is still the money. Watch his third buy-in at the table yourself.'],
    bossAfter: ['Ilse: Mr. Bellamy is beaten, I hear. A boss is only a Hollis with a better coat.'],
    reward: 150,
    people: [
      {
        id: 'ch-coach',
        name: 'Ilse',
        areaId: 'ch-outskirts',
        col: 5,
        row: 10,
        lines: ['Ilse: Stand up straight. A slump is a tell. So is a straight back. Pick one and commit.'],
        look: { hair: '#8a8a94', hairStyle: 'bun', garment: 'jacket', garmentColor: '#3a4a5a' },
      },
    ],
  },


  // --- Palm Cay ------------------------------------------------------------
  // Shape: a two-person shuttle with a hard conversation at the end of it.
  {
    id: 'errand-chad',
    where: 'the beach hut at Lagoon Beach, south off the Palm Cay road',
    title: 'The second honeymoon',
    cityId: 'palmCay',
    about: 'A sunburned honeymooner tipped his wife’s ring to a waiter; Bernard thought it was a chip, and she is not speaking to him.',
    client: 'pc-chad',
    clientName: 'Chad',
    ask: [
      'Chad: Don’t touch me. I’m burned. It isn’t the sun, it’s the shame.',
      'Chad: Brenda and I came for our second honeymoon. I played the Tourist Table once. Once. I thought tipping with her ring was a matter of style.',
      'Chad: Bernard was across the felt. Two days he’s been sitting there, and he thinks it’s Thursday. He took the ring, he bought lobster at the grill, and he tipped it. The waiter has it. Probably.',
      'Chad: Brenda’s in the hut. Not speaking to me through a very thin wall. Bring it to her yourself. I can’t. Six hundred when she’s speaking again.',
    ],
    hint: ['Chad: The grill. The waiter. Then Brenda, by the hut. Please be kind to me. Bernard said it was Thursday.'],
    legs: [
      {
        poi: 'palmcay-grill',
        speaker: 'Waiter',
        todo: 'Get the ring back from the waiter at the grill.',
        lines: [
          'Waiter: A ring? Mr. Bernard left it as a tip. He said, “Keep the chip.” He said it was Thursday.',
          'Waiter: It has been Thursday here for three days. I put it in the salt shaker for safekeeping.',
          'Waiter: Miss Calloway heard about it. She says the honeymoon’s on the house, every night they’re here. The lady should have the ring and the lobster.',
        ],
      },
      {
        poi: 'pc-brenda',
        speaker: 'Brenda',
        todo: 'Take the ring to Brenda, on the beach beside the hut.',
        lines: [
          'Brenda: He sent you. Of course he sent you. He can’t even do the one thing.',
          'You hold out the salt shaker. She shakes it and a ring falls out into her palm. It is slightly crunchy.',
          'Brenda: …It’s crunchy.',
        ],
        choice: {
          speaker: 'Brenda',
          prompt: 'Brenda asks: “Whose fault was it?”',
          options: [
            { label: 'Chad’s very sorry', lines: ['Brenda: Is he. Good. He should be. He can sweat for the rest of the afternoon, and then I’ll tell him.'] },
            {
              label: 'Bernard’s. It was Thursday.',
              flag: 'errandBlamedBernard',
              lines: ['Brenda: Bernard. The man who thinks it’s Thursday. I see. Well, then. I know where to find him.'],
            },
          ],
        },
      },
    ],
    finish: [
      'Chad: She spoke to me. One word. My name. It was the best afternoon of the trip.',
      'Through the hut’s thin wall: “Is it crunchy?” Chad: It’s crunchy, Bren!',
      'Chad: She says she’ll marry me a third time. Six hundred, as promised. It was the honeymoon budget anyway.',
    ],
    variants: [
      {
        flag: 'errandBlamedBernard',
        todo: 'Go back to Chad. Brenda has gone to find Bernard.',
        reward: 480,
        finish: [
          'Chad: She’s gone to the Tourist Table. With a rolling pin. She is sitting across from Bernard right now. It is, he tells her, Thursday.',
          'Chad: She’s marrying me a third time, though. In the spirit of it. And suing Bernard for the honeymoon budget. Four-eighty is what she’s left me.',
          'Chad: I don’t know whether to thank you. I’m going to. Thank you.',
        ],
        after: ['Chad: Bernard has agreed it’s Friday. Brenda says that’s a start. We’re renewing our vows on it.'],
      },
    ],
    after: ['Chad: We’re renewing our vows on Thursday. Bernard says it’s Thursday. I’m choosing to believe him.'],
    reward: 600,
    people: [
      {
        id: 'pc-chad',
        name: 'Chad',
        areaId: 'pc-outskirts',
        col: 4,
        row: 5,
        lines: ['Chad: We’re renewing our vows on Thursday. Bernard says it’s Thursday. I’m choosing to believe him.'],
      },
      {
        id: 'pc-brenda',
        name: 'Brenda',
        areaId: 'pc-outskirts',
        col: 7,
        row: 5,
        lines: ['Brenda: I am not speaking to him. I am speaking to the sea. The sea is easier.'],
        look: { hair: '#b05a3a', hairStyle: 'long', garment: 'stripes', garmentColor: '#f0c0a0' },
      },
    ],
  },
  // Shape: a stand-off with Mrs. Tran on the beach. Lie, or sell him down the river.
  {
    id: 'errand-pruitt',
    where: 'the dock at Lagoon Beach, south off the Palm Cay road',
    title: 'Provisions for a week at sea',
    cityId: 'palmCay',
    about: 'A commodore of nothing is hiding from his bookie in a dinghy at the end of the dock.',
    client: 'pc-pruitt',
    clientName: 'Commodore Pruitt',
    ask: [
      'Pruitt: Commodore Pruitt, retired. Of nothing. The title is honorary: I won it in a card game from a real commodore.',
      'Pruitt: I owe a woman named Mrs. Tran eleven thousand dollars. Mrs. Tran does not shout. She sends a fruit basket, and the fruit is somehow worse.',
      'Pruitt: I mean to put to sea. A week, perhaps two, until the heat goes. I need provisions from the marina: a crate of the Commodore’s Reserve, three tins of sardines and a flag.',
      'Pruitt: The flag says surrender in a language nobody speaks. I’ll make it worth your while. Twelve hundred. I have it. It’s in the sardines.',
    ],
    hint: ['Pruitt: The marina. Rum, sardines, the flag. Then past Mrs. Tran on the beach. Quietly.'],
    legs: [
      {
        poi: 'marina',
        speaker: 'Dealer',
        todo: 'Get the Commodore’s provisions from the marina.',
        lines: [
          'Dealer: The Commodore’s Reserve again. Third time this month. He has never sailed. He sits in the dinghy at the end of the dock and calls it a campaign.',
          'Dealer: Rum, sardines, flag. The flag says “NOT TODAY” in Latin. He asked for Esperanto. I told him there is no Esperanto for “not today.”',
        ],
      },
      {
        poi: 'pc-tran',
        speaker: 'Mrs. Tran',
        todo: 'Get past Mrs. Tran on the beach with the Commodore’s provisions.',
        lines: [
          'Mrs. Tran: That is a great many sardines for one afternoon. You are carrying them like a man with a secret.',
          'Mrs. Tran: I am looking for a Commodore. Eleven thousand dollars’ worth. I have brought him pears.',
        ],
        choice: {
          speaker: 'Mrs. Tran',
          prompt: 'Where is the Commodore?',
          options: [
            {
              label: 'Never heard of him',
              lines: ['Mrs. Tran: You lie like a man who has played a great deal of poker. Badly. I will see myself down to the dock.'],
            },
            {
              label: 'End of the dock. Sorry.',
              cash: 300,
              flag: 'errandPruittSold',
              lines: ['Mrs. Tran: Thank you. A finder’s fee. Never say I was not fair.'],
            },
          ],
        },
      },
    ],
    finish: [
      'Pruitt: Provisions! A week at sea! The sardines, I see, have a hundred-dollar bill in each tin.',
      'Pruitt looks at the six feet of lagoon between the dock and the shore.',
      'Pruitt: We’ll sail tomorrow. Tide’s wrong.',
      'Down the beach, a small woman in white waves, holding a fruit basket.',
      'Pruitt: Oh no. She’s brought pears. Take the twelve hundred and go. I’m going down with my ship. It’s a dinghy.',
    ],
    variants: [
      {
        flag: 'errandPruittSold',
        todo: 'Mrs. Tran is on her way to the dock. Go back to the Commodore.',
        reward: 720,
        finish: [
          'Pruitt is sitting in the dinghy with his flag up. Mrs. Tran is sitting on the dock with her basket, six feet away. They are both very polite.',
          'Pruitt: You told her. I see. Well. The sardines were never going to get me out of the lagoon.',
          'Pruitt: Seven-twenty. She took the rest as a deposit. We’re discussing terms. There’s a pear. It is surprisingly all right.',
        ],
        after: [
          'Pruitt: Mrs. Tran has agreed to a payment plan. Eleven thousand in small, fruit-shaped instalments. The campaign continues.',
          'Pruitt: She visits on Sundays with the pears and a ledger. I have learned the ledger is mostly poetry.',
          'Pruitt: I resent you slightly, and I have never felt so solvent. Both are true.',
        ],
      },
    ],
    after: ['Pruitt: Day nine of the campaign. Morale is high. Morale is a dinghy. The flag still says NOT TODAY.'],
    echoes: [
      { poi: 'marina', speaker: 'Dealer', lines: ['Dealer: The Commodore’s dinghy has not moved. He has stopped calling it a campaign. It’s a “position” now.'] },
    ],
    reward: 1200,
    people: [
      {
        id: 'pc-pruitt',
        name: 'Commodore Pruitt',
        areaId: 'pc-outskirts',
        col: 9,
        row: 10,
        lines: ['Pruitt: Day nine of the campaign. Morale is high. Morale is a dinghy.'],
        look: { hat: 'cap', hatColor: '#f0f0f0', hair: '#d8d8dc', hairStyle: 'short' },
      },
      {
        id: 'pc-tran',
        name: 'Mrs. Tran',
        areaId: 'pc-outskirts',
        col: 21,
        row: 5,
        lines: ['Mrs. Tran: I shall wait. The pears will not.'],
        look: { hair: '#1a1a1a', hairStyle: 'bun', garment: 'cardigan', garmentColor: '#f0f0f0' },
      },
    ],
  },

  // Shape: a stakeout. Four hands from the wheel, and the player works out what repeats.
  {
    id: 'errand-stakeout',
    where: 'the shade of the palms at Lagoon Beach, south off the Palm Cay road',
    title: 'The collar',
    cityId: 'palmCay',
    about: 'A card-room watcher wants somebody to watch Bernard from the roulette wheel and say what his tell is.',
    client: 'pc-mo',
    clientName: 'Mo',
    ask: [
      'Mo: Don’t wave. I’m watching a man who isn’t here. That’s the whole job.',
      'Mo: Bernard, the Tourist Table. He has a tell. I’ve counted it three times and got three answers. Ilse, on the Harbor, sent word that you’re good at watching.',
      'Mo: Watch from the roulette wheel in the casino, where he can’t see you looking. Then tell the tourist on the street what you saw. A fee, and the chair at his table will suit you better.',
    ],
    hint: ['Mo: The roulette wheel, then the tourist. Four hands. What does he do before he bets, and what is he holding after?'],
    legs: [
      {
        poi: 'pc-roulette',
        todo: 'Watch four hands of Bernard from the roulette wheel in the casino.',
        lines: [
          'You put a chip on red and turn your head the wrong way. Bernard is at the Tourist Table, thinking it is Thursday.',
          'First hand. Before he bets, his hand goes to his collar, twice. He bets big. The other player calls. Bernard turns over seven-high.',
          'Second. He stares at the ceiling a long while. He bets. They fold. His cards go into the muck, face down.',
          'Third. The ceiling again. He checks, then raises. A call. He turns over a full house.',
          'Fourth. The collar, once, quick. He bets small. Everyone folds. You never see the cards.',
        ],
      },
      {
        poi: 'pc-tourist',
        speaker: 'Tourist',
        todo: 'Tell the tourist on the street what Bernard’s tell was.',
        lines: ['Tourist: You were watching Bernard? Everyone watches Bernard. What’s his tell?'],
        choice: {
          speaker: 'Tourist',
          prompt: 'Bernard’s tell is…',
          options: [
            { label: 'Collar for a bluff, ceiling for a monster', flag: 'errandSpotTell', lines: ['Tourist: The collar when it’s nothing, the ceiling when it’s real. Hm. You’ll want a seat at that table.'] },
            { label: 'Ceiling for a bluff, collar for a monster', lines: ['Tourist: The other way round. The ceiling is when he means it. I would not bet on that.'] },
            { label: 'No tell, he bets the same every time', lines: ['Tourist: He doesn’t. He tells every hand. You were watching the chips, not the man.'] },
          ],
        },
      },
    ],
    finish: [
      'Mo: Not that. The collar was the nothing, the ceiling was the real thing. Watch the hands, not the man.',
      'Mo: A hundred and twenty for the trip. The Tourist Table will make it plain, if you look at it the right way round.',
    ],
    variants: [
      {
        flag: 'errandSpotTell',
        reward: 200,
        finish: [
          'Mo: The collar for the bluff, the ceiling for the monster. You saw it. The man has played this table three years and tells it every hand.',
          'Mo: Two hundred. At the Tourist Table the cues are going to show clearer to you. That is not luck; that is practice.',
        ],
        after: [
          'Mo: The collar when he bluffs, the ceiling when he is strong. You’ve got it. I would not say it to Bernard.',
          'Mo: A tell is only worth the number of times you see it. You have seen it a dozen. It is yours now.',
          'Mo: Use it. Fold to the ceiling. Be kind to the man; he has had a long week.',
        ],
        bossAfter: [
          'Mo: Inés Calloway is beaten. She has no collar and no ceiling; I checked for years.',
          'Mo: You beat a woman with no tell. That is a different skill from the one you learned here. Keep both.',
        ],
        todo: 'Go back to Mo. You saw the tell, and the Tourist Table will show it clearer.',
      },
    ],
    defaultReward: 120,
    after: ['Mo: You watched, at least. Next time, watch the hands, not the man. The hands do not know they are lying.'],
    bossAfter: ['Mo: Inés Calloway is beaten. You did it without the collar. I am prouder than I can say, quietly, in the shade.'],
    reward: 200,
    people: [
      {
        id: 'pc-mo',
        name: 'Mo',
        areaId: 'pc-outskirts',
        col: 16,
        row: 3,
        lines: ['Mo: Sit in the shade. Say nothing. Observe. It is the only honest hustle I know.'],
        look: { hat: 'cap', hatColor: '#3a6a5a', hair: '#2a2a2a', hairStyle: 'short', accessory: 'glasses' },
      },
    ],
  },

  // Shape: unlocked by another job's answer. Bernard wants proof of the day.
  {
    id: 'errand-bernard',
    where: 'Lagoon Beach, by the palms, south off the Palm Cay road',
    title: 'Friday, for Bernard',
    cityId: 'palmCay',
    about: 'Brenda told Bernard it was Friday. He wants a calendar and a witness, and has only just stopped saying Thursday.',
    client: 'pc-bernard',
    clientName: 'Bernard',
    requires: [{ kind: 'flag', flag: 'errandBlamedBernard' }],
    ask: [
      'Bernard: You. You’re the one who told the woman with the rolling pin about me. I forgive you. It was, I am now told, Friday.',
      'Bernard: Three days of Thursday. The staff were very kind. I should like proof, in writing, in a shop, that it is Friday, so that I can stop being polite about it.',
      'Bernard: The boutique sells calendars with the days printed on them. Then the barman at the casino must say the word, out loud, in front of me. Four hundred. It’s all I have; I thought it was Thursday.',
    ],
    hint: ['Bernard: A calendar from the boutique. Then the barman, saying the word. Friday. I would like to hear it.'],
    legs: [
      {
        poi: 'boutique',
        speaker: 'Clerk',
        todo: 'Buy Bernard a calendar from the boutique.',
        lines: [
          'Clerk: A calendar. For Bernard. With the days printed. Of course; he came in on Wednesday asking for one that said Thursday.',
          'Clerk: I had to explain they only come in the order they come in. He wept a little. Take it, with my love.',
        ],
      },
      {
        poi: 'pc-barman',
        speaker: 'Barman',
        todo: 'Get the barman at the casino to say what day it is, out loud.',
        lines: [
          'Barman: Friday. It is Friday. It has been Friday since six this morning. I say it every hour, and he says, “Thursday, surely.”',
          'Barman: Tell him I said Friday, and that the Tourist Table closes at midnight on a Friday, same as any other day.',
        ],
      },
    ],
    finish: [
      'Bernard: Friday. In print. And aloud. Do you know, I feel a weight come off, like the end of a very long hand.',
      'Bernard: Four hundred, as promised. And a word for Chad: I am sorry about the ring. It was a lovely chip.',
    ],
    after: ['Bernard: Friday, Friday, Friday. I say it to the palms. They agree. Chad says the ring is nearly out of the salt.'],
    reward: 400,
    people: [
      {
        id: 'pc-bernard',
        name: 'Bernard',
        areaId: 'pc-outskirts',
        col: 14,
        row: 6,
        lines: ['Bernard: Thursday. Definitely Thursday. Don’t tell me otherwise; I’ve had a very difficult week.'],
      },
    ],
  },

  // --- Neon Mesa -----------------------------------------------------------
  // Shape: a ceremony with a daylight wait, and a line you can say or not.
  {
    id: 'errand-chapel',
    where: 'the Chapel of Second Chances, in the Boneyard south off the Mesa road',
    title: 'Witness, any hour',
    cityId: 'neonMesa',
    about: 'The Chapel of Second Chances needs a second witness; Zeke wandered off.',
    client: 'nm-elvira',
    clientName: 'Elvira',
    ask: [
      'Elvira: Welcome to the Chapel of Second Chances, where everybody gets a first. Are you getting married? …No. Pity.',
      'Elvira: I’m Elvira. I do the Strip’s weddings, all hours, no appointment. Solomon Vale was married at this arch once, at four in the morning. It lasted till twenty past.',
      'Elvira: Tonight: Randy and Sheila, who met at the Mesa Main table forty minutes ago and have known each other for a full forty minutes.',
      'Elvira: Nevada wants two witnesses. Mine is Zeke “KingPin,” who streams every ceremony to eleven thousand strangers and his mother. He’s gone for snacks.',
      'Elvira: You’ll do. Stand at the arch, look moved. If anyone is to object, now’s the hour. Twenty-five hundred from the tip jar, by day — nobody objects at night.',
    ],
    hint: ['Elvira: The arch, by day. Look moved. The couple’s very nervous.'],
    legs: [
      {
        poi: 'nm-arch',
        periods: DAYLIGHT,
        closed: ['Elvira: (from the chapel door) Not at night, honey. Nobody objects at night, and nobody witnesses either. By day, any hour before dark.'],
        todo: 'Stand at the arch and witness Randy and Sheila.',
        lines: [
          'You take your place at the arch. Randy is in a borrowed tuxedo. Sheila is in a borrowed tuxedo. Neither of them is surprised.',
          'Randy: Do I? I think… I do.',
          'Sheila: I do. I mean, who cares, we’re up eleven grand.',
          'Zeke arrives with a bag of chips and a phone on a stick.',
          'Zeke: Chat, we are LIVE. A real wedding. Mum — Mum, eat something.',
          'Elvira nods at you. It is the part of the ceremony where somebody is supposed to say something.',
        ],
        choice: {
          speaker: 'Elvira',
          prompt: 'Elvira nods at you. Your line.',
          options: [
            { label: 'I witness', lines: ['Elvira: Beautiful. Cry a little. Everyone does.'] },
            {
              label: 'I object!',
              cash: 1000,
              flag: 'errandObjected',
              lines: [
                'Randy: What?',
                'Sheila: WHAT?',
                'Zeke: CHAT. CHAT. SOMEBODY OBJECTED. LIVE. Eleven thousand viewers just doubled. Subs are going off like the Fourth of July.',
                'Zeke tips you a thousand on the spot, from an account that definitely belongs to his mother.',
              ],
            },
          ],
        },
        then: WAIT,
      },
    ],
    finish: [
      'Elvira: Beautiful. They’re in room 214 and they’ll be divorced by Sunday, and that’s why I love this job.',
      'Elvira: The tip jar. Twenty-five hundred. It’s the only honest wage on the Strip.',
    ],
    variants: [
      {
        flag: 'errandObjected',
        todo: 'The wedding is in uproar. Go back to Elvira.',
        reward: 1200,
        finish: [
          'Elvira has not stopped holding her bouquet. It is mostly stem.',
          'Elvira: An objection. In forty years I have had two. One was a heckler and one was Vale, and he was objecting to his own.',
          'Elvira: Randy and Sheila went through with it anyway, out of spite. The tip jar is half what it was. Twelve hundred. Zeke’s chat took the rest.',
          'Elvira: I will never forgive you. I will also never forget you. Both are a kind of loyalty.',
        ],
        after: [
          'Elvira: Randy and Sheila are in room 214, and the divorce is “pending.” You objected. I frame that on the arch.',
          'Elvira: Zeke clipped it. Forty thousand views. The chapel has never been so busy, and I have never been so tired.',
          'Elvira: I won’t say I’m glad. But I booked three weddings off that clip. Cry a little. Everyone does.',
        ],
      },
    ],
    after: ['Elvira: Every one of them is the real thing, for about an hour. I’ve made my peace with that. You witnessed. I don’t say that to everyone.'],
    reward: 2500,
    people: [
      {
        id: 'nm-elvira',
        name: 'Elvira',
        areaId: 'nm-outskirts',
        col: 4,
        row: 6,
        lines: ['Elvira: Every one of them is the real thing, for about an hour. I’ve made my peace with that.'],
        look: { hair: '#c04a8a', hairStyle: 'long', garment: 'jacket', garmentColor: '#f0e0f0' },
      },
      {
        id: 'nm-arch',
        name: 'The Arch',
        areaId: 'nm-outskirts',
        col: 9,
        row: 6,
        thing: true,
        art: 'none',
        lines: ['A white arch hung with plastic roses, lit from behind by the sign that says CHAPEL in letters four feet tall.'],
      },
    ],
  },
  // Shape: an old promise, a part from a car, and whether you take the car.
  {
    id: 'errand-dee',
    where: 'the Boneyard, south off the Mesa road',
    title: 'Vacancy',
    cityId: 'neonMesa',
    about: 'A retired showgirl wants one night of her old motel’s sign, and needs a part from the dealership.',
    client: 'nm-dee',
    clientName: 'Dee',
    ask: [
      'Dee: Mind the glass, it all bites. This is the Boneyard. Every dead sign on the Strip comes here to lie down.',
      'Dee: I was a showgirl at the Starlite for thirty years. It closed in ’83. Solomon Vale’s suite stands where it was. Its sign says NO VACANCY, and it’s been dark since the night the last guest never left.',
      'Dee: Tomorrow’s the anniversary. I want it lit one more night, and I want it to say VACANCY. Once. So he knows he can check out.',
      'Dee: I need a neon transformer. The showroom at Mesa Motors has an old Eldorado with one in the dash. The salesman hates that car. Ask nicely. Two thousand — it’s been in a coffee tin since ’83.',
    ],
    hint: ['Dee: Mesa Motors. The Eldorado. The transformer in the dash. Ask nicely.'],
    legs: [
      {
        poi: 'mesa-motors',
        speaker: 'Salesman',
        todo: 'Get the neon transformer out of the Eldorado at Mesa Motors.',
        lines: [
          'Salesman: The transformer. In the Eldorado. For Dee. That car has sat in my showroom since 1991. Nobody has ever asked me for anything off it.',
          'Salesman: Take it. Take the car, if you like. I mean the transformer. I mean… could you take the car?',
        ],
        choice: {
          speaker: 'Salesman',
          prompt: 'He is holding out the Eldorado’s keys.',
          options: [
            { label: 'Just the transformer', lines: ['Salesman: Of course. Of course. Nobody ever takes the car.'] },
            {
              label: 'Take the Eldorado too',
              cash: 250,
              flag: 'errandDeeTookCar',
              lines: [
                'Salesman: Bless you. A disposal fee, from the dealership. Leave it anywhere. Preferably the desert.',
                'You park the Eldorado behind a dead sign in the Boneyard. It looks like it has always lived there.',
              ],
            },
          ],
        },
      },
    ],
    finish: [
      'Dee throws the switch. The sign hums, stutters and catches: V-A-C-A-N-C-Y, pink, in a desert that has gone completely quiet.',
      'Dee: There you go, love. Check out whenever you like.',
      'Dee: Two thousand, out of the tin. Don’t argue, I’ve been waiting forty years to give it to someone.',
    ],
    variants: [
      {
        flag: 'errandDeeTookCar',
        todo: 'Go back to Dee. The Eldorado is behind her sign.',
        reward: 1700,
        finish: [
          'Dee looks past you, at the Eldorado parked under the dead sign. She puts a hand on the bonnet like it is a person.',
          'Dee: That car was in the Starlite’s lot the night he didn’t check out. You brought him home.',
          'Dee throws the switch. V-A-C-A-N-C-Y, pink, and the Eldorado’s chrome goes pink with it.',
          'Dee: Seventeen hundred; the tin’s a little short, I’ve been feeding it the Eldorado’s ghost. Don’t argue.',
        ],
        after: [
          'Dee: I sit in the Eldorado some nights. It still smells of 1983. The sign keeps its VACANCY on. For good.',
          'Dee: Somebody left a key on the dash. I think it was the salesman. I think he’s lonely. I’ve asked him to tea.',
          'Dee: Seventeen hundred, and a car. I’d say the car was worth more. I’d say it was worth the rest of the tin.',
        ],
      },
    ],
    after: ['Dee: Pink on a dark night. It does something to a person. The sign says VACANCY now.'],
    echoes: [
      { poi: 'mesa-motors', speaker: 'Salesman', flag: 'errandDeeTookCar', lines: ['Salesman: The showroom is so quiet without the Eldorado. I’ve moved my desk into its space. I think about it every day.'] },
      { poi: 'mesa-motors', speaker: 'Salesman', flag: 'errandDeeTookCar', flagSet: false, lines: ['Salesman: The Eldorado is still here, still dashless. Dee’s sign is lit, I hear. Nobody’s asked me for a thing since.'] },
    ],
    reward: 2000,
    people: [
      {
        id: 'nm-dee',
        name: 'Dee',
        areaId: 'nm-outskirts',
        col: 17,
        row: 7,
        lines: ['Dee: Pink on a dark night. It does something to a person. Mind the glass.'],
        look: { hair: '#e8e0d0', hairStyle: 'bun', garment: 'cardigan', garmentColor: '#c0508a' },
      },
    ],
  },

  // Shape: a night job. After the chapel's day, Randy comes back alone, and nothing here passes the hour.
  {
    id: 'errand-randy',
    where: 'the Boneyard at night, south off the Mesa road',
    title: 'The last rose',
    cityId: 'neonMesa',
    about: 'Randy, of the chapel wedding, comes back to the arch alone at night and wants a rose carried to room 214.',
    client: 'nm-randy',
    clientName: 'Randy',
    requires: [{ kind: 'eventDone', eventId: 'errand-chapel-done' }, { kind: 'eventDone', eventId: 'errand-chapel-leg1' }],
    periods: ['night'],
    ask: [
      'Randy: It’s you. The witness. I know you. I’m sorry I’m in the tuxedo; it’s not mine, it never was.',
      'Randy: Sheila said it was a laugh. I think it was a laugh. I think I also meant it, which is the part nobody checked.',
      'Randy: There’s a rose on the arch. It’s plastic, it’s dusty, it’s the last. Take it to room 214 through the waitress at the casino, and say it’s from nobody. A thousand — the last of the eleven grand.',
      'Randy: It has to be dark. If it already is, the arch is waiting. If not, there’s a bench by the path that will bring it on.',
    ],
    hint: ['Randy: The arch, at night. The last rose. Then the waitress, for room 214. “From nobody.” (Wait for dark on the bench by the road.)'],
    legs: [
      {
        poi: 'nm-arch',
        todo: 'Take the last plastic rose off the chapel arch (at night; wait for dark on the bench by the road).',
        lines: [
          'The arch at three in the morning is the loneliest lit thing on the Strip. CHAPEL buzzes overhead.',
          'One plastic rose is left, dusty, wired by the stem. It comes away in your hand with a small, tired snap.',
        ],
      },
      {
        poi: 'mesa-waitress',
        speaker: 'Waitress',
        todo: 'Give the rose to the waitress in the casino, for room 214 (at night).',
        lines: [
          'Waitress: Room 214. The couple with the borrowed tuxedos. She’s up. She’s ordered coffee for two.',
          'Waitress: A rose from nobody. I’ll put it on the tray. She’ll know. They always know.',
        ],
      },
    ],
    finish: [
      'Randy: Coffee for two. That’s all. That’s all a marriage is, if you’re lucky: coffee for two.',
      'Randy: A thousand. It’s the last of the eleven grand. Spend it on something you’ll regret slowly.',
    ],
    after: ['Randy: Room 214 has become Room 214 and a half. We’re not married. We’re not divorced. We’re awake. It’s enough.'],
    reward: 1000,
    people: [
      {
        id: 'nm-randy',
        name: 'Randy',
        areaId: 'nm-outskirts',
        col: 20,
        row: 9,
        lines: ['Randy: I only come out after dark. The tuxedo shows less.'],
      },
    ],
  },

  // --- Porto Lumina --------------------------------------------------------
  // Shape: patience, then a gate. A dog Madame Wen forbids, past a guard who counts.
  {
    id: 'errand-fong',
    where: 'the Belvedere, south off the Lumina road',
    title: 'Pocket Rockets',
    cityId: 'portoLumina',
    about: 'Madame Wen’s collector has lost her greyhound in the cypress hedge, and the rules say no dogs.',
    client: 'pl-fong',
    clientName: 'Ms. Fong',
    ask: [
      'Fong: Do not speak. Walk with me. Not that way — the dog is that way.',
      'Fong: I collect for Madame Wen. I have collected from a prince, two bishops and a man who was, briefly, a country. I am afraid of nothing.',
      'Fong: I am afraid of Pocket Rockets. She is a greyhound, nine years old, brindle, and she has gone into the cypress hedge because I said the word “walk” in a tone.',
      'Fong: Madame Wen forbids dogs on the terrace. Bring her out; do not chase. Then the guard at the gate counts everything that passes. Get her past him. Seven thousand.',
    ],
    hint: ['Fong: The hedge, in daylight. Patience. Then the guard at the gate. Do not say the word “walk.”'],
    legs: [
      {
        poi: 'pl-hedge',
        periods: DAYLIGHT,
        closed: ['Fong: (at the gate, without turning) She will not come out for a stranger in the dark. Daylight, please. Any hour before night.'],
        todo: 'Coax Pocket Rockets out of the cypress hedge, without saying “walk.” It takes a while.',
        lines: [
          'You sit down by the hedge and say nothing. For a long time. You are good at this; you play poker.',
          'Two wet eyes appear in the cypress. A very thin dog comes out, sits, and puts her head on your knee.',
          'Her tag reads: POCKET ROCKETS. If found, return to Ms. Fong. DO NOT TELL WEN.',
        ],
        then: WAIT,
      },
      {
        poi: 'road-pl-guard',
        speaker: 'Guard',
        todo: 'Get Pocket Rockets past the guard at the Lumina gate.',
        lines: [
          'Guard: Halt. That is a dog. Madame Wen allows guests, cats in carriers, and one parrot with a membership. Dogs are not on the list.',
          'Pocket Rockets looks up at him. He looks down at her. A very long moment passes between them, like two players holding the same river.',
        ],
        choice: {
          speaker: 'Guard',
          prompt: 'Whose dog is this?',
          options: [
            { label: 'Mine. She’s a scarf.', lines: ['Guard: A scarf. Of course. A very fine one. Go through, sir, and mind she doesn’t bark.'] },
            {
              label: 'Ms. Fong’s. Please.',
              flag: 'errandFongAdmitted',
              lines: [
                'Guard: Ms. Fong’s. …I have seen nothing. I have never seen a dog. I am watching the cypress.',
                'He turns, very slowly, to the cypress.',
              ],
            },
          ],
        },
      },
    ],
    finish: [
      'Ms. Fong does not run. Her voice goes up an octave and she says, “Pocket,” and the dog does the running for both of them.',
      'Fong: You did not see this. I have a group chat with Dutch, from Riverbend. He did not see his, either. We are very discreet.',
      'Fong: Seven thousand. I will remember this. I will still collect. But I will remember it.',
    ],
    variants: [
      {
        flag: 'errandFongAdmitted',
        todo: 'Go back to Ms. Fong. The guard knows the dog is hers.',
        reward: 6000,
        finish: [
          'Ms. Fong does not run. She kneels, which you have never seen anyone do in that coat.',
          'Fong: The guard knows she is mine. He has shown me what he knows. He now works for me, I think. It is an unexpected asset.',
          'Fong: Six thousand — a thousand went to his silence — and a favour at the gate. Madame Wen has never forbidden anything she did not first lose to.',
        ],
        after: [
          'Fong: The guard salutes the dog now. I am told Madame Wen has noticed. She says nothing. That is how I know it is fine.',
          'Fong: He is mine now. It cost a thousand. He guards the gate and he guards the secret, and charges for neither twice.',
          'Fong: You were honest at the gate. It is an expensive habit. I have come to rely on it.',
        ],
      },
    ],
    echoes: [
      { poi: 'road-pl-guard', speaker: 'Guard', flag: 'errandFongAdmitted', lines: ['Guard: I am to look at the cypress. I have never seen a cypress so closely. It has been very good company.'] },
      { poi: 'road-pl-guard', speaker: 'Guard', flag: 'errandFongAdmitted', flagSet: false, lines: ['Guard: Madame Wen asked me twice about a scarf that barked. I said it was a very modern scarf. She did not laugh.'] },
    ],
    after: [
      'Fong: She is asleep on my coat. I have decided to be cold. You were there at the hedge. I do not forget the hedge.',
      'Fong: The guard says you called her a scarf. Madame Wen has asked him, twice, about the scarf that barked. He is sweating through his tunic.',
      'Fong: It is going to cost me, somewhere. I will let you know where.',
    ],
    reward: 7000,
    people: [
      {
        id: 'pl-fong',
        name: 'Ms. Fong',
        areaId: 'pl-outskirts',
        col: 13,
        row: 6,
        lines: ['Fong: She is asleep on my coat. I have decided to be cold.'],
      },
      {
        id: 'pl-hedge',
        name: 'Rustling Hedge',
        areaId: 'pl-outskirts',
        col: 23,
        row: 5,
        thing: true,
        art: 'none',
        lines: ['A tall cypress hedge. Something in it is whining, softly, in a cultured way.'],
      },
    ],
  },
  // Shape: three fetches across a day, and a chip you may or may not carry.
  {
    id: 'errand-teodoro',
    where: 'the bench on the Belvedere, south off the Lumina road',
    title: 'The first dealer',
    cityId: 'portoLumina',
    about: 'Nadia’s first dealer wants his best jacket from the atelier, taken in properly, and her first chip of the night.',
    client: 'pl-teodoro',
    clientName: 'Teodoro',
    ask: [
      'Teodoro: Sit, sit. The bench is free; it is always free. Nobody walks to this end of the terrace anymore.',
      'Teodoro: I was Nadia’s first dealer. Forty years ago, in a card room that is a car park now. She was nineteen. She sat down, looked at the deck and said, “Cut it again. It’s off.” It was. A card was missing its corner.',
      'Teodoro: Four years she has kept the penthouse and she has never once come to the terrace. She leaves her first chip of every night on the felt, for luck. I taught her that. I do not think she remembers why.',
      'Teodoro: I would like my jacket from the atelier, the grey, with the green lining, taken in. It takes a whole day to do properly. Then the barman at the casino keeps her chip. Ask him. Ten thousand: the whole of my tips, and if there is no chip, eight, for I am a sentimental man with a budget.',
    ],
    hint: ['Teodoro: The atelier, twice, with the afternoon between. The grey jacket, the green lining. Then the barman.'],
    legs: [
      {
        poi: 'atelier',
        speaker: 'Tailor',
        periods: DAYLIGHT.slice(0, 2),
        todo: 'Leave Teodoro’s measurements at the atelier. It takes the afternoon.',
        lines: [
          'Tailor: Signor Teodoro’s grey, with the green lining. I will take it in at the shoulder and let the cuffs down. It will take until evening. A jacket is not a hurry.',
          'Tailor: There is no charge. He taught my father to read a flop, and my father taught me to read a bill.',
        ],
        then: WAIT,
      },
      {
        poi: 'atelier',
        speaker: 'Tailor',
        periods: ['evening', 'night'],
        todo: 'Collect Teodoro’s jacket from the atelier, this evening or later.',
        lines: [
          'Tailor: The jacket. I asked it to look like a man who was once somebody’s first dealer. I think it does.',
          'Tailor: Take it gently. It has been waiting forty years for its occasion.',
        ],
      },
      {
        poi: 'pl-barman',
        speaker: 'Barman',
        todo: 'Ask the barman in the casino about Nadia’s first chip of the night.',
        lines: [
          'Barman: Madame Nadia’s chip. Every night, the first one she bets goes on the felt, and nobody touches it until she has gone up. Then I keep it under the till.',
          'Barman: A black one, forty thousand. It has no use. It has all the luck in the building.',
        ],
        choice: {
          speaker: 'Barman',
          prompt: 'What do you do with Nadia’s chip?',
          options: [
            { label: 'Leave it where she put it', lines: ['Barman: Quite right. A chip knows where it belongs. I’ll tell Teodoro you were here.'] },
            {
              label: 'Take it to Teodoro',
              flag: 'errandTeodoroChip',
              lines: ['Barman: …Madame won’t miss it till she has gone up. Tell him it’s a loan. A very long one. He’ll understand that.'],
            },
          ],
        },
      },
    ],
    finish: [
      'Teodoro puts the jacket on slowly, and stands, and for a moment is very tall.',
      'Teodoro: It fits. It fits like the room did. And you left the chip on the felt where she put it. Good. A chip has a home.',
      'Teodoro: Eight thousand. It is less than I said, and I will not apologise; a man who wanted the chip does not pay in full for a jacket. When you sit down across from her — and you will — leave the first chip on the felt.',
    ],
    variants: [
      {
        flag: 'errandTeodoroChip',
        todo: 'Take Teodoro the jacket and Nadia’s chip.',
        reward: 10000,
        finish: [
          'Teodoro puts the jacket on slowly, and stands, and for a moment is very tall.',
          'Then he holds out his hand, and you put a black chip in it. He looks at it for a long time. His thumb finds a nick at the edge.',
          'Teodoro: Her nineteenth birthday. I cut that nick myself with the deck knife. She was so angry. Ten thousand, the whole of the tips, and the chip. It fits. The whole room fits.',
          'Teodoro: When you sit across from her, tell her where the nick came from. Or do not. See what she does.',
        ],
        after: ['Teodoro: I wear it every evening on this terrace. The chip lives in the left pocket. It has all the luck in the building, and I have none.'],
      },
    ],
    after: [
      'Teodoro: The sea does not need a jacket. I do. Thank you. The chip stays where she put it. I think she will come, one day.',
      'Teodoro: Eight thousand is enough for a man with no one to be on time for. I have bought a second bench. It is also always free.',
      'Teodoro: When she does come, I shall stand. In the jacket. I shall not say a word about the card with the missing corner.',
    ],
    echoes: [
      { poi: 'atelier', speaker: 'Tailor', lines: ['Tailor: Signor Teodoro sent a postcard. “Wore it once, for nobody, and it was everybody.” I keep it pinned to the lining sample.'] },
    ],
    reward: 10000,
    defaultReward: 8000,
    people: [
      {
        id: 'pl-teodoro',
        name: 'Teodoro',
        areaId: 'pl-outskirts',
        col: 4,
        row: 6,
        lines: ['Teodoro: The sea does not need a jacket. I do. Thank you.'],
        look: { hair: '#e8e8ec', hairStyle: 'short', accessory: 'glasses' },
      },
    ],
  },

  // Shape: a night job on the terrace, ending with a revisit of the hedge.
  {
    id: 'errand-lamps',
    where: 'the Belvedere at night, south off the Lumina road',
    title: 'Lamps for the Belvedere',
    cityId: 'portoLumina',
    about: 'The old lamplighter cannot climb any more and wants two gilded lamps lit by hand, after dark.',
    client: 'pl-lamplighter',
    clientName: 'Lamplighter',
    requires: [{ kind: 'eventDone', eventId: 'errand-fong-leg1' }],
    periods: ['night'],
    ask: [
      'Lamplighter: Hush. You can hear them waiting. Gilded lamps, forty years, and I have lit every one by hand.',
      'Lamplighter: My knees say no. The two on the terrace, by the water. Madame Wen likes them lit at night, for no one. Take my taper.',
      'Lamplighter: Then the hedge. There’s a dog that sleeps there now. She likes the light. Three thousand, and the dog’s good opinion.',
      'Lamplighter: After dark only. If it is not yet, the bench by the steps will bring it on. I use it every evening.',
    ],
    hint: ['Lamplighter: The two gilded lamps by the water, with my taper, after dark. Then the hedge. (Wait for dark on the bench by the steps.)'],
    legs: [
      {
        poi: 'pl-lamp-a',
        todo: 'Light the first gilded lamp, by the steps (at night; wait for dark on the bench).',
        lines: [
          'You reach up with the taper. The old glass catches, hums, and the whole terrace swims gold around it.',
        ],
      },
      {
        poi: 'pl-lamp-b',
        todo: 'Light the second gilded lamp, over the water (at night).',
        lines: [
          'The second lamp takes longer. Out on the water a ferry slows to look.',
          'For a minute the Belvedere looks like the city it thinks it is.',
        ],
      },
      {
        poi: 'pl-hedge',
        todo: 'Check the hedge by lamplight (at night).',
        lines: [
          'In the cypress, two eyes catch the new gold and blink at it.',
          'A thin brindle shape settles back down, a tag glinting: POCKET ROCKETS. She has chosen the lamp. She is satisfied.',
        ],
      },
    ],
    finish: [
      'Lamplighter: Both lit. I can see them from here. Do you know I’ve never seen them from here? Always been under them.',
      'Lamplighter: Three thousand, out of Madame Wen’s lamp fund, which she does not know exists. Tell no one, and tell the dog nothing.',
    ],
    after: ['Lamplighter: Lit every night now, by a stranger’s habit. I sit on the bench and watch. The dog does too.'],
    reward: 3000,
    people: [
      {
        id: 'pl-lamplighter',
        name: 'Lamplighter',
        areaId: 'pl-outskirts',
        col: 8,
        row: 12,
        lines: ['Lamplighter: Only after dark. In daylight the lamps are just brass.'],
        look: { hair: '#d8d8dc', hairStyle: 'short', hat: 'cap', hatColor: '#3a3a4a' },
      },
      { id: 'pl-lamp-a', name: 'Gilded Lamp', areaId: 'pl-outskirts', col: 12, row: 8, thing: true, art: 'none', lines: ['A gilded lamp, dark, with a ladder’s worth of glass above you. It waits for dusk.'] },
      { id: 'pl-lamp-b', name: 'Gilded Lamp', areaId: 'pl-outskirts', col: 19, row: 5, thing: true, art: 'none', lines: ['A gilded lamp, dark, over the water. It waits for dusk.'] },
    ],
  },
]

/** Notice boards and benches the errands put in the outskirts: a hint of the next job, and somewhere to stand. */
const SCENERY: ErrandPerson[] = [
  { id: 'sc-board', name: 'Notice Board', areaId: 'sc-outskirts', col: 11, row: 9, thing: true, art: 'none', lines: ['Pinned flyers: LOST — one casserole dish, answers to Room 2. WANTED — a lie for a man with a hat. See Wendell. (He is not in Room 6.)'] },
  { id: 'rb-board', name: 'Bait Board', areaId: 'rb-outskirts', col: 10, row: 9, thing: true, art: 'none', lines: ['BAIT 4 SALE. WANTED: patience, for Cornelius, down by the reeds. Patience not sold here. Mabel has looked.'] },
  { id: 'ch-board', name: 'Pier Board', areaId: 'ch-outskirts', col: 8, row: 10, thing: true, art: 'none', lines: ['MACKEREL 40. REWARD for one accordion (Gull & Anchor, ticket 4471). The light needs a lookout. Odalys: ask about the Bellweather.'] },
  { id: 'rb-fishrack', name: 'Fish Rack', areaId: 'rb-outskirts', col: 12, row: 9, thing: true, art: 'none', lines: ['A drying rack of perch and a man who could use a hand. (An hour’s work, by day, for a few dollars. Only if you are nearly broke.)'] },
  { id: 'pc-board', name: 'Beach Board', areaId: 'pc-outskirts', col: 14, row: 2, thing: true, art: 'none', lines: ['LAGOON BEACH. HUTS BY THE WEEK. NO DOGS, NO DEBT, NO SPEECHES. A man in a dinghy needs sardines. A woman needs her ring.'] },
  { id: 'nm-board', name: 'Chapel Board', areaId: 'nm-outskirts', col: 12, row: 5, thing: true, art: 'none', lines: ['OPEN 24 HRS. WITNESSES WANTED, any hour. Dee’s sign wants a transformer. Ask at the Mesa Motors showroom. Do not ask about the Eldorado.'] },
  { id: 'pl-board', name: 'Terrace Notice', areaId: 'pl-outskirts', col: 16, row: 3, thing: true, art: 'none', lines: ['Madame Wen asks guests not to feed the dogs. There are no dogs. A jacket waits at the atelier for a man on the bench.'] },
  { id: 'pc-crabtraps', name: 'Crab Traps', areaId: 'pc-outskirts', col: 16, row: 6, thing: true, art: 'none', lines: ['Wire crab traps stacked on the sand. (An hour’s work, by day, for a little money. Only if you are nearly broke.)'] },
  { id: 'nm-scrapheap', name: 'Scrap Heap', areaId: 'nm-outskirts', col: 12, row: 12, thing: true, art: 'none', lines: ['A heap of dead tubing and glass, waiting to be carried. (An hour’s work, by day, for a little money. Only if you are nearly broke.)'] },
  { id: 'sc-hand1', name: 'Hitcher', areaId: 'sc-outskirts', col: 25, row: 2, lines: ['Hitcher: Somebody’s been through here in a Groucho moustache. Said his name was Brad. Gave me a lift. I hadn’t asked.'] },
  { id: 'sc-hand2', name: 'Trucker', areaId: 'sc-outskirts', col: 6, row: 12, lines: ['Trucker: A man in Room 2 eats nothing but casserole these days. It’s on the whole road, how happy his sister is.'] },
  { id: 'rb-hand1', name: 'Boy with a Bucket', areaId: 'rb-outskirts', col: 7, row: 12, lines: ['Boy with a bucket: There’s a woman who sings to a catfish. She’s not very good. The catfish seems to like it.'] },
  { id: 'rb-hand2', name: 'Houseboat Neighbour', areaId: 'rb-outskirts', col: 3, row: 8, lines: ['Neighbour: Dutch’s mum is eighty-one. She says she’s never been so spoiled. A woman with flowers comes now.'] },
  { id: 'ch-hand1', name: 'Fisherman', areaId: 'ch-outskirts', col: 22, row: 7, lines: ['Fisherman: The light’s been on every night this month. The Captain says it’s the tide. I say it’s Abel.'] },
  { id: 'ch-hand2', name: 'Deckhand', areaId: 'ch-outskirts', col: 7, row: 12, lines: ['Deckhand: The accordion is back on the boulevard. You can hear it from the fish stall. Odalys hums along. Don’t tell her I said so.'] },
  { id: 'pc-hand1', name: 'Sunbather', areaId: 'pc-outskirts', col: 24, row: 10, lines: ['Sunbather: The commodore is still out there in his dinghy. And a woman in white brings him pears, daily. It’s very romantic, in a way.'] },
  { id: 'pc-hand2', name: 'Swimmer', areaId: 'pc-outskirts', col: 3, row: 6, lines: ['Swimmer: Heard there was a ring in a salt shaker. I looked in every shaker on the beach. I found a lot of salt.'] },
  { id: 'nm-hand1', name: 'Stagehand', areaId: 'nm-outskirts', col: 6, row: 8, lines: ['Stagehand: Dee’s sign was on all night. Pink. I cried and I don’t know why. Then someone parked a car under it.'] },
  { id: 'nm-hand2', name: 'Streamer', areaId: 'nm-outskirts', col: 23, row: 5, lines: ['Streamer: Somebody objected at a wedding here. Live. I have the clip on loop. I’m not even sure it was real.'] },
  { id: 'pl-hand1', name: 'Gardener', areaId: 'pl-outskirts', col: 25, row: 3, lines: ['Gardener: A very thin dog sleeps in the hedge now. Nobody trims that corner. Nobody has been asked to.'] },
  { id: 'pl-hand2', name: 'Waiter', areaId: 'pl-outskirts', col: 10, row: 9, lines: ['Waiter: An old man in a grey jacket sits on the bench in the afternoons. He tips like a man who has saved up.'] },
  { id: 'sc-woodpile', name: 'Woodpile', areaId: 'sc-outskirts', col: 14, row: 10, thing: true, art: 'none', lines: ['A woodpile and an axe. (An hour’s work, by day, for a little money. Only if you are nearly broke.)'] },
  { id: 'ch-nets', name: 'Torn Nets', areaId: 'ch-outskirts', col: 6, row: 9, thing: true, art: 'none', lines: ['A heap of torn nets and a woman with a needle. (An hour’s work, by day, for a little money. Only if you are nearly broke.)'] },
  { id: 'pl-planters', name: 'Marble Planters', areaId: 'pl-outskirts', col: 14, row: 9, thing: true, art: 'none', lines: ['Marble planters waiting to be moved. (An hour’s work, by day, for good money. Only if you are nearly broke.)'] },
  { id: 'sc-phone', name: 'Pay Phone', areaId: 'sc-outskirts', col: 3, row: 9, thing: true, art: 'none', lines: ['A pay phone with its cord cut. Somebody has written on the box: “NICO CALLED. SAID BRAD’S NOT HOME.”'] },
  { id: 'rb-phone', name: 'Pay Phone', areaId: 'rb-outskirts', col: 20, row: 2, thing: true, art: 'none', lines: ['A pay phone nailed to a post. A note: “MUM HAS CALLED TWICE. LOGISTICS IS NOT A JOB.”'] },
  { id: 'ch-phone', name: 'Pay Phone', areaId: 'ch-outskirts', col: 13, row: 3, thing: true, art: 'none', lines: ['A salt-rusted pay phone. Scrawled: “THE ACCORDION IS BACK. SO IS ABEL.”'] },
  { id: 'pc-phone', name: 'Pay Phone', areaId: 'pc-outskirts', col: 22, row: 2, thing: true, art: 'none', lines: ['A pay phone in a bamboo hut. A card: “MRS. TRAN: PEARS DELIVERED. COMMODORE: STILL AFLOAT.”'] },
  { id: 'nm-phone', name: 'Pay Phone', areaId: 'nm-outskirts', col: 3, row: 12, thing: true, art: 'none', lines: ['A pay phone, lit pink by the sign. A sticker: “ELVIRA: 24 HRS. DEE: DO NOT CALL AFTER VACANCY.”'] },
  { id: 'pl-phone', name: 'Pay Phone', areaId: 'pl-outskirts', col: 2, row: 3, thing: true, art: 'none', lines: ['A brass pay phone nobody uses. A card: “MADAME WEN HAS NO DOGS. THE GUARD SAYS SO.”'] },
  { id: 'sc-dog', name: 'Stray Dog', areaId: 'sc-outskirts', col: 19, row: 10, lines: ['Stray Dog: (wags, and follows the smell of the casserole you do not have)'] },
  { id: 'rb-dog', name: 'Stray Dog', areaId: 'rb-outskirts', col: 8, row: 10, lines: ['Stray Dog: (sits by the bank and watches the water like a very small, very patient angler)'] },
  { id: 'ch-dog', name: 'Harbour Dog', areaId: 'ch-outskirts', col: 12, row: 11, lines: ['Harbour Dog: (has a mackerel and the look of somebody who will not be sharing)'] },
  { id: 'pc-dog', name: 'Beach Dog', areaId: 'pc-outskirts', col: 22, row: 7, lines: ['Beach Dog: (rolls in something that was once a crab)'] },
  { id: 'nm-dog', name: 'Desert Dog', areaId: 'nm-outskirts', col: 24, row: 10, lines: ['Desert Dog: (howls at the sign, which flickers back)'] },
  { id: 'pl-dog', name: 'Terrace Dog', areaId: 'pl-outskirts', col: 12, row: 10, lines: ['Terrace Dog: (looks at you with great dignity and leans on your leg)'] },
  { id: 'pc-beachcomber', name: 'Beachcomber', areaId: 'pc-outskirts', col: 21, row: 8, lines: ['Beachcomber: I found a ring in a salt shaker once. Gave it back. Nobody believed the salt.'] },
]

/** A signpost at each gap in the trees, so the way down to the outskirts is something you can see. */
const SIGNPOSTS: ErrandPerson[] = [
  { id: 'sc-signpost', name: 'Motor Court Sign', areaId: 'road-silvercreek', col: 17, row: 12, thing: true, lines: ['A hand-painted board nailed to a post: SAND DOLLAR MOTOR COURT. WEEKLY RATES. NO VACANCY (LIES). An arrow points south down the dirt path.'] },
  { id: 'rb-signpost', name: 'Muddy Bend Sign', areaId: 'road-riverbend', col: 13, row: 11, thing: true, lines: ['A board on a post: MUDDY BEND. BAIT, TACKLE, ADVICE. The path runs south to the river.'] },
  { id: 'ch-signpost', name: 'Fish Pier Sign', areaId: 'road-crescent', col: 12, row: 11, thing: true, lines: ['A painted sign: FISH PIER. FRESH CATCH, PAWN, LIGHT. A stone path runs south to the quay.'] },
  { id: 'pc-signpost', name: 'Lagoon Beach Sign', areaId: 'road-palmcay', col: 25, row: 11, thing: true, lines: ['A bleached board: LAGOON BEACH. HUTS BY THE WEEK. A sandy path runs south.'] },
  { id: 'nm-signpost', name: 'Boneyard Sign', areaId: 'road-mesa', col: 18, row: 12, thing: true, lines: ['A tin sign, still faintly lit: THE BONEYARD. CHAPEL OPEN 24 HRS. A dirt track runs south.'] },
  { id: 'pl-signpost', name: 'Belvedere Plaque', areaId: 'road-lumina', col: 8, row: 12, thing: true, lines: ['A marble plaque: BELVEDERE. A stair of white stone runs south between the cypresses.'] },
]

// ---------------------------------------------------------------------------

const POI_COLOR = 0x6ea8fe
const THING_COLOR = 0x9aa7b5

function speakerOf(lines: string[], fallback: string): string {
  const first = lines[0]?.match(/^([^:]{1,24}):/)
  return first ? first[1] : fallback
}

/** Every new fixture in one area. Spread into its `pois`. */
export function errandPois(areaId: string): PoiDef[] {
  const benches: ErrandPerson[] = DARK_BENCHES.map((b) => ({ id: b.id, name: b.name, areaId: b.areaId, col: b.col, row: b.row, thing: true, art: 'none', lines: b.lines }))
  return [...ERRANDS.flatMap((e) => e.people), ...SIGNPOSTS, ...SCENERY, ...benches]
    .filter((p) => p.areaId === areaId)
    .map((p) => ({
      id: p.id,
      name: p.name,
      col: p.col,
      row: p.row,
      color: p.thing ? THING_COLOR : POI_COLOR,
      lines: p.lines,
      action: { kind: 'flavor' as const },
      ...(p.thing ? { art: p.art ?? ('sign' as const) } : {}),
      ...(p.look ? { look: p.look } : {}),
      ...(p.role ? { role: p.role } : {}),
    }))
}

const bossDown = (cityId: CityId, is: boolean): EventCondition => ({ kind: 'casino', cityId, status: 'bossBeaten', set: is })
const done = (eventId: string, is = true) => ({ kind: 'eventDone' as const, eventId, done: is })

/** Narration has no name in front of it; everything else is spoken. */
/** A text box holds a couple of sentences: a long line is split at a sentence, each part keeping its speaker. */
export function chunk(line: string, max = 150): string[] {
  if (line.length <= max) return [line]
  const prefix = line.match(/^([^:]{1,24}: )/)?.[1] ?? ''
  const body = line.slice(prefix.length)
  const sentences = body.match(/[^.!?…]+[.!?…]+[”’"]?\s*|[^.!?…]+$/g) ?? [body]
  const out: string[] = []
  let cur = ''
  for (const sentence of sentences) {
    if (cur && (prefix + cur + sentence).trim().length > max) {
      out.push((prefix + cur).trim())
      cur = ''
    }
    cur += sentence
  }
  if (cur.trim()) out.push((prefix + cur).trim())
  return out
}

/** Who a line belongs to: its "Name:" prefix, or nobody (narration). */
const prefixOf = (line: string) => line.match(/^([^:]{1,24}): /)?.[1] ?? ''

/**
 * Lines as dialogue, one box per run of the same speaker, so narration is never
 * said under somebody's name and a conversation is said by each in turn.
 */
function say(rawLines: string[], _speaker = ''): EventAction[] {
  const actions: EventAction[] = []
  let run: string[] = []
  let who = ''
  const flush = () => {
    if (run.length) actions.push(who ? { kind: 'dialogue', speaker: who, lines: run } : { kind: 'dialogue', lines: run })
    run = []
  }
  for (const line of rawLines.flatMap((l) => chunk(l))) {
    const speaker = prefixOf(line)
    if (speaker !== who) flush()
    who = speaker
    run.push(line)
  }
  flush()
  return actions
}

/** What a choice leads to: the lines, any cash, any flag. */
function choiceAction(c: ErrandChoice): EventAction {
  return {
    kind: 'choice',
    speaker: c.speaker,
    prompt: c.prompt,
    options: c.options.map((o) => ({
      label: o.label,
      then: [
        ...say(o.lines, speakerOf(o.lines, c.speaker ?? '')),
        ...(o.cash ? [{ kind: 'giveCash' as const, amount: o.cash }] : []),
        ...(o.flag ? [{ kind: 'setFlag' as const, flag: o.flag }] : []),
      ],
    })),
  }
}

/** The first variant whose flag is set, else the plain ending. */
function byVariant(e: Errand, plain: EventAction[], pick: (v: ErrandVariant) => EventAction[]): EventAction[] {
  return (e.variants ?? []).reduceRight<EventAction[]>(
    (rest, v) => [{ kind: 'if', when: [{ kind: 'flag', flag: v.flag }], then: pick(v), else: rest }],
    plain,
  )
}

/** The events one errand is made of. */
export function eventsOf(e: Errand): GameEvent[] {
  const ask = `${e.id}-ask`
  const legId = (i: number) => `${e.id}-leg${i + 1}`
  const last = legId(e.legs.length - 1)
  const finish = `${e.id}-done`
  const events: GameEvent[] = []
  const allLegs = e.legs.map((_, i) => done(legId(i)))
  // What gated the ask still holds on every leg: a beat once played stays played, so
  // saying it again changes nothing, and tells this job's legs apart from the job it
  // waited for (Randy at the arch at night, the chapel's arch closed at night).
  const gate = (e.requires ?? []).filter((c) => c.kind === 'eventDone')

  events.push({
    id: ask,
    about: `${e.title}: ${e.about}`,
    trigger: { kind: 'interact', poiId: e.client },
    conditions: [...(e.requires ?? []), ...(e.periods ? [{ kind: 'period' as const, period: e.periods }] : [])],
    actions: say(e.ask, e.clientName),
  })
  events.push({
    id: `${e.id}-hint`,
    about: `${e.title}: ${e.clientName} again, while the job is open.`,
    trigger: { kind: 'interact', poiId: e.client },
    conditions: [done(ask), done(last, false)],
    repeatable: true,
    actions: say(e.hint, e.clientName),
  })
  e.legs.forEach((leg, i) => {
    events.push({
      id: legId(i),
      about: `${e.title}: leg ${i + 1} of ${e.legs.length}.`,
      trigger: { kind: 'interact', poiId: leg.poi },
      conditions: [done(i === 0 ? ask : legId(i - 1)), ...gate, ...((leg.periods ?? e.periods) ? [{ kind: 'period' as const, period: (leg.periods ?? e.periods)! }] : [])],
      actions: [
        ...say(leg.lines, leg.speaker ?? speakerOf(leg.lines, '')),
        ...(leg.choice ? [choiceAction(leg.choice)] : []),
        ...(leg.then ?? []),
      ],
    })
    const open = leg.periods ?? e.periods
    if (leg.closed && open) {
      events.push({
        id: `${legId(i)}-closed`,
        about: `${e.title}: leg ${i + 1} at the wrong hour, and when to come back.`,
        trigger: { kind: 'interact', poiId: leg.poi },
        conditions: [done(i === 0 ? ask : legId(i - 1)), done(legId(i), false), { kind: 'period', period: ALL_PERIODS.filter((p) => !open.includes(p)) }],
        repeatable: true,
        actions: say(leg.closed),
      })
    }
  })
  const pay = (amount: number): EventAction[] => [{ kind: 'giveCash', amount }, { kind: 'playSound', sound: 'win' }]
  events.push({
    id: finish,
    about: `${e.title}: back to ${e.clientName}, who pays up to $${e.reward.toLocaleString()}.`,
    trigger: { kind: 'interact', poiId: e.client },
    conditions: [done(ask), done(last)],
    actions: byVariant(
      e,
      [...say(e.finish, e.clientName), ...pay(e.defaultReward ?? e.reward)],
      (v) => [...say(v.finish, e.clientName), ...pay(v.reward)],
    ),
  })
  events.push({
    id: `${e.id}-after`,
    about: `${e.title}: ${e.clientName} afterwards, remembering what you did.`,
    trigger: { kind: 'interact', poiId: e.client },
    conditions: [done(ask), ...allLegs, done(finish), ...(e.bossAfter ? [bossDown(e.cityId, false)] : [])],
    repeatable: true,
    actions: byVariant(e, say(e.after, e.clientName), (v) => say(v.after, e.clientName)),
  })
  if (e.bossAfter) {
    // Once the town's boss is down, the client has heard, and says so for what you did.
    events.push({
      id: `${e.id}-boss`,
      about: `${e.title}: ${e.clientName} after you beat the town's boss.`,
      trigger: { kind: 'interact', poiId: e.client },
      conditions: [done(ask), ...allLegs, done(finish), bossDown(e.cityId, true)],
      repeatable: true,
      actions: byVariant(e, say(e.bossAfter, e.clientName), (v) => say(v.bossAfter ?? e.bossAfter!, e.clientName)),
    })
  }
  ;(e.echoes ?? []).forEach((echo, i) => {
    events.push({
      id: `${e.id}-echo${i + 1}`,
      about: `${e.title}: ${echo.speaker ?? 'someone'} remarks on it, afterwards.`,
      trigger: { kind: 'interact', poiId: echo.poi },
      conditions: [done(ask), ...allLegs, done(finish), ...(echo.flag ? [{ kind: 'flag' as const, flag: echo.flag, set: echo.flagSet ?? true }] : [])],
      repeatable: true,
      actions: say(echo.lines, echo.speaker ?? speakerOf(echo.lines, '')),
    })
  })
  return events
}

/**
 * Broke, and somebody on the street points you at the Jobs page. One per town,
 * on a person who is always there; they only speak up once you have busted.
 */
const NUDGES: { poi: string; speaker: string; lines: string[] }[] = [
  { poi: 'sc-regular', speaker: 'Regular', lines: ['Regular: Cleaned out? Welcome to the club; we meet at the bar. Loretta at the Sand Dollar always needs something carried. Menu, Jobs.'] },
  { poi: 'rb-diner-pilot', speaker: 'Pilot', lines: ['Pilot: Pockets empty? The Landing pays in small favours. Dutch, Sal, a fish rack at Muddy Bend. It’s all under Jobs in the menu.'] },
  { poi: 'ch-suit', speaker: 'Suit', lines: ['Suit: A bad night is just a long errand. The Fish Pier is full of people who’d pay a stranger to fetch things. Jobs, in the menu.'] },
  { poi: 'pc-lifeguard', speaker: 'Lifeguard', lines: ['Lifeguard: Saw you walk out of the casino. Don’t drown in it. A woman on the beach needs a ring carried. It’s on the Jobs page.'] },
  { poi: 'nm-tout', speaker: 'Tout', lines: ['Tout: Tapped out? Don’t buy a system, take a job. The Boneyard’s got a chapel and a sign. Jobs page, friend. Free advice, cash work.'] },
  { poi: 'pl-photographer', speaker: 'Photographer', lines: ['Photographer: Ruin photographs beautifully, you know. So does a recovery. The Belvedere has a dog and a jacket. Jobs, in the menu.'] },
]

/**
 * Something small for the nearly broke: a chore for a few dollars, by day, while
 * you hold under a set amount (Silver Creek $100, Muddy Bend $150, the Fish Pier
 * $1,000, Lagoon Beach $600, the Boneyard $1,000, the Belvedere $5,000). It takes an hour and cannot hand out a day, so it is a way
 * back from a bust and never a bankroll.
 */
const ODD_JOBS: { poi: string; pay: number; below: number; by: Record<'morning' | 'afternoon' | 'evening', string[]>; over: string[]; night: string }[] = [
  {
    poi: 'rb-fishrack',
    night: 'Angler: Rack’s shut in the dark. I gut from first light till the sun goes. Come back by day if you’re still short.',
    pay: 25,
    below: 150,
    by: {
      morning: ['A man on the bank is behind on his catch. You gut perch for an hour without being asked twice.', 'He pays you out of a coffee can: twenty-five dollars and a fish you do not want.'],
      afternoon: ['The perch have been sitting in the sun. You clean them quickly, holding your breath.', 'Twenty-five dollars from the coffee can, and a look that says he knows you are broke.'],
      evening: ['Tonight’s catch is late and the light is going. You scale by lantern until your thumbs ache.', 'Twenty-five dollars, damp. He says you have the hands for it, which is not a compliment.'],
    },
    over: ['The man looks at your wallet and shakes his head. “You don’t need this one. Come back when you’re broke.”'],
  },
  {
    poi: 'pc-crabtraps',
    night: 'Trapper: Traps don’t come up in the dark, and nor do I. Morning till the palms go black, if you still need it.',
    pay: 100,
    below: 600,
    by: {
      morning: ['A woman on the sand is hauling crab traps and cursing the tide. You haul the other end for an hour.', 'A hundred dollars from a bait tin. She keeps the crabs.'],
      afternoon: ['The traps are heavy with weed. You cut it off, and the woman does the swearing for both of you.', 'A hundred dollars. She counts it twice out of habit and a third time out of pride.'],
      evening: ['You help carry the last traps up the beach as the palms go black against the sky.', 'A hundred dollars, a tired nod, and a crab you are not allowed to name.'],
    },
    over: ['The woman eyes you. “You look flush. I only hire the desperate; it’s a matter of principle.”'],
  },
  {
    poi: 'nm-scrapheap',
    night: 'Scrap dealer: Glass in the dark? No. I load by day, morning till the signs come on. Come back then.',
    pay: 300,
    below: 1000,
    by: {
      morning: ['A scrap dealer is pulling dead tubing out of the Boneyard and wants a second pair of hands. You carry glass for an hour in his spare gloves.', 'Three hundred dollars in bills that smell of pink neon. He tells you to wash.'],
      afternoon: ['The sun on dead neon is a bad idea. You carry sign-letters out of the glare for an hour, one letter at a time.', 'Three hundred dollars. He hands it over with a pair of gloves you are not to return.'],
      evening: ['The first of the signs flickers as you load the last of the tubing. The dealer swears at it.', 'Three hundred dollars. “For the light,” he says, and does not elaborate.'],
    },
    over: ['The dealer squints at your roll and waves you away. “I pay people who need it. You don’t. Go and gamble.”'],
  },
  {
    poi: 'sc-woodpile',
    night: 'Loretta: (from the office window) Not in the dark, you’ll lose a toe. The woodpile’s a day job: morning till dusk.',
    pay: 20,
    below: 100,
    by: {
      morning: ['The Sand Dollar’s woodpile has been waiting since spring. You stack it, a log at a time, for an hour.', 'Twenty dollars from the till, and a glass of something that is mostly water.'],
      afternoon: ['The afternoon sun makes every log a hot one. You carry them to the shade for an hour.', 'Twenty dollars, folded small. Loretta’s doing, by the handwriting.'],
      evening: ['The motel’s sign flickers on as you split kindling. Somebody has been burning the furniture.', 'Twenty dollars and a stiff back. It is a living, of a sort.'],
    },
    over: ['A woman on the step looks at your wallet. “You’re not that desperate. Go on, the wood will keep.”'],
  },
  {
    poi: 'ch-nets',
    night: 'Net-mender: Can’t see a knot in the dark. Morning to evening, if you’re still short.',
    pay: 250,
    below: 1000,
    by: {
      morning: ['A net-mender on the quay needs a hand holding the far end of a torn seine. You hold it, and then mend it, for an hour.', 'Two hundred and fifty dollars from a wet purse. She says you have fisherman’s hands, as an insult.'],
      afternoon: ['The nets are drying in the glare and stink of the whole harbour. You untangle three by hand.', 'Two hundred and fifty dollars. “That’s a day rate. Don’t tell the union; there isn’t one.”'],
      evening: ['The boats are coming in. You sort the day’s tangle on the quay while the light turns the water copper.', 'Two hundred and fifty dollars, a nod, and a mackerel you did not ask for.'],
    },
    over: ['The net-mender glances at your roll. “Not yours, this. I only hire the ones with empty pockets.”'],
  },
  {
    poi: 'pl-planters',
    night: 'Steward: The terrace takes no work after dark. Any hour from morning until the lamps are lit.',
    pay: 1500,
    below: 5000,
    by: {
      morning: ['A terrace steward needs somebody to carry the marble planters back into the shade before the guests come. You carry six, very carefully.', 'Fifteen hundred dollars, in an envelope with the Belvedere’s crest. A steward does not tip; he settles.'],
      afternoon: ['The terrace is being re-laid, and the planters must come up for the afternoon. You help the stewards lift each one.', 'Fifteen hundred dollars, counted into your hand by a man who will never mention it again.'],
      evening: ['A function is on the terrace and the planters must be moved before the lamps are lit. You are an extra pair of hands in a borrowed jacket.', 'Fifteen hundred dollars. “For discretion,” says the steward. You are, at least, discreet.'],
    },
    over: ['The steward looks at your wallet and then at the marble. “Sir has no need of this. Sir should play.”'],
  },
]

/**
 * Night jobs are only open after dark, and nothing else lets you wait for it: a
 * bench by the path. "Wait until dark" fades out and moves the clock on to night
 * and no further, so it can never hand out a day.
 */
const DARK_BENCHES: { id: string; areaId: string; col: number; row: number; name: string; lines: string[] }[] = [
  { id: 'nm-darkbench', areaId: 'nm-outskirts', col: 21, row: 8, name: 'Bench', lines: ['A bench made from a dead sign, under a buzzing lamp. It is already dark; the CHAPEL sign is the only light worth sitting by.'] },
  { id: 'pl-darkbench', areaId: 'pl-outskirts', col: 6, row: 5, name: 'Bench', lines: ['A marble bench beside a gilded lamp. It is already dark, and the other lamps are waiting for somebody with a taper.'] },
]

const UNTIL_DARK: EventAction[] = [
  { kind: 'fade', to: 'out' },
  {
    kind: 'if',
    when: [{ kind: 'period', period: 'morning' }],
    then: [{ kind: 'advancePeriod', steps: 3 }],
    else: [
      {
        kind: 'if',
        when: [{ kind: 'period', period: 'afternoon' }],
        then: [{ kind: 'advancePeriod', steps: 2 }],
        else: [{ kind: 'advancePeriod', steps: 1 }],
      },
    ],
  },
  { kind: 'fade', to: 'in' },
]

export const DARK_BENCH_EVENTS: GameEvent[] = DARK_BENCHES.map((b) => ({
  id: `wait-for-dark-${b.id}`,
  about: 'A bench to wait on until night, for the jobs that only happen after dark. Never rolls a day.',
  trigger: { kind: 'interact', poiId: b.id },
  conditions: [{ kind: 'period', period: DAYLIGHT }],
  repeatable: true,
  actions: [
    {
      kind: 'choice',
      prompt: 'Sit and wait for dark?',
      options: [
        { label: 'Wait until dark', then: [...UNTIL_DARK, { kind: 'dialogue', lines: ['The light goes, slowly, and then all at once. It is night.'] }] },
        { label: 'Not yet', then: [] },
      ],
    },
  ],
}))

/**
 * The second hour: once a town has two paid jobs, its notice board has been added to,
 * so the walk back to the outskirts has something new on it. Until then the board
 * says what it always said.
 */
const BOARD_ECHOES: { board: string; town: string[]; line: string }[] = [
  { board: 'sc-board', town: ['errand-wendell', 'errand-loretta', 'errand-dennis'], line: 'Added in marker, over the flyers: “THANK YOU, BRAD. THE CASSEROLE WAS HOT. THE URN WAS HEARD.”' },
  { board: 'rb-board', town: ['errand-dutch', 'errand-sal', 'errand-cornelius', 'errand-quiz'], line: 'A new card: “SPONGE BAKED. BUTTON RULED HEADS. BETTY IS ASLEEP WITH A RING’S WORTH OF PRIDE.”' },
  { board: 'ch-board', town: ['errand-busker', 'errand-fenn', 'errand-odalys', 'errand-coach'], line: 'Scrawled under the mackerel prices: “ACCORDION HOME. LIGHT WATCHED. NAPKIN READ.” Somebody has underlined the napkin.' },
  { board: 'pc-board', town: ['errand-chad', 'errand-pruitt', 'errand-bernard', 'errand-stakeout'], line: 'A damp strip of paper: “RING FOUND. DINGHY STILL AFLOAT. THE DAY IS WHATEVER THE BARMAN SAYS.”' },
  { board: 'nm-board', town: ['errand-chapel', 'errand-dee', 'errand-randy'], line: 'Added in pink marker: “VACANCY — ONE NIGHT ONLY. WITNESSES WANTED NO LONGER. THE SIGN HAS BEEN LIT.”' },
  { board: 'pl-board', town: ['errand-fong', 'errand-teodoro', 'errand-lamps'], line: 'A small brass plate has been screwed on: “THE LAMPS ARE LIT. THE JACKET FITS. THE HEDGE IS OCCUPIED.”' },
]

/**
 * The board remembers you. Under what it always says, a second card about one of
 * the town's jobs: it reads one way until that job is paid, and then the way you
 * did it (the flag the job's choice sets), so walking back past it says what you
 * left behind.
 */
export const BOARD_MEMORY: { board: string; errand: string; flag: StoryFlag; open: string; set: string; clear: string }[] = [
  {
    board: 'sc-board',
    errand: 'errand-wendell',
    flag: 'errandWendellSold',
    open: 'Lower down, a printed card: NICO’S DEBT RECOVERY & CATERING. WEDDINGS, WAKES, WENDELLS.',
    set: 'Nico’s card has a new line in pen: NOW SERVING, PRAWN RING BY WENDELL. Somebody has drawn a small sad moustache beside it.',
    clear: 'Nico’s card has a new line in pen: STILL LOOKING FOR WENDELL. Under it, another hand: “Ask Brad. Brad never met him.”',
  },
  {
    board: 'rb-board',
    errand: 'errand-sal',
    flag: 'errandSalBluffed',
    open: 'Under it, a card in a shaky hand: SAL, OLD FERRY DECK. OWED $300 ON A COIN FLIP. WANTS A WITNESS. WILL SPLIT.',
    set: 'Sal’s card is crossed out. Pinned over it: GONE FISHING, ANOTHER COUNTY. IF CASS ASKS, THE STRANGER SAID IT.',
    clear: 'Sal’s card has a new line: PAID IN FULL, COUNTED OUT LOUD. HEADS. A brass button is pinned beside it.',
  },
  {
    board: 'ch-board',
    errand: 'errand-fenn',
    flag: 'errandFennPointed',
    open: 'Tacked in the corner, a tide table in pencil: THE KEEPER TAKES BETS. Under it, in another hand: ABEL IS ON THE QUAY. HE WALKS.',
    set: 'The tide table has two names on it now, Fenn’s and Abel’s, and THURSDAYS in a careful hand. No bets taken.',
    clear: 'The tide table is back up, bets open. Under it, in Fenn’s hand: “A WHISTLE IS CHEAPER THAN A COAT. THANK YOU.”',
  },
  {
    board: 'pc-board',
    errand: 'errand-pruitt',
    flag: 'errandPruittSold',
    open: 'Pinned with a fishhook: THE FLEET REQUIRES SARDINES. APPLY END OF DOCK. NOT TODAY. — THE COMMODORE.',
    set: 'The Commodore’s notice has a ledger page pinned to it, in a neat hand: INSTALMENT ONE, PEARS. Somebody has drawn a heart.',
    clear: 'The Commodore’s notice has a new line: THE CAMPAIGN CONTINUES. MRS. TRAN IS ELSEWHERE, THANKS TO A FRIEND OF THE FLEET.',
  },
  {
    board: 'nm-board',
    errand: 'errand-chapel',
    flag: 'errandObjected',
    open: 'A card in a heart-shaped frame: SECOND WITNESS NEEDED. ASK FOR ELVIRA. SPEAK NOW OR FOREVER, ETC.',
    set: 'The heart-shaped frame holds a still from a stream now: somebody at the arch with a hand up. OBJECTION! 40K VIEWS.',
    clear: 'The heart-shaped frame holds a photo now: Randy, Sheila, Elvira, and a stranger who witnessed. THE REAL THING, FOR AN HOUR.',
  },
  {
    board: 'pl-board',
    errand: 'errand-fong',
    flag: 'errandFongAdmitted',
    open: 'Engraved below: THE GATE ADMITS GUESTS, CATS IN CARRIERS, AND ONE PARROT WITH A MEMBERSHIP. NOTHING ELSE PASSES.',
    set: 'A brass slip has been added to the gate rules: AND ONE GREYHOUND, BY ARRANGEMENT WITH MS. FONG. The guard polishes it.',
    clear: 'A line has been added to the gate rules in fine pen: AND ONE SCARF, WHICH SOMETIMES BARKS. The guard has not removed it.',
  },
]

export const BOARD_ECHO_EVENTS: GameEvent[] = BOARD_ECHOES.map((b) => {
  const plain = SCENERY.find((p) => p.id === b.board)!.lines
  const pairs: [string, string][] = b.town.flatMap((a, i) => b.town.slice(i + 1).map((c): [string, string] => [a, c]))
  const first = pairs.reduceRight<EventAction[]>(
    (rest, [x, y]) => [{ kind: 'if', when: [done(`${x}-done`), done(`${y}-done`)], then: say([b.line]), else: rest }],
    say(plain),
  )
  const memory = BOARD_MEMORY.find((m) => m.board === b.board)
  const second: EventAction[] = memory
    ? [
        {
          kind: 'if',
          when: [done(`${memory.errand}-done`)],
          then: [{ kind: 'if', when: [{ kind: 'flag', flag: memory.flag }], then: say([memory.set]), else: say([memory.clear]) }],
          else: say([memory.open]),
        },
      ]
    : []
  return {
    id: `board-echo-${b.board}`,
    about: 'The notice board: what it says, a card that remembers how one of the town’s jobs went, and what is written once two are paid.',
    trigger: { kind: 'interact', poiId: b.board },
    repeatable: true,
    actions: [...first, ...second],
  }
})

export const ODD_JOB_EVENTS: GameEvent[] = ODD_JOBS.flatMap((j) => [
  ...(['morning', 'afternoon', 'evening'] as const).map((period): GameEvent => ({
    id: `odd-job-${j.poi}-${period}`,
    about: `Odd job: a few dollars for an hour's work, only by day and only while nearly broke (${period} wording).`,
    trigger: { kind: 'interact', poiId: j.poi },
    conditions: [{ kind: 'cashBelow', amount: j.below }, { kind: 'period', period }],
    repeatable: true,
    actions: [...say(j.by[period]), ...WAIT, { kind: 'giveCash', amount: j.pay }],
  })),
  {
    id: `odd-job-${j.poi}-night`,
    about: 'Odd job, turned down at night by somebody who says when it is open (any hour before night).',
    trigger: { kind: 'interact', poiId: j.poi },
    conditions: [{ kind: 'cashBelow', amount: j.below }, { kind: 'period', period: 'night' }],
    repeatable: true,
    actions: say([j.night]),
  },
  {
    id: `odd-job-${j.poi}-over`,
    about: 'Odd job, turned down: you are not broke enough for it.',
    trigger: { kind: 'interact', poiId: j.poi },
    conditions: [{ kind: 'cashAtLeast', amount: j.below }],
    repeatable: true,
    actions: say(j.over),
  },
])

export const BUST_NUDGE_EVENTS: GameEvent[] = NUDGES.map((n) => ({
  id: `bust-nudge-${n.poi}`,
  about: `Broke: ${n.speaker} points you at the Jobs page in the menu.`,
  trigger: { kind: 'interact', poiId: n.poi },
  conditions: [{ kind: 'count', of: 'busted', atLeast: 1 }, { kind: 'cashBelow', amount: 300 }],
  repeatable: true,
  actions: say(n.lines, n.speaker),
}))

export const ERRAND_EVENTS: GameEvent[] = [...ERRANDS.flatMap(eventsOf), ...BUST_NUDGE_EVENTS, ...ODD_JOB_EVENTS, ...DARK_BENCH_EVENTS, ...BOARD_ECHO_EVENTS]

/**
 * Errands live here, not in `events.ts`'s own list: the editor reads and writes
 * that list as text, and these are generated from the data above.
 */
export const isErrandEvent = (id: string) => ERRAND_EVENTS.some((e) => e.id === id)

/** What the client may pay, as the Jobs page says it: one figure, or the range across the endings. */
export function payRange(e: Errand): string {
  const pays = [e.defaultReward ?? e.reward, ...(e.variants ?? []).map((v) => v.reward)]
  const lo = Math.min(...pays)
  const hi = Math.max(...pays)
  return lo === hi ? `$${hi.toLocaleString()}` : `$${lo.toLocaleString()}-$${hi.toLocaleString()}`
}

/**
 * Where you are in an errand: not started, open (with what to do next), or done.
 * Given the flags, once every leg is done it says what the answer you gave left to collect.
 */
export function errandStage(
  e: Errand,
  completed: string[],
  flags?: Partial<Record<StoryFlag, boolean>>,
): { stage: 'new' | 'open' | 'done'; todo?: string; pays?: string } {
  if (completed.includes(`${e.id}-done`)) return { stage: 'done' }
  if (!completed.includes(`${e.id}-ask`)) return { stage: 'new' }
  const next = e.legs.findIndex((_, i) => !completed.includes(`${e.id}-leg${i + 1}`))
  if (next !== -1) return { stage: 'open', todo: e.legs[next].todo, pays: `Pays ${payRange(e)}.` }
  const variant = flags ? e.variants?.find((v) => flags[v.flag]) : undefined
  const pay = variant ? variant.reward : flags ? (e.defaultReward ?? e.reward) : undefined
  return {
    stage: 'open',
    todo: variant?.todo ?? `Go back to ${e.clientName} for the money.`,
    pays: pay !== undefined ? `Pays $${pay.toLocaleString()}.` : `Pays ${payRange(e)}.`,
  }
}
