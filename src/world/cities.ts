import { isWalkable, parseMap } from '../overworld/tileRenderer'
import { MISSIONS, SPONSORS } from './npcs'
import type { AreaDef, CityDef, PoiDef } from './types'

/**
 * Towns are made of several areas joined by doors: a street you walk down, and
 * interiors you step into. Buildings are solid blocks with a door tile in the
 * facade — stepping onto the door takes you inside.
 */

const COLORS = {
  person: 0x6ea8fe,
  dealer: 0x3a9d5c,
  shop: 0xc084fc,
  flavor: 0xe05a5a,
  sponsor: 0xd08770,
  travel: 0x8ad4ff,
  finale: 0xf2c14e,
  local: 0x9aa7b5,
}

/** A two-storey street: buildings north and south, road down the middle. */
const STREET = parseMap(`
########################
######D########D########
#----------------------#
#--""--------------""--#
#----------------------#
#======================#
#======================#
#======================#
#----------------------#
#--""--------------""--#
#----------------------#
######D########D########
########################
`)

/** A wider strip for the big cities, with four shopfronts. */
const BOULEVARD = parseMap(`
##############################
####D######D########D#####D###
#----------------------------#
#--""----------------------""#
#----------------------------#
#============================#
#============================#
#============================#
#----------------------------#
#--""----------------------""#
#----------------------------#
####D######D########D#####D###
##############################
`)

/** A waterfront promenade. */
const PROMENADE = parseMap(`
##############################
#~~~~~~~~~~~~~~~~~~~~~~~~~~~~#
#~~~~~~~~~~~~~~~~~~~~~~~~~~~~#
#----------------------------#
#--""----------------------""#
#============================#
#============================#
#--""----------------------""#
#----------------------------#
#----------------------------#
####D#######D#######D####D####
##############################
`)

/** A casino floor: carpet, banks of machines, tables. */
const CASINO_FLOOR = parseMap(`
##################
#,,,,,,,,,,,,,,,,#
#,FFFF,,,,,,FFFF,#
#,,,,,,,,,,,,,,,,#
#,,,,,,FFFF,,,,,,#
#,,,,,,FFFF,,,,,,#
#,,,,,,,,,,,,,,,,#
#,FFFF,,,,,,FFFF,#
#,,,,,,,,,,,,,,,,#
########D#########
`)

/*
 * Every casino in the game was this one map. Two different cities' floors were
 * pixel-for-pixel identical, down to the tile each dealer stood on, so climbing
 * the ladder changed a number rather than taking you anywhere. These keep the
 * same footprint and the same doorway — the POIs in each area are placed against
 * them — but the floor plan differs, so the rooms read as different rooms.
 */

/** A riverboat: everything crammed along one side, machines facing the water. */
const RIVERBOAT_FLOOR = parseMap(`
##################
#,,,,,,,,,,,,,,,,#
#,,FFFFFFFF,,,,,,#
#,,,,,,,,,,,,,,,,#
#,,,,,,,,,,,FFFF,#
#,FFFF,,,,,,FFFF,#
#,FFFF,,,,,,,,,,,#
#,,,,,,,,,,,,,,,,#
#,,,,,,,,,,,,,,,,#
########D#########
`)

/** A card room: four tables in a square and no slot machines at all. */
const CARDROOM_FLOOR = parseMap(`
##################
#,,,,,,,,,,,,,,,,#
#,,FFFF,,,,FFFF,,#
#,,FFFF,,,,FFFF,,#
#,,,,,,,,,,,,,,,,#
#,,,,,,,,,,,,,,,,#
#,,FFFF,,,,FFFF,,#
#,,FFFF,,,,FFFF,,#
#,,,,,,,,,,,,,,,,#
########D#########
`)

/** An island room: open, airy, two long tables and space to walk. */
const CAY_FLOOR = parseMap(`
##################
#,,,,,,,,,,,,,,,,#
#,,,,,,,,,,,,,,,,#
#,,FFFFF,,FFFFF,,#
#,,,,,,,,,,,,,,,,#
#,,,,,,,,,,,,,,,,#
#,,FFFFF,,FFFFF,,#
#,,,,,,,,,,,,,,,,#
#,,,,,,,,,,,,,,,,#
########D#########
`)

/** The strip: banks of machines along both walls, pit in the middle. */
const MESA_FLOOR = parseMap(`
##################
#,FF,FF,,,FF,FF,,#
#,,,,,,,,,,,,,,,,#
#,,,,,,,,,,,,,,,,#
#,,,,FFFFFF,,,,,,#
#,,,,FFFFFF,,,,,,#
#,,,,,,,,,,,,,,,,#
#,FF,FF,,,FF,FF,,#
#,,,,,,,,,,,,,,,,#
########D#########
`)

/** Marble and almost nothing in it, which is the point. */
const LUMINA_FLOOR = parseMap(`
##################
#,,,,,,,,,,,,,,,,#
#,,,,,,,,,,,,,,,,#
#,,,,,,,,,,,,,,,,#
#,,,,FFFFFFFF,,,,#
#,,,,,,,,,,,,,,,,#
#,,,,,,,,,,,,,,,,#
#,,,,,,,,,,,,,,,,#
#,,,,,,,,,,,,,,,,#
########D#########
`)

/** A small shop or room: counter along the back. */
const SHOP_ROOM = parseMap(`
##############
#............#
#..FFFFFFFF..#
#............#
#............#
#............#
######D#######
`)

/** A restaurant or bar: booths down both sides. */
const DINING_ROOM = parseMap(`
################
#..............#
#.FF........FF.#
#..............#
#.FF........FF.#
#..............#
#......FF......#
#..............#
#######D########
`)

function area(
  id: string,
  name: string,
  map: ReturnType<typeof parseMap>,
  playerStart: { col: number; row: number },
  background: string,
  pois: PoiDef[],
  exits: AreaDef['exits'],
): AreaDef {
  return { id, name, map, playerStart, background, pois, exits }
}

/** Ambient locals, so a street has people on it rather than just shopfronts. */
function local(
  id: string,
  name: string,
  col: number,
  row: number,
  lines: string[],
  /** Other days, other remarks. */
  ...altLines: string[][]
): PoiDef {
  return {
    id,
    name,
    col,
    row,
    color: COLORS.local,
    lines,
    altLines: altLines.length > 0 ? altLines : undefined,
    action: { kind: 'flavor' },
  }
}

// ---------------------------------------------------------------------------
// Your apartment, and the block outside it
// ---------------------------------------------------------------------------

const APARTMENT_ROOM = parseMap(`
############
#..........#
#..FF......#
#..FF......#
#..........#
#..........#
#.....D....#
############
`)

/**
 * Your own block. Unlike the shared STREET template this one carries on east:
 * the door in the right-hand wall is the corner, not a building.
 */
const BASIN_STREET = parseMap(`
########################
######D########D########
#----------------------D
#--""--------------""--#
#----------------------#
#======================#
#======================#
#======================#
#----------------------#
#--""--------------""--#
#----------------------#
######D########D########
########################
`)

/** The next block over, with the shops on it. West door goes back to Basin. */
const SEVENTH_STREET = parseMap(`
########################
####D######D######D#####
D----------------------#
#--""--------------""--#
#----------------------#
#======================#
#======================#
#======================#
#----------------------#
#--""--------------""--#
#----------------------#
####D######D######D#####
########################
`)

const apartmentCity: CityDef = {
  id: 'apartment',
  theme: 'home',
  name: 'Your Apartment',
  blurb: 'One room, a mattress, and a window that faces a wall.',
  entryAreaId: 'home',
  unlockCash: 0,
  travelCost: 0,
  areas: {
    home: area(
      'home',
      'Your Apartment',
      APARTMENT_ROOM,
      { col: 2, row: 5 },
      '#101018',
      [
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
        {
          // Scenery. This used to be drawn as a person standing in the corner
          // with "Window" floating over their head.
          id: 'apartment-window',
          name: 'Window',
          col: 1,
          row: 1,
          color: COLORS.local,
          art: 'window',
          labelled: false,
          lines: [
            'The window faces a brick wall about four feet away.',
            'Rent is due in nine days. You have been not thinking about it.',
          ],
          action: { kind: 'flavor' },
        },
      ],
      [{ col: 6, row: 6, toAreaId: 'block', toCol: 6, toRow: 2, label: 'Outside' }],
    ),
    block: area(
      'block',
      'Basin Street',
      BASIN_STREET,
      { col: 11, row: 2 },
      '#0e0e16',
      [
        {
          id: 'apartment-busstop',
          name: 'Bus Stop',
          col: 20,
          row: 9,
          color: COLORS.travel,
          art: 'sign',
          lines: ['The route map lists towns you have never had a reason to visit.'],
          // You do not leave town before you have a reason to. Marcus's game is
          // the reason, and it is also the only money you have to leave on.
          requiresFlag: 'wonPokerNight',
          lockedLines: [
            'The route map lists towns you have never had a reason to visit.',
            'Silver Creek. Two hours north, and the fare is most of what you have.',
            'Not tonight. Marcus is expecting you, and winners travel better than you do.',
          ],
          action: { kind: 'travel' },
        },
        local(
          'neighbour',
          'Neighbour',
          4,
          3,
          [
            'Neighbour: You are up late. Or early. I can never tell with you.',
            'Neighbour: Marcus was banging on your door earlier. Something about cards.',
          ],
          [
            'Neighbour: Still no rent cheque under my door, I notice.',
            'Neighbour: I am not your landlord. I just like knowing things.',
          ],
          ['Neighbour: You have got that look. Like you won something.'],
          [
            'Neighbour: My brother played cards for money once.',
            'Neighbour: He is fine. He sells boats now. Mostly fine.',
          ],
        ),
        local(
          'street-kid',
          'Kid on a Bike',
          15,
          8,
          [
            'Kid: My uncle says the casino out on the reservation is rigged.',
            'Kid: My uncle also owes my mum four hundred bucks, so.',
          ],
          ['Kid: Are you actually a gambler? You do not look like one.'],
          [
            'Kid: I can do a wheelie for a dollar.',
            'Kid: ...I cannot do a wheelie. But I would have tried.',
          ],
          ['Kid: My mum says the bus north only goes one direction for people like you.'],
        ),
        local('basin-laundry-sign', 'Laundromat Sign', 16, 2, [
          'A hand-written sign: CHANGE MACHINE BROKEN. BE NICE ABOUT IT.',
        ]),
      ],
      [
        { col: 6, row: 1, toAreaId: 'home', toCol: 6, toRow: 5, label: 'Home' },
        { col: 15, row: 1, toAreaId: 'laundromat', toCol: 6, toRow: 5, label: 'Laundromat' },
        { col: 23, row: 2, toAreaId: 'seventh', toCol: 1, toRow: 2, label: 'Seventh Street' },
      ],
    ),
    laundromat: area(
      'laundromat',
      'Basin Street Laundromat',
      SHOP_ROOM,
      { col: 6, row: 5 },
      '#141420',
      [
        local('laundry-regular', 'Woman Folding Sheets', 3, 3, [
          'Woman: You are the one upstairs from Marcus, right?',
          'Woman: Tell him the card games keep my boy awake.',
          'Woman: ...and tell him I want in next time.',
        ]),
        local('laundry-machines', 'Dryers', 10, 2, [
          'Six dryers. Two of them work. Everyone knows which two.',
        ]),
      ],
      [{ col: 6, row: 6, toAreaId: 'block', toCol: 15, toRow: 2, label: 'Basin Street' }],
    ),
    seventh: area(
      'seventh',
      'Seventh Street',
      SEVENTH_STREET,
      { col: 1, row: 2 },
      '#0e1018',
      [
        local('seventh-busker', 'Busker', 9, 3, [
          'Busker: Requests are a dollar. Silence is five.',
          'Busker: Big night for you? You have got the walk of someone with a plan.',
        ]),
        local('seventh-cop', 'Patrol Officer', 14, 9, [
          'Officer: Evening. Keep it on the sidewalk.',
          'Officer: There is a card game somewhere on Basin every Friday. I never find it.',
        ]),
      ],
      [
        { col: 0, row: 2, toAreaId: 'block', toCol: 22, toRow: 2, label: 'Basin Street' },
        { col: 4, row: 1, toAreaId: 'bodega', toCol: 6, toRow: 5, label: "Patel's" },
        { col: 11, row: 11, toAreaId: 'diner', toCol: 7, toRow: 7, label: 'The Blue Plate' },
      ],
    ),
    bodega: area(
      'bodega',
      "Patel's Corner Store",
      SHOP_ROOM,
      { col: 6, row: 5 },
      '#16161f',
      [
        local('patel', 'Mr Patel', 4, 3, [
          'Mr Patel: Late again. Coffee is still hot, I make no promises about fresh.',
          'Mr Patel: Marcus bought two bags of ice and a deck of cards an hour ago.',
          'Mr Patel: Whatever you are all doing up there, do it quietly.',
        ]),
        local('bodega-cooler', 'Cooler', 10, 2, [
          'Energy drinks, a sad sandwich, and one bottle of champagne nobody has ever bought.',
        ]),
      ],
      [{ col: 6, row: 6, toAreaId: 'seventh', toCol: 4, toRow: 2, label: 'Seventh Street' }],
    ),
    diner: area(
      'diner',
      'The Blue Plate',
      DINING_ROOM,
      { col: 7, row: 7 },
      '#191520',
      [
        local('diner-waitress', 'Waitress', 12, 5, [
          'Waitress: Sit anywhere, the booths are all the same amount of broken.',
          'Waitress: Coffee? You look like a man about to make a decision.',
        ]),
        local('diner-regular', 'Man in a Windbreaker', 3, 3, [
          'Man: I played cards for a living once.',
          'Man: Ask me how that ended. Go on.',
          'Man: It ended here, kid. Nine in the morning, every morning.',
        ]),
      ],
      [{ col: 7, row: 8, toAreaId: 'seventh', toCol: 11, toRow: 10, label: 'Seventh Street' }],
    ),
  },
}

// ---------------------------------------------------------------------------
// Silver Creek — the reservation casino
// ---------------------------------------------------------------------------

const silverCreek: CityDef = {
  id: 'silverCreek',
  theme: 'dust',
  name: 'Silver Creek',
  blurb: 'Reservation resort casino. Carpet, cigarette smoke, and one live poker table.',
  entryAreaId: 'street',
  unlockCash: 0,
  travelCost: 0,
  areas: {
    street: area(
      'street',
      'Silver Creek Approach',
      STREET,
      { col: 11, row: 8 },
      '#161018',
      [
        {
          id: 'sc-busstop',
          name: 'Bus Stop',
          col: 20,
          row: 9,
          color: COLORS.travel,
          art: 'sign',
          lines: ['Departures twice a day, and a timetable nobody has updated.'],
          action: { kind: 'travel' },
        },
        local(
          'sc-smoker',
          'Smoker',
          8,
          2,
          [
            'Smoker: They comp the coffee if you sit long enough.',
            'Smoker: I have been sitting a very long time.',
          ],
          ['Smoker: Ray is in there. Ray is always in there.'],
          [
            'Smoker: Word is somebody new has been winning.',
            'Smoker: Word is usually wrong. But not always.',
          ],
          ['Smoker: Quiet night. Quiet nights are the expensive ones.'],
        ),
        local('sc-valet', 'Valet', 17, 3, [
          'Valet: Casino is the big doors. Gift shop is the small ones.',
          'Valet: Nobody has ever tipped me for saying that.',
        ]),
      ],
      [
        { col: 6, row: 1, toAreaId: 'floor', toCol: 8, toRow: 8, label: 'Casino' },
        { col: 15, row: 1, toAreaId: 'gift', toCol: 6, toRow: 5, label: 'Gift Shop' },
      ],
    ),
    floor: area(
      'floor',
      'Silver Creek Casino',
      CASINO_FLOOR,
      { col: 8, row: 8 },
      '#161018',
      [
        {
          id: 'slots',
          name: 'Slot Row',
          col: 3,
          row: 2,
          color: COLORS.flavor,
          art: 'slot',
          lines: ['Three reels, one lever, and terrible odds. Everyone knows it and plays anyway.'],
          action: { kind: 'slots' },
        },
        {
          id: 'craps',
          name: 'Craps Table',
          col: 13,
          row: 2,
          color: COLORS.flavor,
          art: 'craps',
          lines: ['Shooter is coming out. The pass line is the only bet worth making here.'],
          action: { kind: 'craps' },
        },
        {
          id: 'pitboss',
          name: 'Pit Boss',
          col: 8,
          row: 3,
          color: COLORS.dealer,
          lines: [
            'Pit Boss: Low-stakes table has an open seat. Dollar-two blinds.',
            'Pit Boss: Sit down whenever you are ready.',
          ],
          action: { kind: 'table', tableId: 'silvercreek-low' },
        },
        local('sc-regular', 'Table Regular', 3, 7, [
          'Regular: Ray plays every hand he is dealt. Every single one.',
          'Regular: I have made more off Ray than I have off my job.',
        ]),
      ],
      [{ col: 8, row: 9, toAreaId: 'street', toCol: 6, toRow: 2, label: 'Out' }],
    ),
    gift: area(
      'gift',
      'Gift Shop',
      SHOP_ROOM,
      { col: 6, row: 5 },
      '#161018',
      [
        {
          id: 'giftshop',
          name: 'Clerk',
          col: 6,
          row: 2,
          color: COLORS.shop,
          lines: ['Clerk: Souvenirs, snacks, and things nobody needs.'],
          action: { kind: 'shop', shopId: 'silvercreek-gift' },
        },
      ],
      [{ col: 6, row: 6, toAreaId: 'street', toCol: 15, toRow: 2, label: 'Out' }],
    ),
  },
}

// ---------------------------------------------------------------------------
// Riverbend Landing
// ---------------------------------------------------------------------------

const riverbend: CityDef = {
  id: 'riverbend',
  theme: 'river',
  name: 'Riverbend Landing',
  blurb: 'A permanently moored riverboat with better players and worse coffee.',
  entryAreaId: 'street',
  unlockCash: 600,
  travelCost: 40,
  areas: {
    street: area(
      'street',
      'Riverbend Landing',
      PROMENADE,
      { col: 14, row: 7 },
      '#0f1620',
      [
        {
          id: 'rb-dock',
          name: 'Dock',
          col: 26,
          row: 3,
          color: COLORS.travel,
          art: 'sign',
          lines: ['Buses and boats, both running late.'],
          action: { kind: 'travel' },
        },
        {
          id: 'cass',
          name: 'Cass',
          col: 8,
          row: 4,
          color: COLORS.sponsor,
          lines: SPONSORS.cass.pitch,
          action: { kind: 'sponsor', sponsorId: 'cass' },
        },
        local('rb-fisher', 'Fisherman', 3, 3, [
          'Fisherman: Boat has not moved in eleven years. They still call it a cruise.',
          'Fisherman: Two-five in there. Tiny sits down at noon and leaves when they close.',
        ]),
        local('rb-runner', 'Deckhand', 20, 7, [
          'Deckhand: Careful who you borrow from around here.',
          'Deckhand: Cass is pleasant right up until the day it is due.',
        ]),
      ],
      [
        { col: 4, row: 10, toAreaId: 'boat', toCol: 8, toRow: 8, label: 'Riverboat' },
        { col: 12, row: 10, toAreaId: 'diner', toCol: 7, toRow: 7, label: 'Diner' },
        { col: 20, row: 10, toAreaId: 'outfitters', toCol: 6, toRow: 5, label: 'Outfitters' },
      ],
    ),
    boat: area(
      'boat',
      'The Riverboat',
      RIVERBOAT_FLOOR,
      { col: 8, row: 8 },
      '#0f1620',
      [
        {
          id: 'riverboat-dealer',
          name: 'Dealer',
          col: 8,
          row: 3,
          color: COLORS.dealer,
          lines: ['Dealer: Two-five, three hundred to sit. Tiny has been here since noon.'],
          action: { kind: 'table', tableId: 'riverbend-mid' },
        },
        local('rb-tiny-watcher', 'Bartender', 13, 2, [
          'Bartender: Tiny tips like a man who does not know what money is.',
          'Bartender: Do not tell him I said that. Do not tell him anything, honestly.',
        ]),
      ],
      [{ col: 8, row: 9, toAreaId: 'street', toCol: 4, toRow: 9, label: 'Ashore' }],
    ),
    diner: area(
      'diner',
      'The Landing Diner',
      DINING_ROOM,
      { col: 7, row: 7 },
      '#0f1620',
      [
        {
          id: 'riverbend-diner',
          name: 'Server',
          col: 7,
          row: 6,
          color: COLORS.shop,
          lines: ['Server: Coffee is bottomless. Nothing else is.'],
          action: { kind: 'venue', venueId: 'riverbend-diner' },
        },
        {
          id: 'deb',
          name: 'Deb',
          col: 2,
          row: 3,
          color: COLORS.person,
          lines: MISSIONS['riverbend-marker'].brief,
          action: { kind: 'mission', missionId: 'riverbend-marker' },
        },
      ],
      [{ col: 7, row: 8, toAreaId: 'street', toCol: 12, toRow: 9, label: 'Out' }],
    ),
    outfitters: area(
      'outfitters',
      'Dockside Outfitters',
      SHOP_ROOM,
      { col: 6, row: 5 },
      '#0f1620',
      [
        {
          id: 'outfitters',
          name: 'Clerk',
          col: 6,
          row: 2,
          color: COLORS.shop,
          lines: ['Clerk: Jackets, bikes, whatever gets you upriver.'],
          action: { kind: 'shop', shopId: 'riverbend-outfitters' },
        },
      ],
      [{ col: 6, row: 6, toAreaId: 'street', toCol: 20, toRow: 9, label: 'Out' }],
    ),
  },
}

// ---------------------------------------------------------------------------
// Crescent Harbor
// ---------------------------------------------------------------------------

const crescentHarbor: CityDef = {
  id: 'crescentHarbor',
  theme: 'harbor',
  name: 'Crescent Harbor',
  blurb: 'A real city with a real card room, and people who do this for a living.',
  entryAreaId: 'street',
  unlockCash: 2500,
  travelCost: 120,
  areas: {
    street: area(
      'street',
      'Harbor Boulevard',
      BOULEVARD,
      { col: 14, row: 8 },
      '#121020',
      [
        {
          id: 'ch-transit',
          name: 'Transit Hub',
          col: 27,
          row: 3,
          color: COLORS.travel,
          art: 'sign',
          lines: ['Departure boards for half the coast.'],
          action: { kind: 'travel' },
        },
        {
          id: 'hal',
          name: 'Hal',
          col: 6,
          row: 8,
          color: COLORS.person,
          lines: [
            'Hal: Forty years in card rooms and I still take students.',
            'Hal: I do not sell luck. I sell the things you should already be counting.',
          ],
          action: { kind: 'mentor' },
        },
        {
          id: 'emeka',
          name: 'Mr. Emeka',
          col: 22,
          row: 8,
          color: COLORS.sponsor,
          lines: SPONSORS.emeka.pitch,
          action: { kind: 'sponsor', sponsorId: 'emeka' },
        },
        local('ch-busker', 'Busker', 10, 3, [
          'Busker: Play you for the hat money. No? Nobody ever does.',
        ]),
        local('ch-suit', 'Woman in a Suit', 18, 3, [
          'Woman in a Suit: The Harbour Room only lets in people it already knows.',
          'Woman in a Suit: Build a name in the five-ten game first. That is how everyone does it.',
        ]),
      ],
      [
        { col: 4, row: 1, toAreaId: 'cardroom', toCol: 8, toRow: 8, label: 'Card Room' },
        { col: 11, row: 1, toAreaId: 'menswear', toCol: 6, toRow: 5, label: 'Menswear' },
        { col: 20, row: 1, toAreaId: 'autorow', toCol: 6, toRow: 5, label: 'Auto Row' },
        { col: 26, row: 1, toAreaId: 'supper', toCol: 7, toRow: 7, label: 'Supper Club' },
        { col: 4, row: 11, toAreaId: 'club', toCol: 7, toRow: 7, label: 'The Harbour Room' },
      ],
    ),
    cardroom: area(
      'cardroom',
      'Harbor Card Room',
      CARDROOM_FLOOR,
      { col: 8, row: 8 },
      '#121020',
      [
        {
          id: 'harbor-dealer',
          name: 'Dealer',
          col: 8,
          row: 3,
          color: COLORS.dealer,
          lines: ['Dealer: Five-ten, thousand to sit. Hollis is in for his third buy-in.'],
          action: { kind: 'table', tableId: 'crescent-main' },
        },
        {
          id: 'crescent-headsup',
          name: 'Heads-Up Table',
          col: 13,
          row: 2,
          color: COLORS.dealer,
          lines: ['Dealer: One-on-one, five-ten. Vance has been waiting for someone to sit.'],
          action: { kind: 'table', tableId: 'crescent-headsup' },
        },
        {
          id: 'doorman',
          name: 'Doorman',
          col: 3,
          row: 7,
          color: COLORS.person,
          lines: MISSIONS['crescent-suit'].brief,
          action: { kind: 'mission', missionId: 'crescent-suit' },
        },
      ],
      [{ col: 8, row: 9, toAreaId: 'street', toCol: 4, toRow: 2, label: 'Out' }],
    ),
    menswear: area(
      'menswear',
      'Harbor Menswear',
      SHOP_ROOM,
      { col: 6, row: 5 },
      '#121020',
      [
        {
          id: 'menswear',
          name: 'Tailor',
          col: 6,
          row: 2,
          color: COLORS.shop,
          lines: ['Tailor: We can have it fitted by tonight.'],
          action: { kind: 'shop', shopId: 'crescent-menswear' },
        },
        {
          id: 'crescent-tailor',
          name: 'Seamstress',
          col: 2,
          row: 4,
          color: COLORS.person,
          lines: MISSIONS['crescent-courier'].brief,
          action: { kind: 'mission', missionId: 'crescent-courier' },
        },
      ],
      [{ col: 6, row: 6, toAreaId: 'street', toCol: 11, toRow: 2, label: 'Out' }],
    ),
    autorow: area(
      'autorow',
      'Auto Row',
      SHOP_ROOM,
      { col: 6, row: 5 },
      '#121020',
      [
        {
          id: 'autorow',
          name: 'Salesman',
          col: 6,
          row: 2,
          color: COLORS.shop,
          lines: ['Salesman: Nothing here is new. Everything here runs.'],
          action: { kind: 'shop', shopId: 'crescent-auto' },
        },
      ],
      [{ col: 6, row: 6, toAreaId: 'street', toCol: 20, toRow: 2, label: 'Out' }],
    ),
    supper: area(
      'supper',
      'Bellweather Supper Club',
      DINING_ROOM,
      { col: 7, row: 7 },
      '#121020',
      [
        {
          id: 'crescent-supper',
          name: 'Maitre d’',
          col: 7,
          row: 6,
          color: COLORS.shop,
          lines: ['Maitre d’: We have a table, if you are eating.'],
          action: { kind: 'venue', venueId: 'crescent-supper' },
        },
        local('ch-diner-reg', 'Regular', 2, 3, [
          'Regular: Half this room plays for a living. The other half thinks it does.',
        ]),
      ],
      [{ col: 7, row: 8, toAreaId: 'street', toCol: 26, toRow: 2, label: 'Out' }],
    ),
    club: area(
      'club',
      'The Harbour Room',
      DINING_ROOM,
      { col: 7, row: 7 },
      '#141024',
      [
        {
          id: 'crescent-club',
          name: 'Host',
          col: 7,
          row: 6,
          color: COLORS.shop,
          lines: ['Host: Members and guests. Which are you?'],
          action: { kind: 'venue', venueId: 'crescent-club' },
        },
        {
          id: 'crescent-private',
          name: 'Back Room',
          col: 2,
          row: 2,
          color: COLORS.finale,
          lines: ['An unmarked door. It is not for everyone.'],
          action: { kind: 'table', tableId: 'crescent-private' },
        },
      ],
      [{ col: 7, row: 8, toAreaId: 'street', toCol: 4, toRow: 10, label: 'Out' }],
    ),
  },
}

// ---------------------------------------------------------------------------
// Palm Cay
// ---------------------------------------------------------------------------

const palmCay: CityDef = {
  id: 'palmCay',
  theme: 'island',
  name: 'Palm Cay',
  blurb: 'A resort island where the money is soft and the regulars are not.',
  entryAreaId: 'street',
  unlockCash: 8000,
  travelCost: 350,
  areas: {
    street: area(
      'street',
      'Cay Promenade',
      PROMENADE,
      { col: 14, row: 7 },
      '#0c1a1c',
      [
        {
          id: 'pc-ferry',
          name: 'Ferry Dock',
          col: 26,
          row: 3,
          color: COLORS.travel,
          art: 'sign',
          lines: ['The ferry runs to the mainland twice a day.'],
          action: { kind: 'travel' },
        },
        {
          id: 'rosa',
          name: 'Rosa',
          col: 9,
          row: 4,
          color: COLORS.person,
          lines: MISSIONS['palmcay-tourist'].brief,
          action: { kind: 'mission', missionId: 'palmcay-tourist' },
        },
        local('pc-tourist', 'Sunburnt Tourist', 4, 3, [
          'Tourist: I am up four hundred dollars! On the slots!',
          'Tourist: I have been here since Tuesday.',
        ]),
        local('pc-lifeguard', 'Lifeguard', 20, 7, [
          'Lifeguard: Bernard has not left the tourist table in two days.',
          'Lifeguard: Someone should check on him. Someone with cards.',
        ]),
      ],
      [
        { col: 4, row: 10, toAreaId: 'casino', toCol: 8, toRow: 8, label: 'Cay Room' },
        { col: 12, row: 10, toAreaId: 'boutique', toCol: 6, toRow: 5, label: 'Boutique' },
        { col: 20, row: 10, toAreaId: 'grill', toCol: 7, toRow: 7, label: 'Shoreline Grill' },
        { col: 25, row: 10, toAreaId: 'marina', toCol: 6, toRow: 5, label: 'Marina Motors' },
      ],
    ),
    casino: area(
      'casino',
      'The Cay Room',
      CAY_FLOOR,
      { col: 8, row: 8 },
      '#0c1a1c',
      [
        {
          id: 'cay-dealer',
          name: 'Dealer',
          col: 4,
          row: 3,
          color: COLORS.dealer,
          lines: ['Dealer: Ten-twenty-five. Twenty-five hundred to sit.'],
          action: { kind: 'table', tableId: 'palmcay-high' },
        },
        {
          id: 'tourist-dealer',
          name: 'Tourist Table',
          col: 12,
          row: 3,
          color: COLORS.dealer,
          lines: [
            'Dealer: Same stake, softer game. Bernard is celebrating something.',
            'Dealer: He has been celebrating for two days.',
          ],
          action: { kind: 'table', tableId: 'palmcay-tourist' },
        },
      ],
      [{ col: 8, row: 9, toAreaId: 'street', toCol: 4, toRow: 9, label: 'Out' }],
    ),
    boutique: area(
      'boutique',
      'Cay Boutique',
      SHOP_ROOM,
      { col: 6, row: 5 },
      '#0c1a1c',
      [
        {
          id: 'boutique',
          name: 'Clerk',
          col: 6,
          row: 2,
          color: COLORS.shop,
          lines: ['Clerk: Linen, mostly. It photographs well.'],
          action: { kind: 'shop', shopId: 'palmcay-boutique' },
        },
      ],
      [{ col: 6, row: 6, toAreaId: 'street', toCol: 12, toRow: 9, label: 'Out' }],
    ),
    grill: area(
      'grill',
      'Shoreline Grill',
      DINING_ROOM,
      { col: 7, row: 7 },
      '#0c1a1c',
      [
        {
          id: 'palmcay-grill',
          name: 'Waiter',
          col: 7,
          row: 6,
          color: COLORS.shop,
          lines: ['Waiter: Caught this morning. Priced accordingly.'],
          action: { kind: 'venue', venueId: 'palmcay-grill' },
        },
      ],
      [{ col: 7, row: 8, toAreaId: 'street', toCol: 20, toRow: 9, label: 'Out' }],
    ),
    marina: area(
      'marina',
      'Marina Motors',
      SHOP_ROOM,
      { col: 6, row: 5 },
      '#0c1a1c',
      [
        {
          id: 'marina',
          name: 'Dealer',
          col: 6,
          row: 2,
          color: COLORS.shop,
          lines: ['Dealer: Everything on this lot is a bad financial decision.'],
          action: { kind: 'shop', shopId: 'palmcay-marina' },
        },
      ],
      [{ col: 6, row: 6, toAreaId: 'street', toCol: 25, toRow: 9, label: 'Out' }],
    ),
  },
}

// ---------------------------------------------------------------------------
// Neon Mesa
// ---------------------------------------------------------------------------

const neonMesa: CityDef = {
  id: 'neonMesa',
  theme: 'neon',
  name: 'Neon Mesa',
  blurb: 'The desert city. Everyone here has studied, and the room upstairs checks your clothes.',
  entryAreaId: 'street',
  unlockCash: 30000,
  travelCost: 900,
  areas: {
    street: area(
      'street',
      'The Mesa Strip',
      BOULEVARD,
      { col: 14, row: 8 },
      '#1a1020',
      [
        {
          id: 'nm-shuttle',
          name: 'Airport Shuttle',
          col: 27,
          row: 3,
          color: COLORS.travel,
          art: 'sign',
          lines: ['International departures, one gate.'],
          action: { kind: 'travel' },
        },
        {
          id: 'hal-mesa',
          name: 'Hal',
          col: 6,
          row: 8,
          color: COLORS.person,
          lines: [
            'Hal: You made it out here. Good.',
            'Hal: Everything I teach costs more now, because it is worth more now.',
          ],
          action: { kind: 'mentor' },
        },
        {
          id: 'consortium',
          name: 'Broker',
          col: 22,
          row: 8,
          color: COLORS.sponsor,
          lines: SPONSORS.consortium.pitch,
          action: { kind: 'sponsor', sponsorId: 'consortium' },
        },
        {
          id: 'fixer',
          name: 'Fixer',
          col: 17,
          row: 3,
          color: COLORS.person,
          lines: MISSIONS['mesa-read'].brief,
          action: { kind: 'mission', missionId: 'mesa-read' },
        },
        local('nm-tout', 'Tout', 10, 3, [
          'Tout: High roller room is up the stairs. They will look at your shoes.',
          'Tout: I am serious about the shoes.',
        ]),
      ],
      [
        { col: 4, row: 1, toAreaId: 'casino', toCol: 8, toRow: 8, label: 'Mesa Casino' },
        { col: 11, row: 1, toAreaId: 'luxury', toCol: 6, toRow: 5, label: 'Mesa Luxury' },
        { col: 20, row: 1, toAreaId: 'motors', toCol: 6, toRow: 5, label: 'Mesa Motors' },
        { col: 26, row: 1, toAreaId: 'club', toCol: 7, toRow: 7, label: 'Ultraviolet' },
      ],
    ),
    casino: area(
      'casino',
      'Mesa Casino',
      MESA_FLOOR,
      { col: 8, row: 8 },
      '#1a1020',
      [
        {
          id: 'mesa-dealer',
          name: 'Dealer',
          col: 4,
          row: 3,
          color: COLORS.dealer,
          lines: ['Dealer: Twenty-five fifty. Ten thousand to sit.'],
          action: { kind: 'table', tableId: 'mesa-main' },
        },
        {
          id: 'mesa-headsup',
          name: 'Heads-Up Table',
          col: 12,
          row: 3,
          color: COLORS.dealer,
          lines: ['Dealer: Fifty-hundred, one-on-one. Lorna plays here most nights.'],
          action: { kind: 'table', tableId: 'mesa-headsup' },
        },
        {
          id: 'highroller',
          name: 'High Roller Room',
          col: 8,
          row: 1,
          color: COLORS.finale,
          lines: [
            'Host: Hundred-two hundred inside. Forty thousand to sit.',
            'Host: And we do have a dress code.',
          ],
          action: { kind: 'table', tableId: 'mesa-highroller' },
        },
      ],
      [{ col: 8, row: 9, toAreaId: 'street', toCol: 4, toRow: 2, label: 'Out' }],
    ),
    luxury: area(
      'luxury',
      'Mesa Luxury',
      SHOP_ROOM,
      { col: 6, row: 5 },
      '#1a1020',
      [
        {
          id: 'mesa-luxury',
          name: 'Clerk',
          col: 6,
          row: 2,
          color: COLORS.shop,
          lines: ['Clerk: Everything here is about being let in somewhere.'],
          action: { kind: 'shop', shopId: 'mesa-luxury' },
        },
      ],
      [{ col: 6, row: 6, toAreaId: 'street', toCol: 11, toRow: 2, label: 'Out' }],
    ),
    motors: area(
      'motors',
      'Mesa Motors',
      SHOP_ROOM,
      { col: 6, row: 5 },
      '#1a1020',
      [
        {
          id: 'mesa-motors',
          name: 'Salesman',
          col: 6,
          row: 2,
          color: COLORS.shop,
          lines: ['Salesman: You look like a man who is tired of buses.'],
          action: { kind: 'shop', shopId: 'mesa-motors' },
        },
      ],
      [{ col: 6, row: 6, toAreaId: 'street', toCol: 20, toRow: 2, label: 'Out' }],
    ),
    club: area(
      'club',
      'Ultraviolet',
      DINING_ROOM,
      { col: 7, row: 7 },
      '#1d1030',
      [
        {
          id: 'mesa-club',
          name: 'Door Host',
          col: 7,
          row: 6,
          color: COLORS.shop,
          lines: ['Door Host: Rooftop is full. It is always full.'],
          action: { kind: 'venue', venueId: 'mesa-club' },
        },
        {
          id: 'mesa-private',
          name: 'The Invitational',
          col: 2,
          row: 2,
          color: COLORS.finale,
          lines: ['A door with someone standing in front of it.'],
          action: { kind: 'table', tableId: 'mesa-private' },
        },
      ],
      [{ col: 7, row: 8, toAreaId: 'street', toCol: 26, toRow: 2, label: 'Out' }],
    ),
  },
}

// ---------------------------------------------------------------------------
// Porto Lumina
// ---------------------------------------------------------------------------

const portoLumina: CityDef = {
  id: 'portoLumina',
  theme: 'marble',
  name: 'Porto Lumina',
  blurb: 'The last stop. Marble, harbour light, and the biggest game in the world.',
  entryAreaId: 'street',
  unlockCash: 90000,
  travelCost: 2500,
  areas: {
    street: area(
      'street',
      'Lumina Waterfront',
      PROMENADE,
      { col: 14, row: 7 },
      '#141020',
      [
        {
          id: 'pl-terminal',
          name: 'Terminal',
          col: 26,
          row: 3,
          color: COLORS.travel,
          art: 'sign',
          lines: ['Everywhere you have ever played, listed on one board.'],
          action: { kind: 'travel' },
        },
        {
          id: 'wen',
          name: 'Madame Wen',
          col: 9,
          row: 4,
          color: COLORS.sponsor,
          lines: SPONSORS.wen.pitch,
          action: { kind: 'sponsor', sponsorId: 'wen' },
        },
        local('pl-photographer', 'Photographer', 4, 3, [
          'Photographer: I shoot the winners. I have shot Ms. Okonkwo four years running.',
          'Photographer: Give me a reason to shoot somebody else.',
        ]),
      ],
      [
        { col: 4, row: 10, toAreaId: 'casino', toCol: 8, toRow: 8, label: 'Casino' },
        { col: 12, row: 10, toAreaId: 'atelier', toCol: 6, toRow: 5, label: 'Atelier' },
        { col: 20, row: 10, toAreaId: 'lift', toCol: 6, toRow: 5, label: 'Penthouse Lift' },
      ],
    ),
    casino: area(
      'casino',
      'Porto Lumina Casino',
      LUMINA_FLOOR,
      { col: 8, row: 8 },
      '#141020',
      [
        {
          id: 'lumina-dealer',
          name: 'Dealer',
          col: 4,
          row: 3,
          color: COLORS.dealer,
          lines: ['Dealer: Hundred-two hundred. Thirty thousand to sit.'],
          action: { kind: 'table', tableId: 'lumina-nosebleed' },
        },
        {
          id: 'nadia',
          name: 'Nadia Okonkwo',
          col: 12,
          row: 3,
          color: COLORS.finale,
          lines: [
            'Nadia: I know what you have been doing. Small rooms, then bigger ones.',
            'Nadia: One match. A hundred and twenty thousand each, winner takes it.',
            'Nadia: The penthouse upstairs comes with it. I have lived there four years.',
          ],
          action: { kind: 'table', tableId: 'lumina-finale' },
        },
      ],
      [{ col: 8, row: 9, toAreaId: 'street', toCol: 4, toRow: 9, label: 'Out' }],
    ),
    atelier: area(
      'atelier',
      'Lumina Atelier',
      SHOP_ROOM,
      { col: 6, row: 5 },
      '#141020',
      [
        {
          id: 'atelier',
          name: 'Tailor',
          col: 6,
          row: 2,
          color: COLORS.shop,
          lines: ['Tailor: For the match, of course. Everyone comes here first.'],
          action: { kind: 'shop', shopId: 'lumina-atelier' },
        },
      ],
      [{ col: 6, row: 6, toAreaId: 'street', toCol: 12, toRow: 9, label: 'Out' }],
    ),
    lift: area(
      'lift',
      'Penthouse Lift',
      SHOP_ROOM,
      { col: 6, row: 5 },
      '#141020',
      [
        {
          id: 'penthouse',
          name: 'Attendant',
          col: 6,
          row: 2,
          color: COLORS.finale,
          art: 'lift',
          lines: ['The attendant watches the lift, then you, and waits.'],
          action: { kind: 'penthouse' },
        },
      ],
      [{ col: 6, row: 6, toAreaId: 'street', toCol: 20, toRow: 9, label: 'Out' }],
    ),
  },
}

export const CITIES: Record<string, CityDef> = {
  apartment: apartmentCity,
  silverCreek,
  riverbend,
  crescentHarbor,
  palmCay,
  neonMesa,
  portoLumina,
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

/** Every area in a city, for tests and lookups. */
export function allAreas(city: CityDef): AreaDef[] {
  return Object.values(city.areas)
}

/** Every point of interest in a city, wherever it stands. */
export function allPois(city: CityDef): PoiDef[] {
  return allAreas(city).flatMap((a) => a.pois)
}

// --- the collector chase ----------------------------------------------------
// A collector used to appear at `width - 3`, which in Silver Creek is the tile
// beside the Bus Stop — the only way out of town. The playtester was caught
// three tiles after stepping onto the street, with no sponsor on it to pay and
// the exit standing behind the man chasing them, while the HUD said "get out of
// town or pay up". Both options were already gone.

/**
 * A collector never materialises right on top of you; that is a mugging, not a
 * chase. Five tiles is roughly two of their steps, which at the player's walking
 * speed (one tile per ~145ms against the collector's 430ms) is enough ground to
 * turn and run on.
 */
export const COLLECTOR_MIN_PLAYER_DISTANCE = 5

const manhattan = (a: { col: number; row: number }, b: { col: number; row: number }) =>
  Math.abs(a.col - b.col) + Math.abs(a.row - b.row)

/** The tiles that get the player out of this area: the travel point, else any door. */
export function escapeTiles(area: AreaDef): { col: number; row: number }[] {
  const travel = area.pois
    .filter((poi) => poi.action.kind === 'travel')
    .map((poi) => ({ col: poi.col, row: poi.row }))
  if (travel.length > 0) return travel
  return area.exits.map((exit) => ({ col: exit.col, row: exit.row }))
}

/** How far the nearest way out of this area is from a tile. */
export function distanceToEscape(area: AreaDef, tile: { col: number; row: number }): number {
  const escapes = escapeTiles(area)
  if (escapes.length === 0) return 0
  return Math.min(...escapes.map((escape) => manhattan(escape, tile)))
}

/**
 * Where a collector appears, given where the player is standing.
 *
 * The rule is "between you and nowhere": of every tile a collector could stand
 * on, take the one furthest from the way out of town, and among those the one
 * closest to the player, so it is still a chase rather than scenery. Tiles
 * occupied by people and props are skipped, as is anything inside
 * `COLLECTOR_MIN_PLAYER_DISTANCE` of the player.
 *
 * What this buys is the invariant the chase needs: the collector is never closer
 * to the exit than the player is, so running for the bus is never running at the
 * man chasing you. Combined with the player's threefold speed advantage, that
 * makes the race winnable from anywhere on the street.
 */
export function collectorSpawn(
  area: AreaDef,
  playerTile: { col: number; row: number },
): { col: number; row: number } {
  const occupied = new Set(area.pois.map((poi) => `${poi.col},${poi.row}`))
  let best: { col: number; row: number; fromEscape: number; fromPlayer: number } | null = null

  for (let row = 0; row < area.map.length; row++) {
    for (let col = 0; col < area.map[row].length; col++) {
      if (!isWalkable(area.map, col, row)) continue
      if (occupied.has(`${col},${row}`)) continue
      const fromPlayer = manhattan(playerTile, { col, row })
      if (fromPlayer < COLLECTOR_MIN_PLAYER_DISTANCE) continue
      const fromEscape = distanceToEscape(area, { col, row })
      if (
        best === null ||
        fromEscape > best.fromEscape ||
        (fromEscape === best.fromEscape && fromPlayer < best.fromPlayer)
      ) {
        best = { col, row, fromEscape, fromPlayer }
      }
    }
  }

  // Nowhere far enough away to stand: nobody is waiting for you today.
  return best ?? area.playerStart
}
