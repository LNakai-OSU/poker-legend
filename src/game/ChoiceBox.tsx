import { useEffect, useRef, useState } from 'react'
import { playSound } from '../audio/audio'
import { PxButton } from './pixel/ui'
import { INK } from './pixel/ink'
import { wrapText } from './pixel/font'
import { buttonHeight, DOCK } from './tableLayout'
import { useViewport } from './useViewport'
import { isActionKey, navStep, useKeyLayer } from './keys'

/**
 * A question a beat puts to the player, and the answers they can give.
 *
 * Laid over the scene like the text box it follows, with the answers as the
 * table's own pixel buttons, one under another so each is a full finger wide on
 * a phone. An answer the player cannot give yet is still shown, greyed, with
 * why underneath — the road not open is part of the decision.
 *
 * Keys: the number of an answer picks it; the arrows or W A S D move the
 * pointer, and Space, E or Enter picks the one it is on.
 */

interface ChoiceBoxProps {
  speaker: string
  prompt: string
  options: Array<{ label: string; open: boolean; why?: string }>
  onChoose: (index: number) => void
}

/** The box's widest, matching the dialogue box above it. */
const MAX_WIDTH = 640
/** Padding and border inside the box, each side, in CSS pixels. */
const INSET = 18

export function ChoiceBox({ speaker, prompt, options, onChoose }: ChoiceBoxProps) {
  const view = useViewport()
  const firstOpen = Math.max(0, options.findIndex((o) => o.open))
  const [pointer, setPointer] = useState(firstOpen)
  const buttons = useRef<Array<HTMLButtonElement | null>>([])
  const isTop = useKeyLayer()
  // Answered once: a double click, or a held key's auto-repeat, is not two answers.
  const answered = useRef(false)

  // Big enough to read at a glance, small enough that four answers and the
  // question fit on a short laptop screen.
  const scale = view.w < 700 || view.h < 620 ? 2 : 3
  const innerCss = Math.min(view.w, MAX_WIDTH) - 2 * INSET
  const artWidth = Math.floor(innerCss / scale)
  const textWidth = artWidth - 2 * DOCK.buttonPadX - 4

  const pick = (index: number) => {
    if (!options[index]?.open || answered.current) return
    answered.current = true
    playSound('ui')
    onChoose(index)
  }

  // The pointer starts on the first answer that can be given, and keyboard
  // focus with it, so Enter does what the pointer shows.
  useEffect(() => {
    buttons.current[firstOpen]?.focus({ preventScroll: true })
  }, [firstOpen])

  useEffect(() => {
    const open = options.map((o, i) => (o.open ? i : -1)).filter((i) => i >= 0)
    const onKey = (e: KeyboardEvent) => {
      if (!isTop()) return
      const number = Number(e.key)
      if (Number.isInteger(number) && number >= 1 && number <= options.length) {
        e.preventDefault()
        pick(number - 1)
        return
      }
      const step = navStep(e)
      if (step !== 0) {
        e.preventDefault()
        e.stopPropagation()
        if (open.length === 0) return
        const at = open.indexOf(pointer)
        const next = open[(Math.max(0, at) + step + open.length) % open.length]
        setPointer(next)
        buttons.current[next]?.focus({ preventScroll: true })
        return
      }
      if (isActionKey(e)) {
        // Handled here rather than by the focused button, so it does what the
        // pointer shows even after a click elsewhere took the focus away.
        e.preventDefault()
        e.stopPropagation()
        if (e.repeat) return
        pick(pointer)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  })

  return (
    <div data-testid="event-choice" style={{ position: 'fixed', inset: 0, zIndex: 96 }}>
      <div
        role="dialog"
        aria-label={prompt}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          margin: '0 auto',
          maxWidth: MAX_WIDTH,
          boxSizing: 'border-box',
          maxHeight: '100%',
          overflowY: 'auto',
          background: 'rgba(10, 10, 16, 0.98)',
          border: '2px solid #4a4a66',
          borderRadius: 8,
          padding: `14px ${INSET - 2}px max(14px, env(safe-area-inset-bottom))`,
          color: '#e8e8f0',
          fontFamily: 'monospace',
        }}
      >
        {speaker && <div style={{ color: '#f2c14e', fontWeight: 'bold', marginBottom: 6 }}>{speaker}</div>}
        <div data-testid="choice-prompt" style={{ marginBottom: 12 }}>
          {prompt}
        </div>
        <div role="group" aria-label="Answers" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {options.map((option, i) => {
            const label = wrapText(`${i + 1}  ${option.label}`, textWidth)
            const lines = option.open || !option.why ? label : [...label, option.why]
            return (
              <PxButton
                key={i}
                testId={`choice-option-${i}`}
                lines={lines}
                scale={scale}
                role={option.open ? (i === pointer ? 'primary' : 'plain') : 'fold'}
                width={artWidth}
                height={buttonHeight(lines.length, scale, view.coarse)}
                disabled={!option.open}
                subInk={option.open ? undefined : INK.dim}
                onClick={() => pick(i)}
                buttonRef={(el) => {
                  buttons.current[i] = el
                }}
                style={{ alignItems: 'flex-start', paddingLeft: DOCK.buttonPadX * scale }}
              />
            )
          })}
        </div>
        {!view.coarse && (
          <div className="ed-muted" style={{ color: '#8a8aa0', fontSize: 12, marginTop: 8 }}>
            {options.length > 1 ? `1–${options.length}` : '1'}, or ↑ ↓ and Space / E
          </div>
        )}
      </div>
    </div>
  )
}
