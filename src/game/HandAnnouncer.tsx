/**
 * The key points of a hand, announced on the felt rather than in a panel.
 *
 * Everything a hand needed to say used to arrive as a box the player had to
 * dismiss: the street changed, the hand ended, somebody went all in, and each of
 * those stopped play until a button was clicked. A dealer does not hand you a
 * form — they say "flop" and deal it. This is that: a line that appears over the
 * felt, holds long enough to read, and leaves on its own.
 */

export type AnnouncementTone = 'neutral' | 'good' | 'bad' | 'tense'

export interface Announcement {
  /** Changing the key restarts the animation for a repeat of the same text. */
  key: string
  text: string
  /** The hand, the stakes — anything secondary, set smaller underneath. */
  detail?: string
  tone: AnnouncementTone
}

const TONES: Record<AnnouncementTone, { border: string; text: string; glow: string }> = {
  neutral: { border: 'rgba(200,214,226,0.35)', text: '#dfe7ef', glow: 'rgba(0,0,0,0.5)' },
  good: { border: 'rgba(127,224,160,0.6)', text: '#9ff0bd', glow: 'rgba(127,224,160,0.25)' },
  bad: { border: 'rgba(224,90,90,0.55)', text: '#f0a0a0', glow: 'rgba(224,90,90,0.2)' },
  tense: { border: 'rgba(242,193,78,0.65)', text: '#f6d898', glow: 'rgba(242,193,78,0.28)' },
}

export function HandAnnouncer({ announcement }: { announcement: Announcement | null }) {
  if (!announcement) return null
  const tone = TONES[announcement.tone]

  return (
    <div
      key={announcement.key}
      data-testid="announcement"
      data-tone={announcement.tone}
      className="announcement"
      style={{
        position: 'absolute',
        left: '50%',
        // Above the board rather than below it. At 79% it sat straight on top of
        // the player's own seat plate and hole cards, covering the two things a
        // player most wants to see at the moment a hand is decided.
        top: '26%',
        transform: 'translate(-50%, -50%)',
        // Never swallows a click: the table underneath stays live while it is up.
        pointerEvents: 'none',
        zIndex: 5,
        textAlign: 'center',
        padding: '6px 16px',
        borderRadius: 999,
        border: `1px solid ${tone.border}`,
        background: 'rgba(6,12,10,0.82)',
        boxShadow: `0 2px 18px ${tone.glow}`,
        color: tone.text,
        fontSize: 'clamp(12px, 3.2vw, 15px)',
        fontWeight: 'bold',
        letterSpacing: 0.4,
        maxWidth: '86%',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {announcement.text}
      {announcement.detail && (
        <div style={{ fontSize: 'clamp(10px, 2.6vw, 12px)', fontWeight: 'normal', opacity: 0.85 }}>
          {announcement.detail}
        </div>
      )}
    </div>
  )
}
