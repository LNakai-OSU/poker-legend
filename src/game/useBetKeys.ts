import { useEffect, useRef, useState } from 'react'
import { isActionKey, useKeyLayer } from './keys'

/** The things a betting menu can be pointed at with the keyboard. */
export type BetStop = 'fold' | 'check' | 'call' | 'raise'

/**
 * Betting without the mouse: left and right (or A and D) move between the
 * buttons, up and down (W and S) step the raise through its sizes — the
 * minimum, the pot fractions, all in — and Space (or X, E, Enter) does what is
 * pointed at. The pointer starts on the quiet choice, check or call, so a
 * stray press is never a raise.
 */
export function useBetKeys({
  active,
  stops,
  sizes,
  size,
  setSize,
  onPick,
  resetKey,
}: {
  /** It is the player's turn and nothing is over the table. */
  active: boolean
  stops: BetStop[]
  /** Raise-to amounts, smallest first. */
  sizes: number[]
  size: number
  setSize: (to: number) => void
  onPick: (stop: BetStop) => void
  /** Changes whenever a fresh decision starts, which puts the pointer back. */
  resetKey: string
}): BetStop | null {
  const isTop = useKeyLayer(active)
  const firstStop = (): BetStop | null => stops.find((s) => s === 'check' || s === 'call') ?? stops[0] ?? null
  const [cursor, setCursor] = useState<BetStop | null>(firstStop)
  useEffect(() => setCursor(firstStop()), [resetKey])

  // Always the latest, for a listener that is attached once.
  const latest = useRef({ stops, sizes, size, setSize, onPick, cursor })
  latest.current = { stops, sizes, size, setSize, onPick, cursor }

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (!isTop() || e.metaKey || e.ctrlKey || e.altKey) return
      const { stops, sizes, size, setSize, onPick, cursor } = latest.current
      const here = cursor && stops.includes(cursor) ? cursor : (stops[0] ?? null)
      if (here === null) return
      const horizontal = e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A' ? -1 : e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D' ? 1 : 0
      const vertical = e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' ? 1 : e.key === 'ArrowDown' || e.key === 's' || e.key === 'S' ? -1 : 0
      if (horizontal !== 0) {
        e.preventDefault()
        const at = stops.indexOf(here)
        setCursor(stops[(at + horizontal + stops.length) % stops.length])
      } else if (vertical !== 0 && stops.includes('raise') && sizes.length > 0) {
        e.preventDefault()
        // The next size past the one showing, in the way pressed.
        const next = vertical > 0 ? sizes.find((s) => s > size) : [...sizes].reverse().find((s) => s < size)
        setSize(next ?? (vertical > 0 ? sizes[sizes.length - 1] : sizes[0]))
        setCursor('raise')
      } else if (isActionKey(e)) {
        e.preventDefault()
        if (e.repeat) return
        onPick(here)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active])

  return active ? cursor : null
}
