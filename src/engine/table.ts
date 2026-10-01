import { createDeck, shuffleDeck } from './deck'
import { bestHand, compareHandStrength } from './handRank'
import { calculatePots, type PotLayer } from './pots'
import type { Rng } from './rng'
import { defaultRng } from './rng'
import type { Action, Card, PlayerConfig, Street, TellSignal } from './types'
import { generateTell } from './tells'
import type { AiDecisionContext } from './ai'

interface PlayerRuntime extends PlayerConfig {
  stack: number
  holeCards: Card[]
  folded: boolean
  allIn: boolean
  streetContribution: number
  handContribution: number
  hasActedThisStreet: boolean
}

export interface PotResult extends PotLayer {
  winnerIds: string[]
  amountPerWinner: number
  remainder: number
}

export interface HandResult {
  handNumber: number
  board: Card[]
  pots: PotResult[]
  /** Hole cards of anyone who reached showdown (folded players' hands stay private). */
  revealed: { playerId: string; holeCards: Card[]; categoryName: string }[]
  bustedPlayerIds: string[]
}

export interface PublicPlayerView {
  id: string
  name: string
  isHuman: boolean
  stack: number
  folded: boolean
  allIn: boolean
  streetContribution: number
  isActing: boolean
  isDealer: boolean
  isEliminated: boolean
  /** A physical read currently showing on this opponent, if any. */
  tell?: TellSignal
}

export interface PublicState {
  street: Street
  board: Card[]
  pot: number
  currentBet: number
  minRaiseTo: number
  players: PublicPlayerView[]
  actingPlayerId: string | null
  handInProgress: boolean
  handNumber: number
}

export interface TableOptions {
  smallBlind: number
  bigBlind: number
  rng?: Rng
}

export class TexasHoldEmTable {
  private roster: PlayerRuntime[]
  private rng: Rng
  private smallBlind: number
  private bigBlind: number
  private dealerSeatIndex = -1
  private deck: Card[] = []
  private board: Card[] = []
  private street: Street = 'preflop'
  private currentBet = 0
  private lastRaiseSize = 0
  private actingIndex: number | null = null
  private handNumber = 0
  private lastResult: HandResult | null = null
  private handInProgress = false
  /** Who made the last aggressive action on the current street, if anyone. */
  private streetAggressorId: string | null = null
  /** Who made the last aggressive action on the street before this one. */
  private previousStreetAggressorId: string | null = null
  /** Regenerated once per street so a read stays stable while the player studies it. */
  private tellCache = new Map<string, TellSignal>()

  constructor(players: PlayerConfig[], options: TableOptions) {
    if (players.length < 2) throw new Error('need at least 2 players')
    this.roster = players.map((p) => ({
      ...p,
      stack: p.startingStack,
      holeCards: [],
      folded: false,
      allIn: false,
      streetContribution: 0,
      handContribution: 0,
      hasActedThisStreet: false,
    }))
    this.smallBlind = options.smallBlind
    this.bigBlind = options.bigBlind
    this.rng = options.rng ?? defaultRng
  }

  /**
   * Raises the stakes between hands, for a freezeout with a blind structure.
   *
   * Without this the home game was a 1,500-chip freezeout at fixed 5/10 blinds:
   * the median attempt ran past 200 hands, because nothing ever forced the issue.
   * Escalating blinds are how every real tournament guarantees an ending.
   */
  setBlinds(smallBlind: number, bigBlind: number) {
    if (this.handInProgress) throw new Error('cannot change the blinds mid-hand')
    this.smallBlind = smallBlind
    this.bigBlind = bigBlind
  }

  isGameOver(): boolean {
    return this.roster.filter((p) => p.stack > 0).length <= 1
  }

  /** The single remaining player with chips, once isGameOver() is true. */
  getFreezeoutWinnerId(): string | null {
    const remaining = this.roster.filter((p) => p.stack > 0)
    return remaining.length === 1 ? remaining[0].id : null
  }

  getLastHandResult(): HandResult | null {
    return this.lastResult
  }

  private refreshTells(): void {
    this.tellCache.clear()
    for (const p of this.roster) {
      if (p.isHuman || p.folded || p.stack <= 0 || p.holeCards.length === 0) continue
      const tell = generateTell(p.id, p.holeCards, this.board, p.skillTier, this.rng, p.archetype)
      if (tell) this.tellCache.set(p.id, tell)
    }
  }

  /**
   * Cash-game rebuy: tops up a busted player's stack between hands (a real
   * player buying back in, or the same NPC sitting back down). Only valid
   * between hands and only for a player currently at 0 chips.
   */
  rebuy(playerId: string, amount: number): void {
    if (this.handInProgress) throw new Error('cannot rebuy while a hand is in progress')
    const p = this.roster.find((pl) => pl.id === playerId)
    if (!p) throw new Error(`unknown player ${playerId}`)
    if (p.stack > 0) throw new Error(`${playerId} does not need a rebuy`)
    p.stack = amount
  }

  private seatsInHandOrder(): number[] {
    const n = this.roster.length
    const order: number[] = []
    for (let i = 0; i < n; i++) {
      const idx = (this.dealerSeatIndex + i) % n
      if (this.roster[idx].stack > 0) order.push(idx)
    }
    return order
  }

  private nextToAct(fromIdx: number): number | null {
    const n = this.roster.length
    for (let step = 1; step <= n; step++) {
      const idx = (fromIdx + step) % n
      const p = this.roster[idx]
      if (p.stack > 0 && !p.folded && !p.allIn) return idx
    }
    return null
  }

  startNewHand(): void {
    if (this.isGameOver()) throw new Error('game is already over')
    this.handNumber += 1
    this.handInProgress = true
    this.street = 'preflop'
    this.board = []
    this.deck = shuffleDeck(createDeck(), this.rng)

    for (const p of this.roster) {
      p.holeCards = []
      p.folded = p.stack <= 0
      p.allIn = false
      p.streetContribution = 0
      p.handContribution = 0
      p.hasActedThisStreet = false
    }

    // Move the button to the next seat that still has chips.
    const n = this.roster.length
    if (this.dealerSeatIndex === -1) {
      this.dealerSeatIndex = this.roster.findIndex((p) => p.stack > 0)
    } else {
      let idx = this.dealerSeatIndex
      for (let step = 1; step <= n; step++) {
        idx = (this.dealerSeatIndex + step) % n
        if (this.roster[idx].stack > 0) break
      }
      this.dealerSeatIndex = idx
    }

    const order = this.seatsInHandOrder()
    for (const idx of order) {
      this.roster[idx].holeCards = [this.deck.pop()!, this.deck.pop()!]
    }

    // Heads-up: dealer posts small blind. 3+: SB is next seat, BB after that.
    const sbIdx = order.length === 2 ? this.dealerSeatIndex : order[1]
    const bbIdx = order.length === 2 ? order[1] : order[2 % order.length]
    this.postBlind(sbIdx, this.smallBlind)
    this.postBlind(bbIdx, this.bigBlind)
    this.currentBet = this.bigBlind
    this.lastRaiseSize = this.bigBlind
    // Posting a blind is not aggression, so a limped pot has no preflop raiser
    // and therefore nobody with a continuation bet to make.
    this.streetAggressorId = null
    this.previousStreetAggressorId = null

    this.refreshTells()

    const firstToAct = order.length === 2 ? order[1] : this.nextToAct(bbIdx)
    this.actingIndex = firstToAct
    this.maybeAutoAdvance()
  }

  private postBlind(idx: number, amount: number) {
    const p = this.roster[idx]
    const paid = Math.min(amount, p.stack)
    p.stack -= paid
    p.streetContribution += paid
    p.handContribution += paid
    if (p.stack === 0) p.allIn = true
  }

  getState(): PublicState {
    const pot = this.roster.reduce((sum, p) => sum + p.handContribution, 0)
    const actingPlayer = this.actingIndex !== null ? this.roster[this.actingIndex] : null
    return {
      street: this.street,
      board: [...this.board],
      pot,
      currentBet: this.currentBet,
      minRaiseTo: this.currentBet + this.lastRaiseSize,
      handInProgress: this.handInProgress,
      handNumber: this.handNumber,
      actingPlayerId: actingPlayer?.id ?? null,
      players: this.roster.map((p, idx) => ({
        id: p.id,
        name: p.name,
        isHuman: p.isHuman,
        stack: p.stack,
        folded: p.folded,
        allIn: p.allIn,
        streetContribution: p.streetContribution,
        isActing: idx === this.actingIndex,
        isDealer: idx === this.dealerSeatIndex,
        isEliminated: p.stack <= 0 && !this.handInProgress,
        tell: this.tellCache.get(p.id),
      })),
    }
  }

  getHoleCards(playerId: string): Card[] {
    return this.roster.find((p) => p.id === playerId)?.holeCards ?? []
  }

  /**
   * How many live opponents still have to act behind this seat on a postflop
   * street. Postflop the orbit runs from the first live seat after the button
   * round to the button itself, so everything between this seat and the button
   * (inclusive) is still to come. 0 means this seat has the last word, which is
   * the single biggest reason a bet is profitable.
   */
  private opponentsToActAfter(idx: number): number {
    const n = this.roster.length
    const orbitEnd = (this.dealerSeatIndex + 1) % n
    let count = 0
    for (let step = 1; step <= n; step++) {
      const j = (idx + step) % n
      if (j === orbitEnd) break
      const p = this.roster[j]
      if (!p.folded && !p.allIn && p.stack > 0) count++
    }
    return count
  }

  /** Convenience adapter so callers don't have to re-derive AI inputs from getState(). */
  getAiContext(playerId: string): AiDecisionContext | null {
    if (this.actingIndex === null) return null
    const p = this.roster[this.actingIndex]
    if (p.id !== playerId) return null
    const potSize = this.roster.reduce((sum, pl) => sum + pl.handContribution, 0)
    const opponentsInHand = this.roster.filter((pl) => pl !== p && !pl.folded).length
    return {
      bigBlind: this.bigBlind,
      wasPreviousStreetAggressor: this.previousStreetAggressorId === p.id,
      opponentsToActAfter:
        this.board.length >= 3 ? this.opponentsToActAfter(this.actingIndex) : undefined,
      hole: p.holeCards,
      board: [...this.board],
      potSize,
      currentBet: this.currentBet,
      toCall: this.currentBet - p.streetContribution,
      minRaiseTo: this.currentBet + this.lastRaiseSize,
      allInTo: p.streetContribution + p.stack,
      opponentsInHand,
      skillTier: p.skillTier,
      archetype: p.archetype,
      street: this.street,
    }
  }

  getLegalActions(playerId: string): Action[] {
    if (this.actingIndex === null || this.roster[this.actingIndex].id !== playerId) return []
    const p = this.roster[this.actingIndex]
    const toCall = this.currentBet - p.streetContribution
    const actions: Action[] = []
    if (toCall <= 0) actions.push({ type: 'check' })
    else actions.push({ type: 'call' })
    actions.push({ type: 'fold' })
    if (p.stack > toCall) {
      actions.push({ type: 'raise', to: this.currentBet + this.lastRaiseSize })
    }
    return actions
  }

  submitAction(playerId: string, action: Action): void {
    if (this.actingIndex === null) throw new Error('no player is currently acting')
    const p = this.roster[this.actingIndex]
    if (p.id !== playerId) throw new Error(`it is not ${playerId}'s turn`)

    const toCall = this.currentBet - p.streetContribution

    switch (action.type) {
      case 'fold':
        p.folded = true
        break
      case 'check':
        if (toCall > 0) throw new Error('cannot check facing a bet')
        break
      case 'call': {
        const pay = Math.min(toCall, p.stack)
        p.stack -= pay
        p.streetContribution += pay
        p.handContribution += pay
        if (p.stack === 0) p.allIn = true
        break
      }
      case 'raise': {
        if (action.to <= p.streetContribution) {
          throw new Error('raise amount must exceed your current street contribution')
        }
        const raiseSize = action.to - this.currentBet
        const pay = Math.min(action.to - p.streetContribution, p.stack)
        p.stack -= pay
        p.streetContribution += pay
        p.handContribution += pay
        if (p.stack === 0) p.allIn = true
        if (p.streetContribution > this.currentBet) {
          this.lastRaiseSize = Math.max(raiseSize, this.lastRaiseSize)
          this.currentBet = p.streetContribution
          this.streetAggressorId = p.id
          // A real raise reopens action for everyone else still live.
          for (const other of this.roster) {
            if (other !== p && !other.folded && !other.allIn) other.hasActedThisStreet = false
          }
        }
        break
      }
    }
    p.hasActedThisStreet = true

    this.advance()
  }

  private advance() {
    const inHand = this.roster.filter((p) => !p.folded)

    if (inHand.length <= 1) {
      this.finishHandByFold(inHand[0] ?? null)
      return
    }

    const canAct = inHand.filter((p) => !p.allIn && p.stack > 0)
    const bettingClosed = canAct.length === 0 || canAct.every((p) => p.hasActedThisStreet && p.streetContribution === this.currentBet)

    if (!bettingClosed) {
      this.actingIndex = this.findNextActingSeat()
      return
    }

    this.actingIndex = null
    if (canAct.length <= 1) {
      this.runOutBoardAndShowdown(inHand)
      return
    }
    this.moveToNextStreet(inHand)
  }

  private findNextActingSeat(): number | null {
    const n = this.roster.length
    const start = this.actingIndex ?? this.dealerSeatIndex
    for (let step = 1; step <= n; step++) {
      const idx = (start + step) % n
      const p = this.roster[idx]
      if (!p.folded && !p.allIn && p.stack > 0 && !p.hasActedThisStreet) return idx
    }
    for (let step = 1; step <= n; step++) {
      const idx = (start + step) % n
      const p = this.roster[idx]
      if (!p.folded && !p.allIn && p.stack > 0 && p.streetContribution !== this.currentBet) return idx
    }
    return null
  }

  private moveToNextStreet(inHand: PlayerRuntime[]) {
    for (const p of this.roster) {
      p.streetContribution = 0
      p.hasActedThisStreet = false
    }
    this.currentBet = 0
    this.lastRaiseSize = this.bigBlind
    this.previousStreetAggressorId = this.streetAggressorId
    this.streetAggressorId = null

    if (this.street === 'preflop') {
      this.board.push(this.deck.pop()!, this.deck.pop()!, this.deck.pop()!)
      this.street = 'flop'
    } else if (this.street === 'flop') {
      this.board.push(this.deck.pop()!)
      this.street = 'turn'
    } else if (this.street === 'turn') {
      this.board.push(this.deck.pop()!)
      this.street = 'river'
    } else {
      this.showdown(inHand)
      return
    }

    const canAct = inHand.filter((p) => !p.allIn && p.stack > 0)
    if (canAct.length <= 1) {
      this.runOutBoardAndShowdown(inHand)
      return
    }
    this.refreshTells()
    this.actingIndex = this.nextToAct(this.dealerSeatIndex)
    this.maybeAutoAdvance()
  }

  private maybeAutoAdvance() {
    if (this.actingIndex === null) return
    const p = this.roster[this.actingIndex]
    if (p.folded || p.allIn || p.stack <= 0) {
      this.advance()
    }
  }

  private runOutBoardAndShowdown(inHand: PlayerRuntime[]) {
    while (this.street !== 'river' && this.street !== 'showdown') {
      if (this.street === 'preflop') this.board.push(this.deck.pop()!, this.deck.pop()!, this.deck.pop()!)
      else this.board.push(this.deck.pop()!)
      this.street = this.street === 'preflop' ? 'flop' : this.street === 'flop' ? 'turn' : 'river'
    }
    this.showdown(inHand)
  }

  private finishHandByFold(winner: PlayerRuntime | null) {
    this.street = 'showdown'
    this.actingIndex = null
    const contributions = new Map(this.roster.map((p) => [p.id, p.handContribution]))
    const pots = calculatePots(contributions, new Set(this.roster.filter((p) => p.folded).map((p) => p.id)))
    const potResults = this.awardPots(pots, () => winner ? [winner.id] : [])
    this.finalizeHand(potResults, [])
  }

  private showdown(inHand: PlayerRuntime[]) {
    this.street = 'showdown'
    this.actingIndex = null
    const strengthByPlayer = new Map(
      inHand.map((p) => [p.id, bestHand([...p.holeCards, ...this.board])]),
    )
    const contributions = new Map(this.roster.map((p) => [p.id, p.handContribution]))
    const folded = new Set(this.roster.filter((p) => p.folded).map((p) => p.id))
    const pots = calculatePots(contributions, folded)

    const potResults = this.awardPots(pots, (eligibleIds) => {
      let bestIds: string[] = []
      let bestStrength = null as ReturnType<typeof bestHand> | null
      for (const id of eligibleIds) {
        const s = strengthByPlayer.get(id)
        if (!s) continue
        if (!bestStrength || compareHandStrength(s, bestStrength) > 0) {
          bestStrength = s
          bestIds = [id]
        } else if (compareHandStrength(s, bestStrength) === 0) {
          bestIds.push(id)
        }
      }
      return bestIds
    })

    const revealed = inHand.map((p) => {
      const s = strengthByPlayer.get(p.id)!
      return { playerId: p.id, holeCards: p.holeCards, categoryName: String(s.category) }
    })

    this.finalizeHand(potResults, revealed)
  }

  private awardPots(pots: PotLayer[], pickWinners: (eligibleIds: string[]) => string[]): PotResult[] {
    return pots.map((pot) => {
      const winnerIds = pickWinners(pot.eligiblePlayerIds)
      const amountPerWinner = winnerIds.length > 0 ? Math.floor(pot.amount / winnerIds.length) : 0
      const remainder = winnerIds.length > 0 ? pot.amount - amountPerWinner * winnerIds.length : pot.amount
      winnerIds.forEach((id, i) => {
        const player = this.roster.find((pl) => pl.id === id)!
        player.stack += amountPerWinner + (i === 0 ? remainder : 0)
      })
      return { ...pot, winnerIds, amountPerWinner, remainder }
    })
  }

  private finalizeHand(pots: PotResult[], revealed: HandResult['revealed']) {
    const bustedPlayerIds = this.roster.filter((p) => p.stack === 0).map((p) => p.id)
    this.lastResult = {
      handNumber: this.handNumber,
      board: [...this.board],
      pots,
      revealed,
      bustedPlayerIds,
    }
    this.handInProgress = false
    // Pots have already been paid into winners' stacks; clear contributions so
    // getState().pot doesn't double-count them until the next hand starts.
    for (const p of this.roster) p.handContribution = 0
    // Cards are on their backs now — there's nothing left to read.
    this.tellCache.clear()
  }
}
