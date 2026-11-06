import { isWalkable, parseMap } from '../overworld/tileRenderer'
import { FURNITURE } from '../overworld/tiles'
import { MISSIONS, SPONSORS } from './npcs'
import type { AreaDef, CityDef, PoiDef } from './types'
import { STAMPS, type PlacedStamp } from './stamps'
import type { CityId } from '../game/state'
import type { TimePeriod } from '../game/time'
import { errandPois } from './errands'
import { OUTSKIRTS, OUTSKIRTS_GAPS } from './outskirts'

/**
 * Towns are made of several areas joined by doors: a street you walk down, and
 * interiors you step into. Buildings are solid blocks with a door tile in the
 * facade — stepping onto the door takes you inside.
 */

/** What you are told at the end of the road: the way between towns is the bus. */
const HIGHWAY = 'Oop, just the highway over there.'

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
T:o::_________:::o:::++++++T
T::::_FFF_FFF_::::::+++++++T
T::::_________:o:o:::++++++T
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
T::++oo++++oo++++++++++oo++++o:T
T::FFF++++++++++++++++++++FFF::T
----+++o+++++o+++++o+++++o++----
===============zzz==============
===============zzz==============
----++++o+++++++++++++o+++++----
T::++++++++++++++++++++++++++o:T
T:o+oo++oo++++++++++++o++oo++::T
T::++++#####+######+#####++++::T
T::::::#####:######:#####F:::::T
T:oo:::##D##:######F#####:o:o::T
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
T:oo::o::::::**o:**:::o:o::::o:T
T::++++++++++++++++++++++++++::T
----++++++++o+++++++++++++++----
========zzz=========FFF=========
===FFF==zzz=====================
----+++++++o++++++++++++o+++----
T:o++++++++++++++++++++++++++o:T
T::######::::oo::oo::::######o:T
T::######::o::::::::::o######::T
T::##D###F::::::::::o::###D##::T
T:oo::::ooooo:::oooooo:::::::o:T
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
Too+++++++o+o++++++++o+++++++ooT
----o++++++o++++++o++++++++o----
=============zzz===FFF==========
===FFF=======zzz================
----++++o++++++++o+++++o++++----
T++++++++++++o+++++++++++++++++T
T+oo++++++oo++++++o+oo+o++++++FT
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
ToooT:::::::::::::oF::::::::T::T
T::::::::o:**::::::**:o::o:::ooT
To:::::::::::::::::::::::::::::T
----:::o:::::::::::o:::::o::----
============zzz=====FFF=========
===FFF======zzz=================
----:::::o:::::::o::::::o:::----
T::::::::::::::::::::::::::::::T
T:oo:T:#####oo:oo:oo:#####T:::oT
T:::::o#####:::::::::#####F::::T
T:o::::##D##o:::::::o##D##:::o:T
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
T+o++++++++++++++++++++ooo+++++T
T++oo+++++++~~~~~~++++++++oo++oT
T+++++++++o+~~~~~~+o+++++++++++T
To++++++++++o+++o++++++++++++++T
--o-o---o+o++++++++++o++-----o--
=====zzz=====FFF================
=====zzz========================
=====zzz================FFF=====
--o-----++o++++++++++o++-----o--
T++++++++++++++++++++++++++++++T
T++oo+++oo++o++oo++o+o+o++oo+++T
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
T+oo++++++++++++++++++++++++oo+T
T++oo++++~~~~~~~~~~~~~~++++oo++T
To+++++++~~~~~~~~~~~~~~+++++++oT
--o-----o++++o+++o+++++o-----o--
==============zzz=======FFF=====
===FFF========zzz===============
------o-++++o+++++o+++++-o------
T+++++++oooo+++++++oo+oo+++++++T
To+oo++++++++++o+++++++++++o++oT
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
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
^FwFwwwFFFFwwwwFFFFFwwwwwwFFFFFwwwFwF^
^F,,,,,FFFF,,,,FFFFF,,,,,,FFFFF,,,,,,^
^,,,F,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,^
^,,,F,,,,,,,,,,,,,,,,,,,,,,,,,,,,F,,,^
^,,,,,,,,,F,,,,,,,,,,,,,,,FF,,F,,,,,,^
^,,,F,,F,,F,,,FF,,F,,,FF,,,,,,F,,,,,,^
^F,,F,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,F^
^,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,^
^,,,,,,,,,,,,,F,,,,,,,,,,F,,,,,,,,,,,^
^,,FF,,,FFF,,,,,,F,,,,F,,,,,,FFF,,,,,^
^,,,,,,,FFF,,,,,,F,,,,F,,F,,,FFF,,,,,^
^,,,,,,,,,,,,,,,,,,,,,,,,F,,,,,,,,,,,^
^,,F,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,^
^,,F,,F,,,,,,,,F,,,,,,,,,,F,,F,,,,,,,^
^,,,,,F,,F,,F,,F,,FF,,,F,,F,,F,,F,,,,^
^,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,^
^F,,,,,,,,,,,,,,F,,,,,,,F,,,,,,,,,,,F^
^F,,F,,FFFF,,,,,F,,,,,,,F,,FFFF,F,,,,^
^,,,,,,FFFF,,,,,,,,,,,,,,,,FFFF,,,,,,^
^F,,,,,,,,,,,F,,,,,,,,,,,,,,,,,,,,,,,^
^^^^^^^^^^^^^^^^^^^^D^^^^^^^^^^^^^D^^^
`)

/**
 * The riverboat saloon: navy carpet, varnished cabin walls, portholes on the river side.
 * From the gangway you see columns 4 to 18 and the whole height of the room:
 * the purser's cage and the bar on the back wall, the bank, the table and the
 * wheel across the deck, and plants in the corners past the edges.
 */
const RIVERBOAT_FLOOR = parseMap(`
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
^FsssssssFFFFFssssssssssssssssFFFFFsssssF^
^FRRRRRRRFFFFFRRRRRRRRRRRRRRRRFFFFFRRRRRF^
^RRRRRRRRRRRRRRRRRRRRRRRRRRFRRRRRRRRRRRRR^
^RRFRRRRRRRRRRRRRRRRRRRRFRRFRRRRRRRRRRRRR^
^RRFRRFFFFRRRRFFFRRFFRRRFRRRRRRRRRRRRFRRR^
^RRRRRFFFFRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR^
^RRRRRRRRRRRRRRRRRRRRRRRRRRFFRRRFRRRRRRRR^
^RRFRRRRRRRRFRRRRRRRRRRRRRRRRRRRRRRFRRRRR^
^RRFRRRRRRRRRRRFFRRRRRRRRRRRRRRRRRRRRRRRR^
^RRRRRRRRRRRRRRRRRRRRFFFRRRFFRRRRRRRRRFRR^
^RRRRRRRRFFFFRRRRRRRRFFFRRRRRRRRRRRRRRFRR^
^RRRFRRRRFFFFRRRRRRRRRRRRRRRRRRRFFRRRRRRR^
^RRRFRRRRRRRRRRFFRRRRRRRRRRFRRRRRRRRRRRRR^
^RRRRRRRRRRRRRRRRRRRRRFFRRRFRRRRRRRRRFFRR^
^RRRRRRRFRRRRRRRRRRFRRRRFFFFRRRRRFRRRRRRR^
^RRRRRRRFRRFRRRFRRRRRRRRFFFFRRFRRFRRRRRRR^
^FRRRRRRRRRFRRRRRRRRRRRRRRRRRRRRRRRRRRRRR^
^RRRRFRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRRF^
^^^^^^^^^^^^^D^^^^^^^^D^^^^^^^^^^^^^^^^^^^
`)

/**
 * The Harbor card room: baize and mahogany, a quiet green carpet, lamps over three
 * tables and a wheel, no machines. From the door you see columns 3 to 17 and rows
 * 3 down, so the back wall — the fire, the shelves, the cage behind its ropes —
 * is above the view, whole when you walk up to it.
 */
const CARDROOM_FLOOR = parseMap(`
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
^FFgggggggFFFgggggFFFFFggggggggggggFF^
^FF;;;;;;;FFF;;;;;FFFFF;;;;;;;;;;;;FF^
^;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;^
^F;;;;;;;;;;;;FFF;;F;;;FFF;;FFF;;;;;F^
^;;;;FFF;;FF;;;;;;;F;;;;;;;;FFF;;F;;;^
^;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;^
^;;;;;;;;;;;;;F;;;;;;;;;;;;;;;;;;;;;;^
^;;F;;;;;;;;;;;;;;;;;;FFF;;;;;;;;;;;;^
^;;F;;;;;;;;;;;;;FFF;;;;;;;;;;;;;;;;;^
^;;;;;;;FFF;;;F;;FFF;;;;;;;;;FFF;;;;;^
^;;;F;;;FFF;;;;;;;;;;;;;;;;;;FFF;;;;;^
^F;;F;;;;;;;;;;;;;;;;;FFF;;;;;;;;;;;F^
^F;;;;;;;;;;;;;;;;;F;;FFF;;;;;;;;;;;F^
^;;;;;;;;;;;;;FFF;;;;;;;;;;;;;;;;;;;;^
^;;;FF;;;;;;;;;;;;;;;;;;;;;;;;;;F;;;;^
^;;;;;;;F;;;;;;;;;;F;;;;;;;;;F;;F;;;;^
^;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;^
^;;;;;;;;;;;;;;;;;;FF;;;;;;;;;;;;;;;;^
^;;;;F;F;;;;;;FF;;;;;;;;FF;;;F;;F;F;;^
^;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;^
^;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;F^
^F;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;^
^^^^^^^^^^^^^^^^^^^^D^^^^^^^^^^^^^D^^^
`)

/**
 * The Cay Room: bamboo walls, teal carpet, a tiki bar, palms between two long tables.
 * From the door you see columns 3 to 17 and rows 4 down: the tables, a bank
 * between them, the wheel, and a bank either side of the door. The bar, the cage
 * and the back bank are a walk up, past the top of the view.
 */
const CAY_FLOOR = parseMap(`
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
^FbbbbbFFFFbbbbFFFFFbbbbFbbbFFFFFbbbF^
^F'F'''FFFF''''FFFFF''''F'''FFFFF'''F^
^''''''''''''''''''''''''''''''''''''^
^''''''''''''''''''''''''FFF''''''FFF^
^'''''''''''''''''''''''''''''FF'''''^
^''''''''''''''''''''''''''''''''''''^
^F''FF'''F''''FFFF''FFFF''F''F''''''F^
^'''''''''''''FFFF''FFFF'''''F''F''''^
^''''''''''''''''''''''''''''''''''''^
^''FF'''''''''''''''''''FFFF'''''''''^
^'''''''''''''F'''''''''FFFF'''''''''^
^'''''''FFF'''F''''''''''''''FFF'''''^
^'''F'''FFF''''''FFFF''FF''''FFF'''''^
^F''''''''''''F''FFFF'''''''''''''''F^
^F''''''''''''F'''''''''''''''''''''F^
^''''''''''''''''''''''F'''''''''''''^
^'''F''FF''F'''''''''''''''''''''''''^
^'''''''''''''''''''''''''F''FF''FF''^
^''''''''''''''F'''''''''''''''''''''^
^''''''''''''''''''''''''''''''''''''^
^'''FF'F'''F''''''''FF'''F'''''''''''^
^''''''''''F'''''''''''''''''FFFF''''^
^F'''''''''''''''''''''''''''FFFF'''F^
^'''''''''''''FFF''''''''''''''''''''^
^^^^^^^^^^^D^^^^^^^^D^^^^^^^^^^^^^^^^^
`)

/** The Mesa Casino: near-black carpet with neon trim, neon walls, a progressive bank, the high-roller door roped off. */
const MESA_FLOOR = parseMap(`
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
^FFFFFFnnnnnnnnnnnnnnnnnnnnnnnnnnnnnFFFFF^
^FFFFFF!!!!!!!!!FFF!!!!!!FFF!!!!!!!!FFFFF^
^!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!^
^!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!^
^!!!!!F!!FFFFF!!!!!!!!!!!!!!!!FFF!!!!!!!!^
^!!F!!F!!FFFFF!!!F!!FFF!!!F!!!!!!!!!!!!!!^
^!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!FFF!!F^
^!!!!!!!FFFF!!!!F!!!!!!!!!!!!!!!!!!!!!!!!^
^!!!!!F!FFFF!!!!F!!!!!!!!F!!!!!!!!!!!!!!!^
^FFF!!!!!!!!!!!!!!!!!!!!!F!!!!!!!!!F!!!!!^
^FFF!!F!!!!!!!!!!!!!FF!!!!!!!!FF!!!!!!!!!^
^!!!!!F!!!FFF!!!F!!!!!!!!!!!!!!!!!!!!!F!!^
^!!!!!!!!!FFF!!!!!!!!!!!!F!!!!!!!!!!!!F!!^
^!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!^
^!!!F!!!!!!!!!!!F!!!!!!!F!!!!!!!!!F!!!!!!^
^!!!!!!F!!!!!F!!F!!!!F!!F!!!!FFF!!!!!F!!!^
^!!!!!!F!!F!!F!!!!!!!!!!!!!!!!!!!!!!!!!!!^
^!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!^
^FFF!!F!!!!!!!!!!F!!!!!!!!F!!!!!!!!!!F!!F^
^FFF!!F!!FFFFF!!!F!!FFF!!!F!!!!!!!!!!!!!F^
^!!!!!!!!FFFFF!!!!!!!!!!!!!!!!!FFF!!!!!!!^
^!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!FFF!!!F!!!^
^!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!^
^!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!^
^^^^^^^D^^^^^^^^^^^^^^D^^^^^^^^^^^^^^^^^^^
`)

/**
 * Porto Lumina: white marble, gold columns, chandelier light, a roped salon in burgundy
 * for the last game. The hall is forty tiles across, and the tournament fills the middle of it.
 */
const LUMINA_FLOOR = parseMap(`
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
^mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmm^
^FMFFFFFMMMFMMMFFFFFMMMMMMFFFFFMMMMMMFMMFFFFMMMMMMMFFFFMF^
^FMFFFFFMMMFMMMFFFFFMMMMMMFFFFFMMMMMMFMMFFFFMMMMFMMFFFFMF^
^MMMMMMMMMMMMMMMMMMMMMFMMMMMMMMMMFMMMMMMMMMMMMMMFMMMMMMMM^
^MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM^
^MMMMMMMMMMM&&&&&&&&&&F&&&&&&&&&&&&&&&&&&&&&&&MMMMMMMMMMM^
^MMMMMMMMMMF&&&&&&&&&&F&&&&&&&&&F&&&&&&&&&&F&&FMMFFMMFMMM^
^MMMFFFMMMMF&&&&FFF&&&&&&&FFF&&&&&&&FFF&&&&F&&FMMMMMMMMMM^
^MMMMMMMMMM&&&&&FFF&&&&&&&FFF&&&F&&&FFF&&&&&&&&MMMMMMMMMM^
^MMMMMMMMMM&&&&&&&&&&&F&&&&&&&&&F&&&&&&&&&&&&&&MMMMMMMMMM^
^FMMMMMMMFFFF&&&&&&&&&&&&&&&&&&&&&&&&&&&&&FF&&&MMMMMMMMMF^
^FMMFFFMMFFFF&&F&&&&&&&&&&&&&&&F&&F&&&&&&&&&F&&MMMFFMMMMF^
^MMMMMMMMMM&&&&F&&F&&FFFF&&&F&&F&&F&&F&&&&&&&&&MMMMMMMMMM^
^MMMMMMMMMM&&&&&&&&&&FFFF&&&&&&&&&&&&&&&&&F&&&&MMMMMMMMMM^
^MMMMMMMMMM&&&&&&&&&&&&&&&&&&&&&F&&&&&&&&&&&&&&F&MFMMMMMM^
^MMMMMMMMMM&&&&&&&&&&&&&&&&&&&&&F&&&&&&&&&&&&&&&&MFMMFMMM^
^MMMFFFMMMF&&&&&FFF&&&&&&&FFF&&&&&&&FFF&&&&&&&&MMMMMMMMMM^
^MMMMMMMMMM&&&&&FFF&&&&&&&FFF&&&F&&&FFF&&&F&&&&MMMMMMMMMM^
^MMMMMMMMMM&&&&&&&&&&&F&&&&&&&&&F&&&&&&&&&F&&&&MMMMMMMMMM^
^MMMMMMMMMM&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&F&&MMFFFMMMMM^
^FMMFFFMMMMF&&F&&&&&&&&F&&F&&&&&&&&F&&F&&&&&&&&MMFFFMMMMF^
^MMMMMMMMMMF&&F&&F&&F&&F&&F&&F&&F&&F&&F&&F&&&&&MMMMMMMMMM^
^MMMMMMMMMMM&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&FMMMMMMMMMM^
^MMMMMMMMMM&&&&&&&&&&&&&&&&&&&&&F&&&&&&&&&&&&&FMMMMMMMFMM^
^MMMMMMMMMM&&&&&&&&&&&F&&&&&&&&&F&&&&&&&&&&&&&&MMMMMMMFMM^
^MMFFFMMMMM&&&&&FFF&&&&&&&FFF&&&&&&&FFF&&&&&&&&MMFFFMMMMM^
^MMMMMMMMMF&&&&&FFF&&&&&&&FFF&&&&&&&FFF&&&&F&&&MMMMMMMMMM^
^MMMMMMMMMF&&&&&&&&&&&F&&&&&&&&&F&&&&&&&&&&F&&&MFMMMMMMMM^
^MMMMMMMMMM&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&MFMMMMMMMM^
^MMMMMMMMMM&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&MMMMMMFMMM^
^MMMMMMMMMMM&&&&&&&&&&&&&&&&M&&&&&&&&&&&&&&&&&&&&MMMMFMMM^
^FFFFFFFFFFFFFFFFFFFFFFFFFFF&FFFFFFFFFFFFFFFFFFFFFFFFFFFF^
^FFMMMMMMMMMMMMMMMMMMMMMMMMFMFMMMMMMMMMMMMMMMMMMMMMMMMMMM^
^MMMMFMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM^
^^^^^^^^^^^^^^^^^^^^^^^^^^^^D^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
`)

/** The Harbour Room: damask, a fire going, leather sofas, and a door at the back with nothing on it. */
const HARBOUR_ROOM = parseMap(`
^^^^^^^^^^^^^^^^
^FFdddFFFdFFFFF^
^FFHHFFFFHFFFFF^
^HHHHHHHHHHHHHH^
^HHHHHHHHHHHHHH^
^FFFFFHFFHFFFFH^
^HHHHHHHHHHHHHH^
^HHHHHHHHHHFFFH^
^FFFFHHHHHHFFFF^
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
^vvvFvvvFvvvv^
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
^QQQFQQQFQQQQ^
^^^^^^D^^^^^^^
`)

/** The Blue Plate: chequerboard floor, a counter with pie under glass, booths down both sides, a jukebox. */
const BLUE_PLATE = parseMap(`
^^^^^^^^^^^^^^^^
^FttttFFFFFtttt^
^FKKKKFFFFFKKKK^
^KKKKKKKKKKKKKK^
^FFKKKKKKKKKKFF^
^FFKFFKKKFFKKFF^
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

/** The Landing Diner: mint and cream lino, the river in the windows, a counter, four tables, booths and a jukebox. */
const LANDING_DINER = parseMap(`
^^^^^^^^^^^^^^^^
^sssssssssFFFFF^
^FGGGGGGGGFFFFF^
^GGGGGGGGGGGGGG^
^FFFGGFFGGFGGFF^
^GGGGGGGGGFGGFF^
^GGGGGGGGGGGGGG^
^GFFGFFGGGGGGFF^
^FGGGGGGGGGGGFF^
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
^FQQQFFFFFQQQQF^
^QQQQQQQQQQQQQQ^
^QFFFQQQQQQFFFQ^
^QFFFQQQQQQFFFQ^
^QQQQQQQQQQQQQQ^
^QFFFFQQQQQQFFF^
^FQQQQQQQQQQQQQ^
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
^BBBBBBBBBFBBBF^
^BFBBBFBBBBBBBF^
^BBBBBBBBBBBBBB^
^^^^^^^D^^^^^^^^
`)

/** Marina Motors: a speedboat on its trailer and a car beside it, the sea in the windows. */
const MARINA_MOTORS = parseMap(`
^^^^^^^^^^^^^^^^
^pppppFFFpppppp^
^FeeeFFFFeFFeeF^
^eeeeeeeeeeeeee^
^FFFFeeeeeeFFFe^
^FFFFeeeeeeFFFe^
^eeeeeeeeeeeeee^
^FeeeeeeeeeFFFF^
^FeeeeeeeeeeeeF^
^^^^^^^D^^^^^^^^
`)

/** Mesa Luxury: marble floor, neon walls, gowns on a rail and a watch under glass. */
const MESA_LUXURY = parseMap(`
^^^^^^^^^^^^^^
^nnnnFFFnFnnF^
^MMMMFFFMFMMF^
^MMFMMMMMMMMM^
^MMFMMMMMMMMM^
^FFMMMMMMMFFM^
^MMMMMMMMMMMM^
^MMMFMMMFMMMM^
^^^^^^D^^^^^^^
`)

/** Mesa Motors: a yellow car and a red one on turntables, the Strip in the windows. */
const MESA_MOTORS = parseMap(`
^^^^^^^^^^^^^^^^
^nnnnnFFFnnnnnn^
^FQQQFFFFFQQQQF^
^QQQQQQQQQQQQQQ^
^QFFFQQQQQQFFFQ^
^QFFFQQQQQQFFFQ^
^QQQQQQQQQQQQQQ^
^FFFFQQQQQQFFFF^
^QQQQQQQQQQQQQQ^
^^^^^^^D^^^^^^^^
`)

/** Lumina Atelier: marble walls, a burgundy carpet, gowns, a dummy in evening dress, a velvet bench. */
const ATELIER = parseMap(`
^^^^^^^^^^^^^^
^FFmmFFFmmmmF^
^FF&&FFF&&&&F^
^&&F&&&&&&&&&^
^&&F&&&&&&&&&^
^FF&&&&&&&FF&^
^&&&&&&&&&&&&^
^&&&F&&&F&&&&^
^^^^^^D^^^^^^^
`)

/** The penthouse lobby: marble, brass lift doors, a concierge, palms either side. */
const PENTHOUSE_LOBBY = parseMap(`
^^^^^^^^^^^^^^
^FFFFmmmmmmmF^
^FFFFMMMMMMFF^
^MMMMMMMMMMMM^
^FMMMMMMMMMMF^
^FMMMMMMMMMMF^
^FFFMMMMMMFFF^
^MMMMMMMMMMMM^
^^^^^^D^^^^^^^
`)

/** Floor 41, yours: parquet, the fire lit, the glass wall onto the harbour, a bed nobody makes. */
const PENTHOUSE_MAIN = parseMap(`
^^^^^^^^^^^^^^^^
^FFmmmFFFmmmmmm^
^FFHHHFFFHHHHHH^
^HHHHHHHHHHHHHH^
^HHHFHHHFHHHHHH^
^HHHHHHHHHHFFFH^
^HHHHFFFHHHHHHH^
^FFFHHHHHHHHHFH^
^FFHHHHFFHHHHHF^
^HHHHHHHHHHHHHF^
^^^^^^^^^^^^^^^^
`)

/** The gym: concrete, a row of treadmills, benches under the racks, a heavy bag. */
const PENTHOUSE_GYM = parseMap(`
^^^^^^^^^^^^^^^^
^pppppppppppppp^
^FFFeeFFeeeeeee^
^eeeeeeeeeeeeee^
^eFFeeeeeFFeeFe^
^eeeeeeeeeeeeee^
^eFFeeeeeeeeeFe^
^eeeeeeeeeeeeee^
^FeeeeeeeeeeeFe^
^eeeeeeeeeeeeee^
^^^^^^^^^^^^^^^^
`)

/** The pool, forty floors up: a long blue rectangle in white tile, loungers down the far side. */
const PENTHOUSE_POOL = parseMap(`
^^^^^^^^^^^^^^^^
^tttttttttttttt^
^FFQQQQQQQQQQFF^
^QQQQQQQQQQQQFF^
^QQ~~~~~~~~~QQQ^
^QQ~~~~~~~~~QQQ^
^QQ~~~~~~~~~QQQ^
^QQ~~~~~~~~~QQQ^
^QFFQQFFQQFFQQQ^
^FQQQQQQQQQQQFQ^
^^^^^^^^^^^^^^^^
`)

/** The workroom: a wall of books, two desks of charts, and a sofa to lose an argument on. */
const PENTHOUSE_WORK = parseMap(`
^^^^^^^^^^^^^^^^
^FFFFwwwwwwwwww^
^FFFF&&&&&&&&&&^
^&&&&&&&&&&&&&&^
^&&&&&FFF&FFF&&^
^&&&&&&&&&&&&&&^
^&FF&&&&&&&&&&&^
^&&&&&&&&&&&&&&^
^&&&&&&&FFF&&F&^
^F&&&&&&&&&&&&F^
^^^^^^^^^^^^^^^^
`)

/** Your one room: a kitchenette, a window onto a brick wall, a bed, a table with a note on it. */
const APARTMENT_ROOM = parseMap(`
^^^^^^^^^^^^^^^
^FFFhhhhFFhhhh^
^FFFWWWWFFFFFF^
^WWWWWWWWWFWWW^
^WFFWWWWFWWWWF^
^WWWWWWWWWWWWW^
^FWWWWWWWWWWWW^
^WWWWWWWWWWWFF^
^FFWWFWWWWWWWF^
^^^^^^D^^^^^^^^
`)

/** Marcus's front room: panelling, a kitchen at the back, and the card table out for Friday. */
const MARCUS_HOUSE = parseMap(`
^^^^^^^^^^^^^^^^
^FFwwwwwwwwwFFF^
^FFAAAAAAAAAFFF^
^AAAAAAAAAAAFFA^
^AAAAAAAAAAAAAA^
^FAAAAFFFAAAAAF^
^AAAAAAAAAAAAAA^
^FAAAAAAAAAAAAA^
^AAAAAAAAAFFFFF^
^FAAAFAAAAAAAAA^
^^^^^^^D^^^^^^^^
`)

/**
 * Opens a gap in the trees along the south of a road, where the path down to the
 * town's outskirts leaves it. Each takes the ground of the row above it, so the
 * gap reads as the road's own verge carrying on.
 */
function openSouth(map: ReturnType<typeof parseMap>, [from, to]: [number, number]) {
  const last = map.length - 1
  for (let col = from; col <= to; col++) map[last][col] = map[last - 1][col]
}
openSouth(ROAD_SILVER_CREEK, OUTSKIRTS_GAPS['sc-outskirts'])
openSouth(ROAD_RIVERBEND, OUTSKIRTS_GAPS['rb-outskirts'])
openSouth(ROAD_CRESCENT, OUTSKIRTS_GAPS['ch-outskirts'])
openSouth(ROAD_PALM_CAY, OUTSKIRTS_GAPS['pc-outskirts'])
openSouth(ROAD_MESA, OUTSKIRTS_GAPS['nm-outskirts'])
openSouth(ROAD_LUMINA, OUTSKIRTS_GAPS['pl-outskirts'])

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

/**
 * The private room behind a casino floor, with the town's boss at its one table.
 *
 * Every one is the same plan — a back wall, four plants and chairs in the
 * corners, a heads-up table in the middle — in the town's own walls and floor.
 * The door is shut until the player has won enough on the floor (`CASINO_GOALS`),
 * and the boss across the felt is the best player they have met so far.
 */
function bossRoom(o: {
  id: string
  name: string
  wall: string
  floor: string
  background: string
  tableId: string
  dealerLine: string
  /** Where the floor's door lets you out. */
  floorId: string
  floorDoor: { col: number; row: number }
}): AreaDef {
  const w = o.wall.repeat(12)
  const f = o.floor
  const row = (middle: string) => `^${middle}^`
  const open = f.repeat(12)
  const corners = `F${f.repeat(10)}F`
  const felt = `${f.repeat(5)}FF${f.repeat(5)}`
  const map = parseMap(
    [
      '^'.repeat(14),
      row(w),
      row(corners),
      row(open),
      row(open),
      row(felt),
      row(open),
      row(corners),
      row(open),
      '^'.repeat(7) + 'D' + '^'.repeat(6),
    ].join('\n'),
  )
  return area(
    o.id,
    o.name,
    map,
    { col: 7, row: 8 },
    o.background,
    [
      {
        id: `${o.id}-dealer`,
        name: 'Dealer',
        col: 7,
        row: 4,
        color: COLORS.dealer,
        lines: [o.dealerLine],
        action: { kind: 'table', tableId: o.tableId },
      },
    ],
    [{ col: 7, row: 9, toAreaId: o.floorId, toCol: o.floorDoor.col, toRow: o.floorDoor.row, label: 'Out' }],
  )
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

/** The hours of a street's walkers: most out in the afternoon, few at night. */
const DAY: TimePeriod[] = ['morning', 'afternoon', 'evening']
const MORNINGS: TimePeriod[] = ['morning', 'afternoon']
const NOON: TimePeriod[] = ['afternoon']
const LATE: TimePeriod[] = ['afternoon', 'evening']
const NIGHTS: TimePeriod[] = ['afternoon', 'evening', 'night']

/**
 * Somebody out walking the street: up and down a short beat (`PoiDef.patrol`),
 * from the first tile of `route` to each of the others and back, at their hours.
 */
function walker(
  id: string,
  name: string,
  route: Array<[col: number, row: number]>,
  hours: TimePeriod[],
  lines: string[],
  ...altLines: string[][]
): PoiDef {
  const [[col, row], ...turns] = route
  return { ...local(id, name, col, row, lines, ...altLines), patrol: turns.map(([c, r]) => ({ col: c, row: r })), hours }
}

function liftPanel(id: string, col: number, row: number): PoiDef {
  return {
    id,
    name: 'Lift',
    col,
    row,
    color: COLORS.finale,
    art: 'none',
    lines: ['Brass buttons: L, 38, 39, 40, 41.'],
    action: { kind: 'penthouse' },
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
      // Round the room, a warm dark rather than black: the edge of a lamp-lit flat.
      '#1e1612',
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
          // The rent is the first thing the run asks of you. Until the Friday game
          // is won it counts down (and `rent-day` lands on day ten); after it,
          // Marcus has said he will cover it, and `rent-receipt` is under the door
          // when you come home.
          requiresFlag: 'wonPokerNight',
          lockedLines: [
            'The window faces a brick wall about four feet away.',
            'Rent is due in nine days. You have been not thinking about it.',
          ],
          lines: [
            'The window faces a brick wall about four feet away.',
            'The rent is Marcus’s problem till you are back. He told the landlord so, loudly, on the stairs.',
          ],
          action: { kind: 'flavor' },
        },
        local('apartment-note', 'Note on the Table', 3, 4, [
          "Marcus's handwriting: GAME AT MINE. 8pm. BRING CASH.",
          'Underneath, smaller: the 14 bus, you know the one.',
        ]),
        {
          // Left on the stand by the door the morning of the game: the thing in
          // the flat that says go outside. Kept, afterwards.
          ...local('apartment-door-note', 'Note by the Door', 7, 8, [
            'Marcus’s note from the morning of the first game. SENT SOMEBODY. You kept it.',
          ]),
          requiresFlag: 'metDana',
          lockedLines: [
            'Propped by the door where you cannot miss it, in Marcus’s capitals: SENT SOMEBODY TO FETCH YOU. GO OUTSIDE AND LET THEM.',
            'Underneath, smaller: IT IS DANA FROM THE LAUNDROMAT. BE NICE. SHE WRITES THINGS DOWN.',
          ],
        },
      ],
      [{ col: 6, row: 9, toAreaId: 'basin', toCol: 5, toRow: 4, label: 'Outside' }],
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
        east: { toAreaId: 'road-silvercreek', blocked: HIGHWAY },
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
      // Dana sits in on the first night as herself (her schedule), not as a
      // fixture: a fixture was still at his table while she was up the ladder.
      // The card table itself is always there: once the first night is won, a
      // `home-game` beat deals you in whenever you like.
      [thing('home-game-table', 'Card table', 7, 6, ['The felt is out and the chairs are pulled up. Nobody has to win tonight.'])],
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
        {
          ...local('patel', 'Mr Patel', 5, 2, [
            'Mr Patel: Late again. Coffee is still hot, I make no promises about fresh.',
            'Mr Patel: Marcus bought two bags of ice and a deck of cards an hour ago.',
            'Mr Patel: Whatever you are all doing out there, do it quietly.',
          ]),
          role: 'clerk',
        },
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
      { west: { toAreaId: 'depot', offset: 0, blocked: HIGHWAY }, east: { toAreaId: 'sc-street', offset: 3 }, south: { toAreaId: 'sc-outskirts', offset: 0 } },
    ),
    'sc-outskirts': area(
      'sc-outskirts',
      'Dry Wash Frontage',
      OUTSKIRTS['sc-outskirts'].map,
      { col: 14, row: 1 },
      '#161018',
      errandPois('sc-outskirts'),
      [],
      { north: { toAreaId: 'road-silvercreek', offset: 0 } },
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
        // Out walking: most of them about in the afternoon, few at night.
        walker('sc-walk-rancher', 'Rancher', [[6, 7], [13, 7]], DAY, ['Rancher: Sold forty head this morning. Going to lose it by supper, the way my daddy did. Tradition.'], ['Rancher: Wind\'s from the east. Means nothing. I just like saying it.']),
        walker('sc-walk-prospector', 'Old Prospector', [[19, 7], [25, 7]], NOON, ['Prospector: There\'s silver in that creek yet. I\'ve been saying it fifty years. One of these days I\'ll go look.']),
        walker('sc-walk-tourist', 'Tourist with a Camera', [[3, 12], [14, 12]], MORNINGS, ['Tourist: Is this the real West? It has a gift shop, so I assume so.']),
        walker('sc-walk-dancer', 'Line Dancer', [[18, 12], [26, 12]], NIGHTS, ['Line Dancer: Lessons Thursdays at the motel. Mostly it\'s me and the manager. He\'s improving.']),
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
        { col: 16, row: 4, toAreaId: 'sc-floor', toCol: 20, toRow: 20, label: 'Casino' },
        { col: 9, row: 16, toAreaId: 'sc-gift', toCol: 6, toRow: 7, label: 'Gift Shop' },
      ],
      { west: { toAreaId: 'road-silvercreek', offset: -3 }, east: { toAreaId: 'road-riverbend', offset: -3, blocked: HIGHWAY } },
    ),
    'sc-floor': area(
      'sc-floor',
      'Silver Creek Casino',
      SILVER_CREEK_FLOOR,
      { col: 20, row: 20 },
      '#161018',
      [
        // Who meets you at the door.
        { ...local('sc-hatcheck', 'Hat Check', 14, 20, ['Hat Check: Hats on the hooks, guns in the box, manners at the door. One out of three ain’t bad.']), role: 'clerk' },
        { ...local('sc-floor-manager', 'Floor Manager', 21, 20, ['Floor Manager: Howdy. Cards at the back, dice on the right, slots wherever there is a wall. Lou don’t like trouble, and neither do I.']), role: 'suit' },
        {
          id: 'slots',
          name: 'Slot Row',
          col: 8,
          row: 2,
          color: COLORS.flavor,
          art: 'none',
          lines: ['Three reels, one lever, and terrible odds. Everyone knows it and plays anyway.'],
          action: { kind: 'slots' },
        },
        {
          id: 'craps',
          name: 'Craps Table',
          col: 30,
          row: 10,
          color: COLORS.flavor,
          art: 'none',
          lines: ['Shooter is coming out. The pass line is the only bet worth making here.'],
          action: { kind: 'craps' },
        },
        {
          id: 'pitboss',
          name: 'Pit Boss',
          col: 9,
          row: 9,
          color: COLORS.dealer,
          lines: [
            'Pit Boss: Low-stakes table has an open seat. Dollar-two blinds.',
            'Pit Boss: Sit down whenever you are ready.',
          ],
          action: { kind: 'table', tableId: 'silvercreek-low' },
        },
        local('sc-regular', 'Table Regular', 7, 11, [
          'Regular: Ray plays every hand he is dealt. Every single one.',
          'Regular: I have made more off Ray than I have off my job.',
        ]),
        local('sc-cashier', 'Cashier', 28, 2, [
          'Cashier: Chips for cash, cash for chips. The house keeps what falls between.',
        ]),
        local('sc-bartender', 'Bartender', 17, 2, [
          'Bartender: Coffee is free if you are playing. Whiskey is free if you are losing.',
          'Bartender: Ray has a tab. Ray has had a tab since 1994.',
        ]),
        // The Saturday-night regulars: somebody at every bank, the bar, the dice.
        local('sc-slotter', 'Slot Player', 2, 3, [
          'Slot Player: I’m not playing. I’m keeping it warm for my sister. She’s been in the ladies’ since Tuesday.',
        ]),
        local('sc-cowhand', 'Cowhand', 19, 3, [
          'Cowhand: The whiskey’s from Kentucky, he says. So’s he. Make of that what you will.',
        ]),
        local('sc-tourist', 'Tourist', 27, 11, [
          'Tourist: Is it bad that I don’t know which way the dice are meant to go?',
        ]),
        local('sc-retiree', 'Retiree', 11, 19, [
          'Retiree: Forty years on the railroad and this machine still owes me a pension.',
        ]),
        local('sc-waitress', 'Cocktail Waitress', 12, 12, [
          'Waitress: Coffee, whiskey, or the special? The special is coffee with whiskey in it.',
        ]),
      ],
      [
        { col: 20, row: 21, toAreaId: 'sc-street', toCol: 16, toRow: 5, label: 'Out' },
        { col: 34, row: 21, toAreaId: 'sc-private', toCol: 7, toRow: 8, label: 'Private Room', privateRoomOf: 'silverCreek' },
      ],
    ),
    'sc-private': bossRoom({
      id: 'sc-private',
      name: 'Lou’s Back Room',
      wall: 'w',
      floor: 'W',
      background: '#161018',
      tableId: 'silvercreek-boss',
      dealerLine: 'Dealer: One match. Five hundred each. Nobody leaves until one of you has all of it.',
      floorId: 'sc-floor',
      floorDoor: { col: 34, row: 20 },
    }),
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
      { west: { toAreaId: 'sc-street', offset: 3, blocked: HIGHWAY }, east: { toAreaId: 'rb-street', offset: 3 }, south: { toAreaId: 'rb-outskirts', offset: 0 } },
    ),
    'rb-outskirts': area(
      'rb-outskirts',
      'Muddy Bend',
      OUTSKIRTS['rb-outskirts'].map,
      { col: 15, row: 1 },
      '#0f1620',
      errandPois('rb-outskirts'),
      [],
      { north: { toAreaId: 'road-riverbend', offset: 0 } },
    ),
    'rb-street': area(
      'rb-street',
      'Riverbend Landing',
      RIVERBEND_TOWN,
      { col: 16, row: 7 },
      '#0f1620',
      [
        // Out walking: most of them about in the afternoon, few at night.
        walker('rb-walk-millhand', 'Mill Hand', [[11, 12], [18, 12]], DAY, ['Mill Hand: Shift change. Ten hours of sawdust and then the boat takes the rest.'], ['Mill Hand: Don\'t play the old man in the hat. He can\'t see the cards and he still wins.']),
        walker('rb-walk-basket', 'Woman with a Basket', [[12, 14], [21, 14]], NOON, ['Woman: Catfish, if the diner\'s buying. Eggs, if it isn\'t. Gossip either way.']),
        walker('rb-walk-boy', 'Kid with a Rod', [[10, 15], [19, 15]], MORNINGS, ['Kid: My uncle says the big one lives under the boat. He says that about everything.']),
        walker('rb-walk-clerk', 'Ferry Clerk', [[21, 12], [25, 12]], NIGHTS, ['Ferry Clerk: Last crossing\'s at ten. After that you swim, or you stay and lose.']),
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
        { col: 9, row: 5, toAreaId: 'rb-boat', toCol: 22, toRow: 18, label: 'Riverboat' },
        { col: 5, row: 15, toAreaId: 'rb-diner', toCol: 7, toRow: 8, label: 'Diner' },
        { col: 26, row: 15, toAreaId: 'rb-outfitters', toCol: 6, toRow: 7, label: 'Outfitters' },
      ],
      { west: { toAreaId: 'road-riverbend', offset: -3 }, east: { toAreaId: 'road-crescent', offset: -3, blocked: HIGHWAY } },
    ),
    'rb-boat': area(
      'rb-boat',
      'The Riverboat',
      RIVERBOAT_FLOOR,
      { col: 22, row: 18 },
      '#0f1620',
      [
        {
          id: 'riverboat-dealer',
          name: 'Dealer',
          col: 22,
          row: 9,
          color: COLORS.dealer,
          lines: ['Dealer: Two-five, three hundred to sit. Tiny has been here since noon.'],
          action: { kind: 'table', tableId: 'riverbend-mid' },
        },
        local('rb-tiny-watcher', 'Bartender', 32, 2, [
          'Bartender: Tiny tips like a man who does not know what money is.',
          'Bartender: Do not tell him I said that. Do not tell him anything, honestly.',
        ]),
        {
          id: 'rb-racebook',
          name: 'Racebook',
          col: 25,
          row: 16,
          color: COLORS.flavor,
          art: 'none',
          lines: ['A tote board bolted over the bar rail. The river is on the screen, and so, somehow, is a racecourse in Kentucky.'],
          action: { kind: 'horses' },
        },
        {
          id: 'rb-roulette',
          name: 'Roulette Table',
          col: 32,
          row: 12,
          color: COLORS.flavor,
          art: 'none',
          lines: ['A brass wheel bolted to the deck. The croupier says the river has never once affected the ball.'],
          action: { kind: 'roulette' },
        },
        {
          id: 'rb-slots',
          name: 'Slot Machines',
          col: 10,
          row: 12,
          color: COLORS.flavor,
          art: 'none',
          lines: ['Three brass-trimmed machines and one that only takes old quarters.'],
          action: { kind: 'slots' },
        },
        // A Saturday on the river: somebody at the purser's window, the bank, the wheel and the rail.
        local('rb-purser', 'Purser', 11, 2, [
          'Purser: Chips at the window, cash at the window. The river takes nothing. I take ID.',
        ]),
        local('rb-slotter', 'Slot Player', 13, 12, [
          'Slot Player: The one on the end only takes the old quarters. I brought a jar of them from home.',
        ]),
        local('rb-wheel', 'Roulette Player', 34, 12, [
          'Roulette Player: Black every spin since we left the landing. The boat is tied up, mind. We have not left anything.',
        ]),
        local('rb-barfly', 'Deckhand', 30, 3, [
          'Deckhand: I swab this deck at six. Till then I am a customer, and the customer is always thirsty.',
        ]),
        local('rb-farmer', 'Farmer', 25, 13, [
          'Farmer: My granddaddy lost the farm at this table. I am here to win back the porch.',
        ]),
        local('rb-widow', 'Widow', 11, 14, [
          'Widow: My husband loved this boat. He is not here because I am spending his money on it.',
        ]),
      ],
      [
        { col: 22, row: 19, toAreaId: 'rb-street', toCol: 9, toRow: 6, label: 'Ashore' },
        { col: 13, row: 19, toAreaId: 'rb-private', toCol: 7, toRow: 8, label: 'Captain’s Cabin', privateRoomOf: 'riverbend' },
      ],
    ),
    'rb-private': bossRoom({
      id: 'rb-private',
      name: 'The Captain’s Cabin',
      wall: 's',
      floor: 'B',
      background: '#101828',
      tableId: 'riverbend-boss',
      dealerLine: 'Dealer: Fifteen hundred each, one match. The Captain does not like to be kept waiting.',
      floorId: 'rb-boat',
      floorDoor: { col: 13, row: 18 },
    }),
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
        local('rb-diner-pilot', 'River Pilot', 13, 4, [
          'Pilot: Forty years on this river and the coffee has never once been hot.',
          'Pilot: The boat pays out on a Thursday. Do not ask me how I know.',
        ]),
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
      { west: { toAreaId: 'rb-street', offset: 3, blocked: HIGHWAY }, east: { toAreaId: 'ch-street', offset: 3 }, south: { toAreaId: 'ch-outskirts', offset: 0 } },
    ),
    'ch-outskirts': area(
      'ch-outskirts',
      'The Fish Pier',
      OUTSKIRTS['ch-outskirts'].map,
      { col: 10, row: 1 },
      '#121020',
      errandPois('ch-outskirts'),
      [],
      { north: { toAreaId: 'road-crescent', offset: 0 } },
    ),
    'ch-street': area(
      'ch-street',
      'Harbor Boulevard',
      CRESCENT_HARBOR_TOWN,
      { col: 15, row: 6 },
      '#121020',
      [
        // Out walking: most of them about in the afternoon, few at night.
        walker('ch-walk-dogs', 'Dog Walker', [[9, 7], [5, 7]], DAY, ['Dog Walker: They are not mine. I am paid. The small one bites, and he is the one they love.']),
        walker('ch-walk-shopper', 'Shopper', [[16, 7], [20, 7]], LATE, ['Shopper: The tailor wanted three fittings. I have had four. I am beginning to suspect the tailor.']),
        walker('ch-walk-sailor', 'Sailor on Leave', [[16, 12], [24, 12]], ['morning', 'afternoon', 'night'], ['Sailor: Six weeks at sea and the first thing I see is a card room. I\'m only human.']),
        walker('ch-walk-jogger', 'Jogger', [[26, 13], [29, 13]], MORNINGS, ['Jogger: Four times round the quay. It is not for my health. It is so I can say I did it.']),
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
          role: 'local',
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
        { col: 14, row: 4, toAreaId: 'ch-cardroom', toCol: 20, toRow: 22, label: 'Card Room' },
        { col: 20, row: 4, toAreaId: 'ch-menswear', toCol: 6, toRow: 7, label: 'Menswear' },
        { col: 25, row: 4, toAreaId: 'ch-autorow', toCol: 7, toRow: 8, label: 'Auto Row' },
        { col: 8, row: 4, toAreaId: 'ch-supper', toCol: 7, toRow: 8, label: 'Supper Club' },
        { col: 3, row: 4, toAreaId: 'ch-club', toCol: 7, toRow: 8, label: 'The Harbour Room' },
      ],
      { west: { toAreaId: 'road-crescent', offset: -3 }, east: { toAreaId: 'road-palmcay', offset: -3, blocked: HIGHWAY } },
    ),
    'ch-cardroom': area(
      'ch-cardroom',
      'Harbor Card Room',
      CARDROOM_FLOOR,
      { col: 20, row: 22 },
      '#121020',
      [
        {
          id: 'ch-roulette',
          name: 'Roulette Table',
          col: 24,
          row: 19,
          color: COLORS.flavor,
          art: 'none',
          lines: ['A wheel in mahogany. Bellamy\u2019s house allows it, which is the most that can be said for it.'],
          action: { kind: 'roulette' },
        },
        {
          id: 'harbor-dealer',
          name: 'Dealer',
          col: 9,
          row: 9,
          color: COLORS.dealer,
          lines: ['Dealer: Five-ten, thousand to sit. Hollis is in for his third buy-in.'],
          action: { kind: 'table', tableId: 'crescent-main' },
        },
        {
          id: 'crescent-headsup',
          name: 'Heads-Up Table',
          col: 15,
          row: 18,
          color: COLORS.dealer,
          lines: ['Dealer: One-on-one, five-ten. Vance has been waiting for someone to sit.'],
          action: { kind: 'table', tableId: 'crescent-headsup' },
        },
        {
          id: 'doorman',
          name: 'Doorman',
          col: 16,
          row: 21,
          color: COLORS.person,
          lines: MISSIONS['crescent-suit'].brief,
          action: { kind: 'mission', missionId: 'crescent-suit' },
        },
        local('ch-cashier', 'Cashier', 20, 2, [
          'Cashier: Thousand to sit at five-ten. We do not do credit. We do not do favours.',
        ]),
        // The members, at the rail and between the tables.
        local('ch-railbird', 'Railbird', 12, 10, [
          'Railbird: I have not played a hand here in eleven years. I have watched every one.',
        ]),
        local('ch-widow', 'Shipping Widow', 27, 11, [
          'Shipping Widow: My husband built half the boats in this harbour. I am playing the other half.',
        ]),
        local('ch-yachtsman', 'Yachtsman', 27, 19, [
          'Yachtsman: Named the boat after my wife. Lost the wife at this table. Kept the boat.',
        ]),
        {
          id: 'ch-waiter',
          name: 'Card-Room Waiter',
          col: 23,
          row: 17,
          color: COLORS.local,
          role: 'waiter',
          lines: ['Waiter: Brandy at the tables, tea at the fire. Mr. Bellamy takes neither while he is playing.'],
          action: { kind: 'flavor' },
        },
      ],
      [
        { col: 20, row: 23, toAreaId: 'ch-street', toCol: 14, toRow: 5, label: 'Out' },
        { col: 34, row: 23, toAreaId: 'ch-private', toCol: 7, toRow: 8, label: 'Private Room', privateRoomOf: 'crescentHarbor' },
      ],
    ),
    'ch-private': bossRoom({
      id: 'ch-private',
      name: 'Mr. Bellamy’s Study',
      wall: 'g',
      floor: 'W',
      background: '#10181a',
      tableId: 'crescent-boss',
      dealerLine: 'Dealer: Five thousand each. Mr. Bellamy will not be hurried, and neither should you.',
      floorId: 'ch-cardroom',
      floorDoor: { col: 34, row: 22 },
    }),
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
        {
          id: 'autorow-racer',
          name: 'Racer',
          col: 11,
          row: 6,
          color: COLORS.flavor,
          art: 'person',
          look: { hairStyle: 'spiky', garment: 'jacket', garmentColor: '#c43a3a' },
          lines: ['Racer: There’s a road down by the water that nobody’s using after dark.'],
          action: { kind: 'race', raceIds: ['harbor-dash', 'dockside-slip'] },
        },
        {
          id: 'autorow-garage',
          name: 'Mechanic',
          col: 3,
          row: 6,
          color: COLORS.shop,
          art: 'person',
          role: 'local',
          look: { garment: 'overalls', garmentColor: '#3a5a8a', hairStyle: 'buzz' },
          lines: ['Mechanic: Parts bolt onto whatever you drive. I don’t ask whose it is.'],
          action: { kind: 'shop', shopId: 'crescent-garage' },
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
      { west: { toAreaId: 'ch-street', offset: 3, blocked: HIGHWAY }, east: { toAreaId: 'pc-street', offset: 3 }, south: { toAreaId: 'pc-outskirts', offset: 0 } },
    ),
    'pc-outskirts': area(
      'pc-outskirts',
      'Lagoon Beach',
      OUTSKIRTS['pc-outskirts'].map,
      { col: 23, row: 1 },
      '#102028',
      errandPois('pc-outskirts'),
      [],
      { north: { toAreaId: 'road-palmcay', offset: 0 } },
    ),
    'pc-street': area(
      'pc-street',
      'Cay Promenade',
      PALM_CAY_TOWN,
      { col: 15, row: 6 },
      '#0c1a1c',
      [
        // Out walking: most of them about in the afternoon, few at night.
        walker('pc-walk-sunhat', 'Woman in a Sun Hat', [[16, 7], [26, 7]], DAY, ['Woman: The hotel gave us a room facing the car park. Facing the car park! On an island!']),
        walker('pc-walk-surfer', 'Kid with a Surfboard', [[2, 12], [11, 12]], MORNINGS, ['Kid: Waves are flat. Waves are always flat. I carry it so people think there are waves.']),
        walker('pc-walk-porter', 'Hotel Porter', [[16, 12], [26, 12]], NIGHTS, ['Porter: Cases off the ferry, cases on the ferry. In between, they lose everything they packed for.']),
        walker('pc-walk-icecream', 'Ice-Cream Seller', [[13, 14], [19, 14]], NOON, ['Ice-Cream Seller: Coconut, mango, or rum and raisin. The rum and raisin is mostly rum.']),
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
        {
          ...local('pc-lifeguard', 'Lifeguard', 15, 16, [
            'Lifeguard: Bernard has not left the tourist table in two days.',
            'Lifeguard: Someone should check on him. Someone with cards.',
          ]),
          look: { shirt: '#e03a3a', trousers: '#e03a3a', lower: 'shorts', sleeves: 'short', accessory: 'visor' },
        },
      ],
      [
        { col: 13, row: 4, toAreaId: 'pc-casino', toCol: 20, toRow: 24, label: 'Cay Room' },
        { col: 9, row: 15, toAreaId: 'pc-boutique', toCol: 6, toRow: 7, label: 'Boutique' },
        { col: 23, row: 15, toAreaId: 'pc-grill', toCol: 7, toRow: 8, label: 'Shoreline Grill' },
        { col: 5, row: 4, toAreaId: 'pc-marina', toCol: 7, toRow: 8, label: 'Marina Motors' },
      ],
      { west: { toAreaId: 'road-palmcay', offset: -3 }, east: { toAreaId: 'road-mesa', offset: -3, blocked: HIGHWAY } },
    ),
    'pc-casino': area(
      'pc-casino',
      'The Cay Room',
      CAY_FLOOR,
      { col: 20, row: 24 },
      '#0c1a1c',
      [
        // Who meets you at the door.
        { ...local('pc-coatcheck', 'Coat Check', 5, 22, ['Coat Check: Coats, hats, shopping. You would be amazed what people check in Palm Cay. Last week, a parrot.']), role: 'clerk' },
        { ...local('pc-floor-manager', 'Floor Manager', 21, 24, ['Floor Manager: Welcome to the Cay Room. Tables either side, the wheel ahead, the bar at the back. Sandals are fine. Bare feet are not.']), role: 'suit' },
        {
          id: 'cay-dealer',
          name: 'Dealer',
          col: 9,
          row: 11,
          color: COLORS.dealer,
          lines: ['Dealer: Ten-twenty-five. Twenty-five hundred to sit.'],
          action: { kind: 'table', tableId: 'palmcay-high' },
        },
        {
          id: 'tourist-dealer',
          name: 'Tourist Table',
          col: 30,
          row: 11,
          color: COLORS.dealer,
          lines: [
            'Dealer: Same stake, softer game. Bernard is celebrating something.',
            'Dealer: He has been celebrating for two days.',
          ],
          action: { kind: 'table', tableId: 'palmcay-tourist' },
        },
        {
          id: 'pc-racebook',
          name: 'Racebook',
          col: 25,
          row: 11,
          color: COLORS.flavor,
          art: 'none',
          lines: ['Six runners on a board under a ceiling fan. The clerk says the ponies are faster in the afternoon.'],
          action: { kind: 'horses' },
        },
        {
          id: 'pc-roulette',
          name: 'Roulette Table',
          col: 20,
          row: 21,
          color: COLORS.flavor,
          art: 'none',
          lines: ['A wheel under a ceiling fan. The ball lands slowly here, and the croupier prefers it that way.'],
          action: { kind: 'roulette' },
        },
        {
          id: 'pc-slots',
          name: 'Slot Machines',
          col: 18,
          row: 14,
          color: COLORS.flavor,
          art: 'none',
          lines: ['The machines here pay out in sunburn and optimism.'],
          action: { kind: 'slots' },
        },
        local('pc-barman', 'Barman', 17, 2, [
          'Barman: Something with an umbrella in it? Everyone has something with an umbrella in it.',
        ]),
        local('pc-cashier', 'Cashier', 30, 2, [
          'Cashier: Chips in shells, if you like. They are plastic. Everybody asks.',
        ]),
        // Linen and sunburn: the island's evening crowd round the wheel and the banks.
        local('pc-honeymooner', 'Honeymooner', 18, 21, [
          'Honeymooner: We said one spin for luck. That was the second night of the honeymoon. It is the ninth.',
        ]),
        local('pc-surfer', 'Surfer', 22, 20, [
          'Surfer: Flat out there today. In here the waves are all in my favour. Mostly. Sometimes.',
        ]),
        local('pc-retiree', 'Retiree', 17, 15, [
          'Retiree: I came for a fortnight in 1987. I keep meaning to go home and the machine keeps saying wait.',
        ]),
        local('pc-sunburn', 'Tourist', 32, 15, [
          'Tourist: Is it meant to be this red? The man at the pool said twenty minutes a side.',
        ]),
        {
          id: 'pc-waitress',
          name: 'Cocktail Waitress',
          col: 21,
          row: 14,
          color: COLORS.local,
          role: 'waiter',
          look: { lower: 'skirt', hairStyle: 'long' },
          lines: ['Waitress: Rum punch, rum punch, or the one with the pineapple. That is also rum punch.'],
          action: { kind: 'flavor' },
        },
      ],
      [
        { col: 20, row: 25, toAreaId: 'pc-street', toCol: 13, toRow: 5, label: 'Out' },
        { col: 11, row: 25, toAreaId: 'pc-private', toCol: 7, toRow: 8, label: 'Owner’s Table', privateRoomOf: 'palmCay' },
      ],
    ),
    'pc-private': bossRoom({
      id: 'pc-private',
      name: 'The Owner’s Table',
      wall: 'b',
      floor: "'",
      background: '#0f2226',
      tableId: 'palmcay-boss',
      dealerLine: 'Dealer: Fifteen thousand each. Miss Calloway is feeling generous. That should worry you.',
      floorId: 'pc-casino',
      floorDoor: { col: 11, row: 24 },
    }),
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
          role: 'suit',
          lines: ['Dealer: Everything on this lot is a bad financial decision.'],
          action: { kind: 'shop', shopId: 'palmcay-marina' },
        },
        {
          id: 'marina-racer',
          name: 'Racer',
          col: 11,
          row: 6,
          color: COLORS.flavor,
          art: 'person',
          look: { hairStyle: 'pigtails', garment: 'vest', garmentColor: '#2a9a8a' },
          lines: ['Racer: The coast road is closed to everyone but us, on Tuesdays.'],
          action: { kind: 'race', raceIds: ['coast-run', 'cay-slip'] },
        },
        {
          id: 'marina-garage',
          name: 'Mechanic',
          col: 3,
          row: 6,
          color: COLORS.shop,
          art: 'person',
          role: 'local',
          look: { garment: 'overalls', garmentColor: '#3a5a8a', hairStyle: 'buzz' },
          lines: ['Mechanic: Salt gets in everything. I sell what keeps it out.'],
          action: { kind: 'shop', shopId: 'palmcay-garage' },
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
      { west: { toAreaId: 'pc-street', offset: 3, blocked: HIGHWAY }, east: { toAreaId: 'nm-street', offset: 5 }, south: { toAreaId: 'nm-outskirts', offset: 0 } },
    ),
    'nm-outskirts': area(
      'nm-outskirts',
      'The Boneyard',
      OUTSKIRTS['nm-outskirts'].map,
      { col: 15, row: 1 },
      '#1a1020',
      errandPois('nm-outskirts'),
      [],
      { north: { toAreaId: 'road-mesa', offset: 0 } },
    ),
    'nm-street': area(
      'nm-street',
      'The Mesa Strip',
      NEON_MESA_TOWN,
      { col: 9, row: 7 },
      '#1a1020',
      [
        // Out walking: most of them about in the afternoon, few at night.
        walker('nm-walk-showgirl', 'Showgirl', [[15, 6], [19, 6]], NIGHTS, ['Showgirl: Two shows a night and a matinee. The feathers weigh more than you do. Excuse me.']),
        walker('nm-walk-convention', 'Conventioneer', [[8, 9], [11, 9]], MORNINGS, ['Conventioneer: Dental supplies. Forty thousand of us. Not one of us has slept.']),
        walker('nm-walk-bachelorette', 'Bachelorette', [[8, 15], [22, 15]], LATE, ['Bachelorette: We lost the bride an hour ago. She is fine. She is somewhere with a sash on.']),
        walker('nm-walk-gambler', 'Gambler on a Streak', [[19, 9], [24, 9]], NIGHTS, ['Gambler: Nine reds in a row. Then a black. I don\'t want to talk about the black.']),
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
          role: 'local',
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
        { col: 6, row: 5, toAreaId: 'nm-casino', toCol: 22, toRow: 24, label: 'Mesa Casino' },
        { col: 14, row: 5, toAreaId: 'nm-luxury', toCol: 6, toRow: 7, label: 'Mesa Luxury' },
        { col: 20, row: 5, toAreaId: 'nm-motors', toCol: 7, toRow: 8, label: 'Mesa Motors' },
        { col: 27, row: 5, toAreaId: 'nm-club', toCol: 7, toRow: 8, label: 'Ultraviolet' },
      ],
      { west: { toAreaId: 'road-mesa', offset: -5 }, east: { toAreaId: 'road-lumina', offset: -5, blocked: HIGHWAY } },
    ),
    'nm-casino': area(
      'nm-casino',
      'Mesa Casino',
      MESA_FLOOR,
      { col: 22, row: 24 },
      '#1a1020',
      [
        {
          id: 'mesa-dealer',
          name: 'Dealer',
          col: 11,
          row: 11,
          color: COLORS.dealer,
          lines: ['Dealer: Twenty-five fifty. Ten thousand to sit.'],
          action: { kind: 'table', tableId: 'mesa-main' },
        },
        {
          id: 'mesa-headsup',
          name: 'Heads-Up Table',
          col: 21,
          row: 10,
          color: COLORS.dealer,
          lines: ['Dealer: Fifty-hundred, one-on-one. Lorna plays here most nights.'],
          action: { kind: 'table', tableId: 'mesa-headsup' },
        },
        {
          id: 'mesa-croupier',
          name: 'Croupier',
          col: 32,
          row: 10,
          color: COLORS.local,
          role: 'dealer',
          look: { hairStyle: 'bun' },
          lines: ['Croupier: No more bets.', 'Croupier: Seventeen, black. It is always seventeen when you are not on it.'],
          action: { kind: 'flavor' },
        },
        {
          id: 'mesa-cashier',
          name: 'Change Booth',
          col: 2,
          row: 20,
          color: COLORS.local,
          role: 'dealer',
          lines: ['Cashier: Chips in, cash out. Count it at the window, not on the floor.'],
          action: { kind: 'flavor' },
        },
        {
          id: 'mesa-tourist',
          name: 'Tourist',
          col: 2,
          row: 12,
          color: COLORS.local,
          lines: ['Tourist: I have played that bank for six hours. I am going to win that car.', 'Tourist: Take my picture with it? Just in case.'],
          action: { kind: 'flavor' },
        },
        {
          id: 'mesa-waitress',
          name: 'Cocktail Waitress',
          col: 23,
          row: 9,
          color: COLORS.local,
          role: 'waiter',
          look: { lower: 'skirt', hairStyle: 'long' },
          lines: ['Waitress: Drinks are free while you play. Nothing else is.'],
          action: { kind: 'flavor' },
        },
        {
          id: 'highroller',
          name: 'High Roller Room',
          col: 19,
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
          col: 37,
          row: 2,
          color: COLORS.flavor,
          art: 'none',
          lines: ['Five machines and a jackpot board that has not stopped counting since the place opened.'],
          action: { kind: 'slots' },
        },
        {
          id: 'nm-racebook',
          name: 'Racebook',
          col: 9,
          row: 9,
          color: COLORS.flavor,
          art: 'none',
          lines: ['The board flickers neon green. Every horse on it is named for a mistake somebody here has already made.'],
          action: { kind: 'horses' },
        },
        {
          id: 'nm-roulette',
          name: 'Roulette Table',
          col: 30,
          row: 11,
          color: COLORS.flavor,
          art: 'none',
          lines: ['Thirty-seven pockets and a croupier who has not blinked since the neon came on.'],
          action: { kind: 'roulette' },
        },
        {
          id: 'nm-craps',
          name: 'Craps Table',
          col: 32,
          row: 21,
          color: COLORS.flavor,
          art: 'none',
          lines: ['Purple felt and a stickman who has seen everything twice.'],
          action: { kind: 'craps' },
        },
        // The Strip at its busiest: a wedding party, a convention, a woman who will not leave her machine.
        local('nm-slotter', 'Slot Player', 10, 23, [
          'Slot Player: This one’s due. I can feel it. I’ve been feeling it since the Tuesday buffet.',
        ]),
        local('nm-newlywed', 'Newlywed', 23, 13, [
          'Newlywed: We got married at the Boneyard chapel an hour ago. Elvira cried. We’re honeymooning at roulette.',
        ]),
        local('nm-conventioneer', 'Conventioneer', 14, 22, [
          'Conventioneer: I’m here for the dental supply expo. I have been to none of the dental supply expo.',
        ]),
        local('nm-bachelorette', 'Bachelorette', 12, 23, [
          'Bachelorette: Have you seen a bride? Veil, sash, the look of somebody about to put it all on black?',
        ]),
      ],
      [
        { col: 22, row: 25, toAreaId: 'nm-street', toCol: 6, toRow: 6, label: 'Out' },
        { col: 7, row: 25, toAreaId: 'nm-private', toCol: 7, toRow: 8, label: 'Vale Suite', privateRoomOf: 'neonMesa' },
      ],
    ),
    'nm-private': bossRoom({
      id: 'nm-private',
      name: 'The Vale Suite',
      wall: 'n',
      floor: '%',
      background: '#1a1020',
      tableId: 'mesa-boss',
      dealerLine: 'Dealer: Fifty thousand each, one match. Mr. Vale has not lost in this room in nine years.',
      floorId: 'nm-casino',
      floorDoor: { col: 7, row: 24 },
    }),
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
        {
          id: 'mesa-racer',
          name: 'Racer',
          col: 11,
          row: 6,
          color: COLORS.flavor,
          art: 'person',
          look: { hairStyle: 'slick', garment: 'hoodie', garmentColor: '#8a3ad0' },
          lines: ['Racer: They shut the Strip at two. Not for the police. For us.'],
          action: { kind: 'race', raceIds: ['strip-sprint', 'mesa-slip'] },
        },
        {
          id: 'mesa-garage',
          name: 'Mechanic',
          col: 3,
          row: 6,
          color: COLORS.shop,
          art: 'person',
          role: 'local',
          look: { garment: 'overalls', garmentColor: '#3a5a8a', hairStyle: 'buzz' },
          lines: ['Mechanic: Everything here is carbon. Do not ask about the price.'],
          action: { kind: 'shop', shopId: 'mesa-garage' },
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
      { west: { toAreaId: 'nm-street', offset: 5, blocked: HIGHWAY }, east: { toAreaId: 'pl-street', offset: 4 }, south: { toAreaId: 'pl-outskirts', offset: 0 } },
    ),
    'pl-outskirts': area(
      'pl-outskirts',
      'The Belvedere',
      OUTSKIRTS['pl-outskirts'].map,
      { col: 11, row: 1 },
      '#12141c',
      errandPois('pl-outskirts'),
      [],
      { north: { toAreaId: 'road-lumina', offset: 0 } },
    ),
    'pl-street': area(
      'pl-street',
      'Lumina Waterfront',
      PORTO_LUMINA_TOWN,
      { col: 15, row: 9 },
      '#141020',
      [
        // Out walking: most of them about in the afternoon, few at night.
        walker('pl-walk-parasol', 'Lady with a Parasol', [[5, 18], [26, 18]], DAY, ['Lady: One walks the length of the pool and back. One does not run. One is seen.']),
        walker('pl-walk-linen', 'Man in Linen', [[5, 14], [14, 14]], LATE, ['Man in Linen: The yacht is at the mole. I prefer to walk. The yacht prefers it too.']),
        walker('pl-walk-nanny', 'Nanny with a Pram', [[16, 14], [26, 14]], MORNINGS, ['Nanny: The baby has a better tailor than I do. He has been to the Atelier twice.']),
        walker('pl-walk-yachtsman', 'Yachtsman', [[24, 8], [29, 8]], ['afternoon', 'night'], ['Yachtsman: My boat is the second biggest in the harbour. I think about the first one constantly.']),
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
        { col: 15, row: 5, toAreaId: 'pl-casino', toCol: 28, toRow: 33, label: 'Casino' },
        { col: 25, row: 5, toAreaId: 'pl-atelier', toCol: 6, toRow: 7, label: 'Atelier' },
        { col: 5, row: 5, toAreaId: 'pl-lift', toCol: 6, toRow: 7, label: 'Penthouse Lift' },
      ],
      { west: { toAreaId: 'road-lumina', offset: -4 } },
    ),
    'pl-casino': area(
      'pl-casino',
      'Porto Lumina Casino',
      LUMINA_FLOOR,
      { col: 28, row: 33 },
      '#141020',
      [
        // Who meets you at the door.
        { ...local('pl-coatcheck', 'Coat Check', 3, 33, ['Coat Check: Your coat. Ticket forty-one. Do not lose it; the coat will outlive us both.']), role: 'clerk' },
        { ...local('pl-floor-manager', 'Floor Manager', 34, 33, ['Floor Manager: Good evening. The tournament is the nine tables, the desk is under the chandelier at the back, and the salon is behind the rope. Madame asks that nobody counts their chips aloud.']), role: 'suit' },
        {
          id: 'nadia',
          name: 'Nadia Okonkwo',
          col: 30,
          row: 29,
          color: COLORS.finale,
          lines: [
            'Nadia: The desk is at the back, under the chandelier. Twenty thousand to enter.',
            'Nadia: Ten rounds, ten hands a round. Last one standing at the final table gets the seat upstairs.',
          ],
          action: { kind: 'flavor' },
        },
        {
          id: 'lumina-tournament-desk',
          name: 'Tournament Desk',
          col: 28,
          row: 3,
          color: COLORS.dealer,
          role: 'clerk',
          lines: ['Registrar: The Poker Legends tournament. Twenty thousand to enter, twenty thousand in chips, ten rounds. Knocked out, and it is twenty thousand again.'],
          action: { kind: 'table', tableId: 'lumina-tournament' },
        },
        {
          id: 'pl-racebook',
          name: 'Racebook',
          col: 22,
          row: 14,
          color: COLORS.flavor,
          art: 'none',
          lines: ['Gilt-framed tote board, linen form guides, a clerk in white gloves. Nobody here calls it gambling. They call it the Turf.'],
          action: { kind: 'horses' },
        },
        {
          id: 'pl-roulette',
          name: 'Roulette Table',
          col: 50,
          row: 12,
          color: COLORS.flavor,
          art: 'none',
          lines: ['A wheel gilded to the rim. The croupier spins it as though it were a sacrament.'],
          action: { kind: 'roulette' },
        },
        {
          id: 'lumina-dealer',
          name: 'Dealer',
          col: 50,
          row: 19,
          color: COLORS.dealer,
          lines: ['Dealer: Hundred-two hundred. Thirty thousand to sit.'],
          action: { kind: 'table', tableId: 'lumina-nosebleed' },
        },
        local('pl-barman', 'Sommelier', 5, 3, [
          'Sommelier: The house pours for the players at the far table. You will know when you are one.',
        ]),
        local('pl-cashier', 'Cashier', 17, 3, [
          'Cashier: Plaques, not chips, above ten thousand. They are heavier. People like that.',
        ]),
        local('pl-director', 'Tournament Director', 25, 4, [
          'Director: Ten hands a round, then the blinds go up. Nobody asks for the clock to be stopped, and nobody gets it.',
        ]),
        local('pl-railbird', 'Rail Bird', 41, 33, [
          'Rail Bird: I have watched every Invitational since the fire. Do not ask which fire.',
        ]),
        // Old money, new money, and the people who carry its drinks.
        local('pl-heiress', 'Heiress', 20, 11, [
          'Heiress: Grandmother broke the bank here in 1961. The bank has been very rude to us ever since.',
        ]),
        local('pl-shipowner', 'Shipowner', 46, 4, [
          'Shipowner: Eleven tankers and I still cannot hit a seven on that machine. It is personal now.',
        ]),
        local('pl-croupier', 'Croupier', 48, 12, [
          'Croupier: Faites vos jeux. That means hurry up, in a nicer voice.',
        ]),
        {
          id: 'pl-waiter',
          name: 'Salon Waiter',
          col: 47,
          row: 21,
          color: COLORS.local,
          role: 'waiter',
          lines: ['Waiter: Champagne goes past the rope. You go past the rope when Miss Okonkwo says so.'],
          action: { kind: 'flavor' },
        },
        local('pl-debutante', 'Debutante', 6, 20, [
          'Debutante: Mummy said to stand by the palm and look expensive. I think I am nailing it.',
        ]),
      ],
      [{ col: 28, row: 35, toAreaId: 'pl-street', toCol: 15, toRow: 6, label: 'Out' }],
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
        liftPanel('pl-lobby-lift', 6, 2),
        local('pl-concierge', 'Concierge', 3, 2, [
          'Concierge: The lift goes to one floor. The floor belongs to one person.',
        ]),
      ],
      [{ col: 6, row: 8, toAreaId: 'pl-street', toCol: 5, toRow: 6, label: 'Out' }],
    ),
    // The floors above the lobby. You reach them by the lift, not on foot: `PENTHOUSE_FLOORS`.
    'pl-penthouse': area(
      'pl-penthouse',
      'Your Penthouse',
      PENTHOUSE_MAIN,
      { col: 12, row: 3 },
      '#141020',
      [
        liftPanel('pl-pent-lift', 12, 2),
        local('pl-pent-housekeeper', 'Housekeeper', 9, 8, [
          'Housekeeper: I laid out the blue suit. You wore it to the Invitational. I thought you would want to be reminded.',
        ], ['Housekeeper: Nobody has slept in the bed in a week. I change it anyway. It seems rude not to.']),
        thing('pl-pent-fire', 'Fireplace', 7, 2, ['Marble, a mirror over it, the fire lit by somebody who is not you.']),
        thing('pl-pent-tank', 'Fish Tank', 7, 8, ['Two fish going round. They have outlived three of your sponsors.']),
      ],
      [],
    ),
    'pl-gym': area(
      'pl-gym',
      'Floor 39: Gym',
      PENTHOUSE_GYM,
      { col: 12, row: 3 },
      '#141020',
      [
        liftPanel('pl-gym-lift', 12, 2),
        local('pl-gym-trainer', 'Personal Trainer', 7, 6, [
          'Trainer: Poker is eight hours of sitting. Your back is a pawn shop. We start with the back.',
        ], ['Trainer: Resting heart rate tells me more about your tells than the cameras do.']),
        thing('pl-gym-bag', 'Heavy Bag', 13, 4, ['It has your sponsor\'s logo on it. It has been hit a great deal.']),
      ],
      [],
    ),
    'pl-pool': area(
      'pl-pool',
      'Floor 40: Pool',
      PENTHOUSE_POOL,
      { col: 12, row: 3 },
      '#141020',
      [
        liftPanel('pl-pool-lift', 12, 2),
        local('pl-pool-lifeguard', 'Lifeguard', 13, 5, [
          'Lifeguard: Forty floors up, and I am still required to watch. If you drown, it will be the most expensive thing that ever happened here.',
        ]),
        thing('pl-pool-water', 'Pool', 3, 4, ['Blue, still, and lit from underneath. The harbour is on the other side of the glass, a smaller blue.']),
      ],
      [],
    ),
    'pl-workroom': area(
      'pl-workroom',
      'Floor 38: Workroom',
      PENTHOUSE_WORK,
      { col: 12, row: 3 },
      '#141020',
      [
        liftPanel('pl-work-lift', 12, 2),
        thing('pl-work-charts', 'Charts', 7, 4, ['Every hand you have played since the apartment, in a column: green when you were right, red when you got lucky.']),
        thing('pl-work-shelf', 'Bookshelf', 2, 2, ['Three books on probability, two on psychology, and one on marriage, still in its wrapper.']),
      ],
      [],
    ),
  },
}

/**
 * The tower's floors, bottom to top, for the lift. Only the owner of the
 * penthouse is taken above the lobby, and a floor has no door of its own: the
 * lift is the one way in and the one way out.
 */
export const PENTHOUSE_FLOORS = [
  { areaId: 'pl-lift', label: 'L', name: 'Lobby' },
  { areaId: 'pl-workroom', label: '38', name: 'Workroom' },
  { areaId: 'pl-gym', label: '39', name: 'Gym' },
  { areaId: 'pl-pool', label: '40', name: 'Pool' },
  { areaId: 'pl-penthouse', label: '41', name: 'Your Penthouse' },
] as const

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
  'sc-private': [
    { stampId: 'clock', col: 3, row: 1 },
    { stampId: 'painting-horse', col: 9, row: 1 },
    { stampId: 'poker-table', col: 5, row: 4 },
    { stampId: 'light-pool', col: 5, row: 4 },
    { stampId: 'cactus', col: 1, row: 2 },
    { stampId: 'cactus', col: 12, row: 2 },
    { stampId: 'armchair', col: 1, row: 7 },
    { stampId: 'side-table', col: 12, row: 7 },
  ],
  'rb-private': [
    { stampId: 'porthole', col: 3, row: 1 },
    { stampId: 'porthole', col: 6, row: 1 },
    { stampId: 'porthole', col: 9, row: 1 },
    { stampId: 'poker-table-baize-4', col: 5, row: 4 },
    { stampId: 'light-pool', col: 5, row: 4 },
    { stampId: 'fern', col: 1, row: 2 },
    { stampId: 'fern', col: 12, row: 2 },
    { stampId: 'armchair', col: 1, row: 7 },
    { stampId: 'side-table', col: 12, row: 7 },
  ],
  'ch-private': [
    { stampId: 'painting-portrait', col: 3, row: 1 },
    { stampId: 'clock', col: 6, row: 1 },
    { stampId: 'painting-ship', col: 9, row: 1 },
    { stampId: 'poker-table-baize-4', col: 5, row: 4 },
    { stampId: 'light-pool', col: 5, row: 4 },
    { stampId: 'fern', col: 1, row: 2 },
    { stampId: 'fern', col: 12, row: 2 },
    { stampId: 'armchair-green', col: 1, row: 7 },
    { stampId: 'side-table', col: 12, row: 7 },
  ],
  'pc-private': [
    { stampId: 'painting-landscape', col: 3, row: 1 },
    { stampId: 'porthole', col: 9, row: 1 },
    { stampId: 'poker-table', col: 5, row: 4 },
    { stampId: 'light-pool', col: 5, row: 4 },
    { stampId: 'fern', col: 1, row: 2 },
    { stampId: 'fern', col: 12, row: 2 },
    { stampId: 'plant-tall', col: 1, row: 7 },
    { stampId: 'side-table', col: 12, row: 7 },
  ],
  'nm-private': [
    { stampId: 'neon-vip', col: 3, row: 1 },
    { stampId: 'painting-abstract', col: 9, row: 1 },
    { stampId: 'poker-table-neon-4', col: 5, row: 4 },
    { stampId: 'light-pool', col: 5, row: 4 },
    { stampId: 'cactus', col: 1, row: 2 },
    { stampId: 'cactus', col: 12, row: 2 },
    { stampId: 'floor-lamp', col: 1, row: 7 },
    { stampId: 'floor-lamp', col: 12, row: 7 },
  ],
  // Laid out so the edges of the view from the door fall between objects
  // (columns 2|3 and 17|18), not through a bank of machines or the felt: what
  // stands beyond them is a plant or a cactus, whole when you walk over to it.
  'sc-floor': [
    { stampId: 'palm', col: 1, row: 1 },
    { stampId: 'gumball', col: 3, row: 1 },
    { stampId: 'slot-bank-western', col: 7, row: 1 },
    { stampId: 'bar-brass', col: 15, row: 1 },
    { stampId: 'cashier-cage', col: 26, row: 1 },
    { stampId: 'fern', col: 34, row: 1 },
    { stampId: 'cactus', col: 36, row: 1 },
    { stampId: 'cactus', col: 1, row: 7 },
    { stampId: 'cactus', col: 36, row: 7 },
    { stampId: 'poker-table-6', col: 7, row: 9 },
    { stampId: 'craps-table', col: 28, row: 9 },
    { stampId: 'pillar-wood', col: 17, row: 10 },
    { stampId: 'pillar-wood', col: 22, row: 10 },
    { stampId: 'palm', col: 1, row: 17 },
    { stampId: 'slot-bank', col: 7, row: 18 },
    { stampId: 'slot-bank-western', col: 27, row: 18 },
    { stampId: 'cactus', col: 36, row: 17 },
    // Inside the door: the hat rack, a cactus in the corner, the house's star underfoot.
    { stampId: 'coat-stand', col: 13, row: 20 },
    { stampId: 'cactus', col: 1, row: 20 },
    { stampId: 'inlay-crest', col: 19, row: 19 },
    // The floor was doubled in each direction: these fill the room out so there is
    // somewhere to walk between them rather than a field of bare carpet.
    { stampId: 'velvet-bench', col: 22, row: 6 },
    { stampId: 'pillar-wood', col: 15, row: 14 },
    { stampId: 'velvet-bench', col: 18, row: 15 },
    { stampId: 'floor-lamp', col: 23, row: 15 },
    { stampId: 'velvet-bench', col: 26, row: 5 },
    { stampId: 'pillar-wood', col: 30, row: 5 },
    { stampId: 'velvet-bench', col: 14, row: 6 },
    { stampId: 'floor-lamp', col: 18, row: 6 },
    { stampId: 'velvet-bench', col: 3, row: 10 },
    { stampId: 'pillar-wood', col: 3, row: 13 },
    { stampId: 'palm', col: 4, row: 3 },
    { stampId: 'floor-lamp', col: 33, row: 4 },
    { stampId: 'cactus', col: 7, row: 6 },
    { stampId: 'pillar-wood', col: 10, row: 5 },
    { stampId: 'palm', col: 4, row: 6 },
    { stampId: 'floor-lamp', col: 14, row: 9 },
    { stampId: 'cactus', col: 25, row: 9 },
    { stampId: 'pillar-wood', col: 25, row: 11 },
    { stampId: 'palm', col: 6, row: 14 },
    { stampId: 'floor-lamp', col: 9, row: 15 },
    { stampId: 'cactus', col: 12, row: 15 },
    { stampId: 'pillar-wood', col: 26, row: 14 },
    { stampId: 'palm', col: 29, row: 14 },
    { stampId: 'floor-lamp', col: 32, row: 15 },
    { stampId: 'cactus', col: 4, row: 18 },
    { stampId: 'pillar-wood', col: 16, row: 17 },
    { stampId: 'palm', col: 24, row: 17 },
    { stampId: 'floor-lamp', col: 32, row: 18 },
  ],
  // From the gangway the view is columns 4 to 18 and the whole height of the
  // room, so nothing on the back wall may reach into the hidden wall top: the
  // cage and the bar stand there, and the bank is out on the deck where its
  // marquee has the room above it. Plants and the life rings are past the edges.
  'rb-boat': [
    { stampId: 'racebook', col: 24, row: 15 },
    { stampId: 'palm', col: 1, row: 1 },
    { stampId: 'life-ring', col: 3, row: 1 },
    { stampId: 'porthole', col: 5, row: 1 },
    { stampId: 'cashier-cage', col: 9, row: 1 },
    { stampId: 'porthole', col: 17, row: 1 },
    { stampId: 'painting-ship', col: 20, row: 1 },
    { stampId: 'clock', col: 24, row: 1 },
    { stampId: 'porthole', col: 26, row: 1 },
    { stampId: 'bar-brass', col: 30, row: 1 },
    { stampId: 'life-ring', col: 38, row: 1 },
    { stampId: 'palm', col: 40, row: 1 },
    { stampId: 'velvet-rope', col: 14, row: 5 },
    { stampId: 'slot-bank-brass', col: 9, row: 11 },
    { stampId: 'poker-table-brass', col: 20, row: 9 },
    { stampId: 'roulette', col: 31, row: 11 },
    { stampId: 'pillar-brass', col: 3, row: 8 },
    { stampId: 'fern', col: 1, row: 17 },
    { stampId: 'fern', col: 5, row: 18 },
    { stampId: 'pillar-brass', col: 38, row: 10 },
    { stampId: 'fern', col: 40, row: 18 },
    // The floor was doubled in each direction: these fill the room out so there is
    // somewhere to walk between them rather than a field of bare carpet.
    { stampId: 'slot-bank-brass', col: 6, row: 5 },
    { stampId: 'velvet-bench', col: 19, row: 5 },
    { stampId: 'palm', col: 24, row: 4 },
    { stampId: 'velvet-bench', col: 27, row: 7 },
    { stampId: 'floor-lamp', col: 32, row: 7 },
    { stampId: 'velvet-bench', col: 15, row: 9 },
    { stampId: 'palm', col: 4, row: 12 },
    { stampId: 'velvet-bench', col: 15, row: 13 },
    { stampId: 'floor-lamp', col: 37, row: 5 },
    { stampId: 'velvet-bench', col: 27, row: 10 },
    { stampId: 'palm', col: 27, row: 13 },
    { stampId: 'velvet-bench', col: 37, row: 14 },
    { stampId: 'floor-lamp', col: 19, row: 15 },
    { stampId: 'velvet-bench', col: 22, row: 14 },
    { stampId: 'palm', col: 27, row: 3 },
    { stampId: 'pillar-brass', col: 3, row: 4 },
    { stampId: 'floor-lamp', col: 12, row: 8 },
    { stampId: 'fern', col: 35, row: 8 },
    { stampId: 'palm', col: 8, row: 15 },
    { stampId: 'pillar-brass', col: 11, row: 16 },
    { stampId: 'floor-lamp', col: 15, row: 16 },
    { stampId: 'fern', col: 30, row: 16 },
    { stampId: 'palm', col: 33, row: 15 },
  ],
  // From the door the view is columns 3 to 17 and rows 3 down. The back wall
  // (fire, shelves, the cage behind a rope gate) is above it and whole; the
  // tables, the heads-up and the wheel are inside it; ferns and palms are past
  // the sides.
  'ch-cardroom': [
    { stampId: 'bookshelf-dark', col: 1, row: 1 },
    { stampId: 'painting-portrait', col: 6, row: 1 },
    { stampId: 'fireplace', col: 10, row: 1 },
    { stampId: 'cashier-cage', col: 18, row: 1 },
    { stampId: 'clock', col: 26, row: 1 },
    { stampId: 'painting-ship', col: 28, row: 1 },
    { stampId: 'bookshelf-dark', col: 35, row: 1 },
    { stampId: 'velvet-rope', col: 14, row: 4 },
    { stampId: 'velvet-rope', col: 23, row: 4 },
    { stampId: 'poker-table-baize', col: 7, row: 9 },
    { stampId: 'poker-table-baize', col: 28, row: 9 },
    { stampId: 'poker-table-baize-4', col: 13, row: 18 },
    { stampId: 'roulette', col: 23, row: 18 },
    { stampId: 'light-pool', col: 8, row: 11 },
    { stampId: 'light-pool', col: 29, row: 11 },
    { stampId: 'light-pool', col: 12, row: 18 },
    { stampId: 'light-pool', col: 23, row: 18 },
    { stampId: 'armchair-green', col: 5, row: 19 },
    { stampId: 'side-table', col: 7, row: 19 },
    { stampId: 'side-table', col: 32, row: 19 },
    { stampId: 'armchair-green', col: 34, row: 19 },
    { stampId: 'fern', col: 1, row: 4 },
    { stampId: 'palm', col: 1, row: 12 },
    { stampId: 'fern', col: 1, row: 22 },
    { stampId: 'fern', col: 36, row: 4 },
    { stampId: 'palm', col: 36, row: 12 },
    { stampId: 'fern', col: 36, row: 21 },
    // The floor was doubled in each direction: these fill the room out so there is
    // somewhere to walk between them rather than a field of bare carpet.
    { stampId: 'piano', col: 17, row: 9 },
    { stampId: 'sofa-velvet', col: 22, row: 8 },
    { stampId: 'piano', col: 22, row: 12 },
    { stampId: 'sofa-velvet', col: 5, row: 5 },
    { stampId: 'piano', col: 28, row: 4 },
    { stampId: 'sofa-velvet', col: 14, row: 14 },
    { stampId: 'velvet-bench', col: 10, row: 5 },
    { stampId: 'palm', col: 3, row: 8 },
    { stampId: 'velvet-bench', col: 4, row: 15 },
    { stampId: 'armchair-green', col: 19, row: 16 },
    { stampId: 'velvet-bench', col: 19, row: 18 },
    { stampId: 'palm', col: 19, row: 4 },
    { stampId: 'floor-lamp', col: 33, row: 5 },
    { stampId: 'armchair-green', col: 14, row: 7 },
    { stampId: 'fern', col: 14, row: 10 },
    { stampId: 'palm', col: 4, row: 11 },
    { stampId: 'floor-lamp', col: 19, row: 13 },
    { stampId: 'armchair-green', col: 8, row: 16 },
    { stampId: 'fern', col: 29, row: 16 },
    { stampId: 'palm', col: 32, row: 15 },
    { stampId: 'floor-lamp', col: 29, row: 19 },
  ],
  // From the door the view is columns 3 to 17 and rows 4 down: the two long
  // tables with a reef bank between them, the wheel, a bank either side of the
  // door. The tiki bar, the cage and the back bank are a walk up, whole above it.
  'pc-casino': [
    { stampId: 'racebook', col: 24, row: 10 },
    { stampId: 'palm', col: 1, row: 1 },
    { stampId: 'fern', col: 3, row: 2 },
    { stampId: 'slot-bank-island', col: 7, row: 1 },
    { stampId: 'bar-tiki', col: 15, row: 1 },
    { stampId: 'palm', col: 24, row: 1 },
    { stampId: 'cashier-cage', col: 28, row: 1 },
    { stampId: 'palm', col: 36, row: 1 },
    { stampId: 'velvet-rope', col: 25, row: 4 },
    { stampId: 'velvet-rope', col: 34, row: 4 },
    { stampId: 'fern', col: 1, row: 7 },
    { stampId: 'fern', col: 36, row: 7 },
    { stampId: 'poker-table-teal', col: 7, row: 11 },
    { stampId: 'slot-bank-reef', col: 17, row: 13 },
    { stampId: 'poker-table-teal', col: 28, row: 11 },
    { stampId: 'roulette', col: 19, row: 20 },
    // Inside the door: the coat check and its rail, a palm, the rope by the
    // owner's door, and the house's crest in the floor where you come in.
    { stampId: 'rack-suits', col: 4, row: 21 },
    { stampId: 'coat-stand', col: 7, row: 21 },
    { stampId: 'palm', col: 11, row: 21 },
    { stampId: 'velvet-rope', col: 14, row: 24 },
    { stampId: 'inlay-crest', col: 19, row: 23 },
    { stampId: 'slot-bank-reef', col: 29, row: 22 },
    { stampId: 'palm', col: 1, row: 14 },
    { stampId: 'fern', col: 1, row: 23 },
    { stampId: 'palm', col: 36, row: 14 },
    { stampId: 'fern', col: 36, row: 23 },
    // The floor was doubled in each direction: these fill the room out so there is
    // somewhere to walk between them rather than a field of bare carpet.
    { stampId: 'slot-bank-reef', col: 14, row: 7 },
    { stampId: 'slot-bank-island', col: 20, row: 7 },
    { stampId: 'lounger', col: 4, row: 7 },
    { stampId: 'fern', col: 9, row: 7 },
    { stampId: 'lounger', col: 23, row: 13 },
    { stampId: 'plant-tall', col: 26, row: 18 },
    { stampId: 'lounger', col: 29, row: 18 },
    { stampId: 'fern', col: 15, row: 19 },
    { stampId: 'lounger', col: 30, row: 5 },
    { stampId: 'plant-tall', col: 26, row: 7 },
    { stampId: 'lounger', col: 3, row: 10 },
    { stampId: 'fern', col: 4, row: 17 },
    { stampId: 'lounger', col: 7, row: 17 },
    { stampId: 'plant-tall', col: 11, row: 17 },
    { stampId: 'lounger', col: 33, row: 18 },
    { stampId: 'fern', col: 25, row: 21 },
    { stampId: 'pillar-bamboo', col: 29, row: 7 },
    { stampId: 'plant-tall', col: 32, row: 8 },
    { stampId: 'palm', col: 14, row: 11 },
    { stampId: 'fern', col: 4, row: 13 },
    { stampId: 'pillar-bamboo', col: 14, row: 14 },
    { stampId: 'plant-tall', col: 23, row: 16 },
  ],
  // From the door you see columns 4 to 18, so the pit and the front stand
  // inside them; the prize car and the change booth fill the corners past the
  // left edge, where you find them whole when you walk over.
  'nm-casino': [
    { stampId: 'racebook', col: 8, row: 8 },
    { stampId: 'slot-bank-jackpot', col: 1, row: 1 },
    { stampId: 'neon-vip', col: 16, row: 1 },
    { stampId: 'door-vip', col: 22, row: 1 },
    { stampId: 'velvet-rope', col: 16, row: 2 },
    { stampId: 'velvet-rope', col: 25, row: 2 },
    { stampId: 'slot-bank-neon', col: 36, row: 1 },
    { stampId: 'cactus', col: 40, row: 7 },
    { stampId: 'prize-car', col: 1, row: 10 },
    { stampId: 'poker-table-neon', col: 9, row: 11 },
    { stampId: 'poker-table-neon-4', col: 19, row: 10 },
    { stampId: 'roulette', col: 29, row: 10 },
    { stampId: 'palm', col: 38, row: 12 },
    { stampId: 'change-booth', col: 1, row: 19 },
    { stampId: 'slot-bank-neon', col: 9, row: 20 },
    { stampId: 'pillar-neon', col: 17, row: 19 },
    { stampId: 'pillar-neon', col: 26, row: 19 },
    { stampId: 'craps-table-neon', col: 30, row: 20 },
    { stampId: 'palm', col: 40, row: 19 },
    // The floor was doubled in each direction: these fill the room out so there is
    // somewhere to walk between them rather than a field of bare carpet.
    { stampId: 'slot-bank-neon', col: 9, row: 5 },
    { stampId: 'sofa-velvet', col: 30, row: 5 },
    { stampId: 'cactus', col: 21, row: 16 },
    { stampId: 'sofa-velvet', col: 20, row: 20 },
    { stampId: 'floor-lamp', col: 17, row: 6 },
    { stampId: 'sofa-velvet', col: 20, row: 6 },
    { stampId: 'cactus', col: 26, row: 6 },
    { stampId: 'sofa-velvet', col: 35, row: 7 },
    { stampId: 'floor-lamp', col: 4, row: 15 },
    { stampId: 'sofa-velvet', col: 29, row: 16 },
    { stampId: 'cactus', col: 3, row: 6 },
    { stampId: 'palm', col: 25, row: 9 },
    { stampId: 'floor-lamp', col: 25, row: 13 },
    { stampId: 'pillar-neon', col: 16, row: 15 },
    { stampId: 'cactus', col: 34, row: 15 },
    { stampId: 'palm', col: 6, row: 5 },
    { stampId: 'floor-lamp', col: 6, row: 9 },
    { stampId: 'pillar-neon', col: 16, row: 8 },
    { stampId: 'cactus', col: 35, row: 10 },
    { stampId: 'palm', col: 6, row: 11 },
    { stampId: 'floor-lamp', col: 16, row: 12 },
    { stampId: 'pillar-neon', col: 24, row: 15 },
    { stampId: 'cactus', col: 37, row: 16 },
    { stampId: 'palm', col: 7, row: 16 },
    { stampId: 'floor-lamp', col: 10, row: 17 },
    { stampId: 'pillar-neon', col: 13, row: 16 },
    { stampId: 'cactus', col: 37, row: 19 },
    { stampId: 'palm', col: 6, row: 19 },
    { stampId: 'floor-lamp', col: 37, row: 22 },
  ],
  // A hall the size of a ballroom: nine tables of the tournament in a grid on the
  // royal carpet, the bar and the cages along the back wall, the salon and the wheel
  // down the east side. The door is at the bottom, and the first thing past it is
  // the crest underfoot.
  'pl-casino': [
    { stampId: 'racebook', col: 21, row: 13 },
    { stampId: 'painting-portrait', col: 4, row: 1 },
    { stampId: 'painting-portrait', col: 13, row: 1 },
    { stampId: 'painting-portrait', col: 21, row: 1 },
    { stampId: 'painting-portrait', col: 33, row: 1 },
    { stampId: 'painting-portrait', col: 41, row: 1 },
    { stampId: 'painting-portrait', col: 52, row: 1 },
    { stampId: 'bar-marble', col: 3, row: 2 },
    { stampId: 'cashier-cage', col: 15, row: 2 },
    { stampId: 'cashier-cage', col: 26, row: 2 },
    { stampId: 'slot-bank-gold', col: 40, row: 2 },
    { stampId: 'slot-bank-gold', col: 51, row: 2 },
    { stampId: 'poker-table-royal', col: 15, row: 7 },
    { stampId: 'poker-table-royal', col: 25, row: 7 },
    { stampId: 'poker-table-royal', col: 35, row: 7 },
    { stampId: 'poker-table-royal', col: 15, row: 16 },
    { stampId: 'poker-table-royal', col: 25, row: 16 },
    { stampId: 'poker-table-royal', col: 35, row: 16 },
    { stampId: 'poker-table-royal', col: 15, row: 25 },
    { stampId: 'poker-table-royal', col: 25, row: 25 },
    { stampId: 'poker-table-royal', col: 35, row: 25 },
    { stampId: 'poker-table-royal', col: 48, row: 19 },
    { stampId: 'roulette', col: 49, row: 11 },
    { stampId: 'velvet-rope', col: 1, row: 32 },
    { stampId: 'velvet-rope', col: 4, row: 32 },
    { stampId: 'velvet-rope', col: 7, row: 32 },
    { stampId: 'velvet-rope', col: 10, row: 32 },
    { stampId: 'velvet-rope', col: 13, row: 32 },
    { stampId: 'velvet-rope', col: 16, row: 32 },
    { stampId: 'velvet-rope', col: 19, row: 32 },
    { stampId: 'velvet-rope', col: 22, row: 32 },
    { stampId: 'fern', col: 25, row: 32 },
    { stampId: 'fern', col: 26, row: 32 },
    { stampId: 'pillar-marble', col: 27, row: 32 },
    { stampId: 'pillar-marble', col: 29, row: 32 },
    { stampId: 'velvet-rope', col: 30, row: 32 },
    { stampId: 'velvet-rope', col: 33, row: 32 },
    { stampId: 'velvet-rope', col: 36, row: 32 },
    { stampId: 'velvet-rope', col: 39, row: 32 },
    { stampId: 'velvet-rope', col: 42, row: 32 },
    { stampId: 'velvet-rope', col: 45, row: 32 },
    { stampId: 'velvet-rope', col: 48, row: 32 },
    { stampId: 'velvet-rope', col: 51, row: 32 },
    { stampId: 'velvet-rope', col: 54, row: 32 },
    { stampId: 'palm', col: 1, row: 2 },
    { stampId: 'palm', col: 11, row: 2 },
    { stampId: 'palm', col: 37, row: 2 },
    { stampId: 'palm', col: 56, row: 2 },
    { stampId: 'palm', col: 1, row: 11 },
    { stampId: 'palm', col: 56, row: 11 },
    { stampId: 'fern', col: 1, row: 21 },
    { stampId: 'fern', col: 56, row: 21 },
    { stampId: 'fern', col: 10, row: 17 },
    { stampId: 'fern', col: 47, row: 15 },
    { stampId: 'palm', col: 10, row: 27 },
    { stampId: 'palm', col: 53, row: 30 },
    { stampId: 'pillar-marble', col: 11, row: 7 },
    { stampId: 'pillar-marble', col: 46, row: 7 },
    { stampId: 'pillar-marble', col: 11, row: 21 },
    { stampId: 'pillar-marble', col: 46, row: 23 },
    { stampId: 'rack-suits', col: 1, row: 33 },
    { stampId: 'coat-stand', col: 5, row: 34 },
    { stampId: 'inlay-crest', col: 24, row: 33 },
    { stampId: 'light-pool', col: 23, row: 14 },
    { stampId: 'light-pool', col: 27, row: 4 },
    { stampId: 'rug-red', col: 4, row: 8 },
    { stampId: 'sofa-leather', col: 4, row: 8 },
    { stampId: 'rug-red', col: 4, row: 13 },
    { stampId: 'sofa-leather', col: 4, row: 12 },
    { stampId: 'rug-red', col: 4, row: 17 },
    { stampId: 'sofa-leather', col: 4, row: 17 },
    { stampId: 'rug-red', col: 4, row: 21 },
    { stampId: 'sofa-leather', col: 4, row: 21 },
    { stampId: 'rug-red', col: 3, row: 26 },
    { stampId: 'sofa-leather', col: 3, row: 26 },
    // The floor was doubled in each direction: these fill the room out so there is
    // somewhere to walk between them rather than a field of bare carpet.
    { stampId: 'slot-bank-gold', col: 9, row: 11 },
    { stampId: 'sofa-velvet', col: 49, row: 26 },
    { stampId: 'palm', col: 43, row: 27 },
    { stampId: 'velvet-bench', col: 49, row: 7 },
    { stampId: 'floor-lamp', col: 53, row: 7 },
    { stampId: 'velvet-bench', col: 42, row: 11 },
    { stampId: 'palm', col: 42, row: 18 },
    { stampId: 'plant-tall', col: 22, row: 4 },
    { stampId: 'floor-lamp', col: 33, row: 4 },
    { stampId: 'pillar-marble', col: 48, row: 3 },
    { stampId: 'palm', col: 22, row: 6 },
    { stampId: 'plant-tall', col: 32, row: 7 },
    { stampId: 'floor-lamp', col: 22, row: 10 },
    { stampId: 'pillar-marble', col: 32, row: 9 },
    { stampId: 'palm', col: 15, row: 12 },
    { stampId: 'plant-tall', col: 18, row: 13 },
    { stampId: 'floor-lamp', col: 28, row: 13 },
    { stampId: 'pillar-marble', col: 31, row: 12 },
    { stampId: 'palm', col: 34, row: 12 },
    { stampId: 'plant-tall', col: 37, row: 13 },
    { stampId: 'floor-lamp', col: 42, row: 14 },
    { stampId: 'pillar-marble', col: 32, row: 15 },
    { stampId: 'palm', col: 50, row: 15 },
    { stampId: 'plant-tall', col: 53, row: 16 },
    { stampId: 'floor-lamp', col: 22, row: 19 },
    { stampId: 'pillar-marble', col: 32, row: 18 },
    { stampId: 'palm', col: 14, row: 21 },
    { stampId: 'plant-tall', col: 17, row: 22 },
    { stampId: 'floor-lamp', col: 20, row: 22 },
    { stampId: 'pillar-marble', col: 23, row: 21 },
    { stampId: 'palm', col: 26, row: 21 },
    { stampId: 'plant-tall', col: 29, row: 22 },
    { stampId: 'floor-lamp', col: 32, row: 22 },
    { stampId: 'pillar-marble', col: 35, row: 21 },
    { stampId: 'palm', col: 38, row: 21 },
    { stampId: 'plant-tall', col: 41, row: 22 },
    { stampId: 'floor-lamp', col: 22, row: 25 },
    { stampId: 'pillar-marble', col: 32, row: 24 },
    { stampId: 'palm', col: 54, row: 24 },
    { stampId: 'plant-tall', col: 22, row: 28 },
    { stampId: 'floor-lamp', col: 32, row: 28 },
    { stampId: 'pillar-marble', col: 48, row: 28 },
    { stampId: 'pillar-marble', col: 43, row: 7 },
    { stampId: 'fern', col: 44, row: 12 },
    { stampId: 'plant-tall', col: 44, row: 20 },
  ],
  'ch-club': [
    { stampId: 'bookshelf-dark', col: 1, row: 1 },
    { stampId: 'door-back-room', col: 4, row: 1 },
    { stampId: 'fireplace', col: 6, row: 1 },
    { stampId: 'clock', col: 9, row: 1 },
    { stampId: 'bar-marble', col: 10, row: 1 },
    { stampId: 'plant-tall', col: 5, row: 2 },
    { stampId: 'rug-green', col: 2, row: 5 },
    { stampId: 'side-table', col: 1, row: 5 },
    { stampId: 'sofa-leather', col: 2, row: 5 },
    { stampId: 'side-table', col: 5, row: 5 },
    { stampId: 'rug-red', col: 10, row: 5 },
    { stampId: 'sofa-leather', col: 10, row: 5 },
    { stampId: 'floor-lamp', col: 13, row: 5 },
    { stampId: 'piano', col: 11, row: 7 },
    { stampId: 'fern', col: 1, row: 8 },
    { stampId: 'armchair-green', col: 2, row: 8 },
    { stampId: 'side-table', col: 3, row: 8 },
    { stampId: 'armchair-green', col: 4, row: 8 },
    { stampId: 'fern', col: 14, row: 8 },
    { stampId: 'table-chairs', col: 7, row: 5 },
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
    { stampId: 'crates', col: 4, row: 7 },
    { stampId: 'brochure-stand', col: 8, row: 7 },
  ],
  laundromat: [
    { stampId: 'dryer-stack', col: 1, row: 1 },
    { stampId: 'prices-laundry', col: 6, row: 1 },
    { stampId: 'dryer-stack', col: 9, row: 1 },
    { stampId: 'folding-table', col: 1, row: 5 },
    { stampId: 'washer-row', col: 9, row: 5 },
    { stampId: 'gumball', col: 4, row: 7 },
    { stampId: 'plant-tall', col: 8, row: 7 },
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
    { stampId: 'table-chairs', col: 4, row: 5 },
    { stampId: 'table-chairs', col: 9, row: 5 },
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
    { stampId: 'calendar', col: 3, row: 1 },
    { stampId: 'trophy-fish', col: 4, row: 1 },
    { stampId: 'window-sea', col: 6, row: 1 },
    { stampId: 'menu-diner', col: 8, row: 1 },
    { stampId: 'diner-counter', col: 10, row: 1 },
    { stampId: 'gumball', col: 1, row: 2 },
    { stampId: 'coat-stand', col: 1, row: 4 },
    { stampId: 'table-chairs', col: 2, row: 4 },
    { stampId: 'table-chairs', col: 6, row: 4 },
    { stampId: 'jukebox', col: 10, row: 4 },
    { stampId: 'booth', col: 13, row: 4 },
    { stampId: 'table-chairs', col: 2, row: 7 },
    { stampId: 'table-chairs', col: 5, row: 7 },
    { stampId: 'booth', col: 13, row: 7 },
    { stampId: 'plant-tall', col: 1, row: 8 },
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
    { stampId: 'poster-car', col: 9, row: 1 },
    { stampId: 'calendar', col: 11, row: 1 },
    { stampId: 'window-sky', col: 13, row: 1 },
    { stampId: 'fern', col: 1, row: 2 },
    { stampId: 'brochure-stand', col: 5, row: 2 },
    { stampId: 'water-cooler', col: 9, row: 2 },
    { stampId: 'fern', col: 14, row: 2 },
    { stampId: 'car-red', col: 2, row: 4 },
    { stampId: 'car-silver', col: 11, row: 4 },
    { stampId: 'rug-blue', col: 6, row: 6 },
    { stampId: 'sofa-leather', col: 2, row: 7 },
    { stampId: 'side-table', col: 5, row: 7 },
    { stampId: 'tyre-stack', col: 12, row: 7 },
    { stampId: 'tyre-stack', col: 13, row: 7 },
    { stampId: 'fern', col: 14, row: 7 },
    { stampId: 'plant-tall', col: 1, row: 8 },
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
    { stampId: 'dining-table-cane', col: 9, row: 5 },
  ],
  'pc-marina': [
    { stampId: 'window-sea', col: 1, row: 1 },
    { stampId: 'life-ring', col: 4, row: 1 },
    { stampId: 'counter-glass', col: 6, row: 1 },
    { stampId: 'poster-boat', col: 9, row: 1 },
    { stampId: 'calendar', col: 11, row: 1 },
    { stampId: 'window-sea', col: 12, row: 1 },
    { stampId: 'plant-tall', col: 1, row: 2 },
    { stampId: 'brochure-stand', col: 5, row: 2 },
    { stampId: 'fish-tank', col: 10, row: 2 },
    { stampId: 'water-cooler', col: 14, row: 2 },
    { stampId: 'speedboat', col: 1, row: 4 },
    { stampId: 'car-yellow', col: 11, row: 4 },
    { stampId: 'rug-woven', col: 5, row: 6 },
    { stampId: 'tool-chest', col: 1, row: 7 },
    { stampId: 'sofa', col: 11, row: 7 },
    { stampId: 'side-table', col: 14, row: 7 },
    { stampId: 'crates', col: 1, row: 8 },
    { stampId: 'plant-tall', col: 14, row: 8 },
  ],
  'nm-luxury': [
    { stampId: 'neon-vip', col: 1, row: 1 },
    { stampId: 'counter-glass', col: 5, row: 1 },
    { stampId: 'mannequin-gown', col: 9, row: 1 },
    { stampId: 'mirror-stand', col: 12, row: 1 },
    { stampId: 'rack-gowns', col: 1, row: 5 },
    { stampId: 'velvet-bench', col: 10, row: 5 },
    { stampId: 'mannequin-suit', col: 3, row: 3 },
    { stampId: 'plant-tall', col: 4, row: 7 },
    { stampId: 'floor-lamp', col: 8, row: 7 },
  ],
  'nm-motors': [
    { stampId: 'window-night', col: 1, row: 1 },
    { stampId: 'counter-glass', col: 6, row: 1 },
    { stampId: 'poster-car', col: 8, row: 1 },
    { stampId: 'neon-open', col: 10, row: 1 },
    { stampId: 'window-night', col: 13, row: 1 },
    { stampId: 'fern', col: 1, row: 2 },
    { stampId: 'brochure-stand', col: 5, row: 2 },
    { stampId: 'water-cooler', col: 9, row: 2 },
    { stampId: 'fern', col: 14, row: 2 },
    { stampId: 'car-yellow', col: 2, row: 4 },
    { stampId: 'car-red', col: 11, row: 4 },
    { stampId: 'rug-red', col: 6, row: 6 },
    { stampId: 'fern', col: 1, row: 7 },
    { stampId: 'armchair', col: 2, row: 7 },
    { stampId: 'side-table', col: 3, row: 7 },
    { stampId: 'armchair', col: 4, row: 7 },
    { stampId: 'sofa-velvet', col: 11, row: 7 },
    { stampId: 'floor-lamp', col: 14, row: 7 },
  ],
  'pl-atelier': [
    { stampId: 'mannequin-gown', col: 1, row: 1 },
    { stampId: 'mannequin-suit', col: 2, row: 1 },
    { stampId: 'counter-concierge', col: 5, row: 1 },
    { stampId: 'painting-portrait', col: 9, row: 1 },
    { stampId: 'mirror-stand', col: 12, row: 1 },
    { stampId: 'rack-gowns', col: 1, row: 5 },
    { stampId: 'velvet-bench', col: 10, row: 5 },
    { stampId: 'mannequin-navy', col: 3, row: 3 },
    { stampId: 'side-table', col: 4, row: 7 },
    { stampId: 'plant-tall', col: 8, row: 7 },
  ],
  'pl-penthouse': [
    { stampId: 'bookshelf-dark', col: 1, row: 1 },
    { stampId: 'window-night', col: 3, row: 1 },
    { stampId: 'fireplace', col: 6, row: 1 },
    { stampId: 'painting-abstract', col: 9, row: 1 },
    { stampId: 'lift-doors', col: 12, row: 1 },
    { stampId: 'rug-blue', col: 5, row: 4 },
    { stampId: 'armchair', col: 4, row: 4 },
    { stampId: 'armchair', col: 8, row: 4 },
    { stampId: 'sofa-leather', col: 5, row: 6 },
    { stampId: 'card-table', col: 10, row: 4 },
    { stampId: 'bed-double', col: 1, row: 7 },
    { stampId: 'side-table', col: 3, row: 7 },
    { stampId: 'fish-tank', col: 7, row: 8 },
    { stampId: 'plant-tall', col: 13, row: 7 },
    { stampId: 'palm', col: 14, row: 8 },
  ],
  'pl-gym': [
    { stampId: 'window-sky', col: 3, row: 1 },
    { stampId: 'window-sky', col: 7, row: 1 },
    { stampId: 'lift-doors', col: 12, row: 1 },
    { stampId: 'treadmill', col: 1, row: 2 },
    { stampId: 'treadmill', col: 2, row: 2 },
    { stampId: 'treadmill', col: 3, row: 2 },
    { stampId: 'weight-rack', col: 6, row: 2 },
    { stampId: 'weight-bench', col: 2, row: 4 },
    { stampId: 'weight-bench', col: 9, row: 4 },
    { stampId: 'punching-bag', col: 13, row: 4 },
    { stampId: 'rug-green', col: 5, row: 4 },
    { stampId: 'weight-bench', col: 2, row: 6 },
    { stampId: 'punching-bag', col: 13, row: 6 },
    { stampId: 'rug-green', col: 5, row: 7 },
    { stampId: 'rug-green', col: 10, row: 7 },
    { stampId: 'water-cooler', col: 1, row: 8 },
    { stampId: 'plant-tall', col: 13, row: 8 },
  ],
  'pl-pool': [
    { stampId: 'window-sky', col: 3, row: 1 },
    { stampId: 'window-sky', col: 5, row: 1 },
    { stampId: 'lift-doors', col: 12, row: 1 },
    { stampId: 'lounger', col: 1, row: 2 },
    { stampId: 'cooler', col: 13, row: 2 },
    { stampId: 'lounger', col: 2, row: 8 },
    { stampId: 'lounger', col: 6, row: 8 },
    { stampId: 'lounger', col: 10, row: 8 },
    { stampId: 'plant-tall', col: 1, row: 9 },
    { stampId: 'plant-tall', col: 13, row: 9 },
  ],
  'pl-workroom': [
    { stampId: 'bookshelf-dark', col: 1, row: 1 },
    { stampId: 'bookshelf', col: 3, row: 1 },
    { stampId: 'window-night', col: 6, row: 1 },
    { stampId: 'clock', col: 9, row: 1 },
    { stampId: 'lift-doors', col: 12, row: 1 },
    { stampId: 'desk-study', col: 6, row: 4 },
    { stampId: 'desk-study', col: 10, row: 4 },
    { stampId: 'table-chairs', col: 2, row: 6 },
    { stampId: 'rug-red', col: 7, row: 6 },
    { stampId: 'sofa-leather', col: 8, row: 8 },
    { stampId: 'floor-lamp', col: 13, row: 8 },
    { stampId: 'plant-tall', col: 1, row: 9 },
    { stampId: 'plant-tall', col: 14, row: 9 },
  ],
  'pl-lift': [
    { stampId: 'palm', col: 1, row: 1 },
    { stampId: 'counter-concierge', col: 2, row: 1 },
    { stampId: 'lift-doors', col: 6, row: 1 },
    { stampId: 'painting-landscape', col: 9, row: 1 },
    { stampId: 'palm', col: 12, row: 1 },
    { stampId: 'luggage-cart', col: 11, row: 2 },
    { stampId: 'armchair', col: 1, row: 4 },
    { stampId: 'armchair', col: 12, row: 4 },
    { stampId: 'rug-red', col: 5, row: 4 },
    { stampId: 'side-table', col: 1, row: 5 },
    { stampId: 'floor-lamp', col: 12, row: 5 },
    { stampId: 'plant-tall', col: 1, row: 6 },
    { stampId: 'velvet-bench', col: 2, row: 6 },
    { stampId: 'velvet-bench', col: 10, row: 6 },
    { stampId: 'plant-tall', col: 12, row: 6 },
  ],
  home: [
    { stampId: 'kitchenette', col: 1, row: 1 },
    { stampId: 'window-brick', col: 4, row: 1 },
    { stampId: 'calendar', col: 6, row: 1 },
    { stampId: 'radiator', col: 7, row: 1 },
    { stampId: 'bookshelf', col: 8, row: 1 },
    { stampId: 'bed', col: 10, row: 2 },
    // A boat over the bed, the one window that sees sky, and the sofa under it.
    { stampId: 'poster-boat', col: 10, row: 1 },
    { stampId: 'window-sky', col: 12, row: 1, afterDark: 'window-night' },
    { stampId: 'sofa', col: 11, row: 2 },
    { stampId: 'rug-blue', col: 4, row: 4 },
    { stampId: 'table-chairs', col: 2, row: 4 },
    { stampId: 'tv', col: 8, row: 4 },
    { stampId: 'floor-lamp', col: 13, row: 4 },
    { stampId: 'rug-woven', col: 8, row: 5 },
    // Somewhere to sit, a plant, and the boxes from the move nobody unpacked.
    { stampId: 'armchair', col: 1, row: 6 },
    { stampId: 'crates', col: 12, row: 7 },
    { stampId: 'crates', col: 13, row: 7 },
    { stampId: 'crates', col: 13, row: 8 },
    { stampId: 'plant-tall', col: 1, row: 8 },
    { stampId: 'crates', col: 2, row: 8 },
    { stampId: 'coat-stand', col: 5, row: 8 },
  ],
  'marcus-house': [
    { stampId: 'bookshelf-dark', col: 1, row: 1 },
    { stampId: 'dartboard', col: 3, row: 1 },
    { stampId: 'window-garden', col: 4, row: 1 },
    { stampId: 'wall-shelf', col: 6, row: 1 },
    { stampId: 'painting-horse', col: 8, row: 1 },
    { stampId: 'calendar', col: 11, row: 1 },
    { stampId: 'kitchenette', col: 12, row: 1 },
    { stampId: 'table-chairs', col: 12, row: 3 },
    { stampId: 'rug-red', col: 6, row: 4 },
    { stampId: 'card-table', col: 5, row: 4 },
    { stampId: 'tv', col: 1, row: 5 },
    { stampId: 'fern', col: 14, row: 5 },
    { stampId: 'armchair', col: 1, row: 7 },
    { stampId: 'side-table', col: 10, row: 8 },
    { stampId: 'sofa', col: 11, row: 8 },
    { stampId: 'floor-lamp', col: 14, row: 8 },
    { stampId: 'crates', col: 1, row: 9 },
    { stampId: 'coat-stand', col: 5, row: 9 },
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
    { stampId: 'gas-silvercreek', col: 13, row: 14 },
    { stampId: 'inlay-sun', col: 14, row: 11 },
    { stampId: 'rocks-red', col: 5, row: 17 },
    { stampId: 'barrel-cactus', col: 3, row: 16 },
    { stampId: 'barrel-cactus', col: 26, row: 16 },
    { stampId: 'noticeboard', col: 29, row: 12 },
    // Tumbleweed on the boardwalk, a bench under the hotel, the gas station's tyres and the motel's boxes.
    { stampId: 'tumbleweed', col: 10, row: 7 },
    { stampId: 'tumbleweed', col: 22, row: 12 },
    { stampId: 'bench-rustic', col: 11, row: 6 },
    { stampId: 'woodpile', col: 22, row: 13 },
    { stampId: 'tyre-stack', col: 19, row: 16 },
    { stampId: 'crates', col: 25, row: 15 },
    { stampId: 'flowerbed-adobe-2', col: 8, row: 13 },
    { stampId: 'rocks-red', col: 29, row: 6 },
    { stampId: 'barrel-cactus', col: 2, row: 13 },
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
    // The yard between the diner and the outfitters, and the sand along the landing: what a river town leaves lying about.
    { stampId: 'crates', col: 9, row: 15 },
    { stampId: 'fish-rack', col: 11, row: 14 },
    { stampId: 'woodpile', col: 20, row: 15 },
    { stampId: 'bush-flowering', col: 22, row: 14 },
    { stampId: 'net-heap', col: 24, row: 6 },
    { stampId: 'crab-traps', col: 29, row: 6 },
    { stampId: 'flowerbed-timber-2', col: 2, row: 16 },
    { stampId: 'bush', col: 29, row: 16 },
    { stampId: 'bin', col: 12, row: 8 },
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
    // The promenade dressed: plane trees in grates, a hydrant, a bed under the phone; on the quay, the boats' leftovers.
    { stampId: 'tree-street', col: 10, row: 6 },
    { stampId: 'tree-street', col: 21, row: 6 },
    { stampId: 'hydrant', col: 12, row: 7 },
    { stampId: 'flowerbed-granite-2', col: 1, row: 7 },
    { stampId: 'bench-teak', col: 29, row: 7 },
    { stampId: 'crab-traps', col: 2, row: 13 },
    { stampId: 'net-heap', col: 3, row: 13 },
    { stampId: 'crates', col: 30, row: 13 },
    { stampId: 'bin', col: 13, row: 12 },
    { stampId: 'tree-street', col: 18, row: 12 },
    { stampId: 'fish-rack', col: 23, row: 13 },
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
    // Palms and beds over the sand, the hotel's trolley, a bench to watch the ferry from.
    { stampId: 'palm-tall', col: 25, row: 5 },
    { stampId: 'luggage-cart', col: 19, row: 5 },
    { stampId: 'bench-teak', col: 29, row: 6 },
    { stampId: 'palm-tall', col: 1, row: 6 },
    { stampId: 'flowerbed-coral-2', col: 2, row: 13 },
    { stampId: 'bush-flowering', col: 6, row: 14 },
    { stampId: 'crates', col: 26, row: 14 },
    { stampId: 'palm-tall', col: 12, row: 14 },
    { stampId: 'palm-tall', col: 20, row: 14 },
    { stampId: 'bin', col: 30, row: 13 },
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
    // Bollards round the fountain, palms and chrome along the frontages, papers by the casino door.
    { stampId: 'bollard', col: 12, row: 9 },
    { stampId: 'bollard', col: 16, row: 9 },
    { stampId: 'news-boxes', col: 2, row: 6 },
    { stampId: 'palm-planter', col: 1, row: 8 },
    { stampId: 'planter-chrome-2', col: 8, row: 16 },
    { stampId: 'bench-chrome', col: 15, row: 16 },
    { stampId: 'bin', col: 21, row: 16 },
    { stampId: 'hydrant', col: 30, row: 7 },
    { stampId: 'palm-planter', col: 23, row: 15 },
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
    // Cypresses at the ends of the pool, beds at the ends of the colonnades (never across the walk to the doors), planters down the middle.
    { stampId: 'cypress-pot', col: 1, row: 7 },
    { stampId: 'cypress-pot', col: 30, row: 7 },
    { stampId: 'planter-marble-2', col: 10, row: 13 },
    { stampId: 'planter-marble-2', col: 19, row: 13 },
    { stampId: 'flowerbed-granite-2', col: 2, row: 6 },
    { stampId: 'flowerbed-granite-2', col: 28, row: 6 },
    { stampId: 'cypress-pot', col: 15, row: 13 },
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
    { stampId: 'saguaro', col: 17, row: 1 },
    { stampId: 'parked-car-white-e', col: 6, row: 3 },
    { stampId: 'parked-car-red-w', col: 10, row: 3 },
    { stampId: 'welcome-mesa', col: 15, row: 3 },
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
/**
 * Every machine in a bank of slots can be played, not just the one a room's
 * hand-written POI happens to stand on. The bank's art is a stamp, so its
 * machines are derived from it: one 'slots' POI on the front of each cabinet,
 * unless something is already standing there.
 */
/** How full each house keeps its tables: the further up the run, the more exclusive, the busier. */
const CROWD: Record<string, number> = {
  'sc-floor': 0,
  'rb-boat': 0.2,
  'ch-cardroom': 0.4,
  'pc-casino': 0.6,
  'nm-casino': 0.8,
  'pl-casino': 1,
}

/**
 * A roulette table is drawn nearly as wide as its footprint, so its ends are
 * furniture too; left walkable, the player stands on the felt. Written here so
 * the casino maps need not repeat it by hand.
 */
function solidifyStamps(area: AreaDef) {
  for (const placed of area.stamps ?? []) {
    const stamp = STAMPS.find((st) => st.id === placed.stampId)
    if (!stamp || (stamp.id !== 'roulette' && stamp.id !== 'table-chairs')) continue
    stamp.tiles.split('\n').forEach((line, r) => {
      for (let c = 0; c < line.length; c++) {
        if (line[c] === 'F') area.map[placed.row + r][placed.col + c] = FURNITURE
      }
    })
  }
}

function addSlotMachines(area: AreaDef) {
  for (const placed of area.stamps ?? []) {
    if (!placed.stampId.startsWith('slot-bank')) continue
    const stamp = STAMPS.find((st) => st.id === placed.stampId)
    if (!stamp) continue
    const cols = stamp.tiles.split('\n')[0].length
    for (let i = 0; i < cols; i++) {
      const col = placed.col + i
      const row = placed.row + 1
      if (area.pois.some((p) => p.col === col && p.row === row)) continue
      area.pois.push({
        id: `${area.id}-slot-${col}-${row}`,
        name: 'Slot Machine',
        col,
        row,
        color: COLORS.flavor,
        art: 'none',
        labelled: false,
        lines: ['Three reels, one lever, and terrible odds.'],
        action: { kind: 'slots' },
      })
    }
  }
}

export const AREAS: Record<string, { area: AreaDef; cityId: CityId }> = (() => {
  const index: Record<string, { area: AreaDef; cityId: CityId }> = {}
  for (const city of Object.values(CITIES)) {
    for (const area of Object.values(city.areas)) {
      // Attached here rather than passed in, so there is one area object and
      // everything that already holds one sees its objects too.
      if (AREA_STAMPS[area.id]) area.stamps = AREA_STAMPS[area.id]
      if (OUTSKIRTS[area.id]) {
        area.stamps = OUTSKIRTS[area.id].stamps
        area.moonlit = true
      }
      solidifyStamps(area)
      addSlotMachines(area)
      if (CROWD[area.id] !== undefined) area.crowd = CROWD[area.id]
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
