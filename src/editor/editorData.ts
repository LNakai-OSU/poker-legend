import { CHARACTERS } from '../world/characters'
import { EVENTS } from '../world/events'
import { AREAS, CITIES, LESSONS, SPONSORS, TABLES, allShopItems, findItem } from '../world/content'
import { poisOf, type World } from './contentRules'
import type { Names } from './contentModel'

/**
 * What the character and event tabs need to know about the rest of the world:
 * the real ids to offer in a dropdown, the names to read them out by, and how
 * to ask the dev server to save.
 */

const byLabel = (a: [string, string], b: [string, string]) => a[1].localeCompare(b[1])

export function characterOptions(): Array<[string, string]> {
  return Object.entries(CHARACTERS)
    .map(([id, c]): [string, string] => [id, `${c.name} (${id})`])
    .sort(byLabel)
}

export function areaOptions(): Array<[string, string]> {
  return Object.entries(AREAS)
    .map(([id, { area }]): [string, string] => [id, `${area.name} — ${id}`])
    .sort(byLabel)
}

export function tableOptions(): Array<[string, string]> {
  return Object.values(TABLES).map((t): [string, string] => [t.id, `${t.name} — ${t.id}`])
}

export function cityOptions(): Array<[string, string]> {
  return Object.values(CITIES).map((c): [string, string] => [c.id, c.name])
}

export function itemOptions(): Array<[string, string]> {
  return allShopItems().map((item): [string, string] => [item.id, `${item.name} — ${item.id}`])
}

export function lessonOptions(): Array<[string, string]> {
  return Object.values(LESSONS).map((l): [string, string] => [l.id, l.name])
}

export function eventOptions(): Array<[string, string]> {
  return EVENTS.map((e): [string, string] => [e.id, e.id])
}

export function poiOptions(world: World): Array<[string, string]> {
  return [...poisOf(world)]
    .map(([id, poi]): [string, string] => [id, `${poi.name} in ${AREAS[poi.areaId]?.area.name ?? poi.areaId} — ${id}`])
    .sort(byLabel)
}

export function names(world: World): Names {
  const pois = poisOf(world)
  return {
    character: (id) => CHARACTERS[id]?.name ?? id,
    area: (id) => AREAS[id]?.area.name ?? id,
    table: (id) => TABLES[id]?.name ?? id,
    poi: (id) => pois.get(id)?.name ?? id,
    item: (id) => findItem(id)?.name ?? id,
    lesson: (id) => LESSONS[id]?.name ?? id,
    city: (id) => CITIES[id]?.name ?? id,
    sponsor: (id) => SPONSORS[id]?.name ?? id,
  }
}

export function sponsorOptions(): Array<[string, string]> {
  return Object.values(SPONSORS).map((sponsor) => [sponsor.id, sponsor.name])
}

/** Moves one entry of a list to another position. */
export function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return list
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

export const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

export interface SaveResult {
  ok: boolean
  text: string
  problems?: string[]
}

const LAST_SAVE = 'poker-legend-editor-last-save'

/**
 * Asks the dev server to write one entry.
 *
 * Saving makes Vite reload the module it changed, which can reload the page;
 * the result is kept for a moment in session storage so it can still be shown.
 */
export async function saveEntry(kind: 'character' | 'event', body: { id: string; before?: unknown; after: unknown }): Promise<SaveResult> {
  try {
    const response = await fetch(`/__editor/${kind}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const reply = (await response.json()) as { notes?: string[]; error?: string; problems?: string[] }
    const result: SaveResult = response.ok
      ? { ok: true, text: (reply.notes ?? ['saved']).join(' · ') }
      : { ok: false, text: reply.error ?? 'save failed', problems: reply.problems }
    try {
      sessionStorage.setItem(LAST_SAVE, JSON.stringify({ kind, id: body.id, at: Date.now(), result }))
    } catch {
      // Storage can be unavailable; the result is still shown until a reload.
    }
    return result
  } catch (error) {
    return { ok: false, text: `could not reach the dev server: ${String(error)}` }
  }
}

/** The result of a save made just before the page reloaded, if there was one. */
export function lastSave(kind: 'character' | 'event', id: string): SaveResult | null {
  try {
    const raw = sessionStorage.getItem(LAST_SAVE)
    if (!raw) return null
    const saved = JSON.parse(raw) as { kind: string; id: string; at: number; result: SaveResult }
    if (saved.kind !== kind || saved.id !== id || Date.now() - saved.at > 10_000) return null
    return saved.result
  } catch {
    return null
  }
}
