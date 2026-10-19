import type { CSSProperties } from 'react'
import { LINE_HEIGHT, WORD_GAP, textShape } from './font'
import { INK, VISUALLY_HIDDEN, type Ink } from './ink'

/**
 * Text set in the table's pixel font.
 *
 * The letters are drawn as an SVG path on the art grid, so they stay crisp at
 * any scale and on any screen without a font file. The words themselves are
 * still in the document — in a visually hidden span — so the text can be
 * selected by tests, read by a screen reader, and found by anything that asks
 * an element for its text.
 */

function Word({ text, scale, ink }: { text: string; scale: number; ink: Ink }) {
  const shape = textShape(text)
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={shape.width * scale}
      height={LINE_HEIGHT * scale}
      viewBox={`0 0 ${shape.width} ${LINE_HEIGHT}`}
      shapeRendering="crispEdges"
      style={{ display: 'block', flex: 'none', overflow: 'visible' }}
    >
      {ink.shadow && <path d={shape.shadow} fill={ink.shadow} />}
      <path d={shape.glyphs} fill={ink.color} />
    </svg>
  )
}

interface PixelTextProps {
  text: string
  /** CSS pixels per art pixel. */
  scale: number
  ink?: Ink
  /** Break at spaces to fit the container; otherwise one unbroken run. */
  wrap?: boolean
  /** With `wrap`, cut anything past this many lines. */
  maxLines?: number
  align?: 'left' | 'center' | 'right'
  style?: CSSProperties
  className?: string
}

export function PixelText({
  text,
  scale,
  ink = INK.light,
  wrap = false,
  maxLines,
  align = 'left',
  style,
  className,
}: PixelTextProps) {
  const source = <span style={VISUALLY_HIDDEN}>{text}</span>
  if (!wrap) {
    return (
      <span
        className={className}
        style={{ display: 'inline-flex', position: 'relative', verticalAlign: 'top', lineHeight: 0, ...style }}
      >
        {source}
        <Word text={text} scale={scale} ink={ink} />
      </span>
    )
  }
  const words = text.split(/\s+/).filter(Boolean)
  return (
    <span
      className={className}
      style={{
        display: 'flex',
        position: 'relative',
        flexWrap: 'wrap',
        columnGap: WORD_GAP * scale,
        rowGap: 0,
        lineHeight: 0,
        justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
        maxHeight: maxLines ? maxLines * LINE_HEIGHT * scale : undefined,
        overflow: maxLines ? 'hidden' : undefined,
        ...style,
      }}
    >
      {source}
      {words.map((word, i) => (
        <Word key={i} text={word} scale={scale} ink={ink} />
      ))}
    </span>
  )
}
