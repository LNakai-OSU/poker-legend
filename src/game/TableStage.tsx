import { useEffect, useMemo, useRef, type CSSProperties, type ReactNode } from 'react'
import { TEXT_ZOOM, layoutScene, type SceneLayout, type SceneNeeds } from './tableLayout'
import type { TableTheme } from './tableThemes'
import { paintRoomScene, type RoomMotion } from './pixel/rooms'
import { Panel } from './pixel/ui'
import { PixelText } from './pixel/PixelText'
import { INK } from './pixel/ink'
import { useViewport } from './useViewport'
import { UI_FONT } from './pixel/webFont'

/** A canvas showing a picture painted at art size and scaled up whole pixels at a time. */
export function ArtCanvas({
  width,
  height,
  scale,
  paint,
  testId,
  left = 0,
  top = 0,
  className,
  style,
}: {
  width: number
  height: number
  scale: number
  paint: (canvas: HTMLCanvasElement) => void
  testId?: string
  /** Where it sits in the scene, in art pixels. */
  left?: number
  top?: number
  className?: string
  style?: CSSProperties
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (ref.current) paint(ref.current)
  }, [paint])
  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      data-testid={testId}
      className={className}
      width={width}
      height={height}
      style={{
        position: 'absolute',
        left: left * scale,
        top: top * scale,
        width: width * scale,
        height: height * scale,
        imageRendering: 'pixelated',
        pointerEvents: 'none',
        ...style,
      }}
    />
  )
}

/** One moving part of the room — a sign's dark frame, the water's other glints — shown on its own cycle. */
function MotionLayer({ motion, scale }: { motion: RoomMotion; scale: number }) {
  const paint = useMemo(() => (canvas: HTMLCanvasElement) => motion.frame.paint(canvas), [motion])
  return (
    <ArtCanvas
      width={motion.frame.width}
      height={motion.frame.height}
      scale={scale}
      left={motion.x}
      top={motion.y}
      paint={paint}
      testId={`room-${motion.kind}`}
      className={`room-${motion.kind}`}
      style={{ animationDuration: `${motion.period.toFixed(2)}s`, animationDelay: `${motion.delay.toFixed(2)}s` }}
    />
  )
}

interface TableStageProps {
  theme: TableTheme
  needs: SceneNeeds
  /** The table and everything on it. */
  felt: (layout: SceneLayout) => ReactNode
  /** The betting menu and whatever is said under the table. */
  dock: (layout: SceneLayout) => ReactNode
}

/**
 * The whole table scene: the room, the sign with the stakes and your wallet, the
 * table, and the betting menu, laid out on one art grid.
 *
 * Nothing here moves when the betting buttons come and go: the menu has a
 * reserved height, chosen for the most it ever has to hold, so the table never
 * jumps up the screen at the moment you need to read it.
 */
export function TableStage({ theme, needs, felt, dock }: TableStageProps) {
  const view = useViewport()
  const layout = useMemo(() => layoutScene(view, needs), [view, needs])
  const P = layout.scale
  // The room covers the whole window, a pixel or two past the art grid's edge.
  const roomW = Math.ceil(view.w / P)
  const roomH = Math.max(layout.h, Math.ceil(view.h / P))
  const room = useMemo(
    () => paintRoomScene(theme.id, { w: roomW, h: roomH, felt: layout.felt }),
    [theme.id, roomW, roomH, layout.felt],
  )
  const paint = useMemo(() => (canvas: HTMLCanvasElement) => room.raster.paint(canvas), [room])

  const { header } = layout
  const titleLine = layout.headerLines === 1 ? `${needs.title}   ${needs.subtitle}` : needs.title

  return (
    <div
      data-testid="table-scene"
      data-scale={P}
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100vh',
        overflow: 'hidden',
        background: '#100c14',
        color: '#e8e8f0',
        fontFamily: UI_FONT,
        // The art grid starts at the top left of the window.
        paddingTop: layout.dock.y * P,
        paddingBottom: 4 * P,
        boxSizing: 'border-box',
        imageRendering: 'pixelated',
      }}
    >
      <ArtCanvas width={roomW} height={roomH} scale={P} paint={paint} testId="room" />
      {room.motion.map((m, i) => (
        <MotionLayer key={`${theme.id}-${roomW}x${roomH}-${i}`} motion={m} scale={P} />
      ))}

      {/* The sign in the corner: where you are, the stakes, what you have. */}
      <Panel
        theme={theme}
        scale={P}
        testId="table-sign"
        style={{
          position: 'absolute',
          left: header.x * P,
          top: header.y * P,
          width: header.w * P,
          height: header.h * P,
          padding: `0 ${2 * P}px`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <PixelText text={titleLine} scale={P * TEXT_ZOOM} ink={INK.dark} />
        {layout.headerLines === 2 && <PixelText text={needs.subtitle} scale={P * TEXT_ZOOM} ink={INK.dark} />}
      </Panel>

      <div
        style={{
          position: 'absolute',
          left: layout.felt.x * P,
          top: layout.felt.y * P,
          width: layout.felt.w * P,
          height: layout.felt.h * P,
        }}
      >
        {felt(layout)}
      </div>

      <div
        style={{
          position: 'relative',
          marginLeft: layout.dock.x * P,
          width: layout.dock.w * P,
          minHeight: layout.dock.h * P,
        }}
      >
        {dock(layout)}
      </div>
    </div>
  )
}
