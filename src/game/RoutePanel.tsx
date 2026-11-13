import { useMemo, useState } from 'react'
import type { ReelLine } from '../world/events'
import { CHARACTERS } from '../world/characters'
import { ROUTE } from '../world/route'
import { portraitUrl } from './portraits'
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
const H = 210
/** Where each stop is pinned on the map, home first. */
const PINS: Array<[number, number]> = [
  [30, 160],
  [76, 104],
  [124, 160],
  [170, 98],
  [216, 158],
  [258, 98],
  [292, 40],
]
const STEP_MS = 900
const GOLD = '#f0d27a'
const INK = '#e8e8f0'
const DIM = '#8d93ab'

/** A few shapes that make each town recognisable from across the map; drawn left of its pin. */
function Scenery({ id, x, y }: { id: string; x: number; y: number }) {
  const ink = '#0d0f1a'
  switch (id) {
    case 'apartment': // the flat over the bakery
      return <g><rect x={x - 12} y={y - 24} width={14} height={14} fill="#8a6a4a" stroke={ink} /><rect x={x - 12} y={y - 24} width={14} height={4} fill="#c0504a" /><rect x={x - 8} y={y - 17} width={4} height={4} fill="#f0d27a" /></g>
    case 'silverCreek': // saloon with a false front and a sign
      return <g><rect x={x - 26} y={y - 24} width={18} height={14} fill="#9a6a3a" stroke={ink} /><rect x={x - 28} y={y - 28} width={22} height={5} fill="#7a2e2e" stroke={ink} /><rect x={x - 21} y={y - 17} width={4} height={7} fill={ink} /><circle cx={x - 12} cy={y - 18} r={2} fill="#f0d27a" /></g>
    case 'riverbend': // paddle steamer
      return <g><rect x={x - 30} y={y + 6} width={24} height={6} fill="#e8e8f0" stroke={ink} /><rect x={x - 24} y={y} width={12} height={6} fill="#c0504a" stroke={ink} /><rect x={x - 20} y={y - 8} width={3} height={8} fill="#555" /><circle cx={x - 30} cy={y + 10} r={4} fill="#8a5a3a" stroke={ink} /></g>
    case 'crescentHarbor': // lighthouse on the quay
      return <g><path d={`M${x - 20} ${y + 8} l3 -22 h6 l3 22 z`} fill="#e8e8f0" stroke={ink} /><rect x={x - 18} y={y - 6} width={10} height={4} fill="#c0504a" /><rect x={x - 19} y={y - 18} width={8} height={4} fill="#f0d27a" /><path d={`M${x - 30} ${y + 10} q6 -4 12 0 t12 0`} fill="none" stroke="#4aa0d8" strokeWidth={1.5} /></g>
    case 'palmCay': // palms
      return <g><path d={`M${x - 16} ${y + 8} q2 -12 0 -22`} stroke="#8a6a3a" strokeWidth={2} fill="none" /><path d={`M${x - 16} ${y - 14} l-9 4 m9 -4 l9 4 m-9 -4 l-5 -7 m5 7 l5 -7`} stroke="#3aa05a" strokeWidth={2} fill="none" /><path d={`M${x - 34} ${y + 10} q8 -5 16 0`} stroke="#4aa0d8" strokeWidth={1.5} fill="none" /></g>
    case 'neonMesa': // a neon arch over the Strip
      return <g><rect x={x - 26} y={y - 22} width={4} height={26} fill="#555" /><rect x={x - 10} y={y - 22} width={4} height={26} fill="#555" /><rect x={x - 28} y={y - 26} width={24} height={6} fill="#ff4fa0" stroke="#fff" strokeWidth={0.5} /><circle cx={x - 16} cy={y - 8} r={3} fill="#4fe0ff" /></g>
    default: // Porto Lumina's tower
      return <g><rect x={x - 22} y={y - 6} width={8} height={18} fill="#b08ae8" stroke={ink} /><rect x={x - 19} y={y - 16} width={4} height={10} fill="#c084fc" stroke={ink} /><rect x={x - 12} y={y} width={7} height={12} fill="#8a6ac8" stroke={ink} /><circle cx={x - 17} cy={y - 18} r={1.5} fill="#f0d27a" /></g>
  }
}

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
        style={{ minHeight: 96, marginBottom: 8, padding: '8px 12px', border: '1px solid #4a4a66', borderRadius: 6, background: '#0d0f1a', fontSize: TYPE.body }}
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
            <div data-testid="route-landmarks" style={{ color: INK, fontSize: TYPE.small, marginTop: 2 }}>
              Look for: {stop.landmarks.join(' · ')}
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
              <Scenery id={ROUTE[i].cityId} x={x} y={y} />
              {ROUTE[i].bossId && CHARACTERS[ROUTE[i].bossId!] && (
                <g data-testid={`route-boss-${i}`}>
                  <rect x={x + 7} y={y + 7} width={26} height={26} fill="#0d0f1a" stroke={GOLD} strokeWidth={1} />
                  <image href={portraitUrl(CHARACTERS[ROUTE[i].bossId!].look, 'neutral', ROUTE[i].bossId!)} x={x + 8} y={y + 8} width={24} height={24} style={{ imageRendering: 'pixelated' }} />
                  <text x={x + 20} y={y + 41} textAnchor="middle" fontSize={5} fill={GOLD}>{CHARACTERS[ROUTE[i].bossId!].name.split(' ').slice(-1)[0]}</text>
                </g>
              )}
              <circle cx={x} cy={y} r={5} fill={i === ROUTE.length - 1 ? '#c084fc' : i === 0 ? '#6f86b8' : GOLD} stroke="#0d0f1a" strokeWidth={1.5} />
              <text x={x} y={y + 2} textAnchor="middle" fontSize={6} fontWeight="bold" fill="#0d0f1a">{i === 0 ? '⌂' : i}</text>
              <text x={x} y={y - 9} textAnchor="middle" fontSize={7} fill={INK}>{ROUTE[i].town}</text>
            </g>
          )
        })}
      </svg>
      <DialogueBox key={at} speaker={speaker} lines={[text]} onFinish={next} />
    </div>
  )
}
