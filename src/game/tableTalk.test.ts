import { describe, expect, it } from 'vitest'
import { CHARACTERS } from '../world/characters'
import { TALK } from '../world/talk'
import { chooseSpeaker, MOMENT_LINES, speaksAboutOwnAction } from './tableTalk'

describe('table talk', () => {
  it('somebody who never talks never does', () => {
    for (let i = 0; i < 50; i++) {
      expect(chooseSpeaker(['dmitri', 'marchetti'], 'flop', () => 0)).toBeNull()
      expect(speaksAboutOwnAction('dmitri', () => 0)).toBe(false)
    }
  })

  it('the chattiest of those who want to speak goes first, in their own voice', () => {
    const said = chooseSpeaker(['mack', 'gus'], 'youRaise', () => 0)
    expect(said?.playerId).toBe('gus')
    expect(MOMENT_LINES.jolly.youRaise).toContain(said?.text)
  })

  it('nobody speaks when every roll fails', () => {
    expect(chooseSpeaker(['gus', 'bette'], 'turn', () => 0.99)).toBeNull()
  })

  it('a talkative character talks far more than a quiet one', () => {
    let seed = 1
    const roll = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    const count = (id: string) => Array.from({ length: 2000 }, () => speaksAboutOwnAction(id, roll)).filter(Boolean).length
    expect(count('gus')).toBeGreaterThan(count('mack') * 4)
  })

  it('every talk entry names a real character, and every mood has a line for every moment', () => {
    for (const id of Object.keys(TALK)) expect(CHARACTERS[id], `${id} is not a character`).toBeDefined()
    for (const lines of Object.values(MOMENT_LINES)) for (const pool of Object.values(lines)) expect(pool.length).toBeGreaterThan(1)
  })

  it('the cast is a mix: some silent, some chatty, some grumpy and some jolly', () => {
    const entries = Object.values(TALK)
    expect(entries.some((t) => t.chatty === 0)).toBe(true)
    expect(entries.some((t) => t.chatty >= 0.8)).toBe(true)
    expect(entries.some((t) => t.mood === 'grumpy')).toBe(true)
    expect(entries.some((t) => t.mood === 'jolly')).toBe(true)
  })
})
