import type { Accessory, AvatarLook, HairStyle } from '../game/avatars'
import type { Archetype, SkillTier } from '../engine/types'
import { TOWN_ORDER, type ChallengeStatus, type CountOf, type DebtStatus, type StoryFlag } from '../game/state'
import { STORY_FLAGS as FLAG_MEANING, STORY_FLAG_IDS } from '../world/flags'
import type { SoundName } from '../audio/audio'
import { TIME_PERIODS, type TimePeriod } from '../game/time'
import type { CharacterDef, Persona, ScheduleEntry, TableLines } from '../world/characters'
import { ENDS_EVENT, type EventAction, type EventCondition, type EventTrigger, type GameEvent, type RideAction, type Spot } from '../world/events'

/**
 * What a character or an event is allowed to look like, for the editor.
 *
 * The types in `characters.ts` and `events.ts` are the schema, but types do not
 * exist at runtime, and the save endpoint receives JSON from a browser. These
 * are the same shapes again as values: the vocabularies the editor offers in
 * its dropdowns, and the checks the server runs before anything is written.
 *
 * Each list is pinned to its type with `satisfies`, so adding a trigger kind or
 * an archetype without teaching the editor about it is a compile error here
 * rather than an option quietly missing from a menu.
 */

/** Every key of a union, exactly once — a missing or extra one fails to compile. */
type Exactly<T extends string> = { [K in T]: true }

const keysOf = <T extends string>(record: Exactly<T>): T[] => Object.keys(record) as T[]

export const TABLE_LINE_KINDS = keysOf<keyof TableLines>({
  greeting: true,
  raise: true,
  bet: true,
  check: true,
  call: true,
  fold: true,
  win: true,
  lose: true,
})

/** What each kind of table line is for, in the editor's words. */
export const TABLE_LINE_HELP: Record<keyof TableLines, string> = {
  greeting: 'sitting down',
  raise: 'raising',
  bet: 'betting first',
  check: 'checking',
  call: 'calling',
  fold: 'folding',
  win: 'they won the pot',
  lose: 'you won the pot',
}

export const SKILL_TIERS = keysOf<SkillTier>({ novice: true, amateur: true, competent: true, sharp: true, elite: true })
export const ARCHETYPES = keysOf<Archetype>({ regular: true, nit: true, station: true, maniac: true, whale: true })
export const HAIR_STYLES = keysOf<HairStyle>({ short: true, long: true, bald: true, tied: true })
export const ACCESSORIES = keysOf<Accessory>({
  none: true,
  glasses: true,
  shades: true,
  cap: true,
  visor: true,
  earring: true,
})
/** Every story flag, from the list in `src/world/flags.ts`. */
export const STORY_FLAGS: StoryFlag[] = STORY_FLAG_IDS
export const DEBT_STATUSES = keysOf<DebtStatus>({ none: true, owing: true, overdue: true })
export const CHALLENGE_STATUSES = keysOf<ChallengeStatus>({ unplayed: true, lost: true, rematch: true, won: true })
export const COUNT_OF = keysOf<CountOf>({ busted: true, challengeLost: true, staked: true, repaid: true, missed: true, caught: true })
/** Counts that belong to a sponsor, and can name one. */
export const SPONSOR_COUNTS: CountOf[] = ['staked', 'repaid', 'missed', 'caught']
export const SOUNDS = keysOf<SoundName>({
  deal: true,
  chip: true,
  fold: true,
  check: true,
  win: true,
  lose: true,
  ui: true,
  dialogue: true,
  alarm: true,
  cash: true,
})

export const TRIGGER_KINDS = keysOf<EventTrigger['kind']>({ talkTo: true, interact: true, enterArea: true, standOn: true, caught: true })
export const CONDITION_KINDS = keysOf<EventCondition['kind']>({
  flag: true,
  period: true,
  dayAtLeast: true,
  cashAtLeast: true,
  hasItem: true,
  hasLesson: true,
  eventDone: true,
  chapter: true,
  cashBelow: true,
  debt: true,
  hunted: true,
  challenge: true,
  count: true,
  canPay: true,
})
export const ACTION_KINDS = keysOf<EventAction['kind']>({
  dialogue: true,
  choice: true,
  if: true,
  moveNpc: true,
  movePlayer: true,
  wait: true,
  setFlag: true,
  clearFlag: true,
  giveItem: true,
  giveCash: true,
  unlockCity: true,
  unlockTable: true,
  startTable: true,
  startPokerNight: true,
  teleport: true,
  ride: true,
  takeStake: true,
  repay: true,
  advancePeriod: true,
  advanceDay: true,
  playSound: true,
  fade: true,
})

/** What a forced ride may carry: talk, a pause, a quiet change of state. */
export const RIDE_ACTION_KINDS: Array<RideAction['kind']> = ['dialogue', 'wait', 'setFlag', 'clearFlag', 'giveItem', 'giveCash', 'playSound']

/** Actions after which nothing else in the event runs: the table takes over. */
export { ENDS_EVENT }

// ---------------------------------------------------------------------------
// New things, with sensible blanks.
// ---------------------------------------------------------------------------

export function blankTrigger(kind: EventTrigger['kind'], ids: { character: string; area: string; poi: string }): EventTrigger {
  switch (kind) {
    case 'talkTo':
      return { kind, characterId: ids.character }
    case 'interact':
      return { kind, poiId: ids.poi }
    case 'enterArea':
      return { kind, areaId: ids.area }
    case 'standOn':
      return { kind, areaId: ids.area, col: 1, row: 1 }
    case 'caught':
      return { kind }
  }
}

export function blankCondition(
  kind: EventCondition['kind'],
  ids: { item: string; lesson: string; event: string; sponsor?: string },
): EventCondition {
  switch (kind) {
    case 'flag':
      return { kind, flag: 'wonPokerNight' }
    case 'period':
      return { kind, period: 'morning' }
    case 'dayAtLeast':
      return { kind, day: 2 }
    case 'cashAtLeast':
      return { kind, amount: 100 }
    case 'hasItem':
      return { kind, itemId: ids.item }
    case 'hasLesson':
      return { kind, lessonId: ids.lesson }
    case 'eventDone':
      return { kind, eventId: ids.event }
    case 'chapter':
      return { kind, cityId: 'silverCreek' }
    case 'cashBelow':
      return { kind, amount: 100 }
    case 'debt':
      return { kind, status: 'owing' }
    case 'hunted':
      return { kind }
    case 'challenge':
      return { kind, status: 'lost' }
    case 'count':
      return { kind, of: 'busted' }
    case 'canPay':
      return { kind, sponsorId: ids.sponsor ?? 'cass' }
  }
}

export function blankAction(
  kind: EventAction['kind'],
  ids: { character: string; area: string; table: string; city: string; item: string; sponsor?: string },
): EventAction {
  switch (kind) {
    case 'dialogue':
      return { kind, speaker: ids.character, lines: [''] }
    case 'choice':
      return {
        kind,
        speaker: ids.character,
        prompt: '',
        options: [
          { label: 'Yes', then: [] },
          { label: 'No', then: [] },
        ],
      }
    case 'if':
      return { kind, when: [{ kind: 'flag', flag: 'wonPokerNight' }], then: [] }
    case 'moveNpc':
      return { kind, characterId: ids.character, to: { col: 1, row: 1 } }
    case 'movePlayer':
      return { kind, to: { col: 1, row: 1 } }
    case 'ride':
      return { kind, areaId: ids.area, col: 1, row: 1 }
    case 'takeStake':
    case 'repay':
      return { kind, sponsorId: ids.sponsor ?? 'cass' }
    case 'wait':
      return { kind, ms: 500 }
    case 'setFlag':
    case 'clearFlag':
      return { kind, flag: 'wonPokerNight' }
    case 'giveItem':
      return { kind, itemId: ids.item }
    case 'giveCash':
      return { kind, amount: 100 }
    case 'unlockCity':
      return { kind, cityId: ids.city }
    case 'unlockTable':
    case 'startTable':
      return { kind, tableId: ids.table }
    case 'startPokerNight':
      return { kind }
    case 'teleport':
      return { kind, areaId: ids.area, col: 1, row: 1 }
    case 'advancePeriod':
      return { kind }
    case 'advanceDay':
      return { kind }
    case 'playSound':
      return { kind, sound: 'ui' }
    case 'fade':
      return { kind, to: 'out' }
  }
}

export function blankCharacter(name: string): CharacterDef {
  return {
    name,
    style: '',
    look: { skin: '#d8a878', hair: '#3a2a1a', hairStyle: 'short', shirt: '#4a6b8a', accessory: 'none' },
    lines: { greeting: [`${name}: Hello.`] },
  }
}

/** A character id from a name: "Mary Ann" becomes `maryAnn`. */
export function characterIdFrom(name: string): string {
  const words = name
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  const id = words.map((word, i) => (i === 0 ? word.toLowerCase() : word[0].toUpperCase() + word.slice(1).toLowerCase())).join('')
  return /^[a-z]/.test(id) ? id : `c${id}`
}

// ---------------------------------------------------------------------------
// Keeping keys in the order the files write them.
// ---------------------------------------------------------------------------

/** Rebuilds an object with its keys in `order`, dropping undefined ones; unknown keys go last. */
function ordered<T extends object>(value: T, order: readonly string[]): T {
  const source = value as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const key of order) if (source[key] !== undefined) out[key] = source[key]
  for (const key of Object.keys(source)) if (!(key in out) && source[key] !== undefined) out[key] = source[key]
  return out as T
}

/**
 * A character with its keys in the file's order.
 *
 * The patcher puts a new key after the key that precedes it here, so adding a
 * seat to somebody puts it after their look, where everybody else's is — and
 * adding a kind of line puts `bet` between `raise` and `check`.
 */
export function canonicalCharacter(character: CharacterDef): CharacterDef {
  const lines = (l: Partial<TableLines>) => ordered(l, TABLE_LINE_KINDS)
  return ordered(
    {
      ...character,
      lines: lines(character.lines),
      personas: character.personas
        ? Object.fromEntries(
            Object.entries(character.personas).map(([id, p]) => [
              id,
              ordered({ ...p, lines: p.lines ? lines(p.lines) : undefined } as Persona, ['style', 'lines']),
            ]),
          )
        : undefined,
      overworld: character.overworld
        ? ordered(
            {
              ...character.overworld,
              schedule: character.overworld.schedule.map((entry) =>
                ordered(entry, ['period', 'areaId', 'col', 'row', 'lines'] satisfies Array<keyof ScheduleEntry>),
              ),
            },
            ['art', 'color', 'role', 'look', 'lines', 'schedule'],
          )
        : undefined,
    },
    ['name', 'style', 'look', 'seat', 'lines', 'personas', 'overworld'] satisfies Array<keyof CharacterDef>,
  )
}

/** The order the fields of a trigger, condition or action are written in: kind first, then what it names. */
const PART_ORDER = [
  'kind',
  'speaker',
  'lines',
  'characterId',
  'poiId',
  'flag',
  'set',
  'period',
  'day',
  'amount',
  'itemId',
  'lessonId',
  'eventId',
  'done',
  'areaId',
  'onLoad',
  'col',
  'row',
  'ms',
  'cityId',
  'tableId',
  'steps',
  'days',
  'sound',
  'sponsorId',
  'prompt',
  'options',
  'label',
  'conditions',
  'hidden',
  'when',
  'then',
  'else',
  'to',
  'from',
  'pace',
  'youFollow',
  'leaves',
  'caption',
  'with',
  'during',
]

/** One condition with its keys in order. */
const orderedCondition = (c: EventCondition) => ordered(c, PART_ORDER)

/** One action, and every action and condition inside it, with their keys in order. */
function orderedAction(action: EventAction): EventAction {
  switch (action.kind) {
    case 'choice':
      return ordered(
        {
          ...action,
          options: action.options.map((o) =>
            ordered({ ...o, conditions: o.conditions?.map(orderedCondition), then: o.then.map(orderedAction) }, PART_ORDER),
          ),
        },
        PART_ORDER,
      )
    case 'if':
      return ordered(
        { ...action, when: action.when.map(orderedCondition), then: action.then.map(orderedAction), else: action.else?.map(orderedAction) },
        PART_ORDER,
      )
    case 'ride':
      return ordered({ ...action, during: action.during?.map((a) => orderedAction(a) as RideAction) }, PART_ORDER)
    case 'moveNpc':
      return ordered(
        { ...action, to: action.to === 'player' ? action.to : ordered(action.to, PART_ORDER), from: action.from && ordered(action.from, PART_ORDER) },
        PART_ORDER,
      )
    case 'movePlayer':
      return ordered({ ...action, to: ordered(action.to, PART_ORDER) }, PART_ORDER)
    default:
      return ordered(action, PART_ORDER)
  }
}

/** An event with its keys, and its trigger's, conditions' and actions' keys, in the file's order. */
export function canonicalEvent(event: GameEvent): GameEvent {
  return ordered(
    {
      ...event,
      trigger: ordered(event.trigger, PART_ORDER),
      conditions: event.conditions?.map(orderedCondition),
      actions: event.actions.map(orderedAction),
    },
    ['id', 'about', 'trigger', 'conditions', 'repeatable', 'actions'] satisfies Array<keyof GameEvent>,
  )
}

// ---------------------------------------------------------------------------
// Shape: what the server checks before it believes a browser.
// ---------------------------------------------------------------------------

type Problems = string[]
type Obj = Record<string, unknown>

const isObj = (value: unknown): value is Obj => typeof value === 'object' && value !== null && !Array.isArray(value)

function keys(value: Obj, path: string, required: string[], optional: string[], problems: Problems): boolean {
  const allowed = new Set([...required, ...optional])
  let ok = true
  for (const key of required) {
    if (value[key] === undefined) {
      problems.push(`${path} has no ${key}`)
      ok = false
    }
  }
  for (const key of Object.keys(value)) {
    if (!allowed.has(key) && value[key] !== undefined) {
      problems.push(`${path} has "${key}", which is not something it can have`)
      ok = false
    }
  }
  return ok
}

function string(value: unknown, path: string, problems: Problems, nonEmpty = false) {
  if (typeof value !== 'string') problems.push(`${path} should be text`)
  else if (nonEmpty && value.trim() === '') problems.push(`${path} is empty`)
}

function integer(value: unknown, path: string, problems: Problems, min = -Infinity) {
  if (typeof value !== 'number' || !Number.isInteger(value)) problems.push(`${path} should be a whole number`)
  else if (value < min) problems.push(`${path} should be at least ${min}`)
}

function oneOf(value: unknown, options: readonly string[], path: string, problems: Problems) {
  if (typeof value !== 'string' || !options.includes(value)) {
    problems.push(`${path} should be one of ${options.join(', ')}`)
  }
}

function lineList(value: unknown, path: string, problems: Problems) {
  if (!Array.isArray(value)) {
    problems.push(`${path} should be a list of lines`)
    return
  }
  if (value.length === 0) problems.push(`${path} has no lines`)
  value.forEach((line, i) => string(line, `${path}[${i}]`, problems, true))
}

function tableLines(value: unknown, path: string, problems: Problems) {
  if (!isObj(value)) {
    problems.push(`${path} should be a set of lines`)
    return
  }
  keys(value, path, [], TABLE_LINE_KINDS, problems)
  for (const kind of TABLE_LINE_KINDS) if (value[kind] !== undefined) lineList(value[kind], `${path}.${kind}`, problems)
}

const HEX = /^#[0-9a-fA-F]{6}$/

/** Problems with the shape of a character, as received from a browser. */
export function characterShapeProblems(value: unknown, path = 'character'): Problems {
  const problems: Problems = []
  if (!isObj(value)) return [`${path} is not a character`]
  keys(value, path, ['name', 'style', 'look', 'lines'], ['seat', 'personas', 'overworld'], problems)
  string(value.name, `${path}.name`, problems, true)
  string(value.style, `${path}.style`, problems)

  if (isObj(value.look)) {
    const look = value.look
    keys(look, `${path}.look`, ['skin', 'hair', 'hairStyle', 'shirt', 'accessory'], [], problems)
    for (const key of ['skin', 'hair', 'shirt'] satisfies Array<keyof AvatarLook>) {
      if (typeof look[key] !== 'string' || !HEX.test(look[key])) problems.push(`${path}.look.${key} should be a colour like #a1b2c3`)
    }
    oneOf(look.hairStyle, HAIR_STYLES, `${path}.look.hairStyle`, problems)
    oneOf(look.accessory, ACCESSORIES, `${path}.look.accessory`, problems)
  } else if (value.look !== undefined) {
    problems.push(`${path}.look should be a look`)
  }

  if (value.seat !== undefined) {
    if (!isObj(value.seat)) problems.push(`${path}.seat should be a seat`)
    else {
      const seat = value.seat
      keys(seat, `${path}.seat`, ['skillTier'], ['archetype', 'stackMultiplier'], problems)
      oneOf(seat.skillTier, SKILL_TIERS, `${path}.seat.skillTier`, problems)
      if (seat.archetype !== undefined) oneOf(seat.archetype, ARCHETYPES, `${path}.seat.archetype`, problems)
      if (seat.stackMultiplier !== undefined) {
        const m = seat.stackMultiplier
        if (typeof m !== 'number' || !Number.isFinite(m) || m <= 0) problems.push(`${path}.seat.stackMultiplier should be a positive number`)
      }
    }
  }

  if (value.lines !== undefined) tableLines(value.lines, `${path}.lines`, problems)

  if (value.personas !== undefined) {
    if (!isObj(value.personas)) problems.push(`${path}.personas should be a set of personas`)
    else {
      for (const [id, persona] of Object.entries(value.personas)) {
        const at = `${path}.personas.${id}`
        if (!/^[a-z][A-Za-z0-9]*$/.test(id)) problems.push(`"${id}" is not a persona name: a word, starting lower-case`)
        if (!isObj(persona)) {
          problems.push(`${at} is not a persona`)
          continue
        }
        keys(persona, at, [], ['style', 'lines'], problems)
        if (persona.style !== undefined) string(persona.style, `${at}.style`, problems, true)
        if (persona.lines !== undefined) tableLines(persona.lines, `${at}.lines`, problems)
      }
    }
  }

  if (value.overworld !== undefined) {
    if (!isObj(value.overworld)) problems.push(`${path}.overworld should be an overworld presence`)
    else {
      const presence = value.overworld
      keys(presence, `${path}.overworld`, ['lines', 'schedule'], ['art', 'color', 'role', 'look', 'chapters'], problems)
      lineList(presence.lines, `${path}.overworld.lines`, problems)
      // The street clothes: a uniform, and what the portrait never shows.
      if (presence.role !== undefined) string(presence.role, `${path}.overworld.role`, problems, true)
      if (presence.look !== undefined && !isObj(presence.look)) problems.push(`${path}.overworld.look should be a look`)
      if (presence.color !== undefined) integer(presence.color, `${path}.overworld.color`, problems, 0)
      scheduleShape(presence.schedule, `${path}.overworld.schedule`, problems)
      if (presence.chapters !== undefined) {
        if (!Array.isArray(presence.chapters)) problems.push(`${path}.overworld.chapters should be a list`)
        else {
          presence.chapters.forEach((chapter, i) => {
            const at = `${path}.overworld.chapters[${i}]`
            if (!isObj(chapter)) {
              problems.push(`${at} is not a chapter`)
              return
            }
            keys(chapter, at, ['when', 'schedule'], ['lines'], problems)
            if (!Array.isArray(chapter.when)) problems.push(`${at}.when should be a list of conditions`)
            else chapter.when.forEach((c, j) => conditionShape(c, `${at}.when[${j}]`, problems))
            scheduleShape(chapter.schedule, `${at}.schedule`, problems)
            if (chapter.lines !== undefined) lineList(chapter.lines, `${at}.lines`, problems)
          })
        }
      }
    }
  }
  return problems
}

/** A list of where somebody is, hour by hour: their usual day or a chapter's. */
function scheduleShape(value: unknown, path: string, problems: Problems) {
  if (!Array.isArray(value)) {
    problems.push(`${path} should be a list`)
    return
  }
  value.forEach((entry, i) => {
    const at = `${path}[${i}]`
    if (!isObj(entry)) {
      problems.push(`${at} is not a schedule entry`)
      return
    }
    keys(entry, at, ['period', 'areaId', 'col', 'row'], ['lines'], problems)
    oneOf(entry.period, TIME_PERIODS, `${at}.period`, problems)
    string(entry.areaId, `${at}.areaId`, problems, true)
    integer(entry.col, `${at}.col`, problems, 0)
    integer(entry.row, `${at}.row`, problems, 0)
    if (entry.lines !== undefined) lineList(entry.lines, `${at}.lines`, problems)
  })
}

function triggerShape(value: unknown, path: string, problems: Problems) {
  if (!isObj(value)) {
    problems.push(`${path} is not a trigger`)
    return
  }
  switch (value.kind) {
    case 'talkTo':
      keys(value, path, ['kind', 'characterId'], [], problems)
      string(value.characterId, `${path}.characterId`, problems, true)
      return
    case 'interact':
      keys(value, path, ['kind', 'poiId'], [], problems)
      string(value.poiId, `${path}.poiId`, problems, true)
      return
    case 'enterArea':
      keys(value, path, ['kind', 'areaId'], ['onLoad'], problems)
      string(value.areaId, `${path}.areaId`, problems, true)
      if (value.onLoad !== undefined && typeof value.onLoad !== 'boolean') problems.push(`${path}.onLoad should be true or false`)
      return
    case 'standOn':
      keys(value, path, ['kind', 'areaId', 'col', 'row'], [], problems)
      string(value.areaId, `${path}.areaId`, problems, true)
      integer(value.col, `${path}.col`, problems, 0)
      integer(value.row, `${path}.row`, problems, 0)
      return
    case 'caught':
      keys(value, path, ['kind'], [], problems)
      return
    default:
      problems.push(`${path}.kind should be one of ${TRIGGER_KINDS.join(', ')}`)
  }
}

function conditionShape(value: unknown, path: string, problems: Problems) {
  if (!isObj(value)) {
    problems.push(`${path} is not a condition`)
    return
  }
  switch (value.kind) {
    case 'flag':
      keys(value, path, ['kind', 'flag'], ['set'], problems)
      oneOf(value.flag, STORY_FLAGS, `${path}.flag`, problems)
      if (value.set !== undefined && typeof value.set !== 'boolean') problems.push(`${path}.set should be true or false`)
      return
    case 'period': {
      keys(value, path, ['kind', 'period'], [], problems)
      const periods = Array.isArray(value.period) ? value.period : [value.period]
      if (periods.length === 0) problems.push(`${path} names no hour`)
      periods.forEach((p, i) => oneOf(p, TIME_PERIODS, `${path}.period[${i}]`, problems))
      return
    }
    case 'dayAtLeast':
      keys(value, path, ['kind', 'day'], [], problems)
      integer(value.day, `${path}.day`, problems, 1)
      return
    case 'cashAtLeast':
      keys(value, path, ['kind', 'amount'], [], problems)
      integer(value.amount, `${path}.amount`, problems, 0)
      return
    case 'hasItem':
      keys(value, path, ['kind', 'itemId'], [], problems)
      string(value.itemId, `${path}.itemId`, problems, true)
      return
    case 'hasLesson':
      keys(value, path, ['kind', 'lessonId'], [], problems)
      string(value.lessonId, `${path}.lessonId`, problems, true)
      return
    case 'eventDone':
      keys(value, path, ['kind', 'eventId'], ['done'], problems)
      string(value.eventId, `${path}.eventId`, problems, true)
      if (value.done !== undefined && typeof value.done !== 'boolean') problems.push(`${path}.done should be true or false`)
      return
    case 'chapter': {
      keys(value, path, ['kind', 'cityId'], [], problems)
      const towns = Array.isArray(value.cityId) ? value.cityId : [value.cityId]
      if (towns.length === 0) problems.push(`${path} names no town`)
      towns.forEach((t, i) => oneOf(t, TOWN_ORDER, `${path}.cityId[${i}]`, problems))
      return
    }
    case 'cashBelow':
      keys(value, path, ['kind', 'amount'], [], problems)
      integer(value.amount, `${path}.amount`, problems, 1)
      return
    case 'debt':
    case 'challenge': {
      keys(value, path, ['kind', 'status'], value.kind === 'debt' ? ['sponsorId'] : [], problems)
      if (value.sponsorId !== undefined) string(value.sponsorId, `${path}.sponsorId`, problems, true)
      const statuses = Array.isArray(value.status) ? value.status : [value.status]
      if (statuses.length === 0) problems.push(`${path} names no status`)
      const allowed = value.kind === 'debt' ? DEBT_STATUSES : CHALLENGE_STATUSES
      statuses.forEach((s, i) => oneOf(s, allowed, `${path}.status[${i}]`, problems))
      return
    }
    case 'hunted':
      keys(value, path, ['kind'], ['sponsorId', 'set'], problems)
      if (value.sponsorId !== undefined) string(value.sponsorId, `${path}.sponsorId`, problems, true)
      if (value.set !== undefined && typeof value.set !== 'boolean') problems.push(`${path}.set should be true or false`)
      return
    case 'canPay':
      keys(value, path, ['kind', 'sponsorId'], [], problems)
      string(value.sponsorId, `${path}.sponsorId`, problems, true)
      return
    case 'count':
      keys(value, path, ['kind', 'of'], ['sponsorId', 'atLeast', 'atMost'], problems)
      oneOf(value.of, COUNT_OF, `${path}.of`, problems)
      if (value.sponsorId !== undefined) {
        string(value.sponsorId, `${path}.sponsorId`, problems, true)
        if (!SPONSOR_COUNTS.includes(value.of as CountOf)) problems.push(`${path}.sponsorId only goes with a sponsor's count`)
      }
      if (value.atLeast !== undefined) integer(value.atLeast, `${path}.atLeast`, problems, 0)
      if (value.atMost !== undefined) integer(value.atMost, `${path}.atMost`, problems, 0)
      return
    default:
      problems.push(`${path}.kind should be one of ${CONDITION_KINDS.join(', ')}`)
  }
}

function actionShape(value: unknown, path: string, problems: Problems) {
  if (!isObj(value)) {
    problems.push(`${path} is not an action`)
    return
  }
  const kind = value.kind
  switch (kind) {
    case 'dialogue':
      keys(value, path, ['kind', 'lines'], ['speaker'], problems)
      if (value.speaker !== undefined) string(value.speaker, `${path}.speaker`, problems, true)
      lineList(value.lines, `${path}.lines`, problems)
      return
    case 'choice': {
      keys(value, path, ['kind', 'prompt', 'options'], ['speaker'], problems)
      if (value.speaker !== undefined) string(value.speaker, `${path}.speaker`, problems, true)
      string(value.prompt, `${path}.prompt`, problems)
      if (!Array.isArray(value.options)) {
        problems.push(`${path}.options should be a list`)
        return
      }
      value.options.forEach((option, i) => {
        const at = `${path}.options[${i}]`
        if (!isObj(option)) {
          problems.push(`${at} is not an answer`)
          return
        }
        keys(option, at, ['label', 'then'], ['conditions', 'hidden'], problems)
        string(option.label, `${at}.label`, problems)
        if (option.hidden !== undefined && typeof option.hidden !== 'boolean') problems.push(`${at}.hidden should be true or false`)
        conditionList(option.conditions, `${at}.conditions`, problems, true)
        actionList(option.then, `${at}.then`, problems)
      })
      return
    }
    case 'if':
      keys(value, path, ['kind', 'when', 'then'], ['else'], problems)
      conditionList(value.when, `${path}.when`, problems)
      actionList(value.then, `${path}.then`, problems)
      if (value.else !== undefined) actionList(value.else, `${path}.else`, problems)
      return
    case 'moveNpc':
      keys(value, path, ['kind', 'characterId', 'to'], ['from', 'pace', 'youFollow', 'leaves'], problems)
      string(value.characterId, `${path}.characterId`, problems, true)
      if (value.to !== 'player') tileShape(value.to, `${path}.to`, problems)
      if (value.from !== undefined) tileShape(value.from, `${path}.from`, problems)
      if (value.pace !== undefined) oneOf(value.pace, ['walk', 'run'], `${path}.pace`, problems)
      for (const flag of ['youFollow', 'leaves'] as const) {
        if (value[flag] !== undefined && typeof value[flag] !== 'boolean') problems.push(`${path}.${flag} should be true or false`)
      }
      return
    case 'movePlayer':
      keys(value, path, ['kind', 'to'], ['pace'], problems)
      tileShape(value.to, `${path}.to`, problems)
      if (value.pace !== undefined) oneOf(value.pace, ['walk', 'run'], `${path}.pace`, problems)
      return
    case 'teleport':
      keys(value, path, ['kind', 'areaId', 'col', 'row'], ['with'], problems)
      string(value.areaId, `${path}.areaId`, problems, true)
      integer(value.col, `${path}.col`, problems, 0)
      integer(value.row, `${path}.row`, problems, 0)
      if (value.with !== undefined) idList(value.with, `${path}.with`, problems)
      return
    case 'ride':
      keys(value, path, ['kind', 'areaId', 'col', 'row'], ['caption', 'with', 'during'], problems)
      string(value.areaId, `${path}.areaId`, problems, true)
      integer(value.col, `${path}.col`, problems, 0)
      integer(value.row, `${path}.row`, problems, 0)
      if (value.caption !== undefined) string(value.caption, `${path}.caption`, problems)
      if (value.with !== undefined) idList(value.with, `${path}.with`, problems)
      if (value.during !== undefined) {
        actionList(value.during, `${path}.during`, problems)
        if (Array.isArray(value.during)) {
          value.during.forEach((a, i) => {
            if (isObj(a) && !RIDE_ACTION_KINDS.includes(a.kind as RideAction['kind'])) {
              problems.push(`${path}.during[${i}] cannot happen on a bus: only ${RIDE_ACTION_KINDS.join(', ')}`)
            }
          })
        }
      }
      return
    case 'takeStake':
    case 'repay':
      keys(value, path, ['kind', 'sponsorId'], [], problems)
      string(value.sponsorId, `${path}.sponsorId`, problems, true)
      return
    case 'wait':
      keys(value, path, ['kind', 'ms'], [], problems)
      integer(value.ms, `${path}.ms`, problems, 0)
      return
    case 'setFlag':
    case 'clearFlag':
      keys(value, path, ['kind', 'flag'], [], problems)
      oneOf(value.flag, STORY_FLAGS, `${path}.flag`, problems)
      return
    case 'giveItem':
      keys(value, path, ['kind', 'itemId'], [], problems)
      string(value.itemId, `${path}.itemId`, problems, true)
      return
    case 'giveCash':
      keys(value, path, ['kind', 'amount'], [], problems)
      integer(value.amount, `${path}.amount`, problems)
      return
    case 'unlockCity':
      keys(value, path, ['kind', 'cityId'], [], problems)
      string(value.cityId, `${path}.cityId`, problems, true)
      return
    case 'unlockTable':
    case 'startTable':
      keys(value, path, ['kind', 'tableId'], [], problems)
      string(value.tableId, `${path}.tableId`, problems, true)
      return
    case 'startPokerNight':
      keys(value, path, ['kind'], [], problems)
      return
    case 'advancePeriod':
      keys(value, path, ['kind'], ['steps'], problems)
      if (value.steps !== undefined) integer(value.steps, `${path}.steps`, problems, 1)
      return
    case 'advanceDay':
      keys(value, path, ['kind'], ['days'], problems)
      if (value.days !== undefined) integer(value.days, `${path}.days`, problems, 1)
      return
    case 'playSound':
      keys(value, path, ['kind', 'sound'], [], problems)
      oneOf(value.sound, SOUNDS, `${path}.sound`, problems)
      return
    case 'fade':
      keys(value, path, ['kind', 'to'], [], problems)
      oneOf(value.to, ['out', 'in'], `${path}.to`, problems)
      return
    default:
      problems.push(`${path}.kind should be one of ${ACTION_KINDS.join(', ')}`)
  }
}

function tileShape(value: unknown, path: string, problems: Problems) {
  if (!isObj(value)) {
    problems.push(`${path} should be a tile, { col, row }`)
    return
  }
  keys(value, path, ['col', 'row'], [], problems)
  integer(value.col, `${path}.col`, problems, 0)
  integer(value.row, `${path}.row`, problems, 0)
}

function idList(value: unknown, path: string, problems: Problems) {
  if (!Array.isArray(value)) problems.push(`${path} should be a list of ids`)
  else value.forEach((id, i) => string(id, `${path}[${i}]`, problems, true))
}

function conditionList(value: unknown, path: string, problems: Problems, optional = false) {
  if (value === undefined && optional) return
  if (!Array.isArray(value)) problems.push(`${path} should be a list`)
  else value.forEach((c, i) => conditionShape(c, `${path}[${i}]`, problems))
}

function actionList(value: unknown, path: string, problems: Problems) {
  if (!Array.isArray(value)) problems.push(`${path} should be a list`)
  else value.forEach((a, i) => actionShape(a, `${path}[${i}]`, problems))
}

/** Problems with the shape of an event, as received from a browser. */
export function eventShapeProblems(value: unknown, path = 'event'): Problems {
  const problems: Problems = []
  if (!isObj(value)) return [`${path} is not an event`]
  keys(value, path, ['id', 'about', 'trigger', 'actions'], ['conditions', 'repeatable'], problems)
  string(value.id, `${path}.id`, problems, true)
  string(value.about, `${path}.about`, problems)
  triggerShape(value.trigger, `${path}.trigger`, problems)
  if (value.conditions !== undefined) {
    if (!Array.isArray(value.conditions)) problems.push(`${path}.conditions should be a list`)
    else value.conditions.forEach((c, i) => conditionShape(c, `${path}.conditions[${i}]`, problems))
  }
  if (value.repeatable !== undefined && typeof value.repeatable !== 'boolean') {
    problems.push(`${path}.repeatable should be true or false`)
  }
  if (!Array.isArray(value.actions)) problems.push(`${path}.actions should be a list`)
  else value.actions.forEach((a, i) => actionShape(a, `${path}.actions[${i}]`, problems))
  return problems
}

// ---------------------------------------------------------------------------
// Reading an event out loud.
// ---------------------------------------------------------------------------

export interface Names {
  character: (id: string) => string
  area: (id: string) => string
  table: (id: string) => string
  poi: (id: string) => string
  item: (id: string) => string
  lesson: (id: string) => string
  city: (id: string) => string
  /** Optional, so older callers still describe a sponsor by id. */
  sponsor?: (id: string) => string
}

const FLAG_WORDS = Object.fromEntries(STORY_FLAG_IDS.map((f) => [f, FLAG_MEANING[f].set])) as Record<StoryFlag, string>
const NOT_FLAG_WORDS = Object.fromEntries(STORY_FLAG_IDS.map((f) => [f, FLAG_MEANING[f].clear])) as Record<StoryFlag, string>

const DEBT_WORDS: Record<DebtStatus, string> = { none: 'owe nothing', owing: 'owe, on time', overdue: 'are past due' }
const CHALLENGE_WORDS: Record<ChallengeStatus, string> = {
  unplayed: 'not played yet',
  lost: 'lost, and she is making you wait',
  rematch: 'lost, and she will play you again now',
  won: 'won',
}
const COUNT_WORDS: Record<CountOf, string> = {
  busted: 'gone broke',
  challengeLost: 'lost the match',
  staked: 'taken a stake',
  repaid: 'paid a stake back',
  missed: 'missed a stake',
  caught: 'been caught by collectors',
}

function timesWords(atLeast: number | undefined, atMost: number | undefined): string {
  if (atMost === 0) return 'never'
  const low = atLeast ?? (atMost === undefined ? 1 : 0)
  if (atMost === undefined) return low <= 1 ? 'at least once' : `at least ${low} times`
  return low === atMost ? `exactly ${low} times` : `${low} to ${atMost} times`
}

const listOf = (items: string[]) =>
  items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} or ${items[items.length - 1]}`

export function describeTrigger(trigger: EventTrigger, names: Names): string {
  switch (trigger.kind) {
    case 'talkTo':
      return `When you talk to ${names.character(trigger.characterId)}`
    case 'interact':
      return `When you use ${names.poi(trigger.poiId)}`
    case 'enterArea':
      return `When you walk into ${names.area(trigger.areaId)}${trigger.onLoad ? ', or a save is loaded there' : ''}`
    case 'standOn':
      return `When you step on (${trigger.col},${trigger.row}) in ${names.area(trigger.areaId)}`
    case 'caught':
      return 'When the collectors catch you'
  }
}

export function describeCondition(condition: EventCondition, names: Names): string {
  switch (condition.kind) {
    case 'flag':
      return (condition.set ?? true) ? FLAG_WORDS[condition.flag] : NOT_FLAG_WORDS[condition.flag]
    case 'period': {
      const periods: TimePeriod[] = Array.isArray(condition.period) ? condition.period : [condition.period]
      return `it is ${listOf(periods)}`
    }
    case 'dayAtLeast':
      return `it is day ${condition.day} or later`
    case 'cashAtLeast':
      return `you have at least $${condition.amount.toLocaleString('en-US')}`
    case 'hasItem':
      return `you own ${names.item(condition.itemId)}`
    case 'hasLesson':
      return `you have taken ${names.lesson(condition.lessonId)}`
    case 'eventDone':
      return (condition.done ?? true)
        ? `“${condition.eventId}” has happened`
        : `“${condition.eventId}” has not happened yet`
    case 'chapter': {
      const towns = Array.isArray(condition.cityId) ? condition.cityId : [condition.cityId]
      return `the furthest you have got is ${listOf(towns.map(names.city))}`
    }
    case 'cashBelow':
      return `you have less than $${condition.amount.toLocaleString('en-US')}`
    case 'debt': {
      const who = condition.sponsorId ? (names.sponsor?.(condition.sponsorId) ?? condition.sponsorId) : 'everybody'
      return `to ${who} you ${listOf([condition.status].flat().map((s) => DEBT_WORDS[s]))}`
    }
    case 'hunted': {
      const whose = condition.sponsorId ? `${names.sponsor?.(condition.sponsorId) ?? condition.sponsorId}'s collectors are` : 'collectors are'
      return (condition.set ?? true) ? `${whose} working this town` : `${whose} not working this town`
    }
    case 'challenge':
      return `the match is ${listOf([condition.status].flat().map((s) => CHALLENGE_WORDS[s]))}`
    case 'count': {
      const whose = condition.sponsorId ? ` with ${names.sponsor?.(condition.sponsorId) ?? condition.sponsorId}` : ''
      return `you have ${COUNT_WORDS[condition.of]}${whose} ${timesWords(condition.atLeast, condition.atMost)}`
    }
    case 'canPay':
      return `you can pay ${names.sponsor?.(condition.sponsorId) ?? condition.sponsorId} back in full`
  }
}

const spotWords = (spot: Spot) => (spot === 'player' ? 'up to you' : `to (${spot.col},${spot.row})`)

/** A line without its "Marcus: " label, when the label is just the speaker's name again. */
function spoken(line: string, who: string): string {
  return line.startsWith(`${who}: `) ? line.slice(who.length + 2) : line
}

/** One action as a sentence: "Marcus says “…”", "the poker night starts". */
export function describeAction(action: EventAction, names: Names): string {
  switch (action.kind) {
    case 'dialogue': {
      const who = action.speaker ? names.character(action.speaker) : 'a caption'
      const first = spoken(action.lines[0] ?? '', who)
      const more = action.lines.length > 1 ? ` (+${action.lines.length - 1} more)` : ''
      return action.speaker ? `${who} says “${first}”${more}` : `${who} reads “${first}”${more}`
    }
    case 'choice':
      return `${action.speaker ? names.character(action.speaker) : 'you are'} ${action.speaker ? 'asks' : 'asked'} “${action.prompt}” — ${action.options.map((o) => `“${o.label}”`).join(' or ')}`
    case 'if':
      return `if ${action.when.map((c) => describeCondition(c, names)).join(' and ')}…`
    case 'moveNpc': {
      const who = names.character(action.characterId)
      const how = action.pace === 'run' ? 'runs' : 'walks'
      const from = action.from ? ` from (${action.from.col},${action.from.row})` : ''
      const follow = action.youFollow ? ', and you walk behind' : ''
      const leaves = action.leaves ? ', and goes' : ''
      return `${who} ${how}${from} ${spotWords(action.to)}${follow}${leaves}`
    }
    case 'movePlayer':
      return `you ${action.pace === 'run' ? 'run' : 'walk'} ${spotWords(action.to)}`
    case 'ride': {
      const company = action.with?.length ? ` with ${listOf(action.with.map(names.character))}` : ''
      return `you ride the bus to ${names.area(action.areaId)}${company}, and cannot get off`
    }
    case 'takeStake':
      return `you take ${names.sponsor?.(action.sponsorId) ?? action.sponsorId}'s stake`
    case 'repay':
      return `you pay ${names.sponsor?.(action.sponsorId) ?? action.sponsorId} back what you owe`
    case 'wait':
      return `a pause of ${action.ms}ms`
    case 'setFlag':
      return `from now on, ${FLAG_WORDS[action.flag]}`
    case 'clearFlag':
      return `it is no longer true that ${FLAG_WORDS[action.flag]}`
    case 'giveItem':
      return `you are given ${names.item(action.itemId)}`
    case 'giveCash':
      return action.amount >= 0
        ? `you are given $${action.amount.toLocaleString('en-US')}`
        : `you hand over $${(-action.amount).toLocaleString('en-US')}`
    case 'unlockCity':
      return `${names.city(action.cityId)} opens up`
    case 'unlockTable':
      return `${names.table(action.tableId)} lets you sit down`
    case 'startTable':
      return `you sit down at ${names.table(action.tableId)}`
    case 'startPokerNight':
      return 'the poker night starts'
    case 'teleport': {
      const company = action.with?.length ? `, with ${listOf(action.with.map(names.character))}` : ''
      return `you find yourself in ${names.area(action.areaId)} at (${action.col},${action.row})${company}`
    }
    case 'advancePeriod':
      return (action.steps ?? 1) === 1 ? 'the hour moves on' : `${action.steps} hours pass`
    case 'advanceDay':
      return (action.days ?? 1) === 1 ? 'a day passes' : `${action.days} days pass`
    case 'playSound':
      return `a “${action.sound}” sound plays`
    case 'fade':
      return action.to === 'out' ? 'the screen fades to black' : 'the screen fades back in'
  }
}

/** One row of an event read aloud. */
export interface ScriptLine {
  text: string
  /** Which action it belongs to, from 1; 0 for the opening "When…" line. */
  step: number
  /** A further line of the same conversation. */
  more?: boolean
  /** How far inside a choice or an `if` it is: 0 for the event's own steps. */
  depth?: number
}

/** The whole event read as a little script, one row per beat and per line spoken. */
export function describeEvent(event: GameEvent, names: Names): ScriptLine[] {
  const conditions = (event.conditions ?? []).map((c) => describeCondition(c, names))
  const opening =
    describeTrigger(event.trigger, names) +
    (conditions.length > 0 ? `, if ${conditions.join(' and ')}` : '') +
    (event.repeatable ? ' (every time)' : ' (once)') +
    ':'
  return [{ text: opening, step: 0 }, ...describeActions(event.actions, names, 0)]
}

/** A list of actions read aloud, with what is inside a choice or an `if` indented under it. */
function describeActions(actions: EventAction[], names: Names, depth: number, stepOf?: number): ScriptLine[] {
  return actions.flatMap((action, i): ScriptLine[] => {
    const then = i === 0 ? '' : 'then '
    const step = stepOf ?? i + 1
    const at = depth > 0 ? { depth } : {}
    const inner = (lead: string, list: EventAction[]): ScriptLine[] => [
      { text: lead, step, ...{ depth: depth + 1 } },
      ...describeActions(list, names, depth + 2, step),
    ]
    switch (action.kind) {
      case 'choice':
        return [
          { text: `${then}${describeAction(action, names)}`, step, ...at },
          ...action.options.flatMap((option) => {
            const open = option.conditions?.length
              ? `, open if ${option.conditions.map((c) => describeCondition(c, names)).join(' and ')}`
              : ''
            return inner(`answer “${option.label}”${open}:`, option.then)
          }),
        ]
      case 'if':
        return [
          { text: `${then}${describeAction(action, names)}`, step, ...at },
          ...describeActions(action.then, names, depth + 1, step),
          ...(action.else ? inner('otherwise:', action.else) : []),
        ]
      case 'ride':
        return [
          { text: `${then}${describeAction(action, names)}`, step, ...at },
          ...describeActions(action.during ?? [], names, depth + 1, step),
        ]
      case 'dialogue': {
        if (action.lines.length <= 1) return [{ text: `${then}${describeAction(action, names)}`, step, ...at }]
        // A conversation reads better as the lines themselves than as "(+2 more)".
        const who = action.speaker ? names.character(action.speaker) : 'a caption'
        const [first, ...rest] = action.lines
        return [
          { text: `${then}${describeAction({ ...action, lines: [first] }, names)}`, step, ...at },
          ...rest.map((line) => ({ text: `“${spoken(line, who)}”`, step, more: true, ...at })),
        ]
      }
      default:
        return [{ text: `${then}${describeAction(action, names)}`, step, ...at }]
    }
  })
}
