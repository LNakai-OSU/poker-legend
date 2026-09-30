import { describe, expect, it } from 'vitest'
import { DEFAULT_VOLUME, resolveStoredVolume } from './audio'

describe('resolveStoredVolume', () => {
  it('uses the default when nothing is stored', () => {
    // The bug: Number(null) === 0, which passed a "0 <= v <= 1" check, so every
    // fresh profile started at volume 0 while the UI said the sound was on.
    expect(resolveStoredVolume(null)).toBe(DEFAULT_VOLUME)
  })

  it('uses the default for an empty or unparseable value', () => {
    expect(resolveStoredVolume('')).toBe(DEFAULT_VOLUME)
    expect(resolveStoredVolume('   ')).toBe(DEFAULT_VOLUME)
    expect(resolveStoredVolume('loud')).toBe(DEFAULT_VOLUME)
  })

  it('uses the default for a value outside 0..1', () => {
    expect(resolveStoredVolume('-0.5')).toBe(DEFAULT_VOLUME)
    expect(resolveStoredVolume('4')).toBe(DEFAULT_VOLUME)
  })

  it('honours a stored value, including a deliberate zero', () => {
    expect(resolveStoredVolume('0')).toBe(0)
    expect(resolveStoredVolume('0.4')).toBe(0.4)
    expect(resolveStoredVolume('1')).toBe(1)
  })

  it('never silences a fresh profile', () => {
    expect(resolveStoredVolume(null)).toBeGreaterThan(0)
  })
})
