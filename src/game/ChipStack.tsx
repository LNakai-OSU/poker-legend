/**
 * The chips a player has pushed out in front of them. Seeing the bet as a
 * physical stack on the felt — and watching it slide into the middle when the
 * street ends — is most of what makes a betting round read as poker.
 */
import { chipBreakdown, chipStackUrl } from './pixel/chips'
import { PixelText } from './pixel/PixelText'
import { INK, type Ink } from './pixel/ink'

/** How much bigger than the table's pixel a bet's chips and amount are drawn. */
const BET_ZOOM = 2

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
  // Drawn twice the size of the table's other art: a bet is what you watch for.
  const z = BET_ZOOM
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
        gap: 2 * scale * z,
      }}
    >
      <img
        src={stack.url}
        alt=""
        draggable={false}
        style={{ width: stack.w * scale * z, height: stack.h * scale * z, flex: 'none' }}
      />
      <PixelText text={`${prefix}${amount.toLocaleString()}`} scale={scale * z} ink={ink} />
    </div>
  )
}
