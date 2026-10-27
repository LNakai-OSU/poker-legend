import { describe, expect, it } from 'vitest'
import { EventMachine, FORCED_RIDE_MS, type EventStage, type MachineHost } from './eventMachine'
import { chapterOf, initialState, type GameState } from './state'
import { EVENTS, eventFor, type GameEvent } from '../world/events'
import { CITIES, TABLES } from '../world/content'

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

/**
 * The night of the first game, as the game has it — the real beats, not test
 * ones. Winning Marcus's game used to leave the player in his front room with
 * nothing said; now the win is followed by a scene that tells you where to go,
 * walks you home, and in the morning takes you there. docs/STORYBOARD.md, Act 0.
 */
describe('the night of the first game, played through', () => {
  const event = (id: string) => EVENTS.find((e) => e.id === id)!

  /** Plays a beat to its end: every line read, the first answer taken, every walk landed, every pause waited out. */
  function playThrough(h: ReturnType<typeof harness>, beat: GameEvent): string[] {
    const said: string[] = []
    h.machine.run(beat)
    for (let guard = 0; h.machine.isRunning && guard < 500; guard++) {
      const stage = h.stage
      if (stage.dialogue) {
        said.push(...stage.dialogue.lines)
        h.machine.advance()
      } else if (stage.reel) {
        // The broadcast between towns: its lines are turned in the scene, not here.
        h.machine.reelDone()
      } else if (stage.choice) {
        h.machine.choose(0)
      } else if (stage.cues.length > 0) {
        for (const cue of stage.cues) h.machine.cueDone(cue.id)
      } else {
        h.tick(1000)
      }
    }
    expect(h.machine.isRunning, `${beat.id} never finished`).toBe(false)
    return said
  }

  /** Up from Marcus's table a winner, having told Dana to mind her own business on the 14. */
  const justWon: Partial<GameState> = {
    areaId: 'marcus-house',
    period: 'evening',
    cash: 1500,
    flags: { ...initialState().flags, wonPokerNight: true, metDana: true, brushedOffDana: true },
    completedEventIds: ['dana-walks-you-to-the-bus', 'poker-night'],
  }
  const at = (change: Partial<GameState>) => harness({ ...justWon, ...change }).state

  it('starts the moment you get up from his table a winner, and only then', () => {
    const walk = eventFor(EVENTS, { kind: 'enterArea', areaId: 'marcus-house' }, at({}))
    expect(walk?.id).toBe('dana-walks-you-home')
    // Getting up is not walking in: only a beat that says `onLoad` is asked then.
    expect(walk?.trigger).toEqual({ kind: 'enterArea', areaId: 'marcus-house', onLoad: true })
    const lost = at({ flags: { ...justWon.flags!, wonPokerNight: false } })
    expect(eventFor(EVENTS, { kind: 'enterArea', areaId: 'marcus-house' }, lost)).toBeUndefined()
    // A save that won before this was written, and has heard Marcus's send-off.
    const heard = at({ completedEventIds: [...justWon.completedEventIds!, 'marcus-sends-you-off'] })
    expect(eventFor(EVENTS, { kind: 'enterArea', areaId: 'marcus-house' }, heard)).toBeUndefined()
  })

  it('has them praise you, blame their cards, name the bus, and walk you home to sleep', () => {
    const h = harness(justWon)
    const said = playThrough(h, event('dana-walks-you-home')).join('\n')
    expect(said).toMatch(/played that like you had done it for years/)
    expect(said).toMatch(/my cards were cold/)
    expect(said).toMatch(/watching you instead of my cards/)
    // What you said to her on the 14.
    expect(said).toMatch(/You were my business tonight/)
    expect(said).toMatch(/Silver Creek.*14 runs there from the depot, and the fare is nothing/)
    expect(said).toMatch(/hundred buys a seat at the low-stakes table/)
    // The fare it names is the fare the depot charges, and the town needs no bankroll.
    expect(CITIES.silverCreek.travelCost).toBe(0)
    expect(CITIES.silverCreek.unlockCash).toBe(0)
    expect(TABLES['silvercreek-low'].buyIn).toBe(100)

    // Home, in bed, and the next morning: the night costs the day a session would.
    expect(h.state.areaId).toBe('home')
    expect(h.state.day).toBe(2)
    expect(h.state.period).toBe('morning')
    expect(h.state.flags.marcusSeesYouOff).toBe(true)
    expect(h.state.completedEventIds).toContain('dana-walks-you-home')
    expect(said).toMatch(/hammering on your door/)
    // Once: getting up from his table again starts nothing.
    const again = { ...h.state, areaId: 'marcus-house', period: 'evening' as const }
    expect(eventFor(EVENTS, { kind: 'enterArea', areaId: 'marcus-house' }, again)).toBeUndefined()
    // Still Basin: no rent receipt under the door tonight.
    expect(eventFor(EVENTS, { kind: 'enterArea', areaId: 'home' }, h.state)).toBeUndefined()
  })

  it('has Marcus at the door in the morning, ride the 14 out with you and see you in to the low-stakes table', () => {
    const h = harness(justWon)
    playThrough(h, event('dana-walks-you-home'))
    // Out of the door.
    const outside = { ...h.state, areaId: 'basin' }
    const ride = eventFor(EVENTS, { kind: 'enterArea', areaId: 'basin' }, outside)
    expect(ride?.id).toBe('marcus-rides-out-with-you')
    expect(ride?.trigger).toEqual({ kind: 'enterArea', areaId: 'basin', onLoad: true })

    const out = harness(outside)
    const said = playThrough(out, ride!).join('\n')
    expect(said).toMatch(/rent is on my tab/)
    expect(said).toMatch(/Porto Lumina/)
    expect(said).toMatch(/hundred to sit/)
    expect(said).toMatch(/riverboat/)
    expect(out.log.some((l) => /^ride to .* with marcus$/.test(l))).toBe(true)

    // In the casino at Silver Creek, which now counts as somewhere you have been.
    expect(out.state.areaId).toBe('sc-floor')
    expect(out.state.cityId).toBe('silverCreek')
    expect(chapterOf(out.state)).toBe('silverCreek')
    // The bus ride is the hour any ride is: the same day, the afternoon.
    expect(out.state.day).toBe(2)
    expect(out.state.period).toBe('afternoon')
    expect(out.state.flags.marcusSeesYouOff).toBe(false)
    // And he has gone home: nobody left standing on the floor.
    expect(out.stage.cast.marcus).toBeUndefined()

    // Once, and the valet's card is not read to somebody Marcus walked in.
    expect(eventFor(EVENTS, { kind: 'enterArea', areaId: 'basin' }, { ...out.state, areaId: 'basin' })).toBeUndefined()
    expect(eventFor(EVENTS, { kind: 'enterArea', areaId: 'sc-street' }, { ...out.state, areaId: 'sc-street' })).toBeUndefined()
    // Ray noticed who walked you in.
    const ray = eventFor(EVENTS, { kind: 'talkTo', characterId: 'ray' }, out.state)
    expect(ray?.id).toBe('ray-is-due')
    expect(playThrough(harness(out.state), ray!).join('\n')).toMatch(/Saw your friend walk you in/)
    // Coming home later, the receipt is under the door.
    expect(eventFor(EVENTS, { kind: 'enterArea', areaId: 'home' }, { ...out.state, areaId: 'home' })?.id).toBe('rent-receipt')
  })

  it('still greets anybody who gets to Silver Creek on their own', () => {
    const walked = harness({ areaId: 'sc-street', cityId: 'silverCreek', unlockedCityIds: ['apartment', 'silverCreek'] }).state
    expect(eventFor(EVENTS, { kind: 'enterArea', areaId: 'sc-street' }, walked)?.id).toBe('arrive-silvercreek')
  })
})

describe('a reel', () => {
  it('holds the beat until it is over, then carries on', () => {
    const h = harness()
    h.machine.run(
      beat([
        { kind: 'reel', panels: [{ scene: 'bathroom', lines: [{ who: 'You', text: 'How did I get here?' }] }] },
        { kind: 'dialogue', speaker: 'marcus', lines: ['Marcus: After.'] },
      ]),
    )
    expect(h.stage.reel?.panels[0].scene).toBe('bathroom')
    expect(h.stage.dialogue).toBeUndefined()
    // Turning a text box does not end a film; only the film's own end does.
    h.machine.advance()
    expect(h.stage.reel).toBeDefined()
    h.machine.reelDone()
    expect(h.stage.reel).toBeUndefined()
    expect(h.stage.dialogue?.lines[0]).toBe('Marcus: After.')
  })
})

describe('the final table', () => {
  function play(h: ReturnType<typeof harness>, event: GameEvent): { reels: number } {
    let reels = 0
    h.machine.run(event)
    for (let guard = 0; h.machine.isRunning && guard < 200; guard++) {
      const stage = h.stage
      if (stage.dialogue) h.machine.advance()
      else if (stage.reel) {
        reels++
        h.machine.reelDone()
      } else if (stage.choice) h.machine.choose(0)
      else h.tick(1000)
    }
    return { reels }
  }
  const final = (id: string) => EVENTS.find((e) => e.id === id)!

  it('sends you back to the same table after a loss, however you got out', () => {
    for (const choice of [0, 1, 2]) {
      const h = harness({ areaId: 'pl-casino', cash: 200000, flags: { ...initialState().flags, stakedKit: true } })
      h.machine.run(final('final-lost'))
      let guard = 0
      while (h.machine.isRunning && guard++ < 200) {
        const stage = h.stage
        if (stage.reel) h.machine.reelDone()
        else if (stage.choice) h.machine.choose(choice)
        else if (stage.dialogue) h.machine.advance()
        else h.tick(1000)
      }
      expect(h.log).toContain('table lumina-finale')
    }
  })

  it('shows the commentators and the rail when it is won, and ends the beat for the credits', () => {
    const h = harness({ areaId: 'pl-casino', flags: { ...initialState().flags, hasPenthouse: true } })
    const { reels } = play(h, final('final-won'))
    expect(reels).toBeGreaterThanOrEqual(2)
    expect(h.machine.isRunning).toBe(false)
  })

  it('takes your seat at the table you scouted, short-stacked', () => {
    const table = TABLES['lumina-finale']
    expect(table.opponents).toHaveLength(5)
    expect(table.freeroll).toBe(true)
    // Seven big blinds against a table that is several times deeper.
    expect((table.buyIn * (table.yourStack ?? 1)) / table.bigBlind).toBeLessThan(10)
  })
})
