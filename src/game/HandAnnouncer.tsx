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
import { useEffect } from 'react'
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
  /** Stays until the player taps it (or presses a key), instead of leaving on a timer. */
  sticky?: boolean
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
  onDismiss,
}: {
  announcement: Announcement | null
  scale: number
  theme: TableTheme
  band: Rect
  onDismiss?: () => void
}) {
  const sticky = announcement?.sticky === true && onDismiss !== undefined
  useEffect(() => {
    if (!sticky || !onDismiss) return
    const onKey = (e: KeyboardEvent) => {
      // Only Escape: Space, Enter and E already mean "bet" while a hand is on.
      if (e.key === 'Escape') onDismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sticky, onDismiss, announcement?.key])
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
      data-sticky={sticky ? 'true' : undefined}
      onClick={sticky ? onDismiss : undefined}
      className="announcement"
      style={{
        ...frameStyle(frame, P),
        position: 'absolute',
        left: band.x * P,
        top: band.y * P,
        width: band.w * P,
        height: band.h * P,
        // A line that leaves on its own never swallows a click; one that waits for
        // a tap is the tap.
        pointerEvents: sticky ? 'auto' : 'none',
        cursor: sticky ? 'pointer' : undefined,
        zIndex: 5,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <PixelText text={announcement.text} scale={P} ink={INK.dark} />
      {(announcement.detail || sticky) && (
        <PixelText text={sticky ? `${announcement.detail ?? ''}${announcement.detail ? ' · ' : ''}tap to go on` : (announcement.detail ?? '')} scale={P} ink={{ color: shade(accent, 0.55), shadow: mix(accent, '#ffffff', 0.6) }} />
      )}
    </div>
  )
}
