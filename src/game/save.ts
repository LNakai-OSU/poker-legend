import { initialState, type GameState } from './state'

const SAVE_KEY = 'poker-legend-save-v2'

/**
 * Checkpoints are hub locations only. Mid-hand table state is deliberately not
 * persisted, so reloading during a game drops you back to the last hub and any
 * chips still on the table are lost — the same rule that makes debt dangerous.
 */
export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return reconcile(parsed)
  } catch {
    // Storage can be unavailable (private browsing, blocked cookies) or hold
    // corrupt data; a missing save is always a valid outcome.
    return null
  }
}

/**
 * Merges a stored save over a fresh state so a save written by an older build
 * (missing fields added later) still loads instead of wiping someone's run.
 */
function reconcile(parsed: unknown): GameState | null {
  if (typeof parsed !== 'object' || parsed === null) return null
  const saved = parsed as Partial<GameState>
  if (typeof saved.cash !== 'number' || !Number.isFinite(saved.cash)) return null
  if (typeof saved.cityId !== 'string') return null

  const base = initialState()
  return {
    ...base,
    ...saved,
    cash: Math.max(0, saved.cash),
    day: typeof saved.day === 'number' && saved.day > 0 ? saved.day : base.day,
    unlockedCityIds: Array.isArray(saved.unlockedCityIds) ? saved.unlockedCityIds : base.unlockedCityIds,
    ownedItemIds: Array.isArray(saved.ownedItemIds) ? saved.ownedItemIds : base.ownedItemIds,
    completedMissionIds: Array.isArray(saved.completedMissionIds) ? saved.completedMissionIds : base.completedMissionIds,
    acceptedMissionIds: Array.isArray(saved.acceptedMissionIds) ? saved.acceptedMissionIds : base.acceptedMissionIds,
    lessonIds: Array.isArray(saved.lessonIds) ? saved.lessonIds : base.lessonIds,
    unlockedTableIds: Array.isArray(saved.unlockedTableIds) ? saved.unlockedTableIds : base.unlockedTableIds,
    debts: Array.isArray(saved.debts) ? saved.debts : base.debts,
    flags: { ...base.flags, ...(saved.flags ?? {}) },
    stats: { ...base.stats, ...(saved.stats ?? {}) },
  }
}

export function saveGame(state: GameState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state))
  } catch {
    // Saving is best-effort; a failure shouldn't interrupt play.
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch {
    // Nothing to do if storage is unavailable.
  }
}
