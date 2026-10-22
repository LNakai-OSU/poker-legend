import { useMemo, useState } from 'react'
import { CHARACTERS } from '../world/characters'
import { EVENTS, type EventAction, type EventCondition, type EventTrigger, type GameEvent } from '../world/events'
import { AREAS, LESSONS, TABLES, allShopItems } from '../world/content'
import { TIME_PERIODS, type TimePeriod } from '../game/time'
import { TOWN_ORDER, type CityId, type CountOf } from '../game/state'
import {
  ACTION_KINDS,
  CHALLENGE_STATUSES,
  CONDITION_KINDS,
  COUNT_OF,
  DEBT_STATUSES,
  ENDS_EVENT,
  SPONSOR_COUNTS,
  SOUNDS,
  STORY_FLAGS,
  TRIGGER_KINDS,
  blankAction,
  blankCondition,
  blankTrigger,
  canonicalEvent,
  describeAction,
  describeEvent,
} from './contentModel'
import { eventProblems, gameWorld, poisOf } from './contentRules'
import {
  areaOptions,
  characterOptions,
  cityOptions,
  clone,
  eventOptions,
  itemOptions,
  lastSave,
  lessonOptions,
  sponsorOptions,
  move,
  names as namesIn,
  poiOptions,
  saveEntry,
  tableOptions,
  type SaveResult,
} from './editorData'
import { EditorTabs, Field, LineList, NumberBox, Pick, ProblemList, Reorder, Section, SideList } from './editorUi'
import { sameValue } from './literal'

/**
 * The story, as a list of scripted beats you can read and rearrange.
 *
 * An event in `events.ts` is a trigger, some conditions and an ordered list of
 * actions. Written as data it is precise but hard to *read* — so this shows each
 * event as the little script it is ("When you talk to Marcus, if it is
 * evening: Marcus says …, then the poker night starts") beside the controls
 * that change it, with every id picked from the ids that actually exist.
 */

const TRIGGER_LABEL: Record<EventTrigger['kind'], string> = {
  talkTo: 'you talk to somebody',
  interact: 'you use a fixture',
  enterArea: 'you walk into an area',
  standOn: 'you step on a tile',
  caught: 'the collectors catch you',
}

const CONDITION_LABEL: Record<EventCondition['kind'], string> = {
  flag: 'a story flag',
  period: 'the hour',
  dayAtLeast: 'the day is at least',
  cashAtLeast: 'cash is at least',
  hasItem: 'you own an item',
  hasLesson: 'you have a lesson',
  eventDone: 'another event',
  chapter: 'how far the run has got',
  cashBelow: 'cash is below',
  debt: 'what you owe a sponsor',
  hunted: 'collectors are in town',
  challenge: 'where the match stands',
  count: 'how often something has happened',
}

const ACTION_LABEL: Record<EventAction['kind'], string> = {
  dialogue: 'somebody says',
  moveNpc: 'somebody walks',
  wait: 'pause',
  setFlag: 'set a flag',
  clearFlag: 'clear a flag',
  giveItem: 'give an item',
  giveCash: 'give or take cash',
  unlockCity: 'open a city',
  unlockTable: 'open a table',
  startTable: 'sit down at a table',
  startPokerNight: 'start the poker night',
  teleport: 'move the player',
  advancePeriod: 'pass an hour',
  advanceDay: 'pass a day',
  playSound: 'play a sound',
  fade: 'fade the screen',
}

export function EventEditor({ selected, onClose }: { selected: string | null; onClose: () => void }) {
  const world = useMemo(() => gameWorld(), [])
  const names = useMemo(() => namesIn(world), [world])
  const options = useMemo(
    () => ({
      characters: characterOptions(),
      areas: areaOptions(),
      tables: tableOptions(),
      cities: cityOptions(),
      items: itemOptions(),
      lessons: lessonOptions(),
      sponsors: sponsorOptions(),
      events: eventOptions(),
      pois: poiOptions(world),
    }),
    [world],
  )
  const inTown = Object.keys(CHARACTERS).filter((id) => CHARACTERS[id].overworld)
  const firstIds = {
    // Somebody who is out in the town and has no event of their own yet, so a
    // new event does not start life fighting an old one over the same moment.
    character:
      inTown.find((id) => !EVENTS.some((e) => e.trigger.kind === 'talkTo' && e.trigger.characterId === id)) ??
      inTown[0] ??
      Object.keys(CHARACTERS)[0],
    area: AREAS.basin ? 'basin' : Object.keys(AREAS)[0],
    poi: [...poisOf(world).keys()][0],
    table: Object.keys(TABLES)[0],
    city: options.cities[0]?.[0] ?? '',
    item: allShopItems()[0]?.id ?? '',
    lesson: Object.keys(LESSONS)[0] ?? '',
    event: EVENTS[0]?.id ?? '',
  }

  const [drafts, setDrafts] = useState<Record<string, GameEvent>>({})
  const [saved, setSaved] = useState<Record<string, GameEvent>>({})
  const [results, setResults] = useState<Record<string, SaveResult>>({})
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')

  const baseline = (key: string): GameEvent | undefined => saved[key] ?? EVENTS.find((e) => e.id === key)
  const keys = [
    ...EVENTS.map((e) => e.id),
    ...Object.keys(saved).filter((key) => !EVENTS.some((e) => e.id === key)),
    ...Object.keys(drafts).filter((key) => !baseline(key)),
  ]
  // Drafts are keyed by the id the event was loaded (or created) under, so a
  // new event can be renamed while it is still being written.
  const key = selected && (baseline(selected) || drafts[selected]) ? selected : keys[0]
  const isNew = !baseline(key)
  const event = drafts[key] ?? clone(baseline(key)!)
  const dirty = (k: string) => drafts[k] !== undefined && (!baseline(k) || !sameValue(drafts[k], baseline(k)))
  const result = results[key] ?? lastSave('event', key)

  const select = (k: string) => (window.location.hash = `#editor/events/${encodeURIComponent(k)}`)

  const edit = (change: (e: GameEvent) => void) => {
    setDrafts((all) => {
      const next = clone(all[key] ?? baseline(key)!)
      change(next)
      if (next.conditions && next.conditions.length === 0) delete next.conditions
      return { ...all, [key]: next }
    })
    setResults((all) => {
      const rest = { ...all }
      delete rest[key]
      return rest
    })
  }

  const problems = eventProblems(event, isNew ? null : key, world)
  const script = describeEvent(event, names)

  const save = async () => {
    setSaving(true)
    const after = canonicalEvent(event)
    const outcome = await saveEntry('event', { id: after.id, before: isNew ? undefined : baseline(key), after })
    setSaving(false)
    setResults((all) => ({ ...all, [key]: outcome, [after.id]: outcome }))
    if (outcome.ok) {
      setSaved((all) => ({ ...all, [after.id]: after }))
      setDrafts((all) => {
        const rest = { ...all }
        delete rest[key]
        return rest
      })
      if (after.id !== key) select(after.id)
    }
  }

  const revert = () => {
    setDrafts((all) => {
      const rest = { ...all }
      delete rest[key]
      return rest
    })
    setResults({})
  }

  const create = () => {
    let id = 'new-event'
    for (let n = 2; baseline(id) || drafts[id]; n++) id = `new-event-${n}`
    setDrafts((all) => ({
      ...all,
      [id]: {
        id,
        about: '',
        trigger: blankTrigger('talkTo', firstIds),
        actions: [{ kind: 'dialogue', speaker: firstIds.character, lines: [''] }],
      },
    }))
    select(id)
  }

  const needle = query.trim().toLowerCase()
  const shown = keys.filter((k) => {
    if (!needle) return true
    const e = drafts[k] ?? baseline(k)
    return [k, e?.about].some((text) => text?.toLowerCase().includes(needle))
  })
  const canSave = dirty(key) && problems.length === 0 && !saving

  const actions = event.actions
  const endsAt = actions.findIndex((a) => ENDS_EVENT.has(a.kind))

  return (
    <div className="ed-page" data-testid="event-editor">
      <header className="ed-bar">
        <EditorTabs tab="events" />
        <span className="ed-muted ed-small ed-count-label">{EVENTS.length} events</span>
        <span style={{ flex: 1 }} />
        <span className="ed-small" data-testid="event-problem-count" style={{ color: problems.length ? '#e05a5a' : '#3a9d5c' }}>
          {problems.length === 0 ? 'no problems' : `${problems.length} problem${problems.length === 1 ? '' : 's'}`}
        </span>
        <button
          type="button"
          className="ed-btn primary"
          data-testid="save-event"
          disabled={!canSave}
          title={problems.length > 0 ? 'Fix the problems first: saving would break a content test' : undefined}
          onClick={save}
        >
          {saving ? 'Saving…' : isNew ? 'Create' : 'Save'}
        </button>
        <button type="button" className="ed-btn" data-testid="revert-event" disabled={!dirty(key)} onClick={revert}>
          Revert
        </button>
        <button type="button" className="ed-btn" onClick={onClose}>
          Close
        </button>
      </header>

      <div className="ed-body">
        <aside className="ed-list">
          <div className="ed-row" style={{ flexWrap: 'nowrap' }}>
            <input
              className="ed-input"
              type="search"
              placeholder="Search events…"
              aria-label="Search events"
              data-testid="event-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="button" className="ed-btn" data-testid="new-event" onClick={create}>
              + New
            </button>
          </div>
          <SideList selected={key} testid="event-list">
            {shown.map((k) => {
              const e = drafts[k] ?? baseline(k)!
              return (
                <button key={k} type="button" className="ed-item" aria-selected={k === key} data-testid={`event-${k}`} onClick={() => select(k)}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ fontWeight: 600 }}>{e.id || k}</strong>
                    <span className="sub clamp">{e.about || 'Not described yet.'}</span>
                  </span>
                  {dirty(k) && <span className="ed-dot" title="Unsaved changes" style={{ background: '#f2c14e' }} />}
                </button>
              )
            })}
            {shown.length === 0 && <span className="ed-muted ed-small">No event matches “{query}”.</span>}
          </SideList>
        </aside>

        <main className="ed-detail" data-testid="event-detail" data-event={key}>
          <Section title="As a script" hint={event.id} testid="event-script">
            <ol className="ed-script" data-testid="script">
              {script.map((line, i) => (
                <li
                  key={i}
                  className={line.more ? 'more' : undefined}
                  title={endsAt >= 0 && line.step - 1 > endsAt ? 'Never happens: the event has already ended at a table' : undefined}
                  style={endsAt >= 0 && line.step - 1 > endsAt ? { color: '#e05a5a', textDecoration: 'line-through' } : undefined}
                >
                  {line.text}
                </li>
              ))}
            </ol>
          </Section>

          <Section title="Checks" hint="the content tests' rules, applied as you type" testid="event-checks">
            <ProblemList testid="event-problems" problems={problems} ok="Nothing wrong. Saving will not break a content test." />
            {result && (
              <p className="ed-result" data-testid="event-save-result" style={{ color: result.ok ? '#3a9d5c' : '#e05a5a', margin: '8px 0 0' }}>
                {result.ok ? 'Written to events.ts — ' : 'Not saved — '}
                {result.text}
                {result.problems && `: ${result.problems.join('; ')}`}
              </p>
            )}
          </Section>

          <Section title="About">
            <div style={{ display: 'grid', gap: 8 }}>
              {isNew && (
                <Field label="Id — lower-case words joined with hyphens; it cannot change once saved">
                  <input
                    className="ed-input"
                    data-testid="event-id"
                    value={event.id}
                    onChange={(e) => edit((ev) => void (ev.id = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')))}
                  />
                </Field>
              )}
              <Field label="What it is for, in a sentence, for whoever reads it next">
                <textarea className="ed-input" rows={2} data-testid="event-about" value={event.about} onChange={(e) => edit((ev) => void (ev.about = e.target.value))} />
              </Field>
              <label className="ed-toggle">
                <input
                  type="checkbox"
                  data-testid="event-repeatable"
                  checked={!!event.repeatable}
                  onChange={(e) => edit((ev) => void (e.target.checked ? (ev.repeatable = true) : delete ev.repeatable))}
                />
                happens every time (otherwise once, ever)
              </label>
            </div>
          </Section>

          <Section title="When" testid="event-trigger">
            <div className="ed-row">
              <Pick
                label="Trigger"
                testid="trigger-kind"
                value={event.trigger.kind}
                options={TRIGGER_KINDS.map((k) => [k, TRIGGER_LABEL[k]])}
                onChange={(kind) => edit((ev) => void (ev.trigger = blankTrigger(kind as EventTrigger['kind'], firstIds)))}
              />
              <TriggerTarget trigger={event.trigger} options={options} onChange={(trigger) => edit((ev) => void (ev.trigger = trigger))} />
            </div>
          </Section>

          <Section
            title="Only if"
            hint={(event.conditions ?? []).length === 0 ? 'always — nothing has to be true' : 'all of these are true'}
            testid="event-conditions"
          >
            <div style={{ display: 'grid', gap: 6 }}>
              {(event.conditions ?? []).map((condition, i) => (
                <div className="ed-card" key={i} data-testid={`condition-${i}`}>
                  <div className="head">
                    <Pick
                      label="Condition"
                      testid={`condition-${i}-kind`}
                      value={condition.kind}
                      options={CONDITION_KINDS.map((k) => [k, CONDITION_LABEL[k]])}
                      onChange={(kind) => edit((ev) => void (ev.conditions![i] = blankCondition(kind as EventCondition['kind'], firstIds)))}
                    />
                    <ConditionFields
                      condition={condition}
                      index={i}
                      options={options}
                      onChange={(next) => edit((ev) => void (ev.conditions![i] = next))}
                    />
                    <span style={{ flex: 1 }} />
                    <button
                      type="button"
                      className="ed-btn icon danger"
                      title="Remove this condition"
                      aria-label="Remove this condition"
                      data-testid={`condition-${i}-remove`}
                      onClick={() => edit((ev) => void ev.conditions!.splice(i, 1))}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
              <div>
                <Pick
                  label="Add a condition"
                  testid="condition-add"
                  value=""
                  empty="+ only if…"
                  options={CONDITION_KINDS.map((k) => [k, CONDITION_LABEL[k]])}
                  onChange={(kind) =>
                    kind && edit((ev) => void (ev.conditions = [...(ev.conditions ?? []), blankCondition(kind as EventCondition['kind'], firstIds)]))
                  }
                />
              </div>
            </div>
          </Section>

          <Section title="Then" hint="in order — talking and waiting hold the next step until they finish" testid="event-actions">
            <div style={{ display: 'grid', gap: 6 }}>
              {actions.map((action, i) => (
                <div className="ed-card" key={i} data-testid={`action-${i}`} style={endsAt >= 0 && i > endsAt ? { opacity: 0.6 } : undefined}>
                  <div className="head">
                    <span className="ed-step">{i + 1}</span>
                    <Pick
                      label="Action"
                      testid={`action-${i}-kind`}
                      value={action.kind}
                      options={ACTION_KINDS.map((k) => [k, ACTION_LABEL[k]])}
                      onChange={(kind) => edit((ev) => void (ev.actions[i] = blankAction(kind as EventAction['kind'], firstIds)))}
                    />
                    <span className="say" data-testid={`action-${i}-says`}>
                      {describeAction(action, names)}
                    </span>
                    <Reorder
                      index={i}
                      count={actions.length}
                      what="step"
                      testid={`action-${i}`}
                      onMove={(to) => edit((ev) => void (ev.actions = move(ev.actions, i, to)))}
                      onRemove={() => edit((ev) => void ev.actions.splice(i, 1))}
                    />
                  </div>
                  <ActionFields action={action} index={i} options={options} onChange={(next) => edit((ev) => void (ev.actions[i] = next))} />
                </div>
              ))}
              <div>
                <Pick
                  label="Add a step"
                  testid="action-add"
                  value=""
                  empty="+ then…"
                  options={ACTION_KINDS.map((k) => [k, ACTION_LABEL[k]])}
                  onChange={(kind) => kind && edit((ev) => void ev.actions.push(blankAction(kind as EventAction['kind'], firstIds)))}
                />
              </div>
            </div>
          </Section>
          <p className="ed-muted ed-small" style={{ margin: 0 }}>
            Saving edits <code>src/world/events.ts</code> directly, changing only what you changed — comments and
            layout elsewhere in the event are kept. Git is the undo.
          </p>
        </main>
      </div>
    </div>
  )
}

type Options = Record<'characters' | 'areas' | 'tables' | 'cities' | 'items' | 'lessons' | 'events' | 'pois' | 'sponsors', Array<[string, string]>>

function TriggerTarget({ trigger, options, onChange }: { trigger: EventTrigger; options: Options; onChange: (t: EventTrigger) => void }) {
  switch (trigger.kind) {
    case 'talkTo':
      return <Pick label="Who" testid="trigger-character" value={trigger.characterId} options={options.characters} onChange={(characterId) => onChange({ ...trigger, characterId })} />
    case 'interact':
      return <Pick label="Which fixture" testid="trigger-poi" value={trigger.poiId} options={options.pois} onChange={(poiId) => onChange({ ...trigger, poiId })} />
    case 'enterArea':
      return <Pick label="Which area" testid="trigger-area" value={trigger.areaId} options={options.areas} onChange={(areaId) => onChange({ ...trigger, areaId })} />
    case 'standOn':
      return (
        <>
          <Pick label="Which area" testid="trigger-area" value={trigger.areaId} options={options.areas} onChange={(areaId) => onChange({ ...trigger, areaId })} />
          <span className="ed-muted ed-small">col</span>
          <NumberBox label="Column" width={56} value={trigger.col} onChange={(col) => onChange({ ...trigger, col: col ?? 0 })} />
          <span className="ed-muted ed-small">row</span>
          <NumberBox label="Row" width={56} value={trigger.row} onChange={(row) => onChange({ ...trigger, row: row ?? 0 })} />
        </>
      )
    case 'caught':
      return <span className="ed-muted ed-small">whoever&rsquo;s collectors they are: add a &ldquo;collectors are in town&rdquo; condition</span>
  }
}

/** A sponsor, or everybody when none is picked. */
function SponsorPick({ value, options, onChange, everybody = 'any sponsor' }: { value: string | undefined; options: Options; onChange: (id: string | undefined) => void; everybody?: string }) {
  return (
    <Pick
      label="Sponsor"
      value={value ?? ''}
      options={[['', everybody], ...options.sponsors]}
      onChange={(id) => onChange(id === '' ? undefined : id)}
    />
  )
}

/** Toggle buttons for a status that may be one value or several, as the hours are picked. */
function StatusToggles<T extends string>({ id, all, chosen, onChange }: { id: string; all: readonly T[]; chosen: T[]; onChange: (next: T | T[]) => void }) {
  return (
    <span className="ed-periods" data-testid={`${id}-statuses`}>
      {all.map((status) => (
        <button
          key={status}
          type="button"
          className="ed-btn small"
          aria-pressed={chosen.includes(status)}
          data-testid={`${id}-${status}`}
          onClick={() => {
            const next = chosen.includes(status) ? chosen.filter((s) => s !== status) : all.filter((s) => s === status || chosen.includes(s))
            if (next.length > 0) onChange(next.length === 1 ? next[0] : next)
          }}
        >
          {status}
        </button>
      ))}
    </span>
  )
}

function ConditionFields({
  condition,
  index,
  options,
  onChange,
}: {
  condition: EventCondition
  index: number
  options: Options
  onChange: (c: EventCondition) => void
}) {
  const id = `condition-${index}`
  switch (condition.kind) {
    case 'flag':
      return (
        <>
          <Pick label="Flag" value={condition.flag} options={STORY_FLAGS.map((f) => [f, f])} onChange={(flag) => onChange({ ...condition, flag: flag as typeof condition.flag })} />
          <Pick
            label="Is it set"
            testid={`${id}-set`}
            value={(condition.set ?? true) ? 'set' : 'unset'}
            options={[
              ['set', 'is set'],
              ['unset', 'is not set'],
            ]}
            onChange={(v) => {
              const next = { ...condition }
              if (v === 'set') delete next.set
              else next.set = false
              onChange(next)
            }}
          />
        </>
      )
    case 'period': {
      const chosen: TimePeriod[] = Array.isArray(condition.period) ? condition.period : [condition.period]
      return (
        <span className="ed-periods" data-testid={`${id}-periods`}>
          {TIME_PERIODS.map((period) => (
            <button
              key={period}
              type="button"
              className="ed-btn small"
              aria-pressed={chosen.includes(period)}
              data-testid={`${id}-${period}`}
              onClick={() => {
                const next = chosen.includes(period) ? chosen.filter((p) => p !== period) : TIME_PERIODS.filter((p) => p === period || chosen.includes(p))
                onChange({ ...condition, period: next.length === 1 ? next[0] : next })
              }}
            >
              {period}
            </button>
          ))}
        </span>
      )
    }
    case 'dayAtLeast':
      return <NumberBox label="Day" testid={`${id}-day`} value={condition.day} onChange={(day) => onChange({ ...condition, day: day ?? 1 })} />
    case 'cashAtLeast':
      return <NumberBox label="Cash" width={90} testid={`${id}-amount`} value={condition.amount} onChange={(amount) => onChange({ ...condition, amount: amount ?? 0 })} />
    case 'hasItem':
      return <Pick label="Item" value={condition.itemId} options={options.items} onChange={(itemId) => onChange({ ...condition, itemId })} />
    case 'hasLesson':
      return <Pick label="Lesson" value={condition.lessonId} options={options.lessons} onChange={(lessonId) => onChange({ ...condition, lessonId })} />
    case 'eventDone':
      return (
        <>
          <Pick label="Event" value={condition.eventId} options={options.events} onChange={(eventId) => onChange({ ...condition, eventId })} />
          <Pick
            label="Has it happened"
            value={(condition.done ?? true) ? 'done' : 'not'}
            options={[
              ['done', 'has happened'],
              ['not', 'has not happened'],
            ]}
            onChange={(v) => {
              const next = { ...condition }
              if (v === 'done') delete next.done
              else next.done = false
              onChange(next)
            }}
          />
        </>
      )
    case 'chapter': {
      // One town, or any of several, picked the way the hours are.
      const chosen: CityId[] = Array.isArray(condition.cityId) ? condition.cityId : [condition.cityId]
      return (
        <span className="ed-periods" data-testid={`${id}-towns`}>
          {TOWN_ORDER.map((town) => (
            <button
              key={town}
              type="button"
              className="ed-btn small"
              aria-pressed={chosen.includes(town)}
              data-testid={`${id}-${town}`}
              onClick={() => {
                const next = chosen.includes(town) ? chosen.filter((t) => t !== town) : TOWN_ORDER.filter((t) => t === town || chosen.includes(t))
                if (next.length > 0) onChange({ ...condition, cityId: next.length === 1 ? next[0] : next })
              }}
            >
              {options.cities.find(([cityId]) => cityId === town)?.[1] ?? town}
            </button>
          ))}
        </span>
      )
    }
    case 'cashBelow':
      return <NumberBox label="Cash" width={90} testid={`${id}-amount`} value={condition.amount} onChange={(amount) => onChange({ ...condition, amount: amount ?? 1 })} />
    case 'debt':
      return (
        <>
          <SponsorPick value={condition.sponsorId} options={options} everybody="everybody" onChange={(sponsorId) => onChange(withSponsor(condition, sponsorId))} />
          <StatusToggles id={id} all={DEBT_STATUSES} chosen={[condition.status].flat()} onChange={(status) => onChange({ ...condition, status })} />
        </>
      )
    case 'hunted':
      return (
        <>
          <SponsorPick value={condition.sponsorId} options={options} onChange={(sponsorId) => onChange(withSponsor(condition, sponsorId))} />
          <Pick
            label="Are they"
            value={(condition.set ?? true) ? 'set' : 'unset'}
            options={[
              ['set', 'are here'],
              ['unset', 'are not here'],
            ]}
            onChange={(v) => {
              const next = { ...condition }
              if (v === 'set') delete next.set
              else next.set = false
              onChange(next)
            }}
          />
        </>
      )
    case 'challenge':
      return <StatusToggles id={id} all={CHALLENGE_STATUSES} chosen={[condition.status].flat()} onChange={(status) => onChange({ ...condition, status })} />
    case 'count':
      return (
        <>
          <Pick label="What" value={condition.of} options={COUNT_OF.map((c) => [c, c])} onChange={(of) => onChange(SPONSOR_COUNTS.includes(of as CountOf) ? { ...condition, of: of as CountOf } : withSponsor({ ...condition, of: of as CountOf }, undefined))} />
          {SPONSOR_COUNTS.includes(condition.of) && <SponsorPick value={condition.sponsorId} options={options} onChange={(sponsorId) => onChange(withSponsor(condition, sponsorId))} />}
          <span className="ed-muted ed-small">at least</span>
          <NumberBox label="At least" optional width={56} value={condition.atLeast} onChange={(atLeast) => onChange(withBound(condition, 'atLeast', atLeast))} />
          <span className="ed-muted ed-small">at most</span>
          <NumberBox label="At most" optional width={56} value={condition.atMost} onChange={(atMost) => onChange(withBound(condition, 'atMost', atMost))} />
        </>
      )
  }
}

/** A condition with its sponsor set, or the field gone rather than left undefined. */
function withSponsor<C extends { sponsorId?: string }>(condition: C, sponsorId: string | undefined): C {
  const next = { ...condition }
  if (sponsorId === undefined) delete next.sponsorId
  else next.sponsorId = sponsorId
  return next
}

function withBound<C extends { atLeast?: number; atMost?: number }>(condition: C, bound: 'atLeast' | 'atMost', value: number | undefined): C {
  const next = { ...condition }
  if (value === undefined) delete next[bound]
  else next[bound] = value
  return next
}

/** A speaker is a character id, a plain name, or nobody. */
function Speaker({ speaker, options, onChange, testid }: { speaker: string | undefined; options: Options; onChange: (s: string | undefined) => void; testid: string }) {
  const isCharacter = speaker !== undefined && CHARACTERS[speaker] !== undefined
  const mode = speaker === undefined ? '' : isCharacter ? speaker : '__name'
  return (
    <span className="ed-row" style={{ flex: '1 1 260px' }}>
      <Pick
        label="Speaker"
        testid={`${testid}-speaker`}
        value={mode}
        empty="nobody (a caption)"
        options={[...options.characters, ['__name', 'somebody else, by name…']]}
        onChange={(v) => onChange(v === '' ? undefined : v === '__name' ? 'Somebody' : v)}
      />
      {mode === '__name' && (
        <input
          className="ed-input"
          style={{ maxWidth: 180 }}
          aria-label="Speaker's name"
          data-testid={`${testid}-speaker-name`}
          value={speaker}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </span>
  )
}

function ActionFields({ action, index, options, onChange }: { action: EventAction; index: number; options: Options; onChange: (a: EventAction) => void }) {
  const id = `action-${index}`
  const at = (value: { col: number; row: number }, set: (col: number, row: number) => void) => (
    <>
      <span className="ed-muted ed-small">col</span>
      <NumberBox label="Column" width={56} testid={`${id}-col`} value={value.col} onChange={(col) => set(col ?? 0, value.row)} />
      <span className="ed-muted ed-small">row</span>
      <NumberBox label="Row" width={56} testid={`${id}-row`} value={value.row} onChange={(row) => set(value.col, row ?? 0)} />
    </>
  )
  switch (action.kind) {
    case 'dialogue':
      return (
        <div style={{ display: 'grid', gap: 6 }}>
          <Speaker
            speaker={action.speaker}
            options={options}
            testid={id}
            onChange={(speaker) => {
              const next = { ...action }
              if (speaker === undefined) delete next.speaker
              else next.speaker = speaker
              onChange(next)
            }}
          />
          <LineList testid={`${id}-lines`} lines={action.lines} placeholder="Name: what they say" onChange={(lines) => onChange({ ...action, lines })} />
        </div>
      )
    case 'moveNpc':
      return (
        <div className="ed-row">
          <Pick label="Who" testid={`${id}-character`} value={action.characterId} options={options.characters} onChange={(characterId) => onChange({ ...action, characterId })} />
          {at(action, (col, row) => onChange({ ...action, col, row }))}
        </div>
      )
    case 'teleport':
      return (
        <div className="ed-row">
          <Pick label="Where" testid={`${id}-area`} value={action.areaId} options={options.areas} onChange={(areaId) => onChange({ ...action, areaId })} />
          {at(action, (col, row) => onChange({ ...action, col, row }))}
        </div>
      )
    case 'wait':
      return (
        <div className="ed-row">
          <NumberBox label="Milliseconds" width={90} testid={`${id}-ms`} value={action.ms} onChange={(ms) => onChange({ ...action, ms: ms ?? 0 })} />
          <span className="ed-muted ed-small">ms</span>
        </div>
      )
    case 'setFlag':
    case 'clearFlag':
      return (
        <div className="ed-row">
          <Pick label="Flag" value={action.flag} options={STORY_FLAGS.map((f) => [f, f])} onChange={(flag) => onChange({ ...action, flag: flag as typeof action.flag })} />
        </div>
      )
    case 'giveItem':
      return (
        <div className="ed-row">
          <Pick label="Item" value={action.itemId} options={options.items} onChange={(itemId) => onChange({ ...action, itemId })} />
        </div>
      )
    case 'giveCash':
      return (
        <div className="ed-row">
          <span className="ed-muted ed-small">$</span>
          <NumberBox
            label="Amount (negative takes it away)"
            negative
            width={90}
            testid={`${id}-amount`}
            value={action.amount}
            onChange={(amount) => onChange({ ...action, amount: amount ?? 0 })}
          />
          <span className="ed-muted ed-small">negative takes it away</span>
        </div>
      )
    case 'unlockCity':
      return (
        <div className="ed-row">
          <Pick label="City" value={action.cityId} options={options.cities} onChange={(cityId) => onChange({ ...action, cityId })} />
        </div>
      )
    case 'unlockTable':
    case 'startTable':
      return (
        <div className="ed-row">
          <Pick label="Table" testid={`${id}-table`} value={action.tableId} options={options.tables} onChange={(tableId) => onChange({ ...action, tableId })} />
        </div>
      )
    case 'advancePeriod':
    case 'advanceDay': {
      const field = action.kind === 'advancePeriod' ? 'steps' : 'days'
      const value = action.kind === 'advancePeriod' ? action.steps : action.days
      return (
        <div className="ed-row">
          <NumberBox
            label={field}
            optional
            placeholder="1"
            value={value}
            onChange={(n) => {
              const next = { ...action } as Record<string, unknown>
              if (n === undefined || n === 1) delete next[field]
              else next[field] = n
              onChange(next as EventAction)
            }}
          />
          <span className="ed-muted ed-small">{field}</span>
        </div>
      )
    }
    case 'playSound':
      return (
        <div className="ed-row">
          <Pick label="Sound" value={action.sound} options={SOUNDS.map((s) => [s, s])} onChange={(sound) => onChange({ ...action, sound })} />
        </div>
      )
    case 'fade':
      return (
        <div className="ed-row">
          <Pick
            label="Fade"
            value={action.to}
            options={[
              ['out', 'to black'],
              ['in', 'back in'],
            ]}
            onChange={(to) => onChange({ ...action, to: to as 'out' | 'in' })}
          />
        </div>
      )
    case 'startPokerNight':
      return null
  }
}
