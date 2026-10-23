import { describe, expect, it } from 'vitest'
import { EventMachine, FORCED_RIDE_MS, type EventStage, type MachineHost } from './eventMachine'
import { initialState, type GameState } from './state'
import type { GameEvent } from '../world/events'

/**
 * A beat played through without a screen: the host records what the machine
 * asked for, and the clock only moves when the test says so.
 */
function harness(start: Partial<GameState> = {}) {
  let state: GameState = { ...initialState(), areaId: 'basin', ...start }
  let stage: EventStage | null = null
  let clock = 0
  const timers: Array<{ at: number; fn: () => void; id: number }> = []
  let nextTimer = 1
  const log: string[] = []
  const host: MachineHost = {
    getState: () => state,
    setState: (update) => {
      state = update(state)
    },
    onStage: (s) => {
      stage = s
    },
    onRunning: () => {},
    startTable: (id) => log.push(`table ${id}`),
    startPokerNight: () => log.push('poker night'),
    place: (col, row) => log.push(`place ${col},${row}`),
    startRide: (ride) => log.push(`ride to ${ride.destination} with ${ride.with.join(',')}`),
    endRide: () => log.push('off the bus'),
    playSound: () => {},
    schedule: (ms, fn) => {
      const id = nextTimer++
      timers.push({ at: clock + ms, fn, id })
      return id
    },
    cancel: (id) => {
      const i = timers.findIndex((t) => t.id === id)
      if (i >= 0) timers.splice(i, 1)
    },
    now: () => clock,
  }
  const machine = new EventMachine(host)
  /** Moves the clock on, firing whatever comes due. */
  const tick = (ms: number) => {
    clock += ms
    for (;;) {
      const due = timers.filter((t) => t.at <= clock).sort((a, b) => a.at - b.at)[0]
      if (!due) break
      timers.splice(timers.indexOf(due), 1)
      due.fn()
    }
  }
  return {
    machine,
    log,
    tick,
    get state() {
      return state
    },
    get stage() {
      return stage!
    },
  }
}

const beat = (actions: GameEvent['actions'], extra: Partial<GameEvent> = {}): GameEvent => ({
  id: 'test-beat',
  about: 'A beat for the test.',
  trigger: { kind: 'talkTo', characterId: 'marcus' },
  actions,
  ...extra,
})

describe('a choice', () => {
  const stake = beat([
    { kind: 'dialogue', speaker: 'kit', lines: ['Kit: Stake me?'] },
    {
      kind: 'choice',
      speaker: 'kit',
      prompt: 'Stake Kit?',
      options: [
        {
          label: 'Stake him $1,000',
          conditions: [{ kind: 'cashAtLeast', amount: 1000 }],
          then: [
            { kind: 'giveCash', amount: -1000 },
            { kind: 'setFlag', flag: 'stakedKit' },
            { kind: 'dialogue', speaker: 'kit', lines: ['Kit: Thank you.'] },
          ],
        },
        { label: 'Not this time', then: [{ kind: 'dialogue', speaker: 'kit', lines: ['Kit: Fair.'] }] },
      ],
    },
    { kind: 'dialogue', lines: ['After, whichever way.'] },
  ])

  it('waits for an answer, then plays that answer and carries on after the question', () => {
    const h = harness({ cash: 5000 })
    h.machine.run(stake)
    expect(h.stage.dialogue?.lines).toEqual(['Kit: Stake me?'])
    h.machine.advance()
    expect(h.stage.choice?.options.map((o) => o.open)).toEqual([true, true])
    expect(h.machine.choose(0)).toBe(true)
    expect(h.state.cash).toBe(4000)
    expect(h.state.flags.stakedKit).toBe(true)
    expect(h.stage.dialogue?.lines).toEqual(['Kit: Thank you.'])
    h.machine.advance()
    expect(h.stage.dialogue?.lines).toEqual(['After, whichever way.'])
    h.machine.advance()
    expect(h.machine.isRunning).toBe(false)
    expect(h.state.completedEventIds).toContain('test-beat')
  })

  it('shows an answer it cannot give greyed, says why, and will not take it', () => {
    const h = harness({ cash: 200 })
    h.machine.run(stake)
    h.machine.advance()
    expect(h.stage.choice?.options[0]).toMatchObject({ open: false, why: 'needs $1,000' })
    expect(h.machine.choose(0)).toBe(false)
    expect(h.state.flags.stakedKit).toBe(false)
    expect(h.machine.choose(1)).toBe(true)
    expect(h.stage.dialogue?.lines).toEqual(['Kit: Fair.'])
  })

  it('leaves a hidden answer off the list while it is closed', () => {
    const h = harness({ cash: 0 })
    const hidden = beat([
      {
        kind: 'choice',
        prompt: 'Pay?',
        options: [
          { label: 'Pay', conditions: [{ kind: 'cashAtLeast', amount: 10 }], hidden: true, then: [{ kind: 'setFlag', flag: 'cameBack' }] },
          { label: 'Leave', then: [] },
        ],
      },
    ])
    h.machine.run(hidden)
    expect(h.stage.choice?.options.map((o) => o.label)).toEqual(['Leave'])
    // The first one shown is the one picked, not the first one written.
    h.machine.choose(0)
    expect(h.state.flags.cameBack).toBe(false)
    expect(h.machine.isRunning).toBe(false)
  })

  it('ends at a table when an answer sits you down, and says nothing after', () => {
    const h = harness({ cash: 0 })
    h.machine.run(
      beat([
        { kind: 'choice', prompt: 'Deal you in?', options: [{ label: 'Deal me in', then: [{ kind: 'startPokerNight' }] }, { label: 'No', then: [] }] },
        { kind: 'dialogue', lines: ['Only if you said no.'] },
      ]),
    )
    h.machine.choose(0)
    expect(h.log).toContain('poker night')
    expect(h.machine.isRunning).toBe(false)
  })
})

describe('an if', () => {
  it('reads a flag a moment ago in the same beat set, as well as one set long before', () => {
    const h = harness()
    h.machine.run(
      beat([
        { kind: 'setFlag', flag: 'metDana' },
        { kind: 'if', when: [{ kind: 'flag', flag: 'metDana' }], then: [{ kind: 'giveCash', amount: 5 }], else: [{ kind: 'giveCash', amount: 1 }] },
        { kind: 'if', when: [{ kind: 'flag', flag: 'brushedOffDana' }], then: [{ kind: 'giveCash', amount: 100 }], else: [{ kind: 'giveCash', amount: 10 }] },
      ]),
    )
    expect(h.state.cash).toBe(15)
  })
})

describe('stakes and paying back', () => {
  it('takes a sponsor’s stake on their terms, and pays all of it back when it can', () => {
    const h = harness({ cash: 100 })
    h.machine.run(beat([{ kind: 'takeStake', sponsorId: 'cass' }]))
    expect(h.state.cash).toBe(1600)
    expect(h.state.debts).toHaveLength(1)
    expect(h.state.record.sponsors.cass.staked).toBe(1)
    // $1,875 owed and $1,600 held: nothing changes hands.
    const pay = beat([{ kind: 'repay', sponsorId: 'cass' }], { id: 'pay-up', repeatable: true })
    h.machine.run(pay)
    expect(h.state.debts).toHaveLength(1)
    h.machine.run(beat([{ kind: 'giveCash', amount: 400 }], { id: 'win-some', repeatable: true }))
    h.machine.run(pay)
    expect(h.state.debts).toHaveLength(0)
    expect(h.state.cash).toBe(2000 - 1875)
    expect(h.state.record.sponsors.cass.repaid).toBe(1)
  })
})

describe('people walking, and a ride you cannot get off', () => {
  it('waits for somebody to arrive, and remembers where they stand', () => {
    const h = harness()
    h.machine.run(
      beat([
        { kind: 'moveNpc', characterId: 'dana', from: { col: 27, row: 7 }, to: 'player', pace: 'run' },
        { kind: 'dialogue', speaker: 'dana', lines: ['Dana: There you are.'] },
      ]),
    )
    const [cue] = h.stage.cues
    expect(cue).toMatchObject({ who: 'dana', to: 'player', pace: 'run', areaId: 'basin' })
    // Brought on at the end of the street before she runs.
    expect(h.stage.cast.dana).toEqual({ areaId: 'basin', col: 27, row: 7 })
    expect(h.stage.dialogue).toBeUndefined()
    h.machine.cueDone(cue.id, { col: 6, row: 4 })
    expect(h.stage.cast.dana).toEqual({ areaId: 'basin', col: 6, row: 4 })
    expect(h.stage.dialogue?.lines).toEqual(['Dana: There you are.'])
  })

  it('never hangs on a walk the street cannot finish', () => {
    const h = harness()
    h.machine.run(beat([{ kind: 'moveNpc', characterId: 'dana', to: { col: 9, row: 9 } }]))
    expect(h.machine.isRunning).toBe(true)
    h.tick(30000)
    expect(h.machine.isRunning).toBe(false)
    expect(h.stage.cast.dana).toEqual({ areaId: 'basin', col: 9, row: 9 })
  })

  it('takes you across town with company, says what is said on the way, and costs the hour', () => {
    const h = harness({ period: 'morning' })
    h.machine.run(
      beat([
        {
          kind: 'ride',
          areaId: 'eastgate',
          col: 9,
          row: 13,
          with: ['dana'],
          during: [{ kind: 'dialogue', speaker: 'dana', lines: ['Dana: Sit down.'] }],
        },
        { kind: 'dialogue', speaker: 'dana', lines: ['Dana: Here.'] },
      ]),
    )
    expect(h.log).toEqual(['ride to Eastgate with dana'])
    expect(h.stage.ride?.with).toEqual(['dana'])
    expect(h.stage.dialogue?.lines).toEqual(['Dana: Sit down.'])
    h.machine.advance()
    // However fast it is read, the bus still takes a while.
    expect(h.log).not.toContain('off the bus')
    h.tick(FORCED_RIDE_MS)
    expect(h.log).toEqual(['ride to Eastgate with dana', 'place 9,13', 'off the bus'])
    expect(h.state.areaId).toBe('eastgate')
    expect(h.state.period).toBe('afternoon')
    expect(h.stage.cast.dana).toEqual({ areaId: 'eastgate', beside: 'player' })
    expect(h.stage.dialogue?.lines).toEqual(['Dana: Here.'])
  })

  it('keeps people where a beat left them until the player walks away', () => {
    const h = harness()
    h.machine.run(beat([{ kind: 'moveNpc', characterId: 'dana', from: { col: 1, row: 1 }, to: { col: 2, row: 1 } }]))
    h.machine.cueDone(h.stage.cues[0].id)
    expect(h.machine.isRunning).toBe(false)
    expect(h.stage.cast.dana).toEqual({ areaId: 'basin', col: 2, row: 1 })
    h.machine.clearCast()
    expect(h.stage.cast).toEqual({})
  })
})
