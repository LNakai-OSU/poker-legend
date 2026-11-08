import type { TexasHoldEmTable } from '../engine/table'
import type { Rng } from '../engine/rng'
import { blindsForRound, isFinalTable, replacementStack, roundOfNextHand } from '../engine/tournament'
import { seatsOf } from '../world/characters'
import type { OpponentDef, TableDef } from '../world/types'

export interface TournamentStep {
  /** The round the next hand belongs to. */
  round: number
  /** Set when the blinds just went up (or the table has just become the final one). */
  newBlinds?: { small: number; big: number }
  finalTable: boolean
  /** Chairs that changed hands: who left, who sat down and with how much. */
  replaced: Array<{ outId: string; outName: string; newcomer: OpponentDef; stack: number }>
}

/**
 * What happens between hands at a tournament table: the blinds go up on the
 * first hand of a round, and until the rounds are over a knocked-out player's
 * chair goes to somebody new — from the table's pool, not anyone who has sat
 * here yet if the pool allows — with a stack to suit the stage. Applied to the
 * engine here; the scene only has to show it.
 */
export function stepTournament(
  engine: TexasHoldEmTable,
  table: TableDef,
  currentBigBlind: number,
  everSeated: Set<string>,
  rng: Rng,
  /** A character the story has put at the final table (Kit, if you left him to Wen's money). */
  guestId?: string,
): TournamentStep {
  const rules = table.tournament
  if (!rules) throw new Error(`${table.id} is not a tournament`)
  const played = engine.getState().handNumber
  const round = roundOfNextHand(rules, played)
  const blinds = blindsForRound(rules, round)
  const finalTable = isFinalTable(rules, played)
  const step: TournamentStep = { round, finalTable, replaced: [] }

  if (blinds.big !== currentBigBlind) {
    engine.setBlinds(blinds.small, blinds.big)
    step.newBlinds = blinds
  }
  if (finalTable) {
    // The story's guest sits down once, in the chair of whoever is shortest.
    if (guestId && !everSeated.has(guestId) && !engine.getState().players.some((p) => p.id === guestId)) {
      const others = engine.getState().players.filter((p) => p.id !== 'you')
      const out = others.reduce((a, b) => (b.stack < a.stack ? b : a))
      const [guest] = seatsOf(table, [guestId])
      const stack = replacementStack(rng, engine.getState().players.filter((p) => p.id !== out.id).map((p) => p.stack), blinds.big)
      everSeated.add(guest.id)
      engine.replacePlayer(out.id, { id: guest.id, name: guest.name, isHuman: false, skillTier: guest.skillTier, archetype: guest.archetype, startingStack: stack })
      step.replaced.push({ outId: out.id, outName: out.name, newcomer: guest, stack })
    }
    return step
  }

  for (const out of engine.getState().players.filter((p) => p.id !== 'you' && p.stack <= 0)) {
    const seated = engine.getState().players
    const unseated = (table.walkIns ?? []).filter((ref) => {
      const id = typeof ref === 'string' ? ref : ref.character
      return !seated.some((p) => p.id === id)
    })
    const idOf = (ref: (typeof unseated)[number]) => (typeof ref === 'string' ? ref : ref.character)
    const fresh = unseated.filter((ref) => !everSeated.has(idOf(ref)))
    const choices = fresh.length > 0 ? fresh : unseated
    if (choices.length === 0) continue
    const [newcomer] = seatsOf(table, [choices[Math.floor(rng() * choices.length)]])
    everSeated.add(newcomer.id)
    const stack = replacementStack(
      rng,
      seated.filter((p) => p.id !== out.id).map((p) => p.stack),
      blinds.big,
    )
    engine.replacePlayer(out.id, {
      id: newcomer.id,
      name: newcomer.name,
      isHuman: false,
      skillTier: newcomer.skillTier,
      archetype: newcomer.archetype,
      startingStack: stack,
    })
    step.replaced.push({ outId: out.id, outName: out.name, newcomer, stack })
  }
  return step
}
