import { useMemo, useState } from 'react'
import type { ReelLine } from '../world/events'
import { CHARACTERS } from '../world/characters'
import { ROUTE } from '../world/route'
import { DialogueBox } from './DialogueBox'
import { TYPE, UI_FONT } from './pixel/webFont'

/**
 * Marcus's plan, as a map: home, then the five casino towns, then Porto Lumina,
 * joined by the one road. Nothing but home is drawn at first. A line that names
 * a `stop` draws the road out to it and drops a pin there, and a card under the
 * map says what that stop asks — the casino, the win that opens the boss's door,
 * the boss, the bankroll that gets the bus to take you. The data is `ROUTE`, so
 * the map cannot disagree with the goals. Each line waits for a press.
 */

const W = 320
const H = 130
/** Where each stop is pinned on the map, home first. */
const PINS: Array<[number, number]> = [
  [26, 100],
  [70, 70],
  [112, 98],
  [160, 54],
  [206, 90],
  [236, 54],
  [292, 22],
]
const STEP_MS = 900
const GOLD = '#f0d27a'
const INK = '#e8e8f0'
const DIM = '#8d93ab'

const money = (n: number) => `$${n.toLocaleString('en-US')}`

export function RoutePanel({ lines, onDone }: { lines: ReelLine[]; onDone: () => void }) {
  const [at, setAt] = useState(0)
  const line = lines[at]
  // Drawn as far as any line so far has asked: the road never un-draws.
  const reached = useMemo(() => lines.slice(0, at + 1).reduce((far, l) => Math.max(far, l.stop ?? 0), 0), [lines, at])
  // The stop the line in front of you is about; between stops, the last one named.
  const focus = Math.min(reached, ROUTE.length - 1)
  const stop = ROUTE[focus]

  if (!line) return null
  const speaker = CHARACTERS[line.who]?.name ?? line.who
  const text = line.text.startsWith(`${speaker}: `) ? line.text.slice(speaker.length + 2) : line.text
  const next = () => (at + 1 < lines.length ? setAt(at + 1) : onDone())

  const road = PINS.map(([x, y], i) => ({ x, y, i }))
  return (
    <div
      data-testid="route-panel"
      data-reached={reached}
      style={{ width: 'min(96vw, 760px)', padding: '48px 0 0', fontFamily: UI_FONT, color: INK, boxSizing: 'border-box' }}
    >
      <div style={{ textAlign: 'center', color: GOLD, fontSize: TYPE.large, marginBottom: 6 }}>The road to the penthouse</div>
      <div
        data-testid="route-card"
        style={{ minHeight: 70, marginBottom: 8, padding: '8px 12px', border: '1px solid #4a4a66', borderRadius: 6, background: '#0d0f1a', fontSize: TYPE.body }}
      >
        {focus === 0 ? (
          <span style={{ color: DIM }}>Basin. Home, for now.</span>
        ) : (
          <>
            <div style={{ color: GOLD }}>
              {focus}. {stop.town} · {stop.casino}
            </div>
            <div style={{ color: INK }}>
              {stop.boss
                ? `Win ${money(stop.winTarget)} at the poker tables, then beat ${stop.boss} to open the bus onward.`
                : 'Win the Poker Legends Tournament: a seat at the Invitational final table.'}
            </div>
            <div style={{ color: DIM, fontSize: TYPE.small }}>
              {stop.bankroll > 0 ? `You need ${money(stop.bankroll)} to be let in.` : ''}
            </div>
          </>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block', background: '#14172a', border: '2px solid #4a4a66', borderRadius: 6 }} role="img" aria-label="Route map">
        {road.slice(1).map(({ x, y, i }) => {
          const [px, py] = PINS[i - 1]
          const drawn = i <= reached
          return (
            <line
              key={i}
              x1={px}
              y1={py}
              x2={x}
              y2={y}
              pathLength={1}
              stroke={GOLD}
              strokeWidth={2}
              strokeDasharray="1"
              strokeDashoffset={drawn ? 0 : 1}
              strokeLinecap="round"
              style={{ transition: `stroke-dashoffset ${STEP_MS}ms ease-in-out` }}
            />
          )
        })}
        {road.map(({ x, y, i }) => {
          const shown = i <= reached
          const here = i === focus
          return (
            <g key={i} data-testid={`route-stop-${i}`} data-shown={shown || undefined} style={{ opacity: shown ? 1 : 0, transition: `opacity 400ms ease-out ${i > 0 ? STEP_MS * 0.8 : 0}ms` }}>
              {here && <circle cx={x} cy={y} r={9} fill="none" stroke="#fff" strokeWidth={1}><animate attributeName="r" values="6;11;6" dur="1.6s" repeatCount="indefinite" /></circle>}
              <circle cx={x} cy={y} r={5} fill={i === ROUTE.length - 1 ? '#c084fc' : i === 0 ? '#6f86b8' : GOLD} stroke="#0d0f1a" strokeWidth={1.5} />
              <text x={x} y={y + 2} textAnchor="middle" fontSize={6} fontWeight="bold" fill="#0d0f1a">{i === 0 ? '⌂' : i}</text>
              <text x={x} y={y + (i % 2 ? -9 : 16)} textAnchor="middle" fontSize={7} fill={INK}>{ROUTE[i].town}</text>
            </g>
          )
        })}
      </svg>
      <DialogueBox key={at} speaker={speaker} lines={[text]} onFinish={next} />
    </div>
  )
}
