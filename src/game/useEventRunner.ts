import { useCallback, useRef, useState } from 'react'
import type { GameEvent } from '../world/events'
import type { GameState } from './state'
import { playSound } from '../audio/audio'
import { EMPTY_STAGE, EventMachine, type EventStage, type MachineHost } from './eventMachine'

export type { EventStage } from './eventMachine'
export { FADE_MS } from './eventMachine'

/**
 * The event machine, wired to React.
 *
 * The machine (`eventMachine.ts`) knows how to play a beat; this keeps one for
 * the life of the game, shows its stage, and hands it the state as it is now
 * rather than as it was when the last render happened — a beat that sets a flag
 * and then asks about it in the same breath has to see its own change.
 */

export interface EventHandlers {
  /** Starting a table or the poker night is a change of scene, not of state. */
  onStartTable: (tableId: string) => void
  onStartPokerNight: () => void
  /** Stand the player on this tile of the area the state now names. */
  onPlace: (col: number, row: number) => void
  /** The bus, with nobody able to get off it. */
  onStartRide: (ride: NonNullable<EventStage['ride']>) => void
  /** Off the bus, into the street. */
  onEndRide: () => void
}

export function useEventRunner(
  state: GameState,
  setState: (update: (state: GameState) => GameState) => void,
  handlers: EventHandlers,
) {
  const [stage, setStage] = useState<EventStage>(EMPTY_STAGE)
  const [running, setRunning] = useState<GameEvent | null>(null)
  // The state as the machine last left it. A render brings it back in line with
  // React's own, which by then includes everything the machine did.
  const latest = useRef(state)
  latest.current = state
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers
  const setStateRef = useRef(setState)
  setStateRef.current = setState

  const machine = useRef<EventMachine | null>(null)
  if (!machine.current) {
    const host: MachineHost = {
      getState: () => latest.current,
      setState: (update) => {
        latest.current = update(latest.current)
        setStateRef.current(update)
      },
      onStage: setStage,
      onRunning: setRunning,
      startTable: (tableId) => handlersRef.current.onStartTable(tableId),
      startPokerNight: () => handlersRef.current.onStartPokerNight(),
      place: (col, row) => handlersRef.current.onPlace(col, row),
      startRide: (ride) => handlersRef.current.onStartRide(ride),
      endRide: () => handlersRef.current.onEndRide(),
      playSound: (sound) => playSound(sound as Parameters<typeof playSound>[0]),
      schedule: (ms, fn) => window.setTimeout(fn, ms),
      cancel: (handle) => window.clearTimeout(handle),
      now: () => performance.now(),
    }
    machine.current = new EventMachine(host)
  }
  const m = machine.current

  const run = useCallback((event: GameEvent, then?: () => void) => m.run(event, then), [m])
  const advance = useCallback(() => m.advance(), [m])
  const reelDone = useCallback(() => m.reelDone(), [m])
  const choose = useCallback((index: number) => m.choose(index), [m])
  const cueDone = useCallback((id: number, at?: { col: number; row: number }) => m.cueDone(id, at), [m])
  const clearCast = useCallback(() => m.clearCast(), [m])

  return { stage, running, run, advance, reelDone, choose, cueDone, clearCast, isRunning: running !== null }
}
