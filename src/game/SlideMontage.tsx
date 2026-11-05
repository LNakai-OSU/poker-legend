import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { Card as CardData } from '../engine/types'
import { playSound } from '../audio/audio'
import { BroadcastShot, type Shot, type ShotWho } from './BroadcastShot'
import { TYPE, UI_FONT } from './pixel/webFont'

/**
 * The first hour of the final, played hand by hand on the broadcast: the
 * hands that took you from a hundred thousand to the ninety you sat on when the
 * aces went in (the opening of the game, which comes straight after).
 *
 * Four hands, each in three shots — the flop, the river, the showdown — with the
 * real cards, the odds going over and both stacks moving as chips go in. Two
 * go your way and two do not, so the slide is slow rather than a cliff, and each
 * is a different kind of loss: a set you walked into, and ace-high that called
 * you down. A shot stays up until the player moves it on (Space, Enter, E, X or
 * a tap); Skip leaves the lot.
 */

const c = (rank: CardData['rank'], suit: CardData['suit']): CardData => ({ rank, suit })

interface Beat {
  /** How many board cards are out. */
  board: 3 | 5
  /** What each of you has put in the hand by now. */
  inYou: number
  inThem: number
  headline: string
  focus: 'you' | 'them'
  expression: Shot['expression']
  odds: [number, number]
  actions: [string, string]
  who: string
  text: string
}

interface Hand {
  them: Exclude<ShotWho, 'you'>
  yours: CardData[]
  theirs: CardData[]
  board: CardData[]
  /** Stacks as the hand is dealt. */
  stacks: [number, number]
  winner: 'you' | 'them'
  beats: [Beat, Beat, Beat]
}

const HANDS: Hand[] = [
  {
    them: 'zeke',
    yours: [c(14, 'spades'), c(13, 'spades')],
    theirs: [c(9, 'hearts'), c(9, 'clubs')],
    board: [c(13, 'diamonds'), c(7, 'clubs'), c(2, 'hearts'), c(5, 'spades'), c(11, 'clubs')],
    stacks: [100000, 132000],
    winner: 'you',
    beats: [
      {
        board: 3, inYou: 20000, inThem: 20000, headline: 'TOP PAIR ON THE FLOP', focus: 'you', expression: 'neutral', odds: [86, 14], actions: ['BET', 'CALL'],
        who: 'Chip', text: 'Ace-king of spades, and the flop brings a king! Zeke has a pair of nines and a camera in his face, and he is calling!',
      },
      {
        board: 5, inYou: 32000, inThem: 32000, headline: 'THE KINGS HOLD TO THE RIVER', focus: 'them', expression: 'thinking', odds: [96, 4], actions: ['RAISE', 'CALL'],
        who: 'Dr. Anand', text: 'Zeke is streaming this to eleven thousand people. One of them is his mother, and she is asking him to fold.',
      },
      {
        board: 5, inYou: 32000, inThem: 32000, headline: 'A GOOD START FOR THE SHORT STACK', focus: 'you', expression: 'won', odds: [100, 0], actions: ['WINNER', ''],
        who: 'Chip', text: 'KINGS HOLD! Sixty-four thousand to our challenger, and he is up to a hundred and thirty-two!',
      },
    ],
  },
  {
    them: 'gaines',
    yours: [c(12, 'hearts'), c(12, 'clubs')],
    theirs: [c(14, 'diamonds'), c(11, 'diamonds')],
    board: [c(8, 'spades'), c(4, 'hearts'), c(12, 'diamonds'), c(3, 'clubs'), c(9, 'hearts')],
    stacks: [132000, 100000],
    winner: 'you',
    beats: [
      {
        board: 3, inYou: 5000, inThem: 5000, headline: 'A SET OF QUEENS ON THE FLOP', focus: 'you', expression: 'stillness', odds: [92, 8], actions: ['BET', 'CALL'],
        who: 'Chip', text: 'Pocket queens and the third queen on the flop! The Reverend has ace-jack and a feeling that he is blessed!',
      },
      {
        board: 5, inYou: 10000, inThem: 10000, headline: 'THE REVEREND TITHES TEN THOUSAND', focus: 'them', expression: 'glance', odds: [100, 0], actions: ['BET', 'CALL'],
        who: 'Dr. Anand', text: 'He pays the boat fund ten percent of every pot he wins. He has not yet won this one.',
      },
      {
        board: 5, inYou: 10000, inThem: 10000, headline: 'QUEENS TAKE THE POT', focus: 'you', expression: 'won', odds: [100, 0], actions: ['WINNER', ''],
        who: 'Chip', text: 'A hundred and forty-two thousand! Our challenger is the second biggest stack in the room, and Bernard has not even noticed!',
      },
    ],
  },
  {
    them: 'gaines',
    yours: [c(13, 'hearts'), c(12, 'hearts')],
    theirs: [c(7, 'spades'), c(7, 'diamonds')],
    board: [c(7, 'clubs'), c(13, 'spades'), c(3, 'diamonds'), c(2, 'spades'), c(9, 'hearts')],
    stacks: [142000, 90000],
    winner: 'them',
    beats: [
      {
        board: 3, inYou: 15000, inThem: 15000, headline: 'THE REVEREND FLOPS A SET', focus: 'them', expression: 'arm-shift', odds: [8, 92], actions: ['BET', 'RAISE'],
        who: 'Dr. Anand', text: 'A pair of kings on the flop for our man, against a pair of sevens that have just become three. He has a draw to nothing. I mean that sincerely.',
      },
      {
        board: 5, inYou: 30000, inThem: 30000, headline: 'ALL THE CHIPS GO IN', focus: 'you', expression: 'thinking', odds: [0, 100], actions: ['CALL', 'ALL IN'],
        who: 'Chip', text: 'And he cannot let go of the kings! Thirty thousand each, and the Reverend turns his cards over!',
      },
      {
        board: 5, inYou: 30000, inThem: 30000, headline: 'GAINES TAKES THE SET', focus: 'them', expression: 'won', odds: [0, 100], actions: ['', 'WINNER'],
        who: 'Chip', text: 'Three sevens take it, and the first rule of a set is that you do not see it coming. Down to a hundred and twelve!',
      },
    ],
  },
  {
    them: 'bernard',
    yours: [c(7, 'spades'), c(6, 'spades')],
    theirs: [c(14, 'hearts'), c(5, 'diamonds')],
    board: [c(2, 'spades'), c(8, 'diamonds'), c(13, 'clubs'), c(4, 'hearts'), c(9, 'clubs')],
    stacks: [112000, 278000],
    winner: 'them',
    beats: [
      {
        board: 3, inYou: 8000, inThem: 8000, headline: 'A BLUFF WITH A STRAIGHT DRAW', focus: 'you', expression: 'lip-twitch', odds: [34, 66], actions: ['BET', 'CALL'],
        who: 'Chip', text: 'Seven-six of spades on a two, eight, king. Our challenger fires, and Bernard, who believes it is Thursday, calls!',
      },
      {
        board: 5, inYou: 22000, inThem: 22000, headline: 'BERNARD CALLS WITH ACE-HIGH', focus: 'them', expression: 'stillness', odds: [0, 100], actions: ['BET', 'CALL'],
        who: 'Dr. Anand', text: 'He has called three streets with no pair at all. The correct reaction to this is to stop bluffing him, and the correct reaction is not available to our man.',
      },
      {
        board: 5, inYou: 22000, inThem: 22000, headline: 'ACE-HIGH IS GOOD', focus: 'them', expression: 'won', odds: [0, 100], actions: ['', 'WINNER'],
        who: 'Chip', text: 'ACE-HIGH! Bernard drags it, and our challenger is down to ninety thousand. Doctor, is that a lot?',
      },
    ],
  },
]

/** Every shot of every hand, flattened, with the stacks and the pot worked out from what has gone in. */
function shots(): Array<{ shot: Shot; hand: number; beat: number }> {
  const out: Array<{ shot: Shot; hand: number; beat: number }> = []
  HANDS.forEach((hand, hi) => {
    hand.beats.forEach((beat, bi) => {
      const showdown = bi === 2
      const pot = beat.inYou + beat.inThem
      const [youStart, themStart] = hand.stacks
      const youStack = youStart - beat.inYou + (showdown && hand.winner === 'you' ? pot : 0)
      const themStack = themStart - beat.inThem + (showdown && hand.winner === 'them' ? pot : 0)
      out.push({
        hand: hi,
        beat: bi,
        shot: {
          headline: beat.headline,
          focus: beat.focus === 'you' ? 'you' : hand.them,
          expression: beat.expression,
          seats: [
            { who: 'you', hole: hand.yours, odds: beat.odds[0], action: beat.actions[0], stack: youStack },
            { who: hand.them, hole: hand.theirs, odds: beat.odds[1], action: beat.actions[1], stack: themStack },
          ],
          board: hand.board.slice(0, beat.board),
          pot,
          blinds: '1K / 2K',
          commentary: `${beat.who}: ${beat.text}`,
        },
      })
    })
  })
  return out
}

const SHOTS = shots()

export function SlideMontage({ onDone }: { onDone: (skipped?: boolean) => void }) {
  const [index, setIndex] = useState(0)
  const finished = useRef(false)
  const current = SHOTS[index]

  const done = (skipped = false) => {
    if (finished.current) return
    finished.current = true
    onDone(skipped)
  }

  const next = () => {
    if (index + 1 < SHOTS.length) setIndex(index + 1)
    else done()
  }

  useEffect(() => {
    // The pot is dragged in, or the cards are turned: a sound for each, so the hand has a rhythm.
    playSound(current.beat === 0 ? 'deal' : current.beat === 1 ? 'chip' : HANDS[current.hand].winner === 'you' ? 'win' : 'lose')
  }, [index])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        done(true)
        return
      }
      if (e.key !== ' ' && e.key !== 'Enter' && e.key !== 'e' && e.key !== 'x') return
      e.preventDefault()
      if (!e.repeat) next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index])

  const shot = useMemo(() => current.shot, [index])

  return (
    <div
      data-testid="slide-montage"
      data-hand={current.hand}
      data-beat={current.beat}
      style={{ position: 'fixed', inset: 0, zIndex: 97, background: '#05040a', animation: 'fade-in 420ms ease-out both' }}
      onClick={next}
    >
      <BroadcastShot shot={shot} />
      <div
        style={{
          position: 'absolute',
          left: 12,
          top: 12,
          color: '#9a9ab0',
          fontFamily: UI_FONT,
          fontSize: TYPE.body,
          pointerEvents: 'none',
        }}
      >
        Hand {current.hand + 1} of {HANDS.length} · Space to continue
      </div>
      <button
        data-testid="reel-skip"
        onClick={(e) => {
          e.stopPropagation()
          done(true)
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
  zIndex: 6,
  background: 'rgba(10,10,16,0.8)',
  color: '#9a9ab0',
  border: '1px solid #4a4a66',
  borderRadius: 4,
  padding: '4px 10px',
  fontFamily: UI_FONT,
  fontSize: TYPE.body,
  cursor: 'pointer',
}
