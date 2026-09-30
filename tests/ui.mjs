/**
 * Browser smoke suite. The engine has unit tests; this covers the things only a
 * real browser can catch — scene wiring, Pixi startup, input, and layout.
 *
 *   npm run test:ui          (expects a dev server on :5173)
 *   npm run test:ui -- 4173  (or point it at a preview build)
 */
import { chromium, devices } from 'playwright'

const PORT = process.argv[2] ?? '5173'
const BASE = `http://localhost:${PORT}/`
const SAVE_KEY = 'poker-legend-save-v2'

const results = []
let browser

function baseSave(overrides = {}) {
  return JSON.stringify({
    day: 1,
    cash: 5000,
    cityId: 'silverCreek',
    unlockedCityIds: ['apartment', 'silverCreek', 'riverbend', 'crescentHarbor'],
    ownedItemIds: [],
    completedMissionIds: [],
    acceptedMissionIds: [],
    lessonIds: [],
    unlockedTableIds: [],
    debts: [],
    huntedInCityId: null,
    huntGraceUntilDay: 0,
    flags: { wonPokerNight: true, beatFinalRival: false, hasPenthouse: false },
    stats: { handsWon: 0, biggestPot: 0, tablesPlayed: 0 },
    ...overrides,
  })
}

async function newPage(save, device) {
  const context = device ? await browser.newContext({ ...device }) : null
  const page = context ? await context.newPage() : await browser.newPage({ viewport: { width: 1100, height: 800 } })
  page.setDefaultTimeout(5000)
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.addInitScript(
    ([k, v]) => (v ? window.localStorage.setItem(k, v) : window.localStorage.removeItem(k)),
    [SAVE_KEY, save],
  )
  page.__errors = errors
  return page
}

async function step(page, key) {
  await page.keyboard.down(key)
  await page.waitForTimeout(90)
  await page.keyboard.up(key)
  await page.waitForTimeout(160)
}

const posOf = (page) =>
  page.evaluate(() => {
    const el = document.querySelector('[data-testid="overworld"]')
    return el ? { col: Number(el.dataset.playerCol), row: Number(el.dataset.playerRow) } : null
  })

/**
 * Walks to a tile, verifying each step, since synthetic keys can be dropped.
 * Throws on failure with where it actually stopped — a silent miss here used to
 * surface as a confusing assertion failure much further down.
 */
async function moveTo(page, col, row) {
  for (let i = 0; i < 120; i++) {
    const at = await posOf(page)
    if (!at || Number.isNaN(at.col)) return false
    if (at.col === col && at.row === row) return true
    const primary =
      at.col !== col ? (at.col < col ? 'ArrowRight' : 'ArrowLeft') : at.row < row ? 'ArrowDown' : 'ArrowUp'
    const before = `${at.col},${at.row}`
    await step(page, primary)
    let after = await posOf(page)
    if (after && `${after.col},${after.row}` !== before) continue
    for (const side of primary === 'ArrowUp' || primary === 'ArrowDown'
      ? ['ArrowRight', 'ArrowLeft']
      : ['ArrowUp', 'ArrowDown']) {
      await step(page, side)
      after = await posOf(page)
      if (after && `${after.col},${after.row}` !== before) break
    }
  }
  const at = await posOf(page)
  throw new Error(`could not walk to (${col},${row}); stopped at (${at?.col},${at?.row})`)
}

async function talkThrough(page) {
  for (let i = 0; i < 6; i++) {
    const btn = page.locator('button', { hasText: /Continue|Let's go/ })
    if (await btn.isVisible().catch(() => false)) {
      await btn.click()
      await page.waitForTimeout(180)
    } else break
  }
  await page.waitForTimeout(350)
}

async function test(name, fn) {
  try {
    await fn()
    results.push({ name, ok: true })
    console.log(`  ok   ${name}`)
  } catch (err) {
    results.push({ name, ok: false, error: String(err).split('\n')[0] })
    console.log(`  FAIL ${name}\n       ${String(err).split('\n')[0]}`)
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

browser = await chromium.launch()
console.log(`ui suite against ${BASE}`)

await test('fresh save starts in the apartment', async () => {
  const page = await newPage(null)
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(400)
  assert((await page.locator('body').innerText()).includes('Your Apartment'), 'not in the apartment')
  assert(page.__errors.length === 0, `console errors: ${page.__errors[0]}`)
  await page.close()
})

await test('can sit down, play, and leave a cash game', async () => {
  const page = await newPage(baseSave())
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(400)
  await moveTo(page, 10, 4)
  await page.keyboard.press('e')
  await page.waitForTimeout(250)
  await talkThrough(page)
  assert(await page.locator('[data-testid="pot-value"]').isVisible(), 'never reached the table')

  let left = false
  for (let i = 0; i < 40 && !left; i++) {
    const leave = page.locator('button', { hasText: /Leave table/ })
    if (await leave.isVisible().catch(() => false)) {
      await leave.click()
      left = true
      break
    }
    for (const label of ['Next hand', 'Check', /^Call/]) {
      const btn = page.locator('button', { hasText: label })
      if (await btn.isVisible().catch(() => false)) {
        await btn.click()
        break
      }
    }
    await page.waitForTimeout(220)
  }
  assert(left, 'could not leave the table')
  await page.waitForTimeout(500)
  assert((await page.locator('body').innerText()).includes('Silver Creek'), 'did not return to the city')
  assert(page.__errors.length === 0, `console errors: ${page.__errors[0]}`)
  await page.close()
})

// Pressed keys used to be sampled once per Pixi frame, so a keydown+keyup that
// both landed between two frames was thrown away: 20 taps moved the player zero
// tiles. Taps are buffered now, and one press must be exactly one step.
await test('a quick tap moves exactly one tile', async () => {
  const page = await newPage(baseSave())
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(500)
  const before = await posOf(page)
  await page.keyboard.press('ArrowRight') // no hold at all
  await page.waitForTimeout(500)
  const after = await posOf(page)
  assert(
    after.col === before.col + 1 && after.row === before.row,
    `one tap should be one step: (${before.col},${before.row}) -> (${after.col},${after.row})`,
  )
  assert(page.__errors.length === 0, `console errors: ${page.__errors[0]}`)
  await page.close()
})

await test('a run of quick taps moves one tile each', async () => {
  const page = await newPage(baseSave())
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(500)
  const before = await posOf(page)
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('ArrowUp')
    await page.waitForTimeout(220)
  }
  await page.waitForTimeout(400)
  const after = await posOf(page)
  assert(after.row === before.row - 4, `4 taps moved ${before.row - after.row} tiles, expected 4`)
  assert(page.__errors.length === 0, `console errors: ${page.__errors[0]}`)
  await page.close()
})

// Holding still has to walk, and a release must not leave a phantom extra step.
await test('holding a key still walks continuously', async () => {
  const page = await newPage(baseSave())
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(500)
  const before = await posOf(page)
  await page.keyboard.down('ArrowRight')
  await page.waitForTimeout(700)
  await page.keyboard.up('ArrowRight')
  await page.waitForTimeout(400)
  const after = await posOf(page)
  assert(after.col - before.col >= 2, `holding moved only ${after.col - before.col} tiles`)
  await page.close()
})

await test('the finale says up front that you are locked in', async () => {
  const page = await newPage(
    baseSave({
      cityId: 'portoLumina',
      cash: 200000,
      unlockedCityIds: ['apartment', 'portoLumina'],
      ownedItemIds: ['tuxedo'], // the room's dress code, or she never deals
    }),
  )
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(400)
  await moveTo(page, 11, 5)
  await page.keyboard.press('e')
  await page.waitForTimeout(250)
  await talkThrough(page)
  const text = await page.locator('body').innerText()
  assert(/no cashing out and no standing up/.test(text), 'finale did not warn about being locked in')
  assert(/120,000/.test(text), 'finale did not state the buy-in')
  // The buy-in must not move until it is accepted.
  assert(/200,000/.test(text), 'the roll changed before the money was put up')
  await page.close()
})

await test('slots take a stake and settle on a result', async () => {
  const page = await newPage(baseSave())
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(400)
  await moveTo(page, 9, 3)
  await moveTo(page, 3, 3) // below the slot bank; column 3 is blocked further down
  await page.keyboard.press('e')
  await page.waitForTimeout(250)
  await talkThrough(page)
  assert(await page.locator('[data-testid="slot-reels"]').isVisible(), 'slots did not open')
  await page.locator('button', { hasText: /^Spin/ }).click()
  await page.waitForTimeout(1200)
  const text = await page.locator('[data-testid="slot-result"]').innerText()
  assert(!text.includes('Spinning'), 'reels never settled')
  assert(page.__errors.length === 0, `console errors: ${page.__errors[0]}`)
  await page.close()
})

await test('craps resolves a pass line bet', async () => {
  const page = await newPage(baseSave())
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(400)
  await moveTo(page, 11, 4)
  await page.keyboard.press('e')
  await page.waitForTimeout(250)
  await talkThrough(page)
  assert(await page.locator('[data-testid="craps-dice"]').isVisible(), 'craps did not open')
  await page.locator('button', { hasText: /Bet .* and roll/ }).click()
  await page.waitForTimeout(500)
  const msg = await page.locator('[data-testid="craps-message"]').innerText()
  assert(msg.length > 0, 'no roll outcome reported')
  assert(page.__errors.length === 0, `console errors: ${page.__errors[0]}`)
  await page.close()
})

await test('a club turns you away until you have a reputation', async () => {
  const page = await newPage(baseSave({ cityId: 'crescentHarbor', cash: 5000 }))
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(400)
  await moveTo(page, 11, 7)
  await moveTo(page, 5, 7) // beside the club door at (4,7)
  await page.keyboard.press('e')
  await page.waitForTimeout(250)
  await talkThrough(page)
  const text = await page.locator('body').innerText()
  assert(/Nobody here knows you yet/.test(text), 'club did not gate on reputation')
  assert(page.__errors.length === 0, `console errors: ${page.__errors[0]}`)
  await page.close()
})

await test('a club with reputation opens the private game', async () => {
  const page = await newPage(
    baseSave({
      cityId: 'crescentHarbor',
      cash: 5000,
      stats: { handsWon: 40, biggestPot: 3000, tablesPlayed: 8 },
    }),
  )
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(400)
  await moveTo(page, 11, 7)
  await moveTo(page, 5, 7)
  await page.keyboard.press('e')
  await page.waitForTimeout(250)
  await talkThrough(page)
  await page.locator('button', { hasText: /Pay the door/ }).click()
  await page.waitForTimeout(400)
  assert(await page.locator('[data-testid="club-invite"]').isVisible(), 'no invite after paying in')
  assert(page.__errors.length === 0, `console errors: ${page.__errors[0]}`)
  await page.close()
})

await test('settings can adjust volume and start a new game', async () => {
  const page = await newPage(baseSave({ cash: 4242 }))
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(400)
  await page.locator('[data-testid="settings-button"]').click()
  await page.waitForTimeout(300)
  await page.locator('[data-testid="volume-slider"]').fill('40')
  await page.locator('[data-testid="new-game"]').click()
  await page.waitForTimeout(200)
  await page.locator('[data-testid="confirm-new-game"]').click()
  await page.waitForTimeout(600)
  assert((await page.locator('body').innerText()).includes('Your Apartment'), 'new game did not reset')
  assert(page.__errors.length === 0, `console errors: ${page.__errors[0]}`)
  await page.close()
})

await test('the penthouse stays shut until you win it', async () => {
  const page = await newPage(
    baseSave({ cityId: 'portoLumina', cash: 200000, unlockedCityIds: ['apartment', 'portoLumina'] }),
  )
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(400)
  await moveTo(page, 5, 8)
  await page.keyboard.press('e')
  await page.waitForTimeout(250)
  await talkThrough(page)
  assert(/does not press the button/.test(await page.locator('body').innerText()), 'penthouse was not gated')
  await page.close()
})

await test('the penthouse opens after beating the rival', async () => {
  const page = await newPage(
    baseSave({
      cityId: 'portoLumina',
      cash: 200000,
      unlockedCityIds: ['apartment', 'portoLumina'],
      flags: { wonPokerNight: true, beatFinalRival: true, hasPenthouse: true },
    }),
  )
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(400)
  await moveTo(page, 5, 8)
  await page.keyboard.press('e')
  await page.waitForTimeout(250)
  await talkThrough(page)
  assert(/Your Penthouse/.test(await page.locator('body').innerText()), 'penthouse did not open')
  await page.close()
})

await test('touch controls appear on a phone and move the player', async () => {
  const page = await newPage(baseSave(), devices['iPhone 13'])
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(600)
  assert(await page.locator('[data-testid="touch-controls"]').isVisible(), 'no touch controls')
  const before = await posOf(page)
  const pad = page.locator('[data-testid="pad-up"]')
  const box = await pad.boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(500)
  await page.mouse.up()
  await page.waitForTimeout(300)
  const after = await posOf(page)
  assert(after.row < before.row, 'the d-pad did not move the player')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  assert(!overflow, 'horizontal overflow on a phone')
  await page.close()
})

await browser.close()

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
if (failed.length > 0) process.exit(1)
