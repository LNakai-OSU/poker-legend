import type { FrameSpec } from './frame'
import { mix, shade } from './color'
import type { TableTheme } from '../tableThemes'

/** The frames a room's panels are drawn with. */
export function panelFrames(theme: TableTheme): Record<'panel' | 'acting' | 'tag', FrameSpec> {
  const { outline, band, fill } = theme.ui
  return {
    /** Seat plates, the sign, the betting menu: the FRLG box. */
    panel: {
      rings: [outline, band, shade(band, 0.62)],
      lower: [outline, shade(band, 0.78), shade(band, 0.5)],
      fill,
      radius: 3,
    },
    /** The seat whose turn it is. */
    acting: {
      rings: [outline, theme.ui.accent, mix(theme.ui.accent, '#ffffff', 0.5)],
      lower: [outline, shade(theme.ui.accent, 0.8), theme.ui.accent],
      fill,
      radius: 3,
    },
    /** Small labels on the cloth, like the pot. */
    tag: {
      rings: [outline, band],
      fill,
      radius: 2,
    },
  }
}

export type ButtonRole = 'fold' | 'primary' | 'raise' | 'allin' | 'plain' | 'barFold' | 'barCall' | 'barRaise'

/**
 * Folding, calling, raising and shoving are different kinds of act, and look it:
 * grey, blue, green and red, so All in never carries the weight of Fold.
 */
const BUTTON_COLOURS: Record<ButtonRole, string> = {
  fold: '#7c7c8c',
  primary: '#3070c8',
  raise: '#2e9450',
  allin: '#c83838',
  plain: '#5a6478',
  // The casino bar's three big buttons: red, green, gold.
  barFold: '#a84444',
  barCall: '#2f8a58',
  barRaise: '#b8861e',
}

export function buttonFrame(role: ButtonRole): FrameSpec {
  const c = BUTTON_COLOURS[role]
  return {
    rings: ['#141418', mix(c, '#ffffff', 0.45)],
    lower: ['#141418', shade(c, 0.55)],
    fill: c,
    radius: 2,
  }
}
