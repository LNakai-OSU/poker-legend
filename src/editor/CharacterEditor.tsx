import { useMemo, useState } from 'react'
import { CHARACTERS, periodsAway, type CharacterDef, type TableLines } from '../world/characters'
import { EVENTS } from '../world/events'
import { AREAS, TABLES } from '../world/content'
import { avatarDataUrl } from '../game/avatars'
import type { Archetype, SkillTier } from '../engine/types'
import { TIME_PERIODS } from '../game/time'
import {
  ACCESSORIES,
  ARCHETYPES,
  HAIR_STYLES,
  SKILL_TIERS,
  TABLE_LINE_HELP,
  TABLE_LINE_KINDS,
  blankCharacter,
  canonicalCharacter,
  characterIdFrom,
} from './contentModel'
import { characterProblems, gameWorld } from './contentRules'
import { areaOptions, clone, lastSave, saveEntry, type SaveResult } from './editorData'
import { EditorTabs, Field, LineList, NumberBox, Pick, ProblemList, Section, SideList } from './editorUi'
import { sameValue } from './literal'

/**
 * Everybody in the game, and everything about them, without opening a file.
 *
 * A character is one entry in `characters.ts`: their face, the line under their
 * name, what they say at a table, the other rooms they are somebody slightly
 * different in, and where they stand at each hour. This edits that entry and
 * writes it back, checked against the same rules the content tests enforce.
 *
 * Edits to several people are kept side by side until saved, so looking at
 * somebody else does not throw away what you were doing.
 */

type Lines = Partial<TableLines>

const SCHEDULE_HOME = 'basin'

export function CharacterEditor({ selected, onClose }: { selected: string | null; onClose: () => void }) {
  const world = useMemo(() => gameWorld(), [])
  const [drafts, setDrafts] = useState<Record<string, CharacterDef>>({})
  /** What a save wrote, standing in for the source until Vite reloads it. */
  const [saved, setSaved] = useState<Record<string, CharacterDef>>({})
  const [query, setQuery] = useState('')
  const [naming, setNaming] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [results, setResults] = useState<Record<string, SaveResult>>({})

  const baseline = (id: string): CharacterDef | undefined => saved[id] ?? CHARACTERS[id]
  const ids = [...Object.keys(CHARACTERS), ...Object.keys(drafts).filter((id) => !CHARACTERS[id] && !saved[id]), ...Object.keys(saved).filter((id) => !CHARACTERS[id])]
  const id = selected && (baseline(selected) || drafts[selected]) ? selected : ids[0]
  const isNew = !baseline(id)
  const character = drafts[id] ?? clone(baseline(id)!)
  const dirty = (who: string) => drafts[who] !== undefined && (!baseline(who) || !sameValue(drafts[who], baseline(who)))
  const result = results[id] ?? lastSave('character', id)

  const select = (who: string) => (window.location.hash = `#editor/characters/${encodeURIComponent(who)}`)

  /** Changes the selected character's draft. */
  const edit = (change: (c: CharacterDef) => void) => {
    setDrafts((all) => {
      const next = clone(all[id] ?? baseline(id)!)
      change(next)
      return { ...all, [id]: next }
    })
    setResults((all) => {
      const rest = { ...all }
      delete rest[id]
      return rest
    })
  }

  const problems = characterProblems(id, character, world)
  if (isNew && !/^[a-z][A-Za-z0-9]*$/.test(id)) problems.unshift(`"${id}" is not a character id`)

  const save = async () => {
    setSaving(true)
    const after = canonicalCharacter(character)
    const outcome = await saveEntry('character', { id, before: isNew ? undefined : baseline(id), after })
    setSaving(false)
    setResults((all) => ({ ...all, [id]: outcome }))
    if (outcome.ok) {
      setSaved((all) => ({ ...all, [id]: after }))
      setDrafts((all) => {
        const rest = { ...all }
        delete rest[id]
        return rest
      })
    }
  }

  const revert = () => {
    setDrafts((all) => {
      const rest = { ...all }
      delete rest[id]
      return rest
    })
    setResults({})
  }

  const create = (name: string) => {
    const base = characterIdFrom(name) || 'someone'
    let newId = base
    for (let n = 2; baseline(newId) || drafts[newId]; n++) newId = `${base}${n}`
    setDrafts((all) => ({ ...all, [newId]: blankCharacter(name.trim()) }))
    setNaming(null)
    select(newId)
  }

  const needle = query.trim().toLowerCase()
  const shown = ids.filter((who) => {
    if (!needle) return true
    const c = drafts[who] ?? baseline(who)
    return [who, c?.name, c?.style].some((text) => text?.toLowerCase().includes(needle))
  })

  const seatedAt = Object.values(TABLES).flatMap((table) =>
    table.opponents
      .filter((ref) => (typeof ref === 'string' ? ref : ref.character) === id)
      .map((ref) => ({ table, persona: typeof ref === 'string' ? undefined : ref.persona })),
  )
  const inEvents = EVENTS.filter(
    (e) =>
      (e.trigger.kind === 'talkTo' && e.trigger.characterId === id) ||
      e.actions.some((a) => (a.kind === 'dialogue' && a.speaker === id) || (a.kind === 'moveNpc' && a.characterId === id)),
  )
  const canSave = dirty(id) && problems.length === 0 && !saving

  return (
    <div className="ed-page" data-testid="character-editor">
      <header className="ed-bar">
        <EditorTabs tab="characters" />
        <span className="ed-muted ed-small ed-count-label">{Object.keys(CHARACTERS).length} people</span>
        <span style={{ flex: 1 }} />
        <span className="ed-small" data-testid="character-problem-count" style={{ color: problems.length ? '#e05a5a' : '#3a9d5c' }}>
          {problems.length === 0 ? 'no problems' : `${problems.length} problem${problems.length === 1 ? '' : 's'}`}
        </span>
        <button
          type="button"
          className="ed-btn primary"
          data-testid="save-character"
          disabled={!canSave}
          title={problems.length > 0 ? 'Fix the problems first: saving would break a content test' : undefined}
          onClick={save}
        >
          {saving ? 'Saving…' : isNew ? 'Create' : 'Save'}
        </button>
        <button type="button" className="ed-btn" data-testid="revert-character" disabled={!dirty(id)} onClick={revert}>
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
              placeholder="Search people…"
              aria-label="Search people"
              data-testid="character-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="button" className="ed-btn" data-testid="new-character" onClick={() => setNaming(naming === null ? '' : null)}>
              + New
            </button>
          </div>
          {naming !== null && (
            <form
              className="ed-row"
              style={{ flexWrap: 'nowrap' }}
              onSubmit={(e) => {
                e.preventDefault()
                if (naming.trim()) create(naming)
              }}
            >
              <input
                className="ed-input"
                autoFocus
                placeholder="Their name"
                aria-label="New character's name"
                data-testid="new-character-name"
                value={naming}
                onChange={(e) => setNaming(e.target.value)}
              />
              <button type="submit" className="ed-btn primary" data-testid="new-character-create" disabled={!naming.trim()}>
                Add
              </button>
            </form>
          )}
          <SideList selected={id} testid="character-list">
            {shown.map((who) => {
              const c = drafts[who] ?? baseline(who)!
              return (
                <button
                  key={who}
                  type="button"
                  className="ed-item"
                  aria-selected={who === id}
                  data-testid={`character-${who}`}
                  onClick={() => select(who)}
                >
                  <img src={avatarDataUrl(c.look)} alt="" width={30} height={30} className="ed-avatar" style={{ borderRadius: 5 }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    {c.name || who}
                    <span className="sub">
                      {who} · {c.seat ? `${c.seat.skillTier}${c.seat.archetype ? ` ${c.seat.archetype}` : ''}` : 'does not play'}
                      {c.overworld ? ' · in town' : ''}
                    </span>
                  </span>
                  {dirty(who) && <span className="ed-dot" title="Unsaved changes" style={{ background: '#f2c14e' }} />}
                </button>
              )
            })}
            {shown.length === 0 && <span className="ed-muted ed-small">Nobody matches “{query}”.</span>}
          </SideList>
        </aside>

        <main className="ed-detail" data-testid="character-detail" data-character={id}>
          <Section
            title="Checks"
            hint="the content tests' rules, applied as you type"
            testid="character-checks"
          >
            <ProblemList testid="character-problems" problems={problems} ok="Nothing wrong. Saving will not break a content test." />
            {result && (
              <p className="ed-result" data-testid="character-save-result" style={{ color: result.ok ? '#3a9d5c' : '#e05a5a', margin: '8px 0 0' }}>
                {result.ok ? 'Written to characters.ts — ' : 'Not saved — '}
                {result.text}
                {result.problems && `: ${result.problems.join('; ')}`}
              </p>
            )}
          </Section>

          <Section title={isNew ? 'New character' : 'Who they are'} hint={<code>{id}</code>}>
            <div className="ed-row" style={{ alignItems: 'flex-start', gap: 14, flexWrap: 'nowrap' }}>
              <img src={avatarDataUrl(character.look)} alt={`${character.name}'s face`} width={72} height={72} className="ed-avatar" data-testid="character-avatar" />
              <div style={{ display: 'grid', gap: 8, flex: 1, minWidth: 0 }}>
                <Field label="Name">
                  <input className="ed-input" data-testid="character-name" value={character.name} onChange={(e) => edit((c) => void (c.name = e.target.value))} />
                </Field>
                <Field label="The line under their name at a table">
                  <input className="ed-input" data-testid="character-style" value={character.style} onChange={(e) => edit((c) => void (c.style = e.target.value))} />
                </Field>
              </div>
            </div>
            <div className="ed-colors" style={{ marginTop: 10 }}>
              {(['skin', 'hair', 'shirt'] as const).map((part) => (
                <label key={part}>
                  {part}
                  <input type="color" value={character.look[part]} data-testid={`look-${part}`} onChange={(e) => edit((c) => void (c.look[part] = e.target.value))} />
                </label>
              ))}
              <Pick label="Hair" value={character.look.hairStyle} options={HAIR_STYLES.map((h) => [h, `${h} hair`])} onChange={(v) => edit((c) => void (c.look.hairStyle = v as typeof c.look.hairStyle))} />
              <Pick label="Accessory" value={character.look.accessory} options={ACCESSORIES.map((a) => [a, a === 'none' ? 'no accessory' : a])} onChange={(v) => edit((c) => void (c.look.accessory = v as typeof c.look.accessory))} />
            </div>
          </Section>

          <Section
            title="At a table"
            hint={character.seat ? 'how they play' : 'never sits down'}
            extra={
              <label className="ed-toggle">
                <input
                  type="checkbox"
                  data-testid="character-plays"
                  checked={!!character.seat}
                  onChange={(e) => edit((c) => void (e.target.checked ? (c.seat = { skillTier: 'amateur', archetype: 'regular' }) : delete c.seat))}
                />
                plays
              </label>
            }
          >
            {character.seat && (
              <div className="ed-row">
                <Pick label="Skill tier" testid="seat-tier" value={character.seat.skillTier} options={SKILL_TIERS.map((t) => [t, t])} onChange={(v) => edit((c) => void (c.seat!.skillTier = v as SkillTier))} />
                <Pick
                  label="Archetype"
                  testid="seat-archetype"
                  value={character.seat.archetype ?? ''}
                  empty="no archetype"
                  options={ARCHETYPES.map((a) => [a, a])}
                  onChange={(v) => edit((c) => void (v ? (c.seat!.archetype = v as Archetype) : delete c.seat!.archetype))}
                />
                <span className="ed-muted ed-small">stack ×</span>
                <NumberBox
                  label="Stack multiplier (whales sit down deeper)"
                  optional
                  placeholder="1"
                  value={character.seat.stackMultiplier}
                  onChange={(v) => edit((c) => void (v ? (c.seat!.stackMultiplier = v) : delete c.seat!.stackMultiplier))}
                />
              </div>
            )}
            <div className="ed-row" style={{ marginTop: character.seat ? 8 : 0 }}>
              <span className="ed-muted ed-small">Seated at:</span>
              {seatedAt.length === 0 && <span className="ed-muted ed-small">no table</span>}
              {seatedAt.map(({ table, persona }) => (
                <span className="ed-chip" key={`${table.id}-${persona ?? ''}`}>
                  {table.name}
                  {persona ? ` as ${persona}` : ''}
                </span>
              ))}
            </div>
          </Section>

          <Section title="What they say at a table" hint="a kind with no lines uses everyone's defaults" testid="table-lines">
            <div className="ed-grid">
              {TABLE_LINE_KINDS.map((kind) => (
                <Field key={kind} label={`${kind} — ${TABLE_LINE_HELP[kind]}${character.lines[kind] ? '' : ' (default)'}`}>
                  <LineList
                    testid={`lines-${kind}`}
                    lines={character.lines[kind] ?? []}
                    placeholder={`${character.name || 'They'}: …`}
                    onChange={(lines) => edit((c) => setLines(c.lines, kind, lines))}
                  />
                </Field>
              ))}
            </div>
          </Section>

          <Personas character={character} edit={edit} />

          <Overworld character={character} edit={edit} />

          {inEvents.length > 0 && (
            <Section title="In events">
              <div className="ed-row">
                {inEvents.map((e) => (
                  <a key={e.id} className="ed-chip" href={`#editor/events/${e.id}`} style={{ color: '#e8e8f0', textDecoration: 'none' }}>
                    {e.id}
                  </a>
                ))}
              </div>
            </Section>
          )}
          <p className="ed-muted ed-small" style={{ margin: 0 }}>
            Saving edits <code>src/world/characters.ts</code> directly, changing only what you changed — comments
            and layout elsewhere in the entry are kept. Git is the undo.
          </p>
        </main>
      </div>
    </div>
  )
}

/** Sets one kind of line, removing the kind altogether when its list is emptied. */
function setLines(lines: Lines, kind: keyof TableLines, list: string[]) {
  if (list.length === 0) delete lines[kind]
  else lines[kind] = list
}

type Edit = (change: (c: CharacterDef) => void) => void

function Personas({ character, edit }: { character: CharacterDef; edit: Edit }) {
  const [adding, setAdding] = useState('')
  const personas = Object.entries(character.personas ?? {})
  const addPersona = () => {
    const name = adding.trim()
    if (!name) return
    edit((c) => void (c.personas = { ...c.personas, [name]: {} }))
    setAdding('')
  }
  return (
    <Section
      title="Personas"
      hint="the same person in another room — only what changes is written"
      testid="personas"
    >
      <div style={{ display: 'grid', gap: 8 }}>
        {personas.length === 0 && <span className="ed-muted ed-small">None. They are the same everywhere.</span>}
        {personas.map(([name, persona]) => {
          const overridden = TABLE_LINE_KINDS.filter((kind) => persona.lines?.[kind] !== undefined)
          const free = TABLE_LINE_KINDS.filter((kind) => persona.lines?.[kind] === undefined)
          const update = (change: (p: NonNullable<CharacterDef['personas']>[string]) => void) =>
            edit((c) => {
              const p = c.personas![name]
              change(p)
              if (p.lines && Object.keys(p.lines).length === 0) delete p.lines
            })
          return (
            <div className="ed-card" key={name} data-testid={`persona-${name}`}>
              <div className="head">
                <strong>{name}</strong>
                <span className="say">{persona.style ?? `${character.style} (their usual style)`}</span>
                <button
                  type="button"
                  className="ed-btn icon danger"
                  title="Remove this persona"
                  aria-label={`Remove the ${name} persona`}
                  onClick={() =>
                    edit((c) => {
                      delete c.personas![name]
                      if (Object.keys(c.personas!).length === 0) delete c.personas
                    })
                  }
                >
                  ×
                </button>
              </div>
              <Field label="Style here (blank: their usual one)">
                <input
                  className="ed-input"
                  data-testid={`persona-${name}-style`}
                  value={persona.style ?? ''}
                  placeholder={character.style}
                  onChange={(e) => update((p) => void (e.target.value ? (p.style = e.target.value) : delete p.style))}
                />
              </Field>
              <div className="ed-grid">
                {overridden.map((kind) => (
                  <Field key={kind} label={`${kind} — ${TABLE_LINE_HELP[kind]}`}>
                    <LineList
                      testid={`persona-${name}-${kind}`}
                      lines={persona.lines?.[kind] ?? []}
                      onChange={(lines) => update((p) => setLines((p.lines ??= {}), kind, lines))}
                    />
                  </Field>
                ))}
              </div>
              {free.length > 0 && (
                <div className="ed-row">
                  <Pick
                    label="Say something different when…"
                    value=""
                    empty="+ say something different when…"
                    options={free.map((kind) => [kind, `${kind} — ${TABLE_LINE_HELP[kind]}`])}
                    onChange={(kind) => kind && update((p) => void ((p.lines ??= {})[kind as keyof TableLines] = ['']))}
                  />
                </div>
              )}
            </div>
          )
        })}
        <form
          className="ed-row"
          onSubmit={(e) => {
            e.preventDefault()
            addPersona()
          }}
        >
          <input
            className="ed-input"
            style={{ maxWidth: 220 }}
            placeholder="new persona, e.g. headsUp"
            aria-label="New persona name"
            data-testid="new-persona"
            value={adding}
            onChange={(e) => setAdding(e.target.value.replace(/[^A-Za-z0-9]/g, ''))}
          />
          <button type="submit" className="ed-btn small" disabled={!adding.trim() || !!character.personas?.[adding.trim()]}>
            + persona
          </button>
        </form>
      </div>
    </Section>
  )
}

function Overworld({ character, edit }: { character: CharacterDef; edit: Edit }) {
  const presence = character.overworld
  const areas = useMemo(() => areaOptions(), [])
  const away = presence ? periodsAway(character) : []
  return (
    <Section
      title="In the town"
      hint={presence ? 'where they are through the day' : 'only ever at a table'}
      testid="overworld"
      extra={
        <label className="ed-toggle">
          <input
            type="checkbox"
            data-testid="character-in-town"
            checked={!!presence}
            onChange={(e) =>
              edit((c) => {
                if (!e.target.checked) delete c.overworld
                else {
                  c.overworld = {
                    lines: [`${c.name}: Hello.`],
                    schedule: [{ period: 'morning', areaId: AREAS[SCHEDULE_HOME] ? SCHEDULE_HOME : areas[0][0], col: 1, row: 1 }],
                  }
                }
              })
            }
          />
          out in the town
        </label>
      }
    >
      {presence && (
        <div style={{ display: 'grid', gap: 10 }}>
          <Field label="What they say when the hour has nothing more specific">
            <LineList testid="overworld-lines" lines={presence.lines} onChange={(lines) => edit((c) => void (c.overworld!.lines = lines))} />
          </Field>
          <div style={{ display: 'grid', gap: 6 }} data-testid="schedule">
            {presence.schedule.map((entry, i) => (
              <div className="ed-card" key={i} data-testid={`schedule-${i}`}>
                <div className="head">
                  <Pick
                    label="When"
                    testid={`schedule-${i}-period`}
                    value={entry.period}
                    options={TIME_PERIODS.map((p) => [p, p])}
                    onChange={(v) => edit((c) => void (c.overworld!.schedule[i].period = v as typeof entry.period))}
                  />
                  <Pick
                    label="Where"
                    testid={`schedule-${i}-area`}
                    value={entry.areaId}
                    options={areas}
                    onChange={(v) => edit((c) => void (c.overworld!.schedule[i].areaId = v))}
                  />
                  <span className="ed-muted ed-small">col</span>
                  <NumberBox
                    label="Column"
                    testid={`schedule-${i}-col`}
                    width={56}
                    value={entry.col}
                    onChange={(v) => edit((c) => void (c.overworld!.schedule[i].col = v ?? 0))}
                  />
                  <span className="ed-muted ed-small">row</span>
                  <NumberBox
                    label="Row"
                    testid={`schedule-${i}-row`}
                    width={56}
                    value={entry.row}
                    onChange={(v) => edit((c) => void (c.overworld!.schedule[i].row = v ?? 0))}
                  />
                  <span style={{ flex: 1 }} />
                  <button
                    type="button"
                    className="ed-btn icon danger"
                    title="Remove this hour"
                    aria-label="Remove this hour"
                    data-testid={`schedule-${i}-remove`}
                    onClick={() => edit((c) => void c.overworld!.schedule.splice(i, 1))}
                  >
                    ×
                  </button>
                </div>
                {entry.lines ? (
                  <LineList
                    testid={`schedule-${i}-lines`}
                    lines={entry.lines}
                    onChange={(lines) =>
                      edit((c) => void (lines.length ? (c.overworld!.schedule[i].lines = lines) : delete c.overworld!.schedule[i].lines))
                    }
                  />
                ) : (
                  <div className="ed-row">
                    <span className="ed-muted ed-small">Says their usual lines here.</span>
                    <button
                      type="button"
                      className="ed-btn small"
                      data-testid={`schedule-${i}-own-lines`}
                      onClick={() => edit((c) => void (c.overworld!.schedule[i].lines = ['']))}
                    >
                      + lines for this hour
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="ed-row">
            <button
              type="button"
              className="ed-btn small"
              data-testid="schedule-add"
              onClick={() =>
                edit((c) => {
                  const last = c.overworld!.schedule.at(-1)
                  const period = periodsAway(c)[0] ?? 'morning'
                  c.overworld!.schedule.push({
                    period,
                    areaId: last?.areaId ?? (AREAS[SCHEDULE_HOME] ? SCHEDULE_HOME : areas[0][0]),
                    col: last?.col ?? 1,
                    row: last?.row ?? 1,
                  })
                })
              }
            >
              + another hour
            </button>
            {away.length > 0 && <span className="ed-muted ed-small">Nowhere in the {away.join(', ')}.</span>}
          </div>
        </div>
      )}
    </Section>
  )
}
