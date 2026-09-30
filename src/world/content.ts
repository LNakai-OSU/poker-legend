import { parseMap } from '../overworld/tileRenderer'
import type { CityDef, LessonDef, MissionDef, ShopDef, SponsorDef, TableDef } from './types'

// ---------------------------------------------------------------------------
// Tables — the stakes ladder. Skill tiers climb with the blinds, and a whale
// shows up at most stops as a target of opportunity rather than a difficulty step.
// ---------------------------------------------------------------------------

export const TABLES: Record<string, TableDef> = {
  'silvercreek-low': {
    id: 'silvercreek-low',
    name: 'Low Stakes Hold’em',
    smallBlind: 1,
    bigBlind: 2,
    buyIn: 100,
    opponents: [
      { id: 'ray', name: 'Ray', skillTier: 'novice' },
      { id: 'sully', name: 'Sully', skillTier: 'amateur' },
    ],
  },
  'riverbend-mid': {
    id: 'riverbend-mid',
    name: 'Riverboat 2/5',
    smallBlind: 2,
    bigBlind: 5,
    buyIn: 300,
    opponents: [
      { id: 'deb', name: 'Deb', skillTier: 'amateur' },
      { id: 'mack', name: 'Mack', skillTier: 'competent' },
      { id: 'tiny', name: 'Tiny', skillTier: 'novice', archetype: 'whale', stackMultiplier: 2 },
    ],
  },
  'crescent-main': {
    id: 'crescent-main',
    name: 'Harbor Room 5/10',
    smallBlind: 5,
    bigBlind: 10,
    buyIn: 1000,
    opponents: [
      { id: 'corinne', name: 'Corinne', skillTier: 'competent' },
      { id: 'vance', name: 'Vance', skillTier: 'competent' },
      { id: 'hollis', name: 'Hollis', skillTier: 'amateur', archetype: 'whale', stackMultiplier: 2 },
    ],
  },
  'palmcay-high': {
    id: 'palmcay-high',
    name: 'Cay Room 10/25',
    smallBlind: 10,
    bigBlind: 25,
    buyIn: 2500,
    opponents: [
      { id: 'adaeze', name: 'Adaeze', skillTier: 'competent' },
      { id: 'kit', name: 'Kit', skillTier: 'sharp' },
    ],
  },
  'palmcay-tourist': {
    id: 'palmcay-tourist',
    name: 'The Tourist Table',
    smallBlind: 10,
    bigBlind: 25,
    buyIn: 2500,
    opponents: [
      { id: 'bernard', name: 'Bernard', skillTier: 'novice', archetype: 'whale', stackMultiplier: 3 },
      { id: 'rosa', name: 'Rosa', skillTier: 'amateur' },
      { id: 'kit2', name: 'Kit', skillTier: 'sharp' },
    ],
  },
  'mesa-main': {
    id: 'mesa-main',
    name: 'Mesa Main 25/50',
    smallBlind: 25,
    bigBlind: 50,
    buyIn: 10000,
    opponents: [
      { id: 'lorna', name: 'Lorna', skillTier: 'sharp' },
      { id: 'dmitri', name: 'Dmitri', skillTier: 'sharp' },
      { id: 'whitaker', name: 'Whitaker', skillTier: 'competent', archetype: 'whale', stackMultiplier: 2 },
    ],
  },
  'mesa-highroller': {
    id: 'mesa-highroller',
    name: 'High Roller 100/200',
    smallBlind: 100,
    bigBlind: 200,
    buyIn: 40000,
    dressCode: 3,
    opponents: [
      { id: 'saul', name: 'Saul', skillTier: 'sharp' },
      { id: 'priya', name: 'Priya', skillTier: 'elite' },
    ],
  },
  'lumina-nosebleed': {
    id: 'lumina-nosebleed',
    name: 'Nosebleed 200/400',
    smallBlind: 200,
    bigBlind: 400,
    buyIn: 100000,
    dressCode: 3,
    opponents: [
      { id: 'xue', name: 'Xue', skillTier: 'elite' },
      { id: 'marchetti', name: 'Marchetti', skillTier: 'elite' },
      { id: 'kingsley', name: 'Kingsley', skillTier: 'competent', archetype: 'whale', stackMultiplier: 2 },
    ],
  },
  'lumina-finale': {
    id: 'lumina-finale',
    name: 'The Challenge — Heads Up',
    smallBlind: 500,
    bigBlind: 1000,
    buyIn: 250000,
    dressCode: 4,
    isFinale: true,
    opponents: [{ id: 'nadia', name: 'Nadia Okonkwo', skillTier: 'elite' }],
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
      { id: 'card-protector', name: 'Lucky card protector', price: 40, blurb: 'Purely ceremonial. Everyone has one.' },
      { id: 'hoodie', name: 'Casino hoodie', price: 80, blurb: 'Silver Creek across the chest. Warm, at least.' },
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
        effect: { kind: 'travelDiscount', value: 0.5 },
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
        effect: { kind: 'travelDiscount', value: 0.75 },
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
      },
      { id: 'gold-watch', name: 'Gold watch', price: 40000, blurb: 'Says something before you do.' },
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
        effect: { kind: 'travelDiscount', value: 0.9 },
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
      },
    ],
  },
}

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

// ---------------------------------------------------------------------------
// Cities
// ---------------------------------------------------------------------------

const APARTMENT_MAP = parseMap(`
############
#..........#
#..FF......#
#..FF......#
#..........#
#..........#
#..........#
############
`)

const SILVER_CREEK_MAP = parseMap(`
##################
#................#
#.FFFF....FF.....#
#................#
#...........FF...#
#...........FF...#
#................#
#..FF............#
#................#
#................#
#................#
##################
`)

const RIVERBEND_MAP = parseMap(`
####################
#~~~~~~~~~~~~~~~~~~#
#~~~~~~~~~~~~~~~~~~#
#==================#
#..................#
#.,,,.....FF......,#
#.,,,.....FF.......#
#..................#
#....FF......FF....#
#..................#
#..................#
####################
`)

const CRESCENT_MAP = parseMap(`
######################
#....................#
#..FFFF...FFFF...FFF.#
#....................#
#====================#
#....................#
#..,,,,.....FF.......#
#..,,,,.....FF.......#
#....................#
#...FF.......FFFF....#
#....................#
#....................#
######################
`)

const PALM_CAY_MAP = parseMap(`
######################
#~~~~~~~~~~~~~~~~~~~~#
#~~..............~~~~#
#~...FFFF....FF....~~#
#~.................~~#
#~..,,,,,,.........~~#
#~..,,,,,,....FF...~~#
#~.................~~#
#~....FF.......FF...~#
#~~...............~~~#
#~~~~~~~~~~~~~~~~~~~~#
######################
`)

const NEON_MESA_MAP = parseMap(`
########################
#......................#
#..FFFF...FFFF...FFFF..#
#......................#
#======================#
#......................#
#..,,,,,,....FFFF......#
#..,,,,,,....FFFF......#
#......................#
#...FF......FF.....FF..#
#......................#
#......................#
########################
`)

const PORTO_LUMINA_MAP = parseMap(`
########################
#~~~~~~~~~~~~~~~~~~~~~~#
#..........,,,,........#
#..FFFF....,,,,...FFFF.#
#..........,,,,........#
#......................#
#..,,,,,,,,,,,,,,,,,,..#
#..,,,,,,,,,,,,,,,,,,..#
#......................#
#....FF..........FF....#
#......................#
########################
`)

const COLORS = {
  person: 0x6ea8fe,
  dealer: 0x3a9d5c,
  shop: 0xc084fc,
  flavor: 0xe05a5a,
  sponsor: 0xd08770,
  travel: 0x8ad4ff,
  finale: 0xf2c14e,
}

export const CITIES: Record<string, CityDef> = {
  apartment: {
    id: 'apartment',
    name: 'Your Apartment',
    blurb: 'One room, a mattress, and a window that faces a wall.',
    map: APARTMENT_MAP,
    playerStart: { col: 2, row: 5 },
    background: '#101018',
    unlockCash: 0,
    travelCost: 0,
    pois: [
      {
        id: 'marcus',
        name: 'Marcus',
        col: 8,
        row: 3,
        color: COLORS.person,
        lines: [
          'Marcus: Hey! You still coming through tonight?',
          'Marcus: Bring what you can — winner takes the whole table.',
          'Marcus: Come by around 8. You in?',
        ],
        action: { kind: 'pokerNight' },
      },
    ],
  },

  silverCreek: {
    id: 'silverCreek',
    name: 'Silver Creek Casino',
    blurb: 'Reservation resort casino. Carpet, cigarette smoke, and one live poker table.',
    map: SILVER_CREEK_MAP,
    playerStart: { col: 9, row: 9 },
    background: '#161018',
    unlockCash: 0,
    travelCost: 0,
    pois: [
      {
        id: 'slots',
        name: 'Slot Row',
        art: 'slot',
        col: 3,
        row: 2,
        color: COLORS.flavor,
        lines: [
          'The machines blink and chime for no one in particular.',
          'Not tonight — you didn’t come here to feed a machine.',
        ],
        action: { kind: 'flavor' },
      },
      {
        id: 'pitboss',
        name: 'Pit Boss',
        col: 10,
        row: 3,
        color: COLORS.dealer,
        lines: [
          'Pit Boss: Low-stakes table’s got an open seat. Dollar-two blinds.',
          'Pit Boss: Sit down whenever you’re ready.',
        ],
        action: { kind: 'table', tableId: 'silvercreek-low' },
      },
      {
        id: 'craps',
        name: 'Craps Table',
        art: 'craps',
        col: 12,
        row: 4,
        color: COLORS.flavor,
        lines: ['A small crowd groans as the shooter sevens out.', 'Maybe another time.'],
        action: { kind: 'flavor' },
      },
      {
        id: 'giftshop',
        name: 'Gift Shop',
        col: 3,
        row: 7,
        color: COLORS.shop,
        lines: ['Clerk: Souvenirs, snacks, and things nobody needs.'],
        action: { kind: 'shop', shopId: 'silvercreek-gift' },
      },
      {
        id: 'busstop',
        name: 'Bus Stop',
        col: 9,
        row: 10,
        color: COLORS.travel,
        lines: ['The route map lists towns you’ve never had a reason to visit.'],
        action: { kind: 'travel' },
      },
    ],
  },

  riverbend: {
    id: 'riverbend',
    name: 'Riverbend Landing',
    blurb: 'A permanently moored riverboat with better players and worse coffee.',
    map: RIVERBEND_MAP,
    playerStart: { col: 10, row: 9 },
    background: '#0f1620',
    unlockCash: 600,
    travelCost: 40,
    pois: [
      {
        id: 'riverboat-dealer',
        name: 'Dealer',
        col: 10,
        row: 5,
        color: COLORS.dealer,
        lines: ['Dealer: Two-five, three hundred to sit. Tiny’s been here since noon.'],
        action: { kind: 'table', tableId: 'riverbend-mid' },
      },
      {
        id: 'cass',
        name: 'Cass',
        col: 3,
        row: 7,
        color: COLORS.sponsor,
        lines: SPONSORS.cass.pitch,
        action: { kind: 'sponsor', sponsorId: 'cass' },
      },
      {
        id: 'deb',
        name: 'Deb',
        col: 5,
        row: 8,
        color: COLORS.person,
        lines: MISSIONS['riverbend-marker'].brief,
        action: { kind: 'mission', missionId: 'riverbend-marker' },
      },
      {
        id: 'outfitters',
        name: 'Outfitters',
        col: 13,
        row: 8,
        color: COLORS.shop,
        lines: ['Clerk: Jackets, bikes, whatever gets you upriver.'],
        action: { kind: 'shop', shopId: 'riverbend-outfitters' },
      },
      {
        id: 'riverbend-travel',
        name: 'Dock',
        col: 10,
        row: 10,
        color: COLORS.travel,
        lines: ['Buses and boats, both running late.'],
        action: { kind: 'travel' },
      },
    ],
  },

  crescentHarbor: {
    id: 'crescentHarbor',
    name: 'Crescent Harbor',
    blurb: 'A real city with a real card room, and people who do this for a living.',
    map: CRESCENT_MAP,
    playerStart: { col: 11, row: 10 },
    background: '#121020',
    unlockCash: 2500,
    travelCost: 120,
    pois: [
      {
        id: 'harbor-dealer',
        name: 'Dealer',
        col: 12,
        row: 6,
        color: COLORS.dealer,
        lines: ['Dealer: Five-ten, thousand to sit. Hollis is in for his third buy-in.'],
        action: { kind: 'table', tableId: 'crescent-main' },
      },
      {
        id: 'hal',
        name: 'Hal',
        col: 8,
        row: 3,
        color: COLORS.person,
        lines: [
          'Hal: Forty years in card rooms and I still take students.',
          'Hal: I don’t sell luck. I sell the things you should already be counting.',
        ],
        action: { kind: 'mentor' },
      },
      {
        id: 'emeka',
        name: 'Mr. Emeka',
        col: 17,
        row: 8,
        color: COLORS.sponsor,
        lines: SPONSORS.emeka.pitch,
        action: { kind: 'sponsor', sponsorId: 'emeka' },
      },
      {
        id: 'doorman',
        name: 'Doorman',
        col: 5,
        row: 6,
        color: COLORS.person,
        lines: MISSIONS['crescent-suit'].brief,
        action: { kind: 'mission', missionId: 'crescent-suit' },
      },
      {
        id: 'menswear',
        name: 'Harbor Menswear',
        col: 10,
        row: 2,
        color: COLORS.shop,
        lines: ['Tailor: We can have it fitted by tonight.'],
        action: { kind: 'shop', shopId: 'crescent-menswear' },
      },
      {
        id: 'autorow',
        name: 'Auto Row',
        col: 18,
        row: 2,
        color: COLORS.shop,
        lines: ['Salesman: Nothing here is new. Everything here runs.'],
        action: { kind: 'shop', shopId: 'crescent-auto' },
      },
      {
        id: 'crescent-travel',
        name: 'Transit Hub',
        col: 11,
        row: 11,
        color: COLORS.travel,
        lines: ['Departure boards for half the coast.'],
        action: { kind: 'travel' },
      },
    ],
  },

  palmCay: {
    id: 'palmCay',
    name: 'Palm Cay',
    blurb: 'A resort island where the money is soft and the regulars are not.',
    map: PALM_CAY_MAP,
    playerStart: { col: 10, row: 7 },
    background: '#0c1a1c',
    unlockCash: 8000,
    travelCost: 350,
    pois: [
      {
        id: 'cay-dealer',
        name: 'Dealer',
        col: 6,
        row: 3,
        color: COLORS.dealer,
        lines: ['Dealer: Ten-twenty-five. Twenty-five hundred to sit.'],
        action: { kind: 'table', tableId: 'palmcay-high' },
      },
      {
        id: 'tourist-dealer',
        name: 'Dealer (Tourist Table)',
        col: 13,
        row: 3,
        color: COLORS.dealer,
        lines: [
          'Dealer: Same stake, softer game. Bernard’s celebrating something.',
          'Dealer: He has been celebrating for two days.',
        ],
        action: { kind: 'table', tableId: 'palmcay-tourist' },
      },
      {
        id: 'boutique',
        name: 'Cay Boutique',
        col: 14,
        row: 6,
        color: COLORS.shop,
        lines: ['Clerk: Linen, mostly. It photographs well.'],
        action: { kind: 'shop', shopId: 'palmcay-boutique' },
      },
      {
        id: 'marina',
        name: 'Marina Motors',
        col: 6,
        row: 8,
        color: COLORS.shop,
        lines: ['Dealer: Everything on this lot is a bad financial decision.'],
        action: { kind: 'shop', shopId: 'palmcay-marina' },
      },
      {
        id: 'rosa',
        name: 'Rosa',
        col: 15,
        row: 8,
        color: COLORS.person,
        lines: MISSIONS['palmcay-tourist'].brief,
        action: { kind: 'mission', missionId: 'palmcay-tourist' },
      },
      {
        id: 'palmcay-travel',
        name: 'Ferry Dock',
        col: 10,
        row: 9,
        color: COLORS.travel,
        lines: ['The ferry runs to the mainland twice a day.'],
        action: { kind: 'travel' },
      },
    ],
  },

  neonMesa: {
    id: 'neonMesa',
    name: 'Neon Mesa',
    blurb: 'The desert city. Everyone here has studied, and the room upstairs checks your clothes.',
    map: NEON_MESA_MAP,
    playerStart: { col: 12, row: 10 },
    background: '#1a1020',
    unlockCash: 30000,
    travelCost: 900,
    pois: [
      {
        id: 'mesa-dealer',
        name: 'Dealer',
        col: 13,
        row: 6,
        color: COLORS.dealer,
        lines: ['Dealer: Twenty-five fifty. Ten thousand to sit.'],
        action: { kind: 'table', tableId: 'mesa-main' },
      },
      {
        id: 'highroller',
        name: 'High Roller Room',
        col: 15,
        row: 6,
        color: COLORS.finale,
        lines: [
          'Host: Hundred-two hundred inside. Forty thousand to sit.',
          'Host: And we do have a dress code.',
        ],
        action: { kind: 'table', tableId: 'mesa-highroller' },
      },
      {
        id: 'hal-mesa',
        name: 'Hal',
        col: 8,
        row: 3,
        color: COLORS.person,
        lines: [
          'Hal: You made it out here. Good.',
          'Hal: Everything I teach costs more now, because it’s worth more now.',
        ],
        action: { kind: 'mentor' },
      },
      {
        id: 'consortium',
        name: 'Broker',
        col: 18,
        row: 3,
        color: COLORS.sponsor,
        lines: SPONSORS.consortium.pitch,
        action: { kind: 'sponsor', sponsorId: 'consortium' },
      },
      {
        id: 'mesa-luxury',
        name: 'Mesa Luxury',
        col: 4,
        row: 2,
        color: COLORS.shop,
        lines: ['Clerk: Everything here is about being let in somewhere.'],
        action: { kind: 'shop', shopId: 'mesa-luxury' },
      },
      {
        id: 'mesa-motors',
        name: 'Mesa Motors',
        col: 11,
        row: 2,
        color: COLORS.shop,
        lines: ['Salesman: You look like a man who is tired of buses.'],
        action: { kind: 'shop', shopId: 'mesa-motors' },
      },
      {
        id: 'fixer',
        name: 'Fixer',
        col: 19,
        row: 9,
        color: COLORS.person,
        lines: MISSIONS['mesa-read'].brief,
        action: { kind: 'mission', missionId: 'mesa-read' },
      },
      {
        id: 'mesa-travel',
        name: 'Airport Shuttle',
        col: 12,
        row: 11,
        color: COLORS.travel,
        lines: ['International departures, one gate.'],
        action: { kind: 'travel' },
      },
    ],
  },

  portoLumina: {
    id: 'portoLumina',
    name: 'Porto Lumina',
    blurb: 'The last stop. Marble, harbour light, and the biggest game in the world.',
    map: PORTO_LUMINA_MAP,
    playerStart: { col: 12, row: 8 },
    background: '#141020',
    unlockCash: 120000,
    travelCost: 2500,
    pois: [
      {
        id: 'lumina-dealer',
        name: 'Dealer',
        col: 4,
        row: 3,
        color: COLORS.dealer,
        lines: ['Dealer: Two hundred, four hundred. One hundred thousand to sit.'],
        action: { kind: 'table', tableId: 'lumina-nosebleed' },
      },
      {
        id: 'nadia',
        name: 'Nadia Okonkwo',
        col: 11,
        row: 4,
        color: COLORS.finale,
        lines: [
          'Nadia: I know what you’ve been doing. Small rooms, then bigger ones.',
          'Nadia: One match. Two hundred fifty thousand each, winner takes it.',
          'Nadia: The penthouse upstairs comes with it. I’ve lived there four years.',
        ],
        action: { kind: 'table', tableId: 'lumina-finale' },
      },
      {
        id: 'atelier',
        name: 'Lumina Atelier',
        col: 19,
        row: 3,
        color: COLORS.shop,
        lines: ['Tailor: For the match, of course. Everyone comes here first.'],
        action: { kind: 'shop', shopId: 'lumina-atelier' },
      },
      {
        id: 'wen',
        name: 'Madame Wen',
        col: 18,
        row: 8,
        color: COLORS.sponsor,
        lines: SPONSORS.wen.pitch,
        action: { kind: 'sponsor', sponsorId: 'wen' },
      },
      {
        id: 'penthouse',
        name: 'Penthouse Lift',
        art: 'lift',
        col: 5,
        row: 9,
        color: COLORS.finale,
        lines: ['The attendant looks at you, then at the lift, and does not move.'],
        action: { kind: 'flavor' },
      },
      {
        id: 'lumina-travel',
        name: 'Terminal',
        col: 12,
        row: 10,
        color: COLORS.travel,
        lines: ['Everywhere you have ever played, listed on one board.'],
        action: { kind: 'travel' },
      },
    ],
  },
}

/** Travel order, used by the travel menu and unlock checks. */
export const CITY_ORDER = [
  'silverCreek',
  'riverbend',
  'crescentHarbor',
  'palmCay',
  'neonMesa',
  'portoLumina',
] as const

export function allShopItems() {
  return Object.values(SHOPS).flatMap((shop) => shop.items)
}

export function findItem(itemId: string) {
  return allShopItems().find((item) => item.id === itemId) ?? null
}
