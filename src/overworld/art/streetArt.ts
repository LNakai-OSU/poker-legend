import type { StampArt } from '../stampArt'
import { INK, oval } from '../pixelArt'

/** Things that stand in the street. */
export const STREET_ART: Record<string, StampArt> = {
  'bus-shelter': {
    draw: (px, c) => {
      const { w } = c
      px(0, 2, w, 3, '#3a4350')
      px(1, 5, 3, 11, '#2a3240')
      px(w - 4, 5, 3, 11, '#2a3240')
      px(5, 5, w - 10, 9, '#1a2230')
      px(6, 6, w - 12, 7, '#2a3a52')
      px(8, 7, 7, 1, '#cfe0f0')
      px(8, 9, 5, 1, '#cfe0f0')
      px(8, 11, 6, 1, '#cfe0f0')
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
