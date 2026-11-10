import { describe, expect, it } from 'vitest'
import { runoutCall } from './runoutCall'

const names = ['You', 'Mack']

describe('the call on a runout', () => {
  it('calls a coin flip a coin flip, and a favourite a favourite', () => {
    expect(runoutCall(names, [0.52, 0.48], null, 'preflop')).toContain('coin flip')
    expect(runoutCall(names, [0.81, 0.19], null, 'preflop')).toContain('You are the favourite at 81%')
  })

  it('says so when the flop turns it around', () => {
    expect(runoutCall(names, [0.3, 0.7], [0.8, 0.2], 'flop')).toContain('turns it around')
  })

  it('counts the underdog\'s cards on the turn, and calls drawing dead', () => {
    expect(runoutCall(names, [0.8, 0.2], [0.75, 0.25], 'turn')).toContain('about 9 cards')
    expect(runoutCall(names, [1, 0], [0.8, 0.2], 'turn')).toContain('drawing dead')
  })

  it('has something to say for three players too', () => {
    expect(runoutCall(['You', 'Mack', 'Deb'], [0.5, 0.3, 0.2], [0.4, 0.3, 0.3], 'turn')).toContain('Deb is down to 20%')
    expect(runoutCall(['You', 'Mack'], [0.7, 0.3], [0.7, 0.3], 'flop')).toContain('You still lead')
  })

  it('says nothing about nothing', () => {
    expect(runoutCall(['You'], [1], null, 'flop')).toBe('')
  })
})
