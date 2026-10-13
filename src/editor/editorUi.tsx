import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { EDITOR_CSS } from './editorStyle'

/**
 * The small controls the character and event tabs are built from.
 *
 * Every list of lines in the game — what somebody says at a table, what they
 * say in the street at six o'clock, what a text box shows — is edited with the
 * same control, so learning one teaches all of them.
 */

export type Tab = 'maps' | 'characters' | 'events'

const TABS: Array<[Tab, string]> = [
  ['maps', 'Maps'],
  ['characters', 'Characters'],
  ['events', 'Events'],
]

export function EditorStyles() {
  return <style>{EDITOR_CSS}</style>
}

/** Maps, Characters, Events — reached by hash so a reload keeps your place. */
export function EditorTabs({ tab }: { tab: Tab }) {
  return (
    <nav className="ed-tabs" role="tablist" aria-label="What to edit">
      {TABS.map(([id, label]) => (
        <button
          key={id}
          type="button"
          role="tab"
          className="ed-tab"
          data-testid={`tab-${id}`}
          aria-selected={tab === id}
          onClick={() => (window.location.hash = id === 'maps' ? '#editor' : `#editor/${id}`)}
        >
          {label}
        </button>
      ))}
    </nav>
  )
}

/**
 * The scrolling list down the side, which keeps whatever is selected in view —
 * arriving at `#editor/characters/vance` should show Vance highlighted, not
 * Gus at the top of a list with Vance somewhere below it.
 *
 * Scrolls only the list itself, never the page around it.
 */
export function SideList({ selected, testid, children }: { selected: string; testid: string; children: ReactNode }) {
  const list = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = list.current
    const item = el?.querySelector<HTMLElement>('[aria-selected="true"]')
    if (!el || !item) return
    const top = item.offsetTop - el.offsetTop
    if (top < el.scrollTop || top + item.offsetHeight > el.scrollTop + el.clientHeight) {
      el.scrollTop = Math.max(0, top - el.clientHeight / 3)
    }
  }, [selected])
  return (
    <div className="ed-list-items" data-testid={testid} ref={list}>
      {children}
    </div>
  )
}

export function Section({
  title,
  hint,
  extra,
  testid,
  children,
}: {
  title: string
  hint?: ReactNode
  extra?: ReactNode
  testid?: string
  children: ReactNode
}) {
  return (
    <section className="ed-section" data-testid={testid}>
      <header>
        <h3>{title}</h3>
        {hint && <span className="hint">{hint}</span>}
        <span className="grow" />
        {extra}
      </header>
      {children}
    </section>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="ed-field">
      <span>{label}</span>
      {children}
    </label>
  )
}

/**
 * A list of lines: each one editable, removable, and one more on the end.
 *
 * An empty box is still a line — it shows as a problem until it says
 * something, rather than vanishing while you are halfway through typing it.
 */
export function LineList({
  lines,
  onChange,
  testid,
  placeholder,
  addLabel = '+ line',
}: {
  lines: string[]
  onChange: (lines: string[]) => void
  testid: string
  placeholder?: string
  addLabel?: string
}) {
  return (
    <div className="ed-lines" data-testid={testid}>
      {lines.map((line, i) => (
        <div className="ed-line" key={i}>
          <LineBox
            value={line}
            placeholder={placeholder}
            testid={`${testid}-${i}`}
            onChange={(text) => onChange(lines.map((l, j) => (j === i ? text : l)))}
          />
          <button
            type="button"
            className="ed-btn icon danger"
            title="Remove this line"
            aria-label="Remove this line"
            data-testid={`${testid}-remove-${i}`}
            onClick={() => onChange(lines.filter((_, j) => j !== i))}
          >
            ×
          </button>
        </div>
      ))}
      <div>
        <button type="button" className="ed-btn small" data-testid={`${testid}-add`} onClick={() => onChange([...lines, ''])}>
          {addLabel}
        </button>
      </div>
    </div>
  )
}

/**
 * One line of dialogue: wraps rather than scrolls, so a long line can be read
 * whole, and grows to fit it. Enter does nothing — a line is one line; the
 * next one is "+ line".
 */
function LineBox({
  value,
  onChange,
  placeholder,
  testid,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  testid: string
}) {
  const box = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight + 2}px`
  }, [value])
  return (
    <textarea
      ref={box}
      className="ed-input line"
      rows={1}
      value={value}
      placeholder={placeholder}
      data-testid={testid}
      onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
      onChange={(e) => onChange(e.target.value.replace(/\n/g, ' '))}
    />
  )
}

/**
 * A dropdown of real ids.
 *
 * A value that is not among the options — an id somebody typed by hand that
 * does not exist — is still shown, marked, rather than silently replaced by the
 * first option; the problem list says what is wrong with it.
 */
export function Pick({
  value,
  options,
  onChange,
  testid,
  label,
  empty,
}: {
  value: string
  options: Array<[string, string]>
  onChange: (value: string) => void
  testid?: string
  label?: string
  /** Offer a blank choice with this text. */
  empty?: string
}) {
  const known = options.some(([id]) => id === value) || (empty !== undefined && value === '')
  return (
    <select className="ed-select" value={value} aria-label={label} data-testid={testid} onChange={(e) => onChange(e.target.value)}>
      {empty !== undefined && <option value="">{empty}</option>}
      {!known && <option value={value}>{value} (does not exist)</option>}
      {options.map(([id, text]) => (
        <option key={id} value={id}>
          {text}
        </option>
      ))}
    </select>
  )
}

/**
 * A whole number.
 *
 * Holds what you are typing until it is a number, so "-" on the way to "-20"
 * is not thrown away (a `type="number"` box reports it as nothing at all).
 * Blank means "not set" when `optional`; otherwise the last good number stands.
 */
export function NumberBox({
  value,
  onChange,
  testid,
  label,
  placeholder,
  optional = false,
  negative = false,
  width = 64,
}: {
  value: number | undefined
  onChange: (value: number | undefined) => void
  testid?: string
  label: string
  placeholder?: string
  optional?: boolean
  /** Allows a minus sign, and asks a phone for a keyboard that has one. */
  negative?: boolean
  width?: number
}) {
  const [typing, setTyping] = useState<string | null>(null)
  return (
    <input
      className="ed-input num"
      type="text"
      inputMode={negative ? 'text' : 'numeric'}
      aria-label={label}
      title={label}
      style={{ width }}
      data-testid={testid}
      placeholder={placeholder}
      value={typing ?? (value === undefined ? '' : String(value))}
      onFocus={() => setTyping(value === undefined ? '' : String(value))}
      onBlur={() => setTyping(null)}
      onChange={(e) => {
        const text = e.target.value.replace(negative ? /[^0-9-]/g : /[^0-9]/g, '')
        setTyping(text)
        if (text === '') {
          if (optional) onChange(undefined)
          return
        }
        const n = Number(text)
        if (Number.isInteger(n)) onChange(n)
      }}
    />
  )
}

export function ProblemList({ problems, ok, testid }: { problems: string[]; ok: string; testid: string }) {
  return (
    <ul className="ed-problems" data-testid={testid}>
      {problems.length === 0 && <li className="ok">{ok}</li>}
      {problems.map((problem, i) => (
        <li key={`${i}-${problem}`}>{problem}</li>
      ))}
    </ul>
  )
}

/** Up, down and remove, for one entry of an ordered list. */
export function Reorder({
  index,
  count,
  onMove,
  onRemove,
  testid,
  what,
}: {
  index: number
  count: number
  onMove: (to: number) => void
  onRemove: () => void
  testid: string
  what: string
}) {
  return (
    <span className="ed-row" style={{ gap: 3, flexWrap: 'nowrap' }}>
      <button
        type="button"
        className="ed-btn icon"
        disabled={index === 0}
        title={`Move this ${what} earlier`}
        aria-label={`Move this ${what} earlier`}
        data-testid={`${testid}-up`}
        onClick={() => onMove(index - 1)}
      >
        ↑
      </button>
      <button
        type="button"
        className="ed-btn icon"
        disabled={index === count - 1}
        title={`Move this ${what} later`}
        aria-label={`Move this ${what} later`}
        data-testid={`${testid}-down`}
        onClick={() => onMove(index + 1)}
      >
        ↓
      </button>
      <button
        type="button"
        className="ed-btn icon danger"
        title={`Remove this ${what}`}
        aria-label={`Remove this ${what}`}
        data-testid={`${testid}-remove`}
        onClick={onRemove}
      >
        ×
      </button>
    </span>
  )
}
