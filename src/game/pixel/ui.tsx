import type { CSSProperties, ReactNode } from 'react'
import { frameStyle } from './frame'
import { PixelText } from './PixelText'
import { INK, type Ink } from './ink'
import { buttonFrame, panelFrames, type ButtonRole } from './themeFrames'
import { buttonWidth } from '../tableLayout'
import type { TableTheme } from '../tableThemes'

/**
 * The table's GBA-style controls: framed panels, buttons with a bevel and a
 * pointing cursor, the bar that fills before the next deal.
 *
 * Everything here is sized in art pixels and multiplied by the scene's scale,
 * so a button's frame is exactly as many screen pixels thick as the outline of a
 * card next to it.
 */

const CURSOR_PATH = 'M0 0h1v1h-1zM0 1h2v1h-2zM0 2h3v1h-3zM0 3h2v1h-2zM0 4h1v1h-1z'

interface PxButtonProps {
  /** One line, or a label over an amount. */
  lines: string[]
  scale: number
  role?: ButtonRole
  /** Width in art pixels; by default just wide enough for the label. */
  width?: number
  height: number
  onClick: () => void
  testId?: string
  style?: CSSProperties
  /** Shown but not pressable: an answer the player cannot give yet. */
  disabled?: boolean
  /** Ink for the second and later lines; a pale grey by default. */
  subInk?: Ink
  /** The button element, for whoever has to move the focus onto it. */
  buttonRef?: (el: HTMLButtonElement | null) => void
  /** Pointed at with the keyboard: shows the cursor the way hovering does. */
  selected?: boolean
}

/**
 * A button in the betting menu. Its text is the label it shows — the pixel
 * letters are drawn over the same words kept in the document — so a test or a
 * screen reader finds "Call 20" exactly where a player sees it.
 */
export function PxButton({ lines, scale, role = 'plain', width, height, onClick, testId, style, disabled, subInk, buttonRef, selected }: PxButtonProps) {
  const w = width ?? buttonWidth(lines)
  return (
    <button
      type="button"
      ref={buttonRef}
      data-testid={testId}
      className={selected ? 'px-btn px-selected' : 'px-btn'}
      data-selected={selected ? 'true' : undefined}
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      style={{
        ...frameStyle(buttonFrame(role), scale),
        width: w * scale,
        height: height * scale,
        minHeight: 0,
        padding: 0,
        margin: 0,
        background: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.72 : 1,
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        flex: 'none',
        ...style,
      }}
    >
      <svg
        className="px-cursor"
        aria-hidden="true"
        width={3 * scale}
        height={5 * scale}
        viewBox="0 0 3 5"
        shapeRendering="crispEdges"
        style={{ position: 'absolute', left: 2 * scale, top: '50%', marginTop: -2.5 * scale }}
      >
        <path d={CURSOR_PATH} fill="#f8f8f0" />
      </svg>
      {lines.map((line, i) => (
        <PixelText
          key={i}
          text={line}
          scale={scale}
          ink={i === 0 ? INK.light : (subInk ?? { color: '#e0e0e8', shadow: '#2a2a36' })}
        />
      ))}
    </button>
  )
}

/** A framed GBA box. */
export function Panel({
  theme,
  scale,
  kind = 'panel',
  style,
  children,
  testId,
  className,
  onClick,
}: {
  theme: TableTheme
  scale: number
  onClick?: () => void
  kind?: 'panel' | 'acting' | 'tag'
  style?: CSSProperties
  children?: ReactNode
  testId?: string
  className?: string
}) {
  return (
    <div data-testid={testId} className={className} onClick={onClick} style={{ ...frameStyle(panelFrames(theme)[kind], scale), ...style }}>
      {children}
    </div>
  )
}

/** One line (or a wrapped paragraph) of text inside a panel. */
export function PxLine({
  text,
  scale,
  ink = INK.dark,
  align = 'left',
  wrap = false,
  maxLines,
  testId,
}: {
  text: string
  scale: number
  ink?: Ink
  align?: 'left' | 'center' | 'right'
  wrap?: boolean
  maxLines?: number
  testId?: string
}) {
  return (
    <div
      data-testid={testId}
      style={{ display: 'flex', justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start' }}
    >
      <PixelText text={text} scale={scale} ink={ink} wrap={wrap} maxLines={maxLines} align={align} />
    </div>
  )
}

/** The bar that fills, a pixel at a time, while the next hand waits to be dealt. */
export function Countdown({
  scale,
  durationMs,
  runKey,
  width = 40,
}: {
  scale: number
  durationMs: number
  runKey: number | string | undefined
  width?: number
}) {
  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-block',
        width: width * scale,
        height: 4 * scale,
        background: '#283040',
        boxShadow: `0 0 0 ${scale}px #141418`,
        overflow: 'hidden',
        flex: 'none',
      }}
    >
      <span
        key={runKey}
        className="deal-countdown"
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(#f8e070 0 ${scale}px, #e0a820 ${scale}px)`,
          animationDuration: `${durationMs}ms`,
          animationTimingFunction: `steps(${width})`,
        }}
      />
    </span>
  )
}
