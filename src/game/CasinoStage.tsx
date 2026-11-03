import { useMemo, type ReactNode } from 'react'
import { ArtCanvas } from './TableStage'
import { paintHall, type HallKind } from './pixel/casinoArt'
import { Panel, PxButton } from './pixel/ui'
import { PixelText } from './pixel/PixelText'
import { INK } from './pixel/ink'
import { measureText } from './pixel/font'
import { TABLE_THEMES, type TableTheme } from './tableThemes'
import { snap } from './useCrispScale'
import { useViewport } from './useViewport'
import type { CityId } from './state'
import type { TableThemeId } from '../world/types'
import { UI_FONT } from './pixel/webFont'

/**
 * The room a casino game is played in: the poker table's way of laying a scene
 * out, for the games that are not poker.
 *
 * One art grid for the whole window — painted wall and carpet behind, a sign in
 * the corner with the stakes and your wallet, the game in the middle, the
 * controls under it — drawn at the biggest whole number of device pixels per art
 * pixel at which the game still fits. Every line in it is exactly as thick as
 * every other, which is what makes it read as one picture.
 */

const ROOM_OF_TOWN: Partial<Record<CityId, TableThemeId>> = {
  silverCreek: 'silvercreek',
  riverbend: 'riverboat',
  crescentHarbor: 'harbor',
  palmCay: 'palmcay',
  neonMesa: 'mesa',
  portoLumina: 'lumina',
}

/** The theme of the casino in this town, the same room its poker tables sit in. */
export function themeOfTown(cityId: CityId): TableTheme {
  return TABLE_THEMES[ROOM_OF_TOWN[cityId] ?? 'silvercreek']
}

export interface Stage {
  /** CSS pixels per art pixel. */
  P: number
  /** The window, in art pixels. */
  W: number
  H: number
  theme: TableTheme
  coarse: boolean
  /** Below the sign, where the game may start. */
  top: number
  /** Which of the `fits` the scale was chosen for: a game may lay itself out two ways. */
  variant: number
}

/** The sign across the top: height in art pixels. */
export const SIGN_H = 24

export function CasinoStage({
  kind,
  theme,
  title,
  subtitle,
  fits,
  onBack,
  backLabel,
  testId,
  children,
}: {
  kind: HallKind
  theme: TableTheme
  title: string
  subtitle: string
  /**
   * The least the game can be squeezed to, in art pixels, for each way it can lay
   * itself out; the scale is the biggest at which any of them fits, and the one
   * that gives it is the `variant` the game is told.
   */
  fits: Array<{ w: number; h: number }>
  onBack: () => void
  backLabel: string
  testId: string
  children: (stage: Stage) => ReactNode
}) {
  const view = useViewport()
  const { P, variant } = useMemo(() => {
    let best = { P: 1, variant: 0 }
    let bestFit = -1
    fits.forEach((f, i) => {
      const fit = Math.min(view.w / f.w, view.h / (f.h + SIGN_H), 6)
      const scale = snap(Math.max(1, fit), view.dpr)
      if (scale > bestFit) {
        bestFit = scale
        best = { P: scale, variant: i }
      }
    })
    return best
  }, [view.w, view.h, view.dpr, fits])
  const W = Math.ceil(view.w / P)
  const H = Math.max(Math.ceil(view.h / P), fits[variant].h + SIGN_H)
  const paint = useMemo(
    () => (canvas: HTMLCanvasElement) => paintHall(kind, theme, W, H).paint(canvas),
    [kind, theme, W, H],
  )
  const stage: Stage = { P, W, H, theme, coarse: view.coarse, top: SIGN_H, variant }
  // The menu and sound buttons float over the top right of the window: keep the sign clear of them.
  const room = W - 6 - Math.ceil(112 / P)
  const full = measureText(title) + measureText(subtitle) + 4 + 6 + 2 * 3
  const shown = full <= room ? subtitle : subtitle.split(' · ')[0]

  return (
    <div
      data-testid={testId}
      data-scale={P}
      style={{
        position: 'relative',
        width: '100%',
        height: H * P,
        minHeight: '100vh',
        overflow: 'hidden',
        background: '#100c14',
        color: '#e8e8f0',
        fontFamily: UI_FONT,
        imageRendering: 'pixelated',
      }}
    >
      <ArtCanvas width={W} height={H} scale={P} paint={paint} testId="room" />
      <Panel
        theme={theme}
        scale={P}
        testId="casino-sign"
        style={{
          position: 'absolute',
          left: 3 * P,
          top: 3 * P,
          height: 18 * P,
          padding: `0 ${3 * P}px`,
          display: 'flex',
          alignItems: 'center',
          gap: 4 * P,
        }}
      >
        <PixelText text={title} scale={P} ink={INK.dark} />
        <PixelText text={shown} scale={P} ink={{ color: '#6a5a48', shadow: '#d8d0c0' }} />
      </Panel>
      <PxButton
        lines={[backLabel]}
        scale={P}
        role="fold"
        height={view.coarse ? Math.ceil(44 / P) : 16}
        onClick={onBack}
        testId="casino-back"
        style={{ position: 'absolute', left: 3 * P, bottom: 3 * P }}
      />
      {children(stage)}
    </div>
  )
}

/** Absolutely places a block in art pixels. */
export function place(P: number, x: number, y: number, w?: number, h?: number): React.CSSProperties {
  return {
    position: 'absolute',
    left: Math.round(x) * P,
    top: Math.round(y) * P,
    width: w === undefined ? undefined : w * P,
    height: h === undefined ? undefined : h * P,
  }
}

/** Where a block of this height starts so that it sits in the middle of the room under the sign. */
export function centreY(stage: Stage, contentH: number): number {
  return Math.max(stage.top + 2, Math.round(stage.top + (stage.H - stage.top - contentH) / 2) - 3)
}
