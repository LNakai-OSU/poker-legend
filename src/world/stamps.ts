import type { PoiAction } from './types'

/**
 * Things bigger than a tile.
 *
 * A poker table in the overworld was four `FFFF` furniture tiles and a house was
 * a block of `#` with a `D` punched in it. Everything in the world that should
 * be an *object* was a patch of texture, which is why every casino floor read as
 * the same room: there was nothing in the game that was a poker table, only
 * tiles that were not walkable.
 *
 * A stamp is a named object with a footprint, its own art, and what it should be
 * wired up to when you place it. Placing one does three things:
 *
 *  1. writes its tiles into the grid — so collision, pathing, the content tests
 *     and everything else that reads the grid keep working with no changes at
 *     all, and a map still means something without any art;
 *  2. records itself, so the renderer can draw one object across the footprint
 *     rather than a grid of repeated textures;
 *  3. offers its wiring — a house comes with its doorway, a poker table comes
 *     with the table it seats you at.
 */

/** Which tray a stamp appears in. */
export type StampCategory = 'building' | 'casino' | 'street' | 'interior'

/** What placing a stamp offers to connect up. */
export type StampWiring =
  /** A doorway. The editor asks which area it leads to. */
  | { kind: 'exit'; at: { col: number; row: number }; label: string }
  /** Something to walk up to and interact with. The editor asks which one. */
  | { kind: 'poi'; at: { col: number; row: number }; name: string; action: PoiAction['kind'] }

export interface StampDef {
  id: string
  name: string
  category: StampCategory
  /**
   * The tiles it lays down, in the same characters a map is written in, plus
   * `?` for "leave whatever is already here".
   *
   * This is what makes the footprint real: the walls of a house are `#` and are
   * unwalkable because they are walls, not because a stamp said so. And `?` is
   * what stops a poker table laying a square of indoor floor down on a road —
   * only the felt itself is the table; the space around it belongs to the room
   * it was put in.
   */
  tiles: string
  /** A sentence about what it is for, shown in the editor. */
  about: string
  wiring?: StampWiring
}

/** A stamp that has been put somewhere. */
export interface PlacedStamp {
  stampId: string
  col: number
  row: number
}

/** In a stamp's tiles, "whatever is already here". */
export const KEEP = '?'

/** The footprint of a stamp, in tiles. */
export function stampSize(stamp: StampDef): { cols: number; rows: number } {
  const rows = stamp.tiles.split('\n').filter((row) => row.length > 0)
  return { cols: Math.max(...rows.map((row) => row.length)), rows: rows.length }
}

/**
 * The footprint of a building: solid wall, with a doorway in the bottom row at
 * `door` (counted from the left) if it has one you can go through. A building
 * whose door stays shut has its door drawn by its art and no `D` at all, so
 * nobody can walk onto a doorway that leads nowhere.
 */
function walls(cols: number, rows: number, door?: number): string {
  const solid = '#'.repeat(cols)
  const front = door === undefined ? solid : solid.slice(0, door) + 'D' + solid.slice(door + 1)
  return [...Array(rows - 1).fill(solid), front].join('\n')
}

/** A building of the town, with or without a door that opens. */
function building(
  id: string,
  name: string,
  about: string,
  cols: number,
  rows: number,
  door?: { col: number; label: string },
): StampDef {
  return {
    id,
    name,
    category: 'building',
    about,
    tiles: walls(cols, rows, door?.col),
    wiring: door ? { kind: 'exit', at: { col: door.col, row: rows - 1 }, label: door.label } : undefined,
  }
}

/** A row of slot machines, a stool in front of each: two solid rows, then the stools. */
function slots(id: string, name: string, about: string, cols: number): StampDef {
  return {
    id,
    name,
    category: 'casino',
    about,
    tiles: ['F'.repeat(cols), 'F'.repeat(cols), '?'.repeat(cols)].join('\n'),
    // On a machine, so it is played from the stool in front of it.
    wiring: { kind: 'poi', at: { col: 1, row: 1 }, name: 'Slot Machines', action: 'slots' },
  }
}

/** A six-seat table: felt three tiles by two, and the ring of chairs round it to stand in. */
function table6(id: string, name: string, about: string): StampDef {
  return {
    id,
    name,
    category: 'casino',
    about,
    tiles: ['?????', '?FFF?', '?FFF?', '?????'].join('\n'),
    wiring: { kind: 'poi', at: { col: 2, row: 0 }, name: 'Dealer', action: 'table' },
  }
}

/** A heads-up table: felt two tiles by one. */
function table4(id: string, name: string, about: string): StampDef {
  return {
    id,
    name,
    category: 'casino',
    about,
    tiles: ['????', '?FF?', '????'].join('\n'),
    wiring: { kind: 'poi', at: { col: 2, row: 0 }, name: 'Dealer', action: 'table' },
  }
}

/** Something that stands on the floor and is in the way: a pillar, a palm, a rope. */
function fixture(id: string, name: string, about: string, tiles: string[], category: StampCategory = 'interior'): StampDef {
  return { id, name, category, about, tiles: tiles.join('\n') }
}

/** Something hung on a back wall: it paints the wall and leaves it a wall. */
function onWall(id: string, name: string, about: string, cols = 1): StampDef {
  return { id, name, category: 'interior', about, tiles: '?'.repeat(cols) }
}

/**
 * Every stamp you can place.
 *
 * Deliberately a short list of things this game actually contains. A library of
 * a hundred generic props would be a worse version of a tileset; these are the
 * objects a poker town is made of.
 */
export const STAMPS: StampDef[] = [
  {
    id: 'poker-table',
    name: 'Poker table',
    category: 'casino',
    about: 'An oval felt with seats round it. Walk up to the rail to sit down.',
    tiles: ['????', '?FF?', '????'].join('\n'),
    // Behind the table rather than on the felt, where a dealer stands.
    wiring: { kind: 'poi', at: { col: 2, row: 0 }, name: 'Dealer', action: 'table' },
  },
  // --- Gaming floors ----------------------------------------------------------
  slots('slot-bank', 'Slot bank', 'Four machines in red, blue and green, a stool at each.', 4),
  slots('slot-bank-6', 'Long slot bank', 'Six machines in a row.', 6),
  slots('slot-bank-western', 'Saloon slots', 'Red and green machines, saddle-leather stools.', 4),
  slots('slot-bank-brass', 'Riverboat slots', 'Green, red and burgundy machines with brass trim.', 4),
  slots('slot-bank-island', 'Island slots', 'Blue, green and red machines, cane stools.', 4),
  slots('slot-bank-reef', 'Reef slots', 'Coral, seafoam and sunshine machines, cane stools.', 4),
  slots('slot-bank-ivory', 'Salon slots', 'Ivory and burgundy machines in gold, without the jackpot board.', 4),
  slots('slot-bank-neon', 'Neon slots', 'Black cabinets with pink and cyan toppers.', 5),
  {
    ...slots('slot-bank-jackpot', 'Progressive bank', 'Six neon machines under a JACKPOT board counting up.', 6),
  },
  slots('slot-bank-gold', 'Gold progressive', 'Ivory and burgundy machines under a JACKPOT board.', 4),
  table6('poker-table-6', 'Poker table', 'Six seats round a green felt, a padded rail, the dealer at the top.'),
  table6('poker-table-brass', 'Riverboat table', 'Green felt under a brass rail.'),
  table6('poker-table-baize', 'Card-room table', 'Bottle-green baize with a gold line, mahogany rail.'),
  table4('poker-table-baize-4', 'Card-room heads-up', 'Two seats facing across the baize.'),
  table6('poker-table-teal', 'Island table', 'Teal felt in a cane rail.'),
  table6('poker-table-neon', 'Strip table', 'Purple felt, a black rail edged in neon.'),
  table4('poker-table-neon-4', 'Strip heads-up', 'Purple felt for two.'),
  table6('poker-table-royal', 'Salon table', 'Burgundy felt, a gold rail, ivory chairs.'),
  table4('poker-table-royal-4', 'Salon heads-up', 'Burgundy and gold for two.'),
  {
    id: 'craps-pit',
    name: 'Craps table',
    category: 'casino',
    about: 'The long table, with room to stand along both sides.',
    tiles: ['?????', '?FFF?', '?????'].join('\n'),
    wiring: { kind: 'poi', at: { col: 2, row: 0 }, name: 'Craps Table', action: 'craps' },
  },
  {
    id: 'craps-table',
    name: 'Big craps table',
    category: 'casino',
    about: 'A full craps tub: pass line, field, the numbers and the proposition boxes.',
    tiles: ['?????', '?FFF?', '?FFF?', '?????'].join('\n'),
    wiring: { kind: 'poi', at: { col: 2, row: 0 }, name: 'Craps Table', action: 'craps' },
  },
  {
    id: 'craps-table-neon',
    name: 'Strip craps table',
    category: 'casino',
    about: 'A craps tub in purple felt.',
    tiles: ['?????', '?FFF?', '?FFF?', '?????'].join('\n'),
    wiring: { kind: 'poi', at: { col: 2, row: 0 }, name: 'Craps Table', action: 'craps' },
  },
  fixture('roulette', 'Roulette', 'The wheel at one end, the layout at the other.', ['????', '?FF?', '????'], 'casino'),
  {
    id: 'cashier-cage',
    name: 'Cashier cage',
    category: 'casino',
    about: 'Against the back wall: the cashier behind brass bars, the counter in front.',
    tiles: ['FFFFF', 'FFFFF'].join('\n'),
    wiring: { kind: 'poi', at: { col: 2, row: 1 }, name: 'Cashier', action: 'flavor' },
  },
  fixture('bar', 'Bar', 'Back bar on the wall, the counter, stools. The bartender stands behind it.', ['FFFFF', 'FFFFF', '?????']),
  fixture('bar-brass', 'Saloon bar', 'Brass rail, bottles in a mirror.', ['FFFFF', 'FFFFF', '?????']),
  fixture('bar-tiki', 'Tiki bar', 'Cane and pale wood.', ['FFFFF', 'FFFFF', '?????']),
  fixture('bar-neon', 'Neon bar', 'Black and violet.', ['FFFFF', 'FFFFF', '?????']),
  fixture('bar-marble', 'Marble bar', 'A marble top over dark wood.', ['FFFFF', 'FFFFF', '?????']),
  fixture('pillar-wood', 'Timber post', 'A plain wooden post.', ['F', 'F']),
  fixture('pillar-brass', 'Brass column', 'Fluted brass.', ['F', 'F']),
  fixture('pillar-marble', 'Marble column', 'White marble with a gold capital.', ['F', 'F']),
  fixture('pillar-neon', 'Neon column', 'Black, ringed in neon.', ['F', 'F']),
  fixture('pillar-bamboo', 'Bamboo post', 'A bundle of bamboo.', ['F', 'F']),
  fixture('pillar-green', 'Green marble column', 'Green marble with a brass capital.', ['F', 'F']),
  fixture('palm', 'Potted palm', 'Two tiles of palm in a terracotta pot.', ['F', 'F']),
  fixture('fern', 'Fern', 'A fern in a brass pot.', ['F']),
  fixture('velvet-rope', 'Velvet rope', 'Brass posts and a red rope.', ['FFF']),
  fixture('light-pool', 'Pool of light', 'Light from a chandelier on the floor. You can walk through it.', ['???', '???', '???']),
  fixture('prize-car', 'Prize car', 'A convertible with a bow on it, turning on a lit plinth under a WIN ME sign.', ['FFF', 'FFF'], 'casino'),
  {
    id: 'change-booth',
    name: 'Change booth',
    category: 'casino',
    about: 'A glass kiosk out on the floor, a cashier inside and CHANGE lit on the roof. Faces down.',
    tiles: ['FFF', 'FFF'].join('\n'),
    wiring: { kind: 'poi', at: { col: 1, row: 1 }, name: 'Change Booth', action: 'flavor' },
  },
  // --- On the wall ---------------------------------------------------------------
  onWall('window-brick', 'Window (brick view)', 'Curtains, and the wall of the next building four feet away.', 2),
  onWall('window-sky', 'Window (sky)', 'Curtains and blue sky.', 2),
  onWall('window-sea', 'Window (sea)', 'Curtains and the water.', 2),
  onWall('window-garden', 'Window (garden)', 'Curtains and a garden.', 2),
  onWall('window-night', 'Window (the Strip)', 'Curtains and the lights outside.', 2),
  onWall('painting-landscape', 'Landscape', 'Hills in a gilt frame.', 2),
  onWall('painting-portrait', 'Portrait', 'Somebody who owned the place once.', 2),
  onWall('painting-ship', 'Ship painting', 'A steamer under sail.', 2),
  onWall('painting-horse', 'Horse painting', 'A horse on a ranch.', 2),
  onWall('painting-abstract', 'Abstract', 'Coloured squares in a black frame.', 2),
  onWall('porthole', 'Porthole', 'Brass, with the river in it.'),
  onWall('clock', 'Clock', 'Nearly midnight. It always is.'),
  onWall('neon-open', 'OPEN sign', 'Red neon.', 2),
  onWall('neon-bar', 'BAR sign', 'Cyan neon.', 2),
  onWall('neon-vip', 'VIP sign', 'Pink neon.', 2),
  onWall('neon-cocktails', 'COCKTAILS sign', 'Yellow neon.', 3),
  onWall('menu-diner', 'Diner menu', 'Pie and coffee.', 2),
  onWall('menu-grill', 'Grill menu', 'The catch, and rum.', 2),
  onWall('prices-laundry', 'Price board', 'What a wash costs.', 2),
  onWall('trophy-fish', 'Mounted fish', 'Over the counter of anywhere near water.', 2),
  onWall('life-ring', 'Life ring', 'Red and white.'),
  onWall('door-back-room', 'Unmarked door', 'A door in the wall with nothing on it.'),
  onWall('door-staff', 'Staff door', 'Grey, with a kick plate.'),
  onWall('door-vip', 'VIP door', 'Black, gold frame, a plate on it.'),
  onWall('lift-doors', 'Lift doors', 'Brass doors, a dial over them.', 2),
  onWall('radiator', 'Radiator', 'Cast iron, painted over too many times.'),
  // --- A home ---------------------------------------------------------------------
  fixture('bed', 'Bed', 'A single bed, head to the wall.', ['F', 'F']),
  fixture('bed-double', 'Double bed', 'Two pillows.', ['FF', 'FF']),
  fixture('tv', 'Television', 'On a low stand, picture on.', ['F']),
  fixture('kitchenette', 'Kitchenette', 'A fridge, a sink, a stove, cupboards over. Against the back wall.', ['FFF', 'FFF']),
  fixture('bookshelf', 'Bookshelf', 'Coloured spines on four shelves. Against the back wall.', ['FF', 'FF']),
  fixture('bookshelf-dark', 'Dark bookshelf', 'Older books, darker wood.', ['FF', 'FF']),
  fixture('table-chairs', 'Table and chairs', 'A small table with two chairs pulled up.', ['FF', '??']),
  fixture('rug-red', 'Red rug', 'Walk on it.', ['???', '???']),
  fixture('rug-blue', 'Blue rug', 'Walk on it.', ['???', '???']),
  fixture('rug-green', 'Green rug', 'Walk on it.', ['???', '???']),
  fixture('rug-woven', 'Woven rug', 'Stepped diamonds in red, black, cream and turquoise. Walk on it.', ['????', '????', '????']),
  fixture('sofa', 'Sofa', 'Facing into the room.', ['FFF']),
  fixture('sofa-leather', 'Leather sofa', 'Buttoned, brown.', ['FFF']),
  fixture('sofa-velvet', 'Velvet sofa', 'Purple, gold feet.', ['FFF']),
  fixture('card-table', 'Card table', 'A folding table with felt on it and folding chairs round it.', ['?????', '?FFF?', '?????']),
  // --- Shops ----------------------------------------------------------------------
  fixture('shelves-groceries', 'Grocery shelves', 'Floor to ceiling. Against the back wall.', ['FF', 'FF']),
  fixture('shelves-souvenirs', 'Souvenir shelves', 'Turquoise and silver.', ['FF', 'FF']),
  fixture('shelves-outdoor', 'Outfitter shelves', 'Boots, rope, tins.', ['FF', 'FF']),
  fixture('shelves-shoes', 'Shoe shelves', 'Black and brown leather.', ['FF', 'FF']),
  fixture('gondola-groceries', 'Shelf island', 'Stocked both sides.', ['FFF', 'FFF']),
  fixture('gondola-gifts', 'Gift island', 'Things nobody needs.', ['FFF', 'FFF']),
  fixture('cooler', 'Cooler', 'Lit glass doors full of drinks. Against the back wall.', ['FF', 'FF']),
  fixture('counter-till', 'Counter with till', 'The clerk stands behind it. Back row on the wall.', ['FFF', 'FFF']),
  fixture('counter-glass', 'Glass counter', 'A display case; the clerk behind it.', ['FFF', 'FFF']),
  fixture('counter-concierge', 'Concierge desk', 'Marble and gold, a bell.', ['FFF', 'FFF']),
  fixture('rack-suits', 'Rail of suits', 'Charcoal and navy.', ['FF']),
  fixture('rack-linen', 'Rail of linen', 'Pastels.', ['FF']),
  fixture('rack-blankets', 'Blanket rail', 'Wool blankets folded over a rail.', ['FF']),
  fixture('pottery-table', 'Pottery table', 'Clay pots and a turquoise bowl on a low table.', ['FF']),
  fixture('rack-outdoor', 'Rail of jackets', 'Waxed cotton.', ['FF']),
  fixture('rack-gowns', 'Rail of gowns', 'Red, black and ivory.', ['FF']),
  fixture('mannequin-suit', 'Dummy in a suit', 'Charcoal.', ['F', 'F']),
  fixture('mannequin-navy', 'Dummy in navy', 'Navy.', ['F', 'F']),
  fixture('mannequin-gown', 'Dummy in a gown', 'Red.', ['F', 'F']),
  fixture('mirror-stand', 'Standing mirror', 'Full length.', ['F', 'F']),
  // --- The launderette, the diner -------------------------------------------------
  fixture('dryer-stack', 'Washers and dryers', 'Dryers stacked over washers, against the wall.', ['FFFF', 'FFFF']),
  fixture('washer-row', 'Washers', 'Free-standing.', ['FFFF']),
  fixture('folding-table', 'Folding table', 'A basket of laundry on it.', ['FFF']),
  fixture('booth', 'Booth', 'Red vinyl either side of a table.', ['FF', 'FF']),
  fixture('jukebox', 'Jukebox', 'Bubble tubes and chasing lights.', ['F', 'F']),
  fixture('diner-counter', 'Diner counter', 'Coffee on the back wall, pie on the counter, stools in front.', ['FFFFF', 'FFFFF', '?????']),
  // --- Showrooms ------------------------------------------------------------------
  fixture('car-red', 'Car (red)', 'On a turntable.', ['FFF', 'FFF']),
  fixture('car-yellow', 'Car (yellow)', 'On a turntable.', ['FFF', 'FFF']),
  fixture('car-silver', 'Car (silver)', 'On a turntable.', ['FFF', 'FFF']),
  fixture('speedboat', 'Speedboat', 'On its trailer.', ['FFFF', 'FFFF']),
  // --- Clubs and dining rooms -----------------------------------------------------
  fixture('dining-table', 'Dining table', 'White cloth, a candle, four chairs.', ['???', '?F?', '???']),
  fixture('dining-table-cane', 'Cane dining table', 'White cloth, cane chairs.', ['???', '?F?', '???']),
  fixture('piano', 'Grand piano', 'Lid up.', ['FFF', 'FFF']),
  fixture('fireplace', 'Fireplace', 'Marble, the fire going, a mirror over. Against the back wall.', ['FFF', 'FFF']),
  fixture('dance-floor', 'Dance floor', 'Squares lit in turns. Walk on it.', ['????', '????', '????']),
  fixture('dj-booth', 'DJ booth', 'Decks and blinking lights.', ['FFF', 'FFF']),
  fixture('cactus', 'Cactus', 'A barrel cactus in a pot.', ['F']),
  fixture('velvet-bench', 'Velvet bench', 'Red velvet on gold feet.', ['FF']),
  {
    id: 'townhouse',
    name: 'Townhouse',
    category: 'building',
    about: 'A narrow house with its own front door.',
    tiles: ['#####', '#####', '#####', '##D##'].join('\n'),
    wiring: { kind: 'exit', at: { col: 2, row: 3 }, label: 'Door' },
  },
  {
    id: 'shopfront',
    name: 'Shopfront',
    category: 'building',
    about: 'A wider building with a window either side of the door.',
    tiles: ['######', '######', '######', '###D##'].join('\n'),
    wiring: { kind: 'exit', at: { col: 3, row: 3 }, label: 'Shop' },
  },
  // --- Basin ---------------------------------------------------------------
  building('bakery-basin', 'Bakery, flats over', 'Your building: the bakery downstairs and your door beside it.', 7, 4, { col: 4, label: 'Home' }),
  building('house-basin-a', 'Basin terrace house', 'Red brick under red shingle, a window box, a door that stays shut.', 5, 4),
  building('pawn-basin', 'Pawnbroker', 'Three gold balls and a grille over the window.', 5, 4),
  building('tenement-basin', 'Walk-up', 'Three floors, a fire escape and a water tank on the roof.', 5, 4),
  building('checks-basin', 'Checks Cashed', 'A yellow sign, barred windows, OPEN buzzing in the glass.', 6, 4),
  building('house-basin-b', 'Clapboard house', 'Pale blue boards, a slate roof with a dormer in it.', 5, 4),
  building('bingo-basin', 'Bingo hall', 'A long low hall with a marquee that never stops chasing.', 11, 4),
  building('patels', "Patel's", 'The corner shop: green awning, fruit out front, ice by the door.', 6, 4, { col: 3, label: "Patel's" }),
  building('barber-seventh', 'Barber', 'The pole turning, a chair in the window.', 5, 4),
  building('laundromat', 'Laundromat', 'A row of washers behind the glass and steam off the roof.', 6, 4, { col: 2, label: 'Laundromat' }),
  building('hotel-seventh', 'Cheap hotel', 'Its name down the corner in red neon.', 5, 4),
  building('diner-blueplate', 'The Blue Plate', 'A stainless diner with its name on the roof.', 7, 3, { col: 3, label: 'The Blue Plate' }),
  building('donuts-seventh', 'Doughnut shop', 'A giant doughnut on the roof.', 6, 3),
  building('garage-seventh', 'Auto repair', 'Two bays, tyres stacked by the office.', 9, 3),
  building('house-eastgate-a', 'Porch house', 'Cream boards, green shutters, a porch over the door.', 5, 4),
  building('house-marcus', "Marcus's house", 'Gable end to the street, porch light on, a note on the door.', 5, 4, { col: 2, label: "Marcus's" }),
  building('house-eastgate-b', 'Bay-window house', 'Yellow brick, a dish on the wall.', 5, 4),
  building('cottage-eastgate', 'Cottage', 'More roof than house.', 4, 3),
  building('lockup-eastgate', 'Lock-up garages', 'Two roll-up doors, one of them tagged.', 4, 3),
  // --- Silver Creek ----------------------------------------------------------
  building('casino-silvercreek', 'Silver Creek Casino', 'A Western false front, its name in lights, a red carpet down to the forecourt.', 13, 5, { col: 6, label: 'Casino' }),
  building('hotel-silvercreek-w', 'Hotel wing', 'Pueblo adobe with a shaded portal; the hotel side.', 7, 4),
  building('hotel-silvercreek-e', 'Buffet wing', 'Pueblo adobe with a shaded portal; the buffet side.', 7, 4),
  building('giftshop-silvercreek', 'Trading post', 'GIFTS on a timber false front, a porch, a cactus in a pot.', 5, 3, { col: 2, label: 'Gift Shop' }),
  building('gas-silvercreek', 'Gas station', 'An adobe office, and two red pumps under a canopy that is lit at night.', 6, 3),
  building('motel-silvercreek', 'Motel office', 'A tall sign buzzing VACANCY.', 5, 3),
  // --- Riverbend -------------------------------------------------------------
  {
    id: 'riverboat',
    name: 'Riverboat',
    category: 'building',
    about: 'A stern-wheeler moored at the quay, its gangway down to the boards. Put it on the water.',
    tiles: ['??????##????', '??#######???', '?#########??', '?#########??', '???????D????'].join('\n'),
    wiring: { kind: 'exit', at: { col: 7, row: 4 }, label: 'Riverboat' },
  },
  building('diner-riverbend', 'The Landing Diner', 'Blue clapboard, a tin porch, EAT pointing at the door.', 6, 3, { col: 2, label: 'Diner' }),
  building('outfitters-riverbend', 'Dockside Outfitters', 'Barn-red boards, canoes on end against the wall.', 6, 3, { col: 3, label: 'Outfitters' }),
  // --- Crescent Harbor -------------------------------------------------------
  building('club-harbor', 'The Harbour Room', 'Oxblood brick, brass lamps, black railings and no name on the door.', 5, 5, { col: 2, label: 'The Harbour Room' }),
  building('supper-harbor', 'Supper club', 'Art deco limestone with a blade sign and a marquee in bulbs.', 5, 5, { col: 2, label: 'Supper Club' }),
  building('cardroom-harbor', 'Harbor Card Room', 'Stone, a mansard of dormers, a portico with its name on the frieze.', 7, 5, { col: 3, label: 'Card Room' }),
  building('menswear-harbor', 'Tailor', 'A narrow green shopfront with two suits in the window.', 5, 5, { col: 2, label: 'Menswear' }),
  building('autorow-harbor', 'Auto Row', 'A sawtooth showroom with cars behind the glass.', 8, 5, { col: 2, label: 'Auto Row' }),
  // --- Palm Cay --------------------------------------------------------------
  building('marina-palmcay', 'Marina Motors', 'A white boathouse with a speedboat in the bay.', 6, 4, { col: 3, label: 'Marina Motors' }),
  building('casino-palmcay', 'The Cay Room', 'Pink render, a Mission gable, an arcade, torches at the door.', 9, 5, { col: 4, label: 'Cay Room' }),
  building('hotel-palmcay', 'Resort hotel', 'Lemon render and striped balcony awnings.', 8, 4),
  building('boutique-palmcay', 'Cay Boutique', 'Mint render and a sun hat in the window.', 5, 3, { col: 2, label: 'Boutique' }),
  building('grill-palmcay', 'Shoreline Grill', 'A thatched shack with a surfboard for a sign.', 5, 3, { col: 2, label: 'Shoreline Grill' }),
  // --- Neon Mesa -------------------------------------------------------------
  building('casino-mesa', 'Mesa Casino', 'MESA in pink neon the width of the building, a marquee, a red carpet.', 11, 6, { col: 5, label: 'Mesa Casino' }),
  building('luxury-mesa', 'Mesa Luxury', 'Black glass ruled in gold, a watch spot-lit in the window.', 5, 6, { col: 2, label: 'Mesa Luxury' }),
  building('motors-mesa', 'Mesa Motors', 'Parking decks over a showroom with a car on a turntable.', 7, 6, { col: 3, label: 'Mesa Motors' }),
  building('club-mesa', 'Ultraviolet', 'Black, UV neon, searchlights, a rope to queue behind.', 7, 6, { col: 3, label: 'Ultraviolet' }),
  building('tower-mesa-a', 'Aria tower', 'A hotel tower across the Strip, helipad on the roof.', 10, 4),
  building('garage-mesa', 'Parking garage', 'Decks of cars under a WIN BIG billboard.', 10, 4),
  building('tower-mesa-b', 'Desert Rose tower', 'A rose-gold tower across the Strip.', 10, 4),
  // --- Porto Lumina ----------------------------------------------------------
  building('tower-lumina', 'Penthouse tower', 'Marble and glass, a lit crown, the lift lobby at its foot.', 6, 6, { col: 2, label: 'Penthouse Lift' }),
  building('casino-lumina', 'Casino Lumina', 'A verdigris dome, six columns, marble steps to the water.', 11, 6, { col: 5, label: 'Casino' }),
  building('atelier-lumina', 'Lumina Atelier', 'A mansard, iron balconies, ATELIER in gold on black lacquer.', 7, 6, { col: 3, label: 'Atelier' }),
  building('hotel-lumina', 'Grand Hotel', 'An arcade of arches the length of the block.', 26, 3),
  {
    id: 'bus-shelter',
    name: 'Bus shelter',
    category: 'street',
    about: 'Somewhere to wait, with the route pasted inside.',
    tiles: ['###', '???'].join('\n'),
  },
  {
    id: 'fountain',
    name: 'Fountain',
    category: 'street',
    about: 'A basin you can walk all the way round.',
    tiles: ['+++', '+~+', '+++'].join('\n'),
  },
  {
    id: 'parked-car',
    name: 'Parked car',
    category: 'street',
    about: 'At the kerb, facing down the street.',
    tiles: ['F', 'F'].join('\n'),
  },
  {
    id: 'planter',
    name: 'Planter',
    category: 'street',
    about: 'A raised bed, for breaking up a long pavement.',
    tiles: ['**', '**'].join('\n'),
  },
]

// ---------------------------------------------------------------------------
// The street: lamps, benches, planting, fences, cars — each town's own
// ---------------------------------------------------------------------------

/** Something standing on the pavement: solid where it stands, `?` over it where it only rises. */
function streetThing(id: string, name: string, about: string, tiles: string[]): StampDef {
  return { id, name, category: 'street', about, tiles: tiles.join('\n') }
}

/** A lamp post: you cannot walk through its foot, but you can walk behind its lantern. */
const lamp = (id: string, name: string, about: string) => streetThing(id, name, about, ['?', 'o'])

const FENCE_KINDS: Array<[string, string, string]> = [
  ['picket', 'Picket fence', 'White pickets on two rails. Basin and the river.'],
  ['rope', 'Rope and posts', 'Rope slung between brass-capped posts. The harbour and the marina.'],
  ['chrome', 'Chrome rail', 'Polished rails on short posts, lit underneath. The Strip.'],
]

/** Kept in step with the art's list of colours; a car with no art would be a solid hole in the road. */
const CAR_COLOURS = ['red', 'blue', 'white', 'yellow', 'green', 'black', 'silver', 'teal']

const STREET_FURNITURE: StampDef[] = [
  lamp('lamp-iron', 'Lamp post (Basin)', 'Cast iron, a four-paned lantern, a bar for the lamplighter\'s ladder.'),
  lamp('lamp-western', 'Lantern post (Silver Creek)', 'A timber post with a lantern hung off an iron bracket.'),
  lamp('lamp-quay', 'Gas lamp (Riverbend)', 'Bottle green, a square lantern under a pointed cap.'),
  lamp('lamp-harbor', 'Lamp standard (Harbour)', 'Black iron, two arms, two white globes.'),
  lamp('lamp-tiki', 'Tiki torch (Palm Cay)', 'Bamboo, and a real flame.'),
  lamp('lamp-chrome', 'Light mast (Neon Mesa)', 'Chrome, a light bar on top, a ring of neon halfway up.'),
  lamp('lamp-gilded', 'Lantern standard (Porto Lumina)', 'Black and gold, three lanterns on scrolled arms.'),
  streetThing('bench-park', 'Park bench', 'Green slats on iron ends.', ['oo']),
  streetThing('bench-rustic', 'Rustic bench', 'Planed timber, weathered.', ['oo']),
  streetThing('bench-teak', 'Teak bench', 'Teak slats on steel, for the waterfront.', ['oo']),
  streetThing('bench-chrome', 'Chrome bench', 'Steel and chrome, a neon strip under the seat.', ['oo']),
  streetThing('bench-stone', 'Marble bench', 'A dressed block of marble.', ['oo']),
  streetThing('mailbox', 'Mailbox', 'Blue, on its legs, collection at five.', ['o']),
  streetThing('hydrant', 'Fire hydrant', 'Red, chained caps.', ['o']),
  streetThing('news-boxes', 'Newspaper boxes', 'Red and blue, this morning\'s front page.', ['o']),
  streetThing('bin', 'Litter bin', 'Municipal green.', ['o']),
  streetThing('bollard', 'Bollard', 'Steel, with a reflective band.', ['o']),
  streetThing('bollard-mooring', 'Mooring bollard', 'Cast iron on the quay, rope coiled at its foot.', ['o']),
  streetThing('noticeboard', 'Noticeboard', 'Flyers pinned three deep.', ['o']),
  streetThing('phone-box', 'Telephone box', 'Red, glazed, a light in its roof.', ['?', 'o']),
  streetThing('flowerbed-brick-2', 'Brick flower bed', 'A raised bed in a brick border.', ['oo']),
  streetThing('flowerbed-brick-3', 'Long brick flower bed', 'A raised bed in a brick border.', ['ooo']),
  streetThing('flowerbed-adobe-2', 'Adobe planter', 'Agave and desert marigolds in an adobe bed.', ['oo']),
  streetThing('flowerbed-timber-2', 'Timber planter', 'Daisies in a timber box.', ['oo']),
  streetThing('flowerbed-granite-2', 'Granite planter', 'Blue and white in a granite trough.', ['oo']),
  streetThing('flowerbed-coral-2', 'Coral-stone planter', 'Hibiscus in a coral-stone bed.', ['oo']),
  streetThing('planter-chrome-2', 'Chrome planter', 'Succulents in black and chrome, lit from under the rim.', ['oo']),
  streetThing('planter-marble-2', 'Marble trough', 'Clipped box in a marble trough.', ['oo']),
  streetThing('bush', 'Bush', 'Round, two greens.', ['o']),
  streetThing('bush-flowering', 'Flowering bush', 'Round, in flower.', ['o']),
  streetThing('hedge-2', 'Hedge', 'Clipped box, two long.', ['oo']),
  streetThing('hedge-3', 'Long hedge', 'Clipped box, three long.', ['ooo']),
  ...FENCE_KINDS.flatMap(([kind, name, about]) =>
    [2, 3, 4, 5, 6].map((n) => streetThing(`fence-${kind}-${n}`, `${name} (${n})`, about, ['o'.repeat(n)])),
  ),
  streetThing('tree-street', 'Street tree', 'A round broadleaf in an iron grate.', ['?', 'o']),
  streetThing('palm-tall', 'Coconut palm', 'Tall, leaning, fronds every way.', ['?', 'o']),
  streetThing('palm-planter', 'Fan palm in a planter', 'Chrome-rimmed, uplit.', ['?', 'o']),
  streetThing('cypress-pot', 'Cypress', 'A tall Italian cypress in a marble urn.', ['?', 'o']),
  streetThing('saguaro', 'Saguaro', 'Arms raised, a flower on top.', ['?', 'o']),
  streetThing('barrel-cactus', 'Barrel cacti', 'A clump of them among stones.', ['o']),
  streetThing('rocks-red', 'Red rocks', 'Weathered sandstone.', ['o']),
  streetThing('rocks-red-2', 'Red boulders', 'Weathered sandstone, three of them.', ['oo']),
  ...CAR_COLOURS.flatMap((colour) =>
    (['e', 'w'] as const).map((facing) =>
      streetThing(
        `parked-car-${colour}-${facing}`,
        `Parked car (${colour}, facing ${facing === 'e' ? 'east' : 'west'})`,
        'Three squares of kerb. Put it in the lane by the pavement.',
        ['FFF'],
      ),
    ),
  ),
  streetThing('fountain-mesa', 'Strip fountain', 'Jets dancing in turn, lit from under the water. Lay it over a pool six by two.', [
    '~~~~~~',
    '~~~~~~',
  ]),
  streetThing('inlay-sun', 'Sun inlay', 'A terracotta sun in a ring of turquoise, laid into the paving. Walk across it.', [
    '???',
    '???',
    '???',
  ]),
  streetThing('welcome-mesa', 'Welcome sign', 'WELCOME TO NEON MESA on a diamond in bulbs, on two legs. You can stand between them.', [
    '???',
    'o?o',
  ]),
  streetThing('billboard-mesa', 'Billboard', 'NEON MESA over a desert sunset, on two legs. You can stand between them.', [
    '???',
    'o?o',
  ]),
  streetThing('fountain-lumina', 'Lumina fountain', 'A gilded figure on a plinth, jets arcing in. Over a pool fourteen by two.', [
    '~'.repeat(14),
    '~'.repeat(14),
  ]),
]

STAMPS.push(...STREET_FURNITURE)

export const STAMP_BY_ID: Record<string, StampDef> = Object.fromEntries(
  STAMPS.map((stamp) => [stamp.id, stamp]),
)

export function findStamp(id: string): StampDef | undefined {
  return STAMP_BY_ID[id]
}
