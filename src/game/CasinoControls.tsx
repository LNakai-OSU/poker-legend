import { chipTopUrl } from './pixel/chips'
import { frameStyle } from './pixel/frame'
import { buttonFrame } from './pixel/themeFrames'
import { PixelText } from './pixel/PixelText'
import { INK } from './pixel/ink'
import { measureText } from './pixel/font'

/** The chip a stake is played with: the colours a casino prints its denominations in. */
export function stakeChip(stake: number): { face: string; spot: string } {
  if (stake >= 1000) return { face: '#e8b830', spot: '#2a2a36' }
  if (stake >= 200) return { face: '#30303a', spot: '#f2f2f6' }
  if (stake >= 50) return { face: '#289048', spot: '#f2f2f6' }
  return { face: '#c82828', spot: '#f2f2f6' }
}

const CHIP_ZOOM = 1

/**
 * A row of chips to pick a stake from: the chip, then its amount, pressed in and
 * lit when it is the one you are betting with.
 */
export function ChipRow({
  stakes,
  value,
  onPick,
  disabled,
  P,
  height,
  testPrefix,
}: {
  stakes: number[]
  value: number
  onPick: (stake: number) => void
  disabled?: boolean
  P: number
  height: number
  testPrefix: string
}) {
  return (
    <>
      {stakes.map((s) => {
        const chip = stakeChip(s)
        const on = value === s
        const label = `$${s.toLocaleString()}`
        return (
          <button
            key={s}
            type="button"
            data-testid={`${testPrefix}-${s}`}
            aria-pressed={on}
            disabled={disabled}
            onClick={() => onPick(s)}
            className={on ? 'px-btn px-selected' : 'px-btn'}
            style={{
              ...frameStyle(buttonFrame(on ? 'raise' : 'plain'), P),
              height: height * P,
              minHeight: 0,
              minWidth: (11 * CHIP_ZOOM + measureText(label) + 6) * P,
              flex: '1 1 0',
              padding: 0,
              background: 'none',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.72 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3 * P,
            }}
          >
            <img
              src={chipTopUrl(chip.face, chip.spot)}
              alt=""
              draggable={false}
              style={{ width: 11 * CHIP_ZOOM * P, height: 11 * CHIP_ZOOM * P, imageRendering: 'pixelated', flex: 'none' }}
            />
            <PixelText text={label} scale={P} ink={INK.light} />
          </button>
        )
      })}
    </>
  )
}
