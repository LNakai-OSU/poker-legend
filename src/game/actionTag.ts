import { useState } from 'react'
import type { Action } from '../engine/types'

/**
 * The word on a seat that says what that player just did — CHECK, CALL, RAISE,
 * FOLD — so a bet is read off the table rather than out of the menu's log. It
 * lasts for the street it was made in; a fold stays until the hand is over.
 */
export type ActionKind = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin'

export interface ActionTag {
  kind: ActionKind
  hand: number
  street: string
}

export const ACTION_WORD: Record<ActionKind, string> = {
  fold: 'FOLD',
  check: 'CHECK',
  call: 'CALL',
  bet: 'BET',
  raise: 'RAISE',
  allin: 'ALL IN',
}

export function actionKind(action: Action, price: { toCall: number; allInTo: number }): ActionKind {
  switch (action.type) {
    case 'fold':
      return 'fold'
    case 'check':
      return 'check'
    case 'call':
      return price.toCall >= price.allInTo ? 'allin' : 'call'
    case 'raise':
      if (action.to >= price.allInTo) return 'allin'
      return price.toCall > 0 ? 'raise' : 'bet'
  }
}

/** Remembers each player's latest action, and hands back the ones still worth showing. */
export function useActionTags(handNumber: number, street: string) {
  const [all, setAll] = useState<Record<string, ActionTag>>({})
  const record = (id: string, action: Action, price: { toCall: number; allInTo: number }) =>
    setAll((tags) => ({ ...tags, [id]: { kind: actionKind(action, price), hand: handNumber, street } }))
  const shown: Record<string, ActionKind> = {}
  for (const [id, tag] of Object.entries(all)) {
    if (tag.hand !== handNumber) continue
    if (tag.kind === 'fold' || tag.street === street) shown[id] = tag.kind
  }
  return { tags: shown, record }
}
