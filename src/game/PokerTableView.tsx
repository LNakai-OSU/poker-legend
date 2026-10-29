import { useCallback, useMemo, useRef, useEffect, useState, type CSSProperties } from 'react'
import type { HandResult, PublicState } from '../engine/table'
import { bestHand, HAND_CATEGORY_NAMES } from '../engine/handRank'
import type { Card as CardData, PlayerConfig } from '../engine/types'
import { Card, cardText } from './Card'
import { ChipStack } from './ChipStack'
import { expressionFor, type Expression } from './avatars'
import { portraitBackdropUrl, portraitUrl, PORTRAIT_SIZE } from './portraits'
import { personalityFor } from '../world/characters'
import { tellCue } from './tellFlavor'
import { HandAnnouncer, type Announcement } from './HandAnnouncer'
import { BOARD, CARD_ZOOM, HERO, SEAT, SEAT_H, TEXT_ZOOM, type Rect, type SceneLayout } from './tableLayout'
import type { TableTheme } from './tableThemes'
import { paintTable } from './pixel/tableArt'
import { Panel } from './pixel/ui'
import { PixelText } from './pixel/PixelText'
import { INK, type Ink } from './pixel/ink'
import { frameStyle } from './pixel/frame'
import { panelFrames } from './pixel/themeFrames'
import { chipStackUrl, dealerButtonUrl, tableMarkerUrl, DENOMINATIONS } from './pixel/chips'
import { ACTION_WORD, type ActionKind } from './actionTag'
import { fitWords, measureText, wrapText, LINE_HEIGHT } from './pixel/font'

export interface TableInsights {
  /** Unlocked by the mentor's position lesson. */
  showPositions: boolean
  /** Unlocked by the tells lesson — faint reads become legible instead of near-invisible. */
  sharpEyes: boolean
  /** Extra legibility bought with items or a meal, on top of the lesson. */
  tellClarity?: number
}

interface PokerTableViewProps {
  state: PublicState
  lastResult: HandResult | null
  yourHole: CardData[]
  insights?: TableInsights
  /**
   * Which of a character's personas has taken each seat, where it is not their
   * usual one — Vance one on one talks differently from Vance six-handed.
   */
  personas?: Record<string, string>
  /** A line of table talk currently on screen. */
  speech?: SeatSpeech | null
  /** The current key moment, announced over the felt instead of in a panel. */
  announcement?: Announcement | null
  /** The stakes, written beside the pot so a change of blinds is on the felt. */
  blinds?: { small: number; big: number }
  /** What each player did last this street, written over their portrait. */
  actionTags?: Record<string, ActionKind>
  /** Turn a fold-win winner's cards face up, which the player asked to see. */
  showHeld?: boolean
  /** Where everything goes, and how big a pixel is. */
  layout: SceneLayout
  /** The room the table is in. */
  theme: TableTheme
}

export interface SeatSpeech {
  playerId: string
  text: string
}

/** Seat labels relative to the button, the way a real table is described. */
function positionLabels(state: PublicState): Map<string, string> {
  const seated = state.players.filter((p) => !p.isEliminated)
  const dealerIndex = seated.findIndex((p) => p.isDealer)
  const labels = new Map<string, string>()
  if (dealerIndex === -1) return labels

  const order = seated.length === 2 ? ['BTN/SB', 'BB'] : ['BTN', 'SB', 'BB', 'UTG', 'MP', 'CO']
  seated.forEach((_, offset) => {
    const player = seated[(dealerIndex + offset) % seated.length]
    labels.set(player.id, order[offset] ?? 'MP')
  })
  return labels
}

/**
 * What a player actually took from a finished hand, split into the two things
 * the old summary conflated: chips won from other players, and their own
 * uncalled bet handed back. Only the first is winning a pot.
 */
export function handTakings(result: HandResult, playerId: string): { won: number; returned: number } {
  let won = 0
  let returned = 0
  for (const pot of result.pots) {
    if (!pot.winnerIds.includes(playerId)) continue
    const share = pot.amountPerWinner + (pot.winnerIds[0] === playerId ? pot.remainder : 0)
    if (pot.uncalled) returned += share
    else won += share
  }
  return { won, returned }
}

/** Everyone who genuinely won chips from someone else this hand. */
export function potWinnerIds(result: HandResult): Set<string> {
  return new Set(result.pots.filter((pot) => !pot.uncalled).flatMap((pot) => pot.winnerIds))
}

function madeHand(result: HandResult, playerId: string): string | null {
  const shown = result.revealed.find((r) => r.playerId === playerId)
  return shown ? HAND_CATEGORY_NAMES[bestHand([...shown.holeCards, ...result.board]).category] : null
}

/**
 * The single authoritative read-out of a finished hand, written as a line or two
 * in the betting menu: who won what, with what. Every hand that was turned over
 * is also on the felt — face up in front of its seat, with what it made written
 * underneath — so this says the result rather than repeating the table.
 */
export function ShowdownSummary({
  result,
  players,
  scale,
}: {
  result: HandResult
  players: PlayerConfig[]
  scale: number
}) {
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? id
  const winners = potWinnerIds(result)
  const lines: { id: string; text: string; ink: Ink }[] = []
  for (const id of winners) {
    const { won, returned } = handTakings(result, id)
    const made = madeHand(result, id)
    const shown = result.revealed.find((r) => r.playerId === id)
    let text = made
      ? `${nameOf(id)} won ${won.toLocaleString()} with ${made} (${shown!.holeCards.map(cardText).join(' ')})`
      : `${nameOf(id)} took ${won.toLocaleString()} uncontested — everyone else folded`
    if (returned > 0) text += ` · ${returned.toLocaleString()} came back uncalled`
    lines.push({ id, text, ink: id === 'you' ? INK.green : INK.dark })
  }
  const yours = result.revealed.find((r) => r.playerId === 'you')
  if (yours && !winners.has('you')) {
    lines.push({
      id: 'you',
      text: `You lost with ${madeHand(result, 'you')} (${yours.holeCards.map(cardText).join(' ')})`,
      ink: { color: '#b83838', shadow: '#f0c8c0' },
    })
  }
  if (lines.length === 0) {
    const { returned } = handTakings(result, 'you')
    lines.push({
      id: 'none',
      text: returned > 0 ? `${returned.toLocaleString()} came back uncalled` : 'Hand over',
      ink: INK.dark,
    })
  }
  return (
    <div data-testid="showdown-summary" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {lines.map((line) => (
        <div key={line.id} data-testid={`showdown-${line.id}`}>
          <PixelText text={line.text} scale={scale} ink={line.ink} wrap />
        </div>
      ))}
    </div>
  )
}

/** The table, painted at its art size into a canvas behind everything on it. */
function TableArt({ theme, layout }: { theme: TableTheme; layout: SceneLayout }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const t = layout.table
  const P = layout.scale
  // Where the emblem and the props must not go.
  const occupied = useMemo(
    () => [...t.seats, t.band, t.board, t.hero, t.heroCards],
    [t],
  )
  const paint = useCallback(() => {
    if (ref.current) paintTable(theme, t.w, t.h, occupied).paint(ref.current)
  }, [theme, t.w, t.h, occupied])
  useEffect(paint, [paint])
  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      width={t.w}
      height={t.h}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: t.w * P,
        height: t.h * P,
        imageRendering: 'pixelated',
        pointerEvents: 'none',
      }}
    />
  )
}

/** Absolute placement of an art-pixel rectangle inside the felt. */
function at(r: Rect, P: number) {
  return { position: 'absolute' as const, left: r.x * P, top: r.y * P, width: r.w * P, height: r.h * P }
}

/** A small framed label on the felt or over a portrait: the pot, a seat's position. */
function Tag({ text, theme, P, ink = INK.dark, style }: { text: string; theme: TableTheme; P: number; ink?: Ink; style?: CSSProperties }) {
  return (
    <span
      style={{
        ...frameStyle(panelFrames(theme).tag, P),
        display: 'inline-flex',
        alignItems: 'center',
        padding: `0 ${P}px`,
        height: (LINE_HEIGHT + 4) * P,
        ...style,
      }}
    >
      <PixelText text={text} scale={P} ink={ink} />
    </span>
  )
}

const ACTION_BG: Record<ActionKind, { bg: string; edge: string; lit: string }> = {
  fold: { bg: '#5a5a6a', edge: '#2a2a36', lit: '#8a8a9a' },
  check: { bg: '#2e6ec8', edge: '#14305f', lit: '#78aaf0' },
  call: { bg: '#2e6ec8', edge: '#14305f', lit: '#78aaf0' },
  bet: { bg: '#2f9a4a', edge: '#0f4020', lit: '#78d890' },
  raise: { bg: '#d08418', edge: '#5a3408', lit: '#f8c868' },
  allin: { bg: '#c82838', edge: '#6a1018', lit: '#f87080' },
}

const STACK_INK: Ink = { color: '#8a4c10', shadow: '#ecd8b0' }

/** The widest a line of text under a seat may be, shadow included. */
const SEAT_LINE = SEAT.w - 1

/**
 * The name on a seat's plate: the whole name if it fits, else the first one.
 * "Nadia Okonkwo" does not fit a six-handed seat; "Nadia" does, and the plate
 * is hers either way.
 */
function plateName(name: string): string {
  const room = (SEAT.w - 2 * SEAT.frame - 1) / TEXT_ZOOM
  return measureText(name) <= room ? name : name.split(' ')[0]
}

/** The zoom a plate line is drawn at: the big one, unless the text would not fit in it. */
function plateZoom(text: string): number {
  return measureText(text) * TEXT_ZOOM <= SEAT.w - 2 * SEAT.frame ? TEXT_ZOOM : 1
}

/** Who posts which blind this hand: the two seats after the button (the button itself heads-up). */
function blindSeats(state: PublicState): Map<string, 'sb' | 'bb'> {
  const seated = state.players.filter((p) => !p.isEliminated)
  const dealerIndex = seated.findIndex((p) => p.isDealer)
  const out = new Map<string, 'sb' | 'bb'>()
  if (dealerIndex === -1 || seated.length < 2) return out
  const headsUp = seated.length === 2
  out.set(seated[(dealerIndex + (headsUp ? 0 : 1)) % seated.length].id, 'sb')
  out.set(seated[(dealerIndex + (headsUp ? 1 : 2)) % seated.length].id, 'bb')
  return out
}

/** The blind chip, drawn in the same round style as the dealer button. */
function BlindChip({ kind, amount, P, style }: { kind: 'sb' | 'bb'; amount?: number; P: number; style?: CSSProperties }) {
  const word = kind === 'sb' ? 'Small blind' : 'Big blind'
  return (
    <img
      data-testid={`blind-chip-${kind}`}
      title={amount ? `${word} ${amount}` : word}
      alt={kind === 'sb' ? 'SB' : 'BB'}
      src={tableMarkerUrl(kind)}
      draggable={false}
      style={{ width: 9 * P, height: 9 * P, imageRendering: 'pixelated', flex: 'none', ...style }}
    />
  )
}

/** The dealer button, as an actual button on the felt. */
function DealerButton({ P, style }: { P: number; style?: CSSProperties }) {
  return (
    <img
      data-testid="dealer-button"
      title="Dealer"
      alt="D"
      src={dealerButtonUrl()}
      draggable={false}
      style={{ width: 9 * P, height: 9 * P, imageRendering: 'pixelated', flex: 'none', ...style }}
    />
  )
}

export function PokerTableView({
  state,
  lastResult,
  yourHole,
  insights,
  personas,
  speech,
  announcement,
  blinds,
  showHeld,
  actionTags,
  layout,
  theme,
}: PokerTableViewProps) {
  const P = layout.scale
  const t = layout.table
  const labels = insights?.showPositions ? positionLabels(state) : null
  const blindOf = blindSeats(state)
  const handOver = !state.handInProgress && lastResult?.handNumber === state.handNumber
  const winners = handOver ? potWinnerIds(lastResult) : new Set<string>()

  const you = state.players.find((p) => p.id === 'you')
  const opponents = state.players.filter((p) => p.id !== 'you')
  const back = theme.cardBack
  const felt = theme.table.felt

  const [inspected, setInspected] = useState<string | null>(null)
  const inspectedSeat = inspected ? opponents.findIndex((o) => o.id === inspected) : -1

  return (
    <div data-testid="felt" style={{ position: 'relative', width: t.w * P, height: t.h * P }}>
      <TableArt theme={theme} layout={layout} />

      {opponents.map((p, i) => {
        const rect = t.seats[i] ?? t.seats[0]
        const revealed = handOver
          ? (lastResult.revealed.find((r) => r.playerId === p.id) ??
            (showHeld ? lastResult.held?.find((h) => h.playerId === p.id) : undefined))
          : undefined
        const personality = personalityFor(p.id, personas?.[p.id])
        const expression: Expression = expressionFor({
          tellKind: p.tell && !p.folded ? (p.tell.kind as Expression) : null,
          isActing: p.isActing,
          wonLast: handOver && winners.has(p.id),
          lostLast: handOver && !winners.has(p.id) && !p.folded,
        })
        const won = handOver && winners.has(p.id) ? handTakings(lastResult, p.id).won : 0
        const made = revealed ? madeHand(lastResult!, p.id) : null
        const tellAlpha = p.tell
          ? Math.min(
              1,
              (insights?.sharpEyes ? Math.max(0.8, 0.4 + p.tell.visibility * 0.6) : 0.4 + p.tell.visibility * 0.6) +
                (insights?.tellClarity ?? 0),
            )
          : 0
        const position = labels?.get(p.id)

        return (
          <div
            key={p.id}
            data-testid={`seat-${p.id}`}
            onClick={() => setInspected((now) => (now === p.id ? null : p.id))}
            style={{
              cursor: 'pointer',
              ...at({ x: rect.x, y: rect.y, w: SEAT.w, h: SEAT_H }, P),
              // No z-index, isolation or opacity here on purpose: each of them
              // makes the seat its own stacking context, and that once let a
              // seat's chips paint over another seat's cards. A folded seat is
              // dimmed with a filter instead.
              filter: p.folded ? 'brightness(0.55) saturate(0.7)' : undefined,
              transition: 'filter 200ms',
            }}
          >
            <Panel
              theme={theme}
              scale={P}
              kind={p.isActing ? 'acting' : 'panel'}
              style={at({ x: 0, y: 0, w: SEAT.w, h: SEAT.panelH }, P)}
            >
              <div
                style={{
                  ...at({ x: (SEAT.w - 2 * SEAT.frame - PORTRAIT_SIZE) / 2, y: 1, w: PORTRAIT_SIZE, h: PORTRAIT_SIZE }, P),
                  backgroundImage: `url(${portraitBackdropUrl(theme.ui.portraitBg)})`,
                  backgroundSize: '100% 100%',
                  imageRendering: 'pixelated',
                }}
              >
                <img
                  src={portraitUrl(personality.look, expression, p.id)}
                  alt={`${p.name}, looking ${expression}`}
                  data-expression={expression}
                  draggable={false}
                  style={{ display: 'block', width: PORTRAIT_SIZE * P, height: PORTRAIT_SIZE * P, imageRendering: 'pixelated' }}
                />
                {(p.isDealer || blindOf.has(p.id)) && (
                  <div style={{ position: 'absolute', right: P, top: P, display: 'flex', gap: P }}>
                    {blindOf.has(p.id) && <BlindChip kind={blindOf.get(p.id)!} amount={blinds?.[blindOf.get(p.id) === 'sb' ? 'small' : 'big']} P={P} />}
                    {p.isDealer && <DealerButton P={P} />}
                  </div>
                )}
                {position && (
                  <Tag text={position} theme={theme} P={P} style={{ position: 'absolute', left: 0, top: 0 }} />
                )}
                {!p.allIn && actionTags?.[p.id] && (
                  <div
                    data-testid={`action-${p.id}`}
                    data-action={actionTags[p.id]}
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      bottom: 2 * P,
                      height: 11 * P,
                      background: ACTION_BG[actionTags[p.id]].bg,
                      boxShadow: `0 ${P}px 0 ${ACTION_BG[actionTags[p.id]].edge}, 0 -${P}px 0 ${ACTION_BG[actionTags[p.id]].lit}`,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <PixelText text={ACTION_WORD[actionTags[p.id]]} scale={P} ink={INK.light} />
                  </div>
                )}
                {p.allIn && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      bottom: 2 * P,
                      height: 11 * P,
                      background: '#c82838',
                      boxShadow: `0 ${P}px 0 #6a1018, 0 -${P}px 0 #f87080`,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <PixelText text="ALL IN" scale={P} ink={INK.light} />
                  </div>
                )}
              </div>
              <div style={{ ...at({ x: 0, y: 50, w: SEAT.w - 2 * SEAT.frame, h: LINE_HEIGHT * TEXT_ZOOM }, P), display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
                <PixelText text={plateName(p.name)} scale={P * TEXT_ZOOM} ink={INK.dark} />
              </div>
              <div
                data-testid={`stack-${p.id}`}
                data-stack={p.stack}
                style={{ ...at({ x: 0, y: 50 + LINE_HEIGHT * TEXT_ZOOM, w: SEAT.w - 2 * SEAT.frame, h: LINE_HEIGHT * TEXT_ZOOM }, P), display: 'flex', justifyContent: 'center' }}
              >
                <PixelText text={p.stack.toLocaleString()} scale={P * plateZoom(p.stack.toLocaleString())} ink={STACK_INK} />
              </div>
            </Panel>
            {winners.has(p.id) && (
              <div className="seat-win" aria-hidden="true" style={{ ...frameStyle(panelFrames(theme).acting, P), ...at({ x: 0, y: 0, w: SEAT.w, h: SEAT.panelH }, P), borderImageSlice: '3', pointerEvents: 'none' }} />
            )}
            {p.isActing && <ActingCursor P={P} theme={theme} />}

            {/* One reserved line under the plate: a tell when there is one, what
                they made at a showdown, and otherwise how they introduce
                themselves. It never changes the seat's size. */}
            <div style={{ ...at({ x: 0, y: SEAT.panelH + SEAT.gap, w: SEAT.w, h: SEAT.tellH }, P), overflow: 'hidden' }}>
              {p.tell && !p.folded ? (
                <div data-testid={`tell-${p.id}`} className={`tell-${p.tell.kind}`}>
                  <PixelText
                    text={fitWords(tellCue(p.tell), SEAT_LINE)}
                    scale={P}
                    wrap
                    maxLines={3}
                    align="center"
                    ink={{ color: `rgba(248, 208, 72, ${tellAlpha})`, shadow: `rgba(40, 24, 8, ${tellAlpha})` }}
                  />
                </div>
              ) : made ? (
                <PixelText text={fitWords(made, SEAT_LINE)} scale={P} wrap maxLines={3} align="center" ink={winners.has(p.id) ? INK.gold : INK.light} />
              ) : null}
            </div>

            <div
              style={{
                ...at({ x: 0, y: SEAT.panelH + SEAT.gap + SEAT.tellH + SEAT.gap, w: SEAT.w, h: SEAT.cardsH }, P),
                display: 'flex',
                justifyContent: 'center',
                gap: 2 * P,
              }}
            >
              {revealed
                ? revealed.holeCards.map((c, ci) => (
                    <Card key={ci} card={c} anim="flip" delayMs={ci * 110} small scale={P} back={back} felt={felt} />
                  ))
                : p.folded
                  ? null
                  : (
                      <>
                        <Card faceDown small scale={P} back={back} felt={felt} />
                        <Card faceDown small scale={P} back={back} felt={felt} />
                      </>
                    )}
            </div>

            {/* What they have out in front of them this street — or, once the
                hand is over, what they took from it. */}
            <div style={at({ x: 0, y: SEAT_H - SEAT.betH, w: SEAT.w, h: SEAT.betH }, P)}>
              {won > 0 ? (
                <ChipStack amount={won} scale={P} height={SEAT.betH} testId={`won-${p.id}`} prefix="+" ink={INK.green} />
              ) : (
                <ChipStack amount={p.streetContribution} scale={P} height={SEAT.betH} testId={`bet-${p.id}`} />
              )}
            </div>
          </div>
        )
      })}

      {/* Who they are: tapped open from a seat, tapped shut again. */}
      {inspectedSeat >= 0 && (() => {
        const p = opponents[inspectedSeat]
        const rect = t.seats[inspectedSeat] ?? t.seats[0]
        const w = Math.min(t.w - 8, 150)
        const x = Math.max(4, Math.min(t.w - 4 - w, rect.x + SEAT.w / 2 - w / 2))
        const personality = personalityFor(p.id, personas?.[p.id])
        const zoom = TEXT_ZOOM
        const lines = wrapText(personality.style, (w - 12) / zoom).length + 1
        return (
          <Panel
            theme={theme}
            scale={P}
            testId={`info-${p.id}`}
            style={{
              ...at({ x, y: rect.y + SEAT.panelH + 2, w, h: lines * LINE_HEIGHT * zoom + 10 }, P),
              zIndex: 5,
              cursor: 'pointer',
              padding: `${2 * P}px ${3 * P}px`,
              boxSizing: 'border-box',
            }}
            onClick={() => setInspected(null)}
          >
            <PixelText text={p.name} scale={P * zoom} ink={INK.dark} />
            <PixelText text={personality.style} scale={P * zoom} wrap ink={INK.dark} />
          </Panel>
        )
      })()}

      {/* The pot, on its own line over the board. */}
      <div style={{ ...at(t.band, P), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span
          key={state.pot}
          data-testid="pot-value"
          data-pot={state.pot}
          className="pot-bump"
          style={{
            ...frameStyle(panelFrames(theme).tag, P),
            display: 'inline-flex',
            alignItems: 'center',
            gap: 2 * P,
            padding: `0 ${2 * P}px`,
            height: (LINE_HEIGHT + 6) * P,
          }}
        >
          <img
            src={chipStackUrl([DENOMINATIONS[4], DENOMINATIONS[5]]).url}
            alt=""
            draggable={false}
            style={{ width: 11 * P, height: chipStackUrl([DENOMINATIONS[4], DENOMINATIONS[5]]).h * P, imageRendering: 'pixelated' }}
          />
          <PixelText text={`Pot ${state.pot.toLocaleString()}`} scale={P} ink={INK.dark} />
          {blinds && <PixelText text={`· Blinds ${blinds.small}/${blinds.big}`} scale={P} ink={INK.blue} />}
        </span>
      </div>
      <HandAnnouncer announcement={announcement ?? null} scale={P} theme={theme} band={t.band} />

      <div data-testid="board" style={{ ...at(t.board, P), display: 'flex', gap: BOARD.gap * P }}>
        {state.board.map((c, i) => (
          <Card key={`${state.handNumber}-${i}`} card={c} anim="deal" delayMs={i * 70} scale={P} zoom={CARD_ZOOM} back={back} felt={felt} />
        ))}
        {Array.from({ length: 5 - state.board.length }).map((_, i) => (
          <Card key={`hidden-${i}`} placeholder scale={P} zoom={CARD_ZOOM} back={back} felt={felt} />
        ))}
      </div>

      {you && (
        <div data-testid="seat-you" style={at(t.hero, P)}>
          <div style={at({ x: 0, y: 0, w: SEAT.w, h: SEAT.betH }, P)}>
            <ChipStack amount={you.streetContribution} scale={P} height={SEAT.betH} testId="bet-you" />
          </div>
          <Panel
            theme={theme}
            scale={P}
            kind={you.isActing ? 'acting' : 'panel'}
            style={{
              ...at({ x: 0, y: SEAT.betH + SEAT.gap, w: SEAT.w, h: HERO.plateH }, P),
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 * P, height: LINE_HEIGHT * TEXT_ZOOM * P }}>
              <PixelText text="You" scale={P * TEXT_ZOOM} ink={INK.dark} />
              {labels?.get('you') && <PixelText text={labels.get('you')!} scale={P} ink={INK.blue} />}
              {blindOf.has('you') && <BlindChip kind={blindOf.get('you')!} amount={blinds?.[blindOf.get('you') === 'sb' ? 'small' : 'big']} P={P} />}
              {you.isDealer && <DealerButton P={P} />}
            </div>
            <div data-testid="stack-you" data-stack={you.stack} style={{ height: LINE_HEIGHT * TEXT_ZOOM * P }}>
              <PixelText text={you.allIn ? 'ALL IN' : you.stack.toLocaleString()} scale={P * plateZoom(you.allIn ? 'ALL IN' : you.stack.toLocaleString())} ink={you.allIn ? INK.red : STACK_INK} />
            </div>
          </Panel>
          {winners.has('you') && (
            <div className="seat-win" aria-hidden="true" style={{ ...frameStyle(panelFrames(theme).acting, P), ...at({ x: 0, y: SEAT.betH + SEAT.gap, w: SEAT.w, h: HERO.plateH }, P), borderImageSlice: '3', pointerEvents: 'none' }} />
          )}
        </div>
      )}
      <div data-testid="hero-cards" style={{ ...at(t.heroCards, P), display: 'flex', gap: BOARD.gap * P }}>
        {yourHole.map((c, i) => (
          <Card key={`${state.handNumber}-${i}`} card={c} anim="deal" delayMs={i * 70} scale={P} zoom={CARD_ZOOM} back={back} felt={felt} />
        ))}
      </div>

      {speech && (() => {
        const index = opponents.findIndex((p) => p.id === speech.playerId)
        if (index < 0) return null
        return <SpeechBubble key={speech.text} seat={t.seats[index]} text={speech.text} playerId={speech.playerId} layout={layout} />
      })()}
    </div>
  )
}

/**
 * The bobbing arrow over whoever is thinking, the cursor a GBA menu puts on the
 * thing that has your attention.
 */
function ActingCursor({ P, theme }: { P: number; theme: TableTheme }) {
  return (
    <svg
      aria-hidden="true"
      className="acting-cursor"
      width={9 * P}
      height={6 * P}
      viewBox="0 0 9 6"
      shapeRendering="crispEdges"
      style={{ position: 'absolute', left: ((SEAT.w - 9) / 2) * P, top: -7 * P, pointerEvents: 'none' }}
    >
      <path d="M0 0h9v1h-9zM1 1h1v1h-1zM7 1h1v1h-1zM2 2h1v1h-1zM6 2h1v1h-1zM3 3h1v1h-1zM5 3h1v1h-1zM4 4h1v1h-1z" fill={theme.ui.outline} />
      <path d="M1 1h7v1h-7zM2 2h5v1h-5zM3 3h3v1h-3zM4 4h1v1h-1z" fill={theme.ui.accent} />
      <path d="M1 1h2v1h-2zM2 2h1v1h-1z" fill="#ffffff" />
    </svg>
  )
}

const BUBBLE_FRAME = { rings: ['#202028', '#f8f8f8'], fill: '#f8f8f8', radius: 2 }

/**
 * Table talk: a white box over the speaker with a tail pointing at them.
 *
 * Placed over the seat and kept on screen, and never over the board or the pot —
 * if a seat's bubble would reach the middle column it is pushed out to the side.
 */
function SpeechBubble({ seat, text, playerId, layout }: { seat: Rect; text: string; playerId: string; layout: SceneLayout }) {
  const P = layout.scale
  const t = layout.table
  const maxInner = 104
  const lines = wrapText(text, maxInner).slice(0, 3)
  const innerW = Math.max(...lines.map((l) => measureText(l) + 1))
  const w = innerW + 2 * 2 + 4
  const h = lines.length * LINE_HEIGHT + 2 * 2 + 2
  const centre = seat.x + seat.w / 2
  // Keep it on screen: the felt sits inside the scene, so it may reach past the
  // table's own edges into the margins either side.
  const minX = -layout.felt.x + 2
  const maxX = layout.w - layout.felt.x - w - 2
  let x = Math.round(Math.min(maxX, Math.max(minX, centre - w / 2)))
  const y = seat.y - h - 3
  const rect = { x, y, w, h }
  // The board is wider than the band over it, so the column is the wider of the two.
  const colX = Math.min(t.band.x, t.board.x)
  const column = { x: colX, y: t.band.y, w: Math.max(t.band.x + t.band.w, t.board.x + t.board.w) - colX, h: t.board.y + t.board.h - t.band.y }
  if (rect.x < column.x + column.w && column.x < rect.x + rect.w && rect.y < column.y + column.h && column.y < rect.y + rect.h) {
    x = centre < t.w / 2 ? Math.min(x, column.x - w - 2) : Math.max(x, column.x + column.w + 2)
  }
  const tailX = Math.round(Math.min(x + w - 6, Math.max(x + 3, centre - 2)))
  return (
    <>
      <div
        data-testid={`speech-${playerId}`}
        className="speech-bubble"
        style={{
          ...frameStyle(BUBBLE_FRAME, P),
          position: 'absolute',
          left: x * P,
          top: y * P,
          width: w * P,
          height: h * P,
          zIndex: 6,
          padding: `${P}px ${2 * P}px`,
          pointerEvents: 'none',
        }}
      >
        {lines.map((line, i) => (
          <PixelText key={i} text={line} scale={P} ink={INK.dark} />
        ))}
      </div>
      <svg
        aria-hidden="true"
        className="speech-bubble"
        width={5 * P}
        height={4 * P}
        viewBox="0 0 5 4"
        shapeRendering="crispEdges"
        style={{ position: 'absolute', left: tailX * P, top: (y + h - 1) * P, zIndex: 7, pointerEvents: 'none' }}
      >
        <path d="M0 0h5v1h-5z" fill="#f8f8f8" />
        <path d="M0 0h1v1h-1zM4 0h1v1h-1zM1 1h3v1h-3zM2 2h1v1h-1z" fill="#202028" />
        <path d="M1 0h3v1h-3zM2 1h1v1h-1z" fill="#f8f8f8" />
      </svg>
    </>
  )
}
