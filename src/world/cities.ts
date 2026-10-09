import { isWalkable, parseMap } from '../overworld/tileRenderer'
import { MISSIONS, SPONSORS } from './npcs'
import type { AreaDef, CityDef, PoiDef } from './types'
import type { PlacedStamp } from './stamps'
import type { CityId } from '../game/state'

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

/**
 * The road between towns.
 *
 * The world is continuous, so towns are joined by somewhere rather than by a
 * menu: scrub, trees and a stretch of highway you can walk if you would rather
 * keep the fare. Each stretch belongs to the town it leads into, so it takes
 * that town's colour as you get close.
 */
const HIGHWAY = parseMap(`TTTTTTTTTTTTTTTTTTTTTTTTTTTT
T"""""TTTT""""""TTTT""""""TT
T""""""""""""""""""""""""""T
T"""TT""""TT"""""""TT"""""""
T""""""""""""""""""""""""""T
----------------------------
============================
============================
----------------------------
T"""""""""""""""""""""""""""
T""::::"""""""""""::::"""""T
T"":::::TT""""""TT:::::""""T
T"""""""TTTT""TTTT""""""""""
TTTTTTTTTTTTTTTTTTTTTTTTTTTT`)

/**
 * The reservation.
 *
 * One lit facade set back behind a wide forecourt, desert either side, and the
 * highway running straight past the front door — Vegas as it looks two hours
 * north of anywhere, which is what the reservation casino is.
 */
const SILVER_CREEK_TOWN = parseMap(`TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT
T::::::::::::::::::::::::::::::T
T::##########################::T
T::##########################::T
T::#############D############::T
T::++++++++++++++++++++++++++::T
T::++oo++++++++++++++++oo++++::T
T::++++++++++++++++++++++++++::T
----++++++++++++++++++++++++----
================================
================================
----++++++++++++++++++++++++----
T::++++++++++++++++++++++++++::T
T::+oo+++++++++++++++++++oo++::T
T::++++++++++++++++++++++++++::T
T::::::#####::::::::#####::::::T
T::::::##D##::::::::#####::::::T
T::::::::::::::::::::::::::::::T
TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT`)

/**
 * A river town. The water runs along the north and the boat is moored against it.
 */
const RIVERBEND_TOWN = parseMap(`TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT
T~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~T
T~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~T
T::::::::::::::::::::::::::::::T
T::#######::::::::::::#######::T
T::######D::::::::::::D######::T
T::::::::::::**::**::::::::::::T
T::++++++++++++++++++++++++++::T
----++++++++++++++++++++++++----
================================
================================
----++++++++++++++++++++++++----
T::++++++++++++++++++++++++++::T
T::::::::::::oo::oo::::::::::::T
T::#####::::::::::::::::#####::T
T::##D##::::::::::::::::#####::T
T::::::::::::::::::::::::::::::T
T""""""""""""""""""""""""""""""T
TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT`)

/**
 * A working harbour: a stone quay, tall frontages along the north, water south.
 */
const CRESCENT_HARBOR_TOWN = parseMap(`TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT
T++++++++++++++++++++++++++++++T
T+############++############+++T
T+##D########D++D###########+++T
T++++++++++++++++++++++++++++++T
T++oo++++++++++++++++++++++oo++T
T++++++++++++++++++++++++++++++T
T++++++##D#####++#####D##++++++T
--------#######++#######--------
================================
================================
----++++++++++++++++++++++++----
T++++++++++++++++++++++++++++++T
T+++++++++oo++++++++oo+++++++++T
T++++++++++++++++++++++++++++++T
T~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~T
T~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~T
T~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~T
TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT`)

/**
 * An island resort — sand, palms, and the sea along the bottom of the map.
 */
const PALM_CAY_TOWN = parseMap(`TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT
T::::::::::::::::::::::::::::::T
T::T::::#########::::::T:::::::T
T::::::##########::::::::::::::T
T::::::D####D####:::::T::::::::T
T:::T:::::::::::::::::::::::T::T
T::::::::::**::::::**::::::::::T
T::::::::::::::::::::::::::::::T
----::::::::::::::::::::::::----
================================
================================
----::::::::::::::::::::::::----
T::::::::::::::::::::::::::::::T
T::::T::::::oo::::oo::::::T::::T
T::::::#####:::::::::#####:::::T
T::::::##D##:::::::::##D##:::::T
T::::::::::::::::::::::::::::::T
T~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~T
TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT`)

/**
 * The Strip.
 *
 * Enormous facades down both sides, a fountain in the middle of the plaza, and
 * six lanes of road running through the lot of it.
 */
const NEON_MESA_TOWN = parseMap(`TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT
T##############################T
T##############################T
T#######D###########D##########T
T++++++++++++++++++++++++++++++T
T++oo+++++++~~~~~~++++++++oo+++T
T+++++++++++~~~~~~+++++++++++++T
T++++++++++++++++++++++++++++++T
--------++++++++++++++++--------
================================
================================
================================
--------++++++++++++++++--------
T++++++++++++++++++++++++++++++T
T++oo+++++++++++++++++++++oo+++T
T#########D##########D#########T
T##############################T
T##############################T
TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT`)

/**
 * Marble and water: colonnades down both sides and a reflecting pool between.
 */
const PORTO_LUMINA_TOWN = parseMap(`TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT
T++++++++++++++++++++++++++++++T
T++##########################++T
T++#########D######D#########++T
T++++++++++++++++++++++++++++++T
T++oo++++~~~~~~~~~~~~~~++++oo++T
T++++++++~~~~~~~~~~~~~~++++++++T
T++++++++++++++++++++++++++++++T
--------++++++++++++++++--------
================================
================================
--------++++++++++++++++--------
T++++++++++++++++++++++++++++++T
T++oo++++++++++++++++++++++oo++T
T++#########D################++T
T++##########################++T
T++##########################++T
T++++++++++++++++++++++++++++++T
TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT`)

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
  /** Which sides carry on into another map, for streets that simply continue. */
  edges?: AreaDef['edges'],
): AreaDef {
  return { id, name, map, playerStart, background, pois, exits, edges }
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

/**
 * Your one room. The window is set into the wall, where a window goes — it used
 * to stand in the middle of the floor like a person.
 */
const APARTMENT_ROOM = parseMap(`
############
#...F......#
#..........#
#.FF.......#
#..........#
#..........#
#.....D....#
############
`)

/**
 * Basin Street, where you live.
 *
 * Open at both ends along the road: streets join to the next map by being walked
 * off, not by a doorway standing in the middle of the tarmac. Trees close the
 * sides the town does not carry on into.
 */
const BASIN_STREET = parseMap(`
TTTTTTTTTTTTTTTTTTTTTTTTTTTT
T##########TTTT###########TT
T##########TTTT###########TT
T####D#####TTTT#####D#####TT
T--------------------------T
T--*""""-----------""""*---T
T--------------------------T
T---------------------------
T===========================
T===========================
T---------------------------
T--------------------------T
T--*""""-----------""""*---T
T--------------------------T
T####D######TTT#####D######T
T##########TTTT###########TT
T##########TTTT###########TT
TTTTTTTTTTTTTTTTTTTTTTTTTTTT
`)

/** The next block east: the shops, the laundromat, the diner. */
const SEVENTH_STREET = parseMap(`
TTTTTTTTTTTTTTTTTTTTTTTTTTTT
T#########TT##########TT###T
T#########TT##########TT###T
T###D#####TT####D#####TT#D#T
T--------------------------T
T--*"""------------"""*----T
T--------------------------T
----------------------------
============================
============================
----------------------------
T--------------------------T
T---oo---------------oo----T
T--------------------------T
T###D######TT####D#########T
T#########TT##########TT###T
T#########TT##########TT###T
TTTTTTTTTTTTTTTTTTTTTTTTTTTT
`)

/**
 * The bus depot: an open lot at the edge of town. The road carries on east out
 * of the map, and the forecourt opens north towards Marcus's block.
 */
const DEPOT_LOT = parseMap(`
TTTTTTTT++++TTTTTTTTTT
T::::::,++++,::::::::T
T::+++++++++++++o:::.T
T::+oo+++++++++++::::T
T::++++++++++++++::::T
----++++++++++++++---T
======================
======================
----++++++++++++++---T
T::++++++++++++++::::T
T::+oo++++++++oo+::::T
T::++++++++++++++::::T
T::::::::::::::::::::T
T::::::::::::::::::::T
TTTTTTTTTTTTTTTTTTTTTT
`)

/** Marcus's block, north of the depot. His door is the middle one. */
const EASTGATE_BLOCK = parseMap(`
TTTTTTTTTTTTTTTTTTTTTT
T####TT#########TT###T
T####TT#########TT###T
T#D##TT####D####TT##DT
T--------------------T
T--*""-----------*""-T
T---------*----------T
T--------------------T
T--*""-----oo----*""-T
T--------------------T
T####TT----------TT##T
T####TT----------TT##T
T#D##TT----------TT##T
T------****----------T
TTTTTTTT----TTTTTTTTTT
`)

/** Marcus's front room: a table, some chairs, and not much else. */
const MARCUS_HOUSE = parseMap(`
################
#..............#
#..FFFF...FF...#
#..............#
#....FFFF......#
#....FFFF......#
#..............#
#..FF......FF..#
#..............#
#######D########
`)

const apartmentCity: CityDef = {
  id: 'apartment',
  theme: 'home',
  name: 'Basin',
  // The 14 runs from the depot up to Marcus's block. You can walk it — the whole
  // town is walkable — but the bus is how you would actually get there at eight
  // in the evening with money in your pocket.
  stops: [
    {
      areaId: 'eastgate',
      name: 'Eastgate — Marcus\'s block',
      blurb: 'Four stops up the hill. He said eight o\'clock.',
      col: 9,
      row: 13,
    },
  ],
  blurb: 'Where you live. Cheap rent, a laundromat, and the 14 running east.',
  entryAreaId: 'home',
  arrivalAreaId: 'depot',
  unlockCash: 0,
  travelCost: 0,
  areas: {
    home: area(
      'home',
      'Your Apartment',
      APARTMENT_ROOM,
      { col: 6, row: 5 },
      '#101018',
      [
        {
          // Set into the wall, with the floor in front of it to stand on.
          id: 'apartment-window',
          name: 'Window',
          col: 3,
          row: 0,
          color: COLORS.local,
          art: 'window',
          labelled: false,
          lines: [
            'The window faces a brick wall about four feet away.',
            'Rent is due in nine days. You have been not thinking about it.',
          ],
          action: { kind: 'flavor' },
        },
        local('apartment-note', 'Note on the Table', 8, 3, [
          "Marcus's handwriting: GAME AT MINE. 8pm. BRING CASH.",
          'Underneath, smaller: the 14 bus, you know the one.',
        ]),
      ],
      [{ col: 6, row: 6, toAreaId: 'basin', toCol: 5, toRow: 4, label: 'Outside' }],
    ),
    basin: area(
      'basin',
      'Basin Street',
      BASIN_STREET,
      { col: 5, row: 4 },
      '#0e0e16',
      [
        local(
          'neighbour',
          'Neighbour',
          3,
          6,
          [
            'Neighbour: You are up late. Or early. I can never tell with you.',
            'Neighbour: Marcus was banging on your door earlier. Something about cards.',
          ],
          [
            'Neighbour: Still no rent cheque under my door, I notice.',
            'Neighbour: I am not your landlord. I just like knowing things.',
          ],
          ['Neighbour: You have got that look. Like you won something.'],
        ),
        local(
          'street-kid',
          'Kid on a Bike',
          18,
          12,
          [
            'Kid: My uncle says the casino out on the reservation is rigged.',
            'Kid: My uncle also owes my mum four hundred bucks, so.',
          ],
          ['Kid: Are you actually a gambler? You do not look like one.'],
          ['Kid: The 14 goes east. Everything goes east from here.'],
        ),
        local('basin-laundry-sign', 'Laundromat Sign', 21, 4, [
          'A hand-written sign: CHANGE MACHINE BROKEN. BE NICE ABOUT IT.',
        ]),
      ],
      [{ col: 5, row: 3, toAreaId: 'home', toCol: 6, toRow: 5, label: 'Home' }],
      // The road simply carries on into the next block.
      { east: { toAreaId: 'seventh' } },
    ),
    seventh: area(
      'seventh',
      'Seventh Street',
      SEVENTH_STREET,
      { col: 1, row: 8 },
      '#0e1018',
      [
        local('seventh-busker', 'Busker', 9, 6, [
          'Busker: Requests are a dollar. Silence is five.',
          'Busker: Big night for you? You have got the walk of someone with a plan.',
        ]),
        local('seventh-cop', 'Patrol Officer', 20, 11, [
          'Officer: Evening. Keep it on the sidewalk.',
          'Officer: There is a card game somewhere on Basin every Friday. I never find it.',
        ]),
      ],
      [
        { col: 4, row: 3, toAreaId: 'bodega', toCol: 6, toRow: 5, label: "Patel's" },
        { col: 16, row: 3, toAreaId: 'laundromat', toCol: 6, toRow: 5, label: 'Laundromat' },
        { col: 4, row: 14, toAreaId: 'diner', toCol: 7, toRow: 7, label: 'The Blue Plate' },
      ],
      { west: { toAreaId: 'basin' }, east: { toAreaId: 'depot', offset: -2 } },
    ),
    depot: area(
      'depot',
      'Basin Bus Depot',
      DEPOT_LOT,
      { col: 1, row: 5 },
      '#101420',
      [
        {
          id: 'apartment-busstop',
          name: 'Bus Stop',
          col: 6,
          row: 1,
          color: COLORS.travel,
          art: 'sign',
          lines: ['The 14 runs east all night. The route map lists towns you have never visited.'],
          action: { kind: 'travel' },
          // Out-of-town fares need a reason to leave, and Marcus's game is it.
          // The local service runs regardless — that is how you get to his game.
        },
        local('depot-driver', 'Driver on a Break', 12, 1, [
          'Driver: Fourteen leaves when I finish this coffee.',
          'Driver: You can walk it, mind. People forget you can walk it.',
        ]),
      ],
      [],
      {
        west: { toAreaId: 'seventh', offset: 2 },
        north: { toAreaId: 'eastgate' },
        east: { toAreaId: 'road-silvercreek' },
      },
    ),
    eastgate: area(
      'eastgate',
      'Eastgate',
      EASTGATE_BLOCK,
      { col: 9, row: 13 },
      '#0e1016',
      [
        local('eastgate-woman', 'Woman with Shopping', 6, 7, [
          'Woman: Marcus has got half the street coming round tonight.',
          'Woman: Thin walls. I will hear every hand of it.',
        ]),
      ],
      [{ col: 11, row: 3, toAreaId: 'marcus-house', toCol: 7, toRow: 8, label: "Marcus's" }],
      { south: { toAreaId: 'depot' } },
    ),
    'marcus-house': area(
      'marcus-house',
      "Marcus's Place",
      MARCUS_HOUSE,
      { col: 7, row: 8 },
      '#141018',
      [
        local('marcus-dana', 'Dana', 11, 7, [
          'Dana: He has been talking about this game all week.',
          'Dana: He is going to lose. He always loses.',
        ]),
      ],
      [{ col: 7, row: 9, toAreaId: 'eastgate', toCol: 11, toRow: 4, label: 'Outside' }],
    ),
    laundromat: area(
      'laundromat',
      'Basin Street Laundromat',
      SHOP_ROOM,
      { col: 6, row: 5 },
      '#141420',
      [
        local('laundry-regular', 'Woman Folding Sheets', 3, 3, [
          'Woman: You are the one upstairs from the bakery, right?',
          'Woman: Tell Marcus the card games keep my boy awake.',
          'Woman: ...and tell him I want in next time.',
        ]),
        local('laundry-machines', 'Dryers', 10, 2, [
          'Six dryers. Two of them work. Everyone knows which two.',
        ]),
      ],
      [{ col: 6, row: 6, toAreaId: 'seventh', toCol: 16, toRow: 4, label: 'Seventh Street' }],
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
          'Mr Patel: Whatever you are all doing out there, do it quietly.',
        ]),
        local('bodega-cooler', 'Cooler', 10, 2, [
          'Energy drinks, a sad sandwich, and one bottle of champagne nobody has ever bought.',
        ]),
      ],
      [{ col: 6, row: 6, toAreaId: 'seventh', toCol: 4, toRow: 4, label: 'Seventh Street' }],
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
      [{ col: 7, row: 8, toAreaId: 'seventh', toCol: 4, toRow: 13, label: 'Seventh Street' }],
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
  entryAreaId: 'sc-street',
  unlockCash: 0,
  travelCost: 0,
  areas: {
    'road-silvercreek': area(
      'road-silvercreek',
      'Reservation Road',
      HIGHWAY,
      { col: 14, row: 6 },
      '#161018',
      [
        local('road-sc-hitcher', 'Hitchhiker', 6, 4, [
          'Hitchhiker: Going as far as the casino? Everyone is.',
          'Hitchhiker: I will walk it. I always walk it.',
        ]),
        local('road-sc-sign', 'Mile Sign', 20, 10, [
          'SILVER CREEK 2 MI. Underneath, scratched in: AND NOT ONE MILE FURTHER.',
        ]),
      ],
      [],
      { west: { toAreaId: 'depot', offset: 0 }, east: { toAreaId: 'sc-street', offset: 3 } },
    ),
    'sc-street': area(
      'sc-street',
      'Silver Creek Approach',
      SILVER_CREEK_TOWN,
      // The forecourt on the near side of the highway, with the casino across
      // the road. Standing three tiles under its door meant walking straight in.
      { col: 16, row: 12 },
      '#161018',
      [
        {
          id: 'sc-busstop',
          name: 'Bus Stop',
          col: 28,
          row: 12,
          color: COLORS.travel,
          art: 'sign',
          lines: ['Departures twice a day, and a timetable nobody has updated.'],
          action: { kind: 'travel' },
        },
        local(
          'sc-smoker',
          'Smoker',
          8,
          6,
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
        local('sc-valet', 'Valet', 20, 6, [
          'Valet: Casino is the big doors. Gift shop is the small ones.',
          'Valet: Nobody has ever tipped me for saying that.',
        ]),
      ],
      [
        { col: 16, row: 4, toAreaId: 'sc-floor', toCol: 8, toRow: 8, label: 'Casino' },
        { col: 9, row: 16, toAreaId: 'sc-gift', toCol: 6, toRow: 5, label: 'Gift Shop' },
      ],
      { west: { toAreaId: 'road-silvercreek', offset: -3 }, east: { toAreaId: 'road-riverbend', offset: -3 } },
    ),
    'sc-floor': area(
      'sc-floor',
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
      [{ col: 8, row: 9, toAreaId: 'sc-street', toCol: 16, toRow: 5, label: 'Out' }],
    ),
    'sc-gift': area(
      'sc-gift',
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
      [{ col: 6, row: 6, toAreaId: 'sc-street', toCol: 9, toRow: 17, label: 'Out' }],
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
  entryAreaId: 'rb-street',
  unlockCash: 600,
  travelCost: 40,
  areas: {
    'road-riverbend': area(
      'road-riverbend',
      'River Road',
      HIGHWAY,
      { col: 14, row: 6 },
      '#0f1620',
      [
        local('road-rb-angler', 'Angler', 8, 10, [
          'Angler: Current is wrong today. Everything is wrong today.',
        ]),
        local('road-rb-walker', 'Woman Walking', 19, 4, [
          'Woman: You can hear the boat from here on a quiet night.',
        ]),
      ],
      [],
      { west: { toAreaId: 'sc-street', offset: 3 }, east: { toAreaId: 'rb-street', offset: 3 } },
    ),
    'rb-street': area(
      'rb-street',
      'Riverbend Landing',
      RIVERBEND_TOWN,
      { col: 16, row: 7 },
      '#0f1620',
      [
        {
          id: 'rb-dock',
          name: 'Dock',
          col: 28,
          row: 12,
          color: COLORS.travel,
          art: 'sign',
          lines: ['Buses and boats, both running late.'],
          action: { kind: 'travel' },
        },
        {
          id: 'cass',
          name: 'Cass',
          col: 4,
          row: 7,
          color: COLORS.sponsor,
          lines: SPONSORS.cass.pitch,
          action: { kind: 'sponsor', sponsorId: 'cass' },
        },
        local('rb-fisher', 'Fisherman', 27, 7, [
          'Fisherman: Boat has not moved in eleven years. They still call it a cruise.',
          'Fisherman: Two-five in there. Tiny sits down at noon and leaves when they close.',
        ]),
        local('rb-runner', 'Deckhand', 14, 16, [
          'Deckhand: Careful who you borrow from around here.',
          'Deckhand: Cass is pleasant right up until the day it is due.',
        ]),
      ],
      [
        { col: 9, row: 5, toAreaId: 'rb-boat', toCol: 8, toRow: 8, label: 'Riverboat' },
        { col: 5, row: 15, toAreaId: 'rb-diner', toCol: 7, toRow: 7, label: 'Diner' },
        { col: 22, row: 5, toAreaId: 'rb-outfitters', toCol: 6, toRow: 5, label: 'Outfitters' },
      ],
      { west: { toAreaId: 'road-riverbend', offset: -3 }, east: { toAreaId: 'road-crescent', offset: -3 } },
    ),
    'rb-boat': area(
      'rb-boat',
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
      [{ col: 8, row: 9, toAreaId: 'rb-street', toCol: 9, toRow: 6, label: 'Ashore' }],
    ),
    'rb-diner': area(
      'rb-diner',
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
      [{ col: 7, row: 8, toAreaId: 'rb-street', toCol: 5, toRow: 16, label: 'Out' }],
    ),
    'rb-outfitters': area(
      'rb-outfitters',
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
      [{ col: 6, row: 6, toAreaId: 'rb-street', toCol: 22, toRow: 6, label: 'Out' }],
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
  entryAreaId: 'ch-street',
  unlockCash: 2500,
  travelCost: 120,
  areas: {
    'road-crescent': area(
      'road-crescent',
      'Harbour Approach',
      HIGHWAY,
      { col: 14, row: 6 },
      '#121020',
      [
        local('road-ch-driver', 'Van Driver', 7, 4, [
          'Driver: Harbour is up ahead. Mind the suits.',
        ]),
        local('road-ch-gull', 'Gull on a Post', 21, 10, [
          'It watches you the whole way past. It is not impressed.',
        ]),
      ],
      [],
      { west: { toAreaId: 'rb-street', offset: 3 }, east: { toAreaId: 'ch-street', offset: 3 } },
    ),
    'ch-street': area(
      'ch-street',
      'Harbor Boulevard',
      CRESCENT_HARBOR_TOWN,
      { col: 15, row: 4 },
      '#121020',
      [
        {
          id: 'ch-transit',
          name: 'Transit Hub',
          col: 28,
          row: 12,
          color: COLORS.travel,
          art: 'sign',
          lines: ['Departure boards for half the coast.'],
          action: { kind: 'travel' },
        },
        {
          id: 'hal',
          name: 'Hal',
          col: 27,
          row: 4,
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
          col: 6,
          row: 12,
          color: COLORS.sponsor,
          lines: SPONSORS.emeka.pitch,
          action: { kind: 'sponsor', sponsorId: 'emeka' },
        },
        local('ch-busker', 'Busker', 25, 12, [
          'Busker: Play you for the hat money. No? Nobody ever does.',
        ]),
        local('ch-suit', 'Woman in a Suit', 15, 13, [
          'Woman in a Suit: The Harbour Room only lets in people it already knows.',
          'Woman in a Suit: Build a name in the five-ten game first. That is how everyone does it.',
        ]),
      ],
      [
        { col: 13, row: 3, toAreaId: 'ch-cardroom', toCol: 8, toRow: 8, label: 'Card Room' },
        { col: 16, row: 3, toAreaId: 'ch-menswear', toCol: 6, toRow: 5, label: 'Menswear' },
        { col: 22, row: 7, toAreaId: 'ch-autorow', toCol: 6, toRow: 5, label: 'Auto Row' },
        { col: 9, row: 7, toAreaId: 'ch-supper', toCol: 7, toRow: 7, label: 'Supper Club' },
        { col: 4, row: 3, toAreaId: 'ch-club', toCol: 7, toRow: 7, label: 'The Harbour Room' },
      ],
      { west: { toAreaId: 'road-crescent', offset: -3 }, east: { toAreaId: 'road-palmcay', offset: -3 } },
    ),
    'ch-cardroom': area(
      'ch-cardroom',
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
      [{ col: 8, row: 9, toAreaId: 'ch-street', toCol: 13, toRow: 4, label: 'Out' }],
    ),
    'ch-menswear': area(
      'ch-menswear',
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
      [{ col: 6, row: 6, toAreaId: 'ch-street', toCol: 16, toRow: 4, label: 'Out' }],
    ),
    'ch-autorow': area(
      'ch-autorow',
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
      [{ col: 6, row: 6, toAreaId: 'ch-street', toCol: 22, toRow: 6, label: 'Out' }],
    ),
    'ch-supper': area(
      'ch-supper',
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
      [{ col: 7, row: 8, toAreaId: 'ch-street', toCol: 9, toRow: 6, label: 'Out' }],
    ),
    'ch-club': area(
      'ch-club',
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
      [{ col: 7, row: 8, toAreaId: 'ch-street', toCol: 4, toRow: 4, label: 'Out' }],
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
  entryAreaId: 'pc-street',
  unlockCash: 8000,
  travelCost: 350,
  areas: {
    'road-palmcay': area(
      'road-palmcay',
      'Causeway',
      HIGHWAY,
      { col: 14, row: 6 },
      '#0c1a1c',
      [
        local('road-pc-cyclist', 'Cyclist', 9, 4, [
          'Cyclist: Flat the whole way. Lovely, until the wind.',
        ]),
        local('road-pc-stall', 'Fruit Stall', 20, 10, [
          'Nobody is behind it. An honesty box, half full.',
        ]),
      ],
      [],
      { west: { toAreaId: 'ch-street', offset: 3 }, east: { toAreaId: 'pc-street', offset: 3 } },
    ),
    'pc-street': area(
      'pc-street',
      'Cay Promenade',
      PALM_CAY_TOWN,
      { col: 15, row: 6 },
      '#0c1a1c',
      [
        {
          id: 'pc-ferry',
          name: 'Ferry Dock',
          col: 28,
          row: 12,
          color: COLORS.travel,
          art: 'sign',
          lines: ['The ferry runs to the mainland twice a day.'],
          action: { kind: 'travel' },
        },
        {
          id: 'rosa',
          name: 'Rosa',
          col: 4,
          row: 6,
          color: COLORS.person,
          lines: MISSIONS['palmcay-tourist'].brief,
          action: { kind: 'mission', missionId: 'palmcay-tourist' },
        },
        local('pc-tourist', 'Sunburnt Tourist', 27, 6, [
          'Tourist: I am up four hundred dollars! On the slots!',
          'Tourist: I have been here since Tuesday.',
        ]),
        local('pc-lifeguard', 'Lifeguard', 15, 16, [
          'Lifeguard: Bernard has not left the tourist table in two days.',
          'Lifeguard: Someone should check on him. Someone with cards.',
        ]),
      ],
      [
        { col: 12, row: 4, toAreaId: 'pc-casino', toCol: 8, toRow: 8, label: 'Cay Room' },
        { col: 9, row: 15, toAreaId: 'pc-boutique', toCol: 6, toRow: 5, label: 'Boutique' },
        { col: 23, row: 15, toAreaId: 'pc-grill', toCol: 7, toRow: 7, label: 'Shoreline Grill' },
        { col: 7, row: 4, toAreaId: 'pc-marina', toCol: 6, toRow: 5, label: 'Marina Motors' },
      ],
      { west: { toAreaId: 'road-palmcay', offset: -3 }, east: { toAreaId: 'road-mesa', offset: -3 } },
    ),
    'pc-casino': area(
      'pc-casino',
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
      [{ col: 8, row: 9, toAreaId: 'pc-street', toCol: 12, toRow: 5, label: 'Out' }],
    ),
    'pc-boutique': area(
      'pc-boutique',
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
      [{ col: 6, row: 6, toAreaId: 'pc-street', toCol: 9, toRow: 16, label: 'Out' }],
    ),
    'pc-grill': area(
      'pc-grill',
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
      [{ col: 7, row: 8, toAreaId: 'pc-street', toCol: 23, toRow: 16, label: 'Out' }],
    ),
    'pc-marina': area(
      'pc-marina',
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
      [{ col: 6, row: 6, toAreaId: 'pc-street', toCol: 7, toRow: 5, label: 'Out' }],
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
  entryAreaId: 'nm-street',
  unlockCash: 30000,
  travelCost: 900,
  areas: {
    'road-mesa': area(
      'road-mesa',
      'Mesa Highway',
      HIGHWAY,
      { col: 14, row: 6 },
      '#1a1020',
      [
        local('road-nm-billboard', 'Billboard', 6, 10, [
          'NEON MESA — WHERE THE NIGHT STARTS. A man is painting over the last word.',
        ]),
        local('road-nm-walker', 'Man with a Suitcase', 21, 4, [
          'Man: I am leaving. Do not ask me how it went.',
        ]),
      ],
      [],
      { west: { toAreaId: 'pc-street', offset: 3 }, east: { toAreaId: 'nm-street', offset: 3 } },
    ),
    'nm-street': area(
      'nm-street',
      'The Mesa Strip',
      NEON_MESA_TOWN,
      { col: 15, row: 7 },
      '#1a1020',
      [
        {
          id: 'nm-shuttle',
          name: 'Airport Shuttle',
          col: 28,
          row: 13,
          color: COLORS.travel,
          art: 'sign',
          lines: ['International departures, one gate.'],
          action: { kind: 'travel' },
        },
        {
          id: 'hal-mesa',
          name: 'Hal',
          col: 4,
          row: 6,
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
          col: 27,
          row: 6,
          color: COLORS.sponsor,
          lines: SPONSORS.consortium.pitch,
          action: { kind: 'sponsor', sponsorId: 'consortium' },
        },
        {
          id: 'fixer',
          name: 'Fixer',
          col: 6,
          row: 13,
          color: COLORS.person,
          lines: MISSIONS['mesa-read'].brief,
          action: { kind: 'mission', missionId: 'mesa-read' },
        },
        local('nm-tout', 'Tout', 24, 13, [
          'Tout: High roller room is up the stairs. They will look at your shoes.',
          'Tout: I am serious about the shoes.',
        ]),
      ],
      [
        { col: 8, row: 3, toAreaId: 'nm-casino', toCol: 8, toRow: 8, label: 'Mesa Casino' },
        { col: 20, row: 3, toAreaId: 'nm-luxury', toCol: 6, toRow: 5, label: 'Mesa Luxury' },
        { col: 10, row: 15, toAreaId: 'nm-motors', toCol: 6, toRow: 5, label: 'Mesa Motors' },
        { col: 21, row: 15, toAreaId: 'nm-club', toCol: 7, toRow: 7, label: 'Ultraviolet' },
      ],
      { west: { toAreaId: 'road-mesa', offset: -3 }, east: { toAreaId: 'road-lumina', offset: -3 } },
    ),
    'nm-casino': area(
      'nm-casino',
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
      [{ col: 8, row: 9, toAreaId: 'nm-street', toCol: 8, toRow: 4, label: 'Out' }],
    ),
    'nm-luxury': area(
      'nm-luxury',
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
      [{ col: 6, row: 6, toAreaId: 'nm-street', toCol: 20, toRow: 4, label: 'Out' }],
    ),
    'nm-motors': area(
      'nm-motors',
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
      [{ col: 6, row: 6, toAreaId: 'nm-street', toCol: 10, toRow: 14, label: 'Out' }],
    ),
    'nm-club': area(
      'nm-club',
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
      [{ col: 7, row: 8, toAreaId: 'nm-street', toCol: 21, toRow: 14, label: 'Out' }],
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
  entryAreaId: 'pl-street',
  unlockCash: 90000,
  travelCost: 2500,
  areas: {
    'road-lumina': area(
      'road-lumina',
      'Lumina Coast Road',
      HIGHWAY,
      { col: 14, row: 6 },
      '#141020',
      [
        local('road-pl-guard', 'Private Security', 8, 4, [
          'Security: This stretch is private. Walking is fine. Stopping is not.',
        ]),
        local('road-pl-view', 'Viewpoint', 20, 10, [
          'The tower is visible from here, lit from the base. It does not look real.',
        ]),
      ],
      [],
      { west: { toAreaId: 'nm-street', offset: 3 }, east: { toAreaId: 'pl-street', offset: 3 } },
    ),
    'pl-street': area(
      'pl-street',
      'Lumina Waterfront',
      PORTO_LUMINA_TOWN,
      { col: 15, row: 7 },
      '#141020',
      [
        {
          id: 'pl-terminal',
          name: 'Terminal',
          col: 28,
          row: 12,
          color: COLORS.travel,
          art: 'sign',
          lines: ['Everywhere you have ever played, listed on one board.'],
          action: { kind: 'travel' },
        },
        {
          id: 'wen',
          name: 'Madame Wen',
          col: 4,
          row: 7,
          color: COLORS.sponsor,
          lines: SPONSORS.wen.pitch,
          action: { kind: 'sponsor', sponsorId: 'wen' },
        },
        local('pl-photographer', 'Photographer', 27, 7, [
          'Photographer: I shoot the winners. I have shot Ms. Okonkwo four years running.',
          'Photographer: Give me a reason to shoot somebody else.',
        ]),
      ],
      [
        { col: 12, row: 3, toAreaId: 'pl-casino', toCol: 8, toRow: 8, label: 'Casino' },
        { col: 19, row: 3, toAreaId: 'pl-atelier', toCol: 6, toRow: 5, label: 'Atelier' },
        { col: 12, row: 14, toAreaId: 'pl-lift', toCol: 6, toRow: 5, label: 'Penthouse Lift' },
      ],
      { west: { toAreaId: 'road-lumina', offset: -3 } },
    ),
    'pl-casino': area(
      'pl-casino',
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
      [{ col: 8, row: 9, toAreaId: 'pl-street', toCol: 12, toRow: 4, label: 'Out' }],
    ),
    'pl-atelier': area(
      'pl-atelier',
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
      [{ col: 6, row: 6, toAreaId: 'pl-street', toCol: 19, toRow: 4, label: 'Out' }],
    ),
    'pl-lift': area(
      'pl-lift',
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
      [{ col: 6, row: 6, toAreaId: 'pl-street', toCol: 12, toRow: 13, label: 'Out' }],
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

/**
 * Objects bigger than a tile standing on each map.
 *
 * Kept beside the areas rather than inside them because `area()` is a positional
 * helper eight arguments long, and because this is the one part of a map the
 * editor writes wholesale — a keyed block is something it can replace exactly,
 * where a ninth argument would mean threading `undefined` past the optional one
 * in front of it.
 *
 * The tiles these objects sit on are already written into the maps above. This
 * is only what lets the renderer draw a poker table instead of four patches of
 * furniture, so the game is correct with or without it.
 */
export const AREA_STAMPS: Record<string, PlacedStamp[]> = {}

/**
 * Every area in the world, by id, with the town it belongs to.
 *
 * Walking off the edge of one map and onto the next can cross a town boundary —
 * that is the point of the world being continuous — so areas have to be
 * resolvable without knowing which city you were in a moment ago. Ids are
 * therefore globally unique, which `content.test.ts` enforces.
 */
export const AREAS: Record<string, { area: AreaDef; cityId: CityId }> = (() => {
  const index: Record<string, { area: AreaDef; cityId: CityId }> = {}
  for (const city of Object.values(CITIES)) {
    for (const area of Object.values(city.areas)) {
      // Attached here rather than passed in, so there is one area object and
      // everything that already holds one sees its objects too.
      if (AREA_STAMPS[area.id]) area.stamps = AREA_STAMPS[area.id]
      index[area.id] = { area, cityId: city.id }
    }
  }
  return index
})()

/** Where an area is, or undefined if nothing by that id exists. */
export function findArea(areaId: string | null | undefined) {
  return areaId ? AREAS[areaId] : undefined
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
