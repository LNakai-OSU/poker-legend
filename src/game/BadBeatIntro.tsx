import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { Card as CardData } from '../engine/types'
import type { HandResult, PublicPlayerView, PublicState } from '../engine/table'
import { playSound } from '../audio/audio'
import { HERO_FIGURE } from '../overworld/casting'
import { drawPerson, type WalkFrame } from '../overworld/characterArt'
import { PokerTableView } from './PokerTableView'
import { TableStage } from './TableStage'
import { TABLE_THEMES } from './tableThemes'
import type { Announcement } from './HandAnnouncer'
import type { SceneLayout, SceneNeeds } from './tableLayout'
import { DialogueBox } from './DialogueBox'
import { Panel, PxLine } from './pixel/ui'
import { INK } from './pixel/ink'

/**
 * The opening of the game: the final of the Legends Invitational, on the real
 * table, with the player losing a pot they should have won.
 *
 * Nothing here is a picture. It is the same table the game plays at, fed a
 * hand that is written out below: pocket aces against a suited king-queen, a
 * flop that gives the other seat a draw, and a flush on the river. Then the
 * rig fails — the room goes dark in stutters — and the player stands up from
 * the chair and walks out of the light, saying why. The next scene is the
 * bathroom.
 *
 * Space (or tapping) moves it on; Skip leaves it.
 */

const THEME = TABLE_THEMES.finale
const c = (rank: CardData['rank'], suit: CardData['suit']): CardData => ({ rank, suit })

const YOUR_HAND = [c(14, 'spades'), c(14, 'hearts')]
const HER_HAND = [c(13, 'diamonds'), c(12, 'diamonds')]
const BOARD = [c(9, 'diamonds'), c(5, 'clubs'), c(2, 'diamonds'), c(11, 'spades'), c(7, 'diamonds')]

const NEEDS: SceneNeeds = {
  kind: 'cash',
  opponents: 5,
  sampleAmount: '120,000',
  infoTexts: ['Chip: A very long sentence from the broadcast booth to hold the room for the lines.', 'Dr. Anand: And a second line that is just as long as the first one was.'],
  title: 'The Legends Invitational · Final Table',
  subtitle: 'LIVE · 6 left',
}

type Who = 'you' | 'nadia' | 'gaines' | 'contessa' | 'bernard' | 'zeke'
const ORDER: Who[] = ['nadia', 'gaines', 'contessa', 'bernard', 'zeke']
const NAMES: Record<Who, string> = {
  you: 'You',
  nadia: 'Nadia Okonkwo',
  gaines: 'Gaines',
  contessa: 'Contessa',
  bernard: 'Bernard',
  zeke: 'Zeke "KingPin"',
}

interface Frame {
  /** How long it stays before it moves on by itself. */
  ms: number
  street: PublicState['street']
  boardCount: number
  pot: number
  /** Chips each seat has in front of it this street. */
  bets: Partial<Record<Who, number>>
  stacks: Record<Who, number>
  folded: Who[]
  acting?: Who
  showdown?: boolean
  /** The broadcast, over the felt. */
  line: { who: string; text: string }
  announce?: Announcement
  sound?: 'deal' | 'chip' | 'win' | 'lose'
}

const START = { you: 90000, nadia: 100000, gaines: 120000, contessa: 100000, bernard: 300000, zeke: 100000 }

const FRAMES: Frame[] = [
  {
    ms: 5200,
    street: 'preflop',
    boardCount: 0,
    pot: 21000,
    bets: { you: 12000, contessa: 12000 },
    stacks: { ...START, you: START.you - 12000, contessa: START.contessa - 12000 },
    folded: ['nadia', 'gaines', 'bernard', 'zeke'],
    line: { who: 'Chip', text: 'Final table, six players left, and the short stack of the room has just picked up pocket aces!' },
    announce: { key: 'pre', text: 'Pocket aces', detail: 'Pot 21,000', tone: 'good' },
    sound: 'deal',
  },
  {
    ms: 5200,
    street: 'flop',
    boardCount: 3,
    pot: 52000,
    bets: { you: 18000, contessa: 18000 },
    stacks: { ...START, you: START.you - 30000, contessa: START.contessa - 30000 },
    folded: ['nadia', 'gaines', 'bernard', 'zeke'],
    line: { who: 'Dr. Anand', text: 'Nine, five, deuce, two of them diamonds. She has a king and a queen of diamonds. She has nine outs. That is nineteen percent.' },
    announce: { key: 'flop', text: 'Flop', detail: 'Pot 52,000', tone: 'neutral' },
    sound: 'deal',
  },
  {
    ms: 4800,
    street: 'turn',
    boardCount: 4,
    pot: 112000,
    bets: { you: 30000, contessa: 30000 },
    stacks: { ...START, you: START.you - 60000, contessa: START.contessa - 60000 },
    folded: ['nadia', 'gaines', 'bernard', 'zeke'],
    line: { who: 'Chip', text: 'A jack of spades on the turn. Nothing! The aces are still best! She calls the bet!' },
    announce: { key: 'turn', text: 'Turn', detail: 'Pot 112,000', tone: 'neutral' },
    sound: 'chip',
  },
  {
    ms: 5400,
    street: 'river',
    boardCount: 5,
    pot: 165000,
    bets: { you: 75000, contessa: 75000 },
    stacks: { ...START, you: 15000, contessa: START.contessa - 135000 > 0 ? START.contessa - 135000 : 0 },
    folded: ['nadia', 'gaines', 'bernard', 'zeke'],
    line: { who: 'Dr. Anand', text: 'The river. The seven of diamonds. Oh no. Oh, I am so sorry. That is — that is a flush.' },
    announce: { key: 'river', text: 'River', detail: 'The seven of diamonds', tone: 'tense' },
    sound: 'deal',
  },
  {
    ms: 6200,
    street: 'showdown',
    boardCount: 5,
    pot: 165000,
    bets: {},
    stacks: { ...START, you: 15000, contessa: 250000 },
    folded: ['nadia', 'gaines', 'bernard', 'zeke'],
    showdown: true,
    line: { who: 'Chip', text: 'KING-QUEEN OF DIAMONDS! SHE HIT! The Contessa takes a hundred and sixty-five thousand off pocket aces! That is a bad beat for the books!' },
    announce: { key: 'beat', text: 'The Contessa wins', detail: 'A flush · 165,000', tone: 'bad' },
    sound: 'lose',
  },
]

/** Everything the table needs to draw one frame of the hand. */
function stateOf(f: Frame, handNumber: number): { state: PublicState; result: HandResult | null } {
  const dealer: Who = 'zeke'
  const players: PublicPlayerView[] = (['you', ...ORDER] as Who[]).map((id) => ({
    id,
    name: NAMES[id],
    isHuman: id === 'you',
    stack: f.stacks[id],
    folded: f.folded.includes(id),
    allIn: false,
    streetContribution: f.bets[id] ?? 0,
    isActing: f.acting === id,
    isDealer: id === dealer,
    isEliminated: false,
  }))
  const state: PublicState = {
    street: f.street,
    board: BOARD.slice(0, f.boardCount),
    pot: f.pot,
    currentBet: Math.max(0, ...Object.values(f.bets)),
    minRaiseTo: 4000,
    players,
    actingPlayerId: f.acting ?? null,
    handInProgress: !f.showdown,
    handNumber,
  }
  const result: HandResult | null = f.showdown
    ? {
        handNumber,
        board: BOARD,
        pots: [{ amount: f.pot, eligiblePlayerIds: ['you', 'contessa'], uncalled: false, winnerIds: ['contessa'], amountPerWinner: f.pot, remainder: 0 }],
        revealed: [
          { playerId: 'you', holeCards: YOUR_HAND, categoryName: 'Pair' },
          { playerId: 'contessa', holeCards: HER_HAND, categoryName: 'Flush' },
        ],
        bustedPlayerIds: [],
      }
    : null
  return { state, result }
}

type Phase = 'hand' | 'dark' | 'excuse' | 'walk'

/** The room dies in stutters: lamps drop and catch, drop and catch, and are gone. */
const BLACKOUT_STEPS = [0, 0.35, 0.05, 0.55, 0.15, 0.8, 0.35, 0.96]
const BLACKOUT_MS = 2600

export function BadBeatIntro({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>('hand')
  const [index, setIndex] = useState(0)
  const [dark, setDark] = useState(0)
  const [lineAt, setLineAt] = useState(0)
  const finished = useRef(false)
  const frame = FRAMES[index]

  const done = () => {
    if (finished.current) return
    finished.current = true
    onDone()
  }

  // The hand moves on by itself; Space is for the impatient.
  const nextFrame = () => {
    if (index + 1 < FRAMES.length) setIndex(index + 1)
    else {
      setPhase('dark')
      setDark(0)
    }
  }
  useEffect(() => {
    if (phase !== 'hand') return
    if (frame.sound) playSound(frame.sound)
    setLineAt(performance.now())
    const timer = window.setTimeout(nextFrame, frame.ms)
    return () => window.clearTimeout(timer)
  }, [phase, index])

  // The blackout: steps of darkness over a couple of seconds, then the excuse.
  useEffect(() => {
    if (phase !== 'dark') return
    playSound('alarm')
    const timers: number[] = []
    BLACKOUT_STEPS.forEach((level, i) => {
      timers.push(window.setTimeout(() => setDark(level), (BLACKOUT_MS / BLACKOUT_STEPS.length) * i))
    })
    timers.push(window.setTimeout(() => setPhase('excuse'), BLACKOUT_MS + 700))
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [phase])

  // Skipping: Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      done()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Space moves the hand along while it is playing.
  useEffect(() => {
    if (phase !== 'hand') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== ' ' && e.key !== 'Enter' && e.key !== 'e' && e.key !== 'x') return
      e.preventDefault()
      if (!e.repeat) nextFrame()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, index])

  const { state, result } = useMemo(() => stateOf(frame, 1), [frame])

  const lineOf = (line: Frame['line']) => `${line.who}: ${line.text}`

  return (
    <div
      data-testid="bad-beat-intro"
      data-phase={phase}
      data-frame={index}
      style={{ position: 'fixed', inset: 0, zIndex: 97, background: '#05040a', animation: 'fade-in 420ms ease-out both' }}
      onClick={() => phase === 'hand' && nextFrame()}
    >
      <TableStage
        theme={THEME}
        needs={NEEDS}
        felt={(layout) => (
          <div style={{ position: 'relative' }}>
            <PokerTableView
              state={state}
              lastResult={result}
              yourHole={phase === 'walk' ? [] : YOUR_HAND}
              announcement={phase === 'hand' ? frame.announce : null}
              blinds={{ small: 1000, big: 2000 }}
              layout={layout}
              theme={THEME}
            />
            {phase === 'walk' && <WalkOff layout={layout} />}
          </div>
        )}
        dock={(layout) => (
          <Panel
            theme={THEME}
            scale={layout.scale}
            testId="dock"
            style={{ minHeight: layout.dock.h * layout.scale, padding: 3 * layout.scale, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3 * layout.scale }}
          >
            {phase === 'hand' && (
              <PxLine
                key={`${index}-${lineAt}`}
                scale={layout.scale}
                wrap
                align="center"
                ink={{ color: '#2a5a9a', shadow: '#c8d8f0' }}
                testId="broadcast-line"
                text={lineOf(frame.line)}
              />
            )}
            {phase !== 'hand' && (
              <PxLine scale={layout.scale} wrap align="center" ink={INK.dark} text={phase === 'dark' ? 'Chip: WHAT HAPPENED TO THE LIGHTS!' : 'Technical difficulty. Please stand by.'} />
            )}
          </Panel>
        )}
      />
      {/* The rig failing: a black sheet that flickers up, with a red emergency strip along the floor. */}
      <div
        aria-hidden="true"
        data-testid="blackout"
        data-dark={dark}
        style={{
          position: 'absolute',
          inset: 0,
          background: '#000',
          opacity: phase === 'excuse' || phase === 'walk' ? 0.94 : dark,
          transition: 'opacity 70ms steps(2)',
          pointerEvents: 'none',
        }}
      />
      {(phase === 'excuse' || phase === 'walk') && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: '18%',
            background: 'linear-gradient(to top, rgba(200,40,40,0.35), transparent)',
            animation: 'hunt-pulse 1.4s ease-in-out infinite',
            pointerEvents: 'none',
          }}
        />
      )}
      {phase === 'excuse' && (
        <DialogueBox
          key="excuse"
          speaker="You"
          lines={['Excuse me. I just need a minute.', 'Sorry. Sorry, I... I need the bathroom.']}
          onFinish={() => setPhase('walk')}
        />
      )}
      {phase === 'walk' && <WalkTimer onDone={done} />}
      <button
        data-testid="reel-skip"
        onClick={(e) => {
          e.stopPropagation()
          done()
        }}
        style={skipStyle}
      >
        Skip ▸▸
      </button>
    </div>
  )
}

const skipStyle: CSSProperties = {
  position: 'absolute',
  top: 12,
  right: 12,
  zIndex: 2,
  background: 'rgba(10,10,16,0.8)',
  color: '#9a9ab0',
  border: '1px solid #4a4a66',
  borderRadius: 4,
  padding: '4px 10px',
  fontFamily: 'monospace',
  cursor: 'pointer',
}

/** The cut to the corridor comes a moment after you start walking. */
function WalkTimer({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onDone, 3200)
    return () => window.clearTimeout(t)
  }, [])
  return null
}

/**
 * The player, in the same sprite the street uses, stands from the chair and
 * walks out of the light: three frames of the walk, left across the floor.
 */
function WalkOff({ layout }: { layout: SceneLayout }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const P = layout.scale
  const start = layout.table.hero
  const widthPx = layout.table.w * P
  const heightPx = layout.table.h * P
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.imageSmoothingEnabled = false
    let raf = 0
    const t0 = performance.now()
    const tick = () => {
      const t = performance.now() - t0
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      // Up out of the chair for the first moment, then away to the left.
      const standing = Math.min(1, t / 500)
      const walk = Math.max(0, t - 500)
      const x = (start.x + 4) * P - (walk / 3000) * start.x * P * 1.6
      const y = (start.y - 24 * standing) * P
      const frame = (Math.floor(walk / 160) % 3) as WalkFrame
      drawPerson(ctx, HERO_FIGURE, walk > 0 ? 'left' : 'up', walk > 0 ? frame : 0, { x, y, scale: P })
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [P, start.x, start.y])
  return (
    <canvas
      ref={ref}
      data-testid="walk-off"
      width={widthPx}
      height={heightPx}
      style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none', imageRendering: 'pixelated', zIndex: 3 }}
    />
  )
}

