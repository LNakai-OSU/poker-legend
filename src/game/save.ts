import { emptyRecord, initialState, TOWN_ORDER, type CasinoProgress, type GameState, type RunRecord } from './state'
import { TIME_PERIODS, type TimePeriod } from './time'

const LEGACY_SAVE_KEY = 'poker-legend-save-v2'

/**
 * Whose save this is. Each player gets a save of their own, so two testers
 * sharing a browser (or one player with two tabs signed in as different names)
 * never read or write each other's run. No profile means the original single
 * save, which is what the test suites and old saves use.
 */
let profileKey: string | null = null

export function setSaveProfile(slug: string | null): void {
  profileKey = slug
}

function saveKey(): string {
  return profileKey ? `${LEGACY_SAVE_KEY}:${profileKey}` : LEGACY_SAVE_KEY
}

/**
 * Checkpoints are hub locations only. Mid-hand table state is deliberately not
 * persisted, so reloading during a game drops you back to the last hub and any
 * chips still on the table are lost — the same rule that makes debt dangerous.
 */
export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(saveKey())
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
    // Saves written before the clock existed start their next walk in the morning.
    period: TIME_PERIODS.includes(saved.period as TimePeriod) ? (saved.period as TimePeriod) : base.period,
    finaleRematchDay: typeof saved.finaleRematchDay === 'number' ? saved.finaleRematchDay : base.finaleRematchDay,
    areaId: typeof saved.areaId === 'string' ? saved.areaId : base.areaId,
    unlockedCityIds: Array.isArray(saved.unlockedCityIds) ? saved.unlockedCityIds : base.unlockedCityIds,
    ownedItemIds: Array.isArray(saved.ownedItemIds) ? saved.ownedItemIds : base.ownedItemIds,
    completedMissionIds: Array.isArray(saved.completedMissionIds) ? saved.completedMissionIds : base.completedMissionIds,
    acceptedMissionIds: Array.isArray(saved.acceptedMissionIds) ? saved.acceptedMissionIds : base.acceptedMissionIds,
    lessonIds: Array.isArray(saved.lessonIds) ? saved.lessonIds : base.lessonIds,
    unlockedTableIds: Array.isArray(saved.unlockedTableIds) ? saved.unlockedTableIds : base.unlockedTableIds,
    debts: Array.isArray(saved.debts) ? saved.debts : base.debts,
    flags: { ...base.flags, ...(saved.flags ?? {}) },
    completedEventIds: Array.isArray(saved.completedEventIds) ? saved.completedEventIds : base.completedEventIds,
    record: reconcileRecord(saved),
    casino: reconcileCasino(saved),
    stats: { ...base.stats, ...(saved.stats ?? {}) },
  }
}

/**
 * Casino goals arrived after saves did. A run that has already been to a later
 * town was never asked to beat the bosses behind it, so it is given them.
 */
function reconcileCasino(saved: Partial<GameState>): CasinoProgress {
  const stored = saved.casino
  if (typeof stored === 'object' && stored !== null) {
    return {
      net: typeof stored.net === 'object' && stored.net !== null ? stored.net : {},
      roomOpen: Array.isArray(stored.roomOpen) ? stored.roomOpen : [],
      bossBeaten: Array.isArray(stored.bossBeaten) ? stored.bossBeaten : [],
    }
  }
  const visited = Array.isArray(saved.unlockedCityIds) ? saved.unlockedCityIds : []
  const furthest = Math.max(0, ...visited.map((id) => TOWN_ORDER.indexOf(id)))
  const behind = TOWN_ORDER.filter((_, i) => i > 0 && i < furthest)
  return { net: {}, roomOpen: behind, bossBeaten: behind }
}

/**
 * The run's record of losing arrived after saves did. A save from before it has
 * no record, but one fact is still in it: a rematch day means the match was lost.
 */
function reconcileRecord(saved: Partial<GameState>): RunRecord {
  const base = emptyRecord()
  const record = typeof saved.record === 'object' && saved.record !== null ? saved.record : null
  const lostBefore = typeof saved.finaleRematchDay === 'number' && saved.finaleRematchDay > 0 ? 1 : 0
  return {
    busted: typeof record?.busted === 'number' ? record.busted : base.busted,
    challengeLost: typeof record?.challengeLost === 'number' ? record.challengeLost : lostBefore,
    sponsors: typeof record?.sponsors === 'object' && record.sponsors !== null ? record.sponsors : base.sponsors,
  }
}

export function saveGame(state: GameState): void {
  try {
    localStorage.setItem(saveKey(), JSON.stringify(state))
  } catch {
    // Saving is best-effort; a failure shouldn't interrupt play.
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(saveKey())
  } catch {
    // Nothing to do if storage is unavailable.
  }
}
