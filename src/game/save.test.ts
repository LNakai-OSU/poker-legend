import { beforeEach, describe, expect, it } from 'vitest'
import { loadGame, saveGame, saveHere, setSaveProfile } from './save'
import { initialState } from './state'

function stubStorage() {
  const data = new Map<string, string>()
  ;(globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  }
}

describe('saving', () => {
  beforeEach(() => {
    stubStorage()
    setSaveProfile(null)
  })

  it('a hand save keeps the exact tile; the next automatic save drops it', async () => {
    const state = { ...initialState(), cash: 777 }
    expect(await saveHere(state, { col: 7, row: 9 })).toBe('device')
    expect(loadGame()?.resume).toEqual({ col: 7, row: 9 })
    saveGame(state)
    expect(loadGame()?.resume).toBeUndefined()
    expect(loadGame()?.cash).toBe(777)
  })

  it('a save from an older build, missing later fields, still loads', () => {
    const old = { cash: 120, cityId: initialState().cityId, day: 4 }
    localStorage.setItem('poker-legend-save-v2', JSON.stringify(old))
    const loaded = loadGame()
    expect(loaded?.cash).toBe(120)
    expect(loaded?.day).toBe(4)
    expect(Array.isArray(loaded?.lessonIds)).toBe(true)
    expect(loaded?.casino).toBeDefined()
  })

  it('ignores a malformed resume tile', () => {
    localStorage.setItem('poker-legend-save-v2', JSON.stringify({ ...initialState(), resume: { col: 'x' } }))
    expect(loadGame()?.resume).toBeUndefined()
  })
})
