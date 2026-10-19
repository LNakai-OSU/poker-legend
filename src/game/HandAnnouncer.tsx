/**
 * The key points of a hand, announced on the felt rather than in a panel.
 *
 * Everything a hand needed to say used to arrive as a box the player had to
 * dismiss: the street changed, the hand ended, somebody went all in, and each of
 * those stopped play until a button was clicked. A dealer does not hand you a
 * form — they say "flop" and deal it. This is that: a line that appears over the
 * felt, holds long enough to read, and leaves on its own.
 *
 * It opens in the band over the board, where the pot is written — the one strip
 * of the table the layout keeps clear of every seat — so it can never cover a
 * card. Every street, all-in and result it announces carries the pot with it,
 * so nothing is lost while it sits over the pot's own line.
 */
import { frameStyle } from './pixel/frame'
import { PixelText } from './pixel/PixelText'
import { INK } from './pixel/ink'
import { mix, shade } from './pixel/color'
import type { Rect } from './tableLayout'
import type { TableTheme } from './tableThemes'

export type AnnouncementTone = 'neutral' | 'good' | 'bad' | 'tense'

export interface Announcement {
  /** Changing the key restarts the animation for a repeat of the same text. */
  key: string
  text: string
  /** The hand, the stakes — anything secondary, set smaller underneath. */
  detail?: string
  tone: AnnouncementTone
}

const TONE_BAND: Record<Exclude<AnnouncementTone, 'neutral'>, string> = {
  good: '#38b860',
  bad: '#d84848',
  tense: '#f0b830',
}

export function HandAnnouncer({
  announcement,
  scale,
  theme,
  band,
}: {
  announcement: Announcement | null
  scale: number
  theme: TableTheme
  band: Rect
}) {
  if (!announcement) return null
  const P = scale
  const accent = announcement.tone === 'neutral' ? theme.ui.band : TONE_BAND[announcement.tone]
  const frame = {
    rings: [theme.ui.outline, accent, mix(accent, '#ffffff', 0.45)],
    lower: [theme.ui.outline, shade(accent, 0.7), accent],
    fill: theme.ui.fill,
    radius: 3,
  }
  return (
    <div
      key={announcement.key}
      data-testid="announcement"
      data-tone={announcement.tone}
      className="announcement"
      style={{
        ...frameStyle(frame, P),
        position: 'absolute',
        left: band.x * P,
        top: band.y * P,
        width: band.w * P,
        height: band.h * P,
        // Never swallows a click: the table underneath stays live while it is up.
        pointerEvents: 'none',
        zIndex: 5,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <PixelText text={announcement.text} scale={P} ink={INK.dark} />
      {announcement.detail && (
        <PixelText text={announcement.detail} scale={P} ink={{ color: shade(accent, 0.55), shadow: mix(accent, '#ffffff', 0.6) }} />
      )}
    </div>
  )
}
