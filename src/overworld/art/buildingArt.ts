import type { StampArt } from '../stampArt'
import {
  acUnit, awning, brickWall, displayWindow, doorAt, eaveShadow, flatRoof, groundShadow, plinth, shingleRoof,
  sidingWall, signBoard, windowAt,
} from './buildingParts'
import { BASIN_BRICK, BASIN_BUILDINGS, BASIN_WINDOW, EAVES, SLATE_ROOF, doorTiles } from './townBasin'
import { RIVER_BUILDINGS } from './townRiver'
import { COAST_BUILDINGS } from './townCoast'
import { STRIP_BUILDINGS } from './townStrip'

/**
 * Every building in the world, one stamp each.
 *
 * Nobody is a palette swap: each town builds in its own materials (Basin in
 * brick under red shingle, the harbour in stone and slate, the island in pastel
 * render under barrel tiles, the Strip in black glass and neon, Porto Lumina in
 * marble), and each building on a street is its own design rather than the same
 * house in another colour. The towns are drawn in their own files; this is the
 * one table the renderer reads.
 *
 * Doors are drawn wherever the stamp's footprint has a `D`, so the picture and
 * the doorway you can walk through can never disagree. A door drawn on a wall
 * tile is a door that stays shut.
 */
export const BUILDING_ART: Record<string, StampArt> = {
  ...BASIN_BUILDINGS,
  ...RIVER_BUILDINGS,
  ...COAST_BUILDINGS,
  ...STRIP_BUILDINGS,

  // The editor's generic house and shopfront, for putting a new building down
  // before it has a design of its own.
  townhouse: {
    bleed: EAVES,
    draw: (px, c) => {
      const roof = 26
      shingleRoof(px, -2, 0, c.w + 4, roof, SLATE_ROOF)
      sidingWall(px, 0, roof, c.w, c.h - roof, { hi: '#e8dcc0', base: '#d8caa8', lo: '#b8a888', line: '#8a7a60' })
      eaveShadow(px, 0, roof, c.w)
      windowAt(px, 8, roof + 5, 10, 10, BASIN_WINDOW)
      windowAt(px, c.w - 18, roof + 5, 10, 10, BASIN_WINDOW)
      plinth(px, 0, c.h - 2, c.w, '#8a7a6a')
      for (const door of doorTiles(c)) doorAt(px, door.x, door.y, { line: '#2a1a14', trim: '#ece2c8', leaf: '#8a2a24' })
      groundShadow(px, c.w, roof, c.h)
    },
  },
  shopfront: {
    bleed: EAVES,
    draw: (px, c) => {
      const roof = 14
      flatRoof(px, -1, 0, c.w + 2, roof, { hi: '#c8c0b0', base: '#a8a090', lo: '#7a7264' }, '#4a4650')
      acUnit(px, 8, 3)
      brickWall(px, 0, roof, c.w, c.h - roof, BASIN_BRICK)
      signBoard(px, 6, roof + 2, c.w - 12, 9, 'SHOP', '#2a3a5a', '#f2e6c8', '#16202e')
      awning(px, 2, roof + 13, c.w - 4, 6, '#c03a32', '#f2ead8')
      for (const door of doorTiles(c)) {
        doorAt(px, door.x, door.y, { line: '#2a1a14', trim: '#ece2c8', leaf: '#3a3a44', glass: '#9fd8f0' })
      }
      displayWindow(px, 4, c.h - 16, 26, 13, '#2a2a30', ['#e05a5a', '#f2c14e', '#6ea8fe', '#3a9d5c'])
      plinth(px, 0, c.h - 2, c.w, '#6a625a')
      groundShadow(px, c.w, roof, c.h)
    },
  },
}
