import { useEffect, useState } from 'react'

/**
 * A pixel-art scale that lands on whole device pixels.
 *
 * Art scaled by 4.58 is some pixels four screen pixels wide and some five, and
 * type drawn that way looks soft. The scenes that are not the table (the title
 * card, the booth, the hall, the mail) take their scale from here: the largest
 * that fits, rounded down so that every art pixel is a whole number of the
 * screen's own pixels, on a retina display or a browser zoomed to 125%.
 */

/** Rounds a CSS-pixel size down to a whole number of device pixels (never below one). */
export function snap(css: number, dpr = window.devicePixelRatio || 1): number {
  return Math.max(1 / dpr, Math.floor(css * dpr + 1e-6) / dpr)
}

/** The scale at which `artW` by `artH` fits the window, on whole device pixels, at most `max` CSS pixels per art pixel. */
export function useCrispScale(artW: number, artH: number, max = 6, min = 1): number {
  const read = () => {
    const dpr = window.devicePixelRatio || 1
    return snap(Math.max(min, Math.min(window.innerWidth / artW, window.innerHeight / artH, max)), dpr)
  }
  const [scale, setScale] = useState(read)
  useEffect(() => {
    const onResize = () => setScale(read())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [artW, artH, max, min])
  return scale
}
