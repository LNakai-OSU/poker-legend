import type { StampArt } from '../stampArt'
import { INK, oval } from '../pixelArt'

/** Things that stand in the street. */
export const STREET_ART: Record<string, StampArt> = {
  'bus-shelter': {
    bleed: { right: 2, bottom: 6 },
    draw: (px, c) => {
      const { w } = c
      // Back panel of glass, the route map pasted on it, a bench in front.
      px(0, 0, w, 16, '#2a3240')
      px(1, 3, w - 2, 12, '#8ab8d0')
      px(1, 3, w - 2, 4, '#b8dcf0')
      px(4, 5, 14, 8, '#f4f0e4')
      for (const [y, len] of [[6, 10], [8, 7], [10, 9]]) px(6, y, len, 1, '#2a6ab8')
      px(6, 6, 1, 5, '#d83a3a')
      px(w - 12, 4, 1, 10, 'rgba(255, 255, 255, 0.6)')
      // The canopy.
      px(-1, 0, w + 2, 3, '#3a4350')
      px(-1, 0, w + 2, 1, '#6a7380')
      // Posts and the bench.
      px(0, 3, 2, 13, '#3a4350')
      px(w - 2, 3, 2, 13, '#3a4350')
      px(6, 14, w - 12, 3, '#7a5234')
      px(6, 14, w - 12, 1, '#a87a4e')
      px(8, 17, 1, 3, '#3a3a40')
      px(w - 9, 17, 1, 3, '#3a3a40')
      px(0, 16, w, 4, 'rgba(10, 8, 20, 0.25)')
    },
  },
  fountain: {
    draw: (px, c) => {
      const { w, h } = c
      oval(px, 2, 2, w - 4, h - 4, '#6a6a7a')
      oval(px, 5, 5, w - 10, h - 10, '#8a8a9a')
      oval(px, 8, 8, w - 16, h - 16, '#2a5f8a')
      oval(px, 11, 11, w - 22, h - 22, '#3f84bd')
      const mx = Math.round(w / 2)
      px(mx - 2, 10, 4, h - 20, '#8a8a9a')
      px(mx - 4, 8, 8, 3, '#b8c8d8')
    },
  },
  'parked-car': {
    draw: (px, c) => {
      const { h } = c
      px(2, 1, 12, h - 2, INK)
      px(3, 2, 10, h - 4, '#b02a2a')
      px(4, 4, 8, 6, '#1a2230')
      px(5, 5, 6, 4, '#8ad4ff')
      px(4, h - 12, 8, 6, '#8a1f1f')
    },
  },
  planter: {
    draw: (px, c) => {
      const { w, h } = c
      px(1, 3, w - 2, h - 4, '#6a5a4a')
      px(2, 4, w - 4, h - 6, '#3a2a1c')
      for (let i = 3; i < w - 4; i += 6) {
        for (let j = 5; j < h - 6; j += 6) {
          px(i, j, 4, 4, '#2f6b3a')
          px(i + 1, j + 1, 2, 2, (i + j) % 4 === 0 ? '#e8d26a' : '#d96c9c')
        }
      }
    },
  },
}
