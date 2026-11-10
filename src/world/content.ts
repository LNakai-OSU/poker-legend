import type { LessonDef, ShopDef, TableDef, VenueDef } from './types'

// ---------------------------------------------------------------------------
// Tables — the stakes ladder. Skill tiers climb with the blinds, and a whale
// shows up at most stops as a target of opportunity rather than a difficulty step.
// ---------------------------------------------------------------------------

export const TABLES: Record<string, TableDef> = {
  'silvercreek-low': {
    id: 'silvercreek-low',
    name: 'Low Stakes Hold’em',
    theme: 'silvercreek',
    smallBlind: 1,
    bigBlind: 2,
    buyIn: 100,
    opponents: ['ray', 'sully'],
    walkIns: ['bobbi', 'walt', 'dottie'],
    nights: [
      {
        id: 'silvercreek-payday',
        title: 'Payday Friday',
        blurb: 'The cheques are cashed. Big Dale has come in off the reservation road with all of his.',
        days: [4],
        periods: ['evening', 'night'],
        guests: ['dale'],
      },
    ],
  },
  'riverbend-mid': {
    id: 'riverbend-mid',
    name: 'Riverboat 2/5',
    theme: 'riverboat',
    smallBlind: 2,
    bigBlind: 5,
    buyIn: 300,
    opponents: ['deb', 'mack', 'tiny', 'gus', 'pearl'],
    walkIns: [],
    nights: [
      {
        id: 'riverbend-tiny',
        title: 'Tiny’s Saturday',
        blurb: 'Saturday is the one night Tiny is on the boat from the first bell to the last.',
        days: [5],
        periods: ['evening', 'night'],
        guests: ['tiny'],
      },
    ],
  },
  'crescent-main': {
    id: 'crescent-main',
    name: 'Harbor Room 5/10',
    theme: 'harbor',
    smallBlind: 5,
    bigBlind: 10,
    buyIn: 1000,
    opponents: ['corinne', 'vance', 'hollis', 'omar', 'bette'],
    walkIns: [],
    nights: [
      {
        id: 'crescent-regatta',
        title: 'Regatta Saturday',
        blurb: 'The sailing club has come ashore, and Hollis is on his third buy-in before the first hand.',
        days: [5],
        periods: ['evening', 'night'],
        guests: ['hollis'],
      },
    ],
  },
  'palmcay-high': {
    id: 'palmcay-high',
    name: 'Cay Room 10/25',
    theme: 'palmcay',
    smallBlind: 10,
    bigBlind: 25,
    buyIn: 2500,
    opponents: ['adaeze', 'kit'],
    walkIns: ['lucien', 'sloane', 'ferris'],
    nights: [
      {
        id: 'palmcay-cruise',
        title: 'Cruise Ship Sunday',
        blurb: 'The ship is in until midnight. Two of its passengers have wandered upstairs with their holiday money.',
        days: [6],
        periods: ['afternoon', 'evening'],
        guests: ['maud', 'hector'],
      },
    ],
  },
  'palmcay-tourist': {
    id: 'palmcay-tourist',
    name: 'The Tourist Table',
    theme: 'palmcay',
    smallBlind: 10,
    bigBlind: 25,
    buyIn: 2500,
    opponents: ['bernard', 'rosa', { character: 'kit', persona: 'returning' }],
    walkIns: ['maud', 'hector'],
  },
  'mesa-main': {
    id: 'mesa-main',
    name: 'Mesa Main 25/50',
    theme: 'mesa',
    smallBlind: 25,
    bigBlind: 50,
    buyIn: 10000,
    opponents: ['lorna', 'dmitri', 'whitaker', 'teo', 'junie'],
    walkIns: [],
    nights: [
      {
        id: 'mesa-convention',
        title: 'Convention Weekend',
        blurb: 'Three thousand dentists are in town, and Whitaker is hosting the ones who play.',
        days: [5, 6],
        periods: ['evening', 'night'],
        guests: ['whitaker'],
      },
    ],
  },
  'mesa-highroller': {
    id: 'mesa-highroller',
    name: 'High Roller 100/200',
    theme: 'mesa',
    smallBlind: 100,
    bigBlind: 200,
    buyIn: 40000,
    dressCode: 3,
    opponents: ['saul', 'priya'],
    walkIns: ['cassius', 'ilse', 'rourke'],
  },
  'lumina-nosebleed': {
    id: 'lumina-nosebleed',
    name: 'Nosebleed 100/200',
    theme: 'lumina',
    smallBlind: 100,
    bigBlind: 200,
    buyIn: 30000,
    dressCode: 3,
    opponents: ['xue', 'marchetti', 'kingsley'],
    walkIns: ['anselm', 'tamsin'],
    nights: [
      {
        id: 'lumina-gala',
        title: 'Gala Night',
        blurb: 'The benefit is upstairs. Kingsley came to be photographed losing, and he will lose a lot.',
        days: [4],
        periods: ['night'],
        guests: ['kingsley'],
      },
    ],
  },
  'crescent-headsup': {
    id: 'crescent-headsup',
    name: 'Heads Up 5/10',
    theme: 'harbor',
    smallBlind: 5,
    bigBlind: 10,
    buyIn: 1000,
    opponents: [{ character: 'vance', persona: 'headsUp' }],
  },
  'crescent-private': {
    id: 'crescent-private',
    name: 'The Back Room',
    theme: 'backroom',
    smallBlind: 10,
    bigBlind: 20,
    buyIn: 2000,
    opponents: ['delphine', 'otto'],
  },
  'mesa-headsup': {
    id: 'mesa-headsup',
    name: 'Heads Up 50/100',
    theme: 'mesa',
    smallBlind: 50,
    bigBlind: 100,
    buyIn: 20000,
    dressCode: 2,
    opponents: [{ character: 'lorna', persona: 'headsUp' }],
  },
  'mesa-private': {
    id: 'mesa-private',
    name: 'The Invitational',
    theme: 'invitational',
    smallBlind: 200,
    bigBlind: 400,
    buyIn: 60000,
    dressCode: 3,
    opponents: ['august', 'rhodes'],
  },
  // The bosses: one on one in each casino's private room, the buy-in against the
  // buy-in. Each is a better player than the one before. See `CASINO_GOALS`.
  'silvercreek-boss': {
    id: 'silvercreek-boss',
    name: 'Lou’s Back Table',
    theme: 'silvercreek',
    smallBlind: 5,
    bigBlind: 10,
    buyIn: 500,
    bossOf: 'silverCreek',
    opponents: ['lou'],
  },
  'riverbend-boss': {
    id: 'riverbend-boss',
    name: 'The Captain’s Cabin',
    theme: 'riverboat',
    smallBlind: 15,
    bigBlind: 30,
    buyIn: 1500,
    bossOf: 'riverbend',
    opponents: ['odette'],
  },
  'crescent-boss': {
    id: 'crescent-boss',
    name: 'Mr. Bellamy’s Table',
    theme: 'backroom',
    smallBlind: 50,
    bigBlind: 100,
    buyIn: 5000,
    bossOf: 'crescentHarbor',
    opponents: ['bellamy'],
  },
  // Kit's side game at Palm Cay (`kit-palmcay`): heads up, stakes of your choosing.
  'palmcay-kit': {
    id: 'palmcay-kit',
    name: 'The Corner Table',
    theme: 'palmcay',
    smallBlind: 50,
    bigBlind: 100,
    buyIn: 5000,
    opponents: ['kit'],
  },
  'palmcay-boss': {
    id: 'palmcay-boss',
    name: 'The Owner’s Table',
    theme: 'palmcay',
    smallBlind: 150,
    bigBlind: 300,
    buyIn: 15000,
    bossOf: 'palmCay',
    opponents: ['ines'],
  },
  'mesa-boss': {
    id: 'mesa-boss',
    name: 'The Vale Suite',
    theme: 'invitational',
    smallBlind: 500,
    bigBlind: 1000,
    buyIn: 50000,
    bossOf: 'neonMesa',
    opponents: ['vale'],
  },
  // The way to the final: a hundred hands in ten rounds with the blinds going up
  // every round, a new player in every chair that is emptied, then the six that
  // are left play it out. Win it and you are seated at the Invitational.
  'lumina-tournament': {
    id: 'lumina-tournament',
    name: 'The Poker Legends Tournament',
    theme: 'lumina',
    smallBlind: 100,
    bigBlind: 200,
    buyIn: 20000,
    dressCode: 4,
    tournament: {
      rounds: 10,
      handsPerRound: 10,
      blinds: [[100, 200], [150, 300], [200, 400], [300, 600], [400, 800], [600, 1200], [800, 1600], [1000, 2000], [1500, 3000], [2000, 4000]],
    },
    opponents: ['xue', 'marchetti', 'kingsley', 'saul', 'priya'],
    walkIns: ['cassius', 'ilse', 'rourke', 'anselm', 'tamsin', 'lucien', 'sloane', 'ferris', 'maud', 'hector', 'dmitri', 'whitaker', 'lorna', 'teo', 'junie', 'omar', 'bette', 'hollis', 'corinne', 'vance'],
  },
  // The televised final of the Legends Invitational: six at the table, and you
  // are the short stack by a mile — the story opens here and comes back to it
  // until you win it. Nothing is paid to sit and nothing is kept for losing;
  // `buyIn` is the unit everybody else's stack is a multiple of.
  'lumina-finale': {
    id: 'lumina-finale',
    name: 'The Legends Invitational — Final Table',
    theme: 'finale',
    smallBlind: 1000,
    bigBlind: 2000,
    buyIn: 100000,
    yourStack: 0.15,
    freeroll: true,
    prize: 750000,
    dressCode: 4,
    isFinale: true,
    opponents: ['nadia', 'gaines', 'contessa', 'bernard', 'zeke'],
  },
}

// ---------------------------------------------------------------------------
// Shops — clothes gate the high rooms, vehicles cut travel costs.
// ---------------------------------------------------------------------------

export const SHOPS: Record<string, ShopDef> = {
  'silvercreek-gift': {
    id: 'silvercreek-gift',
    name: 'Gift Shop',
    items: [
      {
        id: 'card-protector',
        name: 'Lucky card protector',
        price: 40,
        blurb: 'Something to hold that is not your cards. You watch the table instead.',
        effect: { kind: 'tellClarity', value: 0.08 },
      },
      {
        id: 'hoodie',
        name: 'Casino hoodie',
        price: 80,
        blurb: 'Silver Creek across the chest. You look like you are here a lot.',
        effect: { kind: 'reputation', value: 1 },
        wear: { style: 'hoodie', color: '#9a2a34' },
      },
    ],
  },
  'riverbend-outfitters': {
    id: 'riverbend-outfitters',
    name: 'Dockside Outfitters',
    items: [
      {
        id: 'bicycle',
        name: 'Second-hand bicycle',
        price: 150,
        blurb: 'Beats waiting on the bus.',
        effect: { kind: 'travelDiscount', value: 0.1 },
      },
      {
        id: 'work-jacket',
        name: 'Pressed jacket',
        price: 250,
        blurb: 'Enough to not look like you wandered in off the dock.',
        effect: { kind: 'dressCode', level: 1 },
        wear: { style: 'jacket', color: '#6a5a44' },
      },
    ],
  },
  'crescent-menswear': {
    id: 'crescent-menswear',
    name: 'Harbor Menswear',
    items: [
      {
        id: 'tailored-suit',
        name: 'Tailored suit',
        price: 1200,
        blurb: 'The first thing anyone at this level notices.',
        effect: { kind: 'dressCode', level: 2 },
        wear: { style: 'suit', color: '#2a3350' },
      },
    ],
  },
  'crescent-auto': {
    id: 'crescent-auto',
    name: 'Auto Row',
    items: [
      {
        id: 'sedan',
        name: 'Used sedan',
        price: 4000,
        blurb: 'Nothing flash. Gets you between towns cheap.',
        effect: { kind: 'fastTravel', discount: 0.5 },
        car: { topSpeed: 5, handling: 5, grip: 5, paint: '#4a78b8' },
      },
      {
        id: 'beater',
        name: 'Beater',
        price: 1200,
        blurb: 'Runs, mostly. Fine for a street race. Not for the highway.',
        effect: { kind: 'racer' },
        car: { topSpeed: 3, handling: 3, grip: 3, paint: '#a8884a' },
      },
    ],
  },
  'crescent-garage': {
    id: 'crescent-garage',
    name: 'Auto Row Garage',
    items: [
      {
        id: 'street-tyres',
        name: 'Street tyres',
        price: 600,
        blurb: 'Grip, for the price of a bad night. Bolts onto whatever you drive.',
        effect: { kind: 'carTune', stat: 'grip', value: 1 },
      },
      {
        id: 'tuned-exhaust',
        name: 'Tuned exhaust',
        price: 900,
        blurb: 'Louder and a little faster. Bolts onto whatever you drive.',
        effect: { kind: 'carTune', stat: 'topSpeed', value: 1 },
      },
    ],
  },
  'palmcay-boutique': {
    id: 'palmcay-boutique',
    name: 'Cay Boutique',
    items: [
      {
        id: 'resort-blazer',
        name: 'Resort blazer',
        price: 3000,
        blurb: 'Cut well enough for rooms that check.',
        effect: { kind: 'dressCode', level: 3 },
        wear: { style: 'jacket', color: '#e4dcc4' },
      },
    ],
  },
  'palmcay-marina': {
    id: 'palmcay-marina',
    name: 'Marina Motors',
    items: [
      {
        id: 'convertible',
        name: 'Convertible',
        price: 18000,
        blurb: 'Impractical. Fast. Cheap to run between coasts.',
        effect: { kind: 'fastTravel', discount: 0.75 },
        car: { topSpeed: 7, handling: 7, grip: 6, paint: '#d8402c' },
      },
    ],
  },
  'palmcay-garage': {
    id: 'palmcay-garage',
    name: 'Marina Garage',
    items: [
      {
        id: 'sport-suspension',
        name: 'Sport suspension',
        price: 2500,
        blurb: 'The car goes where you point it. Bolts onto whatever you drive.',
        effect: { kind: 'carTune', stat: 'handling', value: 1 },
      },
      {
        id: 'racing-slicks',
        name: 'Racing slicks',
        price: 3000,
        blurb: 'Oil is a suggestion. Bolts onto whatever you drive.',
        effect: { kind: 'carTune', stat: 'grip', value: 1 },
      },
      {
        id: 'turbo-kit',
        name: 'Turbo kit',
        price: 4000,
        blurb: 'A whistle, then a shove in the back. Bolts onto whatever you drive.',
        effect: { kind: 'carTune', stat: 'topSpeed', value: 1 },
      },
    ],
  },
  'mesa-luxury': {
    id: 'mesa-luxury',
    name: 'Mesa Luxury',
    items: [
      {
        id: 'designer-suit',
        name: 'Designer suit',
        price: 12000,
        blurb: 'The high roller room stops asking questions.',
        effect: { kind: 'dressCode', level: 3 },
        wear: { style: 'suit', color: '#5a2a44' },
      },
      {
        id: 'gold-watch',
        name: 'Gold watch',
        price: 40000,
        blurb: 'Says something before you do. Doormen notice it.',
        effect: { kind: 'reputation', value: 5 },
      },
    ],
  },
  'mesa-motors': {
    id: 'mesa-motors',
    name: 'Mesa Motors',
    items: [
      {
        id: 'sports-car',
        name: 'Sports car',
        price: 90000,
        blurb: 'You will never need to think about travel again.',
        effect: { kind: 'fastTravel', discount: 0.9 },
        car: { topSpeed: 9, handling: 8, grip: 7, paint: '#f2c230' },
      },
    ],
  },
  'mesa-garage': {
    id: 'mesa-garage',
    name: 'Mesa Garage',
    items: [
      {
        id: 'coilovers',
        name: 'Coilovers',
        price: 10000,
        blurb: 'Every turn of the wheel arrives. Bolts onto whatever you drive.',
        effect: { kind: 'carTune', stat: 'handling', value: 1 },
      },
      {
        id: 'wide-slicks',
        name: 'Wide slicks',
        price: 9000,
        blurb: 'A contact patch like a handshake. Bolts onto whatever you drive.',
        effect: { kind: 'carTune', stat: 'grip', value: 1 },
      },
      {
        id: 'race-ecu',
        name: 'Race ECU',
        price: 14000,
        blurb: 'Whatever the factory was holding back. Bolts onto whatever you drive.',
        effect: { kind: 'carTune', stat: 'topSpeed', value: 1 },
      },
    ],
  },
  // Cars that are won, not sold: nothing in any town points here. The price is
  // what the car is worth, which is what a wreck of it is worked out from.
  winnings: {
    id: 'winnings',
    name: 'Winnings',
    items: [
      {
        id: 'harbor-coupe',
        name: 'Otto’s coupe',
        price: 7000,
        blurb: 'Won on a slip. Otto still says it pulls left.',
        effect: { kind: 'fastTravel', discount: 0.6 },
        car: { topSpeed: 6, handling: 6, grip: 5, paint: '#2e8a5a' },
      },
      {
        id: 'cay-roadster',
        name: 'Inés’s roadster',
        price: 30000,
        blurb: 'Won on a slip. It smells of her sunscreen.',
        effect: { kind: 'fastTravel', discount: 0.8 },
        car: { topSpeed: 8, handling: 8, grip: 6, paint: '#f0f0e8' },
      },
      {
        id: 'vale-gt',
        name: 'Vale’s GT',
        price: 120000,
        blurb: 'Won on a slip. Nobody has seen him lose a car before.',
        effect: { kind: 'fastTravel', discount: 0.92 },
        car: { topSpeed: 10, handling: 9, grip: 8, paint: '#1c1c28' },
      },
    ],
  },
  'lumina-atelier': {
    id: 'lumina-atelier',
    name: 'Lumina Atelier',
    items: [
      {
        id: 'tuxedo',
        name: 'Bespoke tuxedo',
        price: 25000,
        blurb: 'Required if you ever want to sit across from her.',
        effect: { kind: 'dressCode', level: 4 },
        wear: { style: 'tux', color: '#14141c' },
      },
    ],
  },
}

// ---------------------------------------------------------------------------
// Venues — restaurants trade cash for a read on the room, clubs are where
// invitations to private games actually come from.
// ---------------------------------------------------------------------------

export const VENUES: Record<string, VenueDef> = {
  'riverbend-diner': {
    id: 'riverbend-diner',
    name: 'The Landing Diner',
    kind: 'restaurant',
    restsForDays: 1,
    price: 12,
    blurb: 'Vinyl booths, bottomless coffee, and every regular from the boat.',
    lines: [
      'The coffee is bad in a way that feels deliberate.',
      'Two dealers in the next booth are complaining about Tiny, who apparently buys in every single day and never leaves.',
    ],
  },
  'crescent-supper': {
    id: 'crescent-supper',
    name: 'Bellweather Supper Club',
    kind: 'restaurant',
    restsForDays: 1,
    price: 120,
    blurb: 'White tablecloths, and half the card room eats here.',
    lines: [
      'You eat properly for the first time in a while.',
      'Someone at the bar explains, loudly, that they only lose because they run bad. Nobody corrects them.',
    ],
  },
  'crescent-club': {
    id: 'crescent-club',
    name: 'The Harbour Room',
    kind: 'club',
    price: 200,
    reputationNeeded: 25,
    unlocksTableId: 'crescent-private',
    blurb: 'Low light, low ceilings, and a back room nobody mentions.',
    lines: [
      'The room is full of people who know each other.',
      'You get a couple of polite nods and nothing else. Come back when your name means something.',
    ],
    inviteLines: [
      'Delphine: You\u2019re the one who has been running over the five-ten game.',
      'Delphine: There\u2019s a game in the back on Thursdays. Two thousand to sit, and Otto never folds.',
      'Delphine: Consider yourself invited.',
    ],
  },
  'palmcay-grill': {
    id: 'palmcay-grill',
    name: 'Shoreline Grill',
    kind: 'restaurant',
    restsForDays: 1,
    price: 260,
    blurb: 'Open to the water, and priced accordingly.',
    lines: [
      'You eat something caught this morning and watch the ferry come in.',
      'A waiter mentions Bernard has been at the tourist table since Tuesday.',
    ],
  },
  'mesa-club': {
    id: 'mesa-club',
    name: 'Ultraviolet',
    kind: 'club',
    price: 2000,
    reputationNeeded: 90,
    unlocksTableId: 'mesa-private',
    blurb: 'A rooftop full of people being seen.',
    lines: [
      'You buy a drink you do not want and stand where you can watch the room.',
      'Nobody here needs another player they have never heard of.',
    ],
    inviteLines: [
      'August: People keep saying your name, which is unusual for someone nobody knows.',
      'August: We run something private. Sixty to sit. Rhodes will be there, and Rhodes is a philanthropist.',
      'August: Do not embarrass me.',
    ],
  },
}

// ---------------------------------------------------------------------------
// Mentor lessons. Each one is real, standard poker strategy, and each one
// unlocks the analytical tool a real player would use at the table.
// ---------------------------------------------------------------------------

export const LESSONS: Record<string, LessonDef> = {
  position: {
    id: 'position',
    name: 'Position',
    price: 200,
    teaching: [
      'Hal: Position is who acts last. Acting last means you have information nobody else has.',
      'Hal: So play tight when you’re first to act, and widen up on the button. Same cards, different hand.',
      'Hal: Most losing players play the same range from every seat. Don’t be one.',
    ],
    unlocks: 'Seat positions are now labelled at the table.',
  },
  'pot-odds': {
    id: 'pot-odds',
    name: 'Pot Odds',
    price: 500,
    teaching: [
      'Hal: When you face a bet, compare what you have to call against what’s already out there.',
      'Hal: Call 20 into a pot of 80 and you’re risking 20 to win 100 — you need to be right one time in five.',
      'Hal: That number is your break-even. Below it, folding is just arithmetic.',
    ],
    unlocks: 'The table now shows the pot odds and break-even equity on every call.',
  },
  bankroll: {
    id: 'bankroll',
    name: 'Bankroll Management',
    price: 1000,
    teaching: [
      'Hal: Good players go broke all the time. Usually not from playing badly — from playing too big.',
      'Hal: Standard advice for cash games is twenty buy-ins for the stake you sit in.',
      'Hal: Variance doesn’t care that you were a favourite. Give it room to be wrong.',
    ],
    unlocks: 'You’ll be warned when a buy-in is too large for your bankroll.',
  },
  'hand-reading': {
    id: 'hand-reading',
    name: 'Hand Reading',
    price: 2500,
    teaching: [
      'Hal: Stop asking what they have. Ask what they’d play this way — that’s a range, not a hand.',
      'Hal: Then ask how your hand does against that whole range, not against the one card you’re afraid of.',
      'Hal: Every street, their range narrows. Yours should too.',
    ],
    unlocks: 'The table now shows your made hand and live equity against the field.',
  },
  tells: {
    id: 'tells',
    name: 'Spotting Tells',
    price: 6000,
    teaching: [
      'Hal: A tell is a change, not a behaviour. You need their baseline first.',
      'Hal: Weak players get loud when they’re weak and quiet when they’re strong. It really is that crude.',
      'Hal: Good players know all of that, so up there a tell is as likely to be bait. Weight it, don’t obey it.',
    ],
    unlocks: 'You now notice fainter reads that you’d otherwise miss.',
  },
}

export function allShopItems() {
  return Object.values(SHOPS).flatMap((shop) => shop.items)
}

export function findItem(itemId: string) {
  return allShopItems().find((item) => item.id === itemId) ?? null
}

export { SPONSORS, MISSIONS } from './npcs'
export {
  CITIES,
  CITY_ORDER,
  COLLECTOR_MIN_PLAYER_DISTANCE,
  allAreas,
  allPois,
  collectorSpawn,
  distanceToEscape,
  escapeTiles,
  AREAS,
  findArea,
} from './cities'
