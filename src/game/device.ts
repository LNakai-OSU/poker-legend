import { useEffect, useState } from 'react'

/**
 * What the device is driven with: a finger, or a keyboard and a mouse.
 *
 * This used to be "coarse pointer *or* narrower than 820px", so a desktop
 * window dragged small was taken for a phone: the d-pad covered the street,
 * the prompt said "Tap E", and the keyboard player was handed controls for a
 * screen they were not touching. How big the window is decides how the layout
 * fits (the world zooms out, the table scales down); what the device can do
 * decides which controls it gets.
 *
 * Touch, then, is any of:
 * - a primary pointer that is coarse — a phone or a tablet without a trackpad;
 * - touch points and no way to hover — a touch screen with nothing else;
 * - touch points and a phone's or a tablet's user agent — for browsers that
 *   report their pointer oddly, and for emulated devices in the browser suite.
 *
 * A laptop with a touch screen has a fine primary pointer and hover, so it is
 * a laptop.
 */
export interface DeviceSignals {
  coarse: boolean
  hover: boolean
  touchPoints: number
  userAgent: string
}

const MOBILE_AGENT = /Mobi|Android|iPhone|iPad|iPod|Silk|Kindle|BlackBerry|Opera Mini|IEMobile/i

export function isTouchFirst(signals: DeviceSignals): boolean {
  if (signals.coarse) return true
  if (signals.touchPoints <= 0) return false
  return !signals.hover || MOBILE_AGENT.test(signals.userAgent)
}

function query(q: string): boolean {
  return typeof window !== 'undefined' && (window.matchMedia?.(q).matches ?? false)
}

export function readDeviceSignals(): DeviceSignals {
  return {
    coarse: query('(pointer: coarse)'),
    hover: query('(hover: hover)'),
    touchPoints: typeof navigator === 'undefined' ? 0 : navigator.maxTouchPoints || 0,
    userAgent: typeof navigator === 'undefined' ? '' : navigator.userAgent,
  }
}

/** Whether this device is driven by touch, as it is now. */
export function prefersTouch(): boolean {
  return isTouchFirst(readDeviceSignals())
}

/**
 * The same, kept current: a tablet that has a keyboard and trackpad attached
 * becomes a keyboard device, and back. Resizing the window changes nothing.
 */
export function useTouchFirst(): boolean {
  const [touch, setTouch] = useState(prefersTouch)
  useEffect(() => {
    const queries = ['(pointer: coarse)', '(hover: hover)'].map((q) => window.matchMedia?.(q)).filter((m) => !!m)
    const update = () => setTouch(prefersTouch())
    for (const m of queries) m.addEventListener('change', update)
    return () => {
      for (const m of queries) m.removeEventListener('change', update)
    }
  }, [])
  return touch
}
