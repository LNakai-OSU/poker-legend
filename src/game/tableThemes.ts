import type { CardBack } from './pixel/cards'
import type { TableDef, TableThemeId } from '../world/types'

/**
 * Every room you play poker in, as a set of materials.
 *
 * The felt used to be the same green oval in every venue, on the same flat navy,
 * so climbing from a reservation casino to a marble salon changed nothing but
 * the blinds. A theme is the room: what the table is made of — cloth, rail,
 * trim, the emblem printed on it — what is behind it, how the house prints its
 * cards, and the colour of the panels laid over it all.
 *
 * Rooms differ in what is in them, not only in colour (rule 6 of the bible):
 * the painters in `pixel/rooms.ts` give each one its own furniture.
 */

export type Emblem = 'none' | 'horseshoe' | 'wheel' | 'compass' | 'palm' | 'star' | 'sunburst' | 'crown' | 'laurel'

export interface TableTheme {
  id: TableThemeId
  table: {
    shape: 'oval' | 'kitchen'
    /** The cloth, under the lamp, and where it falls into the rail's shadow. */
    felt: string
    feltLight: string
    feltDark: string
    /** The printed betting line. */
    line: string
    rail: string
    railLight: string
    railDark: string
    railStyle: 'leather' | 'wood' | 'rattan' | 'gloss' | 'gold'
    /** The strip between rail and cloth. */
    trim: string
    trimStyle: 'solid' | 'rope' | 'studs' | 'neon'
    emblem: Emblem
  }
  cardBack: CardBack
  /** The panels laid over the room: seat plates, the pot, the betting menu. */
  ui: {
    outline: string
    /** The coloured inner border every GBA box has. */
    band: string
    fill: string
    /** Behind the faces in the seat plates. */
    portraitBg: string
    /** What lights up for the seat whose turn it is. */
    accent: string
  }
}

export const TABLE_THEMES: Record<TableThemeId, TableTheme> = {
  // Marcus's flat: a kitchen table under one lamp, a blue drugstore deck.
  home: {
    id: 'home',
    table: {
      shape: 'kitchen',
      felt: '#a8743f',
      feltLight: '#c48d52',
      feltDark: '#7a4f2a',
      line: '#8f5f33',
      rail: '#6a4220',
      railLight: '#8a5a30',
      railDark: '#4a2c14',
      railStyle: 'wood',
      trim: '#5e3a1e',
      trimStyle: 'solid',
      emblem: 'none',
    },
    cardBack: { base: '#2848a8', pattern: '#4a70d0', border: '#f8f8f0', motif: 'lattice' },
    ui: { outline: '#2a2018', band: '#c89060', fill: '#f8f0e0', portraitBg: '#e8c890', accent: '#f8c848' },
  },
  // A reservation casino off the highway: dusty cloth, worn wood, a rope rail.
  silvercreek: {
    id: 'silvercreek',
    table: {
      shape: 'oval',
      felt: '#4f7044',
      feltLight: '#668a52',
      feltDark: '#3a5530',
      line: '#86a064',
      rail: '#8a5a32',
      railLight: '#b07a46',
      railDark: '#5a3618',
      railStyle: 'wood',
      trim: '#d8c08a',
      trimStyle: 'rope',
      emblem: 'horseshoe',
    },
    cardBack: { base: '#a82830', pattern: '#d04848', border: '#f8f0e0', motif: 'lattice' },
    ui: { outline: '#2a1810', band: '#c87838', fill: '#f8ecd8', portraitBg: '#e8b888', accent: '#f8c040' },
  },
  // The riverboat: green baize, an oxblood rail studded with brass.
  riverboat: {
    id: 'riverboat',
    table: {
      shape: 'oval',
      felt: '#2a7a4a',
      feltLight: '#3a9a5c',
      feltDark: '#1c5a36',
      line: '#58b878',
      rail: '#6a2a1c',
      railLight: '#9a4a30',
      railDark: '#3e160e',
      railStyle: 'leather',
      trim: '#d8b048',
      trimStyle: 'studs',
      emblem: 'wheel',
    },
    cardBack: { base: '#1c3060', pattern: '#3a5898', border: '#f0e0b0', motif: 'diamonds' },
    ui: { outline: '#1c1810', band: '#c8a040', fill: '#f8f4e4', portraitBg: '#9cc8d8', accent: '#f8d048' },
  },
  // The Harbor Room: green and gold, dark walnut, brass lamps.
  harbor: {
    id: 'harbor',
    table: {
      shape: 'oval',
      felt: '#1e6a4e',
      feltLight: '#2a8662',
      feltDark: '#124a36',
      line: '#d8b850',
      rail: '#3a2418',
      railLight: '#5e3c26',
      railDark: '#20120a',
      railStyle: 'leather',
      trim: '#e0c060',
      trimStyle: 'solid',
      emblem: 'compass',
    },
    cardBack: { base: '#6a1a28', pattern: '#a83848', border: '#e8d090', motif: 'lattice' },
    ui: { outline: '#14100c', band: '#c8a848', fill: '#f4f0e0', portraitBg: '#8aa898', accent: '#f8d048' },
  },
  // The back room: low ceiling, one lamp, a table that has seen things.
  backroom: {
    id: 'backroom',
    table: {
      shape: 'oval',
      felt: '#3e5a4a',
      feltLight: '#4e6e5a',
      feltDark: '#2a3e32',
      line: '#6a8a72',
      rail: '#2a2622',
      railLight: '#46403a',
      railDark: '#141210',
      railStyle: 'leather',
      trim: '#8a7a5a',
      trimStyle: 'solid',
      emblem: 'none',
    },
    cardBack: { base: '#283048', pattern: '#3a4868', border: '#d8d0c0', motif: 'stripes' },
    ui: { outline: '#100c0a', band: '#a08048', fill: '#ece4d0', portraitBg: '#7a6a54', accent: '#f0b040' },
  },
  // Palm Cay: teal cloth, a woven rattan rail, the sea through the window.
  palmcay: {
    id: 'palmcay',
    table: {
      shape: 'oval',
      felt: '#1e8a8a',
      feltLight: '#30a8a0',
      feltDark: '#146868',
      line: '#80e0d0',
      rail: '#c8a060',
      railLight: '#e8c888',
      railDark: '#906830',
      railStyle: 'rattan',
      trim: '#f8ecc8',
      trimStyle: 'solid',
      emblem: 'palm',
    },
    cardBack: { base: '#e86048', pattern: '#f89878', border: '#f8f8f0', motif: 'waves' },
    ui: { outline: '#1c2a28', band: '#f08868', fill: '#fcf8ec', portraitBg: '#88d8e8', accent: '#f8d048' },
  },
  // Neon Mesa: black and purple, a gloss rail edged in neon.
  mesa: {
    id: 'mesa',
    table: {
      shape: 'oval',
      felt: '#2e1848',
      feltLight: '#44266a',
      feltDark: '#1a0c2c',
      line: '#d050f0',
      rail: '#1a1620',
      railLight: '#3e3450',
      railDark: '#08060c',
      railStyle: 'gloss',
      trim: '#48e8f8',
      trimStyle: 'neon',
      emblem: 'star',
    },
    cardBack: { base: '#3a1858', pattern: '#e048c8', border: '#48e8f8', motif: 'sunburst' },
    ui: { outline: '#0c0814', band: '#c048e0', fill: '#f4ecf8', portraitBg: '#6848b0', accent: '#48e8f8' },
  },
  // The Invitational: a private rooftop over the Strip. Midnight cloth, gold.
  invitational: {
    id: 'invitational',
    table: {
      shape: 'oval',
      felt: '#1e1e4c',
      feltLight: '#2c2c6c',
      feltDark: '#10102c',
      line: '#d8b860',
      rail: '#d0a034',
      railLight: '#f8d870',
      railDark: '#8a6418',
      railStyle: 'gold',
      trim: '#201830',
      trimStyle: 'solid',
      emblem: 'sunburst',
    },
    cardBack: { base: '#181820', pattern: '#c8a040', border: '#f0d890', motif: 'sunburst' },
    ui: { outline: '#100c08', band: '#d8b048', fill: '#f8f4e8', portraitBg: '#34346a', accent: '#f8d870' },
  },
  // Porto Lumina: burgundy cloth, a gold rail, marble everywhere.
  lumina: {
    id: 'lumina',
    table: {
      shape: 'oval',
      felt: '#7a1c2c',
      feltLight: '#962a3a',
      feltDark: '#56101c',
      line: '#e8c060',
      rail: '#c8982e',
      railLight: '#f0cc60',
      railDark: '#7a5414',
      railStyle: 'gold',
      trim: '#f8f0d8',
      trimStyle: 'solid',
      emblem: 'crown',
    },
    cardBack: { base: '#6a1426', pattern: '#c89838', border: '#f8f0d8', motif: 'diamonds' },
    ui: { outline: '#1c0c10', band: '#d0a040', fill: '#fbf6ec', portraitBg: '#d8d0c8', accent: '#f8d048' },
  },
  // The Challenge: the penthouse floor, under the chandelier.
  finale: {
    id: 'finale',
    table: {
      shape: 'oval',
      felt: '#18284e',
      feltLight: '#22386e',
      feltDark: '#0c1632',
      line: '#e8c868',
      rail: '#1a1418',
      railLight: '#3e3036',
      railDark: '#08060a',
      railStyle: 'gloss',
      trim: '#f0c850',
      trimStyle: 'studs',
      emblem: 'laurel',
    },
    cardBack: { base: '#0e1428', pattern: '#d8b050', border: '#f0d890', motif: 'sunburst' },
    ui: { outline: '#0c0a10', band: '#e0b850', fill: '#fbf8f0', portraitBg: '#2a3a68', accent: '#f8d870' },
  },
}

/** The room a table is in. Every table names one; this is the fallback. */
export function themeFor(table: Pick<TableDef, 'theme'> | null | undefined): TableTheme {
  return TABLE_THEMES[table?.theme ?? 'silvercreek']
}
