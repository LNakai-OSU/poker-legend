import type { StampArt } from '../stampArt'
import { INK, oval } from '../pixelArt'

/** The furniture of a gaming floor: tables, machines, the cage, the bar. */
export const CASINO_ART: Record<string, StampArt> = {
  'poker-table': {
    draw: (px, c) => {
      const { w, h } = c
      for (const cx of [w * 0.22, w * 0.5, w * 0.78]) {
        px(Math.round(cx) - 5, 2, 10, 7, '#4a3524')
        px(Math.round(cx) - 5, h - 9, 10, 7, '#4a3524')
      }
      oval(px, 4, 8, w - 8, h - 16, INK)
      oval(px, 6, 10, w - 12, h - 20, '#6b4a2a')
      oval(px, 9, 13, w - 18, h - 26, '#1f6b3a')
      oval(px, 11, 15, w - 22, h - 30, '#2a7f49')
    },
  },
  'slot-bank': {
    draw: (px, c) => {
      for (let i = 0; i < c.cols; i++) {
        const x = i * 16
        px(x + 1, 2, 14, 14, INK)
        px(x + 2, 3, 12, 12, '#5a3a6b')
      }
    },
  },
  'craps-pit': {
    draw: (px, c) => {
      px(8, 12, c.w - 16, c.h - 24, INK)
      px(10, 14, c.w - 20, c.h - 28, '#4a3524')
      px(13, 17, c.w - 26, c.h - 34, '#1f4f7a')
    },
  },
  bar: {
    draw: (px, c) => {
      px(0, 1, c.w, 7, '#241a12')
      px(0, 8, c.w, 3, '#6b4a2a')
      px(0, 11, c.w, 5, '#4a3524')
    },
  },
}
