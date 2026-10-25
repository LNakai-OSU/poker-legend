import {
  allHold,
  type ChoiceOption,
  type EventAction,
  type EventCondition,
  type GameEvent,
  type Pace,
  type RideAction,
  type Spot,
  type Tile,
} from '../world/events'
import { AREAS, CITIES, SPONSORS } from '../world/content'
import { advanceDay, advancePeriod, arriveAt, payDebt, takeStake, unlockTable, type GameState } from './state'

/**
 * Runs an event's actions, one after another, without React.
 *
 * The machine is the only thing that knows *how* to do any of this; content
 * only says which things and in what order. Actions fall into two sorts: ones
 * that finish by themselves, which it walks straight through, and ones that
 * wait — a line of dialogue waits for the player, a choice for an answer, a
 * walk for somebody to arrive, a `wait` for the clock — which suspend it until
 * something says to carry on.
 *
 * Kept apart from the hook that shows it so the whole of a beat — branches,
 * rides, people walking — can be played through in a unit test.
 */

/** Somebody a beat has put somewhere: on a tile, or beside wherever the player lands. */
export type CastPlace = ({ areaId: string } & Tile) | { areaId: string; beside: 'player' }

/** A movement in flight. The street plays it and says when it has landed. */
export interface Cue {
  id: number
  /** The area it plays in; a scene for anywhere else leaves it alone. */
  areaId: string
  /** `'player'`, or the character id of whoever is walking. */
  who: string
  to: Spot
  /** Brought on from here first, when they were not standing in the area. */
  from?: Tile
  pace: Pace
  /** The player walks a step behind them. */
  youFollow: boolean
  /** Gone once they get there. */
  leaves: boolean
}

/** A question on the screen. */
export interface StageChoice {
  speaker: string
  prompt: string
  options: Array<{ label: string; open: boolean; why?: string }>
}

/** What the screen has to show while an event is part-way through. */
export interface EventStage {
  /**
   * The text box currently up, if any. `id` is new for every box, so two boxes
   * back to back are two boxes — the second does not open on the first one's
   * last page.
   */
  dialogue?: { id: number; speaker: string; lines: string[] }
  /** The question currently up, if any. */
  choice?: StageChoice & { id: number }
  /** Set while the screen is covered, for a `fade`. */
  faded: boolean
  /**
   * Where beats have put people, by character id. Outlasts the beat: somebody
   * who walked you to a door is still standing by it until you leave the area.
   */
  cast: Record<string, CastPlace>
  /** Movements in flight. */
  cues: Cue[]
  /** Set while a ride you did not choose is under way. */
  ride?: { destination: string; caption?: string; with: string[]; areaId?: string }
}

export const EMPTY_STAGE: EventStage = { faded: false, cast: {}, cues: [] }

/** How long the screen stays covered for a fade. */
export const FADE_MS = 420
/** The shortest a ride can be, however little is said on it: long enough to feel like distance. */
export const FORCED_RIDE_MS = 3600
/** Somebody who has not arrived after this long is stood where they were going, so a beat can never hang on a walk. */
export const CUE_TIMEOUT_MS = 20000

/** Everything the machine cannot do by itself. */
export interface MachineHost {
  getState(): GameState
  setState(update: (state: GameState) => GameState): void
  /** The stage changed: draw it. */
  onStage(stage: EventStage): void
  onRunning(event: GameEvent | null): void
  /** Starting a table or the poker night is a change of scene, not of state. */
  startTable(tableId: string): void
  startPokerNight(): void
  /** Stand the player on this tile of the area the state now says they are in. */
  place(col: number, row: number): void
  /** The bus, with nobody able to get off it. */
  startRide(ride: NonNullable<EventStage['ride']>): void
  /** Off the bus, into the street the state now says. */
  endRide(): void
  playSound(sound: string): void
  schedule(ms: number, fn: () => void): number
  cancel(handle: number): void
  now(): number
}

/** An internal step: the end of a ride, once what is said on it has been said. */
type Step = EventAction | { kind: 'arrive'; ride: Extract<EventAction, { kind: 'ride' }>; startedAt: number }

/** Why an answer is closed, in a few words for under its label. */
export function whyClosed(conditions: EventCondition[], state: GameState): string | undefined {
  const failing = conditions.find((c) => !allHold([c], state))
  if (!failing) return undefined
  switch (failing.kind) {
    case 'cashAtLeast':
      return `needs $${failing.amount.toLocaleString('en-US')}`
    case 'canPay':
      return 'you cannot cover it'
    default:
      return 'not open to you'
  }
}

export class EventMachine {
  private host: MachineHost
  private stage: EventStage = EMPTY_STAGE
  private running: GameEvent | null = null
  private queue: Step[] = []
  private timer: number | null = null
  private after: (() => void) | null = null
  /** The answers on screen, in the order shown. */
  private offered: ChoiceOption[] = []
  /** The cue the beat is waiting on, if it is waiting on one. */
  private waitingOn: number | null = null
  private cueTimers = new Map<number, number>()
  private nextCue = 1
  private nextBox = 1

  constructor(host: MachineHost) {
    this.host = host
  }

  get isRunning(): boolean {
    return this.running !== null
  }

  get current(): GameEvent | null {
    return this.running
  }

  get currentStage(): EventStage {
    return this.stage
  }

  /**
   * Begin an event, and optionally say what happens once it is over. Ignored
   * while another is already running, which it says by returning false.
   */
  run(event: GameEvent, then?: () => void): boolean {
    if (this.running) return false
    this.running = event
    this.after = then ?? null
    this.queue = [...event.actions]
    this.host.onRunning(event)
    // People a beat stood somewhere earlier keep standing there.
    this.setStage({ ...EMPTY_STAGE, cast: this.stage.cast })
    this.pump()
    return true
  }

  /** The player dismissed the text box. */
  advance(): void {
    if (!this.running || !this.stage.dialogue) return
    this.setStage({ ...this.stage, dialogue: undefined })
    this.pump()
  }

  /** The player picked an answer, by its place in the list shown. False if it is closed. */
  choose(index: number): boolean {
    if (!this.running || !this.stage.choice) return false
    const shown = this.stage.choice.options[index]
    const option = this.offered[index]
    if (!shown || !option || !shown.open) return false
    this.offered = []
    this.setStage({ ...this.stage, choice: undefined })
    this.queue.unshift(...option.then)
    this.pump()
    return true
  }

  /** The street says somebody has got where a cue sent them; `at` is where, when it was a spot next to you. */
  cueDone(id: number, at?: Tile): void {
    const cue = this.stage.cues.find((c) => c.id === id)
    if (!cue) return
    const timeout = this.cueTimers.get(id)
    if (timeout !== undefined) this.host.cancel(timeout)
    this.cueTimers.delete(id)
    const landed = at ?? (cue.to === 'player' ? undefined : cue.to)
    const cast = { ...this.stage.cast }
    if (cue.who !== 'player') {
      if (cue.leaves) delete cast[cue.who]
      else if (landed) cast[cue.who] = { areaId: cue.areaId, ...landed }
    }
    this.setStage({ ...this.stage, cast, cues: this.stage.cues.filter((c) => c.id !== id) })
    if (this.waitingOn === id) {
      this.waitingOn = null
      this.pump()
    }
  }

  /** The player has walked away from wherever beats stood people: they are not standing there any more. */
  clearCast(): void {
    if (this.running || Object.keys(this.stage.cast).length === 0) return
    this.setStage({ ...this.stage, cast: {} })
  }

  private setStage(stage: EventStage) {
    this.stage = stage
    this.host.onStage(stage)
  }

  /** Changes the state for the rest of this beat as well as for the screen. */
  private update(change: (state: GameState) => GameState) {
    this.host.setState(change)
  }

  private areaNow(): string {
    const state = this.host.getState()
    return state.areaId ?? CITIES[state.cityId]?.entryAreaId ?? ''
  }

  private finish(event: GameEvent) {
    this.running = null
    this.offered = []
    this.waitingOn = null
    this.setStage({ ...EMPTY_STAGE, cast: this.stage.cast })
    if (!event.repeatable) {
      this.update((s) =>
        s.completedEventIds.includes(event.id) ? s : { ...s, completedEventIds: [...s.completedEventIds, event.id] },
      )
    }
    this.host.onRunning(null)
    const then = this.after
    this.after = null
    then?.()
  }

  /** Lands every walk in flight where it was going: the scene is about to change under them. */
  private settleCues() {
    for (const cue of [...this.stage.cues]) this.cueDone(cue.id)
  }

  private cue(spec: Omit<Cue, 'id' | 'areaId'>) {
    const id = this.nextCue++
    const cue: Cue = { id, areaId: this.areaNow(), ...spec }
    const cast = { ...this.stage.cast }
    if (spec.who !== 'player' && spec.from) cast[spec.who] = { areaId: cue.areaId, ...spec.from }
    this.waitingOn = id
    this.setStage({ ...this.stage, cast, cues: [...this.stage.cues, cue] })
    this.cueTimers.set(
      id,
      this.host.schedule(CUE_TIMEOUT_MS, () => this.cueDone(id)),
    )
  }

  /**
   * Works through the queue until something has to wait for the player.
   *
   * A loop rather than a chain of callbacks, so a run of actions that do not
   * wait — set a flag, give some cash, unlock a town — all happen in the same
   * tick instead of a frame apart each.
   */
  private pump() {
    const event = this.running
    if (!event || this.timer !== null || this.waitingOn !== null) return
    for (;;) {
      const step = this.queue.shift()
      if (!step) {
        this.finish(event)
        return
      }

      switch (step.kind) {
        case 'dialogue':
          this.setStage({ ...this.stage, dialogue: { id: this.nextBox++, speaker: step.speaker ?? '', lines: step.lines } })
          return
        case 'choice': {
          const state = this.host.getState()
          const shown = step.options
            .map((option) => ({ option, open: allHold(option.conditions, state) }))
            .filter(({ option, open }) => open || !option.hidden)
          this.offered = shown.map(({ option }) => option)
          this.setStage({
            ...this.stage,
            choice: {
              id: this.nextBox++,
              speaker: step.speaker ?? '',
              prompt: step.prompt,
              options: shown.map(({ option, open }) => ({
                label: option.label,
                open,
                why: open ? undefined : whyClosed(option.conditions ?? [], state),
              })),
            },
          })
          return
        }
        case 'if':
          this.queue.unshift(...(allHold(step.when, this.host.getState()) ? step.then : (step.else ?? [])))
          break
        case 'wait':
          this.timer = this.host.schedule(step.ms, () => {
            this.timer = null
            this.pump()
          })
          return
        case 'fade':
          this.setStage({ ...this.stage, faded: step.to === 'out' })
          // A fade is a beat in itself: it is worth seeing before the next line.
          this.timer = this.host.schedule(FADE_MS, () => {
            this.timer = null
            this.pump()
          })
          return

        case 'moveNpc':
          this.cue({
            who: step.characterId,
            to: step.to,
            from: step.from,
            pace: step.pace ?? 'walk',
            youFollow: step.youFollow ?? false,
            leaves: step.leaves ?? false,
          })
          return
        case 'movePlayer':
          this.cue({ who: 'player', to: step.to, pace: step.pace ?? 'walk', youFollow: false, leaves: false })
          return

        case 'setFlag':
          this.update((s) => ({ ...s, flags: { ...s.flags, [step.flag]: true } }))
          break
        case 'clearFlag':
          this.update((s) => ({ ...s, flags: { ...s.flags, [step.flag]: false } }))
          break
        case 'giveItem':
          this.update((s) =>
            s.ownedItemIds.includes(step.itemId) ? s : { ...s, ownedItemIds: [...s.ownedItemIds, step.itemId] },
          )
          break
        case 'giveCash':
          this.update((s) => ({ ...s, cash: Math.max(0, s.cash + step.amount) }))
          break
        case 'takeStake': {
          const sponsor = SPONSORS[step.sponsorId]
          if (sponsor) {
            this.update((s) => takeStake(s, sponsor, sponsor.principal, sponsor.interestRate, sponsor.dueInDays))
          }
          break
        }
        case 'repay':
          this.update((s) => repayAll(s, step.sponsorId))
          break
        case 'unlockCity':
          this.update((s) =>
            s.unlockedCityIds.includes(step.cityId as GameState['cityId'])
              ? s
              : { ...s, unlockedCityIds: [...s.unlockedCityIds, step.cityId as GameState['cityId']] },
          )
          break
        case 'unlockTable':
          this.update((s) => unlockTable(s, step.tableId))
          break
        case 'advancePeriod':
          this.update((s) => advancePeriod(s, step.steps ?? 1))
          break
        case 'advanceDay':
          this.update((s) => advanceDay(s, step.days ?? 1))
          break
        case 'playSound':
          this.host.playSound(step.sound)
          break
        case 'teleport': {
          this.settleCues()
          const located = AREAS[step.areaId]
          this.update((s) => arriveAt(s, step.areaId, located?.cityId ?? s.cityId))
          this.bringAlong(step.areaId, step.with)
          this.host.place(step.col, step.row)
          break
        }
        case 'ride': {
          this.settleCues()
          const name = AREAS[step.areaId]?.area.name ?? step.areaId
          const ride = { destination: name, caption: step.caption, with: step.with ?? [], areaId: step.areaId }
          this.setStage({ ...this.stage, ride })
          this.host.startRide(ride)
          const during: RideAction[] = step.during ?? []
          this.queue.unshift(...during, { kind: 'arrive', ride: step, startedAt: this.host.now() })
          break
        }
        case 'arrive': {
          const left = FORCED_RIDE_MS - (this.host.now() - step.startedAt)
          if (left > 0) {
            this.queue.unshift(step)
            this.timer = this.host.schedule(left, () => {
              this.timer = null
              this.pump()
            })
            return
          }
          const ride = step.ride
          const located = AREAS[ride.areaId]
          // A ride across town costs no day, but it is the hour it always is.
          this.update((s) => advancePeriod(arriveAt(s, ride.areaId, located?.cityId ?? s.cityId)))
          this.setStage({ ...this.stage, ride: undefined })
          this.bringAlong(ride.areaId, ride.with)
          this.host.place(ride.col, ride.row)
          this.host.endRide()
          break
        }

        // A change of scene ends the event: what follows is the table, and
        // there is nobody left on the street to say the next line to.
        case 'startTable':
          this.finish(event)
          this.host.startTable(step.tableId)
          return
        case 'startPokerNight':
          this.finish(event)
          this.host.startPokerNight()
          return
      }
    }
  }

  /** People who come with you, standing beside wherever you land. */
  private bringAlong(areaId: string, who: string[] | undefined) {
    if (!who || who.length === 0) return
    const cast = { ...this.stage.cast }
    for (const id of who) cast[id] = { areaId, beside: 'player' }
    this.setStage({ ...this.stage, cast })
  }
}

/** Pays off every stake owed to one sponsor, oldest first, for as long as the cash lasts. */
export function repayAll(state: GameState, sponsorId: string): GameState {
  let s = state
  for (const debt of state.debts.filter((d) => d.sponsorId === sponsorId)) s = payDebt(s, debt.id)
  return s
}
