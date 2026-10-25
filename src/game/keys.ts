import { useEffect, useRef, useState, type RefObject } from 'react'

/**
 * The game's keys, in one place.
 *
 * A player at a keyboard has two hands' worth of habits: the arrows or W A S D
 * to move a cursor, and a key under the thumb to do the thing — Space, E, or
 * Enter. Every place that does something answers to all three, and every list
 * of things to pick from answers to both sets of arrows, so nobody has to learn
 * which screen wants which key.
 */

/** Whether a modifier is held: Cmd+W closes the tab, and is never a step up. */
function modified(e: KeyboardEvent): boolean {
  return e.metaKey || e.ctrlKey || e.altKey
}

/** Space, E or Enter: "do it". */
export function isActionKey(e: KeyboardEvent): boolean {
  if (modified(e)) return false
  return e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter' || e.key === 'e' || e.key === 'E'
}

/** A step through a list: back for up/left (W, A), on for down/right (S, D); 0 for anything else. */
export function navStep(e: KeyboardEvent): -1 | 0 | 1 {
  if (modified(e)) return 0
  switch (e.key) {
    case 'ArrowUp':
    case 'ArrowLeft':
    case 'w':
    case 'W':
    case 'a':
    case 'A':
      return -1
    case 'ArrowDown':
    case 'ArrowRight':
    case 's':
    case 'S':
    case 'd':
    case 'D':
      return 1
    default:
      return 0
  }
}

/** Whether the key is one a range slider takes for itself when it has the focus. */
function isSliderKey(e: KeyboardEvent): boolean {
  return e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End' || e.key === 'PageUp' || e.key === 'PageDown'
}

/**
 * The second click of a double click, which is never a second decision.
 *
 * A double click on a text box's "Let's go" closed it and then turned the first
 * page of the next box — or, where a question or a shop came next, pressed
 * whatever had appeared under the pointer. Boxes, questions and menus swallow
 * it in the capture phase, before anything inside them hears it.
 */
export function swallowDoubleClick(e: { detail: number; stopPropagation(): void; preventDefault(): void }) {
  if (e.detail > 1) {
    e.stopPropagation()
    e.preventDefault()
  }
}

// --- who has the keys --------------------------------------------------------

/**
 * Everything on screen that answers keys — a text box, a question, a menu, the
 * side panel — stacks up, and only the top of the stack answers. Without this a
 * Space pressed in the side panel would also turn the page of the text box
 * underneath it, and a Space in a question would also deal the next hand.
 *
 * `priority` lifts something over whatever opens after it: the side panel is
 * modal, so a line of dialogue that arrives while it is open waits.
 */
interface Layer {
  id: number
  priority: number
}
const layers: Layer[] = []
let nextLayer = 1

function topLayer(): Layer | undefined {
  let top: Layer | undefined
  for (const layer of layers) if (!top || layer.priority >= top.priority) top = layer
  return top
}

/** Whether anything that answers keys is on screen: the street stands still while it is. */
export function anyKeyLayer(): boolean {
  return layers.length > 0
}

/**
 * Takes a place on the stack while `active`, and returns a function that says
 * whether this is the one the keys go to right now.
 */
export function useKeyLayer(active = true, priority = 0): () => boolean {
  const [id] = useState(() => nextLayer++)
  useEffect(() => {
    if (!active) return
    const layer = { id, priority }
    layers.push(layer)
    return () => {
      const at = layers.indexOf(layer)
      if (at >= 0) layers.splice(at, 1)
    }
  }, [active, priority, id])
  return () => topLayer()?.id === id
}

// --- menus ---------------------------------------------------------------------

const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** The things in a menu that can be picked, in reading order. */
export function focusables(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => el.getAttribute('aria-hidden') !== 'true' && el.offsetParent !== null,
  )
}

/**
 * How long after a menu opens it ignores "do it". Someone mashing Space
 * through the line that opened a shop should not buy the first thing on the
 * shelf with the press after it.
 */
export const MENU_GUARD_MS = 250

interface MenuKeyOptions {
  /** Escape: close the panel, leave the menu. */
  onBack?: () => void
  /** Put the cursor on the first thing on opening. */
  autoFocus?: boolean
  /** Keep Tab inside, for a panel over the game. */
  trap?: boolean
  active?: boolean
  priority?: number
}

/**
 * Arrow keys and W A S D move the cursor through a menu; Space, E and Enter pick
 * what it is on; Escape goes back.
 *
 * The cursor is the browser's own focus, so a mouse, a finger, Tab and the keys
 * all agree on where it is, and a screen reader reads what it reads. The keys
 * are taken in the capture phase and stopped there, so nothing underneath — the
 * street, a table's "next hand" — hears a key the menu used.
 */
export function useMenuKeys(container: RefObject<HTMLElement | null>, options: MenuKeyOptions = {}) {
  const { active = true, priority = 0, autoFocus = true } = options
  const isTop = useKeyLayer(active, priority)
  const latest = useRef(options)
  latest.current = options

  useEffect(() => {
    if (!active) return
    const openedAt = performance.now()
    const root = container.current
    if (autoFocus && root && !root.contains(document.activeElement)) {
      focusables(root)[0]?.focus({ preventScroll: true })
    }

    // Space on a focused button clicks it on keyup. The keydown is handled
    // here and the keyup swallowed, so it clicks exactly once.
    let swallowUp = false
    const onKeyUp = (e: KeyboardEvent) => {
      if (!swallowUp || (e.key !== ' ' && e.key !== 'Spacebar')) return
      swallowUp = false
      e.preventDefault()
    }

    const onKey = (e: KeyboardEvent) => {
      const root = container.current
      if (!root || !isTop()) return
      const items = focusables(root)
      const focused = document.activeElement instanceof HTMLElement && root.contains(document.activeElement)
        ? document.activeElement
        : null

      if (e.key === 'Escape' && latest.current.onBack) {
        e.preventDefault()
        e.stopPropagation()
        latest.current.onBack()
        return
      }

      if (e.key === 'Tab' && latest.current.trap && items.length > 0) {
        const at = focused ? items.indexOf(focused) : -1
        const next = e.shiftKey ? (at <= 0 ? items.length - 1 : at - 1) : (at < 0 || at === items.length - 1 ? 0 : at + 1)
        e.preventDefault()
        e.stopPropagation()
        items[next]?.focus()
        return
      }

      const typing = focused instanceof HTMLInputElement && focused.type !== 'range' && focused.type !== 'checkbox'
      if (typing) return

      const slider = focused instanceof HTMLInputElement && focused.type === 'range'
      if (slider && isSliderKey(e)) {
        // The slider's own: left and right move it.
        e.stopPropagation()
        return
      }

      const step = navStep(e)
      if (step !== 0) {
        e.preventDefault()
        e.stopPropagation()
        if (items.length === 0) return
        const at = focused ? items.indexOf(focused) : -1
        const next = at < 0 ? (step > 0 ? 0 : items.length - 1) : (at + step + items.length) % items.length
        items[next].focus({ preventScroll: false })
        return
      }

      if (isActionKey(e)) {
        e.preventDefault()
        e.stopPropagation()
        if (e.repeat || performance.now() - openedAt < MENU_GUARD_MS) return
        const target = focused ?? null
        if (!target) {
          items[0]?.focus({ preventScroll: true })
          return
        }
        if (e.key === ' ' || e.key === 'Spacebar') swallowUp = true
        if (target instanceof HTMLInputElement && (target.type === 'range' || target.type === 'checkbox')) {
          if (target.type === 'checkbox') target.click()
          return
        }
        target.click()
      }
    }

    window.addEventListener('keydown', onKey, true)
    window.addEventListener('keyup', onKeyUp, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('keyup', onKeyUp, true)
    }
  }, [active, autoFocus])
}
