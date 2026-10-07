/**
 * The chips a player has pushed out in front of them. Seeing the bet as a
 * physical stack on the felt — and watching it slide into the middle when the
 * street ends — is most of what makes a betting round read as poker.
 */

interface Denomination {
  value: number
  face: string
  edge: string
  /** The contrasting edge spots every real chip is printed with. */
  spot: string
}

// Roughly the standard casino colours, biggest first.
const DENOMINATIONS: Denomination[] = [
  { value: 5000, face: '#8a4fbd', edge: '#4a2569', spot: '#f0e6f8' },
  { value: 1000, face: '#2b2b33', edge: '#0c0c11', spot: '#d9c46a' },
  { value: 500, face: '#7a3fa0', edge: '#44215c', spot: '#f2f2f6' },
  { value: 100, face: '#20242e', edge: '#0a0c11', spot: '#8ad4ff' },
  { value: 25, face: '#1f6b3a', edge: '#0f3d22', spot: '#f2f2f6' },
  { value: 5, face: '#b02a2a', edge: '#6d1717', spot: '#f2f2f6' },
  { value: 1, face: '#d8d8de', edge: '#8e8e98', spot: '#2b2b33' },
]

const CHIP_W = 18
const CHIP_H = 7

/** Breaks an amount into chips, capped so a huge bet doesn't draw a skyscraper. */
function chipBreakdown(amount: number, maxChips = 5): Denomination[] {
  const chips: Denomination[] = []
  let left = amount
  for (const denom of DENOMINATIONS) {
    while (left >= denom.value && chips.length < maxChips) {
      chips.push(denom)
      left -= denom.value
    }
  }
  return chips
}

/**
 * Height of the row a bet occupies, reserved whether or not there is a bet.
 *
 * Reserved because the alternative is a seat that changes size the moment somebody
 * bets, and a seat that changes size pushes its own cards — and everything else —
 * around the felt. That is what put bets on top of the pot and the community
 * cards in the first place.
 */
export const BET_ROW_HEIGHT = 'clamp(10px, 2vh, 16px)'

export function ChipStack({
  amount,
  testId,
  toPot = false,
}: {
  amount: number
  testId?: string
  /** Animate the stack sliding into the middle, as at the end of a street. */
  toPot?: boolean
}) {
  // The row is always there; only the chips in it come and go.
  if (amount <= 0) return <div style={{ height: BET_ROW_HEIGHT }} />
  const chips = chipBreakdown(amount)

  return (
    <div
      data-testid={testId}
      data-amount={amount}
      className={toPot ? 'chips-to-pot' : undefined}
      style={{
        position: 'relative',
        height: BET_ROW_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
      }}
    >
      <div style={{ position: 'relative', width: CHIP_W, height: BET_ROW_HEIGHT }}>
        {chips.map((chip, i) => (
          <span
            key={i}
            style={{
              position: 'absolute',
              left: 0,
              bottom: i * 2.5,
              width: CHIP_W,
              height: CHIP_H,
              borderRadius: '50%',
              // Seen almost edge-on: a lit top face, a darker rim under it, and
              // the printed edge spots breaking up the side of the stack.
              background: `
                radial-gradient(ellipse at 50% 32%, ${chip.spot}22 0%, transparent 62%),
                repeating-linear-gradient(90deg,
                  ${chip.spot} 0 2px, transparent 2px 7px),
                linear-gradient(180deg, ${chip.face} 0%, ${chip.face} 55%, ${chip.edge} 100%)
              `,
              boxShadow: `0 1px 0 ${chip.edge}, inset 0 1px 0 rgba(255,255,255,0.22)`,
              border: `0.5px solid ${chip.edge}`,
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: 11, color: '#f2c14e', lineHeight: '14px' }}>{amount.toLocaleString()}</span>
    </div>
  )
}
