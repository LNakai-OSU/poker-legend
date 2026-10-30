import type { StoryFlag } from '../world/flags'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { audio } from '../audio/audio'
import { LESSONS, MISSIONS, findItem } from '../world/content'
import { PERIOD_LABEL } from './time'
import { goalStatus, missionStatus, standing } from './progression'
import { GOAL_ORDER } from '../world/goals'
import { totalOwed, type GameState } from './state'
import { PxButton } from './pixel/ui'
import { PixelText } from './pixel/PixelText'
import { INK } from './pixel/ink'
import { frameStyle, type FrameSpec } from './pixel/frame'
import { chipTopUrl } from './pixel/chips'
import { buttonHeight } from './tableLayout'
import { useViewport } from './useViewport'
import { swallowDoubleClick, useMenuKeys } from './keys'
import { useTouchFirst } from './device'

/**
 * The menu behind the ☰ button: a panel that slides in from the right edge,
 * over the game rather than instead of it.
 *
 * It used to be a page of its own, in the system font, that covered the whole
 * screen — a settings form in the middle of a GBA game. It is a GBA start menu
 * now: a framed box down the side, the pixel font, a cursor that the arrows or
 * W A S D move and Space, E or Enter picks with, and Escape (or a tap outside
 * it) to put it away. The scene underneath stays mounted, so closing it puts
 * the player back in the same hand with the same chips.
 *
 * What it offers is what the game already has: where you stand (day, money,
 * reputation, what you owe), what you carry and have learned, the jobs you
 * have taken on, your record, the sound, and starting over. The map editor is
 * deliberately not here: it lives at `#editor` so that a player never finds
 * their way into it by accident.
 */

type Page = 'main' | 'bag' | 'jobs' | 'goals' | 'record'

/**
 * What the broadcast has told you about the people at the final table. True at
 * the table: Dr. Anand does not guess about the people, only about you.
 */
const SCOUTING: Array<{ flag: StoryFlag; name: string; read: string }> = [
  { flag: 'scoutedDolores', name: 'Lucky Dolores', read: 'Plays by feel and by moon. Calls almost anything: the foot is never wrong.' },
  { flag: 'scoutedGaines', name: 'Reverend Gaines', read: 'Tight. Folds to a river bet seven times in ten. Small bets.' },
  { flag: 'scoutedContessa', name: 'The Contessa', read: 'Wildly aggressive. Bluffs often; gives up to anybody who calls.' },
  { flag: 'scoutedBernard', name: 'Bernard', read: 'Calls everything. Never folds a pair. Sits on the biggest stack.' },
  { flag: 'scoutedZeke', name: 'Zeke "KingPin"', read: 'Plays to the camera. Bluffs when chat is bored, folds when it is scared.' },
]

/** The FRLG menu box: a dark outline, a slate-blue band, a deep fill. */
const NAV_FRAME: FrameSpec = {
  rings: ['#141418', '#6a7cb8', '#3a4778'],
  lower: ['#141418', '#44518a', '#283058'],
  fill: '#12141f',
  radius: 3,
}

/** A thin rule between groups. */
const RULE_FRAME: FrameSpec = { rings: ['#2c3352'], fill: null, radius: 0 }

/** How long it takes to slide away again, matching the CSS. */
const CLOSE_MS = 140

export function SideNav({
  state,
  onClose,
  onNewGame,
}: {
  state: GameState
  onClose: () => void
  onNewGame: () => void
}) {
  const view = useViewport()
  const touch = useTouchFirst()
  const [page, setPage] = useState<Page>('main')
  const [closing, setClosing] = useState(false)
  const [volume, setVolume] = useState(audio.getVolume())
  const [muted, setMuted] = useState(audio.isMuted())
  const [confirming, setConfirming] = useState(false)
  const panel = useRef<HTMLDivElement>(null)

  // The speaker button in the corner and this menu are two views of one switch.
  useEffect(() => {
    const unsubscribe = audio.onChange(setMuted)
    return () => {
      unsubscribe()
    }
  }, [])

  const close = () => {
    if (closing) return
    setClosing(true)
    window.setTimeout(onClose, CLOSE_MS)
  }

  // Escape goes up a page, and off the top page it closes the menu.
  useMenuKeys(panel, {
    onBack: () => {
      if (confirming) setConfirming(false)
      else if (page !== 'main') setPage('main')
      else close()
    },
    trap: true,
    priority: 10,
  })

  // A new page puts the cursor at its top, as opening the menu does.
  const firstPage = useRef(true)
  useEffect(() => {
    if (firstPage.current) {
      firstPage.current = false
      return
    }
    panel.current?.querySelector<HTMLElement>('button:not([disabled])')?.focus({ preventScroll: true })
  }, [page])

  // Big enough to read at a glance; on a short or narrow window, one size down.
  const scale = view.w < 700 || view.h < 760 ? 2 : 3
  const widthCss = Math.min(view.w - 24, scale === 2 ? 300 : 372)
  const frameCss = NAV_FRAME.rings.length * scale
  const padCss = 4 * scale
  const innerArt = Math.floor((widthCss - 2 * frameCss - 2 * padCss) / scale)
  const rowH = buttonHeight(1, scale, view.coarse)
  const closeW = Math.max(18, Math.ceil(36 / scale))

  const owed = totalOwed(state)
  const nextDue = state.debts.length > 0 ? Math.min(...state.debts.map((d) => d.dueOnDay)) - state.day : null

  const item = (key: string, label: string, onClick: () => void, opts: { role?: 'plain' | 'primary' | 'fold' | 'allin'; disabled?: boolean } = {}) => (
    <PxButton
      key={key}
      testId={key}
      lines={[label]}
      scale={scale}
      role={opts.role ?? 'plain'}
      width={innerArt}
      height={rowH}
      disabled={opts.disabled}
      onClick={onClick}
      style={{ alignItems: 'flex-start', paddingLeft: 7 * scale }}
    />
  )

  const heading = (text: string, ink = INK.gold) => (
    <PixelText text={text} scale={scale} ink={ink} style={{ margin: `${2 * scale}px 0 ${1 * scale}px` }} />
  )
  const line = (text: string, ink = INK.light) => <PixelText text={text} scale={scale} ink={ink} wrap />
  const rule = <div aria-hidden="true" style={{ ...frameStyle(RULE_FRAME, scale), height: scale, margin: `${2 * scale}px 0` }} />

  let body: ReactNode
  if (page === 'bag') {
    const items = state.ownedItemIds.map((id) => findItem(id)).filter((i) => i !== null)
    const lessons = state.lessonIds.map((id) => LESSONS[id]).filter((l) => l !== undefined)
    body = (
      <>
        {item('nav-back', '< Back', () => setPage('main'))}
        {heading('Things you carry')}
        {items.length === 0 ? line('Nothing yet. Shops sell suits, shoes and a car.', INK.dim) : null}
        {items.map((i) => (
          <div key={i.id} style={{ display: 'grid', gap: scale }}>
            {line(i.name)}
            {line(i.blurb, INK.dim)}
          </div>
        ))}
        {rule}
        {heading('What Hal has taught you')}
        {lessons.length === 0 ? line('No lessons yet. Hal teaches in Crescent Harbor.', INK.dim) : null}
        {lessons.map((l) => (
          <div key={l.id}>{line(l.name)}</div>
        ))}
      </>
    )
  } else if (page === 'jobs') {
    const taken = state.acceptedMissionIds.map((id) => MISSIONS[id]).filter((m) => m !== undefined)
    body = (
      <>
        {item('nav-back', '< Back', () => setPage('main'))}
        {heading('Jobs')}
        {taken.length === 0 ? line('Nobody has asked you for anything yet.', INK.dim) : null}
        {taken.map((m) => {
          const status = missionStatus(state, m.id)
          return (
            <div key={m.id} style={{ display: 'grid', gap: scale }}>
              {line(m.title, status === 'done' ? INK.dim : INK.light)}
              {line(
                status === 'done' ? 'Done.' : status === 'ready' ? `Done: go back for the $${m.rewardCash.toLocaleString()}.` : m.goalText,
                status === 'ready' ? INK.green : INK.dim,
              )}
            </div>
          )
        })}
      </>
    )
  } else if (page === 'goals') {
    const towns = GOAL_ORDER.filter((g) => state.unlockedCityIds.includes(g.cityId))
    body = (
      <>
        {item('nav-back', '< Back', () => setPage('main'))}
        {heading('Goals')}
        {towns.length === 0 ? line('Get to a casino town first.', INK.dim) : null}
        {towns.map((g) => {
          const status = goalStatus(state, g.cityId)!
          return (
            <div key={g.cityId} data-testid={`goal-${g.cityId}`} style={{ display: 'grid', gap: scale }}>
              {line(g.casino, status.phase === 'done' ? INK.dim : INK.light)}
              {line(status.line, status.phase === 'done' ? INK.green : INK.dim)}
            </div>
          )
        })}
      </>
    )
  } else if (page === 'record') {
    body = (
      <>
        {item('nav-back', '< Back', () => setPage('main'))}
        {heading('Your record')}
        {line(`${state.stats.tablesPlayed} sessions played`)}
        {line(`${state.stats.handsWon} pots won`)}
        {line(`Biggest pot $${state.stats.biggestPot.toLocaleString()}`)}
        {line(`${state.unlockedCityIds.length} towns open to you`)}
        {line(`Reputation ${standing(state)}`)}
        {rule}
        {heading('Scouting')}
        {SCOUTING.filter((s) => state.flags[s.flag]).length === 0 ? (
          line('Nothing yet. The broadcast is still on the road.', INK.dim)
        ) : null}
        {SCOUTING.filter((s) => state.flags[s.flag]).map((s) => (
          <div key={s.flag} data-testid={`scout-${s.flag}`} style={{ display: 'grid', gap: scale }}>
            {line(s.name)}
            {line(s.read, INK.dim)}
          </div>
        ))}
      </>
    )
  } else {
    body = (
      <>
        {line(`Day ${state.day} · ${PERIOD_LABEL[state.period]}`)}
        {line(`$${state.cash.toLocaleString()} · reputation ${standing(state)}`, INK.gold)}
        {owed > 0 &&
          line(
            `Owed $${owed.toLocaleString()}${nextDue === null ? '' : nextDue < 0 ? ' · OVERDUE' : ` · due in ${nextDue} day${nextDue === 1 ? '' : 's'}`}`,
            nextDue !== null && nextDue < 0 ? INK.red : INK.gold,
          )}
        {rule}
        {item('nav-resume', 'Back to the game', close, { role: 'primary' })}
        {item('nav-bag', 'Bag', () => setPage('bag'))}
        {item('nav-jobs', 'Jobs', () => setPage('jobs'))}
        {item('nav-record', 'Record', () => setPage('record'))}
        {item('nav-goals', 'Goals', () => setPage('goals'))}
        {rule}
        {heading('Settings')}
        {item('nav-sound', muted ? 'Sound: off' : 'Sound: on', () => {
          audio.unlock()
          audio.setMuted(!muted)
          if (muted) audio.play('ui')
        })}
        <label
          htmlFor="volume"
          style={{ display: 'grid', gap: 2 * scale, padding: `${scale}px 0` }}
        >
          <PixelText text={`Volume ${Math.round(volume * 100)}%`} scale={scale} />
          <input
            id="volume"
            data-testid="volume-slider"
            className="px-slider"
            type="range"
            min={0}
            max={100}
            aria-label="Volume"
            value={Math.round(volume * 100)}
            onChange={(e) => {
              const next = Number(e.target.value) / 100
              setVolume(next)
              audio.setVolume(next)
            }}
            style={
              {
                width: innerArt * scale,
                height: 11 * scale,
                '--px': `${scale}px`,
                '--thumb': `url(${chipTopUrl()})`,
              } as React.CSSProperties
            }
          />
        </label>
        {confirming ? (
          <>
            {line('This erases your save. Sure?', INK.red)}
            {item('confirm-new-game', 'Erase and start over', onNewGame, { role: 'allin' })}
            {item('nav-keep', 'Keep playing', () => setConfirming(false))}
          </>
        ) : (
          item('new-game', 'New game', () => setConfirming(true), { role: 'fold' })
        )}
      </>
    )
  }

  const title = page === 'main' ? 'Menu' : page === 'bag' ? 'Bag' : page === 'jobs' ? 'Jobs' : page === 'goals' ? 'Goals' : 'Record'

  return (
    <div data-testid="side-nav" className={closing ? 'side-nav closing' : 'side-nav'} style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
      {/* A tap anywhere off the panel puts it away. */}
      <div
        data-testid="side-nav-scrim"
        className="side-nav-scrim"
        onClick={close}
        style={{ position: 'absolute', inset: 0, background: 'rgba(6, 6, 12, 0.55)' }}
      />
      <div
        ref={panel}
        onClickCapture={swallowDoubleClick}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className="side-nav-panel"
        style={{
          ...frameStyle(NAV_FRAME, scale),
          position: 'absolute',
          top: 'max(8px, env(safe-area-inset-top))',
          right: 'max(8px, env(safe-area-inset-right))',
          bottom: 'max(8px, env(safe-area-inset-bottom))',
          width: widthCss,
          padding: padCss,
          display: 'flex',
          flexDirection: 'column',
          gap: 2 * scale,
          overflowY: 'auto',
          overflowX: 'hidden',
          overscrollBehavior: 'contain',
          color: '#f8f8f0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', minHeight: rowH * scale, paddingRight: closeW * scale }}>
          <PixelText text={title.toUpperCase()} scale={scale} ink={INK.blue} />
        </div>
        {body}
        {/* Top right, but last in the order: the cursor starts on the menu, not on X. */}
        <PxButton
          testId="side-nav-close"
          lines={['X']}
          scale={scale}
          height={rowH}
          width={closeW}
          onClick={close}
          role="plain"
          style={{ position: 'absolute', top: padCss, right: padCss }}
        />
        {!touch && (
          <div style={{ marginTop: 'auto', paddingTop: 3 * scale }}>
            <PixelText text="Arrows / WASD move · Space / E pick · Esc close" scale={scale === 3 ? 2 : 1} ink={INK.dim} wrap />
          </div>
        )}
      </div>
    </div>
  )
}
