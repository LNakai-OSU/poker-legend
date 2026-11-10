import { AREAS, CITIES, TABLES } from './content'
import { CHARACTERS } from './characters'
import type { GameState } from '../game/state'
import { PERIOD_LABEL } from '../game/time'
import { nextRun, weekdayName, type TableNight } from './week'

/** One night on the calendar, with when it is next on. */
export interface CalendarEntry {
  night: TableNight
  tableId: string
  tableName: string
  townName: string
  /** The hour it is next on, from now. */
  day: number
  period: GameState['period']
  /** On right now. */
  now: boolean
  /** Whole days from today. */
  inDays: number
  /** Who sits in, by name. */
  guests: string[]
}

/** Every table that has nights, by the town it is in. */
function tablesWithNights(): { tableId: string; cityId: string }[] {
  const out: { tableId: string; cityId: string }[] = []
  for (const { area, cityId } of Object.values(AREAS)) {
    for (const poi of area.pois) {
      if (poi.action.kind === 'table' && TABLES[poi.action.tableId]?.nights?.length) out.push({ tableId: poi.action.tableId, cityId })
    }
  }
  return out
}

/**
 * What is coming up in the towns you have been to: soonest first. A town you
 * have not reached is not listed, because nobody there has heard of you.
 */
export function weekAhead(state: Pick<GameState, 'day' | 'period' | 'unlockedCityIds'>): CalendarEntry[] {
  const entries: CalendarEntry[] = []
  for (const { tableId, cityId } of tablesWithNights()) {
    if (!state.unlockedCityIds.includes(cityId as GameState['cityId'])) continue
    const table = TABLES[tableId]
    for (const night of table.nights ?? []) {
      const run = nextRun(night, state.day, state.period)
      entries.push({
        night,
        tableId,
        tableName: table.name,
        townName: CITIES[cityId as keyof typeof CITIES].name,
        day: run.day,
        period: run.period,
        now: run.day === state.day && run.period === state.period,
        inDays: run.day - state.day,
        guests: night.guests.map((g) => CHARACTERS[typeof g === 'string' ? g : g.character]?.name ?? 'Someone'),
      })
    }
  }
  return entries.sort((a, b) => a.day - b.day || ['morning', 'afternoon', 'evening', 'night'].indexOf(a.period) - ['morning', 'afternoon', 'evening', 'night'].indexOf(b.period))
}

/** "Tonight", "On now", "Saturday evening, in 3 days". */
export function whenText(entry: CalendarEntry): string {
  if (entry.now) return 'On now'
  const hours = entry.night.periods.map((p) => PERIOD_LABEL[p].toLowerCase())
  const when = `${weekdayName(entry.day)} ${hours.length > 1 ? `${hours[0]} to ${hours[hours.length - 1]}` : hours[0]}`
  if (entry.inDays === 0) return `Later today: ${when}`
  return entry.inDays === 1 ? `Tomorrow: ${when}` : `${when}, in ${entry.inDays} days`
}
