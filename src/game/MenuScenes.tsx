import { useState, type ReactNode } from 'react'
import { LESSONS, SHOPS, SPONSORS } from '../world/content'
import { travelOptions } from './progression'
import { totalOwed, type CityId, type Debt, type GameState } from './state'
import type { ShopItemDef } from '../world/types'

// --- shared shell -----------------------------------------------------------

export function MenuScreen({
  title,
  subtitle,
  children,
  onBack,
  backLabel = 'Back',
}: {
  title: string
  subtitle?: ReactNode
  children: ReactNode
  onBack: () => void
  backLabel?: string
}) {
  return (
    // A menu that only fills the top ~45% of the screen reads as a page that
    // failed to load. The panel is centred vertically instead, and still grows
    // and scrolls normally once its content is taller than the viewport.
    <div style={{
      width: '100vw', minHeight: '100vh', background: '#0f0f17', color: '#e8e8f0',
      fontFamily: 'monospace', padding: 'clamp(14px, 4vw, 32px)', boxSizing: 'border-box', overflowX: 'hidden',
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
    }}>
      <div style={{ width: '100%', maxWidth: 720, margin: '0 auto' }}>
        <h2 style={{ marginTop: 0 }}>{title}</h2>
        {subtitle && <div style={{ color: '#9a9ab0', marginBottom: 20 }}>{subtitle}</div>}
        {children}
        <button style={{ ...buttonStyle, marginTop: 28 }} onClick={onBack}>{backLabel}</button>
      </div>
    </div>
  )
}

function Row({ children }: { children: ReactNode }) {
  return (
    <div style={{
      border: '1px solid #2e2e40', borderRadius: 8, padding: 'clamp(10px, 3vw, 16px)', marginBottom: 12,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap',
    }}>
      {children}
    </div>
  )
}

export const buttonStyle = {
  background: '#3a9d5c', color: '#fff', border: 'none', borderRadius: 4,
  padding: '8px 16px', fontFamily: 'monospace', cursor: 'pointer', fontSize: 14,
} as const

const disabledButtonStyle = { ...buttonStyle, background: '#2e2e40', color: '#7a7a90', cursor: 'not-allowed' } as const

// --- shop -------------------------------------------------------------------

export function ShopScene({
  shopId,
  state,
  onBuy,
  onBack,
}: {
  shopId: string
  state: GameState
  onBuy: (item: ShopItemDef) => void
  onBack: () => void
}) {
  const shop = SHOPS[shopId]
  return (
    <MenuScreen title={shop.name} subtitle={`Cash: $${state.cash.toLocaleString()}`} onBack={onBack} backLabel="Leave">
      {shop.items.map((item) => {
        const owned = state.ownedItemIds.includes(item.id)
        const affordable = state.cash >= item.price
        return (
          <Row key={item.id}>
            <div>
              <div>{item.name} &mdash; ${item.price.toLocaleString()}</div>
              <div style={{ color: '#9a9ab0', fontSize: 13 }}>{item.blurb}</div>
              {item.effect?.kind === 'travelDiscount' && (
                <div style={{ color: '#8ad4ff', fontSize: 12 }}>
                  Cuts travel costs by {Math.round(item.effect.value * 100)}%
                </div>
              )}
              {item.effect?.kind === 'dressCode' && (
                <div style={{ color: '#8ad4ff', fontSize: 12 }}>Dress code level {item.effect.level}</div>
              )}
            </div>
            <button
              style={owned || !affordable ? disabledButtonStyle : buttonStyle}
              disabled={owned || !affordable}
              onClick={() => onBuy(item)}
            >
              {owned ? 'Owned' : affordable ? 'Buy' : 'Too expensive'}
            </button>
          </Row>
        )
      })}
    </MenuScreen>
  )
}

// --- mentor -----------------------------------------------------------------

export function MentorScene({
  state,
  onLearn,
  onBack,
}: {
  state: GameState
  onLearn: (lessonId: string) => void
  onBack: () => void
}) {
  const [reading, setReading] = useState<string | null>(null)
  const lesson = reading ? LESSONS[reading] : null

  if (lesson) {
    return (
      <MenuScreen title={lesson.name} onBack={() => setReading(null)} backLabel="Back to lessons">
        {lesson.teaching.map((line, i) => (
          <p key={i} style={{ lineHeight: 1.6 }}>{line}</p>
        ))}
        <div style={{ color: '#8ad4ff', marginTop: 16 }}>{lesson.unlocks}</div>
      </MenuScreen>
    )
  }

  return (
    <MenuScreen
      title="Hal &mdash; Lessons"
      subtitle={`Cash: $${state.cash.toLocaleString()}`}
      onBack={onBack}
      backLabel="Leave"
    >
      {Object.values(LESSONS).map((item) => {
        const learned = state.lessonIds.includes(item.id)
        const affordable = state.cash >= item.price
        return (
          <Row key={item.id}>
            <div>
              <div>{item.name} &mdash; ${item.price.toLocaleString()}</div>
              <div style={{ color: '#9a9ab0', fontSize: 13 }}>{item.unlocks}</div>
            </div>
            {learned ? (
              <button style={buttonStyle} onClick={() => setReading(item.id)}>Review</button>
            ) : (
              <button
                style={affordable ? buttonStyle : disabledButtonStyle}
                disabled={!affordable}
                onClick={() => {
                  onLearn(item.id)
                  setReading(item.id)
                }}
              >
                {affordable ? 'Learn' : 'Too expensive'}
              </button>
            )}
          </Row>
        )
      })}
    </MenuScreen>
  )
}

// --- sponsor ----------------------------------------------------------------

export function SponsorScene({
  sponsorId,
  state,
  onTakeStake,
  onRepay,
  onBack,
}: {
  sponsorId: string
  state: GameState
  onTakeStake: () => void
  onRepay: (debtId: string) => void
  onBack: () => void
}) {
  const sponsor = SPONSORS[sponsorId]
  const theirDebts = state.debts.filter((d) => d.sponsorId === sponsorId)
  const owed = totalOwed(state)

  return (
    <MenuScreen
      title={sponsor.name}
      subtitle={`Cash: $${state.cash.toLocaleString()}${owed > 0 ? ` · Owed: $${owed.toLocaleString()}` : ''}`}
      onBack={onBack}
      backLabel="Walk away"
    >
      {theirDebts.length > 0 ? (
        theirDebts.map((debt: Debt) => {
          const canPay = state.cash >= debt.owed
          const overdue = state.day > debt.dueOnDay
          return (
            <Row key={debt.id}>
              <div>
                <div>You owe ${debt.owed.toLocaleString()}</div>
                <div style={{ color: overdue ? '#e05a5a' : '#9a9ab0', fontSize: 13 }}>
                  {overdue ? 'Past due. They are already looking for you.' : `Due on day ${debt.dueOnDay}`}
                </div>
              </div>
              <button
                style={canPay ? buttonStyle : disabledButtonStyle}
                disabled={!canPay}
                onClick={() => onRepay(debt.id)}
              >
                {canPay ? 'Pay it back' : 'Not enough cash'}
              </button>
            </Row>
          )
        })
      ) : (
        <Row>
          <div>
            <div>
              Stake: ${sponsor.principal.toLocaleString()} &rarr; owe $
              {Math.round(sponsor.principal * (1 + sponsor.interestRate)).toLocaleString()}
            </div>
            <div style={{ color: '#9a9ab0', fontSize: 13 }}>
              Due in {sponsor.dueInDays} days. Days pass when you play a session or travel.
            </div>
          </div>
          <button style={buttonStyle} onClick={onTakeStake}>Take the stake</button>
        </Row>
      )}
    </MenuScreen>
  )
}

// --- travel -----------------------------------------------------------------

export function TravelScene({
  state,
  onTravel,
  onBack,
}: {
  state: GameState
  onTravel: (cityId: CityId) => void
  onBack: () => void
}) {
  const options = travelOptions(state)
  const hunted = state.huntedInCityId === state.cityId

  return (
    <MenuScreen
      title="Travel"
      subtitle={
        hunted
          ? 'Leaving town now would shake whoever they sent.'
          : `Cash: $${state.cash.toLocaleString()} · Day ${state.day}`
      }
      onBack={onBack}
      backLabel="Stay here"
    >
      {options.map((option) => (
        <Row key={option.cityId}>
          <div>
            <div>{option.name} &mdash; ${option.cost.toLocaleString()}</div>
            <div style={{ color: '#9a9ab0', fontSize: 13 }}>{option.blurb}</div>
            {option.locked && <div style={{ color: '#e05a5a', fontSize: 12 }}>{option.lockReason}</div>}
          </div>
          <button
            style={option.locked ? disabledButtonStyle : buttonStyle}
            disabled={option.locked}
            onClick={() => onTravel(option.cityId)}
          >
            Go
          </button>
        </Row>
      ))}
    </MenuScreen>
  )
}
