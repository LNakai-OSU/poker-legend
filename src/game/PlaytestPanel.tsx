import { useEffect, useMemo, useState } from 'react'
import { EVENTS, type GameEvent } from '../world/events'
import { CITIES } from '../world/cities'
import { TIME_PERIODS } from './time'
import { TOWN_ORDER, type CityId, type GameState } from './state'
import { cleanCash } from './playtest'
import { useKeyLayer } from './keys'

const INK = '#e8e8f0'
const DIM = '#8d93ab'
const GOLD = '#f0d27a'

const button: React.CSSProperties = {
  minHeight: 36,
  padding: '0 12px',
  borderRadius: 6,
  border: '1px solid #4a4a66',
  background: '#10101a',
  color: INK,
  fontFamily: 'monospace',
  fontSize: 13,
  cursor: 'pointer',
}

const MONEY_PRESETS = [0, 50, 100, 500, 1_000, 5_000, 25_000, 100_000, 1_000_000]

/**
 * Playtest tools: set the money and the clock, jump to any town's checkpoint,
 * and play any scripted scene on demand. Laid over the game like the world map;
 * only the playtest account is ever offered it (see `playtest.ts`).
 */
export function PlaytestPanel({
  state,
  setState,
  onCheckpoint,
  onPlayEvent,
  onWorldMap,
  onClose,
}: {
  state: GameState
  setState: (update: (s: GameState) => GameState) => void
  onCheckpoint: (cityId: CityId) => void
  onPlayEvent: (event: GameEvent) => void
  onWorldMap: () => void
  onClose: () => void
}) {
  const isTop = useKeyLayer(true, 6)
  const [cashText, setCashText] = useState(String(state.cash))
  const [filter, setFilter] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isTop()) {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isTop, onClose])

  const setCash = (n: number) => {
    const cash = cleanCash(n)
    setCashText(String(cash))
    setState((s) => ({ ...s, cash }))
  }

  const events = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return EVENTS.filter((e) => !q || e.id.toLowerCase().includes(q) || e.about.toLowerCase().includes(q))
  }, [filter])

  const section = (title: string) => (
    <h3 style={{ margin: '18px 0 8px', color: GOLD, fontSize: 14 }}>{title}</h3>
  )

  return (
    <div
      data-testid="playtest-panel"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 260,
        background: 'rgba(5,6,12,0.97)',
        color: INK,
        fontFamily: 'monospace',
        overflowY: 'auto',
        padding: 'max(16px, env(safe-area-inset-top)) 16px 32px',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, color: GOLD, fontSize: 18 }}>Playtest tools</h2>
          <button type="button" data-testid="playtest-close" style={button} onClick={onClose}>
            Close ✕
          </button>
        </div>
        <p style={{ color: DIM, fontSize: 12 }}>
          Day {state.day}, {state.period}. In {state.cityId} / {state.areaId ?? 'start'}. Changes save with the run.
        </p>

        {section('Money')}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setCash(Number(cashText.replace(/[^0-9.]/g, '')))
          }}
          style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
        >
          <input
            data-testid="playtest-cash"
            aria-label="Cash"
            inputMode="numeric"
            value={cashText}
            onChange={(e) => setCashText(e.target.value)}
            style={{ ...button, width: 140, cursor: 'text' }}
          />
          <button type="submit" data-testid="playtest-cash-set" style={button}>
            Set cash
          </button>
        </form>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
          {MONEY_PRESETS.map((n) => (
            <button key={n} type="button" style={button} onClick={() => setCash(n)}>
              ${n.toLocaleString()}
            </button>
          ))}
          <button type="button" style={button} onClick={() => setCash(state.cash + 1000)}>
            +$1,000
          </button>
          <button type="button" style={button} onClick={() => setCash(state.cash * 2)}>
            ×2
          </button>
        </div>

        {section('Time')}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" style={button} onClick={() => setState((s) => ({ ...s, day: Math.max(1, s.day - 1) }))}>
            Day −
          </button>
          <span data-testid="playtest-day">Day {state.day}</span>
          <button type="button" style={button} onClick={() => setState((s) => ({ ...s, day: s.day + 1 }))}>
            Day +
          </button>
          {TIME_PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              style={{ ...button, borderColor: state.period === p ? GOLD : '#4a4a66' }}
              onClick={() => setState((s) => ({ ...s, period: p }))}
            >
              {p}
            </button>
          ))}
        </div>

        {section('Checkpoints: arrive in a town as if you had played to it')}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {TOWN_ORDER.map((id) => (
            <button key={id} type="button" data-testid={`checkpoint-${id}`} style={button} onClick={() => onCheckpoint(id)}>
              {CITIES[id].name}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
          <button type="button" data-testid="playtest-world-map" style={button} onClick={onWorldMap}>
            World map: click any place to go there
          </button>
        </div>

        {section(`Scenes (${events.length} of ${EVENTS.length}): play one now`)}
        <input
          aria-label="Filter scenes"
          placeholder="Filter by id or description"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ ...button, width: '100%', boxSizing: 'border-box', cursor: 'text' }}
        />
        <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
          {events.map((event) => {
            const done = state.completedEventIds.includes(event.id)
            return (
              <div
                key={event.id}
                data-testid={`scene-${event.id}`}
                style={{ display: 'flex', gap: 8, alignItems: 'center', border: '1px solid #2c3352', borderRadius: 6, padding: 8 }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: done ? DIM : INK, fontSize: 13 }}>
                    {event.id} {done && <span style={{ color: DIM }}>(done)</span>}
                  </div>
                  <div style={{ color: DIM, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {event.about}
                  </div>
                </div>
                {done && (
                  <button
                    type="button"
                    style={button}
                    onClick={() => setState((s) => ({ ...s, completedEventIds: s.completedEventIds.filter((x) => x !== event.id) }))}
                  >
                    Reset
                  </button>
                )}
                <button type="button" data-testid={`play-${event.id}`} style={{ ...button, borderColor: GOLD, color: GOLD }} onClick={() => onPlayEvent(event)}>
                  Play
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
