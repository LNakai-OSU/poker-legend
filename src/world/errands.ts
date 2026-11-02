import type { EventAction, GameEvent } from './events'
import type { PoiDef } from './types'
import type { TimePeriod } from '../game/time'
import type { CityId } from '../game/state'

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
 * (`errandEvents`) and ordinary fixtures (`errandPois`). There are no flags and
 * no new mechanics: what stage you are at is which of the errand's own events
 * have already played, which is what `eventDone` has always been for.
 *
 *   ask      the client, the first time you talk to them
 *   hint     the client again, while the job is open (repeatable)
 *   legs     each a fixture to visit, in order
 *   finish   back to the client, who pays
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
  look?: PoiDef['look']
  role?: PoiDef['role']
}

export interface ErrandLeg {
  /** The fixture or person to visit, by POI id. */
  poi: string
  /** What the Jobs page says to do next. */
  todo: string
  /** Speaker-prefixed lines ("Mabel: …"). A line with no prefix is narration. */
  lines: string[]
  /** What else happens once the lines are read: time passing, the light going. */
  then?: EventAction[]
  /** Who is speaking, for the text box: a plain name or a character id. */
  speaker?: string
  /**
   * Only at these hours. A leg that waits passes an hour, and the hour after night
   * is the next day, which no errand may hand out (rule 4).
   */
  periods?: TimePeriod[]
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
  reward: number
  /** New fixtures this errand puts in the world. Existing ones are named by `poi` alone. */
  people: ErrandPerson[]
}

const WAIT: EventAction[] = [{ kind: 'fade', to: 'out' }, { kind: 'advancePeriod' }, { kind: 'fade', to: 'in' }]
const DAYLIGHT: TimePeriod[] = ['morning', 'afternoon', 'evening']

export const ERRANDS: Errand[] = [
  // --- Silver Creek --------------------------------------------------------
  {
    id: 'errand-wendell',
    where: 'the Sand Dollar Motor Court, down the path south off Reservation Road',
    title: 'Wendell, Room 6',
    cityId: 'silverCreek',
    about: 'A man hiding at the Sand Dollar from a bookie wants a disguise from the gift shop.',
    client: 'sc-wendell',
    clientName: 'Wendell',
    ask: [
      'Wendell: Psst. Keep walking. No — stop walking, that’s worse. Stand there like you’re reading the motel sign.',
      'Wendell: I owe a man named Fat Nico four hundred dollars on a dog race. The dog won. The photo finish disagreed.',
      'Wendell: He knows my face. He does not know my face in a hat. Nobody does. I have never worn a hat.',
      'Wendell: The valet by the casino sees everything. Ask if Nico’s about, then the gift shop: hat, sunglasses, novelty moustache. Say they’re for Wendell. The clerk will know.',
      'Wendell: I’ve got sixty dollars. I’ve been hiding it from myself since March.',
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
    ],
    finish: [
      'Wendell: The Groucho. Perfect. Hat, shades. Do I look like a man who has never owed anybody anything?',
      'Wendell: Don’t answer that. Here — sixty. And if a large man asks after a Wendell, you’ve never heard the name. It’s a terrible name. I’m changing it to Brad.',
    ],
    reward: 60,
    people: [
      {
        id: 'sc-wendell',
        name: 'Wendell',
        areaId: 'sc-outskirts',
        col: 5,
        row: 6,
        lines: ['Brad: There is no Wendell in Room 6. There is a Brad. Brad is on holiday.'],
        look: { hat: 'cap', hatColor: '#6a6a7a' },
      },
    ],
  },
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
      'Loretta: This is tuna casserole. Don’t make that face, it’s love. Give it to the bartender. She’ll get it into him between hands. He’ll eat with one hand and fold with the other.',
      'Loretta: Tell him the bed in Room 2 is made. It’s been made since 1994.',
    ],
    hint: ['Loretta: Bartender. Casserole. Ray. Keep it level, it’s the good dish.'],
    legs: [
      {
        poi: 'sc-bartender',
        speaker: 'Bartender',
        todo: 'Get Loretta’s casserole to Ray, through the bartender.',
        lines: [
          'Bartender: A casserole? That’s Loretta’s dish. Say no more.',
          'Ray: Is that tuna? Hand it here. Don’t talk to me, I’m due.',
          'Ray: …Tell Loretta I’ll be along. After this hand.',
          'Bartender: He’s eaten the lot. I have never seen that man fold so fast.',
        ],
      },
    ],
    finish: [
      'Loretta: He ate it? All of it? Even the crunchy top?',
      'Loretta: “After this hand.” He’s said that since 1994. But he said it warm.',
      'Loretta: Here, seventy. It’s Room 2 money. He’s not going to use the room. Don’t tell him I paid you, he’ll think I’ve gone soft.',
    ],
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
  {
    id: 'errand-dennis',
    where: 'the Smoker, outside the Silver Creek casino',
    title: 'Dennis, one more time',
    cityId: 'silverCreek',
    about: 'The Smoker’s oldest friend wanted to be scattered at the last sign before the highway lets go.',
    client: 'sc-smoker',
    clientName: 'Smoker',
    ask: [
      'Smoker: You. New face. Sit. Not literally.',
      'Smoker: My friend Dennis passed in March. Forty years at this casino, mostly at the bar. Silver Creek has no high-limit bar, which was the joke Dennis never got.',
      'Smoker: His will says to scatter him at the mile sign on Reservation Road. “So the last thing that ever told me not to go further is the last thing I see.”',
      'Smoker: Dolores wanted him by the blue chair. We compromised: the sign. She’s still not speaking to me.',
      'Smoker: I can’t do it. I’d cry on the highway and somebody would honk. Here — the urn. Take it to the sign and read it to him. He liked being told.',
    ],
    hint: ['Smoker: The mile sign, on the road. Read it to him. Out loud. He’ll know.'],
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
    ],
    finish: [
      'Smoker: Did a truck honk? …He’d have loved that.',
      'Smoker: He left a hundred dollars “to whoever carries me.” I told him nobody would. Go on. Lose it slowly. He’d say spread it over a few hands.',
    ],
    reward: 100,
    people: [],
  },

  // --- Riverbend Landing ---------------------------------------------------
  {
    id: 'errand-dutch',
    where: 'his houseboat at Muddy Bend, south off River Road',
    title: 'Lemon sponge, no questions',
    cityId: 'riverbend',
    about: 'Cass’s collector can’t be seen buying his mother a birthday cake.',
    client: 'rb-dutch',
    clientName: 'Dutch',
    ask: [
      'Dutch: Don’t. Don’t say it. I know what I am. I’m the man in the yellow slicker.',
      'Dutch: It’s my mum’s birthday. Eighty-one. She lives on this houseboat, and she believes I work in river logistics.',
      'Dutch: I need a cake. The diner does a lemon sponge. If I walk in there in this slicker, Deb tells the boat, and a man half the Landing owes money to cannot be seen buying a lemon sponge.',
      'Dutch: Say it’s for you. Say you have a sweet tooth and no shame. Two hundred, and I won’t know your face for a few days. In a manner of speaking.',
    ],
    hint: ['Dutch: Lemon sponge. The diner. Say it’s for you. Say it with conviction.'],
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
    ],
    finish: [
      'Dutch: Lemon sponge. Frosted. “Happy Birthday Mum.” …Hell.',
      'A voice from inside the boat: “Is that my boy?”',
      'Dutch: Coming, Mum! Logistics! …Two hundred. Go. And thank you. If I’m hunting you next week I’ll feel bad about it for about a minute.',
    ],
    reward: 200,
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
  {
    id: 'errand-sal',
    where: 'the old ferry deck at Muddy Bend, south off River Road',
    title: 'Sal, in a transitional period',
    cityId: 'riverbend',
    about: 'A man hiding from Cass on the old ferry deck needs to look like a fisherman.',
    client: 'rb-sal',
    clientName: 'Sal',
    ask: [
      'Sal: Quiet. Don’t look at me, look at the water. We’re talking about fish.',
      'Sal: I borrowed four hundred from Cass. Pleasant about it, she was. She’s always pleasant. It’s due Thursday. I lost it Tuesday on a coin flip against a man with no coin.',
      'Sal: Her brother-in-law watches the dock in a yellow slicker. To get past him I need to look like I belong on the river. Outfitters. Waders, a hat, and one of those vests with the hooks on.',
      'Sal: I’m not a coward. I’m a man in a transitional period. Hundred and fifty for your trouble. It’s what I’m not giving Cass.',
    ],
    hint: ['Sal: The outfitters. Waders, hat, vest with the hooks. Don’t look at me.'],
    legs: [
      {
        poi: 'outfitters',
        speaker: 'Clerk',
        todo: 'Get waders, a hat and a hooked vest from the outfitters for Sal.',
        lines: [
          'Clerk: Waders, hat, the vest with the hooks. For Sal. Sal doesn’t fish. Sal asked last year for “authentic fish smell.” We tried to sell him a haddock.',
          'Clerk: Tell him it’s on account. He’s very much on account.',
        ],
      },
    ],
    finish: [
      'Sal: Waders on. Hat on. I look like a man who knows the river. …I don’t know the river.',
      'Sal: I’m unrecognisable. Even to myself. That’s the idea. One-fifty. Spend it before Cass finds me — she’d only take it.',
    ],
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
    hint: ['Cornelius: Nightcrawler Deluxe from Mabel. Cast it at the reeds. Patience.'],
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
      'Cornelius: She’d be right. She usually was.',
    ],
    reward: 220,
    people: [
      {
        id: 'rb-cornelius',
        name: 'Cornelius',
        areaId: 'rb-outskirts',
        col: 15,
        row: 9,
        lines: ['Cornelius: I keep it on a string, round my neck. Betty and I have an understanding now.'],
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
        lines: ['The water is brown, slow and very quiet. Something large is thinking about you. (It only bites by day.)'],
      },
    ],
  },

  // --- Crescent Harbor -----------------------------------------------------
  {
    id: 'errand-busker',
    where: 'the Busker, on Harbor Boulevard',
    title: 'The accordion in the window',
    cityId: 'crescentHarbor',
    about: 'The Busker pawned his accordion to buy into a heads-up game with Vance.',
    client: 'ch-busker',
    clientName: 'Busker',
    ask: [
      'Busker: Hat money? No. Different problem.',
      'Busker: I don’t play for the hat. I play for the accordion. I pawned her at the Gull & Anchor on the Fish Pier to buy into the heads-up table against Vance. Vance folded the winning hand. Folded it. The man’s a ghost.',
      'Busker: A busker without an instrument is a man shouting at a harbour. Take my ticket. The pier’s off the Coast Road, west of the Boulevard — there’s a path down through the quay.',
      'Busker: Bring her back and I’ll give you a night’s hat and tomorrow’s. Three-fifty. It’s more than the hat has ever held.',
    ],
    hint: ['Busker: Gull & Anchor, on the Fish Pier. Off the Coast Road. Ticket four-four-seven-one.'],
    legs: [
      {
        poi: 'ch-pawn',
        speaker: 'Pawnbroker',
        todo: 'Collect the Busker’s accordion from the Gull & Anchor on the Fish Pier.',
        lines: [
          'Pawnbroker: Ticket four-four-seven-one. The accordion. She plays herself at night, you know. Quietly. In the back. It’s unsettling.',
          'Pawnbroker: Loan was eighty. Tell him the interest was the song. Go on, she’s been wanting to go home.',
        ],
      },
    ],
    finish: [
      'Busker: Oh, you beauty. Come here.',
      'The Busker plays a chord. A small crowd forms, then evaporates, as small crowds do.',
      'Busker: Three-fifty. That’s a night’s hat and tomorrow’s. And a song: “Ballad of the Kind Stranger.” Fourteen verses. The last is about pot odds.',
    ],
    reward: 350,
    people: [
      {
        id: 'ch-pawn',
        name: 'Pawnbroker',
        areaId: 'ch-outskirts',
        col: 4,
        row: 6,
        lines: ['Pawnbroker: Everything in here is somebody’s worst night. Mind the accordion.'],
        role: 'clerk',
      },
    ],
  },
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
        todo: 'Stand watch at the end of the pier.',
        lines: [
          'You take the post at the end of the pier. A gull lands on a bollard and looks at you like a supervisor.',
          'The tide turns. The light comes on over your head, slow and grand, and a little embarrassed about it.',
          'At dusk a tall man in a long grey coat comes along the quay. Unhurried. Hat in his hands. He is looking for Fenn, and he is looking at you.',
        ],
        then: [
          {
            kind: 'choice',
            speaker: 'Abel',
            prompt: 'Abel asks: “Is the Captain in?”',
            options: [
              {
                label: 'Whistle',
                then: [{ kind: 'dialogue', lines: ['You whistle. Abel stops, looks at you for a long time, then at the light, and walks slowly back the way he came.'] }],
              },
              {
                label: 'Point him to the light',
                then: [
                  { kind: 'dialogue', speaker: 'Abel', lines: ['Abel: Thank you. That is the kind of help a man remembers. For you, fifty. For the Captain, a conversation.'] },
                  { kind: 'giveCash', amount: 150 },
                ],
              },
            ],
          },
          ...WAIT,
        ],
      },
    ],
    finish: [
      'Fenn: Abel’s been and gone, one way or another. I heard the whistle, or I heard a man thinking about one.',
      'Fenn: I’ve counted it twice. Four-fifty, and some of it was in my boot. It’s yours. I’ll pay Mr. Emeka the old-fashioned way: late.',
    ],
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
  {
    id: 'errand-odalys',
    where: 'her fish stall on the Fish Pier, south off the Coast Road',
    title: 'The napkin behind the bar',
    cityId: 'crescentHarbor',
    about: 'A fishmonger on the pier was Hal’s first student, and left her best work on a napkin.',
    client: 'ch-odalys',
    clientName: 'Odalys',
    ask: [
      'Odalys: Mackerel, forty a pound. …You’re not here for mackerel. You have the look of someone Hal would sell a lesson to.',
      'Odalys: He taught me first. Before Nadia. Before anyone. I was good. Then I wasn’t, and I walked out onto this pier and stayed.',
      'Odalys: The night I understood pot odds I wrote the formula on a cocktail napkin at the Bellweather. The maître d’ framed it. It’s the only thing I ever wrote that was entirely right.',
      'Odalys: Bring it to me. Not to keep. I want to read it once, in daylight, with fish on my hands.',
    ],
    hint: ['Odalys: The Bellweather, the maître d’. A napkin, in a frame. Gently.'],
    legs: [
      {
        poi: 'crescent-supper',
        speaker: 'Maître d’',
        todo: 'Ask the Bellweather’s maître d’ for Odalys’s napkin.',
        lines: [
          'Maître d’: Madam Odalys’s napkin. Behind glass, with its own little light. Nobody has touched it in nineteen years.',
          'Maître d’: She should have it. Bring it back by Friday, I have a reputation.',
          'The napkin says, in a young, sure hand: “Call = bet ÷ (pot + bet). Fold = never enough. —O.”',
        ],
      },
    ],
    finish: [
      'Odalys reads it twice, once with her lips moving.',
      'Odalys: “Fold = never enough.” I meant that as a joke. I was nineteen. It’s the most honest thing I’ve ever said about this game.',
      'Odalys: Take it back to the Bellweather when I’m done. Don’t tell Hal. Or tell him. Tell him the mackerel’s fresh.',
      'Odalys: Five hundred. Not for the napkin. For the pot odds — it’s the only thing I ever sold that I would sell again.',
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

  // --- Palm Cay ------------------------------------------------------------
  {
    id: 'errand-chad',
    where: 'the beach hut at Lagoon Beach, south off the Palm Cay road',
    title: 'The second honeymoon',
    cityId: 'palmCay',
    about: 'A sunburned honeymooner tipped a ring to a waiter; Bernard thought it was a chip.',
    client: 'pc-chad',
    clientName: 'Chad',
    ask: [
      'Chad: Don’t touch me. I’m burned. It isn’t the sun, it’s the shame.',
      'Chad: Brenda and I came for our second honeymoon. I played the Tourist Table once. Once. I thought tipping with her ring was a matter of style.',
      'Chad: Bernard was across the felt. Two days he’s been sitting there, and he thinks it’s Thursday. He took the ring, he bought lobster at the grill, and he tipped it. The waiter has it. Probably.',
      'Chad: Brenda is in the hut not speaking to me through a very thin wall. Bring it back and there’s five hundred in it.',
    ],
    hint: ['Chad: The grill. The waiter. Bernard said it was Thursday. Please hurry.'],
    legs: [
      {
        poi: 'palmcay-grill',
        speaker: 'Waiter',
        todo: 'Get the ring back from the waiter at the grill.',
        lines: [
          'Waiter: A ring? Mr. Bernard left it as a tip. He said, “Keep the chip.” He said it was Thursday.',
          'Waiter: It has been Thursday here for three days. I put it in the salt shaker for safekeeping.',
          'Waiter: Tell the lady it’s been very well seasoned.',
        ],
      },
    ],
    finish: [
      'Chad: The ring. In a salt shaker. It’s a little crunchy.',
      'Through the hut’s thin wall: “Is it crunchy?” Chad: It’s crunchy, Bren!',
      'Chad: She says she’ll marry me a third time. Five hundred, as promised. It was the honeymoon budget anyway. We’ll have a quiet one.',
    ],
    reward: 500,
    people: [
      {
        id: 'pc-chad',
        name: 'Chad',
        areaId: 'pc-outskirts',
        col: 4,
        row: 5,
        lines: ['Chad: We’re renewing our vows on Thursday. Bernard says it’s Thursday. I’m choosing to believe him.'],
      },
    ],
  },
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
      'Pruitt: The flag says surrender in a language nobody speaks. I’ll make it worth your while. One thousand. I have it. It’s in the sardines.',
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
        then: [
          {
            kind: 'choice',
            speaker: 'Mrs. Tran',
            prompt: 'Where is the Commodore?',
            options: [
              {
                label: 'Never heard of him',
                then: [{ kind: 'dialogue', speaker: 'Mrs. Tran', lines: ['Mrs. Tran: You lie like a man who has played a great deal of poker. Badly. I will see myself down to the dock.'] }],
              },
              {
                label: 'End of the dock. Sorry.',
                then: [
                  { kind: 'dialogue', speaker: 'Mrs. Tran', lines: ['Mrs. Tran: Thank you. A finder’s fee. Never say I was not fair.'] },
                  { kind: 'giveCash', amount: 300 },
                ],
              },
            ],
          },
        ],
      },
    ],
    finish: [
      'Pruitt: Provisions! A week at sea! The sardines, I see, have a hundred-dollar bill in each tin.',
      'Pruitt looks at the six feet of lagoon between the dock and the shore. Pruitt: We’ll sail tomorrow. Tide’s wrong.',
      'Down the beach, a small woman in white waves, holding a fruit basket.',
      'Pruitt: Oh no. She’s brought pears. Take the thousand and go. I’m going down with my ship. It’s a dinghy.',
    ],
    reward: 1000,
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

  // --- Neon Mesa -----------------------------------------------------------
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
      'Elvira: I’m Elvira. I do the Strip’s weddings, all hours, no appointment. Tonight: Randy and Sheila, who met at the Mesa Main table forty minutes ago and have known each other for a full forty minutes.',
      'Elvira: Nevada wants two witnesses. Mine is Zeke “KingPin,” who streams every ceremony to eleven thousand strangers and his mother. He’s gone to the Invitational lobby for snacks.',
      'Elvira: You’ll do. Stand at the arch, look moved, say “I witness.” Four thousand from the happy couple’s tip jar. They put the whole stack in it.',
    ],
    hint: ['Elvira: The arch. Look moved. Say “I witness.” The couple’s very nervous.'],
    legs: [
      {
        poi: 'nm-arch',
        periods: DAYLIGHT,
        todo: 'Stand at the arch and witness Randy and Sheila.',
        lines: [
          'You take your place at the arch. Randy is in a borrowed tuxedo. Sheila is in a borrowed tuxedo. Neither of them is surprised.',
          'Randy: Do I? I think… I do.',
          'Sheila: I do. I mean, who cares, we’re up eleven grand.',
          'Zeke, arriving with a bag of chips: Chat, we are LIVE. A real wedding. Say congratulations. Mum — Mum, eat something.',
          'You witness. Elvira cries a little. She cries a little at all of them, and means every one.',
        ],
        then: [
          {
            kind: 'choice',
            speaker: 'Elvira',
            prompt: 'Elvira nods at you. Your line.',
            options: [
              { label: 'I witness', then: [{ kind: 'dialogue', speaker: 'Elvira', lines: ['Elvira: Beautiful. Cry a little. Everyone does.'] }] },
              { label: 'Does anyone else?', then: [{ kind: 'dialogue', speaker: 'Elvira', lines: ['Elvira: Nobody objects at three in the afternoon. Sit down, sweetheart.'] }] },
            ],
          },
          ...WAIT,
        ],
      },
    ],
    finish: [
      'Elvira: Beautiful. They’re in room 214 and they’ll be divorced by Sunday, and that’s why I love this job.',
      'Elvira: The tip jar. Four thousand. It’s the only honest wage on the Strip.',
    ],
    reward: 4000,
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
        col: 8,
        row: 6,
        thing: true,
        lines: ['A white arch hung with plastic roses, lit from behind by the sign that says CHAPEL in letters four feet tall.'],
      },
    ],
  },
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
      'Dee: I was a showgirl at the Starlite for thirty years. It closed in ’83. Its sign says NO VACANCY, and it’s been dark since the night the last guest never left.',
      'Dee: Tomorrow’s the anniversary. I want it lit one more night, and I want it to say VACANCY. Once. So he knows he can check out.',
      'Dee: I need a neon transformer. The showroom at Mesa Motors has an old Eldorado with one in the dash. The salesman hates that car. Ask nicely. Thirty-five hundred — it’s been in a coffee tin since ’83, for whoever fixed my sign.',
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
        then: [
          {
            kind: 'choice',
            speaker: 'Salesman',
            prompt: 'He is holding out the Eldorado’s keys.',
            options: [
              { label: 'Just the transformer', then: [{ kind: 'dialogue', speaker: 'Salesman', lines: ['Salesman: Of course. Of course. Nobody ever takes the car.'] }] },
              {
                label: 'Take the Eldorado too',
                then: [
                  { kind: 'dialogue', speaker: 'Salesman', lines: ['Salesman: Bless you. A disposal fee, from the dealership. Leave it anywhere. Preferably the desert.'] },
                  { kind: 'giveCash', amount: 250 },
                  { kind: 'dialogue', lines: ['You park the Eldorado behind a dead sign in the Boneyard. It looks like it has always lived there.'] },
                ],
              },
            ],
          },
        ],
      },
    ],
    finish: [
      'Dee throws the switch. The sign hums, stutters and catches: V-A-C-A-N-C-Y, pink, in a desert that has gone completely quiet.',
      'Dee: There you go, love. Check out whenever you like.',
      'Dee: Thirty-five hundred, out of the tin. Don’t argue, I’ve been waiting forty years to give it to someone.',
    ],
    reward: 3500,
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

  // --- Porto Lumina --------------------------------------------------------
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
      'Fong: Madame Wen forbids dogs on the terrace. If she sees me with a dog I lose my post. If she sees me without the dog I lose the dog. Bring her out. Do not chase. She respects patience. Ten thousand.',
    ],
    hint: ['Fong: The hedge. Patience. Do not say the word “walk.” Do not say it in any tone.'],
    legs: [
      {
        poi: 'pl-hedge',
        todo: 'Coax Pocket Rockets out of the cypress hedge, without saying “walk.”',
        lines: [
          'You sit down by the hedge and say nothing. For a long time. You are good at this; you play poker.',
          'Two wet eyes appear in the cypress. A very thin dog comes out, sits, and puts her head on your knee.',
          'Her tag reads: POCKET ROCKETS. If found, return to Ms. Fong. DO NOT TELL WEN.',
        ],
      },
    ],
    finish: [
      'Ms. Fong does not run. Her voice goes up an octave and she says, “Pocket,” and the dog does the running for both of them.',
      'Fong: You did not see this. I have a group chat with Dutch, from Riverbend. He did not see his, either. We are very discreet.',
      'Fong: Ten thousand. I will remember this. I will still collect. But I will remember it.',
    ],
    reward: 10000,
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
        lines: ['A tall cypress hedge. Something in it is whining, softly, in a cultured way.'],
      },
    ],
  },
  {
    id: 'errand-teodoro',
    where: 'the bench on the Belvedere, south off the Lumina road',
    title: 'The first dealer',
    cityId: 'portoLumina',
    about: 'Nadia’s first dealer wants his best jacket from the atelier, for one afternoon on the terrace.',
    client: 'pl-teodoro',
    clientName: 'Teodoro',
    ask: [
      'Teodoro: Sit, sit. The bench is free; it is always free. Nobody walks to this end of the terrace anymore.',
      'Teodoro: I was Nadia’s first dealer. Forty years ago, in a card room that is a car park now. She was nineteen. She sat down, looked at the deck and said, “Cut it again. It’s off.” It was. A card was missing its corner. Eleven years I had dealt that deck.',
      'Teodoro: Four years she has kept the penthouse and she has never once come to the terrace. She leaves her first chip of every night on the felt, for luck. I taught her that. I do not think she remembers why.',
      'Teodoro: I would like my jacket from the atelier, the grey, with the green lining, taken in. I want to wear it once, on a terrace, for nobody. Fifteen thousand — it is the whole of my tips, saved.',
    ],
    hint: ['Teodoro: The atelier. The grey jacket, the green lining. Take your time. I have no one to be on time for.'],
    legs: [
      {
        poi: 'atelier',
        speaker: 'Tailor',
        todo: 'Collect Teodoro’s grey jacket from the atelier.',
        lines: [
          'Tailor: Signor Teodoro’s grey, with the green lining. Taken in at the shoulder, cuffs let down. He asked me to make it look like a man who was once somebody’s first dealer.',
          'Tailor: There is no charge. He taught my father to read a flop, and my father taught me to read a bill.',
        ],
      },
    ],
    finish: [
      'Teodoro puts the jacket on slowly, and stands, and for a moment is very tall.',
      'Teodoro: It fits. It fits like the room did.',
      'Teodoro: Fifteen thousand. Take it, I have no use. And when you sit down across from her — and you will — leave the first chip on the felt. See what she does.',
    ],
    reward: 15000,
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
]

/** A signpost at each gap in the trees, so the way down to the outskirts is something you can see. */
const SIGNPOSTS: ErrandPerson[] = [
  { id: 'sc-signpost', name: 'Path Sign', areaId: 'road-silvercreek', col: 17, row: 12, thing: true, lines: ['A hand-painted board nailed to a post: SAND DOLLAR MOTOR COURT. WEEKLY RATES. NO VACANCY (LIES). An arrow points south down the dirt path.'] },
  { id: 'rb-signpost', name: 'Path Sign', areaId: 'road-riverbend', col: 13, row: 11, thing: true, lines: ['A board on a post: MUDDY BEND. BAIT, TACKLE, ADVICE. The path runs south to the river.'] },
  { id: 'ch-signpost', name: 'Path Sign', areaId: 'road-crescent', col: 12, row: 11, thing: true, lines: ['A painted sign: FISH PIER. FRESH CATCH, PAWN, LIGHT. A stone path runs south to the quay.'] },
  { id: 'pc-signpost', name: 'Path Sign', areaId: 'road-palmcay', col: 25, row: 11, thing: true, lines: ['A bleached board: LAGOON BEACH. HUTS BY THE WEEK. A sandy path runs south.'] },
  { id: 'nm-signpost', name: 'Path Sign', areaId: 'road-mesa', col: 18, row: 12, thing: true, lines: ['A tin sign, still faintly lit: THE BONEYARD. CHAPEL OPEN 24 HRS. A dirt track runs south.'] },
  { id: 'pl-signpost', name: 'Path Sign', areaId: 'road-lumina', col: 8, row: 12, thing: true, lines: ['A marble plaque: BELVEDERE. A stair of white stone runs south between the cypresses.'] },
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
  return [...ERRANDS.flatMap((e) => e.people), ...SIGNPOSTS]
    .filter((p) => p.areaId === areaId)
    .map((p) => ({
      id: p.id,
      name: p.name,
      col: p.col,
      row: p.row,
      color: p.thing ? THING_COLOR : POI_COLOR,
      lines: p.lines,
      action: { kind: 'flavor' as const },
      ...(p.thing ? { art: 'sign' as const } : {}),
      ...(p.look ? { look: p.look } : {}),
      ...(p.role ? { role: p.role } : {}),
    }))
}

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

function say(rawLines: string[], speaker: string): EventAction[] {
  const lines = rawLines.flatMap((l) => chunk(l))
  return [speaker ? { kind: 'dialogue', speaker, lines } : { kind: 'dialogue', lines }]
}

/** The events one errand is made of. */
export function eventsOf(e: Errand): GameEvent[] {
  const ask = `${e.id}-ask`
  const legId = (i: number) => `${e.id}-leg${i + 1}`
  const last = legId(e.legs.length - 1)
  const finish = `${e.id}-done`
  const events: GameEvent[] = []

  events.push({
    id: ask,
    about: `${e.title}: ${e.about}`,
    trigger: { kind: 'interact', poiId: e.client },
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
      conditions: [done(i === 0 ? ask : legId(i - 1)), ...(leg.periods ? [{ kind: 'period' as const, period: leg.periods }] : [])],
      actions: [...say(leg.lines, leg.speaker ?? speakerOf(leg.lines, '')), ...(leg.then ?? [])],
    })
  })
  events.push({
    id: finish,
    about: `${e.title}: back to ${e.clientName}, who pays $${e.reward.toLocaleString()}.`,
    trigger: { kind: 'interact', poiId: e.client },
    conditions: [done(ask), done(last)],
    actions: [...say(e.finish, e.clientName), { kind: 'giveCash', amount: e.reward }, { kind: 'playSound', sound: 'win' }],
  })
  return events
}

export const ERRAND_EVENTS: GameEvent[] = ERRANDS.flatMap(eventsOf)

/**
 * Errands live here, not in `events.ts`'s own list: the editor reads and writes
 * that list as text, and these are generated from the data above.
 */
export const isErrandEvent = (id: string) => ERRAND_EVENTS.some((e) => e.id === id)

/** Where you are in an errand: not started, open (with what to do next), or done. */
export function errandStage(e: Errand, completed: string[]): { stage: 'new' | 'open' | 'done'; todo?: string } {
  if (completed.includes(`${e.id}-done`)) return { stage: 'done' }
  if (!completed.includes(`${e.id}-ask`)) return { stage: 'new' }
  const next = e.legs.findIndex((_, i) => !completed.includes(`${e.id}-leg${i + 1}`))
  return next === -1
    ? { stage: 'open', todo: `Go back to ${e.clientName} for the $${e.reward.toLocaleString()}.` }
    : { stage: 'open', todo: e.legs[next].todo }
}
