const SAVE_KEY = 'poker-legend-save-v1'

/**
 * Only hub locations are checkpoints. Mid-hand table state is deliberately not
 * persisted — reloading during a game drops you back to the last hub, and any
 * chips still on the table are lost, matching the design's checkpoint rules.
 */
export const CHECKPOINT_SCENES = ['apartment', 'casinoLobby'] as const
export type CheckpointScene = (typeof CHECKPOINT_SCENES)[number]

export interface GameSave {
  scene: CheckpointScene
  cash: number
}

function isCheckpointScene(value: unknown): value is CheckpointScene {
  return typeof value === 'string' && (CHECKPOINT_SCENES as readonly string[]).includes(value)
}

export function loadGame(): GameSave | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const { scene, cash } = parsed as Record<string, unknown>
    if (!isCheckpointScene(scene)) return null
    if (typeof cash !== 'number' || !Number.isFinite(cash) || cash < 0) return null
    return { scene, cash }
  } catch {
    // Storage can be unavailable (private browsing, blocked cookies) or hold
    // corrupt data; a missing save is always a valid outcome.
    return null
  }
}

export function saveGame(save: GameSave): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save))
  } catch {
    // Saving is best-effort; a failure shouldn't interrupt play.
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch {
    // Nothing to do if storage is unavailable.
  }
}
