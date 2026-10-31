import { personalityFor } from '../world/characters'
import { expressionFor } from './avatars'
import { portraitBackdropUrl, portraitUrl } from './portraits'
import { CAPTION, CAPTION_H } from './tableLayout'
import type { TableTheme } from './tableThemes'
import { PixelText } from './pixel/PixelText'
import { INK } from './pixel/ink'

export interface CaptionTell {
  playerId: string
  name: string
  cue: string
  alpha: number
}

/**
 * What is being said, or noticed, at the table right now: one place in the
 * betting menu's own type, with the speaker's face beside it.
 *
 * Talk wins; with none, a tell you are meant to catch; with none, what a
 * showdown turned over. It holds a fixed height, so nothing moves when it
 * fills or empties, and a tap puts a line away.
 */
export function TableCaption({
  P,
  theme,
  speech,
  personas,
  tells,
  made,
  onDismiss,
}: {
  /** CSS pixels per art pixel, in the menu's own (zoomed) pixels. */
  P: number
  theme: TableTheme
  speech: { playerId: string; text: string } | null
  personas?: Record<string, string>
  tells: CaptionTell[]
  /** What each player who showed down made, for a line when nothing else is on. */
  made: Array<{ name: string; hand: string; won: boolean }>
  onDismiss: () => void
}) {
  // A pill floating over the table's foot, there only while it has something to say.
  const box = {
    minHeight: CAPTION_H * P,
    display: 'flex',
    alignItems: 'center',
    gap: 3 * P,
    overflow: 'hidden',
    background: 'rgba(11,15,24,0.9)',
    border: `${Math.max(1, Math.round(P / 2))}px solid ${theme.ui.band}`,
    borderRadius: 2 * P,
    padding: `${P}px ${3 * P}px`,
    maxWidth: '100%',
    pointerEvents: 'auto',
  } as const

  if (speech) {
    const look = personalityFor(speech.playerId, personas?.[speech.playerId]).look
    return (
      <div data-testid={`speech-${speech.playerId}`} className="speech-bubble" style={{ ...box, cursor: 'pointer' }} onClick={onDismiss}>
        <div
          style={{
            width: CAPTION.face * P,
            height: CAPTION.face * P,
            flex: 'none',
            overflow: 'hidden',
            backgroundImage: `url(${portraitBackdropUrl(theme.ui.portraitBg)})`,
            backgroundSize: '100% 100%',
            imageRendering: 'pixelated',
          }}
        >
          <img
            src={portraitUrl(look, expressionFor({ tellKind: null, isActing: false, wonLast: false, lostLast: false }), speech.playerId)}
            alt=""
            draggable={false}
            style={{ display: 'block', width: CAPTION.face * P, height: CAPTION.face * P, imageRendering: 'pixelated', objectFit: 'cover', objectPosition: 'center top' }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <PixelText text={speech.text} scale={P} wrap ink={INK.light} maxLines={CAPTION.lines} />
        </div>
      </div>
    )
  }

  if (tells.length > 0) {
    return (
      <div style={box}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {tells.slice(0, CAPTION.lines).map((t) => (
            <div key={t.playerId} data-testid={`tell-${t.playerId}`}>
              <PixelText
                text={`${t.name}: ${t.cue}`}
                scale={P}
                ink={{ color: `rgba(248, 208, 72, ${t.alpha})`, shadow: `rgba(11, 15, 24, ${t.alpha})` }}
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (made.length > 0) {
    return (
      <div style={box} data-testid="showdown-made">
        <div style={{ flex: 1, minWidth: 0 }}>
          <PixelText
            text={made.map((m) => `${m.name}: ${m.hand}`).join('   ')}
            scale={P}
            wrap
            maxLines={CAPTION.lines}
            ink={made.some((m) => m.won) ? INK.gold : INK.light}
          />
        </div>
      </div>
    )
  }

  return null
}
