/*
 * Home-screen installs keep serving the index.html they first loaded. Vite
 * gives every build a new hashed script name, so a fresh index.html naming a
 * different script means a newer build is live. We never reload on our own —
 * that could throw away a hand in progress — we show a banner and let the
 * player tap it.
 */

const RECHECK_MS = 5 * 60_000

const scriptName = (html: string): string | null =>
  /<script[^>]*type="module"[^>]*src="([^"]+)"/.exec(html)?.[1].split('/').pop() ?? null

export function installUpdateCheck(): void {
  const running = scriptName(document.documentElement.outerHTML)
  // Dev server and any page without a built script: nothing to compare.
  if (!running || import.meta.env.DEV) return

  let shown = false
  let lastCheck = Date.now()

  const showBanner = () => {
    if (shown) return
    shown = true
    const bar = document.createElement('button')
    bar.textContent = 'Update available — tap to reload'
    bar.style.cssText =
      'position:fixed;top:max(8px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);' +
      'z-index:2147483647;padding:10px 18px;border:2px solid #ffd45a;border-radius:8px;' +
      'background:#14141f;color:#ffd45a;font:600 14px system-ui,sans-serif;cursor:pointer'
    bar.onclick = () => location.reload()
    document.body.appendChild(bar)
  }

  const check = async () => {
    if (shown) return
    lastCheck = Date.now()
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}?v=${Date.now()}`, { cache: 'no-store' })
      if (!res.ok) return
      const latest = scriptName(await res.text())
      if (latest && latest !== running) showBanner()
    } catch {
      // Offline or blocked: try again next time.
    }
  }

  // A home-screen app is usually resumed, not relaunched, so check on return.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - lastCheck > 30_000) void check()
  })
  setInterval(() => void check(), RECHECK_MS)
  void check()
}
