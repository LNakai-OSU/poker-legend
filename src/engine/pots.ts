export interface PotLayer {
  amount: number
  eligiblePlayerIds: string[]
}

/**
 * Splits total chip contributions into main + side pots.
 * `contributions` includes folded players' chips (they paid in but aren't eligible to win).
 */
export function calculatePots(
  contributions: Map<string, number>,
  foldedPlayerIds: Set<string>,
): PotLayer[] {
  const entries = [...contributions.entries()].filter(([, amount]) => amount > 0)
  if (entries.length === 0) return []

  const levels = [...new Set(entries.map(([, amount]) => amount))].sort((a, b) => a - b)

  const pots: PotLayer[] = []
  let prevLevel = 0
  for (const level of levels) {
    const layerHeight = level - prevLevel
    if (layerHeight <= 0) {
      prevLevel = level
      continue
    }
    const contributors = entries.filter(([, amount]) => amount >= level)
    const amount = layerHeight * contributors.length
    const eligiblePlayerIds = contributors
      .map(([playerId]) => playerId)
      .filter((id) => !foldedPlayerIds.has(id))

    if (eligiblePlayerIds.length > 0) {
      pots.push({ amount, eligiblePlayerIds })
    } else if (pots.length > 0) {
      // Everyone eligible at this layer folded (can happen after a raise everyone folds to);
      // the chips still belong to the pot, fold them into the previous eligible layer.
      pots[pots.length - 1].amount += amount
    } else {
      pots.push({ amount, eligiblePlayerIds: contributors.map(([id]) => id) })
    }
    prevLevel = level
  }
  return pots
}
