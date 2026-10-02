import type { LessonDef, ShopDef, TableDef, VenueDef } from './types'

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
      { id: 'ray', name: 'Ray', skillTier: 'novice', archetype: 'station' },
      { id: 'sully', name: 'Sully', skillTier: 'amateur', archetype: 'nit' },
    ],
  },
  'riverbend-mid': {
    id: 'riverbend-mid',
    name: 'Riverboat 2/5',
    smallBlind: 2,
    bigBlind: 5,
    buyIn: 300,
    opponents: [
      { id: 'deb', name: 'Deb', skillTier: 'amateur', archetype: 'regular' },
      { id: 'mack', name: 'Mack', skillTier: 'competent', archetype: 'nit' },
      { id: 'tiny', name: 'Tiny', skillTier: 'novice', archetype: 'whale', stackMultiplier: 2 },
      { id: 'gus', name: 'Gus', skillTier: 'novice', archetype: 'station' },
      { id: 'pearl', name: 'Pearl', skillTier: 'competent', archetype: 'regular' },
    ],
  },
  'crescent-main': {
    id: 'crescent-main',
    name: 'Harbor Room 5/10',
    smallBlind: 5,
    bigBlind: 10,
    buyIn: 1000,
    opponents: [
      { id: 'corinne', name: 'Corinne', skillTier: 'competent', archetype: 'regular' },
      { id: 'vance', name: 'Vance', skillTier: 'competent', archetype: 'station' },
      { id: 'hollis', name: 'Hollis', skillTier: 'amateur', archetype: 'whale', stackMultiplier: 2 },
      { id: 'omar', name: 'Omar', skillTier: 'amateur', archetype: 'maniac' },
      { id: 'bette', name: 'Bette', skillTier: 'competent', archetype: 'nit' },
    ],
  },
  'palmcay-high': {
    id: 'palmcay-high',
    name: 'Cay Room 10/25',
    smallBlind: 10,
    bigBlind: 25,
    buyIn: 2500,
    opponents: [
      { id: 'adaeze', name: 'Adaeze', skillTier: 'competent', archetype: 'nit' },
      { id: 'kit', name: 'Kit', skillTier: 'sharp', archetype: 'maniac' },
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
      { id: 'rosa', name: 'Rosa', skillTier: 'amateur', archetype: 'regular' },
      { id: 'kit2', name: 'Kit', skillTier: 'sharp', archetype: 'maniac' },
    ],
  },
  'mesa-main': {
    id: 'mesa-main',
    name: 'Mesa Main 25/50',
    smallBlind: 25,
    bigBlind: 50,
    buyIn: 10000,
    opponents: [
      { id: 'lorna', name: 'Lorna', skillTier: 'sharp', archetype: 'regular' },
      { id: 'dmitri', name: 'Dmitri', skillTier: 'sharp', archetype: 'nit' },
      { id: 'whitaker', name: 'Whitaker', skillTier: 'competent', archetype: 'whale', stackMultiplier: 2 },
      { id: 'teo', name: 'Teo', skillTier: 'competent', archetype: 'maniac' },
      { id: 'junie', name: 'Junie', skillTier: 'sharp', archetype: 'regular' },
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
      { id: 'saul', name: 'Saul', skillTier: 'sharp', archetype: 'nit' },
      { id: 'priya', name: 'Priya', skillTier: 'elite', archetype: 'regular' },
    ],
  },
  'lumina-nosebleed': {
    id: 'lumina-nosebleed',
    name: 'Nosebleed 100/200',
    smallBlind: 100,
    bigBlind: 200,
    buyIn: 30000,
    dressCode: 3,
    opponents: [
      { id: 'xue', name: 'Xue', skillTier: 'elite', archetype: 'maniac' },
      { id: 'marchetti', name: 'Marchetti', skillTier: 'elite', archetype: 'nit' },
      { id: 'kingsley', name: 'Kingsley', skillTier: 'competent', archetype: 'whale', stackMultiplier: 2 },
    ],
  },
  'crescent-headsup': {
    id: 'crescent-headsup',
    name: 'Heads Up 5/10',
    smallBlind: 5,
    bigBlind: 10,
    buyIn: 1000,
    opponents: [{ id: 'vance-hu', name: 'Vance', skillTier: 'competent', archetype: 'station' }],
  },
  'crescent-private': {
    id: 'crescent-private',
    name: 'The Back Room',
    smallBlind: 10,
    bigBlind: 20,
    buyIn: 2000,
    opponents: [
      { id: 'delphine', name: 'Delphine', skillTier: 'sharp', archetype: 'regular' },
      { id: 'otto', name: 'Otto', skillTier: 'amateur', archetype: 'whale', stackMultiplier: 3 },
    ],
  },
  'mesa-headsup': {
    id: 'mesa-headsup',
    name: 'Heads Up 50/100',
    smallBlind: 50,
    bigBlind: 100,
    buyIn: 20000,
    dressCode: 2,
    opponents: [{ id: 'lorna-hu', name: 'Lorna', skillTier: 'sharp', archetype: 'regular' }],
  },
  'mesa-private': {
    id: 'mesa-private',
    name: 'The Invitational',
    smallBlind: 200,
    bigBlind: 400,
    buyIn: 60000,
    dressCode: 3,
    opponents: [
      { id: 'august', name: 'August', skillTier: 'elite', archetype: 'nit' },
      { id: 'rhodes', name: 'Rhodes', skillTier: 'competent', archetype: 'whale', stackMultiplier: 4 },
    ],
  },
  'lumina-finale': {
    id: 'lumina-finale',
    name: 'The Challenge — Heads Up',
    // Deep-stacked on purpose: the buy-in is the biggest in the game, but at
    // 250/500 that was only 240bb and the match was decided by the first
    // all-in. At 50/100 the same money is 1,200bb, so there is room to be
    // out-played over a session instead of out-flipped in one hand.
    smallBlind: 50,
    bigBlind: 100,
    buyIn: 120000,
    dressCode: 4,
    isFinale: true,
    opponents: [{ id: 'nadia', name: 'Nadia Okonkwo', skillTier: 'elite', archetype: 'regular' }],
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
        effect: { kind: 'fastTravel', discount: 0.5 },
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
        effect: { kind: 'fastTravel', discount: 0.75 },
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
