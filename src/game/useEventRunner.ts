import { useCallback, useRef, useState } from 'react'
import type { EventAction, GameEvent } from '../world/events'
import type { GameState } from './state'
import { advanceDay, advancePeriod, unlockTable } from './state'
import { playSound } from '../audio/audio'

/**
 * Runs an event's actions, one after another.
 *
 * The runner is the only thing that knows *how* to do any of this; content only
 * says which things and in what order. Actions fall into two sorts: ones that
 * finish by themselves, which it walks straight through, and ones that wait —
 * a line of dialogue waits for the player, a `wait` waits for the clock — which
 * suspend it until something says to carry on.
 */

/** What the screen has to show while an event is part-way through. */
export interface EventStage {
  /** The text box currently up, if any. */
  dialogue?: { speaker: string; lines: string[] }
  /** Set while the screen is covered, for a `fade`. */
  faded: boolean
  /** Somebody who has been moved out of their scheduled place for this scene. */
  moved: Record<string, { col: number; row: number }>
}

const EMPTY_STAGE: EventStage = { faded: false, moved: {} }

export interface EventHandlers {
  /** Starting a table or the poker night is a change of scene, not of state. */
  onStartTable: (tableId: string) => void
  onStartPokerNight: () => void
  onTeleport: (areaId: string, col: number, row: number) => void
}

export function useEventRunner(
  setState: (update: (state: GameState) => GameState) => void,
  handlers: EventHandlers,
) {
  const [stage, setStage] = useState<EventStage>(EMPTY_STAGE)
  const [running, setRunning] = useState<GameEvent | null>(null)
  // Held in a ref as well as in state: `advance` is called from a keypress and
  // from a timer, and both need the position as it is now rather than as it was
  // when the callback was made.
  const queue = useRef<EventAction[]>([])
  // Whether an event owns the screen. Not derivable from the queue: while a text
  // box is up the queue is drained but the event is very much still running, and
  // a second event starting over the top of it would lose the first one's
  // remaining actions.
  const runningRef = useRef<GameEvent | null>(null)
  const timer = useRef<number | null>(null)
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  const finish = useCallback(
    (event: GameEvent) => {
      runningRef.current = null
      setRunning(null)
      setStage(EMPTY_STAGE)
      if (!event.repeatable) {
        setState((s) =>
          s.completedEventIds.includes(event.id)
            ? s
            : { ...s, completedEventIds: [...s.completedEventIds, event.id] },
        )
      }
    },
    [setState],
  )

  /**
   * Works through the queue until something has to wait for the player.
   *
   * A loop rather than a chain of callbacks, so a run of actions that do not
   * wait — set a flag, give some cash, unlock a town — all happen in the same
   * tick instead of a frame apart each.
   */
  const pump = useCallback(
    (event: GameEvent) => {
      for (;;) {
        const action = queue.current.shift()
        if (!action) {
          finish(event)
          return
        }

        switch (action.kind) {
          case 'dialogue':
            setStage((s) => ({ ...s, dialogue: { speaker: action.speaker ?? '', lines: action.lines } }))
            return
          case 'wait':
            timer.current = window.setTimeout(() => {
              timer.current = null
              pump(event)
            }, action.ms)
            return
          case 'fade':
            setStage((s) => ({ ...s, faded: action.to === 'out' }))
            // A fade is a beat in itself: it is worth seeing before the next line.
            timer.current = window.setTimeout(() => {
              timer.current = null
              pump(event)
            }, FADE_MS)
            return

          case 'moveNpc':
            setStage((s) => ({
              ...s,
              moved: { ...s.moved, [action.characterId]: { col: action.col, row: action.row } },
            }))
            break
          case 'setFlag':
            setState((s) => ({ ...s, flags: { ...s.flags, [action.flag]: true } }))
            break
          case 'clearFlag':
            setState((s) => ({ ...s, flags: { ...s.flags, [action.flag]: false } }))
            break
          case 'giveItem':
            setState((s) =>
              s.ownedItemIds.includes(action.itemId)
                ? s
                : { ...s, ownedItemIds: [...s.ownedItemIds, action.itemId] },
            )
            break
          case 'giveCash':
            setState((s) => ({ ...s, cash: Math.max(0, s.cash + action.amount) }))
            break
          case 'unlockCity':
            setState((s) =>
              s.unlockedCityIds.includes(action.cityId as GameState['cityId'])
                ? s
                : { ...s, unlockedCityIds: [...s.unlockedCityIds, action.cityId as GameState['cityId']] },
            )
            break
          case 'unlockTable':
            setState((s) => unlockTable(s, action.tableId))
            break
          case 'advancePeriod':
            setState((s) => advancePeriod(s, action.steps ?? 1))
            break
          case 'advanceDay':
            setState((s) => advanceDay(s, action.days ?? 1))
            break
          case 'playSound':
            playSound(action.sound as Parameters<typeof playSound>[0])
            break
          case 'teleport':
            handlersRef.current.onTeleport(action.areaId, action.col, action.row)
            break

          // A change of scene ends the event: what follows is the table, and
          // there is nobody left on the street to say the next line to.
          case 'startTable':
            finish(event)
            handlersRef.current.onStartTable(action.tableId)
            return
          case 'startPokerNight':
            finish(event)
            handlersRef.current.onStartPokerNight()
            return
        }
      }
    },
    [finish, setState],
  )

  /** Begin an event. Ignored while another is already running. */
  const run = useCallback(
    (event: GameEvent) => {
      if (runningRef.current) return
      runningRef.current = event
      queue.current = [...event.actions]
      setRunning(event)
      setStage(EMPTY_STAGE)
      pump(event)
    },
    [pump],
  )

  /** The player dismissed the text box. */
  const advance = useCallback(() => {
    if (!running) return
    setStage((s) => ({ ...s, dialogue: undefined }))
    pump(running)
  }, [pump, running])

  return { stage, running, run, advance, isRunning: running !== null }
}

/** How long the screen stays covered for a fade. */
export const FADE_MS = 420
