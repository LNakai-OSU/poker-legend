import { talkOf, type Mood } from '../world/talk'

/**
 * What people say about the hand itself, rather than their own action: the
 * cards coming down, you betting, you folding, somebody shoving. Said in the
 * voice of their mood. Who says it, and whether anyone does, is `chooseSpeaker`.
 */
export type Moment = 'flop' | 'turn' | 'river' | 'youRaise' | 'youFold' | 'shove'

export const MOMENT_LINES: Record<Mood, Record<Moment, string[]>> = {
  jolly: {
    flop: ['Ooh, look at that flop!', 'Here come the good cards.', 'Now we are cooking.', 'Somebody likes that, I can tell.'],
    turn: ['The turn! Anything can happen.', 'Fourth street, my favourite.', 'Plot thickens, friends.'],
    river: ['Last card. Say a little prayer.', 'The river giveth, the river taketh.', 'Here we go, here we go!'],
    youRaise: ['Ha! Somebody is feeling brave.', 'Look at you go!', 'Now that is a bet.', 'Bold. I like bold.'],
    youFold: ['Smart. Live to fight.', 'Aw, come back next hand!', 'There goes the fun one.'],
    shove: ['All in! Now it is a party.', 'Oh my. Oh my oh my.', 'Somebody call, please. I want to see.'],
  },
  grumpy: {
    flop: ['Terrible flop.', 'Of course. Of course that is the flop.', 'Hmph. Figures.', 'Nothing for me. As usual.'],
    turn: ['Another one. Great.', 'Turn. Wonderful.', 'Can we speed this up?'],
    river: ['River. Finally.', 'Let us get this over with.', 'Do not look at me like that.'],
    youRaise: ['Big talk.', 'Showing off now, are we?', 'You will regret that.', 'Raise. Sure. Why not.'],
    youFold: ['About time.', 'Fine. Go. Sit down.', 'Coward.'],
    shove: ['Everything? Really?', 'Oh, come on.', 'Some people have no manners.'],
  },
  dry: {
    flop: ['Flop.', 'Interesting.', 'Hm.'],
    turn: ['Turn.', 'Noted.', 'Well.'],
    river: ['River.', 'And so.', 'There it is.'],
    youRaise: ['A bet.', 'Noted.', 'Is that so.'],
    youFold: ['Understandable.', 'Mm.', 'Sensible.'],
    shove: ['That is a lot of chips.', 'Bold.', 'Well. Then.'],
  },
  nervous: {
    flop: ['Oh no. Oh, that is not good. Or is it?', 'Uh, okay. Okay.', 'I do not know what to make of that.'],
    turn: ['Is it my turn? It is not. Sorry.', 'Oh boy.', 'That does not help me. I think.'],
    river: ['Please be nice. Please.', 'I cannot watch.', 'Okay. Okay okay okay.'],
    youRaise: ['Oh, uh. That is a lot.', 'You are not bluffing, are you?', 'Gulp.'],
    youFold: ['Wait, you folded? Should I have?', 'Oh. Good for you, I guess.', 'Smart. I think.'],
    shove: ['All of it?! I am going to be sick.', 'Whoa. Whoa whoa whoa.', 'Nobody told me it would be like this.'],
  },
}

/** How likely a speaker is, relative to their chattiness, to pipe up at a street (it is only a card). */
const STREET_DAMPING = 0.55

/**
 * Who, if anyone, says something at this moment.
 *
 * At most one person — a table where everyone answers every card is noise — and
 * the chattier a person is the likelier they are to be the one. `roll` is a
 * source of numbers in [0, 1), so it can be tested.
 */
export function chooseSpeaker(
  candidates: string[],
  moment: Moment,
  roll: () => number,
): { playerId: string; text: string } | null {
  const damp = moment === 'flop' || moment === 'turn' || moment === 'river' ? STREET_DAMPING : 0.8
  const hopefuls = candidates.filter((id) => {
    const talk = talkOf(id)
    if (talk.chatty <= 0) return false
    // Zeke goes mute for the river (a bit of his character), others do not.
    if (id === 'zeke' && moment === 'river') return false
    return roll() < talk.chatty * damp
  })
  if (hopefuls.length === 0) return null
  // Of those who wanted to, the chattiest gets there first.
  hopefuls.sort((a, b) => talkOf(b).chatty - talkOf(a).chatty)
  const playerId = hopefuls[0]
  const pool = MOMENT_LINES[talkOf(playerId).mood][moment]
  return { playerId, text: pool[Math.floor(roll() * pool.length)] }
}

/** Whether somebody says what they did (their own bet, fold, call), given how talkative they are. */
export function speaksAboutOwnAction(id: string, roll: () => number): boolean {
  const { chatty } = talkOf(id)
  return chatty > 0 && roll() < Math.min(1, chatty * 0.85)
}
