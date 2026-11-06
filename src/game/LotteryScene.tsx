import { useEffect, useRef, useState } from 'react'
import {
  LOTTO_PAYS,
  LOTTO_PICKS,
  LOTTO_POOL,
  LOTTO_PRICE,
  drawBalls,
  drawTicket,
  lottoPrize,
  matches,
  quickPick,
  readTicket,
  tierFor,
  topPrize,
  winChance,
  type Ticket,
} from '../engine/scratch'
import { defaultRng } from '../engine/rng'
import { playSound } from '../audio/audio'
import { CasinoStage, centreY, place, themeOfTown } from './CasinoStage'
import { CoinBurst } from './CasinoFx'
import { Panel, PxButton } from './pixel/ui'
import { PixelText } from './pixel/PixelText'
import { INK } from './pixel/ink'
import type { GameState } from './state'

const CW = 236
const LOTTERY_FIT = [{ w: CW + 8, h: 196 }]
const BALL_MS = 650

type Tab = 'scratch' | 'draw'

interface Card {
  ticket: Ticket
  revealed: boolean[]
  paid: boolean
}

/** The paytable, for the sign over the counter. */
const LOTTO_TABLE = Object.entries(LOTTO_PAYS)
  .map(([m, pay]) => `${m}: $${pay.toLocaleString()}`)
  .join('  ')

const money = (n: number) => `$${n.toLocaleString()}`

export function LotteryScene({
  state,
  scratchers,
  onResult,
  onBack,
}: {
  state: GameState
  scratchers: number[]
  onResult: (delta: number) => void
  onBack: () => void
}) {
  const theme = themeOfTown(state.cityId)
  const [tab, setTab] = useState<Tab>('scratch')
  const [price, setPrice] = useState(scratchers[0] ?? 1)
  const [card, setCard] = useState<Card | null>(null)
  const [picks, setPicks] = useState<number[]>([])
  const [balls, setBalls] = useState<number[] | null>(null)
  const [shown, setShown] = useState(0)
  const [message, setMessage] = useState('Scratch a card, or pick five numbers for the draw.')
  const [outcome, setOutcome] = useState<'win' | 'lose' | null>(null)
  const [burst, setBurst] = useState(0)
  const ticketCost = useRef(0)

  const drawing = balls !== null && shown < LOTTO_PICKS

  // The balls come out one at a time.
  useEffect(() => {
    if (!balls || shown >= LOTTO_PICKS) return
    const t = setTimeout(() => {
      setShown((n) => n + 1)
      playSound('check')
    }, BALL_MS)
    return () => clearTimeout(t)
  }, [balls, shown])

  // When the last ball is out, the ticket is read.
  useEffect(() => {
    if (!balls || shown < LOTTO_PICKS) return
    const prize = lottoPrize(picks, balls)
    const hit = matches(picks, balls)
    if (prize > 0) {
      onResult(prize)
      setOutcome('win')
      setBurst((b) => b + 1)
      playSound('win')
      setMessage(`${hit} of ${LOTTO_PICKS}. The ticket pays ${money(prize)}.`)
    } else {
      setOutcome('lose')
      playSound('lose')
      setMessage(`${hit} of ${LOTTO_PICKS}. Not a winner.`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown])

  const buyCard = () => {
    if (card && !card.paid) return
    const tier = tierFor(price)
    if (state.cash < tier.price) return
    ticketCost.current = tier.price
    onResult(-tier.price)
    playSound('chip')
    setCard({ ticket: drawTicket(tier, defaultRng), revealed: Array(9).fill(false), paid: false })
    setOutcome(null)
    setMessage(`${tier.name}. ${tier.tagline}`)
  }

  const settleCard = (c: Card): Card => {
    if (c.paid) return c
    const prize = readTicket(c.ticket.cells)
    if (prize > 0) {
      onResult(prize)
      setOutcome('win')
      setBurst((b) => b + 1)
      playSound('win')
      setMessage(`Three ${money(prize)}. You win ${money(prize)}!`)
    } else {
      setOutcome('lose')
      playSound('lose')
      setMessage('No three alike. Better luck on the next one.')
    }
    return { ...c, paid: true }
  }

  const scratch = (i: number) => {
    if (!card || card.paid || card.revealed[i]) return
    playSound('check')
    const revealed = card.revealed.map((r, k) => r || k === i)
    const next = { ...card, revealed }
    setCard(revealed.every(Boolean) ? settleCard(next) : next)
  }

  const scratchAll = () => {
    if (!card || card.paid) return
    setCard(settleCard({ ...card, revealed: Array(9).fill(true) }))
  }

  const toggle = (n: number) => {
    if (drawing) return
    if (balls) {
      setBalls(null)
      setShown(0)
      setOutcome(null)
    }
    setPicks((p) => (p.includes(n) ? p.filter((x) => x !== n) : p.length < LOTTO_PICKS ? [...p, n] : p))
    playSound('check')
  }

  const buyTicket = () => {
    if (picks.length !== LOTTO_PICKS || drawing || state.cash < LOTTO_PRICE) return
    onResult(-LOTTO_PRICE)
    playSound('chip')
    setOutcome(null)
    setBalls(drawBalls(defaultRng))
    setShown(0)
    setMessage('The balls are coming up…')
  }

  /** Walking out with an unscratched card cashes it first: a winner is not forfeit for leaving. */
  const leave = () => {
    if (card && !card.paid) {
      const prize = readTicket(card.ticket.cells)
      if (prize > 0) onResult(prize)
    }
    onBack()
  }

  return (
    <CasinoStage
      kind="lottery"
      theme={theme}
      title="Lottery"
      subtitle={`Cash ${money(state.cash)} · scratchers & the number draw`}
      fits={LOTTERY_FIT}
      onBack={leave}
      backLabel="Walk away"
      testId="lottery-scene"
    >
      {(stage) => {
        const { P, W } = stage
        const tx = Math.round((W - CW) / 2)
        const ty = centreY(stage, 190)
        const btnH = stage.coarse ? Math.ceil(44 / P) : 16
        const live = card && !card.paid
        return (
          <>
            <div style={{ ...place(P, tx, ty, CW), display: 'flex', gap: 2 * P }}>
              <PxButton lines={['Scratchers']} scale={P} role={tab === 'scratch' ? 'raise' : 'plain'} selected={tab === 'scratch'} height={btnH} flex testId="lottery-tab-scratch" onClick={() => setTab('scratch')} />
              <PxButton lines={['Number draw']} scale={P} role={tab === 'draw' ? 'raise' : 'plain'} selected={tab === 'draw'} height={btnH} flex testId="lottery-tab-draw" onClick={() => setTab('draw')} />
            </div>
            <Panel
              theme={theme}
              scale={P}
              style={{ ...place(P, tx, ty + btnH + 3, CW, 24), padding: `${3 * P}px ${4 * P}px`, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
            >
              <span data-testid="lottery-message" data-outcome={outcome ?? ''} style={{ display: 'flex' }}>
                <PixelText
                  text={message}
                  scale={P}
                  wrap
                  maxLines={2}
                  ink={outcome === 'win' ? { color: '#1e7a3c', shadow: '#c8e8d0' } : outcome === 'lose' ? { color: '#a82828', shadow: '#f0d0d0' } : { color: '#5a4a38', shadow: '#d8d0c0' }}
                />
              </span>
            </Panel>
            <div style={{ ...place(P, tx, ty + btnH + 30, CW), display: 'flex', flexDirection: 'column', gap: 2 * P }}>
              {tab === 'scratch' ? (
                <>
                  <div style={{ display: 'flex', gap: 2 * P }}>
                    {scratchers.map((p) => {
                      const tier = tierFor(p)
                      return (
                        <PxButton
                          key={p}
                          lines={[`${money(p)} ${tier.name}`]}
                          scale={P}
                          role={price === p ? 'raise' : 'plain'}
                          selected={price === p}
                          height={btnH}
                          flex
                          disabled={!!live}
                          testId={`scratch-tier-${p}`}
                          onClick={() => setPrice(p)}
                        />
                      )
                    })}
                  </div>
                  <div
                    data-testid="scratch-card"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: 3 * P,
                      padding: 4 * P,
                      background: tierFor(price).stock,
                      border: `${2 * P}px solid ${tierFor(price).ink}`,
                    }}
                  >
                    {(card?.ticket.cells ?? Array(9).fill(null)).map((amount: number | null, i: number) => {
                      const open = !!card && card.revealed[i]
                      const win = open && card!.paid && amount === readTicket(card!.ticket.cells) && amount! > 0
                      return (
                        <button
                          key={i}
                          type="button"
                          data-testid={`scratch-cell-${i}`}
                          data-open={open ? 'true' : 'false'}
                          disabled={!card || card.paid}
                          onClick={() => scratch(i)}
                          style={{
                            height: 20 * P,
                            padding: 0,
                            cursor: card && !card.paid ? 'pointer' : 'default',
                            border: `${P}px solid ${tierFor(price).ink}`,
                            background: open
                              ? win
                                ? '#fff6b0'
                                : '#f4f0e4'
                              : `repeating-linear-gradient(135deg, #c8ccd4 0 ${2 * P}px, #a8acb8 ${2 * P}px ${4 * P}px)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {open && amount !== null ? (
                            <PixelText text={money(amount)} scale={P} ink={{ color: win ? '#1e7a3c' : tierFor(price).ink, shadow: null }} />
                          ) : card ? (
                            <PixelText text="?" scale={P} ink={{ color: '#6a6e7a', shadow: null }} />
                          ) : null}
                        </button>
                      )
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 2 * P }}>
                    <PxButton
                      lines={[`Buy ${money(price)} card`]}
                      scale={P}
                      role="barCall"
                      height={btnH}
                      flex
                      disabled={!!live || state.cash < price}
                      testId="scratch-buy"
                      onClick={buyCard}
                    />
                    <PxButton lines={['Scratch all']} scale={P} role="plain" height={btnH} flex disabled={!live} testId="scratch-all" onClick={scratchAll} />
                  </div>
                  <span style={{ display: 'flex', justifyContent: 'center' }}>
                    <PixelText
                      text={`Top prize ${money(topPrize(tierFor(price)))} · wins ${Math.round(winChance(tierFor(price)) * 100)}% of cards`}
                      scale={P}
                      ink={INK.light}
                    />
                  </span>
                </>
              ) : (
                <>
                  <div data-testid="lotto-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 2 * P }}>
                    {Array.from({ length: LOTTO_POOL }, (_, i) => i + 1).map((n) => {
                      const mine = picks.includes(n)
                      const out = balls ? balls.slice(0, shown).includes(n) : false
                      return (
                        <PxButton
                          key={n}
                          lines={[`${n}`]}
                          scale={P}
                          role={out && mine ? 'barCall' : mine ? 'raise' : 'plain'}
                          selected={mine}
                          height={Math.min(btnH, stage.coarse ? btnH : 12)}
                          flex
                          disabled={drawing}
                          testId={`lotto-n-${n}`}
                          onClick={() => toggle(n)}
                        />
                      )
                    })}
                  </div>
                  <div data-testid="lotto-balls" style={{ display: 'flex', gap: 3 * P, justifyContent: 'center', height: 14 * P, alignItems: 'center' }}>
                    {Array.from({ length: LOTTO_PICKS }, (_, i) => {
                      const ball = balls && i < shown ? balls[i] : null
                      const hit = ball !== null && picks.includes(ball)
                      return (
                        <div
                          key={i}
                          data-testid={`lotto-ball-${i}`}
                          style={{
                            width: 13 * P,
                            height: 13 * P,
                            borderRadius: '50%',
                            border: `${P}px solid #1a1010`,
                            background: ball === null ? '#2a2236' : hit ? '#f8d048' : '#f4f0e4',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {ball !== null ? <PixelText text={`${ball}`} scale={P} ink={{ color: '#1a1010', shadow: null }} /> : null}
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 2 * P }}>
                    <PxButton lines={['Quick pick']} scale={P} role="plain" height={btnH} flex disabled={drawing} testId="lotto-quick" onClick={() => {
                      setBalls(null)
                      setShown(0)
                      setOutcome(null)
                      setPicks(quickPick(defaultRng))
                    }} />
                    <PxButton
                      lines={[picks.length === LOTTO_PICKS ? `Buy ${money(LOTTO_PRICE)} ticket` : `Pick ${LOTTO_PICKS - picks.length} more`]}
                      scale={P}
                      role="barCall"
                      height={btnH}
                      flex
                      disabled={picks.length !== LOTTO_PICKS || drawing || state.cash < LOTTO_PRICE}
                      testId="lotto-buy"
                      onClick={buyTicket}
                    />
                  </div>
                  <span style={{ display: 'flex', justifyContent: 'center' }}>
                    <PixelText text={`Matches pay  ${LOTTO_TABLE}`} scale={P} ink={INK.light} />
                  </span>
                </>
              )}
            </div>
            <CoinBurst burst={burst} W={W} H={stage.H} P={P} x={tx + CW / 2} y={ty + 80} kind="coins" count={30} />
          </>
        )
      }}
    </CasinoStage>
  )
}

