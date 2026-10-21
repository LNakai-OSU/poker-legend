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








/*
 * The roads between towns.
 *
 * The world is continuous, so towns are joined by somewhere rather than by a
 * menu. Each stretch of road belongs to the town it leads into and is drawn in
 * its colours, and each has its own map, its scenery turning from the town you
 * left to the one ahead: Basin's last street trees giving way to saguaros, the
 * desert to a river, a meadow to the harbour wall, the causeway across the sea
 * to the island, beach to desert again, and the desert to a marble terrace over
 * the water. The road itself runs along the same rows in all of them, so the
 * towns either end line up with it.
 */
const ROAD_SILVER_CREEK = parseMap(`
TTTTTTTTTTTTTTTTTTTTTTTTTTTT
T"""""""""""__:::::::::::::T
T""o""""o""__::o:::oo::::::T
T"""""""""__:::::o::::::o::T
T""""""""__::::::::::::::::T
---o------------------o-----
============================
============================
---------o--------o---------
Toooo"""""__:::::::::::::::T
T"""""""""_::::::::::::::::T
T"""o""""__:::o::::::::::o:T
T""""""o__::o::::::::::o:::T
TTTTTTTTTTTTTTTTTTTTTTTTTTTT
`)

const ROAD_RIVERBEND = parseMap(`
TTTTTTTTTTTTTTTTTTTTTTTTTTTT
T::::::::::"""oo""~~~~~~~~~T
T:o:::::::""oo""""~~~~~~~~~T
T::::o:::o""""""""""~~~~~~~T
T:::::::""""""""""""""""~~~T
----o----------------o------
============================
============================
------------o---------------
T:::::::""""""""""""""""~~~T
T::::::::""""""""~~~~~~~~~~T
T::o::::::"""""""~~~~~~~~~~T
T:::::oo::oooo"""~~~~~~~~~~T
TTTTTTTTTTTTTTTTTTTTTTTTTTTT
`)

const ROAD_CRESCENT = parseMap(`
TTTTTTTTTTTTTTTTTTTTTTTTTTTT
T"""""""""""""+++++++++++++T
T"oooo"""""""++++++oo++++++T
T"""""""""""++++++++++o++++T
T""""""""""++++++++++++++++T
---o--------------o-----o---
============================
============================
------o--------o------------
T""""""""""++++++++++++++++T
T"""""""""""+++oooo++++ooooT
T""o""""""""""~~~~~~~~~~~~~T
T"""""oo"""""~~~~~~~~~~~~~~T
TTTTTTTTTTTTTTTTTTTTTTTTTTTT
`)

const ROAD_PALM_CAY = parseMap(`
TTTTTTTTTTTTTTTTTTTTTTTTTTTT
T~~~~~~~~~~~~~~~~~~~~::::::T
T~~~~~~~~~~~~~~~~~~~::o::::T
T~~~~~~~~~~~~~~~~~~:oo:::o:T
Toooo++++++oooo++++::::::::T
-------o---------o-----o----
============================
============================
----------------------------
T+ooooo+++ooooo+o++:::o::::T
T~~~~~~~~~~~~~~~~~~~:::::::T
T~~~~~~~~~~~~~~~~~~~~:::o::T
T~~~~~~~~~~~~~~~~~~~~~::::oT
TTTTTTTTTTTTTTTTTTTTTTTTTTTT
`)

const ROAD_MESA = parseMap(`
TTTTTTTTTTTTTTTTTTTTTTTTTTTT
T::::::::::::::o::::::++oo+T
T:o::::::::::::::::::++++++T
T::::::::::o::::::::+++++++T
T::::::::::::::::::::++++++T
---o-------------------o----
============================
============================
----------------------------
T:::::::::::::::::::++++o++T
T::::o:o:::::::::::::++++++T
T:::::::::::::oo:o::::+++o+T
T::o:::::o:::::::::::::++++T
TTTTTTTTTTTTTTTTTTTTTTTTTTTT
`)

const ROAD_LUMINA = parseMap(`
TTTTTTTTTTTTTTTTTTTTTTTTTTTT
T::::::::""""""""""+++++oo+T
T:o::o::"""""""""""+o++++++T
T::::::""""""""""""++++++++T
T:::::::""""o""""""++++++++T
---o------------------o-----
============================
============================
----------------------------
T::::::""""""""""+o++++++++T
T:::::""""""""""++++++oo+++T
T::::"""""ooo"""+~~~~~~~~~~T
T:::""""""""""""~~~~~~~~~~~T
TTTTTTTTTTTTTTTTTTTTTTTTTTTT
`)

/**
 * The reservation.
 *
 * One lit facade set back behind a wide forecourt, desert either side, and the
 * highway running straight past the front door — Vegas as it looks two hours
 * north of anywhere, which is what the reservation casino is.
 */
const SILVER_CREEK_TOWN = parseMap(`TTTTTTTTTT#############TTTTTTTTT
T::###########################:T
T::###########################:T
T::###########################:T
T::#############D#############:T
To:++++++++++++++++++++++++++:oT
T::++oo++++++++++++++++oo++++::T
T::FFF++++++++++++++++++++FFF::T
----+++o+++++o+++++o+++++o++----
===============zzz==============
===============zzz==============
----++++o+++++++++++++o+++++----
T::++++++++++++++++++++++++++o:T
T::+oo+++++++++++++++++++oo++::T
T::++++#####++++++++#####++++::T
T::::::#####::::::o:#####::::::T
T:o::::##D##::oo::::#####:o:o::T
T::::o:::::::::::::::::::::::::T
TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT`)

/**
 * A river town. The water runs along the north and the boat is moored against it.
 */
const RIVERBEND_TOWN = parseMap(`TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT
T~~~~~~~##~~~~~~~~~~~~~~~~~~~~~T
T~~~#######~~~~~~~~~~~~~~~~~~~~T
T~~#########~~~~~~~~~~~~~~~~~~~T
T~~#########~~~~~~~~~~~~~~~~~~~T
TBBBBBBBBDBBBoBBBBBBoBBBBBoBBBBT
T:oo::o::::::**o:**:::o::::::::T
T::++++++++++++++++++++++++++::T
----++++++++++++++++++++++++----
========zzz=========FFF=========
===FFF==zzz=====================
----+++++++o++++++++++++o+++----
T:o++++++++++++++++++++++++++o:T
T::######::::oo::oo::::######o:T
T::######::::::::::::::######::T
T::##D###::::::::::::::###D##::T
T:::::::ooooo:::oooooo:::::::::T
T""""""""""""""""""""""""""""""T
TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT`)

/**
 * A working harbour: a stone quay, tall frontages along the north, water south.
 */
const CRESCENT_HARBOR_TOWN = parseMap(`T##############################T
T##############################T
T##############################T
T##############################T
T##D####D#####D#####D####D#####T
T++++oo+++++++++o+o++++o+++oo++T
To+++++++++++++++++++++++++++++T
T++++++++++++++++++++++++++++++T
----o++++++o++++++o++++++++o----
=============zzz===FFF==========
===FFF=======zzz================
----++++o++++++++o+++++o++++----
T++++++++++++++++++++++++++++++T
T+++++++++oo++++++++oo+++++++++T
T+oooo+o+oooo++++oooo+o+ooooo++T
T~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~T
T~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~T
T~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~T
TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT`)

/**
 * An island resort — sand, palms, and the sea along the bottom of the map.
 */
const PALM_CAY_TOWN = parseMap(`TTTTTTTTT#########TTTTTTTTTTTTTT
T:######:#########::########:::T
T:######:#########::########:::T
T:######:#########::########:::T
T:###D##:####D####::########:::T
ToooT:::::::::::::o:::::::::T::T
T::::::::o:**::::::**:o::::::::T
T::::::::::::::::::::::::::::::T
----:::o:::::::::::o:::::o::----
============zzz=====FFF=========
===FFF======zzz=================
----:::::o:::::::o::::::o:::----
T::::::::::::::::::::::::::::::T
T::::T:#####oo:oo:oo:#####T::::T
T::::::#####:::::::::#####:::::T
T:o::::##D##:::::::::##D##:::o:T
T:oooo:::::::::::::::::::oooo::T
T~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~T
TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT`)

/**
 * The Strip.
 *
 * Enormous facades down both sides, a fountain in the middle of the plaza, and
 * six lanes of road running through the lot of it.
 */
const NEON_MESA_TOWN = parseMap(`T##############################T
T##############################T
T##############################T
T##############################T
T##############################T
T#####D#######D#####D######D###T
T++++++++++++++++++++++ooo+++++T
T++oo+++++++~~~~~~++++++++oo+++T
T+++++++++o+~~~~~~+o+++++++++++T
T++++++++++++++++++++++++++++++T
--o-o---o+o++++++++++o++-----o--
=====zzz=====FFF================
=====zzz========================
=====zzz================FFF=====
--o-----++o++++++++++o++-----o--
T++++++++++++++++++++++++++++++T
T++oo+++++++o++++++o++++++oo+++T
T##############################T
T##############################T
T##############################T
T##############################T`)

/**
 * Marble and water: colonnades down both sides and a reflecting pool between.
 */
const PORTO_LUMINA_TOWN = parseMap(`T++######T###########T#######++T
T++######T###########T#######++T
T++######T###########T#######++T
T++######T###########T#######++T
T++######T###########T#######++T
T++##D###T#####D#####T###D###++T
T++++++++++++++++++++++++++++++T
T++oo++++~~~~~~~~~~~~~~++++oo++T
T++++++++~~~~~~~~~~~~~~++++++++T
--o-----o++++o+++o+++++o-----o--
==============zzz=======FFF=====
===FFF========zzz===============
------o-++++o+++++o+++++-o------
T+++++++oo++++++++++++oo+++++++T
To+oo++++++++++++++++++++++o++oT
T++##########################++T
T++##########################++T
T++##########################++T
T++++++++++++++++++++++++++++++T
TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT`)



/*
 * Rooms.
 *
 * Every room used to be one of six casino floors or one of two shared rooms —
 * eleven shops were the same counter in a different colour. Each room now has
 * a map of its own: a wall top round the edge, a back wall in its own material,
 * a floor that says what kind of place it is, and the objects in it written in
 * by the stamps listed in AREA_STAMPS below.
 */

/** Silver Creek: saloon panelling, dusty diamond carpet, slots along the back, one live table. */
const SILVER_CREEK_FLOOR = parseMap(`
^^^^^^^^^^^^^^^^^^^^
^FFFFFFFFFFFFFFFFFF^
^FFFFFFFFFFFFFFFFFF^
^,,,,,,,,,,,,,,,,,,^
^F,,,,,,,,,,,,,,,,F^
^,,FFF,,F,,F,,FFF,,^
^,,FFF,,F,,F,,FFF,,^
^,,,,,,,,,,,,,,,,,,^
^FFFF,,,,,,,,,,FFFF^
^FFFF,,,,,,,,,,FFFF^
^,,,,,,,,,,,,,,,,,,^
^^^^^^^^^^D^^^^^^^^^
`)

/** The riverboat saloon: deck boards, varnished cabin walls, portholes on the river side. */
const RIVERBOAT_FLOOR = parseMap(`
^^^^^^^^^^^^^^^^^^^^^^
^FFFFssssssssssFFFFFs^
^FFFFBBBBBBBBBBFFFFFB^
^BBBBBBBBBBBBBBBBBBBB^
^BBBBBBBBBBBBBBBBBBBB^
^BBBBFBBBFFFBBBFBBBBB^
^BBBBFBBBFFFBBBFBBBBB^
^FFFFBBBBBBBBBBBBFFFF^
^FFFFBBBBBBBBBBBBFFFF^
^BBBBBBBBBBBBBBBBBBBB^
^^^^^^^^^^^D^^^^^^^^^^
`)

/** The Harbor card room: baize and mahogany, green-and-gold carpet, lamps over four tables, no machines. */
const CARDROOM_FLOOR = parseMap(`
^^^^^^^^^^^^^^^^^^^^
^gggggggFFFFFgggggg^
^F;;;;;;FFFFF;;;;;F^
^;;;;;;;;;;;;;;;;;;^
^;;;;;;;;;;;;;;;;;;^
^;;FFF;;F;;F;;FFF;;^
^;;FFF;;F;;F;;FFF;;^
^;;;;;;;;;;;;;;;;;;^
^;;;;;;;;;;;;;;;;;;^
^;;FFF;;;;;;;;;FF;;^
^;;FFF;;;;;;;;;;;;;^
^;;;;;;;;;;;;;;;;;;^
^^^^^^^^^^D^^^^^^^^^
`)

/** The Cay Room: bamboo walls, teal carpet, a tiki bar, palms between two long tables. */
const CAY_FLOOR = parseMap(`
^^^^^^^^^^^^^^^^^^^^
^FFFFFFbFFFFFbFFFFb^
^FFFFFF'FFFFF'FFFF'^
^''''''''''''''''''^
^''''''''''''''''''^
^''FFF''FFFF''FFF''^
^''FFF''FFFF''FFF''^
^''''''''''''''''''^
^''''''''''''''''''^
^'FFFF''''''''FFFF'^
^'FFFF''''''''FFFF'^
^F''''''''''''''''F^
^^^^^^^^^^D^^^^^^^^^
`)

/** The Mesa Casino: near-black carpet with neon trim, neon walls, a progressive bank, the high-roller door roped off. */
const MESA_FLOOR = parseMap(`
^^^^^^^^^^^^^^^^^^^^^^
^FFFFFFnnnnnnnnnFFFFF^
^FFFFFF!FFF!FFF!FFFFF^
^!!!!!!!!!!!!!!!!!!!!^
^!!!!!!!!!!!!!!!!!!!!^
^!!!!!!!!!!!!!!!!!!!!^
^!!FFF!!!!FF!!!!FFF!!^
^!!FFF!!!!!!!!!!FFF!!^
^!!!!!!!!!!!!!!!!!!!!^
^!!!!!!!!F!!F!!FFFFF!^
^!!!FF!!!F!!F!!FFFFF!^
^!!!!!!!!!!!!!!!!!!!!^
^!!!!!!!!!!!!!!!!!!!!^
^^^^^^^^^^^D^^^^^^^^^^
`)

/** Porto Lumina: white marble, gold columns, chandelier light, a roped salon in burgundy for the last game. */
const LUMINA_FLOOR = parseMap(`
^^^^^^^^^^^^^^^^^^^^
^FFFFFFFFmmmmmFFFFF^
^FFFFFFFFMMMMMFFFFF^
^MMMMMMMMMMMMMMMMMM^
^MMMMMMMMMM&&&&&&&&^
^MMFFFMMFMMF&&&&&&&^
^MMFFFMMFMMF&&FF&&&^
^MMMMMMMMMM&&&&&&&&^
^MMMMMMMMMM&&&&&&&&^
^FMMFFMMMMMFFF&&FFF^
^FMMMMMMMMMMMMMMMMF^
^^^^^^^^^^D^^^^^^^^^
`)

/** The Harbour Room: damask, a fire going, leather sofas, and a door at the back with nothing on it. */
const HARBOUR_ROOM = parseMap(`
^^^^^^^^^^^^^^^^
^FFdddFFFdFFFFF^
^FFWWWFFFWFFFFF^
^WWWWWWWWWWWWWW^
^WWWWWWWWWWWWWW^
^WFFFWWWWWFFFWW^
^WWWWWWWWWWWWWW^
^WWWWWWWWWWWWWW^
^FWWWWWWWWWWWWF^
^^^^^^^D^^^^^^^^
`)

/** The Bellweather: damask and burgundy carpet, white cloths, a grand piano. */
const SUPPER_CLUB = parseMap(`
^^^^^^^^^^^^^^^^
^dddddddddddFFF^
^&&&&&&&&&&&FFF^
^&&&&&&&&&&&&&&^
^&F&&&F&&&&&&&&^
^&&&&&&&&&&&&&&^
^&&&&&&&&&&F&&&^
^&F&&&&&&&&&&&&^
^&&&&&&&&&&&&&F^
^^^^^^^D^^^^^^^^
`)

/** Ultraviolet: neon walls, violet carpet, the decks over a lit floor, the Invitational behind a black door. */
const ULTRAVIOLET = parseMap(`
^^^^^^^^^^^^^^^^
^nnnnnFFFnFFFFF^
^%%%%%FFF%FFFFF^
^%%%%%%%%%%%%%%^
^%%%%%%%%%%%%%%^
^%%%%%%%%%%%%%%^
^FFF%%%%%%%%FFF^
^%%%%%%%%%%%%%%^
^%%%%%%%%%%%%%%^
^^^^^^^D^^^^^^^^
`)

/** Patel's: shelves to the ceiling, a lit cooler, the till, two islands of everything else. */
const BODEGA = parseMap(`
^^^^^^^^^^^^^^
^FFpFFFpppFFp^
^FFvFFFvvvFFv^
^vvvvvvvvvvvv^
^FFFvvvvvFFFv^
^FFFvvvvvFFFv^
^vvvvvvvvvvvv^
^vvvvvvvvvvvv^
^^^^^^D^^^^^^^
`)

/** The launderette: white tile, dryers stacked over washers, a folding table, a row of machines. */
const LAUNDROMAT = parseMap(`
^^^^^^^^^^^^^^
^FFFFttttFFFF^
^FFFFQQQQFFFF^
^QQQQQQQQQQQQ^
^QQQQQQQQQQQQ^
^FFFQQQQQFFFF^
^QQQQQQQQQQQQ^
^QQQQQQQQQQQQ^
^^^^^^D^^^^^^^
`)

/** The Blue Plate: chequerboard floor, a counter with pie under glass, booths down both sides, a jukebox. */
const BLUE_PLATE = parseMap(`
^^^^^^^^^^^^^^^^
^FttttFFFFFtttt^
^FKKKKFFFFFKKKK^
^KKKKKKKKKKKKKK^
^FFKKKKKKKKKKFF^
^FFKKKKKKKKKKFF^
^KKKKKKKKKKKKKK^
^FFKKKKKKKKKKFF^
^FFKKKKKKKKKKFF^
^^^^^^^D^^^^^^^^
`)

/** The trading post: turquoise and silver on the shelves, cacti in pots. */
const GIFT_SHOP = parseMap(`
^^^^^^^^^^^^^^
^FFwwFFFwwwFF^
^FFxxFFFxxxFF^
^xxxxxxxxxxxx^
^xFFxxxxxxFFx^
^xxxxxxxxxxxx^
^Fxxxxxxxxxxx^
^xFFxxxxxxFFx^
^^^^^^D^^^^^^^
`)

/** The Landing Diner: cabin planking, the river in the windows, a counter and four tables. */
const LANDING_DINER = parseMap(`
^^^^^^^^^^^^^^^^
^sssssssssFFFFF^
^WWWWWWWWWFFFFF^
^WWWWWWWWWWWWWW^
^WFFWWFFWWWWWWW^
^WWWWWWWWWWWWWW^
^WWWWWWWWWWWWWW^
^WFFWWFFWWWWWWW^
^WWWWWWWWWWWWWW^
^^^^^^^D^^^^^^^^
`)

/** Dockside Outfitters: boards underfoot, rope and boots on the shelves, waxed jackets on rails. */
const OUTFITTERS = parseMap(`
^^^^^^^^^^^^^^
^FFwwFFFwwwFF^
^FFyyFFFyyyFF^
^yyyyyyyyyyyy^
^yyyyyyyyyyyy^
^yFFyyyyyyFFy^
^yyyyyyyyyyyy^
^yyyyyyyyyyyy^
^^^^^^D^^^^^^^
`)

/** Harbor Menswear: rails of suits, two dummies, a long mirror, shoes on the back wall. */
const MENSWEAR = parseMap(`
^^^^^^^^^^^^^^
^FFppFFFpFFpF^
^FFWWFFFWFFWF^
^WWWWWWWWWWWW^
^WWWWWWWWWWWW^
^FFWWWWWWWWFF^
^WWWWWWWWWWWW^
^WWWWWWWWWWWW^
^^^^^^D^^^^^^^
`)

/** Auto Row: a tiled showroom, two cars on turntables, the sales desk at the back. */
const AUTO_ROW = parseMap(`
^^^^^^^^^^^^^^^^
^pppppFFFpppppp^
^FQQQQFFFQQQQQF^
^QQQQQQQQQQQQQQ^
^QFFFQQQQQQFFFQ^
^QFFFQQQQQQFFFQ^
^QQQQQQQQQQQQQQ^
^QFFFQQQQQQQQQF^
^QQQQQQQQQQQQQQ^
^^^^^^^D^^^^^^^^
`)

/** Cay Boutique: bamboo walls, linen on rails, a palm, a long mirror. */
const BOUTIQUE = parseMap(`
^^^^^^^^^^^^^^
^FbbbFFFbFbbF^
^FrrrFFFrFrrF^
^rrrrrrrrrrrr^
^rrrrrrrrrrrr^
^FFrrrrrrrrFF^
^rrrrrrrrrrrr^
^rrrrrrrrrrrr^
^^^^^^D^^^^^^^
`)

/** Shoreline Grill: bamboo and boards, a tiki bar, cane tables, the catch on the board. */
const SHORELINE_GRILL = parseMap(`
^^^^^^^^^^^^^^^^
^bbbbbbbbbFFFFF^
^BBBBBBBBBFFFFF^
^BBBBBBBBBBBBBB^
^BFBBBFBBBBBBBB^
^BBBBBBBBBBBBBB^
^BBBBBBBBBBBBBF^
^BFBBBFBBBBBBBF^
^BBBBBBBBBBBBBB^
^^^^^^^D^^^^^^^^
`)

/** Marina Motors: a speedboat on its trailer and a car beside it, the sea in the windows. */
const MARINA_MOTORS = parseMap(`
^^^^^^^^^^^^^^^^
^pppppFFFpppppp^
^eeeeeFFFeeeeee^
^eeeeeeeeeeeeee^
^FFFFeeeeeeFFFe^
^FFFFeeeeeeFFFe^
^eeeeeeeeeeeeee^
^eeeeeeeeeeeeee^
^eeeeeeeeeeeeee^
^^^^^^^D^^^^^^^^
`)

/** Mesa Luxury: marble floor, neon walls, gowns on a rail and a watch under glass. */
const MESA_LUXURY = parseMap(`
^^^^^^^^^^^^^^
^nnnnFFFnFnnF^
^MMMMFFFMFMMF^
^MMMMMMMMMMMM^
^MMMMMMMMMMMM^
^FFMMMMMMMFFM^
^MMMMMMMMMMMM^
^MMMMMMMMMMMM^
^^^^^^D^^^^^^^
`)

/** Mesa Motors: a yellow car and a red one on turntables, the Strip in the windows. */
const MESA_MOTORS = parseMap(`
^^^^^^^^^^^^^^^^
^nnnnnFFFnnnnnn^
^FQQQQFFFQQQQQF^
^QQQQQQQQQQQQQQ^
^QFFFQQQQQQFFFQ^
^QFFFQQQQQQFFFQ^
^QQQQQQQQQQQQQQ^
^FQQQQQQQQQFFFQ^
^QQQQQQQQQQQQQQ^
^^^^^^^D^^^^^^^^
`)

/** Lumina Atelier: marble walls, a burgundy carpet, gowns, a dummy in evening dress, a velvet bench. */
const ATELIER = parseMap(`
^^^^^^^^^^^^^^
^FFmmFFFmmmmF^
^FF&&FFF&&&&F^
^&&&&&&&&&&&&^
^&&&&&&&&&&&&^
^FF&&&&&&&FF&^
^&&&&&&&&&&&&^
^&&&&&&&&&&&&^
^^^^^^D^^^^^^^
`)

/** The penthouse lobby: marble, brass lift doors, a concierge, palms either side. */
const PENTHOUSE_LOBBY = parseMap(`
^^^^^^^^^^^^^^
^FFFFmmmmmmmF^
^FFFFMMMMMMMF^
^MMMMMMMMMMMM^
^MMMMMMMMMMMM^
^MMMMMMMMMMMM^
^MFFMMMMMMFFM^
^MMMMMMMMMMMM^
^^^^^^D^^^^^^^
`)

/** Your one room: a kitchenette, a window onto a brick wall, a bed, a table with a note on it. */
const APARTMENT_ROOM = parseMap(`
^^^^^^^^^^^^
^FFFhhhhFFh^
^FFFWWWWFFF^
^WWWWWWWWWF^
^WFFWWWWFWW^
^WWWWWWWWWW^
^WWWWWWWWWW^
^WWWWWWWWWW^
^^^^^^D^^^^^
`)

/** Marcus's front room: panelling, a kitchen at the back, and the card table out for Friday. */
const MARCUS_HOUSE = parseMap(`
^^^^^^^^^^^^^^^^
^FFwwwwwwwwwFFF^
^FFWWWWWWWWWFFF^
^WWWWWWWWWWWWWW^
^WWWWWWWWWWWWWW^
^FWWWWFFFWWWWWF^
^WWWWWWWWWWWWWW^
^WWWWWWWWWWWWWW^
^WWWWWWWWWWFFFW^
^WWWWWWWWWWWWWW^
^^^^^^^D^^^^^^^^
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

/**
 * Something to look at whose picture is a stamp: a bank of dryers, a cooler.
 * Nothing is drawn for it, because the object it stands on already is.
 */
function thing(id: string, name: string, col: number, row: number, lines: string[]): PoiDef {
  return { id, name, col, row, color: COLORS.local, lines, art: 'none', action: { kind: 'flavor' } }
}

// ---------------------------------------------------------------------------
// Your apartment, and the block outside it
// ---------------------------------------------------------------------------


/**
 * Basin Street, where you live.
 *
 * Open at both ends along the road: streets join to the next map by being walked
 * off, not by a doorway standing in the middle of the tarmac. Trees close the
 * sides the town does not carry on into.
 */
const BASIN_STREET = parseMap(`
T#######TT#####TT##########T
T#######TT#####TT##########T
T#######TT#####TT##########T
T####D##TT#####TT##########T
T--------------o-o--------oT
T--*""""-oo--------""""*---T
T--------------------------T
T-o-o---o---o-------o---o---
T=============FFF===========
T==================FFF======
T-------o---o---o-------o---
T--------------------------T
T--*""""-----oo----""""*---T
To--oo--------------------oT
T######TT#####TT###########T
T######TT#####TT###########T
T######TT#####TT###########T
T######TT#####TT###########T
`)

/** The next block east: the shops, the laundromat, the diner. */
const SEVENTH_STREET = parseMap(`
T######TT###########TT#####T
T######TT###########TT#####T
T######TT###########TT#####T
T###D##TT#######D###TT#####T
T------o---o-------o------oT
T--*"""------------"""*----T
T--------------------------T
------o-------o--------o----
=================FFF========
===========FFF==============
--o-------o-------o-------o-
T--------------------------T
T---oo---------------oo----T
T-o-------------o--------o-T
T#######--######TT#########T
T#######--######TT#########T
T###D###--######TT#########T
T--------o--o--------------T
TTTTTTTTTTTTTTTTTTTTTTTTTTTT
`)

/**
 * The bus depot: an open lot at the edge of town. The road carries on east out
 * of the map, and the forecourt opens north towards Marcus's block.
 */
const DEPOT_LOT = parseMap(`
TTTTTTTT++++TTTTTTTTTT
T::###:++++++::::::::T
T::++++++++++o++o::::T
T::+oo+++++++++++::::T
T::++++++++++++++::::T
----++++o++++++o++o--T
======================
======================
----+++++++o++++++---T
T::++++++++++++++::::T
T::+oo++++++++oo+::::T
T::+++FFF+FFF++++::::T
T::::::::::::::::::::T
T::::::::::::::::::::T
TTTTTTTTTTTTTTTTTTTTTT
`)

/** Marcus's block, north of the depot. His door is the middle one. */
const EASTGATE_BLOCK = parseMap(`
T#####TTT#####TT#####T
T#####TTT#####TT#####T
T#####TTT#####TT#####T
T#####TTT##D##TT#####T
T--------o-----------T
T--*""-o------o--*""-T
T-oooo----*-----oooo-T
T--------------------T
To-*""-----oo----*""oT
T--------------------T
T####TT------o---####T
T####TT----------####T
T####TT---------o####T
T------****----------T
TTTTTTTT----TTTTTTTTTT
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
      { col: 6, row: 7 },
      '#101018',
      [
        {
          // Set into the wall, with the floor in front of it to stand on.
          id: 'apartment-window',
          name: 'Window',
          col: 4,
          row: 1,
          color: COLORS.local,
          art: 'none',
          labelled: false,
          lines: [
            'The window faces a brick wall about four feet away.',
            'Rent is due in nine days. You have been not thinking about it.',
          ],
          action: { kind: 'flavor' },
        },
        local('apartment-note', 'Note on the Table', 3, 4, [
          "Marcus's handwriting: GAME AT MINE. 8pm. BRING CASH.",
          'Underneath, smaller: the 14 bus, you know the one.',
        ]),
      ],
      [{ col: 6, row: 8, toAreaId: 'basin', toCol: 5, toRow: 4, label: 'Outside' }],
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
      [{ col: 5, row: 3, toAreaId: 'home', toCol: 6, toRow: 7, label: 'Home' }],
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
        { col: 4, row: 3, toAreaId: 'bodega', toCol: 6, toRow: 7, label: "Patel's" },
        { col: 16, row: 3, toAreaId: 'laundromat', toCol: 6, toRow: 7, label: 'Laundromat' },
        { col: 4, row: 16, toAreaId: 'diner', toCol: 7, toRow: 8, label: 'The Blue Plate' },
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
      [{ col: 11, row: 3, toAreaId: 'marcus-house', toCol: 7, toRow: 9, label: "Marcus's" }],
      { south: { toAreaId: 'depot' } },
    ),
    'marcus-house': area(
      'marcus-house',
      "Marcus's Place",
      MARCUS_HOUSE,
      { col: 7, row: 9 },
      '#141018',
      [
        local('marcus-dana', 'Dana', 9, 5, [
          'Dana: He has been talking about this game all week.',
          'Dana: He is going to lose. He always loses.',
        ]),
      ],
      [{ col: 7, row: 10, toAreaId: 'eastgate', toCol: 11, toRow: 4, label: 'Outside' }],
    ),
    laundromat: area(
      'laundromat',
      'Basin Street Laundromat',
      LAUNDROMAT,
      { col: 6, row: 7 },
      '#141420',
      [
        local('laundry-regular', 'Woman Folding Sheets', 2, 6, [
          'Woman: You are the one upstairs from the bakery, right?',
          'Woman: Tell Marcus the card games keep my boy awake.',
          'Woman: ...and tell him I want in next time.',
        ]),
        thing('laundry-machines', 'Dryers', 11, 2, [
          'Six dryers. Two of them work. Everyone knows which two.',
        ]),
      ],
      [{ col: 6, row: 8, toAreaId: 'seventh', toCol: 16, toRow: 4, label: 'Seventh Street' }],
    ),
    bodega: area(
      'bodega',
      "Patel's Corner Store",
      BODEGA,
      { col: 6, row: 7 },
      '#16161f',
      [
        local('patel', 'Mr Patel', 5, 2, [
          'Mr Patel: Late again. Coffee is still hot, I make no promises about fresh.',
          'Mr Patel: Marcus bought two bags of ice and a deck of cards an hour ago.',
          'Mr Patel: Whatever you are all doing out there, do it quietly.',
        ]),
        thing('bodega-cooler', 'Cooler', 10, 2, [
          'Energy drinks, a sad sandwich, and one bottle of champagne nobody has ever bought.',
        ]),
      ],
      [{ col: 6, row: 8, toAreaId: 'seventh', toCol: 4, toRow: 4, label: 'Seventh Street' }],
    ),
    diner: area(
      'diner',
      'The Blue Plate',
      BLUE_PLATE,
      { col: 7, row: 8 },
      '#191520',
      [
        local('diner-waitress', 'Waitress', 9, 6, [
          'Waitress: Sit anywhere, the booths are all the same amount of broken.',
          'Waitress: Coffee? You look like a man about to make a decision.',
        ]),
        local('diner-regular', 'Man in a Windbreaker', 2, 4, [
          'Man: I played cards for a living once.',
          'Man: Ask me how that ended. Go on.',
          'Man: It ended here, kid. Nine in the morning, every morning.',
        ]),
      ],
      [{ col: 7, row: 9, toAreaId: 'seventh', toCol: 4, toRow: 17, label: 'Seventh Street' }],
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
      ROAD_SILVER_CREEK,
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
        { col: 16, row: 4, toAreaId: 'sc-floor', toCol: 10, toRow: 10, label: 'Casino' },
        { col: 9, row: 16, toAreaId: 'sc-gift', toCol: 6, toRow: 7, label: 'Gift Shop' },
      ],
      { west: { toAreaId: 'road-silvercreek', offset: -3 }, east: { toAreaId: 'road-riverbend', offset: -3 } },
    ),
    'sc-floor': area(
      'sc-floor',
      'Silver Creek Casino',
      SILVER_CREEK_FLOOR,
      { col: 10, row: 10 },
      '#161018',
      [
        {
          id: 'slots',
          name: 'Slot Row',
          col: 2,
          row: 2,
          color: COLORS.flavor,
          art: 'none',
          lines: ['Three reels, one lever, and terrible odds. Everyone knows it and plays anyway.'],
          action: { kind: 'slots' },
        },
        {
          id: 'craps',
          name: 'Craps Table',
          col: 15,
          row: 5,
          color: COLORS.flavor,
          art: 'none',
          lines: ['Shooter is coming out. The pass line is the only bet worth making here.'],
          action: { kind: 'craps' },
        },
        {
          id: 'pitboss',
          name: 'Pit Boss',
          col: 4,
          row: 4,
          color: COLORS.dealer,
          lines: [
            'Pit Boss: Low-stakes table has an open seat. Dollar-two blinds.',
            'Pit Boss: Sit down whenever you are ready.',
          ],
          action: { kind: 'table', tableId: 'silvercreek-low' },
        },
        local('sc-regular', 'Table Regular', 2, 6, [
          'Regular: Ray plays every hand he is dealt. Every single one.',
          'Regular: I have made more off Ray than I have off my job.',
        ]),
        local('sc-cashier', 'Cashier', 16, 2, [
          'Cashier: Chips for cash, cash for chips. The house keeps what falls between.',
        ]),
        local('sc-bartender', 'Bartender', 11, 2, [
          'Bartender: Coffee is free if you are playing. Whiskey is free if you are losing.',
          'Bartender: Ray has a tab. Ray has had a tab since 1994.',
        ]),
      ],
      [{ col: 10, row: 11, toAreaId: 'sc-street', toCol: 16, toRow: 5, label: 'Out' }],
    ),
    'sc-gift': area(
      'sc-gift',
      'Gift Shop',
      GIFT_SHOP,
      { col: 6, row: 7 },
      '#161018',
      [
        {
          id: 'giftshop',
          name: 'Clerk',
          col: 6,
          row: 2,
          color: COLORS.shop,
          // Behind the counter, serving. Shops used to be drawn as a box of stock.
          art: 'person',
          lines: ['Clerk: Souvenirs, snacks, and things nobody needs.'],
          action: { kind: 'shop', shopId: 'silvercreek-gift' },
        },
      ],
      [{ col: 6, row: 8, toAreaId: 'sc-street', toCol: 9, toRow: 17, label: 'Out' }],
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
      ROAD_RIVERBEND,
      { col: 14, row: 6 },
      '#0f1620',
      [
        local('road-rb-angler', 'Angler', 16, 10, [
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
        { col: 9, row: 5, toAreaId: 'rb-boat', toCol: 11, toRow: 9, label: 'Riverboat' },
        { col: 5, row: 15, toAreaId: 'rb-diner', toCol: 7, toRow: 8, label: 'Diner' },
        { col: 26, row: 15, toAreaId: 'rb-outfitters', toCol: 6, toRow: 7, label: 'Outfitters' },
      ],
      { west: { toAreaId: 'road-riverbend', offset: -3 }, east: { toAreaId: 'road-crescent', offset: -3 } },
    ),
    'rb-boat': area(
      'rb-boat',
      'The Riverboat',
      RIVERBOAT_FLOOR,
      { col: 11, row: 9 },
      '#0f1620',
      [
        {
          id: 'riverboat-dealer',
          name: 'Dealer',
          col: 10,
          row: 4,
          color: COLORS.dealer,
          lines: ['Dealer: Two-five, three hundred to sit. Tiny has been here since noon.'],
          action: { kind: 'table', tableId: 'riverbend-mid' },
        },
        local('rb-tiny-watcher', 'Bartender', 17, 2, [
          'Bartender: Tiny tips like a man who does not know what money is.',
          'Bartender: Do not tell him I said that. Do not tell him anything, honestly.',
        ]),
        {
          id: 'rb-slots',
          name: 'Slot Machines',
          col: 2,
          row: 2,
          color: COLORS.flavor,
          art: 'none',
          lines: ['Three brass-trimmed machines and one that only takes old quarters.'],
          action: { kind: 'slots' },
        },
      ],
      [{ col: 11, row: 10, toAreaId: 'rb-street', toCol: 9, toRow: 6, label: 'Ashore' }],
    ),
    'rb-diner': area(
      'rb-diner',
      'The Landing Diner',
      LANDING_DINER,
      { col: 7, row: 8 },
      '#0f1620',
      [
        {
          id: 'riverbend-diner',
          name: 'Server',
          col: 12,
          row: 2,
          color: COLORS.shop,
          lines: ['Server: Coffee is bottomless. Nothing else is.'],
          action: { kind: 'venue', venueId: 'riverbend-diner' },
        },
        {
          id: 'deb',
          name: 'Deb',
          col: 2,
          row: 5,
          color: COLORS.person,
          lines: MISSIONS['riverbend-marker'].brief,
          action: { kind: 'mission', missionId: 'riverbend-marker' },
        },
      ],
      [{ col: 7, row: 9, toAreaId: 'rb-street', toCol: 5, toRow: 16, label: 'Out' }],
    ),
    'rb-outfitters': area(
      'rb-outfitters',
      'Dockside Outfitters',
      OUTFITTERS,
      { col: 6, row: 7 },
      '#0f1620',
      [
        {
          id: 'outfitters',
          name: 'Clerk',
          col: 6,
          row: 2,
          color: COLORS.shop,
          art: 'person',
          lines: ['Clerk: Jackets, bikes, whatever gets you upriver.'],
          action: { kind: 'shop', shopId: 'riverbend-outfitters' },
        },
      ],
      [{ col: 6, row: 8, toAreaId: 'rb-street', toCol: 26, toRow: 16, label: 'Out' }],
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
      ROAD_CRESCENT,
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
      { col: 15, row: 6 },
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
          col: 24,
          row: 6,
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
        { col: 14, row: 4, toAreaId: 'ch-cardroom', toCol: 10, toRow: 11, label: 'Card Room' },
        { col: 20, row: 4, toAreaId: 'ch-menswear', toCol: 6, toRow: 7, label: 'Menswear' },
        { col: 25, row: 4, toAreaId: 'ch-autorow', toCol: 7, toRow: 8, label: 'Auto Row' },
        { col: 8, row: 4, toAreaId: 'ch-supper', toCol: 7, toRow: 8, label: 'Supper Club' },
        { col: 3, row: 4, toAreaId: 'ch-club', toCol: 7, toRow: 8, label: 'The Harbour Room' },
      ],
      { west: { toAreaId: 'road-crescent', offset: -3 }, east: { toAreaId: 'road-palmcay', offset: -3 } },
    ),
    'ch-cardroom': area(
      'ch-cardroom',
      'Harbor Card Room',
      CARDROOM_FLOOR,
      { col: 10, row: 11 },
      '#121020',
      [
        {
          id: 'harbor-dealer',
          name: 'Dealer',
          col: 4,
          row: 4,
          color: COLORS.dealer,
          lines: ['Dealer: Five-ten, thousand to sit. Hollis is in for his third buy-in.'],
          action: { kind: 'table', tableId: 'crescent-main' },
        },
        {
          id: 'crescent-headsup',
          name: 'Heads-Up Table',
          col: 16,
          row: 8,
          color: COLORS.dealer,
          lines: ['Dealer: One-on-one, five-ten. Vance has been waiting for someone to sit.'],
          action: { kind: 'table', tableId: 'crescent-headsup' },
        },
        {
          id: 'doorman',
          name: 'Doorman',
          col: 8,
          row: 10,
          color: COLORS.person,
          lines: MISSIONS['crescent-suit'].brief,
          action: { kind: 'mission', missionId: 'crescent-suit' },
        },
        local('ch-cashier', 'Cashier', 10, 2, [
          'Cashier: Thousand to sit at five-ten. We do not do credit. We do not do favours.',
        ]),
      ],
      [{ col: 10, row: 12, toAreaId: 'ch-street', toCol: 14, toRow: 5, label: 'Out' }],
    ),
    'ch-menswear': area(
      'ch-menswear',
      'Harbor Menswear',
      MENSWEAR,
      { col: 6, row: 7 },
      '#121020',
      [
        {
          id: 'menswear',
          name: 'Tailor',
          col: 6,
          row: 2,
          color: COLORS.shop,
          art: 'person',
          lines: ['Tailor: We can have it fitted by tonight.'],
          action: { kind: 'shop', shopId: 'crescent-menswear' },
        },
        {
          id: 'crescent-tailor',
          name: 'Seamstress',
          col: 3,
          row: 6,
          color: COLORS.person,
          lines: MISSIONS['crescent-courier'].brief,
          action: { kind: 'mission', missionId: 'crescent-courier' },
        },
      ],
      [{ col: 6, row: 8, toAreaId: 'ch-street', toCol: 20, toRow: 5, label: 'Out' }],
    ),
    'ch-autorow': area(
      'ch-autorow',
      'Auto Row',
      AUTO_ROW,
      { col: 7, row: 8 },
      '#121020',
      [
        {
          id: 'autorow',
          name: 'Salesman',
          col: 7,
          row: 2,
          color: COLORS.shop,
          art: 'person',
          lines: ['Salesman: Nothing here is new. Everything here runs.'],
          action: { kind: 'shop', shopId: 'crescent-auto' },
        },
      ],
      [{ col: 7, row: 9, toAreaId: 'ch-street', toCol: 25, toRow: 5, label: 'Out' }],
    ),
    'ch-supper': area(
      'ch-supper',
      'Bellweather Supper Club',
      SUPPER_CLUB,
      { col: 7, row: 8 },
      '#121020',
      [
        {
          id: 'crescent-supper',
          name: 'Maitre d’',
          col: 9,
          row: 7,
          color: COLORS.shop,
          lines: ['Maitre d’: We have a table, if you are eating.'],
          action: { kind: 'venue', venueId: 'crescent-supper' },
        },
        local('ch-diner-reg', 'Regular', 1, 4, [
          'Regular: Half this room plays for a living. The other half thinks it does.',
        ]),
      ],
      [{ col: 7, row: 9, toAreaId: 'ch-street', toCol: 8, toRow: 5, label: 'Out' }],
    ),
    'ch-club': area(
      'ch-club',
      'The Harbour Room',
      HARBOUR_ROOM,
      { col: 7, row: 8 },
      '#141024',
      [
        {
          id: 'crescent-club',
          name: 'Host',
          col: 9,
          row: 7,
          color: COLORS.shop,
          lines: ['Host: Members and guests. Which are you?'],
          action: { kind: 'venue', venueId: 'crescent-club' },
        },
        {
          id: 'crescent-private',
          name: 'Back Room',
          col: 4,
          row: 1,
          art: 'none',
          color: COLORS.finale,
          lines: ['An unmarked door. It is not for everyone.'],
          action: { kind: 'table', tableId: 'crescent-private' },
        },
        local('ch-club-barman', 'Barman', 12, 2, [
          'Barman: Members sign the book. Guests do not sign anything.',
        ]),
      ],
      [{ col: 7, row: 9, toAreaId: 'ch-street', toCol: 3, toRow: 5, label: 'Out' }],
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
      ROAD_PALM_CAY,
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
        { col: 13, row: 4, toAreaId: 'pc-casino', toCol: 10, toRow: 11, label: 'Cay Room' },
        { col: 9, row: 15, toAreaId: 'pc-boutique', toCol: 6, toRow: 7, label: 'Boutique' },
        { col: 23, row: 15, toAreaId: 'pc-grill', toCol: 7, toRow: 8, label: 'Shoreline Grill' },
        { col: 5, row: 4, toAreaId: 'pc-marina', toCol: 7, toRow: 8, label: 'Marina Motors' },
      ],
      { west: { toAreaId: 'road-palmcay', offset: -3 }, east: { toAreaId: 'road-mesa', offset: -3 } },
    ),
    'pc-casino': area(
      'pc-casino',
      'The Cay Room',
      CAY_FLOOR,
      { col: 10, row: 11 },
      '#0c1a1c',
      [
        {
          id: 'cay-dealer',
          name: 'Dealer',
          col: 4,
          row: 4,
          color: COLORS.dealer,
          lines: ['Dealer: Ten-twenty-five. Twenty-five hundred to sit.'],
          action: { kind: 'table', tableId: 'palmcay-high' },
        },
        {
          id: 'tourist-dealer',
          name: 'Tourist Table',
          col: 15,
          row: 4,
          color: COLORS.dealer,
          lines: [
            'Dealer: Same stake, softer game. Bernard is celebrating something.',
            'Dealer: He has been celebrating for two days.',
          ],
          action: { kind: 'table', tableId: 'palmcay-tourist' },
        },
        {
          id: 'pc-slots',
          name: 'Slot Machines',
          col: 9,
          row: 2,
          color: COLORS.flavor,
          art: 'none',
          lines: ['The machines here pay out in sunburn and optimism.'],
          action: { kind: 'slots' },
        },
        local('pc-barman', 'Barman', 3, 2, [
          'Barman: Something with an umbrella in it? Everyone has something with an umbrella in it.',
        ]),
      ],
      [{ col: 10, row: 12, toAreaId: 'pc-street', toCol: 13, toRow: 5, label: 'Out' }],
    ),
    'pc-boutique': area(
      'pc-boutique',
      'Cay Boutique',
      BOUTIQUE,
      { col: 6, row: 7 },
      '#0c1a1c',
      [
        {
          id: 'boutique',
          name: 'Clerk',
          col: 6,
          row: 2,
          color: COLORS.shop,
          art: 'person',
          lines: ['Clerk: Linen, mostly. It photographs well.'],
          action: { kind: 'shop', shopId: 'palmcay-boutique' },
        },
      ],
      [{ col: 6, row: 8, toAreaId: 'pc-street', toCol: 9, toRow: 16, label: 'Out' }],
    ),
    'pc-grill': area(
      'pc-grill',
      'Shoreline Grill',
      SHORELINE_GRILL,
      { col: 7, row: 8 },
      '#0c1a1c',
      [
        {
          id: 'palmcay-grill',
          name: 'Waiter',
          col: 12,
          row: 2,
          color: COLORS.shop,
          lines: ['Waiter: Caught this morning. Priced accordingly.'],
          action: { kind: 'venue', venueId: 'palmcay-grill' },
        },
      ],
      [{ col: 7, row: 9, toAreaId: 'pc-street', toCol: 23, toRow: 16, label: 'Out' }],
    ),
    'pc-marina': area(
      'pc-marina',
      'Marina Motors',
      MARINA_MOTORS,
      { col: 7, row: 8 },
      '#0c1a1c',
      [
        {
          id: 'marina',
          name: 'Dealer',
          col: 7,
          row: 2,
          color: COLORS.shop,
          art: 'person',
          lines: ['Dealer: Everything on this lot is a bad financial decision.'],
          action: { kind: 'shop', shopId: 'palmcay-marina' },
        },
      ],
      [{ col: 7, row: 9, toAreaId: 'pc-street', toCol: 5, toRow: 5, label: 'Out' }],
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
      ROAD_MESA,
      { col: 14, row: 6 },
      '#1a1020',
      [
        {
          ...local('road-nm-billboard', 'Billboard', 6, 10, [
            'NEON MESA — WHERE THE NIGHT STARTS. A man is painting over the last word.',
          ]),
          // The billboard is a stamp; this is where you stand between its legs to read it.
          art: 'none',
          labelled: false,
        },
        local('road-nm-walker', 'Man with a Suitcase', 21, 4, [
          'Man: I am leaving. Do not ask me how it went.',
        ]),
      ],
      [],
      { west: { toAreaId: 'pc-street', offset: 3 }, east: { toAreaId: 'nm-street', offset: 5 } },
    ),
    'nm-street': area(
      'nm-street',
      'The Mesa Strip',
      NEON_MESA_TOWN,
      { col: 9, row: 7 },
      '#1a1020',
      [
        {
          id: 'nm-shuttle',
          name: 'Airport Shuttle',
          col: 28,
          row: 15,
          color: COLORS.travel,
          art: 'sign',
          lines: ['International departures, one gate.'],
          action: { kind: 'travel' },
        },
        {
          id: 'hal-mesa',
          name: 'Hal',
          col: 4,
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
          col: 27,
          row: 8,
          color: COLORS.sponsor,
          lines: SPONSORS.consortium.pitch,
          action: { kind: 'sponsor', sponsorId: 'consortium' },
        },
        {
          id: 'fixer',
          name: 'Fixer',
          col: 6,
          row: 15,
          color: COLORS.person,
          lines: MISSIONS['mesa-read'].brief,
          action: { kind: 'mission', missionId: 'mesa-read' },
        },
        local('nm-tout', 'Tout', 24, 15, [
          'Tout: High roller room is up the stairs. They will look at your shoes.',
          'Tout: I am serious about the shoes.',
        ]),
      ],
      [
        { col: 6, row: 5, toAreaId: 'nm-casino', toCol: 11, toRow: 12, label: 'Mesa Casino' },
        { col: 14, row: 5, toAreaId: 'nm-luxury', toCol: 6, toRow: 7, label: 'Mesa Luxury' },
        { col: 20, row: 5, toAreaId: 'nm-motors', toCol: 7, toRow: 8, label: 'Mesa Motors' },
        { col: 27, row: 5, toAreaId: 'nm-club', toCol: 7, toRow: 8, label: 'Ultraviolet' },
      ],
      { west: { toAreaId: 'road-mesa', offset: -5 }, east: { toAreaId: 'road-lumina', offset: -5 } },
    ),
    'nm-casino': area(
      'nm-casino',
      'Mesa Casino',
      MESA_FLOOR,
      { col: 11, row: 12 },
      '#1a1020',
      [
        {
          id: 'mesa-dealer',
          name: 'Dealer',
          col: 4,
          row: 5,
          color: COLORS.dealer,
          lines: ['Dealer: Twenty-five fifty. Ten thousand to sit.'],
          action: { kind: 'table', tableId: 'mesa-main' },
        },
        {
          id: 'mesa-headsup',
          name: 'Heads-Up Table',
          col: 5,
          row: 9,
          color: COLORS.dealer,
          lines: ['Dealer: Fifty-hundred, one-on-one. Lorna plays here most nights.'],
          action: { kind: 'table', tableId: 'mesa-headsup' },
        },
        {
          id: 'highroller',
          name: 'High Roller Room',
          col: 11,
          row: 2,
          color: COLORS.finale,
          lines: [
            'Host: Hundred-two hundred inside. Forty thousand to sit.',
            'Host: And we do have a dress code.',
          ],
          action: { kind: 'table', tableId: 'mesa-highroller' },
        },
        {
          id: 'nm-slots',
          name: 'Slot Machines',
          col: 17,
          row: 2,
          color: COLORS.flavor,
          art: 'none',
          lines: ['Five machines and a jackpot board that has not stopped counting since the place opened.'],
          action: { kind: 'slots' },
        },
        {
          id: 'nm-craps',
          name: 'Craps Table',
          col: 17,
          row: 6,
          color: COLORS.flavor,
          art: 'none',
          lines: ['Purple felt and a stickman who has seen everything twice.'],
          action: { kind: 'craps' },
        },
      ],
      [{ col: 11, row: 13, toAreaId: 'nm-street', toCol: 6, toRow: 6, label: 'Out' }],
    ),
    'nm-luxury': area(
      'nm-luxury',
      'Mesa Luxury',
      MESA_LUXURY,
      { col: 6, row: 7 },
      '#1a1020',
      [
        {
          id: 'mesa-luxury',
          name: 'Clerk',
          col: 6,
          row: 2,
          color: COLORS.shop,
          art: 'person',
          lines: ['Clerk: Everything here is about being let in somewhere.'],
          action: { kind: 'shop', shopId: 'mesa-luxury' },
        },
      ],
      [{ col: 6, row: 8, toAreaId: 'nm-street', toCol: 14, toRow: 6, label: 'Out' }],
    ),
    'nm-motors': area(
      'nm-motors',
      'Mesa Motors',
      MESA_MOTORS,
      { col: 7, row: 8 },
      '#1a1020',
      [
        {
          id: 'mesa-motors',
          name: 'Salesman',
          col: 7,
          row: 2,
          color: COLORS.shop,
          art: 'person',
          lines: ['Salesman: You look like a man who is tired of buses.'],
          action: { kind: 'shop', shopId: 'mesa-motors' },
        },
      ],
      [{ col: 7, row: 9, toAreaId: 'nm-street', toCol: 20, toRow: 6, label: 'Out' }],
    ),
    'nm-club': area(
      'nm-club',
      'Ultraviolet',
      ULTRAVIOLET,
      { col: 7, row: 8 },
      '#1d1030',
      [
        {
          id: 'mesa-club',
          name: 'Door Host',
          col: 9,
          row: 7,
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
        local('nm-club-bartender', 'Bartender', 12, 2, [
          'Bartender: The music is louder than you think it is. Point at what you want.',
        ]),
      ],
      [{ col: 7, row: 9, toAreaId: 'nm-street', toCol: 27, toRow: 6, label: 'Out' }],
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
      ROAD_LUMINA,
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
      { west: { toAreaId: 'nm-street', offset: 5 }, east: { toAreaId: 'pl-street', offset: 4 } },
    ),
    'pl-street': area(
      'pl-street',
      'Lumina Waterfront',
      PORTO_LUMINA_TOWN,
      { col: 15, row: 9 },
      '#141020',
      [
        {
          id: 'pl-terminal',
          name: 'Terminal',
          col: 28,
          row: 14,
          color: COLORS.travel,
          art: 'sign',
          lines: ['Everywhere you have ever played, listed on one board.'],
          action: { kind: 'travel' },
        },
        {
          id: 'wen',
          name: 'Madame Wen',
          col: 4,
          row: 9,
          color: COLORS.sponsor,
          lines: SPONSORS.wen.pitch,
          action: { kind: 'sponsor', sponsorId: 'wen' },
        },
        local('pl-photographer', 'Photographer', 27, 9, [
          'Photographer: I shoot the winners. I have shot Ms. Okonkwo four years running.',
          'Photographer: Give me a reason to shoot somebody else.',
        ]),
      ],
      [
        { col: 15, row: 5, toAreaId: 'pl-casino', toCol: 10, toRow: 10, label: 'Casino' },
        { col: 25, row: 5, toAreaId: 'pl-atelier', toCol: 6, toRow: 7, label: 'Atelier' },
        { col: 5, row: 5, toAreaId: 'pl-lift', toCol: 6, toRow: 7, label: 'Penthouse Lift' },
      ],
      { west: { toAreaId: 'road-lumina', offset: -4 } },
    ),
    'pl-casino': area(
      'pl-casino',
      'Porto Lumina Casino',
      LUMINA_FLOOR,
      { col: 10, row: 10 },
      '#141020',
      [
        {
          id: 'lumina-dealer',
          name: 'Dealer',
          col: 4,
          row: 4,
          color: COLORS.dealer,
          lines: ['Dealer: Hundred-two hundred. Thirty thousand to sit.'],
          action: { kind: 'table', tableId: 'lumina-nosebleed' },
        },
        {
          id: 'nadia',
          name: 'Nadia Okonkwo',
          col: 15,
          row: 5,
          color: COLORS.finale,
          lines: [
            'Nadia: I know what you have been doing. Small rooms, then bigger ones.',
            'Nadia: One match. A hundred and twenty thousand each, winner takes it.',
            'Nadia: The penthouse upstairs comes with it. I have lived there four years.',
          ],
          action: { kind: 'table', tableId: 'lumina-finale' },
        },
        local('pl-barman', 'Sommelier', 16, 2, [
          'Sommelier: The house pours for the players at the far table. You will know when you are one.',
        ]),
      ],
      [{ col: 10, row: 11, toAreaId: 'pl-street', toCol: 15, toRow: 6, label: 'Out' }],
    ),
    'pl-atelier': area(
      'pl-atelier',
      'Lumina Atelier',
      ATELIER,
      { col: 6, row: 7 },
      '#141020',
      [
        {
          id: 'atelier',
          name: 'Tailor',
          col: 6,
          row: 2,
          color: COLORS.shop,
          art: 'person',
          lines: ['Tailor: For the match, of course. Everyone comes here first.'],
          action: { kind: 'shop', shopId: 'lumina-atelier' },
        },
      ],
      [{ col: 6, row: 8, toAreaId: 'pl-street', toCol: 25, toRow: 6, label: 'Out' }],
    ),
    'pl-lift': area(
      'pl-lift',
      'Penthouse Lift',
      PENTHOUSE_LOBBY,
      { col: 6, row: 7 },
      '#141020',
      [
        {
          id: 'penthouse',
          name: 'Attendant',
          col: 8,
          row: 2,
          color: COLORS.finale,
          lines: ['The attendant watches the lift, then you, and waits.'],
          action: { kind: 'penthouse' },
        },
        local('pl-concierge', 'Concierge', 3, 2, [
          'Concierge: The lift goes to one floor. The floor belongs to one person.',
        ]),
      ],
      [{ col: 6, row: 8, toAreaId: 'pl-street', toCol: 5, toRow: 6, label: 'Out' }],
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
export const AREA_STAMPS: Record<string, PlacedStamp[]> = {
  'sc-floor': [
    { stampId: 'slot-bank-western', col: 1, row: 1 },
    { stampId: 'slot-bank-western', col: 5, row: 1 },
    { stampId: 'bar-brass', col: 9, row: 1 },
    { stampId: 'cashier-cage', col: 14, row: 1 },
    { stampId: 'cactus', col: 1, row: 4 },
    { stampId: 'cactus', col: 18, row: 4 },
    { stampId: 'poker-table-6', col: 2, row: 4 },
    { stampId: 'craps-table', col: 13, row: 4 },
    { stampId: 'pillar-wood', col: 8, row: 5 },
    { stampId: 'pillar-wood', col: 11, row: 5 },
    { stampId: 'slot-bank', col: 1, row: 8 },
    { stampId: 'slot-bank-western', col: 15, row: 8 },
  ],
  'rb-boat': [
    { stampId: 'slot-bank-brass', col: 1, row: 1 },
    { stampId: 'bar-brass', col: 15, row: 1 },
    { stampId: 'porthole', col: 5, row: 1 },
    { stampId: 'painting-ship', col: 7, row: 1 },
    { stampId: 'porthole', col: 10, row: 1 },
    { stampId: 'clock', col: 12, row: 1 },
    { stampId: 'porthole', col: 14, row: 1 },
    { stampId: 'life-ring', col: 20, row: 1 },
    { stampId: 'poker-table-brass', col: 8, row: 4 },
    { stampId: 'pillar-brass', col: 5, row: 5 },
    { stampId: 'pillar-brass', col: 15, row: 5 },
    { stampId: 'slot-bank-brass', col: 1, row: 7 },
    { stampId: 'slot-bank-brass', col: 17, row: 7 },
  ],
  'ch-cardroom': [
    { stampId: 'painting-portrait', col: 2, row: 1 },
    { stampId: 'clock', col: 5, row: 1 },
    { stampId: 'cashier-cage', col: 8, row: 1 },
    { stampId: 'painting-ship', col: 15, row: 1 },
    { stampId: 'fern', col: 1, row: 2 },
    { stampId: 'fern', col: 18, row: 2 },
    { stampId: 'poker-table-baize', col: 2, row: 4 },
    { stampId: 'poker-table-baize', col: 13, row: 4 },
    { stampId: 'pillar-green', col: 8, row: 5 },
    { stampId: 'pillar-green', col: 11, row: 5 },
    { stampId: 'poker-table-baize', col: 2, row: 8 },
    { stampId: 'poker-table-baize-4', col: 14, row: 8 },
    { stampId: 'light-pool', col: 3, row: 5 },
    { stampId: 'light-pool', col: 14, row: 5 },
    { stampId: 'light-pool', col: 3, row: 9 },
    { stampId: 'light-pool', col: 14, row: 8 },
  ],
  'pc-casino': [
    { stampId: 'bar-tiki', col: 1, row: 1 },
    { stampId: 'palm', col: 6, row: 1 },
    { stampId: 'slot-bank-island', col: 8, row: 1 },
    { stampId: 'palm', col: 12, row: 1 },
    { stampId: 'slot-bank-island', col: 14, row: 1 },
    { stampId: 'poker-table-teal', col: 2, row: 4 },
    { stampId: 'poker-table-teal', col: 13, row: 4 },
    { stampId: 'slot-bank-reef', col: 8, row: 5 },
    { stampId: 'slot-bank-reef', col: 2, row: 9 },
    { stampId: 'slot-bank-reef', col: 14, row: 9 },
    { stampId: 'fern', col: 1, row: 11 },
    { stampId: 'fern', col: 18, row: 11 },
  ],
  'nm-casino': [
    { stampId: 'slot-bank-jackpot', col: 1, row: 1 },
    { stampId: 'neon-vip', col: 8, row: 1 },
    { stampId: 'door-vip', col: 11, row: 1 },
    { stampId: 'velvet-rope', col: 8, row: 2 },
    { stampId: 'velvet-rope', col: 12, row: 2 },
    { stampId: 'slot-bank-neon', col: 16, row: 1 },
    { stampId: 'poker-table-neon', col: 2, row: 5 },
    { stampId: 'roulette', col: 9, row: 5 },
    { stampId: 'craps-table-neon', col: 15, row: 5 },
    { stampId: 'poker-table-neon-4', col: 3, row: 9 },
    { stampId: 'pillar-neon', col: 9, row: 9 },
    { stampId: 'pillar-neon', col: 12, row: 9 },
    { stampId: 'slot-bank-neon', col: 15, row: 9 },
  ],
  'pl-casino': [
    { stampId: 'slot-bank-gold', col: 1, row: 1 },
    { stampId: 'slot-bank-ivory', col: 5, row: 1 },
    { stampId: 'painting-portrait', col: 9, row: 1 },
    { stampId: 'painting-landscape', col: 11, row: 1 },
    { stampId: 'bar-marble', col: 14, row: 1 },
    { stampId: 'poker-table-royal', col: 2, row: 4 },
    { stampId: 'roulette', col: 3, row: 8 },
    { stampId: 'poker-table-royal-4', col: 13, row: 5 },
    { stampId: 'pillar-marble', col: 8, row: 5 },
    { stampId: 'pillar-marble', col: 11, row: 5 },
    { stampId: 'velvet-rope', col: 11, row: 9 },
    { stampId: 'velvet-rope', col: 16, row: 9 },
    { stampId: 'palm', col: 1, row: 9 },
    { stampId: 'fern', col: 18, row: 10 },
    { stampId: 'light-pool', col: 3, row: 4 },
    { stampId: 'light-pool', col: 13, row: 5 },
  ],
  'ch-club': [
    { stampId: 'bookshelf-dark', col: 1, row: 1 },
    { stampId: 'door-back-room', col: 4, row: 1 },
    { stampId: 'fireplace', col: 6, row: 1 },
    { stampId: 'bar-marble', col: 10, row: 1 },
    { stampId: 'rug-green', col: 2, row: 5 },
    { stampId: 'sofa-leather', col: 2, row: 5 },
    { stampId: 'rug-red', col: 10, row: 5 },
    { stampId: 'sofa-leather', col: 10, row: 5 },
    { stampId: 'fern', col: 1, row: 8 },
    { stampId: 'fern', col: 14, row: 8 },
  ],
  'ch-supper': [
    { stampId: 'painting-portrait', col: 2, row: 1 },
    { stampId: 'painting-landscape', col: 6, row: 1 },
    { stampId: 'piano', col: 12, row: 1 },
    { stampId: 'dining-table', col: 1, row: 3 },
    { stampId: 'dining-table', col: 5, row: 3 },
    { stampId: 'dining-table', col: 1, row: 6 },
    { stampId: 'dining-table', col: 10, row: 5 },
    { stampId: 'fern', col: 14, row: 8 },
  ],
  'nm-club': [
    { stampId: 'door-vip', col: 2, row: 1 },
    { stampId: 'neon-cocktails', col: 3, row: 1 },
    { stampId: 'dj-booth', col: 6, row: 1 },
    { stampId: 'bar-neon', col: 10, row: 1 },
    { stampId: 'dance-floor', col: 6, row: 4 },
    { stampId: 'sofa-velvet', col: 1, row: 6 },
    { stampId: 'sofa-velvet', col: 12, row: 6 },
  ],
  bodega: [
    { stampId: 'shelves-groceries', col: 1, row: 1 },
    { stampId: 'counter-till', col: 4, row: 1 },
    { stampId: 'neon-open', col: 7, row: 1 },
    { stampId: 'cooler', col: 10, row: 1 },
    { stampId: 'gondola-groceries', col: 1, row: 4 },
    { stampId: 'gondola-groceries', col: 9, row: 4 },
  ],
  laundromat: [
    { stampId: 'dryer-stack', col: 1, row: 1 },
    { stampId: 'prices-laundry', col: 6, row: 1 },
    { stampId: 'dryer-stack', col: 9, row: 1 },
    { stampId: 'folding-table', col: 1, row: 5 },
    { stampId: 'washer-row', col: 9, row: 5 },
  ],
  diner: [
    { stampId: 'jukebox', col: 1, row: 1 },
    { stampId: 'neon-open', col: 2, row: 1 },
    { stampId: 'diner-counter', col: 6, row: 1 },
    { stampId: 'clock', col: 11, row: 1 },
    { stampId: 'menu-diner', col: 13, row: 1 },
    { stampId: 'booth', col: 1, row: 4 },
    { stampId: 'booth', col: 1, row: 7 },
    { stampId: 'booth', col: 13, row: 4 },
    { stampId: 'booth', col: 13, row: 7 },
  ],
  'sc-gift': [
    { stampId: 'shelves-souvenirs', col: 1, row: 1 },
    { stampId: 'counter-glass', col: 5, row: 1 },
    { stampId: 'painting-horse', col: 9, row: 1 },
    { stampId: 'shelves-souvenirs', col: 11, row: 1 },
    { stampId: 'rack-blankets', col: 2, row: 4 },
    { stampId: 'rack-blankets', col: 10, row: 4 },
    { stampId: 'rug-woven', col: 4, row: 4 },
    { stampId: 'cactus', col: 1, row: 6 },
    { stampId: 'pottery-table', col: 2, row: 7 },
    { stampId: 'pottery-table', col: 10, row: 7 },
  ],
  'rb-diner': [
    { stampId: 'window-sea', col: 1, row: 1 },
    { stampId: 'trophy-fish', col: 4, row: 1 },
    { stampId: 'window-sea', col: 6, row: 1 },
    { stampId: 'diner-counter', col: 10, row: 1 },
    { stampId: 'table-chairs', col: 2, row: 4 },
    { stampId: 'table-chairs', col: 6, row: 4 },
    { stampId: 'table-chairs', col: 2, row: 7 },
    { stampId: 'table-chairs', col: 6, row: 7 },
  ],
  'rb-outfitters': [
    { stampId: 'shelves-outdoor', col: 1, row: 1 },
    { stampId: 'life-ring', col: 3, row: 1 },
    { stampId: 'counter-till', col: 5, row: 1 },
    { stampId: 'trophy-fish', col: 8, row: 1 },
    { stampId: 'shelves-outdoor', col: 11, row: 1 },
    { stampId: 'rack-outdoor', col: 2, row: 5 },
    { stampId: 'rack-outdoor', col: 10, row: 5 },
    { stampId: 'rug-green', col: 5, row: 4 },
  ],
  'ch-menswear': [
    { stampId: 'shelves-shoes', col: 1, row: 1 },
    { stampId: 'counter-glass', col: 5, row: 1 },
    { stampId: 'mannequin-suit', col: 9, row: 1 },
    { stampId: 'mannequin-navy', col: 10, row: 1 },
    { stampId: 'mirror-stand', col: 12, row: 1 },
    { stampId: 'rug-red', col: 5, row: 4 },
    { stampId: 'rack-suits', col: 1, row: 5 },
    { stampId: 'rack-suits', col: 11, row: 5 },
  ],
  'ch-autorow': [
    { stampId: 'window-sky', col: 1, row: 1 },
    { stampId: 'painting-abstract', col: 4, row: 1 },
    { stampId: 'counter-glass', col: 6, row: 1 },
    { stampId: 'window-sky', col: 13, row: 1 },
    { stampId: 'car-red', col: 2, row: 4 },
    { stampId: 'car-silver', col: 11, row: 4 },
    { stampId: 'fern', col: 1, row: 2 },
    { stampId: 'fern', col: 14, row: 2 },
    { stampId: 'sofa-leather', col: 2, row: 7 },
    { stampId: 'fern', col: 14, row: 7 },
  ],
  'pc-boutique': [
    { stampId: 'palm', col: 1, row: 1 },
    { stampId: 'window-sea', col: 2, row: 1 },
    { stampId: 'counter-glass', col: 5, row: 1 },
    { stampId: 'mannequin-gown', col: 9, row: 1 },
    { stampId: 'mirror-stand', col: 12, row: 1 },
    { stampId: 'rack-linen', col: 1, row: 5 },
    { stampId: 'rack-linen', col: 11, row: 5 },
    { stampId: 'rug-blue', col: 5, row: 4 },
  ],
  'pc-grill': [
    { stampId: 'menu-grill', col: 1, row: 1 },
    { stampId: 'trophy-fish', col: 4, row: 1 },
    { stampId: 'life-ring', col: 7, row: 1 },
    { stampId: 'bar-tiki', col: 10, row: 1 },
    { stampId: 'dining-table-cane', col: 1, row: 3 },
    { stampId: 'dining-table-cane', col: 5, row: 3 },
    { stampId: 'dining-table-cane', col: 1, row: 6 },
    { stampId: 'dining-table-cane', col: 5, row: 6 },
    { stampId: 'palm', col: 14, row: 6 },
  ],
  'pc-marina': [
    { stampId: 'window-sea', col: 1, row: 1 },
    { stampId: 'life-ring', col: 4, row: 1 },
    { stampId: 'counter-glass', col: 6, row: 1 },
    { stampId: 'window-sea', col: 12, row: 1 },
    { stampId: 'speedboat', col: 1, row: 4 },
    { stampId: 'car-yellow', col: 11, row: 4 },
  ],
  'nm-luxury': [
    { stampId: 'neon-vip', col: 1, row: 1 },
    { stampId: 'counter-glass', col: 5, row: 1 },
    { stampId: 'mannequin-gown', col: 9, row: 1 },
    { stampId: 'mirror-stand', col: 12, row: 1 },
    { stampId: 'rack-gowns', col: 1, row: 5 },
    { stampId: 'velvet-bench', col: 10, row: 5 },
  ],
  'nm-motors': [
    { stampId: 'window-night', col: 1, row: 1 },
    { stampId: 'counter-glass', col: 6, row: 1 },
    { stampId: 'neon-open', col: 10, row: 1 },
    { stampId: 'window-night', col: 13, row: 1 },
    { stampId: 'car-yellow', col: 2, row: 4 },
    { stampId: 'car-red', col: 11, row: 4 },
    { stampId: 'fern', col: 1, row: 2 },
    { stampId: 'fern', col: 14, row: 2 },
    { stampId: 'sofa-velvet', col: 11, row: 7 },
    { stampId: 'fern', col: 1, row: 7 },
  ],
  'pl-atelier': [
    { stampId: 'mannequin-gown', col: 1, row: 1 },
    { stampId: 'mannequin-suit', col: 2, row: 1 },
    { stampId: 'counter-concierge', col: 5, row: 1 },
    { stampId: 'painting-portrait', col: 9, row: 1 },
    { stampId: 'mirror-stand', col: 12, row: 1 },
    { stampId: 'rack-gowns', col: 1, row: 5 },
    { stampId: 'velvet-bench', col: 10, row: 5 },
  ],
  'pl-lift': [
    { stampId: 'palm', col: 1, row: 1 },
    { stampId: 'counter-concierge', col: 2, row: 1 },
    { stampId: 'lift-doors', col: 6, row: 1 },
    { stampId: 'painting-landscape', col: 9, row: 1 },
    { stampId: 'palm', col: 12, row: 1 },
    { stampId: 'rug-red', col: 5, row: 4 },
    { stampId: 'velvet-bench', col: 2, row: 6 },
    { stampId: 'velvet-bench', col: 10, row: 6 },
  ],
  home: [
    { stampId: 'kitchenette', col: 1, row: 1 },
    { stampId: 'window-brick', col: 4, row: 1 },
    { stampId: 'radiator', col: 7, row: 1 },
    { stampId: 'bookshelf', col: 8, row: 1 },
    { stampId: 'bed', col: 10, row: 2 },
    { stampId: 'rug-blue', col: 4, row: 4 },
    { stampId: 'table-chairs', col: 2, row: 4 },
    { stampId: 'tv', col: 8, row: 4 },
  ],
  'marcus-house': [
    { stampId: 'bookshelf-dark', col: 1, row: 1 },
    { stampId: 'window-garden', col: 4, row: 1 },
    { stampId: 'painting-horse', col: 8, row: 1 },
    { stampId: 'kitchenette', col: 12, row: 1 },
    { stampId: 'rug-red', col: 6, row: 4 },
    { stampId: 'card-table', col: 5, row: 4 },
    { stampId: 'tv', col: 1, row: 5 },
    { stampId: 'sofa', col: 11, row: 8 },
    { stampId: 'fern', col: 14, row: 5 },
  ],
  basin: [
    { stampId: 'bakery-basin', col: 1, row: 0 },
    { stampId: 'house-basin-a', col: 10, row: 0 },
    { stampId: 'pawn-basin', col: 17, row: 0 },
    { stampId: 'tenement-basin', col: 22, row: 0 },
    { stampId: 'checks-basin', col: 1, row: 14 },
    { stampId: 'house-basin-b', col: 9, row: 14 },
    { stampId: 'bingo-basin', col: 16, row: 14 },
    { stampId: 'lamp-iron', col: 4, row: 6 },
    { stampId: 'lamp-iron', col: 12, row: 6 },
    { stampId: 'lamp-iron', col: 20, row: 6 },
    { stampId: 'tree-street', col: 8, row: 6 },
    { stampId: 'tree-street', col: 24, row: 6 },
    { stampId: 'lamp-iron', col: 8, row: 9 },
    { stampId: 'lamp-iron', col: 16, row: 9 },
    { stampId: 'lamp-iron', col: 24, row: 9 },
    { stampId: 'tree-street', col: 12, row: 9 },
    { stampId: 'bench-park', col: 9, row: 5 },
    { stampId: 'bench-park', col: 13, row: 12 },
    { stampId: 'mailbox', col: 17, row: 4 },
    { stampId: 'hydrant', col: 2, row: 7 },
    { stampId: 'news-boxes', col: 26, row: 4 },
    { stampId: 'noticeboard', col: 15, row: 4 },
    { stampId: 'bin', col: 26, row: 13 },
    { stampId: 'phone-box', col: 1, row: 12 },
    { stampId: 'flowerbed-brick-2', col: 4, row: 13 },
    { stampId: 'parked-car-blue-w', col: 14, row: 8 },
    { stampId: 'parked-car-red-e', col: 19, row: 9 },
  ],
  seventh: [
    { stampId: 'patels', col: 1, row: 0 },
    { stampId: 'barber-seventh', col: 9, row: 0 },
    { stampId: 'laundromat', col: 14, row: 0 },
    { stampId: 'hotel-seventh', col: 22, row: 0 },
    { stampId: 'diner-blueplate', col: 1, row: 14 },
    { stampId: 'donuts-seventh', col: 10, row: 14 },
    { stampId: 'garage-seventh', col: 18, row: 14 },
    { stampId: 'bench-park', col: 4, row: 12 },
    { stampId: 'flowerbed-brick-2', col: 21, row: 12 },
    { stampId: 'lamp-iron', col: 6, row: 6 },
    { stampId: 'lamp-iron', col: 14, row: 6 },
    { stampId: 'lamp-iron', col: 23, row: 6 },
    { stampId: 'lamp-iron', col: 10, row: 9 },
    { stampId: 'lamp-iron', col: 18, row: 9 },
    { stampId: 'lamp-iron', col: 26, row: 9 },
    { stampId: 'tree-street', col: 2, row: 9 },
    { stampId: 'mailbox', col: 11, row: 4 },
    { stampId: 'news-boxes', col: 19, row: 4 },
    { stampId: 'bin', col: 26, row: 4 },
    { stampId: 'hydrant', col: 7, row: 4 },
    { stampId: 'noticeboard', col: 2, row: 13 },
    { stampId: 'bin', col: 16, row: 13 },
    { stampId: 'phone-box', col: 25, row: 12 },
    { stampId: 'bin', col: 12, row: 17 },
    { stampId: 'hydrant', col: 9, row: 17 },
    { stampId: 'parked-car-white-e', col: 11, row: 9 },
    { stampId: 'parked-car-green-w', col: 17, row: 8 },
  ],
  eastgate: [
    { stampId: 'house-eastgate-a', col: 1, row: 0 },
    { stampId: 'house-marcus', col: 9, row: 0 },
    { stampId: 'house-eastgate-b', col: 16, row: 0 },
    { stampId: 'cottage-eastgate', col: 1, row: 10 },
    { stampId: 'lockup-eastgate', col: 17, row: 10 },
    { stampId: 'bench-park', col: 11, row: 8 },
    { stampId: 'lamp-iron', col: 7, row: 4 },
    { stampId: 'lamp-iron', col: 14, row: 4 },
    { stampId: 'lamp-iron', col: 13, row: 9 },
    { stampId: 'fence-picket-4', col: 2, row: 6 },
    { stampId: 'fence-picket-4', col: 16, row: 6 },
    { stampId: 'bush', col: 1, row: 8 },
    { stampId: 'bush-flowering', col: 20, row: 8 },
    { stampId: 'mailbox', col: 9, row: 4 },
    { stampId: 'bin', col: 16, row: 12 },
  ],
  depot: [
    { stampId: 'bus-shelter', col: 3, row: 1 },
    { stampId: 'bin', col: 16, row: 2 },
    { stampId: 'bench-park', col: 4, row: 3 },
    { stampId: 'flowerbed-brick-2', col: 4, row: 10 },
    { stampId: 'flowerbed-brick-2', col: 14, row: 10 },
    { stampId: 'lamp-iron', col: 8, row: 4 },
    { stampId: 'lamp-iron', col: 15, row: 4 },
    { stampId: 'lamp-iron', col: 11, row: 7 },
    { stampId: 'parked-car-yellow-e', col: 6, row: 11 },
    { stampId: 'parked-car-silver-w', col: 10, row: 11 },
    { stampId: 'hydrant', col: 18, row: 5 },
    { stampId: 'noticeboard', col: 13, row: 2 },
  ],
  'sc-street': [
    { stampId: 'hotel-silvercreek-w', col: 3, row: 1 },
    { stampId: 'casino-silvercreek', col: 10, row: 0 },
    { stampId: 'hotel-silvercreek-e', col: 23, row: 1 },
    { stampId: 'giftshop-silvercreek', col: 7, row: 14 },
    { stampId: 'motel-silvercreek', col: 20, row: 14 },
    { stampId: 'flowerbed-adobe-2', col: 5, row: 6 },
    { stampId: 'flowerbed-adobe-2', col: 23, row: 6 },
    { stampId: 'bench-rustic', col: 4, row: 13 },
    { stampId: 'bench-rustic', col: 25, row: 13 },
    { stampId: 'lamp-western', col: 7, row: 7 },
    { stampId: 'lamp-western', col: 13, row: 7 },
    { stampId: 'lamp-western', col: 19, row: 7 },
    { stampId: 'lamp-western', col: 25, row: 7 },
    { stampId: 'lamp-western', col: 8, row: 10 },
    { stampId: 'lamp-western', col: 22, row: 10 },
    { stampId: 'parked-car-red-e', col: 3, row: 7 },
    { stampId: 'parked-car-teal-w', col: 26, row: 7 },
    { stampId: 'saguaro', col: 1, row: 4 },
    { stampId: 'saguaro', col: 30, row: 4 },
    { stampId: 'saguaro', col: 2, row: 15 },
    { stampId: 'saguaro', col: 28, row: 15 },
    { stampId: 'rocks-red-2', col: 14, row: 16 },
    { stampId: 'rocks-red', col: 5, row: 17 },
    { stampId: 'barrel-cactus', col: 18, row: 15 },
    { stampId: 'barrel-cactus', col: 26, row: 16 },
    { stampId: 'noticeboard', col: 29, row: 12 },
  ],
  'rb-street': [
    { stampId: 'riverboat', col: 2, row: 1 },
    { stampId: 'diner-riverbend', col: 3, row: 13 },
    { stampId: 'outfitters-riverbend', col: 23, row: 13 },
    { stampId: 'bench-rustic', col: 13, row: 13 },
    { stampId: 'flowerbed-timber-2', col: 17, row: 13 },
    { stampId: 'bollard-mooring', col: 13, row: 5 },
    { stampId: 'bollard-mooring', col: 20, row: 5 },
    { stampId: 'bollard-mooring', col: 26, row: 5 },
    { stampId: 'lamp-quay', col: 6, row: 5 },
    { stampId: 'lamp-quay', col: 15, row: 5 },
    { stampId: 'lamp-quay', col: 22, row: 5 },
    { stampId: 'lamp-quay', col: 11, row: 10 },
    { stampId: 'lamp-quay', col: 24, row: 10 },
    { stampId: 'fence-picket-5', col: 8, row: 16 },
    { stampId: 'fence-picket-6', col: 16, row: 16 },
    { stampId: 'bench-teak', col: 2, row: 6 },
    { stampId: 'noticeboard', col: 29, row: 12 },
    { stampId: 'parked-car-green-e', col: 3, row: 10 },
    { stampId: 'parked-car-white-w', col: 20, row: 9 },
    { stampId: 'bush', col: 2, row: 12 },
    { stampId: 'bush-flowering', col: 29, row: 13 },
  ],
  'ch-street': [
    { stampId: 'club-harbor', col: 1, row: 0 },
    { stampId: 'supper-harbor', col: 6, row: 0 },
    { stampId: 'cardroom-harbor', col: 11, row: 0 },
    { stampId: 'menswear-harbor', col: 18, row: 0 },
    { stampId: 'autorow-harbor', col: 23, row: 0 },
    { stampId: 'flowerbed-granite-2', col: 5, row: 5 },
    { stampId: 'flowerbed-granite-2', col: 27, row: 5 },
    { stampId: 'bench-teak', col: 10, row: 13 },
    { stampId: 'bench-teak', col: 20, row: 13 },
    { stampId: 'fence-rope-4', col: 2, row: 14 },
    { stampId: 'bollard-mooring', col: 7, row: 14 },
    { stampId: 'fence-rope-4', col: 9, row: 14 },
    { stampId: 'fence-rope-4', col: 17, row: 14 },
    { stampId: 'bollard-mooring', col: 22, row: 14 },
    { stampId: 'fence-rope-5', col: 24, row: 14 },
    { stampId: 'lamp-harbor', col: 4, row: 7 },
    { stampId: 'lamp-harbor', col: 11, row: 7 },
    { stampId: 'lamp-harbor', col: 18, row: 7 },
    { stampId: 'lamp-harbor', col: 27, row: 7 },
    { stampId: 'lamp-harbor', col: 8, row: 10 },
    { stampId: 'lamp-harbor', col: 17, row: 10 },
    { stampId: 'lamp-harbor', col: 23, row: 10 },
    { stampId: 'mailbox', col: 18, row: 5 },
    { stampId: 'news-boxes', col: 16, row: 5 },
    { stampId: 'phone-box', col: 1, row: 5 },
    { stampId: 'bin', col: 23, row: 5 },
    { stampId: 'parked-car-black-w', col: 19, row: 9 },
    { stampId: 'parked-car-silver-e', col: 3, row: 10 },
  ],
  'pc-street': [
    { stampId: 'marina-palmcay', col: 2, row: 1 },
    { stampId: 'casino-palmcay', col: 9, row: 0 },
    { stampId: 'hotel-palmcay', col: 20, row: 1 },
    { stampId: 'boutique-palmcay', col: 7, row: 13 },
    { stampId: 'grill-palmcay', col: 21, row: 13 },
    { stampId: 'flowerbed-coral-2', col: 12, row: 13 },
    { stampId: 'flowerbed-coral-2', col: 18, row: 13 },
    { stampId: 'lamp-tiki', col: 7, row: 7 },
    { stampId: 'lamp-tiki', col: 19, row: 7 },
    { stampId: 'lamp-tiki', col: 25, row: 7 },
    { stampId: 'lamp-tiki', col: 9, row: 10 },
    { stampId: 'lamp-tiki', col: 17, row: 10 },
    { stampId: 'lamp-tiki', col: 24, row: 10 },
    { stampId: 'palm-tall', col: 9, row: 5 },
    { stampId: 'palm-tall', col: 22, row: 5 },
    { stampId: 'palm-tall', col: 2, row: 14 },
    { stampId: 'palm-tall', col: 29, row: 14 },
    { stampId: 'fence-rope-4', col: 2, row: 16 },
    { stampId: 'fence-rope-4', col: 25, row: 16 },
    { stampId: 'fence-rope-3', col: 1, row: 5 },
    { stampId: 'bench-teak', col: 15, row: 13 },
    { stampId: 'bush-flowering', col: 18, row: 5 },
    { stampId: 'parked-car-teal-e', col: 3, row: 10 },
    { stampId: 'parked-car-white-w', col: 20, row: 9 },
  ],
  'nm-street': [
    { stampId: 'casino-mesa', col: 1, row: 0 },
    { stampId: 'luxury-mesa', col: 12, row: 0 },
    { stampId: 'motors-mesa', col: 17, row: 0 },
    { stampId: 'club-mesa', col: 24, row: 0 },
    { stampId: 'tower-mesa-a', col: 1, row: 17 },
    { stampId: 'garage-mesa', col: 11, row: 17 },
    { stampId: 'tower-mesa-b', col: 21, row: 17 },
    { stampId: 'fountain-mesa', col: 12, row: 7 },
    { stampId: 'planter-chrome-2', col: 3, row: 7 },
    { stampId: 'planter-chrome-2', col: 26, row: 7 },
    { stampId: 'bench-chrome', col: 3, row: 16 },
    { stampId: 'bench-chrome', col: 26, row: 16 },
    { stampId: 'lamp-chrome', col: 2, row: 9 },
    { stampId: 'lamp-chrome', col: 10, row: 9 },
    { stampId: 'lamp-chrome', col: 21, row: 9 },
    { stampId: 'lamp-chrome', col: 29, row: 9 },
    { stampId: 'lamp-chrome', col: 2, row: 13 },
    { stampId: 'lamp-chrome', col: 10, row: 13 },
    { stampId: 'lamp-chrome', col: 21, row: 13 },
    { stampId: 'lamp-chrome', col: 29, row: 13 },
    { stampId: 'palm-planter', col: 10, row: 7 },
    { stampId: 'palm-planter', col: 19, row: 7 },
    { stampId: 'palm-planter', col: 12, row: 15 },
    { stampId: 'palm-planter', col: 19, row: 15 },
    { stampId: 'fence-chrome-3', col: 23, row: 6 },
    { stampId: 'bollard', col: 4, row: 10 },
    { stampId: 'bollard', col: 8, row: 10 },
    { stampId: 'parked-car-black-w', col: 13, row: 11 },
    { stampId: 'parked-car-white-e', col: 24, row: 13 },
  ],
  'pl-street': [
    { stampId: 'tower-lumina', col: 3, row: 0 },
    { stampId: 'casino-lumina', col: 10, row: 0 },
    { stampId: 'atelier-lumina', col: 22, row: 0 },
    { stampId: 'hotel-lumina', col: 3, row: 15 },
    { stampId: 'fountain-lumina', col: 9, row: 7 },
    { stampId: 'planter-marble-2', col: 3, row: 7 },
    { stampId: 'planter-marble-2', col: 27, row: 7 },
    { stampId: 'bench-stone', col: 3, row: 14 },
    { stampId: 'cypress-pot', col: 27, row: 13 },
    { stampId: 'lamp-gilded', col: 2, row: 8 },
    { stampId: 'lamp-gilded', col: 8, row: 8 },
    { stampId: 'lamp-gilded', col: 23, row: 8 },
    { stampId: 'lamp-gilded', col: 29, row: 8 },
    { stampId: 'lamp-gilded', col: 6, row: 11 },
    { stampId: 'lamp-gilded', col: 12, row: 11 },
    { stampId: 'lamp-gilded', col: 18, row: 11 },
    { stampId: 'lamp-gilded', col: 25, row: 11 },
    { stampId: 'cypress-pot', col: 1, row: 13 },
    { stampId: 'cypress-pot', col: 30, row: 13 },
    { stampId: 'bench-stone', col: 8, row: 13 },
    { stampId: 'bench-stone', col: 22, row: 13 },
    { stampId: 'bollard', col: 13, row: 9 },
    { stampId: 'bollard', col: 17, row: 9 },
    { stampId: 'parked-car-black-e', col: 3, row: 11 },
    { stampId: 'parked-car-silver-w', col: 24, row: 10 },
  ],
  'road-silvercreek': [
    { stampId: 'tree-street', col: 3, row: 1 },
    { stampId: 'tree-street', col: 8, row: 1 },
    { stampId: 'tree-street', col: 4, row: 10 },
    { stampId: 'fence-picket-4', col: 1, row: 9 },
    { stampId: 'bush', col: 7, row: 12 },
    { stampId: 'lamp-iron', col: 3, row: 4 },
    { stampId: 'lamp-iron', col: 9, row: 7 },
    { stampId: 'lamp-western', col: 22, row: 4 },
    { stampId: 'lamp-western', col: 18, row: 7 },
    { stampId: 'saguaro', col: 15, row: 1 },
    { stampId: 'saguaro', col: 24, row: 2 },
    { stampId: 'saguaro', col: 14, row: 10 },
    { stampId: 'saguaro', col: 25, row: 10 },
    { stampId: 'rocks-red-2', col: 19, row: 2 },
    { stampId: 'rocks-red', col: 12, row: 12 },
    { stampId: 'barrel-cactus', col: 23, row: 12 },
    { stampId: 'barrel-cactus', col: 17, row: 3 },
  ],
  'road-riverbend': [
    { stampId: 'saguaro', col: 2, row: 1 },
    { stampId: 'rocks-red', col: 5, row: 3 },
    { stampId: 'barrel-cactus', col: 3, row: 11 },
    { stampId: 'rocks-red-2', col: 6, row: 12 },
    { stampId: 'lamp-western', col: 4, row: 4 },
    { stampId: 'lamp-quay', col: 21, row: 4 },
    { stampId: 'lamp-quay', col: 12, row: 7 },
    { stampId: 'bench-rustic', col: 12, row: 2 },
    { stampId: 'flowerbed-timber-2', col: 14, row: 1 },
    { stampId: 'fence-picket-4', col: 10, row: 12 },
    { stampId: 'bush', col: 9, row: 3 },
  ],
  'road-crescent': [
    { stampId: 'fence-picket-4', col: 2, row: 2 },
    { stampId: 'bush', col: 3, row: 11 },
    { stampId: 'hedge-2', col: 6, row: 12 },
    { stampId: 'lamp-quay', col: 3, row: 4 },
    { stampId: 'lamp-quay', col: 6, row: 7 },
    { stampId: 'lamp-harbor', col: 18, row: 4 },
    { stampId: 'lamp-harbor', col: 24, row: 4 },
    { stampId: 'lamp-harbor', col: 15, row: 7 },
    { stampId: 'fence-rope-4', col: 15, row: 10 },
    { stampId: 'bollard-mooring', col: 23, row: 10 },
    { stampId: 'fence-rope-3', col: 24, row: 10 },
    { stampId: 'bench-teak', col: 19, row: 2 },
    { stampId: 'bin', col: 22, row: 3 },
  ],
  'road-palmcay': [
    { stampId: 'fence-rope-4', col: 1, row: 4 },
    { stampId: 'fence-rope-4', col: 11, row: 4 },
    { stampId: 'fence-rope-5', col: 2, row: 9 },
    { stampId: 'fence-rope-5', col: 10, row: 9 },
    { stampId: 'lamp-harbor', col: 7, row: 4 },
    { stampId: 'lamp-harbor', col: 6, row: 8 },
    { stampId: 'lamp-tiki', col: 17, row: 4 },
    { stampId: 'lamp-tiki', col: 23, row: 4 },
    { stampId: 'lamp-tiki', col: 16, row: 8 },
    { stampId: 'lamp-tiki', col: 22, row: 8 },
    { stampId: 'palm-tall', col: 22, row: 1 },
    { stampId: 'palm-tall', col: 25, row: 2 },
    { stampId: 'palm-tall', col: 24, row: 10 },
    { stampId: 'flowerbed-coral-2', col: 20, row: 3 },
    { stampId: 'bush-flowering', col: 26, row: 12 },
  ],
  'road-mesa': [
    { stampId: 'palm-tall', col: 2, row: 1 },
    { stampId: 'palm-tall', col: 3, row: 11 },
    { stampId: 'lamp-tiki', col: 3, row: 4 },
    { stampId: 'billboard-mesa', col: 5, row: 9 },
    { stampId: 'saguaro', col: 11, row: 2 },
    { stampId: 'saguaro', col: 17, row: 10 },
    { stampId: 'rocks-red-2', col: 14, row: 11 },
    { stampId: 'barrel-cactus', col: 9, row: 12 },
    { stampId: 'rocks-red', col: 15, row: 1 },
    { stampId: 'lamp-chrome', col: 23, row: 4 },
    { stampId: 'lamp-chrome', col: 24, row: 8 },
    { stampId: 'planter-chrome-2', col: 24, row: 1 },
    { stampId: 'palm-planter', col: 25, row: 10 },
  ],
  'road-lumina': [
    { stampId: 'lamp-chrome', col: 3, row: 4 },
    { stampId: 'rocks-red', col: 2, row: 2 },
    { stampId: 'saguaro', col: 5, row: 1 },
    { stampId: 'cypress-pot', col: 12, row: 3 },
    { stampId: 'hedge-3', col: 10, row: 11 },
    { stampId: 'lamp-gilded', col: 22, row: 4 },
    { stampId: 'lamp-gilded', col: 18, row: 8 },
    { stampId: 'planter-marble-2', col: 24, row: 1 },
    { stampId: 'cypress-pot', col: 20, row: 1 },
    { stampId: 'bench-stone', col: 22, row: 10 },
  ],
}

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
