import { useEffect, useState } from 'react'
import type { Viewport } from './tableLayout'

function readViewport(): Viewport {
  return {
    w: window.innerWidth,
    h: window.innerHeight,
    dpr: window.devicePixelRatio || 1,
    coarse: window.matchMedia?.('(pointer: coarse)').matches ?? false,
  }
}

/** The window's size, pixel density and kind of pointer, kept current. */
export function useViewport(): Viewport {
  const [view, setView] = useState(readViewport)
  useEffect(() => {
    const update = () => setView(readViewport())
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return view
}
