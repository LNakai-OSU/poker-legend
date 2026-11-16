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
 *
 * The map fills the window above the dialogue, so nothing Marcus says covers
 * a town: ground, sea and river under the road, each town drawn large with its
 * landmark, its boss's face and what the bus there costs.
 */

const W = 640
const H = 360
/** Where each stop is pinned on the map, home first. */
const PINS: Array<[number, number]> = [
  [70, 262],
  [160, 160],
  [262, 262],
  [352, 150],
  [452, 262],
  [520, 172],
  [588, 62],
]
/** The road between two pins bows a little, the way a real one follows the land. */
const roadPath = (a: [number, number], b: [number, number], i: number) => {
  const mx = (a[0] + b[0]) / 2
  const my = (a[1] + b[1]) / 2
  const bow = i % 2 === 0 ? -14 : 14
  return `M${a[0]} ${a[1]} Q${mx + bow} ${my + bow * 0.6} ${b[0]} ${b[1]}`
}
const STEP_MS = 900
const GOLD = '#f0d27a'
const INK = '#e8e8f0'
const DIM = '#8d93ab'
/** Height kept clear at the bottom for the dialogue box. */
const DIALOGUE_ROOM = 92

/** The ground under the road: sea along the south and east, a river, desert, hills, trees. */
function Terrain() {
  const tree = (x: number, y: number, k: number) => (
    <g key={k}>
      <rect x={x - 1} y={y + 4} width={2} height={4} fill="#4a3a28" />
      <path d={`M${x - 5} ${y + 5} L${x} ${y - 7} L${x + 5} ${y + 5} Z`} fill="#2d6a46" />
    </g>
  )
  const hill = (x: number, y: number, w: number, k: number) => (
    <path key={k} d={`M${x - w} ${y} Q${x} ${y - w * 0.8} ${x + w} ${y} Z`} fill="#27344a" stroke="#34456a" strokeWidth={1} />
  )
  return (
    <g aria-hidden>
      <rect width={W} height={H} fill="#1a2238" />
      {/* sea: the coast Crescent Harbor and Palm Cay sit on */}
      <path d={`M0 ${H} L0 318 Q120 300 250 322 T470 322 Q560 316 ${W} 292 L${W} ${H} Z`} fill="#17405f" />
      <path d={`M${W} 0 L${W} 22 Q612 24 600 40 L${W} 52 Z`} fill="#17405f" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path key={i} d={`M${24 + i * 100} ${338 + (i % 2) * 8} q6 -4 12 0 t12 0`} fill="none" stroke="#3a8fc0" strokeWidth={1.2} opacity={0.7} />
      ))}
      {/* desert around Silver Creek and Neon Mesa */}
      <ellipse cx={150} cy={178} rx={92} ry={56} fill="#3a3326" opacity={0.55} />
      <ellipse cx={540} cy={170} rx={80} ry={52} fill="#3a2f3a" opacity={0.5} />
      {/* the river that Riverbend Landing is named for */}
      <path d={`M232 0 Q250 70 226 120 T260 214 Q268 250 258 286 L262 330`} fill="none" stroke="#1f5a80" strokeWidth={9} strokeLinecap="round" />
      <path d={`M232 0 Q250 70 226 120 T260 214 Q268 250 258 286 L262 330`} fill="none" stroke="#2f7aa8" strokeWidth={2} strokeLinecap="round" opacity={0.6} />
      {/* hills and mesas */}
      {hill(40, 120, 26, 0)}
      {hill(76, 108, 20, 1)}
      {hill(410, 86, 28, 2)}
      {hill(446, 100, 18, 3)}
      {hill(120, 52, 22, 4)}
      {hill(500, 232, 16, 5)}
      {/* trees by the river and in the south-west */}
      {[
        [210, 70], [290, 90], [296, 190], [214, 238], [28, 220], [44, 238], [20, 250], [318, 230], [398, 226], [380, 54], [300, 40], [92, 306],
      ].map(([x, y], k) => tree(x, y, k))}
      {/* compass */}
      <g transform="translate(36 40)">
        <circle r={16} fill="#0d0f1a" stroke="#4a4a66" />
        <path d="M0 -13 L4 0 L0 13 L-4 0 Z" fill="#6f86b8" />
        <path d="M0 -13 L4 0 L-4 0 Z" fill={GOLD} />
        <text y={-19} textAnchor="middle" fontSize={7} fill={GOLD}>N</text>
      </g>
    </g>
  )
}

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
      style={{ position: 'relative', width: 'min(98vw, 1100px)', height: '100%', boxSizing: 'border-box', padding: `30px 0 ${DIALOGUE_ROOM}px`, display: 'flex', flexDirection: 'column', gap: 6, fontFamily: UI_FONT, color: INK }}
    >
      <div style={{ textAlign: 'center', color: GOLD, fontSize: TYPE.large }}>The road to the penthouse</div>
      <div style={{ position: 'relative', flex: 1, minHeight: 0, containerType: 'size', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* The map's own box: as large as fits, in the map's shape, so the card can sit inside it and never over a town. */}
        <div style={{ position: 'relative', width: `min(100cqw, calc(100cqh * ${W} / ${H}))`, aspectRatio: `${W} / ${H}` }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', background: '#0d0f1a', border: '2px solid #4a4a66', borderRadius: 6, boxSizing: 'border-box' }}
          role="img"
          aria-label="Route map"
        >
          <Terrain />
          {road.slice(1).map(({ x, y, i }) => {
            const a = PINS[i - 1]
            const d = roadPath(a, [x, y], i)
            const drawn = i <= reached
            const fare = ROUTE[i].bankroll
            // The label rides the curve; the last road is short and ends under a plate, so its label sits lower.
            const t = i === ROUTE.length - 1 ? 0.4 : 0.5
            const c = [(a[0] + x) / 2 + (i % 2 === 0 ? -14 : 14), (a[1] + y) / 2 + (i % 2 === 0 ? -8.4 : 8.4)]
            const lx = (1 - t) ** 2 * a[0] + 2 * t * (1 - t) * c[0] + t * t * x
            const ly = (1 - t) ** 2 * a[1] + 2 * t * (1 - t) * c[1] + t * t * y
            return (
              <g key={i}>
                <path d={d} fill="none" stroke="#0d0f1a" strokeWidth={6} strokeLinecap="round" opacity={drawn ? 1 : 0} style={{ transition: 'opacity 300ms' }} />
                <path
                  d={d}
                  fill="none"
                  pathLength={1}
                  stroke={GOLD}
                  strokeWidth={2.5}
                  strokeDasharray="1"
                  strokeDashoffset={drawn ? 0 : 1}
                  strokeLinecap="round"
                  style={{ transition: `stroke-dashoffset ${STEP_MS}ms ease-in-out` }}
                />
                {/* what the bus into this town asks, written on the road */}
                <g style={{ opacity: drawn ? 1 : 0, transition: `opacity 400ms ease-out ${STEP_MS * 0.8}ms` }}>
                  <rect x={lx - 23} y={ly - 7} width={46} height={12} rx={3} fill="#0d0f1a" stroke="#4a4a66" />
                  <text x={lx} y={ly + 2} textAnchor="middle" fontSize={7} fill={INK}>🚌 {fare > 0 ? money(fare) : 'free'}</text>
                </g>
              </g>
            )
          })}
          {road.map(({ x, y, i }) => {
            const shown = i <= reached
            const here = i === focus
            const r = ROUTE[i]
            const boss = r.bossId ? CHARACTERS[r.bossId] : undefined
            const low = i % 2 === 0
            // Between the two roads that climb away from a low town; clear sky above a high one.
            // The last town's road climbs off to the upper right, so the boss before it stands below.
            const beforeLast = i === ROUTE.length - 2
            const bx = low ? x - 19 : beforeLast ? x + 48 : x + 12
            const by = low ? y - 64 : beforeLast ? y - 6 : y - 58
            return (
              <g key={i} data-testid={`route-stop-${i}`} data-shown={shown || undefined} style={{ opacity: shown ? 1 : 0, transition: `opacity 400ms ease-out ${i > 0 ? STEP_MS * 0.8 : 0}ms` }}>
                {here && <circle cx={x} cy={y} r={12} fill="none" stroke="#fff" strokeWidth={1.2}><animate attributeName="r" values="9;17;9" dur="1.6s" repeatCount="indefinite" /></circle>}
                <g transform={`translate(${x} ${y}) scale(1.7) translate(${-x} ${-y})`}>
                  <Scenery id={r.cityId} x={x} y={y} />
                </g>
                {boss && (
                  <g data-testid={`route-boss-${i}`}>
                    <rect x={bx} y={by} width={38} height={48} fill="#0d0f1a" stroke={GOLD} strokeWidth={1.5} />
                    <image href={portraitUrl(boss.look, 'neutral', r.bossId!)} x={bx + 1} y={by + 1} width={36} height={36} style={{ imageRendering: 'pixelated' }} />
                    <rect x={bx} y={by + 38} width={38} height={10} fill={GOLD} />
                    <text x={bx + 19} y={by + 45.5} textAnchor="middle" fontSize={6.5} fontWeight="bold" fill="#0d0f1a">{boss.name.split(' ').slice(-1)[0]}</text>
                  </g>
                )}
                <circle cx={x} cy={y} r={8} fill={i === ROUTE.length - 1 ? '#c084fc' : i === 0 ? '#6f86b8' : GOLD} stroke="#0d0f1a" strokeWidth={2} />
                <text x={x} y={y + 3.5} textAnchor="middle" fontSize={10} fontWeight="bold" fill="#0d0f1a">{i === 0 ? '⌂' : i}</text>
                {/* the town's plate */}
                <g transform={`translate(${x} ${low ? y + 28 : y + 22})`}>
                  <rect x={-44} y={-9} width={88} height={i === 0 ? 14 : 24} rx={3} fill="#0d0f1acc" stroke="#4a4a66" />
                  <text y={1} textAnchor="middle" fontSize={8} fontWeight="bold" fill={INK}>{r.town}</text>
                  {i > 0 && <text y={11} textAnchor="middle" fontSize={6.5} fill={i === ROUTE.length - 1 ? '#c084fc' : GOLD}>{r.winTarget > 0 ? `win ${money(r.winTarget)}` : 'the tournament'}</text>}
                </g>
              </g>
            )
          })}
        </svg>
        {/* what the stop in front of you asks, over the map's empty corner */}
        {/* On a short screen there is no room for it that is not over a town; Marcus says the same. */}
        {window.innerHeight >= 560 && (
        <div
          data-testid="route-card"
          style={{ position: 'absolute', left: 8, top: 8, maxWidth: '40%', padding: '6px 10px', border: '1px solid #4a4a66', borderRadius: 6, background: '#0d0f1af0', fontSize: TYPE.small }}
        >
          {focus === 0 ? (
            <span style={{ color: DIM }}>Basin. Home, for now.</span>
          ) : (
            <>
              <div style={{ color: GOLD, fontSize: TYPE.body }}>
                {focus}. {stop.town} · {stop.casino}
              </div>
              <div>
                {stop.boss
                  ? `Win ${money(stop.winTarget)} at the poker tables, then beat ${stop.boss} to open the bus onward.`
                  : 'Win the Poker Legends Tournament: a seat at the Invitational final table.'}
              </div>
              {stop.bankroll > 0 && <div style={{ color: DIM }}>You need {money(stop.bankroll)} to be let in.</div>}
              <div data-testid="route-landmarks">Look for: {stop.landmarks.join(' · ')}</div>
            </>
          )}
        </div>
        )}
        </div>
      </div>
      <DialogueBox key={at} speaker={speaker} lines={[text]} onFinish={next} compact />
    </div>
  )
}
