/** Per-device switches from the Settings menu. Stored like the sound settings, not in the save. */
const RECAP_KEY = 'poker-legend.recap'

/** Hal's notes after standing up from the table. On unless the player turned them off. */
export function recapEnabled(): boolean {
  try {
    return localStorage.getItem(RECAP_KEY) !== '0'
  } catch {
    return true
  }
}

export function setRecapEnabled(on: boolean): void {
  try {
    localStorage.setItem(RECAP_KEY, on ? '1' : '0')
  } catch {
    // storage blocked: the switch just lasts until reload
  }
}
