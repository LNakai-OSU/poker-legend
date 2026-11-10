/**
 * The broadcast's call on an all-in runout: one line a street, from whichever
 * of the two voices it suits (`commentators.ts`). The odds in it are the real
 * ones for the cards on the felt (`engine/equity.ts`), so a call is only ever
 * as dramatic as the maths allows.
 */
export type RunoutStreet = 'preflop' | 'flop' | 'turn'

const pct = (n: number) => `${Math.round(n * 100)}%`
/** "You are", "Mack is": the player's own seat is called You. */
const be = (name: string) => (name === 'You' ? 'are' : 'is')
/** "You need", "Mack needs". */
const does = (name: string, verb: string) => (name === 'You' ? verb : `${verb}s`)

export function runoutCall(names: string[], now: number[], previous: number[] | null, street: RunoutStreet): string {
  if (names.length < 2 || now.length !== names.length) return ''
  const lead = now.indexOf(Math.max(...now))
  const trail = now.indexOf(Math.min(...now))
  const leader = names[lead]
  const trailer = names[trail]
  const headsUp = names.length === 2
  const was = previous ? previous.indexOf(Math.max(...previous)) : lead
  const gap = now[lead] - now[trail]

  if (street === 'preflop') {
    if (headsUp && gap < 0.12) return `Chip: Everyone is in and the cards are face up. A coin flip: ${names[0]} ${pct(now[0])}, ${names[1]} ${pct(now[1])}.`
    return `Chip: Everyone is in and the cards are face up. ${leader} ${be(leader)} the favourite at ${pct(now[lead])}.`
  }

  const changed = lead !== was && now[lead] - (previous?.[lead] ?? 0) > 0.05
  if (street === 'flop') {
    if (changed) return `Chip: And the flop turns it around! ${leader} ${be(leader)} in front now, ${pct(now[lead])}.`
    if (previous && now[lead] - previous[lead] >= 0.15) return `Dr. Anand: ${leader} ${leader === 'You' ? 'go' : 'goes'} up to ${pct(now[lead])}. ${trailer} ${does(trailer, 'need')} help from here.`
    if (previous && previous[trail] - now[trail] >= 0.15) return `Dr. Anand: That flop hurts ${trailer}: down to ${pct(now[trail])}.`
    return `Dr. Anand: Not much has changed. ${leader} still ${does(leader, 'lead')}, ${pct(now[lead])}.`
  }

  // The turn: one card left, so the underdog's share is a count of cards.
  if (now[trail] < 0.005) return `Chip: ${trailer} ${be(trailer)} drawing dead. There is nothing left in the deck.`
  if (changed) return `Chip: The turn! ${leader} ${does(leader, 'take')} the lead, and ${pct(now[lead])} of the deck agrees.`
  if (headsUp) {
    const outs = Math.round(now[trail] * 44)
    return `Dr. Anand: ${trailer} ${trailer === 'You' ? 'have' : 'has'} about ${outs} card${outs === 1 ? '' : 's'} in the deck that save ${trailer === 'You' ? 'you' : 'them'}. One to come.`
  }
  return `Dr. Anand: ${trailer} ${be(trailer)} down to ${pct(now[trail])}. One card to come.`
}
