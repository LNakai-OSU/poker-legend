/**
 * The chips a player has pushed out in front of them. Seeing the bet as a
 * physical stack on the felt — and watching it slide into the middle when the
 * street ends — is most of what makes a betting round read as poker.
 */

interface Denomination {
  value: number
  face: string
  edge: string
}

// Roughly the standard casino colours, biggest first.
const DENOMINATIONS: Denomination[] = [
  { value: 5000, face: '#8a4fbd', edge: '#5e3184' },
  { value: 1000, face: '#2b2b33', edge: '#111117' },
  { value: 500, face: '#7a3fa0', edge: '#522a6d' },
  { value: 100, face: '#1f1f26', edge: '#0b0b10' },
  { value: 25, face: '#1f6b3a', edge: '#124327' },
  { value: 5, face: '#b02a2a', edge: '#761a1a' },
  { value: 1, face: '#d8d8de', edge: '#9a9aa4' },
]

/** Breaks an amount into chips, capped so a huge bet doesn't draw a skyscraper. */
function chipBreakdown(amount: number, maxChips = 9): Denomination[] {
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
  if (amount <= 0) return null
  const chips = chipBreakdown(amount)

  return (
    <div
      data-testid={testId}
      data-amount={amount}
      className={toPot ? 'chips-to-pot' : undefined}
      style={{
        position: 'relative',
        height: 26,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: 4,
        margin: '2px 0',
      }}
    >
      <div style={{ position: 'relative', width: 16, height: 22 }}>
        {chips.map((chip, i) => (
          <span
            key={i}
            style={{
              position: 'absolute',
              left: 0,
              bottom: i * 2.5,
              width: 16,
              height: 6,
              borderRadius: '50%',
              background: chip.face,
              border: `1px solid ${chip.edge}`,
              boxShadow: '0 1px 0 rgba(0,0,0,0.35)',
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: 11, color: '#f2c14e', lineHeight: '14px' }}>{amount.toLocaleString()}</span>
    </div>
  )
}
