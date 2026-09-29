import { useEffect, useRef } from 'react'
import { Application, Graphics, Text } from 'pixi.js'

/**
 * Mounts the PixiJS renderer that the overworld and table scenes will draw into.
 * Phase 1 just proves the boot/resize pipeline works end to end.
 */
export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let app: Application | null = null
    let cancelled = false

    ;(async () => {
      const instance = new Application()
      await instance.init({
        background: '#14141f',
        resizeTo: container,
        antialias: false,
      })

      if (cancelled) {
        instance.destroy(true)
        return
      }

      app = instance
      container.appendChild(instance.canvas)

      const tile = new Graphics()
        .rect(0, 0, 64, 64)
        .fill({ color: 0x3a9d5c })
      tile.pivot.set(32, 32)

      const label = new Text({
        text: 'Poker Legend — Phase 1 scaffold OK',
        style: { fill: '#e8e8f0', fontSize: 20, fontFamily: 'monospace' },
      })
      label.anchor.set(0.5)

      instance.stage.addChild(tile, label)

      const layout = () => {
        tile.position.set(instance.screen.width / 2, instance.screen.height / 2 - 40)
        label.position.set(instance.screen.width / 2, instance.screen.height / 2 + 40)
      }
      layout()
      instance.renderer.on('resize', layout)
    })()

    return () => {
      cancelled = true
      app?.destroy(true)
    }
  }, [])

  return <div ref={containerRef} style={{ width: '100vw', height: '100vh' }} />
}
