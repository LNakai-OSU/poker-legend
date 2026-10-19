import type { CSSProperties } from 'react'

/** Hides text from view while keeping it in the document for tests and screen readers. */
export const VISUALLY_HIDDEN: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  border: 0,
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
  fontSize: 12,
}

/** GBA text colours: the ink and the one-pixel shadow under it. */
export interface Ink {
  color: string
  shadow: string | null
}

export const INK = {
  /** White text on a dark panel. */
  light: { color: '#f8f8f0', shadow: '#2a2a36' },
  /** Dark text on a pale panel, the FRLG dialogue look. */
  dark: { color: '#3a3a48', shadow: '#c8c8d0' },
  gold: { color: '#f8d048', shadow: '#5a3a10' },
  dim: { color: '#a8a8b8', shadow: '#24242e' },
  green: { color: '#88f0a0', shadow: '#16402a' },
  red: { color: '#f89090', shadow: '#4a1418' },
  blue: { color: '#90d0f8', shadow: '#14304a' },
} satisfies Record<string, Ink>
