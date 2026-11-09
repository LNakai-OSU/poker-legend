import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { ReelLine } from '../world/events'
import { parseCards, type SeatName, type TapeExhibit, type TapeHand } from '../world/tape'
import { CHARACTERS } from '../world/characters'
import type { Card as CardData } from '../engine/types'
import { playSound } from '../audio/audio'
import { isActionKey, useKeyLayer } from './keys'
import { useTouchFirst } from './device'
import { TABLE_THEMES } from './tableThemes'
import { Panel } from './pixel/ui'
import { PixelText } from './pixel/PixelText'
import { INK, type Ink } from './pixel/ink'
import { useCrispScale } from './useCrispScale'
import { Raster } from './pixel/raster'
import { drawText, measureText } from './pixel/font'
import { CARD_ART, cardFaceUrl, slotUrl } from './pixel/cards'
import { DENOMINATIONS, chipStackUrl } from './pixel/chips'
import { drawPortrait } from './portraits'
import type { Expression } from './avatars'
import { HAND_CATEGORY_NAMES, bestHand } from '../engine/handRank'

/**
 * Hal's old tape, in the game's own pixel art.
 *
 * A lecture hall as a 256 by 144 grid — a chalkboard, a desk, the man himself in
 * the same portrait he has everywhere else — shot on tired film: sepia, scan
 * lines, grain, a scratch now and then and a tracking roll. Whatever Hal is
 * explaining goes up on the board while he says it: real cards, the seats round
 * a table, stacks of chips. A line that names an exhibit puts it up, and it
 * stays until another line replaces it.
 */

const W = 256
const H = 144
const THEME = TABLE_THEMES.home
const CPS = 46
/** The chalkboard's inside, where exhibits are laid out. */
const BOARD = { x: 8, y: 8, w: 240, h: 84 }
const CHALK: Ink = { color: '#f2efe0', shadow: '#10261c' }
const CHALK_DIM: Ink = { color: '#a6c0ae', shadow: '#10261c' }
const CHALK_GOLD: Ink = { color: '#f8d048', shadow: '#3a2a08' }

const CARD_W = CARD_ART.big.w
const CARD_H = CARD_ART.big.h
const CARD_STEP = CARD_W + 3
/** The shared cards sit further apart, so each street's name fits under its card. */
const BOARD_STEP = CARD_W + 7

function drawSet(): Raster {
  const r = new Raster(W, H)
  // The wall behind, warm plaster, darker toward the ceiling.
  const wall = ['#2a2018', '#33271c', '#3c2e20', '#453526']
  wall.forEach((c, i) => r.rect(0, i * 24, W, 24, c))
  r.rect(0, 96, W, 48, '#2a1a0e')
  // The board: a wooden frame round a slate that has been wiped and written on for years.
  r.rect(4, 4, 248, 92, '#5a3a1e')
  r.rect(4, 4, 248, 2, '#8a6232')
  r.rect(4, 94, 248, 2, '#3a2410')
  r.rect(6, 6, 244, 88, '#163325')
  r.rect(7, 7, 242, 86, '#1b3d2d')
  r.each(7, 7, 242, 86, (x, y) => {
    const h = (x * 7919 + y * 104729) % 97
    if (h < 2) return '#22493a'
    if (h > 94) return '#173528'
    return null
  })
  // Ghosts of old lessons, wiped but not gone.
  for (let i = 0; i < 9; i++) r.rect(14 + i * 26, 20 + (i * 17) % 50, 14 + (i * 5) % 9, 1, '#23493a')
  // The chalk tray, with chalk and a rubber.
  r.rect(10, 92, 236, 4, '#6a4a28')
  r.rect(10, 92, 236, 1, '#a07a44')
  r.rect(30, 90, 10, 2, '#f2efe0')
  r.rect(44, 91, 7, 1, '#f8d8a0')
  r.rect(200, 89, 16, 3, '#8a8a92')
  r.rect(200, 89, 16, 1, '#b4b4bc')
  // The desk across the bottom: dark wood, a lit edge, a green baize mat.
  r.rect(0, 100, W, 44, '#3a2414')
  r.rect(0, 100, W, 2, '#8a5a30')
  r.rect(0, 102, W, 1, '#1a0e06')
  r.rect(0, 136, W, 8, '#22140a')
  r.rect(130, 108, 118, 26, '#1d4a34')
  r.rect(130, 108, 118, 1, '#2a6a4a')
  r.box(132, 110, 114, 22, '#2a6a4a')
  // A deck, a mug and a few chips on the baize.
  r.rect(140, 112, 12, 16, '#e8e4d4')
  r.rect(141, 113, 10, 14, '#8a2a2a')
  r.box(142, 114, 8, 12, '#e8c868')
  r.rect(144, 118, 4, 4, '#e8c868')
  r.rect(218, 112, 10, 11, '#d8d0c0')
  r.rect(228, 115, 2, 5, '#d8d0c0')
  r.rect(219, 113, 8, 2, '#3a2418')
  r.ellipse(166, 116, 11, 6, '#c82828')
  r.ellipse(166, 114, 11, 6, '#d84a4a')
  r.ellipse(180, 120, 11, 6, '#e8e8f0')
  r.ellipse(180, 118, 11, 6, '#f4f4fa')
  // His nameplate.
  r.rect(62, 118, 64, 14, '#c9a24a')
  r.rect(62, 118, 64, 1, '#f0d078')
  r.rect(62, 131, 64, 1, '#7a5a20')
  drawText(r, 'MR. HAL', 77, 122, '#3a2410')
  return r
}

const SET = drawSet()

let halFaces: Partial<Record<Expression, string>> = {}
function halUrl(expression: Expression): string {
  const hit = halFaces[expression]
  if (hit) return hit
  const url = drawPortrait(CHARACTERS.hal.look, expression, 'tape-hal').toDataURL()
  halFaces = { ...halFaces, [expression]: url }
  return url
}

// -- The exhibits ------------------------------------------------------------------------------

const key = (c: CardData) => `${c.rank}${c.suit}`

/** Something placed on the board at a spot in art pixels. */
function At({ x, y, w, p, children, style }: { x: number; y: number; w?: number; p: number; children: ReactNode; style?: CSSProperties }) {
  return <div style={{ position: 'absolute', left: (BOARD.x + x) * p, top: (BOARD.y + y) * p, width: w ? w * p : undefined, ...style }}>{children}</div>
}

function CardImg({ card, p, lit = true, raise = false, delay = 0 }: { card: CardData; p: number; lit?: boolean; raise?: boolean; delay?: number }) {
  return (
    <img
      src={cardFaceUrl(card, 'big')}
      alt={`${card.rank}${card.suit}`}
      data-card={key(card)}
      draggable={false}
      className="card-deal"
      style={{
        display: 'block',
        position: 'absolute',
        width: CARD_W * p,
        height: CARD_H * p,
        imageRendering: 'pixelated',
        filter: lit ? undefined : 'brightness(0.5) saturate(0.7)',
        transform: raise ? `translateY(${-3 * p}px)` : undefined,
        animationDelay: `${delay}ms`,
      }}
    />
  )
}

function Label({ text, p, ink = CHALK, w, align = 'left' }: { text: string; p: number; ink?: Ink; w?: number; align?: 'left' | 'center' | 'right' }) {
  return w ? (
    <div style={{ width: w * p }}>
      <PixelText text={text} scale={p} ink={ink} wrap align={align} />
    </div>
  ) : (
    <PixelText text={text} scale={p} ink={ink} />
  )
}

/** The note chalked at the foot of the board. */
function Note({ text, p }: { text?: string; p: number }) {
  if (!text) return null
  return (
    <At x={0} y={BOARD.h - 12} w={BOARD.w} p={p} style={{ whiteSpace: 'nowrap' }}>
      <Label text={text} p={p} ink={CHALK_GOLD} w={BOARD.w} align="center" />
    </At>
  )
}

function rankName(rank: string | undefined, cards: CardData[]): string | undefined {
  if (!rank || cards.length < 5) return undefined
  return HAND_CATEGORY_NAMES[bestHand(cards).category].toUpperCase()
}

function HandRow({ hand, y, p }: { hand: TapeHand; y: number; p: number }) {
  const cards = parseCards(hand.cards)
  const make = hand.make ? new Set(parseCards(hand.make).map(key)) : null
  const verdict = hand.verdict
  return (
    <>
      <At x={8} y={y + 8} w={90} p={p} style={{ whiteSpace: 'nowrap' }}>
        <Label text={hand.title} p={p} ink={CHALK_GOLD} />
        {hand.sub && (
          <div style={{ marginTop: 3 * p }}>
            <Label text={hand.sub} p={p} ink={CHALK_DIM} />
          </div>
        )}
      </At>
      {cards.map((c, i) => (
        <At key={`${key(c)}${i}`} x={100 + i * CARD_STEP} y={y + 3} p={p}>
          <CardImg card={c} p={p} lit={!make || make.has(key(c))} raise={!!make && make.has(key(c))} delay={i * 70} />
        </At>
      ))}
      {verdict && (
        <At x={100 + 5 * CARD_STEP + 2} y={y + 12} p={p}>
          <Label text={verdict === 'wins' ? '✓' : '✕'} p={p * 2} ink={verdict === 'wins' ? INK.green : INK.red} />
        </At>
      )}
    </>
  )
}

function HandsExhibit({ hands, note, p }: { hands: TapeHand[]; note?: string; p: number }) {
  // Two rows leave room under them for the note chalked at the foot of the board.
  const ys = hands.length === 1 ? [22] : note ? [0, 33] : [6, 40]
  return (
    <>
      {hands.map((h, i) => (
        <HandRow key={h.title} hand={h} y={ys[i]} p={p} />
      ))}
      <Note text={note} p={p} />
    </>
  )
}

function BoardExhibit({ hole, board, make, rank, note, p }: Extract<TapeExhibit, { kind: 'board' }> & { p: number }) {
  const mine = parseCards(hole)
  const shared = parseCards(board)
  const lit = make ? new Set(parseCards(make).map(key)) : null
  const x0 = 14
  const bx = x0 + 2 * CARD_STEP + 14
  const cy = 18
  const felt = TABLE_THEMES.home.table.felt
  const title = rankName(rank, [...mine, ...shared])
  const stage = (to: number) => shared.length >= to
  return (
    <>
      <At x={x0} y={4} p={p}>
        <Label text="YOUR HAND" p={p} ink={CHALK_DIM} />
      </At>
      <At x={bx} y={4} p={p}>
        <Label text="THE BOARD" p={p} ink={CHALK_DIM} />
      </At>
      {mine.map((c, i) => (
        <At key={key(c)} x={x0 + i * CARD_STEP} y={cy} p={p}>
          <CardImg card={c} p={p} lit={!lit || lit.has(key(c))} raise={!!lit && lit.has(key(c))} delay={i * 80} />
        </At>
      ))}
      {Array.from({ length: 5 }, (_, i) => {
        const c = shared[i]
        return (
          <At key={i} x={bx + i * BOARD_STEP} y={cy} p={p}>
            {c ? (
              <CardImg card={c} p={p} lit={!lit || lit.has(key(c))} raise={!!lit && lit.has(key(c))} delay={i * 80} />
            ) : (
              <img src={slotUrl(felt, 'big')} alt="" data-slot="true" draggable={false} style={{ display: 'block', width: CARD_W * p, height: CARD_H * p, imageRendering: 'pixelated', opacity: 0.55 }} />
            )}
          </At>
        )
      })}
      {([['FLOP', 1, 3], ['TURN', 3, 4], ['RIVER', 4, 5]] as const).map(([name, at, to]) =>
        stage(to) ? (
          <At key={name} x={bx + at * BOARD_STEP + (CARD_W - measureText(name)) / 2} y={cy + CARD_H + 7} p={p}>
            <Label text={name} p={p} ink={CHALK} />
          </At>
        ) : null,
      )}
      {lit && title && parseCards(make ?? '').length === 5 && (
        <At x={x0} y={cy + CARD_H + 7} w={2 * CARD_STEP - 3} p={p}>
          <Label text={title} p={p} ink={INK.green} w={2 * CARD_STEP - 3} align="center" />
        </At>
      )}
      <Note text={note} p={p} />
    </>
  )
}

// Seats are drawn: a felt, six plaques, and the numbers or colours that mean something.
const SEAT_ORDER: SeatName[] = ['btn', 'sb', 'bb', 'utg', 'hj', 'co']
const SEAT_LABEL: Record<SeatName, string> = { btn: 'BTN', sb: 'SB', bb: 'BB', utg: 'UTG', hj: 'HJ', co: 'CO' }
/** Degrees round the table, 90 straight down: clockwise from the button. */
const SEAT_ANGLE: Record<SeatName, number> = { btn: 60, sb: 120, bb: 180, utg: 240, hj: 300, co: 0 }
const ACTS: Record<'preflop' | 'flop', SeatName[]> = {
  preflop: ['utg', 'hj', 'co', 'btn', 'sb', 'bb'],
  flop: ['sb', 'bb', 'utg', 'hj', 'co', 'btn'],
}
const ZONE: Record<SeatName, string> = { utg: '#c84a4a', hj: '#d8a838', co: '#48b868', btn: '#48b868', sb: '#4a6a98', bb: '#4a6a98' }

const seatCache = new Map<string, string>()
function seatsUrl(ex: Extract<TapeExhibit, { kind: 'seats' }>): string {
  const k = JSON.stringify([ex.order, ex.mark, ex.zones])
  const hit = seatCache.get(k)
  if (hit) return hit
  const r = new Raster(BOARD.w, 72)
  const cx = 120
  const cy = 34
  // The cloth, the rail and its inner line.
  r.ellipse(cx - 74, cy - 23, 148, 46, '#2a1a10')
  r.ellipse(cx - 71, cy - 20, 142, 40, '#1f6b44')
  r.ellipse(cx - 62, cy - 14, 124, 28, '#1a5a3a')
  const marked = new Set(ex.mark ?? [])
  const dim = marked.size > 0
  const order = ex.order ? ACTS[ex.order] : null
  for (const seat of SEAT_ORDER) {
    const a = (SEAT_ANGLE[seat] * Math.PI) / 180
    const sx = Math.round(cx + Math.cos(a) * 80)
    const sy = Math.round(cy + Math.sin(a) * 24)
    const n = order ? order.indexOf(seat) + 1 : 0
    const label = n ? `${n} ${SEAT_LABEL[seat]}` : SEAT_LABEL[seat]
    const tw = measureText(label)
    const w = Math.max(24, tw + 8)
    const x = sx - Math.round(w / 2)
    const y = sy - 6
    const lit = !dim || marked.has(seat)
    const base = ex.zones ? ZONE[seat] : seat === 'btn' ? '#e8c868' : seat === 'sb' || seat === 'bb' ? '#4a6a98' : '#5a6a7a'
    const fill = lit ? base : '#2c3a3a'
    r.rect(x, y, w, 12, '#101418')
    r.rect(x + 1, y + 1, w - 2, 10, fill)
    r.rect(x + 1, y + 1, w - 2, 1, lit ? '#f8f8f0' : '#3a4a4a')
    if (marked.has(seat)) r.box(x - 1, y - 1, w + 2, 14, '#f8f4e0')
    const textInk = seat === 'btn' && !ex.zones ? '#3a2410' : '#f8f8f0'
    drawText(r, label, x + Math.floor((w - tw) / 2), y + 3, lit ? textInk : '#7a8a8a')
  }
  // The dealer button sits on the felt beside the button's seat.
  const ba = (SEAT_ANGLE.btn * Math.PI) / 180
  const bx = Math.round(cx + Math.cos(ba) * 52)
  const by = Math.round(cy + Math.sin(ba) * 15)
  r.ellipse(bx - 4, by - 3, 9, 8, '#18141c')
  r.ellipse(bx - 3, by - 3, 7, 6, '#f8f4e0')
  drawText(r, 'D', bx - 1, by - 3, '#3a2a18')
  if (ex.zones) {
    drawText(r, 'EARLY', cx - 18, cy - 12, '#f08080')
    drawText(r, 'MIDDLE', cx - 20, cy - 3, '#f0d070')
    drawText(r, 'LATE', cx - 12, cy + 6, '#80e0a0')
  }
  const url = r.toDataURL()
  seatCache.set(k, url)
  return url
}

function SeatsExhibit({ ex, p }: { ex: Extract<TapeExhibit, { kind: 'seats' }>; p: number }) {
  return (
    <>
      <At x={0} y={2} p={p}>
        <img src={seatsUrl(ex)} alt="the table, six seats" draggable={false} style={{ display: 'block', width: BOARD.w * p, height: 72 * p, imageRendering: 'pixelated' }} />
      </At>
      <Note text={ex.note} p={p} />
    </>
  )
}

const TONE = { bet: DENOMINATIONS[4], call: DENOMINATIONS[5], raise: DENOMINATIONS[2] }
const POT_CHIP = DENOMINATIONS[3]
const ZOOM = 2

function BetsExhibit({ ex, p }: { ex: Extract<TapeExhibit, { kind: 'bets' }>; p: number }) {
  const columns = [{ label: 'THE POT', chips: ex.pot, denom: POT_CHIP }, ...ex.bets.map((b) => ({ label: b.label, chips: b.chips, denom: TONE[b.tone ?? 'bet'] }))]
  const colW = BOARD.w / columns.length
  const floor = 50
  return (
    <>
      {columns.map((c, i) => {
        const stack = chipStackUrl(Array.from({ length: c.chips }, () => c.denom))
        const cx = colW * i + colW / 2
        return (
          <div key={`${c.label}${i}`}>
            <At x={cx - (stack.w * ZOOM) / 2} y={floor - stack.h * ZOOM} p={p}>
              <img src={stack.url} alt="" data-chips={c.chips} draggable={false} className="card-deal" style={{ display: 'block', width: stack.w * ZOOM * p, height: stack.h * ZOOM * p }} />
            </At>
            <At x={cx - colW / 2} y={floor + 4} w={colW} p={p}>
              <Label text={c.label} p={p} ink={i === 0 ? CHALK_DIM : CHALK} w={colW} align="center" />
            </At>
          </div>
        )
      })}
      <Note text={ex.note} p={p} />
    </>
  )
}

function Exhibit({ ex, p }: { ex: TapeExhibit; p: number }) {
  switch (ex.kind) {
    case 'hands':
      return <HandsExhibit hands={ex.hands} note={ex.note} p={p} />
    case 'board':
      return <BoardExhibit {...ex} p={p} />
    case 'seats':
      return <SeatsExhibit ex={ex} p={p} />
    case 'bets':
      return <BetsExhibit ex={ex} p={p} />
  }
}

// -- The panel ---------------------------------------------------------------------------------

export function TapePanel({ lines, ticker, onDone }: { lines: ReelLine[]; ticker?: string; onDone: () => void }) {
  const [index, setIndex] = useState(0)
  const [shown, setShown] = useState(0)
  const [tick, setTick] = useState(0)
  const finished = useRef(false)
  const isTop = useKeyLayer(true)
  const touch = useTouchFirst()
  const line = lines[index]
  const typing = line ? shown < line.text.length : false
  const P = useCrispScale(W, H + 70, 5)
  const talk = Math.floor(tick / 3) % 2 === 0

  // Whatever was last put on the board is still there.
  const exhibit = useMemo(() => {
    for (let i = Math.min(index, lines.length - 1); i >= 0; i--) if (lines[i].show) return lines[i].show
    return undefined
  }, [index, lines])
  const exhibitKey = useMemo(() => {
    for (let i = Math.min(index, lines.length - 1); i >= 0; i--) if (lines[i].show) return i
    return -1
  }, [index, lines])

  useEffect(() => {
    const timer = window.setInterval(() => setTick((t) => t + 1), 80)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!line) return
    setShown(0)
    playSound('dialogue')
    const start = performance.now()
    const timer = window.setInterval(() => {
      const n = Math.min(line.text.length, Math.floor(((performance.now() - start) / 1000) * CPS))
      setShown((prev) => Math.max(prev, n))
      if (n >= line.text.length) window.clearInterval(timer)
    }, 40)
    return () => window.clearInterval(timer)
  }, [index])

  const advance = () => {
    if (finished.current || !line) return
    if (shown < line.text.length) {
      setShown(line.text.length)
      return
    }
    playSound('dialogue')
    if (index + 1 < lines.length) setIndex(index + 1)
    else {
      finished.current = true
      onDone()
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isActionKey(e) || !isTop()) return
      e.preventDefault()
      if (!e.repeat) advance()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, shown])

  // The set, and the film running through the projector.
  const set = useRef<HTMLCanvasElement>(null)
  const fx = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (set.current) SET.paint(set.current)
  }, [])
  useEffect(() => {
    const t0 = performance.now()
    const timer = window.setInterval(() => {
      const c = fx.current?.getContext('2d')
      if (!c) return
      const t = performance.now() - t0
      c.clearRect(0, 0, W, H)
      // Grain: a scatter of specks that never sits still.
      for (let i = 0; i < 70; i++) {
        c.fillStyle = Math.random() < 0.5 ? 'rgba(255,244,214,0.28)' : 'rgba(0,0,0,0.3)'
        c.fillRect(Math.floor(Math.random() * W), Math.floor(Math.random() * H), 1, 1)
      }
      // A scratch down the print, now and then, and a hair in the gate.
      if (Math.floor(t / 900) % 3 === 0) {
        c.fillStyle = 'rgba(255,244,214,0.22)'
        c.fillRect(Math.floor(((t / 900) * 53) % W), 0, 1, H)
      }
      // The picture rolls: a tracking band, every so often, for a moment.
      const phase = t % 6500
      if (phase < 260) {
        const y = Math.floor((phase / 260) * H)
        c.fillStyle = 'rgba(255,244,214,0.16)'
        c.fillRect(0, y, W, 5)
        c.fillStyle = 'rgba(0,0,0,0.35)'
        c.fillRect(0, y + 5, W, 1)
      }
    }, 90)
    return () => window.clearInterval(timer)
  }, [])

  const flicker = 0.04 + 0.05 * ((Math.sin(tick * 1.7) + 1) / 2)

  return (
    <div
      data-testid="tape"
      data-exhibit={exhibit?.kind ?? ''}
      onClick={advance}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', height: '100%', paddingTop: 4, userSelect: 'none' }}
    >
      <div style={{ position: 'relative', width: W * P, height: H * P, flex: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, filter: 'sepia(0.5) contrast(1.06) brightness(0.96) saturate(0.9)' }}>
          <canvas ref={set} width={W} height={H} style={{ width: W * P, height: H * P, imageRendering: 'pixelated', display: 'block' }} />
          <div key={exhibitKey} data-testid="tape-exhibit" style={{ position: 'absolute', inset: 0 }}>
            {exhibit && <Exhibit ex={exhibit} p={P} />}
          </div>
          <div style={{ position: 'absolute', left: 8 * P, top: 93 * P, width: 48 * P }} data-testid="tape-hal">
            <Panel theme={THEME} scale={P} kind="acting" style={{ padding: 1 * P }}>
              <img
                src={halUrl(typing && talk ? 'lip-twitch' : typing ? 'neutral' : 'thinking')}
                alt="Hal"
                draggable={false}
                style={{ display: 'block', width: 48 * P, height: 48 * P, imageRendering: 'pixelated' }}
              />
            </Panel>
          </div>
        </div>
        <canvas ref={fx} width={W} height={H} style={{ position: 'absolute', inset: 0, width: W * P, height: H * P, imageRendering: 'pixelated', pointerEvents: 'none' }} />
        {/* Scan lines, a dark vignette, and the lamp of the projector breathing. */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: `repeating-linear-gradient(to bottom, rgba(0,0,0,0.16) 0, rgba(0,0,0,0.16) ${P}px, transparent ${P}px, transparent ${2 * P}px)`,
          }}
        />
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,0.55) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `rgba(255,236,190,${flicker})` }} />
        <div style={{ position: 'absolute', right: 6 * P, top: 4 * P, pointerEvents: 'none', opacity: Math.floor(tick / 6) % 2 ? 0.35 : 1 }}>
          <PixelText text="▶ PLAY" scale={P} ink={{ color: '#f8f4e0', shadow: '#2a1a0a' }} />
        </div>
      </div>
      <div
        data-testid="reel-ticker"
        style={{ width: W * P, boxSizing: 'border-box', background: '#3a2414', borderTop: `${P}px solid #8a6232`, padding: `${P}px ${2 * P}px`, display: 'flex', justifyContent: 'space-between', gap: 3 * P }}
      >
        <PixelText text="HAL'S HOLD'EM HANDBOOK" scale={P} ink={{ color: '#f0d078', shadow: '#1a0e06' }} />
        <PixelText text={ticker ?? ''} scale={P} ink={{ color: '#f8f4e0', shadow: '#1a0e06' }} />
      </div>
      <Panel
        theme={THEME}
        scale={P}
        testId="tape-line"
        style={{ width: W * P, boxSizing: 'border-box', padding: `${3 * P}px ${4 * P}px`, minHeight: 36 * P, marginTop: 2 * P, flex: 'none' }}
      >
        <div style={{ marginBottom: 2 * P }}>
          <PixelText text="Hal · FORTY YEARS IN CARD ROOMS" scale={P} ink={{ color: '#8a5a1e', shadow: '#ecdcc0' }} />
        </div>
        <PixelText text={line ? line.text.replace(/^Hal: /, '').slice(0, shown) || ' ' : ' '} scale={P} wrap ink={INK.dark} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: P }}>
          {!typing && <PixelText text={touch ? 'tap ▸' : 'space ▸'} scale={P} ink={{ color: '#8a8a98', shadow: '#dcdce4' }} style={{ opacity: Math.floor(tick / 6) % 2 ? 0.3 : 1 }} />}
        </div>
      </Panel>
    </div>
  )
}
