import { GOAL_ORDER } from './goals'

const money = (n: number) => `$${n.toLocaleString('en-US')}`

/**
 * What the bus-stop sign in each casino town says about the road: the goal here
 * and what it opens. Built from the goals, so a changed win target changes the
 * sign. Kept apart from `route.ts`, which needs the maps this is written into.
 */
export function roadSign(cityId: string): string {
  const stop = GOAL_ORDER.findIndex((g) => g.cityId === cityId)
  if (stop < 0) return 'THE ROAD TO PORTO LUMINA: five casinos, five bosses, one final table.'
  const goal = GOAL_ORDER[stop]
  const next = GOAL_ORDER[stop + 1]
  const boss = goal.bossName
  const head = `THE ROAD TO PORTO LUMINA · CASINO ${stop + 1} OF ${GOAL_ORDER.length}`
  const onward = next ? `ride on to ${next.casino}` : 'ride on to Porto Lumina'
  return `${head}. Win ${money(goal.winTarget)} at the poker tables here, beat ${boss} in the back room, then ${onward}.`
}

/** The last town's sign: there is no boss left, only the tournament. */
export const FINAL_SIGN =
  'THE ROAD TO PORTO LUMINA · THE END OF IT. Win the Poker Legends Tournament and a seat at the Invitational final is yours.'
