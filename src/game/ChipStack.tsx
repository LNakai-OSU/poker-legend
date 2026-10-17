/**
 * The chips a player has pushed out in front of them. Seeing the bet as a
 * physical stack on the felt — and watching it slide into the middle when the
 * street ends — is most of what makes a betting round read as poker.
 */
import { chipBreakdown, chipStackUrl } from './pixel/chips'
import { PixelText } from './pixel/PixelText'
import { INK, type Ink } from './pixel/ink'

export function ChipStack({
  amount,
  scale,
  height,
  testId,
  prefix = '',
  ink = INK.gold,
}: {
  amount: number
  /** CSS pixels per art pixel. */
  scale: number
  /**
   * The row a bet occupies, in art pixels, reserved whether or not there is a
   * bet: a seat that changed size the moment somebody bet pushed its own cards —
   * and everything else — around the felt.
   */
  height: number
  testId?: string
  /** Put in front of the amount, as in "+120" for a pot won. */
  prefix?: string
  ink?: Ink
}) {
  // The row is always there; only the chips in it come and go.
  if (amount <= 0) return <div style={{ height: height * scale }} />
  const stack = chipStackUrl(chipBreakdown(amount))
  return (
    <div
      data-testid={testId}
      data-amount={amount}
      style={{
        position: 'relative',
        height: height * scale,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: 2 * scale,
      }}
    >
      <img
        src={stack.url}
        alt=""
        draggable={false}
        style={{ width: stack.w * scale, height: stack.h * scale, imageRendering: 'pixelated', flex: 'none' }}
      />
      <PixelText text={`${prefix}${amount.toLocaleString()}`} scale={scale} ink={ink} />
    </div>
  )
}
