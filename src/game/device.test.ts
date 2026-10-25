import { describe, expect, it } from 'vitest'
import { isTouchFirst, type DeviceSignals } from './device'

const DESKTOP_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'

const desktop: DeviceSignals = { coarse: false, hover: true, touchPoints: 0, userAgent: DESKTOP_UA }

describe('which controls a device gets', () => {
  it('a desktop is a keyboard device however small its window (width is not a signal at all)', () => {
    expect(isTouchFirst(desktop)).toBe(false)
  })

  it('a phone is a touch device', () => {
    expect(isTouchFirst({ coarse: true, hover: false, touchPoints: 5, userAgent: IPHONE_UA })).toBe(true)
  })

  it('a phone that reports a fine pointer is still a phone, by its touch points and its agent', () => {
    expect(isTouchFirst({ coarse: false, hover: true, touchPoints: 5, userAgent: IPHONE_UA })).toBe(true)
  })

  it('a touch screen with no way to hover is a touch device', () => {
    expect(isTouchFirst({ coarse: false, hover: false, touchPoints: 10, userAgent: DESKTOP_UA })).toBe(true)
  })

  it('a laptop with a touch screen, a mouse and hover is a laptop', () => {
    expect(isTouchFirst({ coarse: false, hover: true, touchPoints: 10, userAgent: DESKTOP_UA })).toBe(false)
  })

  it('an iPad with a trackpad attached (desktop agent, fine pointer, hover) is a keyboard device', () => {
    expect(isTouchFirst({ coarse: false, hover: true, touchPoints: 5, userAgent: DESKTOP_UA })).toBe(false)
  })
})
