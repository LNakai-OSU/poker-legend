/**
 * Screenshots a poker table at several window sizes, by borrowing the browser
 * suite's helpers (everything in tests/ui.mjs before its first scenario).
 *
 *   OUT=DIR [RAISE=1] node scripts/table-shot.mjs
 *
 * One image per size, named table-<size>.png. Needs the dev server running.
 */
import { readFileSync, mkdirSync } from 'node:fs'
const out = process.env.OUT ?? '.'
mkdirSync(out, { recursive: true })
const raise = process.env.RAISE === '1'
const src = readFileSync(new URL('../tests/ui.mjs', import.meta.url), 'utf8')
const head = src.slice(0, src.indexOf("await test('fresh save starts in the apartment'"))
const body = `
const SIZES = [['laptop', 1280, 720], ['short', 1366, 500], ['phone-landscape', 844, 390], ['phone-portrait', 390, 844]]
for (const [name, w, h] of SIZES) {
  const page = await newPage(baseSave())
  await page.setViewportSize({ width: w, height: h })
  await page.goto(BASE); await page.waitForSelector('canvas'); await page.waitForTimeout(400)
  await enterDoor(page, 'Casino'); await talkTo(page, 'Pit Boss')
  await page.waitForSelector('[data-testid="pot-value"]', { timeout: 20000 })
  for (let i = 0; i < 40; i++) {
    if (await page.locator('[data-testid="raise-toggle"]').isVisible().catch(() => false)) break
    const btn = page.locator('button', { hasText: /Next hand/ })
    if (await btn.isVisible().catch(() => false)) await btn.click()
    await page.waitForTimeout(300)
  }
  ${raise ? "await page.locator('[data-testid=\"raise-toggle\"]').click().catch(() => {}); await page.waitForTimeout(300)" : ''}
  await page.screenshot({ path: ${JSON.stringify(out)} + '/table-' + name + '.png' })
  console.log('shot', name)
  await page.close()
}
await browser.close()
process.exit(0)
`
const file = new URL('../tests/.table-shot.tmp.mjs', import.meta.url)
;(await import('node:fs')).writeFileSync(file, head + body)
await import(file.href)
