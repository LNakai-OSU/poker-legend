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

/**
 * Pages opened by the scenario currently running, so the runner can close them
 * even when it fails part-way.
 *
 * A failing scenario never reaches its own `page.close()`, and every page holds a
 * live WebGL context for the Pixi canvas. Past Chromium's context limit the
 * oldest ones are dropped, canvases stop rendering, and every later scenario
 * fails waiting for one — so a single real failure used to come back as a dozen,
 * and the real one scrolled off the top.
 */
let openPages = []

async function newPage(save, device) {
  const context = device ? await browser.newContext({ ...device }) : null
  const page = context ? await context.newPage() : await browser.newPage({ viewport: { width: 1100, height: 800 } })
  openPages.push(page)
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

const poisOf = (page) =>
  page.evaluate(() => {
    const el = document.querySelector('[data-testid="overworld"]')
    return el ? JSON.parse(el.dataset.pois || '[]') : []
  })

const exitsOf = (page) =>
  page.evaluate(() => {
    const el = document.querySelector('[data-testid="overworld"]')
    return el ? JSON.parse(el.dataset.exits || '[]') : []
  })

const gridOf = (page) =>
  page.evaluate(() => {
    const el = document.querySelector('[data-testid="overworld"]')
    return el ? (el.dataset.grid || '').split('/').map((row) => row.split('')) : []
  })

const KEY_FOR = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }
const NEIGHBOURS = [
  ['up', 0, -1],
  ['down', 0, 1],
  ['left', -1, 0],
  ['right', 1, 0],
]

/**
 * Shortest walk from `from` to `to` over the published grid, as a list of key
 * presses, or null when there is no route.
 *
 * Doorways are treated as solid unless one is the destination, because walking
 * into a door leaves the area — a greedy walker crossing a casino floor would
 * blunder out of the front entrance and then report that the pit boss was
 * missing.
 */
function routeTo(grid, from, to) {
  const passable = (c, r) => {
    const cell = grid[r]?.[c]
    if (cell === undefined || cell === '#') return false
    return cell === 'w' || (c === to.col && r === to.row)
  }
  if (!passable(to.col, to.row)) return null

  const start = `${from.col},${from.row}`
  const seen = new Map([[start, []]])
  const queue = [from]
  while (queue.length > 0) {
    const at = queue.shift()
    const path = seen.get(`${at.col},${at.row}`)
    if (at.col === to.col && at.row === to.row) return path
    for (const [direction, dc, dr] of NEIGHBOURS) {
      const next = { col: at.col + dc, row: at.row + dr }
      const id = `${next.col},${next.row}`
      if (seen.has(id) || !passable(next.col, next.row)) continue
      seen.set(id, [...path, direction])
      queue.push(next)
    }
  }
  return null
}

/** Walks to a tile, verifying each step, since synthetic keys can be dropped. */
async function moveTo(page, col, row, budget = 60) {
  const grid = await gridOf(page)
  for (let attempt = 0; attempt < 3; attempt++) {
    const at = await posOf(page)
    if (!at || Number.isNaN(at.col)) return false
    if (at.col === col && at.row === row) return true

    const route = grid.length > 0 ? routeTo(grid, at, { col, row }) : null
    if (route === null) return false
    if (route.length > budget) return false

    for (const direction of route) {
      await step(page, KEY_FOR[direction])
    }
    // A dropped or doubled synthetic keypress leaves us off by a tile, so the
    // route is recomputed from wherever we actually ended up.
  }
  const at = await posOf(page)
  return at !== null && at.col === col && at.row === row
}

const promptOf = (page) =>
  page.locator('text=/Press E to talk|Tap E to talk/').first().textContent().catch(() => null)

/**
 * Walks up to a named person or object. Looks the tile up from the scene rather
 * than hard-coding it, so map edits don't silently break the suite.
 */
async function approach(page, name) {
  const pois = await poisOf(page)
  const poi = pois.find((p) => p.name === name)
  if (!poi) throw new Error(`no "${name}" in this area (saw: ${pois.map((p) => p.name).join(', ')})`)

  // Only tiles that are actually walkable are worth trying. The pit boss stands
  // with a table below him, and spending the whole step budget trying to reach
  // that square used to leave the player stranded across the room.
  const grid = await gridOf(page)
  const candidates = [
    [poi.col, poi.row + 1],
    [poi.col - 1, poi.row],
    [poi.col + 1, poi.row],
    [poi.col, poi.row - 1],
  ].filter(([col, row]) => grid.length === 0 || grid[row]?.[col] === 'w')

  for (const [col, row] of candidates) {
    if (!(await moveTo(page, col, row, 80))) continue
    const prompt = await promptOf(page)
    if (prompt && prompt.includes(name)) return true
  }
  const at = await posOf(page)
  throw new Error(
    `could not get next to "${name}" at (${poi.col},${poi.row}); stopped at (${at?.col},${at?.row}); ` +
      `tried ${JSON.stringify(candidates)}`,
  )
}

/**
 * Walks into a named doorway, which moves to another area.
 *
 * Doors are not stood on: the player stops on the tile in front and opening it is
 * the step they would have taken. So this stands beside the door and walks at it.
 */
async function enterDoor(page, label) {
  const exits = await exitsOf(page)
  const door = exits.find((e) => e.label === label)
  if (!door) throw new Error(`no door "${label}" here (saw: ${exits.map((e) => e.label).join(', ')})`)

  const grid = await gridOf(page)
  const frontages = [
    [door.col, door.row + 1, 'ArrowUp'],
    [door.col, door.row - 1, 'ArrowDown'],
    [door.col - 1, door.row, 'ArrowRight'],
    [door.col + 1, door.row, 'ArrowLeft'],
  ].filter(([col, row]) => grid.length === 0 || grid[row]?.[col] === 'w')

  for (const [col, row, into] of frontages) {
    if (!(await moveTo(page, col, row, 80))) continue
    await step(page, into)
    await page.waitForTimeout(500)
    // The area changed if the doors on offer are no longer these ones.
    const now = await exitsOf(page)
    if (now.length === 0 || !now.some((e) => e.label === label && e.col === door.col)) return true
  }
  const at = await posOf(page)
  throw new Error(`could not go through "${label}"; stopped at (${at?.col},${at?.row})`)
}

/**
 * Walks off the given side of the map and onto the next one.
 *
 * This is how streets join now: no doorway in the middle of the road, just the
 * map carrying on. Picks whichever tile along that edge is actually walkable.
 */
async function walkEdge(page, side) {
  const grid = await gridOf(page)
  if (grid.length === 0) throw new Error('no grid published')
  const height = grid.length
  const width = grid[0].length
  const vertical = side === 'north' || side === 'south'
  const span = vertical ? width : height

  const before = await areaNameOf(page)
  for (let along = 0; along < span; along++) {
    const tile = vertical
      ? { col: along, row: side === 'north' ? 0 : height - 1 }
      : { col: side === 'west' ? 0 : width - 1, row: along }
    if (grid[tile.row]?.[tile.col] !== 'w') continue
    if (!(await moveTo(page, tile.col, tile.row, 90))) continue
    await step(page, { north: 'ArrowUp', south: 'ArrowDown', east: 'ArrowRight', west: 'ArrowLeft' }[side])
    await page.waitForTimeout(500)
    if ((await areaNameOf(page)) !== before) return true
  }
  throw new Error(`could not walk ${side} out of "${before}"`)
}

/** The area the player is standing in, as the corner map labels it. */
const areaNameOf = (page) =>
  page.evaluate(() => document.querySelector('[data-testid="minimap"]')?.textContent ?? '')

/** Walks up to a thing and talks to it. */
async function talkTo(page, name) {
  await approach(page, name)
  await page.keyboard.press('e')
  await page.waitForTimeout(250)
  await talkThrough(page)
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
  openPages = []
  try {
    await fn()
    results.push({ name, ok: true })
    console.log(`  ok   ${name}`)
  } catch (err) {
    results.push({ name, ok: false, error: String(err).split('\n')[0] })
    console.log(`  FAIL ${name}\n       ${String(err).split('\n')[0]}`)
  } finally {
    // Whatever happened, give the GPU contexts back before the next scenario.
    for (const page of openPages) {
      await page.close().catch(() => {})
      const context = page.context()
      if (context && context.pages().length === 0) await context.close().catch(() => {})
    }
    openPages = []
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

await test('a door is opened from in front of it, not stood on', async () => {
  const page = await newPage(null)
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(400)

  const [door] = await exitsOf(page)
  // Stand in front of the apartment door and confirm we are not on it.
  assert(await moveTo(page, door.col, door.row - 1, 40), 'could not stand in front of the door')
  const inFront = await posOf(page)
  assert(
    inFront.col === door.col && inFront.row === door.row - 1,
    `expected to stop in front of the door, was at (${inFront.col},${inFront.row})`,
  )
  await step(page, 'ArrowDown')
  await page.waitForTimeout(500)
  assert((await page.locator('body').innerText()).includes('Basin Street'), 'the door did not open')
  assert(page.__errors.length === 0, `console errors: ${page.__errors[0]}`)
  await page.close()
})

await test('the bus runs across town to the game', async () => {
  const page = await newPage(null)
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(400)
  await enterDoor(page, 'Outside')

  // Basin Street carries on east into Seventh, and Seventh into the depot. No
  // doors are involved: the road simply continues.
  await walkEdge(page, 'east')
  assert((await areaNameOf(page)).includes('Seventh'), 'walking east did not reach Seventh Street')
  await walkEdge(page, 'east')
  assert((await areaNameOf(page)).includes('Depot'), 'walking east again did not reach the depot')

  await talkTo(page, 'Bus Stop')
  const body = await page.locator('body').innerText()
  assert(body.includes('LOCAL SERVICE'), 'the bus offers no local service')
  assert(body.includes('Eastgate'), "the bus does not run to Marcus's block")
  assert(page.__errors.length === 0, `console errors: ${page.__errors[0]}`)
  await page.close()
})

await test('the town is one continuous place', async () => {
  const page = await newPage(null)
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(400)
  await enterDoor(page, 'Outside')
  assert(await page.locator('[data-testid="minimap"]').isVisible(), 'no minimap on the street')

  // Out to the edge of town and back again, entirely on foot.
  await walkEdge(page, 'east')
  await walkEdge(page, 'east')
  await walkEdge(page, 'north')
  assert((await areaNameOf(page)).includes('Eastgate'), 'could not walk north to Eastgate')
  await walkEdge(page, 'south')
  await walkEdge(page, 'west')
  await walkEdge(page, 'west')
  assert((await areaNameOf(page)).includes('Basin Street'), 'could not walk back home')

  // And the shops on the way are real rooms.
  await walkEdge(page, 'east')
  await enterDoor(page, "Patel's")
  const pois = await poisOf(page)
  assert(pois.some((p) => p.name === 'Mr Patel'), `nobody in the shop (saw: ${pois.map((p) => p.name)})`)
  await enterDoor(page, 'Seventh Street')
  assert((await areaNameOf(page)).includes('Seventh'), 'could not get back out')
  assert(page.__errors.length === 0, `console errors: ${page.__errors[0]}`)
  await page.close()
})

await test('the window in the apartment is scenery, not a person', async () => {
  const page = await newPage(null)
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(400)
  const pois = await poisOf(page)
  const window = pois.find((p) => p.name === 'Window')
  assert(window, 'no window in the apartment')
  // It is still there to look at; it just has no name plate floating over it.
  const labelled = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="overworld"]')
    return JSON.parse(el.dataset.pois).length
  })
  assert(labelled >= 2, 'the window stopped being interactable')
  assert(page.__errors.length === 0, `console errors: ${page.__errors[0]}`)
  await page.close()
})

await test('hands end without a panel to dismiss', async () => {
  const page = await newPage(baseSave())
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(400)
  await enterDoor(page, 'Casino')
  await talkTo(page, 'Pit Boss')
  assert(await page.locator('[data-testid="pot-value"]').isVisible(), 'never reached the table')

  // Play to the end of a hand, then let it sit: the next one should be dealt
  // without anything being clicked.
  let sawBar = false
  const firstHand = await page.locator('[data-testid="pot-value"]').getAttribute('data-pot')
  for (let i = 0; i < 40; i++) {
    if (await page.locator('[data-testid="hand-over-bar"]').isVisible().catch(() => false)) {
      sawBar = true
      break
    }
    for (const label of ['Check', /^Call/, 'Fold']) {
      const btn = page.locator('button', { hasText: label })
      if (await btn.isVisible().catch(() => false)) {
        await btn.click()
        break
      }
    }
    await page.waitForTimeout(200)
  }
  assert(sawBar, 'never reached the end of a hand')
  assert(
    await page.locator('[data-testid="auto-deal-status"]').isVisible(),
    'the end of a hand did not offer to carry on by itself',
  )
  // Nothing clicked: a new hand should arrive on its own. Polled rather than
  // slept, because the opponents act on their own timers before it is the
  // player's turn again, and a single fixed wait races them.
  let dealtItself = false
  for (let i = 0; i < 40 && !dealtItself; i++) {
    dealtItself = await page
      .locator('button', { hasText: /Fold|Check|^Call/ })
      .first()
      .isVisible()
      .catch(() => false)
    if (!dealtItself) await page.waitForTimeout(300)
  }
  assert(dealtItself, 'the next hand was never dealt without being asked')
  assert(page.__errors.length === 0, `console errors: ${page.__errors[0]}`)
  await page.close()
})

/**
 * A long session, because the short ones hid a table that froze solid.
 *
 * Opponents reloading between hands threw once a stack went short, which stopped
 * the table dead: no hand dealt and no button worked. Every cash game in the build
 * died at around hand 8, and this suite missed it because the only cash-game case
 * played a couple of hands and cashed out.
 */
await test('a cash game survives a long session', async () => {
  const page = await newPage(baseSave())
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(400)
  await enterDoor(page, 'Casino')
  await talkTo(page, 'Pit Boss')
  assert(await page.locator('[data-testid="pot-value"]').isVisible(), 'never reached the table')

  const TARGET_HANDS = 20
  let handsSeen = 0
  let lastHandSignature = null
  let idleRounds = 0

  for (let i = 0; i < 400 && handsSeen < TARGET_HANDS; i++) {
    // A busted player is offered a rebuy; take it so the session continues.
    const rebuy = page.locator('button', { hasText: /^Rebuy/ })
    if (await rebuy.isVisible().catch(() => false)) {
      await rebuy.click()
      await page.waitForTimeout(250)
      continue
    }
    const deal = page.locator('button', { hasText: /Deal now|Next hand/ })
    if (await deal.isVisible().catch(() => false)) {
      await deal.click()
      await page.waitForTimeout(250)
      continue
    }
    for (const label of ['Check', /^Call/, 'Fold']) {
      const btn = page.locator('button', { hasText: label })
      if (await btn.isVisible().catch(() => false)) {
        await btn.click()
        break
      }
    }
    await page.waitForTimeout(180)

    const signature = await page.evaluate(() => {
      const pot = document.querySelector('[data-testid="pot-value"]')
      const stacks = [...document.querySelectorAll('[data-stack]')].map((el) => el.dataset.stack)
      return pot ? `${pot.dataset.pot}|${stacks.join(',')}` : null
    })
    if (signature === null) break
    if (signature !== lastHandSignature) {
      lastHandSignature = signature
      handsSeen++
      idleRounds = 0
    } else {
      idleRounds++
      // Nothing on the table has changed for a long time and no button is
      // offering a way on: that is the freeze.
      assert(idleRounds < 25, `the table stopped responding after ~${handsSeen} hands`)
    }
  }

  assert(handsSeen >= TARGET_HANDS, `only got through ${handsSeen} of ${TARGET_HANDS} hands`)
  assert(page.__errors.length === 0, `console errors: ${page.__errors[0]}`)
  await page.close()
})

/**
 * Every lesson owned, because one of them used to blank the screen.
 *
 * The hand-reading panel read a value declared further down the component, so
 * owning that lesson threw on mount and unmounted the whole app — a purchasable
 * upgrade that locked the player out of poker for good.
 */
await test('a table still works with every lesson bought', async () => {
  const page = await newPage(
    baseSave({
      lessonIds: ['position', 'pot-odds', 'tells', 'hand-reading', 'bankroll'],
      cash: 20000,
    }),
  )
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(400)
  await enterDoor(page, 'Casino')
  await talkTo(page, 'Pit Boss')

  assert(await page.locator('[data-testid="pot-value"]').isVisible(), 'the table did not render')
  assert(
    await page.locator('[data-testid="hand-read"]').isVisible(),
    'the hand-reading panel the lesson pays for is missing',
  )
  // Play a few hands with every read on screen at once.
  for (let i = 0; i < 12; i++) {
    for (const label of ['Check', /^Call/, 'Deal now', 'Next hand', 'Fold']) {
      const btn = page.locator('button', { hasText: label })
      if (await btn.isVisible().catch(() => false)) {
        await btn.click()
        break
      }
    }
    await page.waitForTimeout(180)
  }
  assert(await page.locator('[data-testid="felt"]').isVisible(), 'the table disappeared mid-session')
  assert(page.__errors.length === 0, `console errors: ${page.__errors[0]}`)
  await page.close()
})

/**
 * A six-handed game, rendered without seats landing on top of each other.
 *
 * Every table in the game used to be two or three handed, so the player sat in a
 * blind on most hands and every pot was an all-in by the turn. The felt had no
 * layout for five opponents either — it silently fell back to the three-seat one
 * and stacked them.
 */
await test('a six-handed table seats everyone', async () => {
  const page = await newPage(baseSave({ cityId: 'riverbend', cash: 50000 }))
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(400)
  await enterDoor(page, 'Riverboat')
  await talkTo(page, 'Dealer')
  assert(await page.locator('[data-testid="pot-value"]').isVisible(), 'never reached the table')

  const seats = await page.evaluate(() =>
    [...document.querySelectorAll('[data-testid^="seat-"]')].map((el) => {
      const box = el.getBoundingClientRect()
      return { id: el.dataset.testid, left: box.left, top: box.top, right: box.right, bottom: box.bottom }
    }),
  )
  assert(seats.length === 6, `expected 6 seats on the felt, saw ${seats.length}`)

  // No two seat plates may sit on top of one another.
  for (let i = 0; i < seats.length; i++) {
    for (let j = i + 1; j < seats.length; j++) {
      const a = seats[i]
      const b = seats[j]
      const overlaps = a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
      assert(!overlaps, `${a.id} overlaps ${b.id}`)
    }
  }
  assert(page.__errors.length === 0, `console errors: ${page.__errors[0]}`)
  await page.close()
})

/**
 * Chips never end up on top of a card.
 *
 * Bets used to be laid out *inside* the seat's column, so a bet appearing made
 * the seat taller and pushed it toward the middle of the felt — your own stack
 * grew up into the community cards and an opponent's grew down into them, which
 * covered the very cards the bet was about.
 */
await test('a bet never covers a card', async () => {
  const page = await newPage(baseSave({ cityId: 'riverbend', cash: 50000 }))
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(400)
  await enterDoor(page, 'Riverboat')
  await talkTo(page, 'Dealer')
  assert(await page.locator('[data-testid="pot-value"]').isVisible(), 'never reached the table')

  let worst = 0
  for (let i = 0; i < 24; i++) {
    const covered = await page.evaluate(() => {
      const chips = [...document.querySelectorAll('[data-testid^="bet-"]')]
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter((c) => c.r.width > 0)
      const cards = [...document.querySelectorAll('[data-facedown], [style*="linear-gradient(170deg"]')]
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
      let area = 0
      for (const c of chips) {
        for (const k of cards) {
          const hit = !(c.r.right <= k.r.left || k.r.right <= c.r.left || c.r.bottom <= k.r.top || k.r.bottom <= c.r.top)
          if (!hit) continue
          // Ask the browser what is actually on top in the overlap. Comparing
          // z-index values is meaningless across stacking contexts, and seats
          // quietly made their own — via `isolation`, and via the `opacity` that
          // dims a folded player — so the numbers agreed while the pixels did not.
          const x = (Math.max(c.r.left, k.r.left) + Math.min(c.r.right, k.r.right)) / 2
          const y = (Math.max(c.r.top, k.r.top) + Math.min(c.r.bottom, k.r.bottom)) / 2
          const top = document.elementFromPoint(x, y)
          if (!top || !c.el.contains(top)) continue
          const w = Math.min(c.r.right, k.r.right) - Math.max(c.r.left, k.r.left)
          const h = Math.min(c.r.bottom, k.r.bottom) - Math.max(c.r.top, k.r.top)
          area = Math.max(area, Math.round(w * h))
        }
      }
      return area
    })
    worst = Math.max(worst, covered)
    for (const label of ['Check', /^Call/, 'Deal now', 'Next hand', 'Fold']) {
      const btn = page.locator('button', { hasText: label })
      if (await btn.isVisible().catch(() => false)) {
        await btn.click()
        break
      }
    }
    await page.waitForTimeout(200)
  }
  assert(worst === 0, `a chip stack was drawn over a card (${worst}px of it)`)
  assert(page.__errors.length === 0, `console errors: ${page.__errors[0]}`)
  await page.close()
})

/**
 * The table and the bus have to fit the window they are in.
 *
 * The felt would not shrink below 300px however short the window was, so on a
 * laptop window the betting buttons were pushed off the bottom of the screen; the
 * bus scene added its padding *to* a full 100vh, so it was always exactly its own
 * padding taller than the viewport.
 */
for (const [width, height] of [
  [1366, 500],
  [1024, 560],
  [1280, 620],
]) {
  await test(`the table fits a ${width}x${height} window`, async () => {
    const page = await newPage(baseSave({ cityId: 'riverbend', cash: 50000, lessonIds: ['tells', 'pot-odds', 'position'] }))
    await page.setViewportSize({ width, height })
    await page.goto(BASE)
    await page.waitForSelector('canvas')
    await page.waitForTimeout(400)
    await enterDoor(page, 'Riverboat')
    await talkTo(page, 'Dealer')
    assert(await page.locator('[data-testid="pot-value"]').isVisible(), 'never reached the table')

    let worst = 0
    for (let i = 0; i < 20; i++) {
      const m = await page.evaluate(() => ({
        overflow: document.documentElement.scrollHeight - window.innerHeight,
        // Every control has to be reachable without scrolling.
        offscreen: Math.round(
          Math.max(0, ...[...document.querySelectorAll('button')].map((b) => b.getBoundingClientRect().bottom)) -
            window.innerHeight,
        ),
        sizingRow: !!document.querySelector('[data-testid="raise-all-in"]'),
      }))
      worst = Math.max(worst, m.overflow, m.offscreen)
      if (m.sizingRow && i > 2) break
      for (const label of ['Check', /^Call/, 'Deal now', 'Next hand']) {
        const btn = page.locator('button', { hasText: label })
        if (await btn.isVisible().catch(() => false)) {
          await btn.click()
          break
        }
      }
      await page.waitForTimeout(190)
    }
    assert(worst <= 0, `the table runs ${worst}px past the bottom of a ${width}x${height} window`)
    assert(page.__errors.length === 0, `console errors: ${page.__errors[0]}`)
    await page.close()
  })
}

await test('the bus ride fits the window', async () => {
  const page = await newPage(null)
  await page.setViewportSize({ width: 1024, height: 560 })
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(400)
  await enterDoor(page, 'Outside')
  await walkEdge(page, 'east')
  await walkEdge(page, 'east')
  await talkTo(page, 'Bus Stop')
  await page.locator('button', { hasText: 'Ride' }).click()
  await page.waitForTimeout(700)
  assert(await page.locator('[data-testid="bus-ride"]').isVisible(), 'the bus never pulled away')

  const m = await page.evaluate(() => ({
    overflow: document.documentElement.scrollHeight - window.innerHeight,
    offscreen: Math.round(
      Math.max(0, ...[...document.querySelectorAll('button')].map((b) => b.getBoundingClientRect().bottom)) -
        window.innerHeight,
    ),
  }))
  assert(m.overflow <= 0, `the bus runs ${m.overflow}px past the bottom of the window`)
  assert(m.offscreen <= 0, `the skip button sits ${m.offscreen}px below the window`)
  assert(page.__errors.length === 0, `console errors: ${page.__errors[0]}`)
  await page.close()
})

await test('can sit down, play, and leave a cash game', async () => {
  const page = await newPage(baseSave())
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(400)
  await enterDoor(page, 'Casino')
  await talkTo(page, 'Pit Boss')
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
  await enterDoor(page, 'Casino')
  await talkTo(page, 'Nadia Okonkwo')
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
  await enterDoor(page, 'Casino')
  await talkTo(page, 'Slot Row')
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
  await enterDoor(page, 'Casino')
  await talkTo(page, 'Craps Table')
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
  await enterDoor(page, 'The Harbour Room')
  await talkTo(page, 'Host')
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
  await enterDoor(page, 'The Harbour Room')
  await talkTo(page, 'Host')
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
  await enterDoor(page, 'Penthouse Lift')
  await talkTo(page, 'Attendant')
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
  await enterDoor(page, 'Penthouse Lift')
  await talkTo(page, 'Attendant')
  assert(/Your Penthouse/.test(await page.locator('body').innerText()), 'penthouse did not open')
  await page.close()
})

// The pot-odds coach divided by the pot without checking it was a live decision.
// Between hands the contributions are cleared but currentBet is not, so a stale
// "to call" sat next to an empty pot and it printed "Calling 3557 into 0 — you
// need 100% to break even".
await test('the pot-odds coach never divides by an empty pot', async () => {
  const page = await newPage(baseSave({ lessonIds: ['pot-odds'] }))
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(400)
  await enterDoor(page, 'Casino')
  await talkTo(page, 'Pit Boss')
  assert(await page.locator('[data-testid="pot-value"]').isVisible(), 'never reached the table')

  const coach = page.locator('[data-testid="pot-odds"]')
  for (let i = 0; i < 60; i++) {
    if (await coach.isVisible().catch(() => false)) {
      const text = await coach.innerText()
      assert(!/into 0\b/.test(text), `pot-odds coach said: ${text}`)
      const [, pot] = text.match(/into ([\d,]+)/) ?? []
      assert(pot && Number(pot.replace(/,/g, '')) > 0, `pot-odds coach said: ${text}`)
    }
    let acted = false
    for (const label of ['Next hand', 'Check', /^Call/, /^Fold/]) {
      const btn = page.locator('button', { hasText: label })
      if (await btn.isVisible().catch(() => false)) {
        await btn.click()
        acted = true
        break
      }
    }
    if (!acted) break
    await page.waitForTimeout(150)
  }
  assert(page.__errors.length === 0, `console errors: ${page.__errors[0]}`)
  await page.close()
})

// Menu scenes used only the top ~45% of the screen, which reads as a page that
// failed to load.
await test('menu scenes are centred vertically', async () => {
  const page = await newPage(baseSave())
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(400)
  await enterDoor(page, 'Casino')
  await talkTo(page, 'Slot Row')
  assert(await page.locator('[data-testid="slot-reels"]').isVisible(), 'slots did not open')
  const gaps = await page.evaluate(() => {
    const heading = [...document.querySelectorAll('h2')].at(-1)
    const panel = heading?.parentElement
    if (!panel) return null
    const box = panel.getBoundingClientRect()
    return { top: box.top, bottom: window.innerHeight - box.bottom, height: box.height }
  })
  assert(gaps, 'could not find the menu panel')
  assert(
    Math.abs(gaps.top - gaps.bottom) < Math.max(40, gaps.height * 0.25),
    `menu panel is not centred: ${Math.round(gaps.top)}px above, ${Math.round(gaps.bottom)}px below`,
  )
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
