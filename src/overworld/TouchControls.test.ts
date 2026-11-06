import { describe, expect, it } from 'vitest'
import { stickDirection } from './TouchControls'

describe('stickDirection', () => {
  it('ignores the dead zone', () => expect(stickDirection(5, -5, null)).toBeNull())
  it('picks the dominant axis', () => {
    expect(stickDirection(0, -30, null)).toBe('up')
    expect(stickDirection(30, 5, null)).toBe('right')
    expect(stickDirection(-30, 5, null)).toBe('left')
    expect(stickDirection(2, 30, null)).toBe('down')
  })
  it('holds its axis through a near-diagonal', () => {
    expect(stickDirection(30, -32, 'right')).toBe('right')
    expect(stickDirection(30, -45, 'right')).toBe('up')
  })
})
