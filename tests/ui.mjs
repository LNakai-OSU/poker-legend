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
/** Narrow the run to the scenarios matching these substrings, while fixing some. */
const ONLY = process.env.UI_ONLY ? process.env.UI_ONLY.split(',').map((s) => s.trim()) : null

const results = []
let browser

/**
 * Beats a seeded save has already seen: every one that fires on walking into
 * an area or using a fixture.
 *
 * A save seeded halfway up the ladder stands for a player who climbed it, and
 * they have met the people on the way. Without this, the first thing many
 * scenarios met was an arrival card or an introduction over the street, which
 * is a story scenario's business, not a layout scenario's. `events.test.ts`
 * holds this list to the events in the game.
 */
const STORY_SEEN = [
  // The opening: Dana walks you to the 14.
  'dana-walks-you-to-the-bus',
  'dana-at-the-depot',
  // The night of the first game: Dana walks you home, Marcus rides out with you.
  'dana-walks-you-home',
  'marcus-rides-out-with-you',
  'arrive-silvercreek',
  'arrive-riverbend',
  'arrive-crescent',
  'arrive-palmcay',
  'arrive-mesa',
  'arrive-lumina',
  'hal-first-lesson',
  'hal-sends-you-on',
  'hal-mesa-last-stop',
  'nadia-names-the-match',
  // When it goes wrong: beats for owing, going broke and the lost match.
  'hal-short-for-the-harbor',
  'rent-day',
  'rent-receipt',
  'cass-offers',
  'cass-owing',
  'cass-overdue',
  'cass-repaid',
  'cass-repaid-late',
  'emeka-owing',
  'emeka-overdue',
  'emeka-repaid',
  'emeka-repaid-late',
  'consortium-owing',
  'consortium-overdue',
  'consortium-repaid',
  'consortium-repaid-late',
  'wen-offers',
  'wen-owing',
  'wen-overdue',
  'wen-repaid',
  'wen-repaid-late',
  'nadia-makes-you-wait',
  'nadia-rematch',
]

function baseSave(overrides = {}) {
  return JSON.stringify({
    day: 1,
    period: 'morning',
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
    completedEventIds: STORY_SEEN,
    ...overrides,
  })
}

/**
 * A run on day one that has already had its opening — Dana has walked it to
 * the 14 — for scenarios about walking the town rather than about her.
 */
function openedSave(overrides = {}) {
  return baseSave({
    cash: 0,
    cityId: 'apartment',
    unlockedCityIds: ['apartment'],
    flags: { wonPokerNight: false, beatFinalRival: false, hasPenthouse: false, metDana: true },
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
  // Generous, because the failure this guards against is a machine busy with
  // other work, not a slow game: at 5s, a loaded machine turned a correct page
  // load into a TimeoutError and a real pass into five false failures.
  page.setDefaultTimeout(15000)
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
  // Wait for the scene to publish a grid and a position that agree. Asked too
  // early, the grid is a single empty row, no route exists, and this used to
  // return false without the player taking a step — which read as a map you
  // could not walk, on a machine that was only busy.
  const grid = await settle(page)
  const startedIn = await areaNameOf(page)
  for (let attempt = 0; attempt < 5; attempt++) {
    // Stop the moment the ground changes. A doubled keypress at the edge of a map
    // carries the player onto the next one, and from there this route and this
    // grid describe somewhere the player is no longer standing — so retrying
    // walked them on east, map after map, several towns past where they meant to
    // stop. Where they are now is the caller's business, not this helper's.
    if ((await areaNameOf(page)) !== startedIn) return false
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
  page.locator('text=/Press E or Space to talk|Tap E to talk/').first().textContent().catch(() => null)

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
    // Polled rather than slept: a door is a scene change, and on a busy machine
    // it can take longer than any fixed wait. The area changed if the doors on
    // offer are no longer these ones.
    for (let waited = 0; waited < 5000; waited += 150) {
      const now = await exitsOf(page)
      if (now.length === 0 || !now.some((e) => e.label === label && e.col === door.col)) return true
      await page.waitForTimeout(150)
    }
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
/**
 * Waits until the published grid and the published position come from the same
 * map.
 *
 * A crossing is detected by the area name changing, but the name, the grid and
 * the player's tile are three separate bits of published state and they do not
 * all land on the same render. Routing against the previous map's grid sends the
 * player at a wall, every edge tile fails to be reached, and the crossing reads
 * as "could not walk east out of X" — in a world that is perfectly walkable.
 */
async function settle(page, budget = 10000) {
  for (let waited = 0; waited <= budget; waited += 100) {
    const [grid, at] = await Promise.all([gridOf(page), posOf(page)])
    if (grid.length > 0 && at && !Number.isNaN(at.col) && grid[at.row]?.[at.col] && grid[at.row][at.col] !== '#') {
      return grid
    }
    await page.waitForTimeout(100)
  }
  return gridOf(page)
}

async function walkEdge(page, side) {
  const grid = await settle(page)
  if (grid.length === 0) throw new Error('no grid published')
  const height = grid.length
  const width = grid[0].length
  const vertical = side === 'north' || side === 'south'
  const span = vertical ? width : height
  const key = { north: 'ArrowUp', south: 'ArrowDown', east: 'ArrowRight', west: 'ArrowLeft' }[side]

  const before = await areaNameOf(page)
  for (let along = 0; along < span; along++) {
    const tile = vertical
      ? { col: along, row: side === 'north' ? 0 : height - 1 }
      : { col: side === 'west' ? 0 : width - 1, row: along }
    if (grid[tile.row]?.[tile.col] !== 'w') continue
    if (!(await moveTo(page, tile.col, tile.row, 90))) {
      // Crossing while walking into position is still crossing.
      const now = await areaNameOf(page)
      if (now !== before) return now
      continue
    }

    await step(page, key)
    // Polled, not slept: a fixed wait raced the next map mounting, and when it
    // lost, this carried on trying edge tiles while the player was already
    // standing in the new one — walking them somewhere else entirely.
    for (let waited = 0; waited < 3000; waited += 150) {
      const now = await areaNameOf(page)
      if (now !== before) return now
      await page.waitForTimeout(150)
    }
  }
  throw new Error(`could not walk ${side} out of "${before}"`)
}

/**
 * Keeps walking one way until the named area is reached.
 *
 * Counting edge crossings is fragile: a keypress that lands as a map is swapping
 * can carry the player across the next boundary too, and then every later step is
 * measured from the wrong place. Walking until you arrive says what the test
 * actually means — the world is continuous in this direction — and does not care
 * how many maps are in between.
 */
async function walkUntil(page, side, nameFragment, maxHops = 6) {
  let where = await areaNameOf(page)
  const seen = [where]
  for (let hop = 0; hop < maxHops && !where.includes(nameFragment); hop++) {
    // Taken from the crossing itself rather than read back afterwards, so there
    // is no window in which the answer is one map out of date.
    where = await walkEdge(page, side)
    seen.push(where)
  }
  if (where.includes(nameFragment)) return true
  throw new Error(
    `walked ${side} without reaching "${nameFragment}"; went ${seen.map((x) => `"${x}"`).join(' -> ')}`,
  )
}

/** The area the player is standing in, as the corner map labels it. */
const areaNameOf = (page) =>
  page.evaluate(() => document.querySelector('[data-testid="minimap"]')?.textContent ?? '')

/** Waits for the player to be standing in an area whose name matches. */
async function untilArea(page, re, budget = 20000) {
  for (let waited = 0; waited <= budget; waited += 200) {
    if (re.test(await areaNameOf(page))) return true
    await page.waitForTimeout(200)
  }
  return false
}

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
  if (ONLY && !ONLY.some((want) => name.includes(want))) return
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

/** Saves a screenshot when UI_SHOTS names a folder, for looking at what a scenario saw. */
async function shot(page, name) {
  if (!process.env.UI_SHOTS) return
  await page.screenshot({ path: `${process.env.UI_SHOTS}/${name.replace(/[^a-z0-9-]+/gi, '-')}.png` })
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
  const page = await newPage(openedSave())
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
  const page = await newPage(openedSave())
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(400)
  await enterDoor(page, 'Outside')

  // Basin Street carries on east into Seventh, and Seventh into the depot. No
  // doors are involved: the road simply continues.
  await walkUntil(page, 'east', 'Seventh')
  await walkUntil(page, 'east', 'Depot')

  await talkTo(page, 'Bus Stop')
  const body = await page.locator('body').innerText()
  assert(body.includes('LOCAL SERVICE'), 'the bus offers no local service')
  assert(body.includes('Eastgate'), "the bus does not run to Marcus's block")
  assert(page.__errors.length === 0, `console errors: ${page.__errors[0]}`)
  await page.close()
})


/**
 * The game that opens the campaign, which is now an event rather than code.
 *
 * It used to be a POI with an action kind of its own, a flag read in three
 * files and a branch in the view switch. Nothing in this suite ever talked to
 * Marcus, so the one beat every run begins with was the least covered thing in
 * the game.
 */
await test("Marcus's game starts by talking to him at his place", async () => {
  const page = await newPage(
    baseSave({
      cityId: 'apartment',
      areaId: 'eastgate',
      period: 'afternoon',
      cash: 200,
      flags: { wonPokerNight: false, beatFinalRival: false, hasPenthouse: false },
    }),
  )
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(500)
  await enterDoor(page, "Marcus's")

  const here = await poisOf(page)
  assert(
    here.some((p) => p.name === 'Marcus'),
    `Marcus is not home in the afternoon (saw: ${here.map((p) => p.name).join(', ')})`,
  )

  await approach(page, 'Marcus')
  await page.keyboard.press('e')
  await page.waitForTimeout(400)

  // The event runs the conversation, not the scene's own text box.
  assert(
    await page.locator('[data-testid="event-dialogue"]').isVisible(),
    'talking to Marcus started no event',
  )
  await talkThrough(page)
  await page.waitForTimeout(600)

  const body = await page.locator('body').innerText()
  assert(/winner takes|Poker Night|Sit down/i.test(body), `the game never started (saw: ${body.slice(0, 200)})`)
  assert(page.__errors.length === 0, `console errors: ${page.__errors[0]}`)
  await page.close()
})

/** The same beat, at an hour he is not home. */
await test('Marcus is out in the morning, and his game is not on', async () => {
  const page = await newPage(
    baseSave({
      cityId: 'apartment',
      areaId: 'marcus-house',
      period: 'morning',
      flags: { wonPokerNight: false, beatFinalRival: false, hasPenthouse: false },
    }),
  )
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(500)
  const here = await poisOf(page)
  assert(!here.some((p) => p.name === 'Marcus'), 'Marcus is home at an hour he should be out')
  assert(page.__errors.length === 0, `console errors: ${page.__errors[0]}`)
  await page.close()
})

/**
 * Walking into a new town is a beat, and the people who follow you up the
 * ladder are there when you arrive.
 *
 * `enterArea` was in the event vocabulary for a long time without ever firing,
 * and a schedule could not move anybody from one town to the next. This walks
 * off the road into Riverbend: the arrival card has to open, the street has to
 * hold still under it, and once it is read Kit has to be on the dock — because
 * walking in is what moved the story on.
 */
await test('walking into Riverbend stops you with what it costs, and Kit is on the dock', async () => {
  const page = await newPage(
    baseSave({
      cityId: 'riverbend',
      areaId: 'road-riverbend',
      period: 'morning',
      unlockedCityIds: ['apartment', 'silverCreek'],
      completedEventIds: [],
    }),
  )
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(500)
  assert(
    !(await page.locator('[data-testid="event-dialogue"]').isVisible()),
    'loading a save into an area played its arrival, which is for walking in',
  )

  await walkEdge(page, 'east')
  await page.waitForTimeout(500)
  assert(
    await page.locator('[data-testid="event-dialogue"]').isVisible(),
    'walking into Riverbend fired no arrival',
  )
  const before = await posOf(page)
  await step(page, 'ArrowLeft')
  await step(page, 'ArrowLeft')
  const after = await posOf(page)
  assert(
    before.col === after.col && before.row === after.row,
    `the street kept moving under the arrival (${before.col},${before.row} -> ${after.col},${after.row})`,
  )

  await talkThrough(page)
  assert(
    !(await page.locator('[data-testid="event-dialogue"]').isVisible()),
    'the arrival never finished',
  )
  // "Let's go" walks you aboard; Kit is on the dock when you come ashore.
  assert(await untilArea(page, /Riverboat/), `the arrival did not walk you aboard (in ${await areaNameOf(page)})`)
  await enterDoor(page, 'Ashore')
  const here = await poisOf(page)
  assert(
    here.some((p) => p.name === 'Kit'),
    `Kit is not on the dock in the morning (saw: ${here.map((p) => p.name).join(', ')})`,
  )
  assert(page.__errors.length === 0, `console errors: ${page.__errors[0]}`)
  await page.close()
})

/**
 * "Let's go" on the card outside the casino means in.
 *
 * A playtester pressed it and was left standing at the stop with the casino
 * somewhere up the street. Every town's arrival card now ends with the walk to
 * the door and through it. A double click on a card's last page is one press:
 * it used to finish the box and then turn the first page of the next one.
 */
await test(`pressing "Let's go" on the arrival card walks you into the casino`, async () => {
  const page = await newPage(
    baseSave({
      cityId: 'silverCreek',
      areaId: 'road-silvercreek',
      unlockedCityIds: ['apartment', 'silverCreek'],
      completedEventIds: STORY_SEEN.filter((id) => id !== 'arrive-silvercreek' && id !== 'marcus-rides-out-with-you'),
    }),
  )
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(500)
  await walkEdge(page, 'east')
  const card = page.locator('[data-testid="event-dialogue"]')
  await card.waitFor({ state: 'visible' })
  const go = page.locator('[data-testid="dialogue-advance"]')
  assert(/Let's go/.test(await go.innerText()), 'the first card is not one page')
  await go.dblclick()
  await page.waitForTimeout(300)
  const next = await card.innerText().catch(() => '')
  assert(/First time\?/.test(next), `a double click on "Let's go" went on past the Valet's first line (saw: ${next.slice(0, 80)})`)
  await talkThrough(page)
  assert(await untilArea(page, /Silver Creek Casino/), `"Let's go" left you outside (in ${await areaNameOf(page)})`)
  await page.waitForTimeout(800)
  assert(!(await card.isVisible().catch(() => false)), 'a box was left open inside')
  assert(!(await page.locator('[data-testid="event-fade"]').isVisible().catch(() => false)), 'the screen was left black')
  const at = await posOf(page)
  assert(at.col === 10 && at.row === 10, `you came in somewhere other than the door (${at.col},${at.row})`)
  // Not stuck: the keys are yours again, and the walk does not run twice.
  await step(page, 'ArrowUp')
  const moved = await posOf(page)
  assert(moved.row === 9, `the keys did not come back after the walk in (${moved.col},${moved.row})`)
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), SAVE_KEY)
  assert(saved.completedEventIds.includes('arrive-silvercreek'), 'the arrival was not marked done, so it would play again')
  assert(page.__errors.length === 0, `console errors: ${page.__errors[0]}`)
  await page.close()
})

/**
 * Losing is part of the story (docs/STORYBOARD.md, "When it goes wrong").
 *
 * The collectors used to be a man in a suit and a full-screen apology, and
 * nobody in the world knew you had lost anything. These walk the losing paths
 * in a real page: the collector is somebody and speaks before the shakedown;
 * a sponsor's collector stands beside her while you owe on time; broke, Marcus
 * deals you back in; and a lost match is met by Nadia and by Marcus.
 */
const LOSING_ROAD = ['apartment', 'silverCreek', 'riverbend']
const CASS_DEBT = (dueOnDay) => ({
  id: 'cass-1-0',
  sponsorId: 'cass',
  sponsorName: 'Cass',
  principal: 1500,
  owed: 1875,
  dueOnDay,
  cityId: 'riverbend',
})
// The box shows one line at a time; this is the speaker and the first.
const dialogueText = (page) => page.locator('[data-testid="event-dialogue"]').innerText().catch(() => '')
const choiceBox = (page) => page.locator('[data-testid="event-choice"]')
/** Waits for a question and answers it by its number, as a player at a keyboard would. */
async function answer(page, n) {
  await choiceBox(page).waitFor({ state: 'visible' })
  await page.keyboard.press(String(n))
  await page.waitForTimeout(250)
}
/** What the save in the browser says now. */
const savedState = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), SAVE_KEY)

await test('the collector who catches you has a face, and says their piece before the shakedown', async () => {
  const page = await newPage(
    baseSave({
      cityId: 'riverbend',
      areaId: 'rb-street',
      day: 6,
      period: 'afternoon',
      cash: 1000,
      unlockedCityIds: LOSING_ROAD,
      debts: [{ ...CASS_DEBT(4), missed: true }],
      huntedInCityId: 'riverbend',
    }),
  )
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  // Stand still and let him come.
  await page.locator('[data-testid="event-dialogue"]').waitFor({ state: 'visible', timeout: 25000 })
  const said = await dialogueText(page)
  assert(/Dutch/.test(said), `the collector is nobody in particular (saw: ${said.slice(0, 120)})`)
  assert(/Cash: \$1,000/.test(await page.locator('body').innerText()), 'the money went before he had said a word')
  await talkThrough(page)
  await page.locator('[data-testid="caught-by"]').waitFor()
  const who = await page.locator('[data-testid="caught-by"]').innerText()
  assert(/Dutch caught up with you/.test(who), `the shakedown does not say who (saw: ${who})`)
  await page.locator('button', { hasText: 'Pick yourself up' }).click()
  await page.waitForTimeout(600)
  const body = await page.locator('body').innerText()
  assert(/Cash: \$250\b/.test(body), `they did not take three quarters (saw: ${body.match(/Cash: \$[\d,]+/)?.[0]})`)
  assert(/Owed: \$1,875/.test(body), 'the debt moved when they caught you')
  assert(page.__errors.length === 0, `console errors: ${page.__errors[0]}`)
})

await test('while you owe Cass on time, Dutch stands beside her, and she says who he is', async () => {
  const page = await newPage(
    baseSave({
      cityId: 'riverbend',
      areaId: 'rb-street',
      day: 2,
      period: 'morning',
      unlockedCityIds: LOSING_ROAD,
      debts: [CASS_DEBT(5)],
      completedEventIds: STORY_SEEN.filter((id) => id !== 'cass-owing'),
    }),
  )
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(500)
  const here = await poisOf(page)
  assert(here.some((p) => p.name === 'Dutch'), `Dutch is not by the bollard (saw: ${here.map((p) => p.name).join(', ')})`)
  await approach(page, 'Cass')
  await page.keyboard.press('e')
  await page.waitForTimeout(400)
  const said = await dialogueText(page)
  assert(/clock is running/.test(said), `Cass did not notice you owe her (saw: ${said.replace(/\n/g, ' | ').slice(0, 120)})`)
  await talkThrough(page)
  // She asks whether you will pay now; not yet.
  await answer(page, 2)
  await talkThrough(page)
  // Once said, the next talk is the stake menu again, so the debt can be paid.
  await page.keyboard.press('e')
  await page.waitForTimeout(400)
  await talkThrough(page)
  assert(/Pay it back|Not enough cash/.test(await page.locator('body').innerText()), 'the beat stood between you and paying her')
  assert(page.__errors.length === 0, `console errors: ${page.__errors[0]}`)
})

await test('broke, Marcus deals you back in at the kitchen table', async () => {
  // Up the ladder as far as the Harbor, before anybody in Porto Lumina has
  // named a match: Marcus is at home, and deals.
  const page = await newPage(
    baseSave({
      cityId: 'apartment',
      areaId: 'marcus-house',
      period: 'evening',
      cash: 40,
      completedEventIds: STORY_SEEN.filter((id) => id !== 'nadia-names-the-match'),
    }),
  )
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(500)
  await approach(page, 'Marcus')
  await page.keyboard.press('e')
  await page.waitForTimeout(400)
  const said = await dialogueText(page)
  assert(/first night/.test(said), `Marcus did not notice you are broke (saw: ${said.slice(0, 120)})`)
  await talkThrough(page)
  await answer(page, 1)
  await page.waitForTimeout(600)
  assert((await page.locator('[data-testid="overworld"]').count()) === 0, 'still in the street: the game never started')
  assert(page.__errors.length === 0, `console errors: ${page.__errors[0]}`)
})

/**
 * The opening. The first time you step outside, Dana runs up the street to
 * you, walks you to the 14 and rides it with you to Marcus's door — and you
 * cannot walk off in the middle of it, skip the bus, or reload your way past
 * it. Then Marcus's game starts the way it always has.
 */
/** The line up now, without waiting for one to appear: a beat walking somebody shows no box. */
const dialogueNow = (page) =>
  page.evaluate(() => document.querySelector('[data-testid="event-dialogue"]')?.innerText ?? '')
/** Where somebody is drawn, from the scene's own published positions. */
async function drawnAt(page, id) {
  const people = await page.evaluate(() => document.querySelector('[data-testid="overworld"]')?.dataset.people ?? '')
  const found = people.split(';').find((p) => p.startsWith(`${id}@`))
  if (!found) return null
  const [col, row] = found.split('@')[1].split(',').map(Number)
  return { col, row }
}
/** Waits for a line of a beat matching `re`, clicking through any before it. */
async function untilSaid(page, re, budget = 20000) {
  for (let waited = 0; waited < budget; waited += 150) {
    const said = await dialogueNow(page)
    if (re.test(said)) return said
    await page.waitForTimeout(150)
  }
  throw new Error(`never said ${re} (last: ${(await dialogueNow(page)).slice(0, 100)})`)
}
/** Clicks the text box on until a line matching `re` is up. */
async function readUntil(page, re, budget = 25000) {
  for (let waited = 0; waited < budget; waited += 200) {
    // Read and click in one go inside the page: a click that waited for a box
    // could land on the next one, unread.
    const said = await page.evaluate((source) => {
      const box = document.querySelector('[data-testid="event-dialogue"]')
      const text = box?.innerText ?? ''
      if (new RegExp(source).test(text)) return text
      box?.querySelector('[data-testid="dialogue-advance"]')?.click()
      return null
    }, re.source)
    if (said !== null) return said
    await page.waitForTimeout(200)
  }
  await shot(page, `stuck-before-${String(re).slice(1, 20)}`)
  const at = await posOf(page)
  throw new Error(`never got to ${re} (last: ${(await dialogueNow(page)).slice(0, 100)}; at ${JSON.stringify(at)} in ${await areaNameOf(page)})`)
}

await test('the opening: Dana runs to you, walks you to the 14 and rides it with you to Marcus', async () => {
  const page = await newPage(null)
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(400)
  await enterDoor(page, 'Outside')
  await untilSaid(page, /calling after you/)
  const start = await posOf(page)
  await page.locator('[data-testid="dialogue-advance"]').click()

  // She comes on at the far end of the street and runs: seen on tile after tile.
  const seen = new Set()
  let first = null
  for (let i = 0; i < 80 && !(await dialogueNow(page)).includes('Dana:'); i++) {
    const dana = await drawnAt(page, 'character-dana')
    if (dana) {
      first ??= dana
      seen.add(`${dana.col},${dana.row}`)
    }
    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(70)
  }
  await shot(page, 'opening-dana-arrives')
  assert(first && first.col >= 20, `Dana did not come from the end of the street (first seen ${JSON.stringify(first)})`)
  assert(seen.size >= 5, `Dana appeared rather than ran (seen on ${seen.size} tiles)`)
  const met = await drawnAt(page, 'character-dana')
  const here = await posOf(page)
  assert(here.col === start.col && here.row === start.row, 'the player walked off while she was running')
  assert(Math.abs(met.col - here.col) + Math.abs(met.row - here.row) === 1, `she stopped short of you (${JSON.stringify(met)} vs ${JSON.stringify(here)})`)

  // What you say to her: mind your own business.
  await readUntil(page, /raised the river/)
  await page.locator('[data-testid="dialogue-advance"]').click()
  await answer(page, 3)
  await readUntil(page, /Walk with me/)
  await page.locator('[data-testid="dialogue-advance"]').click()

  // She leads, you follow — and the keys do nothing.
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(120)
  }
  await untilSaid(page, /Get on/)
  assert((await areaNameOf(page)).includes('Depot'), `not at the depot (${await areaNameOf(page)})`)
  const beside = await drawnAt(page, 'character-dana')
  const atStop = await posOf(page)
  assert(beside && Math.abs(beside.col - atStop.col) + Math.abs(beside.row - atStop.row) === 1, 'Dana did not come with you to the stop')
  await page.locator('[data-testid="dialogue-advance"]').click()

  // The ride: nobody gets off.
  await page.locator('[data-testid="bus-ride"]').waitFor({ state: 'visible' })
  await shot(page, 'opening-ride')
  assert(await page.locator('[data-testid="bus-ride"][data-forced]').isVisible(), 'the ride is not a forced one')
  assert((await page.locator('button', { hasText: /Skip the ride|Step off/ }).count()) === 0, 'the ride can be skipped')
  assert(await page.locator('[data-testid="bus-companion"]').isVisible(), 'Dana is not sat with you')
  await readUntil(page, /Middle door/)
  assert((await areaNameOf(page)).includes('Eastgate'), `the bus did not put you down at Eastgate (${await areaNameOf(page)})`)
  await page.locator('[data-testid="dialogue-advance"]').click()
  await readUntil(page, /goes in ahead of you/)
  await page.locator('[data-testid="dialogue-advance"]').click()
  await page.waitForTimeout(400)
  const door = (await exitsOf(page)).find((e) => e.label === "Marcus's")
  const atDoor = await posOf(page)
  assert(atDoor.col === door.col && atDoor.row === door.row + 1, `not stood at Marcus's door (${JSON.stringify(atDoor)})`)

  const saved = await savedState(page)
  assert(saved.completedEventIds.includes('dana-walks-you-to-the-bus'), 'the opening was not saved as over')
  assert(saved.flags.brushedOffDana === true && saved.flags.metDana === true, 'what you said to Dana was not remembered')
  assert(saved.period === 'afternoon', `the ride did not cost the hour (${saved.period})`)

  // And Marcus's game starts as it always has.
  await enterDoor(page, "Marcus's")
  await approach(page, 'Marcus')
  await page.keyboard.press('e')
  await page.waitForTimeout(400)
  await talkThrough(page)
  await page.waitForTimeout(600)
  const body = await page.locator('body').innerText()
  assert(/winner takes|Poker Night|Sit down/i.test(body), `the game never started (saw: ${body.slice(0, 160)})`)
  assert(page.__errors.length === 0, `console errors: ${page.__errors[0]}`)
})

await test('a reload in the middle of the opening starts it again rather than skipping it', async () => {
  const page = await newPage(null)
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(400)
  await enterDoor(page, 'Outside')
  await readUntil(page, /What you|raised the river/)
  await page.locator('[data-testid="dialogue-advance"]').click()
  await answer(page, 1)
  await readUntil(page, /Get on/)
  await page.locator('[data-testid="dialogue-advance"]').click()
  await page.locator('[data-testid="bus-ride"]').waitFor({ state: 'visible' })
  // Half-way across town, the page goes.
  const saved = await savedState(page)
  assert(saved.areaId === 'basin' && !saved.completedEventIds.includes('dana-walks-you-to-the-bus'), 'half a beat was saved')
  // Opened again on what was saved (newPage's own save would be put back on a reload).
  const again = await newPage(JSON.stringify(saved))
  await again.goto(BASE)
  await again.waitForSelector('canvas')
  await untilSaid(again, /calling after you/)
  assert((await areaNameOf(again)).includes('Basin Street'), 'not back on Basin Street')
  assert(page.__errors.length === 0 && again.__errors.length === 0, `console errors: ${[...page.__errors, ...again.__errors][0]}`)
})

await test('walking to Marcus before Dana finds you is caught at the depot', async () => {
  // A run from before the opening was written, already on its way on foot.
  const page = await newPage(
    baseSave({
      cash: 0,
      cityId: 'apartment',
      areaId: 'seventh',
      unlockedCityIds: ['apartment'],
      flags: { wonPokerNight: false, beatFinalRival: false, hasPenthouse: false },
      completedEventIds: STORY_SEEN.filter((id) => id !== 'dana-at-the-depot' && id !== 'dana-walks-you-to-the-bus'),
    }),
  )
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(500)
  await walkUntil(page, 'east', 'Depot')
  await readUntil(page, /There you are/)
  await readUntil(page, /raised the river/)
  await page.locator('[data-testid="dialogue-advance"]').click()
  await answer(page, 2)
  await readUntil(page, /Here it comes/)
  await page.locator('[data-testid="dialogue-advance"]').click()
  await page.locator('[data-testid="bus-ride"][data-forced]').waitFor({ state: 'visible' })
  await readUntil(page, /goes in ahead of you/)
  await page.locator('[data-testid="dialogue-advance"]').click()
  await page.waitForTimeout(400)
  assert((await areaNameOf(page)).includes('Eastgate'), 'the depot did not put you on the bus to Marcus')
  const saved = await savedState(page)
  assert(saved.flags.toldDanaToWatch === true, 'what you said to Dana at the depot was not remembered')
  assert(saved.completedEventIds.includes('dana-at-the-depot'), 'the depot beat was not saved as over')
  assert(page.__errors.length === 0, `console errors: ${page.__errors[0]}`)
})

/**
 * After the first game. Winning Marcus's table used to put you back in his
 * front room with nothing said and no idea what came next. Now getting up a
 * winner is a beat: Marcus and Dana make their excuses and name the bus, Dana
 * walks you home, and in the morning Marcus is on your step and rides the 14
 * out to Silver Creek with you.
 *
 * The deck is real. Only the shuffle is made repeatable: Math.random, which
 * the table draws from, is seeded from the moment Marcus deals until you get
 * up, and the player shoves every hand.
 */
const POKER_NIGHT_SEED = 7

/** Seeds Math.random while `window.__seeded` is on; the rest of the game keeps the real one. */
async function seedRandom(page, seed) {
  await page.addInitScript((start) => {
    const real = Math.random
    let s = start >>> 0
    const seeded = () => {
      s = (s + 0x6d2b79f5) >>> 0
      let t = s
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
    Math.random = () => (window.__seeded ? seeded() : real())
  }, seed)
}

/** Sits down at Marcus's table from his front room and shoves every hand until the table is yours. */
async function winPokerNight(page, budget = 150000) {
  await approach(page, 'Marcus')
  await page.keyboard.press('e')
  await readUntil(page, /You in\?/)
  await page.evaluate(() => {
    window.__seeded = true
  })
  await page.locator('[data-testid="dialogue-advance"]').click()
  let hands = 0
  for (let waited = 0; waited < budget; waited += 200) {
    const headOut = page.locator('button', { hasText: 'Head out' })
    if (await headOut.isVisible().catch(() => false)) {
      await page.evaluate(() => {
        window.__seeded = false
      })
      await headOut.click()
      return hands
    }
    for (const label of [/^All in/, /^Call /, /^Check$/, /^Next hand/, /^Deal me back in/, /Continue|Let's go/]) {
      const button = page.locator('button', { hasText: label }).first()
      if (await button.isVisible().catch(() => false)) {
        if (String(label).includes('Next hand')) hands++
        await button.click()
        break
      }
    }
    await page.waitForTimeout(200)
  }
  throw new Error(`never won the poker night (${hands} hands)`)
}

/** Whether somebody is drawn on a tile next to the player. */
async function besideYou(page, id) {
  const [them, you] = await Promise.all([drawnAt(page, id), posOf(page)])
  return !!them && !!you && Math.abs(them.col - you.col) + Math.abs(them.row - you.row) === 1
}

await test('after the first game Dana walks you home and Marcus rides out with you to Silver Creek', async () => {
  const page = await newPage(
    openedSave({
      areaId: 'marcus-house',
      period: 'evening',
      flags: { wonPokerNight: false, beatFinalRival: false, hasPenthouse: false, metDana: true, brushedOffDana: true },
      // Nobody has greeted you at Silver Creek yet: Marcus does it himself.
      completedEventIds: STORY_SEEN.filter(
        (id) => !['dana-walks-you-home', 'marcus-rides-out-with-you', 'arrive-silvercreek'].includes(id),
      ),
    }),
  )
  await seedRandom(page, POKER_NIGHT_SEED)
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(500)
  await winPokerNight(page)

  // Up from the table a winner, and the room has something to say about it.
  await untilSaid(page, /last chip slides across/)
  assert((await areaNameOf(page)).includes('Marcus'), `not in Marcus's front room (${await areaNameOf(page)})`)
  await readUntil(page, /cards were cold/)
  await readUntil(page, /watching you instead of my cards/)
  assert(await besideYou(page, 'character-dana'), 'Dana did not come over from the table')
  await shot(page, 'after-the-game-excuses')
  // What you said to her on the 14 is remembered.
  await readUntil(page, /You were my business tonight/)
  await readUntil(page, /14 runs there from the depot, and the fare is nothing/)
  await readUntil(page, /hundred buys a seat/)
  await readUntil(page, /walk you home/)

  // She walks you out and home. The keys do nothing on the way.
  await readUntil(page, /This is you/)
  assert((await areaNameOf(page)).includes('Basin Street'), `not at your door (${await areaNameOf(page)})`)
  assert(await besideYou(page, 'character-dana'), 'Dana did not walk you home')
  await shot(page, 'after-the-game-your-door')
  await readUntil(page, /four hundred/)
  assert((await areaNameOf(page)).includes('Apartment'), `not in your flat (${await areaNameOf(page)})`)
  await readUntil(page, /Coat! Bus!/)
  await page.locator('[data-testid="dialogue-advance"]').click()
  await page.waitForTimeout(500)
  assert((await dialogueNow(page)) === '', 'the walk home did not end')
  const home = await savedState(page)
  assert(home.completedEventIds.includes('dana-walks-you-home'), 'the walk home was not saved as over')
  assert(home.areaId === 'home' && home.day === 2 && home.period === 'morning', `not home the next morning (${home.areaId}, day ${home.day}, ${home.period})`)
  assert(home.flags.wonPokerNight === true && home.cash >= 1500, 'the win was not kept')

  // The morning: out of the door, and Marcus is there.
  await enterDoor(page, 'Outside')
  await readUntil(page, /timing me/)
  assert(await besideYou(page, 'character-marcus'), 'Marcus is not on your step')
  await readUntil(page, /getting on it with you/)
  await page.locator('[data-testid="dialogue-advance"]').click()
  await readUntil(page, /do not get off at Eastgate/)
  assert((await areaNameOf(page)).includes('Depot'), `not at the depot (${await areaNameOf(page)})`)
  assert(await besideYou(page, 'character-marcus'), 'Marcus did not come to the stop')
  await page.locator('[data-testid="dialogue-advance"]').click()
  await page.locator('[data-testid="bus-ride"][data-forced]').waitFor({ state: 'visible' })
  assert(await page.locator('[data-testid="bus-companion"]').isVisible(), 'Marcus is not sat with you')
  await shot(page, 'after-the-game-ride-out')
  await readUntil(page, /Porto Lumina/)
  await readUntil(page, /Silver Creek\. A casino/)
  assert((await areaNameOf(page)).includes('Silver Creek'), `the bus did not put you down at Silver Creek (${await areaNameOf(page)})`)
  await readUntil(page, /Real poker/)
  await readUntil(page, /Pit boss, top left/)
  assert((await areaNameOf(page)).includes('Casino'), `Marcus did not walk you in (${await areaNameOf(page)})`)
  await shot(page, 'after-the-game-casino')
  await readUntil(page, /story I can tell/)
  await readUntil(page, /pit boss is waiting/)
  await page.locator('[data-testid="dialogue-advance"]').click()
  await page.waitForTimeout(500)
  assert((await dialogueNow(page)) === '', 'the ride out did not end')
  assert(!(await drawnAt(page, 'character-marcus')), 'Marcus is still standing on the floor')
  const there = await savedState(page)
  assert(there.cityId === 'silverCreek' && there.areaId === 'sc-floor', `not on the casino floor (${there.cityId}/${there.areaId})`)
  assert(there.unlockedCityIds.includes('silverCreek'), 'arriving with Marcus did not count as visiting Silver Creek')
  assert(there.completedEventIds.includes('marcus-rides-out-with-you'), 'the ride out was not saved as over')
  assert(there.flags.marcusSeesYouOff === false, 'Marcus is still seeing you off')

  // The table he pointed at is there to sit at; and out of the door the
  // valet's card is not read to somebody Marcus walked in.
  await approach(page, 'Pit Boss')
  await enterDoor(page, 'Out')
  await page.waitForTimeout(800)
  assert((await dialogueNow(page)) === '', `the arrival card played after Marcus walked you in (${(await dialogueNow(page)).slice(0, 80)})`)
  assert(page.__errors.length === 0, `console errors: ${page.__errors[0]}`)
})

await test('a reload in the middle of the walk home or the ride out starts it again', async () => {
  // Saved the moment you got up from Marcus's table a winner.
  const won = await newPage(
    openedSave({
      areaId: 'marcus-house',
      period: 'evening',
      cash: 1500,
      flags: { wonPokerNight: true, beatFinalRival: false, hasPenthouse: false, metDana: true },
      completedEventIds: STORY_SEEN.filter((id) => !['dana-walks-you-home', 'marcus-rides-out-with-you'].includes(id)),
    }),
  )
  await won.goto(BASE)
  await won.waitForSelector('canvas')
  await readUntil(won, /walk you home/)
  // Half-way through, the page goes.
  const mid = await savedState(won)
  assert(mid.areaId === 'marcus-house' && mid.period === 'evening' && !mid.completedEventIds.includes('dana-walks-you-home'), 'half the walk home was saved')
  const again = await newPage(JSON.stringify(mid))
  await again.goto(BASE)
  await again.waitForSelector('canvas')
  await untilSaid(again, /last chip slides across/)

  // Saved on your step the next morning, Marcus waiting.
  const step = await newPage(
    openedSave({
      areaId: 'basin',
      period: 'morning',
      day: 2,
      cash: 1500,
      flags: { wonPokerNight: true, beatFinalRival: false, hasPenthouse: false, metDana: true, marcusSeesYouOff: true },
      completedEventIds: STORY_SEEN.filter((id) => id !== 'marcus-rides-out-with-you'),
    }),
  )
  await step.goto(BASE)
  await step.waitForSelector('canvas')
  await readUntil(step, /getting on it with you/)
  await step.locator('[data-testid="dialogue-advance"]').click()
  await readUntil(step, /do not get off at Eastgate/)
  await step.locator('[data-testid="dialogue-advance"]').click()
  await step.locator('[data-testid="bus-ride"]').waitFor({ state: 'visible' })
  const onTheBus = await savedState(step)
  assert(
    onTheBus.areaId === 'basin' && onTheBus.flags.marcusSeesYouOff && !onTheBus.completedEventIds.includes('marcus-rides-out-with-you'),
    'half the ride out was saved',
  )
  const back = await newPage(JSON.stringify(onTheBus))
  await back.goto(BASE)
  await back.waitForSelector('canvas')
  await untilSaid(back, /timing me/)
  assert((await areaNameOf(back)).includes('Basin Street'), 'not back on your step')
  const errors = [won, again, step, back].flatMap((p) => p.__errors)
  assert(errors.length === 0, `console errors: ${errors[0]}`)
})

await test('a beat remembers what you said, and every line of it is read out', async () => {
  // Told Dana to mind her own business on the 14; she brings it up after the
  // first night. Her lines come as two boxes back to back, and the second used
  // to open on the first one's last page: blank, and impossible to close.
  const page = await newPage(
    openedSave({
      areaId: 'laundromat',
      cash: 1500,
      flags: { wonPokerNight: true, beatFinalRival: false, hasPenthouse: false, metDana: true, brushedOffDana: true },
    }),
  )
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(500)
  await approach(page, 'Dana')
  await page.keyboard.press('e')
  await page.waitForTimeout(400)
  await readUntil(page, /Go and lose it somewhere bigger/)
  await readUntil(page, /You were my business tonight/)
  await readUntil(page, /I will be around/)
  await page.locator('[data-testid="dialogue-advance"]').click()
  await page.waitForTimeout(400)
  assert((await dialogueNow(page)) === '', 'the beat did not end')
  const saved = await savedState(page)
  assert(saved.completedEventIds.includes('dana-takes-your-measure'), 'the beat was not saved as over')
  assert(page.__errors.length === 0, `console errors: ${page.__errors[0]}`)
})

/**
 * A beat can ask the player something. The question is the table's own pixel
 * buttons over the street, answered by number, by arrows and Enter, or by a
 * tap; what you answer is remembered, and a road you cannot take is shown shut.
 */
const BROKE_AT_HOME = () =>
  baseSave({
    cityId: 'apartment',
    areaId: 'marcus-house',
    period: 'evening',
    cash: 40,
    completedEventIds: STORY_SEEN.filter((id) => id !== 'nadia-names-the-match'),
  })

for (const [label, size, device] of [
  ['laptop', { width: 1100, height: 800 }, null],
  ['short laptop', { width: 1366, height: 500 }, null],
  ['phone', null, { ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, screen: { width: 390, height: 844 } }],
]) {
  await test(`a question fits the screen and every answer can be pressed (${label})`, async () => {
    const page = await newPage(BROKE_AT_HOME(), device)
    if (size) await page.setViewportSize(size)
    await page.goto(BASE)
    await page.waitForSelector('canvas')
    await page.waitForTimeout(500)
    await approach(page, 'Marcus')
    await page.keyboard.press('e')
    await page.waitForTimeout(400)
    await talkThrough(page)
    await choiceBox(page).waitFor({ state: 'visible' })
    const box = await page.evaluate(() => {
      const options = [...document.querySelectorAll('[data-testid^="choice-option-"]')]
      return {
        width: window.innerWidth,
        height: window.innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        options: options.map((el) => {
          const r = el.getBoundingClientRect()
          // What is actually on top in the middle of the button: it, not something laid over it.
          const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
          return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, height: r.height, onTop: !!hit && el.contains(hit) }
        }),
      }
    })
    await shot(page, `choice-${label}`)
    assert(box.options.length === 2, `expected two answers, saw ${box.options.length}`)
    for (const [i, o] of box.options.entries()) {
      assert(o.left >= 0 && o.right <= box.width + 0.5, `answer ${i + 1} runs off the side (${o.left}..${o.right} of ${box.width})`)
      assert(o.top >= 0 && o.bottom <= box.height + 0.5, `answer ${i + 1} runs off the bottom (${o.top}..${o.bottom} of ${box.height})`)
      assert(o.onTop, `answer ${i + 1} is covered by something else`)
      if (device) assert(o.height >= 38, `answer ${i + 1} is ${o.height}px tall: too small for a finger`)
    }
    assert(box.scrollWidth <= box.width, 'the question makes the page scroll sideways')
    // A tap works as well as a key: "Not tonight".
    await page.locator('[data-testid="choice-option-1"]').click()
    await page.waitForTimeout(300)
    assert(/Proud/.test(await dialogueText(page)), 'tapping an answer did nothing')
    assert(page.__errors.length === 0, `console errors: ${page.__errors[0]}`)
  })
}

await test('the keys answer a question, and the answer is remembered', async () => {
  const page = await newPage(BROKE_AT_HOME())
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(500)
  await approach(page, 'Marcus')
  await page.keyboard.press('e')
  await page.waitForTimeout(400)
  await talkThrough(page)
  await choiceBox(page).waitFor({ state: 'visible' })
  const prompt = await page.locator('[data-testid="choice-prompt"]').innerText()
  assert(/kitchen table/.test(prompt), `the question is not asked (saw: ${prompt})`)
  // The pointer starts on the first answer; S and W move it as the arrows do,
  // and E picks the one it is on, as Enter and Space do.
  const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'))
  assert(focused === 'choice-option-0', `the first answer does not have the focus (${focused})`)
  await page.keyboard.press('s')
  await page.keyboard.press('w')
  await page.keyboard.press('ArrowDown')
  const pointed = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'))
  assert(pointed === 'choice-option-1', `S, W and down left the pointer on ${pointed}`)
  await page.keyboard.press('e')
  await page.waitForTimeout(300)
  assert(/Proud/.test(await dialogueText(page)), `E did not give the answer the pointer was on (saw: ${await dialogueText(page)})`)
  await talkThrough(page)
  await page.waitForTimeout(300)
  const saved = await savedState(page)
  assert(saved?.flags?.turnedDownMarcus === true, 'turning Marcus down was not remembered')
  // Asked again, and this time a number deals you in.
  await page.keyboard.press('e')
  await page.waitForTimeout(400)
  await talkThrough(page)
  await answer(page, 1)
  await page.waitForTimeout(600)
  assert((await page.locator('[data-testid="overworld"]').count()) === 0, 'pressing 1 did not deal you in')
  assert(page.__errors.length === 0, `console errors: ${page.__errors[0]}`)
})

await test('an answer you cannot give is shown shut, and cannot be given', async () => {
  // Owing Cass on time, with nowhere near enough to pay her back.
  const page = await newPage(
    baseSave({
      cityId: 'riverbend',
      areaId: 'rb-street',
      day: 2,
      period: 'morning',
      cash: 100,
      unlockedCityIds: LOSING_ROAD,
      debts: [CASS_DEBT(5)],
      completedEventIds: STORY_SEEN.filter((id) => id !== 'cass-owing'),
    }),
  )
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(500)
  await approach(page, 'Cass')
  await page.keyboard.press('e')
  await page.waitForTimeout(400)
  await talkThrough(page)
  await choiceBox(page).waitFor({ state: 'visible' })
  const pay = page.locator('[data-testid="choice-option-0"]')
  await shot(page, 'choice-shut')
  assert(await pay.isDisabled(), 'paying her back is open with $100 in your pocket')
  assert(/cannot cover it/.test(await pay.innerText()), `it does not say why (saw: ${await pay.innerText()})`)
  await page.keyboard.press('1')
  await pay.click({ force: true }).catch(() => {})
  await page.waitForTimeout(300)
  assert(await choiceBox(page).isVisible(), 'a shut answer closed the question')
  const saved = await savedState(page)
  assert(saved?.debts?.length === 1, 'the debt was paid without the money')
  await answer(page, 2)
  assert(/Three days/.test(await dialogueText(page)), 'the open answer did not play')
  assert(page.__errors.length === 0, `console errors: ${page.__errors[0]}`)
})

await test('a lost match: Nadia makes you wait, and Marcus says build it back', async () => {
  const page = await newPage(
    baseSave({
      cityId: 'portoLumina',
      day: 20,
      period: 'evening',
      // Enough for the buy-in, so what stops you is her week and not the money.
      cash: 130000,
      unlockedCityIds: ['apartment', 'portoLumina'],
      ownedItemIds: ['tuxedo'],
      finaleRematchDay: 25,
      record: { busted: 0, challengeLost: 1, sponsors: {} },
      completedEventIds: [...STORY_SEEN.filter((id) => id !== 'nadia-makes-you-wait'), 'marcus-at-the-rail', 'dana-reveal'],
    }),
  )
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(400)
  await enterDoor(page, 'Casino')
  await approach(page, 'Nadia Okonkwo')
  await page.keyboard.press('e')
  await page.waitForTimeout(400)
  const nadia = await dialogueText(page)
  assert(/Not tonight/.test(nadia), `Nadia did not notice she beat you (saw: ${nadia.slice(0, 120)})`)
  await talkThrough(page)
  await page.keyboard.press('e')
  await page.waitForTimeout(400)
  await talkThrough(page)
  assert(/Come back in 5 days/.test(await page.locator('body').innerText()), 'the rematch is not a week out')
  await page.locator('button', { hasText: 'Step away' }).click()
  await page.waitForTimeout(500)
  await approach(page, 'Marcus')
  await page.keyboard.press('e')
  await page.waitForTimeout(400)
  const marcus = await dialogueText(page)
  assert(/better tonight/.test(marcus), `Marcus said nothing about the match (saw: ${marcus.slice(0, 120)})`)
  await talkThrough(page)
  assert(page.__errors.length === 0, `console errors: ${page.__errors[0]}`)
})

await test('the town is one continuous place', async () => {
  const page = await newPage(openedSave())
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(400)
  await enterDoor(page, 'Outside')
  assert(await page.locator('[data-testid="minimap"]').isVisible(), 'no minimap on the street')

  // Out to the edge of town and back again, entirely on foot.
  await walkUntil(page, 'east', 'Depot')
  await walkUntil(page, 'north', 'Eastgate')
  await walkUntil(page, 'south', 'Depot')
  await walkUntil(page, 'west', 'Basin Street')

  // And the shops on the way are real rooms.
  await walkUntil(page, 'east', 'Seventh')
  await enterDoor(page, "Patel's")
  const pois = await poisOf(page)
  assert(pois.some((p) => p.name === 'Mr Patel'), `nobody in the shop (saw: ${pois.map((p) => p.name)})`)
  await enterDoor(page, 'Seventh Street')
  assert((await areaNameOf(page)).includes('Seventh'), 'could not get back out')
  assert(page.__errors.length === 0, `console errors: ${page.__errors[0]}`)
  await page.close()
})

/**
 * The average colour of what the overworld canvas is showing, 0..255 a channel.
 *
 * The hour's light is drawn by Pixi now, into the canvas, so there is no
 * overlay element to count: the only honest check that the evening looks like
 * the evening is to look at the pixels.
 */
async function canvasColour(page) {
  const png = await page.locator('[data-testid="overworld"] canvas').first().screenshot()
  return page.evaluate(async (b64) => {
    const img = new Image()
    img.src = `data:image/png;base64,${b64}`
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.width
    c.height = img.height
    const ctx = c.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const d = ctx.getImageData(0, 0, c.width, c.height).data
    let r = 0
    let g = 0
    let b = 0
    for (let i = 0; i < d.length; i += 4) {
      r += d[i]
      g += d[i + 1]
      b += d[i + 2]
    }
    const n = d.length / 4
    return { r: r / n, g: g / n, b: b / n, light: (0.299 * r + 0.587 * g + 0.114 * b) / n }
  }, png.toString('base64'))
}

/**
 * The town keeps its own hours.
 *
 * Every walk through a street used to meet exactly the same people on exactly
 * the same tiles, whatever you had been doing. A character with a schedule is
 * somewhere else by the evening, which is the only thing that makes the clock
 * worth having — and the only thing that makes coming back later a reason to.
 * And the street looks like the hour: dim and warm in the evening, dark and
 * blue at night, with the lamps and windows lit.
 */
await test('who is on the street depends on the hour', async () => {
  const page = await newPage(baseSave({ cityId: 'apartment', areaId: 'basin', period: 'morning' }))
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(800)

  const whoIsHere = () => poisOf(page).then((people) => people.map((p) => p.name).sort())
  const hudSays = () => page.textContent('[data-testid="overworld"]').catch(() => '')
  const lightOf = (p) => p.getAttribute('[data-testid="overworld"]', 'data-light')

  const morning = await whoIsHere()
  assert(morning.includes('Marcus'), `Marcus is not on Basin Street in the morning (saw: ${morning})`)
  assert((await hudSays()).includes('Morning'), 'the clock does not say what time it is')

  // Morning is the hour the art is drawn for, and is left clear.
  assert((await lightOf(page)) === 'day', 'the morning is being lit')
  const day = await canvasColour(page)

  const evening = await newPage(baseSave({ cityId: 'apartment', areaId: 'basin', period: 'evening' }))
  await evening.goto(BASE)
  await evening.waitForSelector('canvas')
  await evening.waitForTimeout(800)
  const later = await poisOf(evening).then((people) => people.map((p) => p.name).sort())
  assert(!later.includes('Marcus'), 'Marcus is still on Basin Street in the evening')
  assert((await lightOf(evening)) === 'evening', 'the evening is not lit as the evening')
  const dusk = await canvasColour(evening)
  // Dimmer, and warmer: the red holds up better than the blue does.
  assert(dusk.light < day.light * 0.88, `the evening is not dimmer (${dusk.light.toFixed(1)} against ${day.light.toFixed(1)})`)
  assert(dusk.r / dusk.b > (day.r / day.b) * 1.1, 'the evening is not warmer than the morning')

  const night = await newPage(baseSave({ cityId: 'apartment', areaId: 'basin', period: 'night' }))
  await night.goto(BASE)
  await night.waitForSelector('canvas')
  await night.waitForTimeout(800)
  assert((await lightOf(night)) === 'night', 'the night is not lit as the night')
  const dark = await canvasColour(night)
  // Properly dark, and blue rather than grey.
  assert(dark.light < day.light * 0.6, `the night is not dark (${dark.light.toFixed(1)} against ${day.light.toFixed(1)})`)
  assert(dark.b / dark.r > (day.b / day.r) * 1.15, 'the night is not blue')

  // Rooms keep their lamps on whatever the hour.
  const indoors = await newPage(baseSave({ cityId: 'apartment', areaId: 'bodega', period: 'night' }))
  await indoors.goto(BASE)
  await indoors.waitForSelector('canvas')
  await indoors.waitForTimeout(500)
  assert((await lightOf(indoors)) === 'day', 'a room goes dark at night')

  for (const p of [page, evening, night, indoors]) {
    assert(p.__errors.length === 0, `console errors: ${p.__errors[0]}`)
    await p.close()
  }
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

await test('a hand waits for the player before the next one', async () => {
  const page = await newPage(baseSave())
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(400)
  await enterDoor(page, 'Casino')
  await talkTo(page, 'Pit Boss')
  assert(await page.locator('[data-testid="pot-value"]').isVisible(), 'never reached the table')

  // Play to the end of a hand, then let it sit: the next one must wait to be asked for.
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
  const nextBtn = page.locator('button', { hasText: /Next hand/ })
  assert(await nextBtn.isVisible(), 'the end of a hand did not offer a Next hand button')
  // Nothing clicked: the board must stay up so the hand can be read. Longer than
  // the old auto-deal delay, so a regression to a timer is caught.
  await page.waitForTimeout(4500)
  assert(await page.locator('[data-testid="hand-over-bar"]').isVisible(), 'the next hand dealt itself')
  assert(
    (await page.locator('[data-testid="pot-value"]').getAttribute('data-pot')) !== null &&
      !(await page.locator('button', { hasText: /Fold|Check|^Call/ }).first().isVisible().catch(() => false)),
    'action buttons appeared before the player asked for the next hand',
  )
  await nextBtn.click()
  // A new hand hides the between-hands bar while it plays. Opponents can fold
  // round to the player, so the action buttons are not guaranteed to appear.
  let dealt = false
  for (let i = 0; i < 60 && !dealt; i++) {
    dealt = !(await page.locator('[data-testid="hand-over-bar"]').isVisible().catch(() => false))
    if (!dealt) await page.waitForTimeout(100)
  }
  assert(dealt, 'pressing Next hand never dealt a hand')
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

  const seatCount = await page.locator('[data-testid^="seat-"]').count()
  assert(seatCount === 6, `expected 6 seats on the felt, saw ${seatCount}`)

  // Checked over several hands rather than once on sit-down, because what a seat
  // holds changes hand to hand: each player's tell is a different cue each hand,
  // and a long one used to stretch the seat out over its neighbour. A single
  // snapshot caught that only when the unlucky cue happened to be showing.
  let worst = null
  for (let i = 0; i < 24; i++) {
    const clash = await page.evaluate(() => {
      const seats = [...document.querySelectorAll('[data-testid^="seat-"]')].map((el) => {
        const b = el.getBoundingClientRect()
        return { id: el.dataset.testid, left: b.left, top: b.top, right: b.right, bottom: b.bottom }
      })
      const box = (s) =>
        `${s.id} x:${Math.round(s.left)}-${Math.round(s.right)} y:${Math.round(s.top)}-${Math.round(s.bottom)}`
      for (let a = 0; a < seats.length; a++) {
        for (let b = a + 1; b < seats.length; b++) {
          const p = seats[a]
          const q = seats[b]
          if (p.left < q.right && q.left < p.right && p.top < q.bottom && q.top < p.bottom) {
            return `${box(p)} overlaps ${box(q)}`
          }
        }
      }
      // Overlapping is only the symptom. A seat is a fixed width, so that what it
      // happens to hold this hand — a line of flavour, a tell — cannot change how
      // much of the felt it takes. Two seats of different widths means something
      // inside one of them is sizing it again, and the collision is one unlucky
      // description away.
      const widths = seats.map((s) => s.right - s.left)
      if (Math.max(...widths) - Math.min(...widths) > 1) {
        return `seats are not all one width: ${seats.map(box).join(', ')}`
      }
      return null
    })
    worst = worst ?? clash
    for (const label of ['Check', /^Call/, 'Deal now', 'Next hand', 'Fold']) {
      const btn = page.locator('button', { hasText: label })
      if (await btn.isVisible().catch(() => false)) {
        await btn.click()
        break
      }
    }
    await page.waitForTimeout(200)
  }
  assert(worst === null, worst)
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
await test('a bet never covers a card or the pot', async () => {
  const page = await newPage(baseSave({ cityId: 'riverbend', cash: 50000 }))
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(400)
  await enterDoor(page, 'Riverboat')
  await talkTo(page, 'Dealer')
  assert(await page.locator('[data-testid="pot-value"]').isVisible(), 'never reached the table')

  let worst = 0
  let worstPot = 0
  for (let i = 0; i < 24; i++) {
    // The pot is the one number on the felt that must stay readable — a bet
    // written across it is what started this.
    worstPot = Math.max(
      worstPot,
      await page.evaluate(() => {
        const pot = document.querySelector('[data-testid="pot-value"]')?.getBoundingClientRect()
        if (!pot) return 0
        let area = 0
        for (const el of document.querySelectorAll('[data-testid^="bet-"]')) {
          const r = el.getBoundingClientRect()
          if (r.width === 0) continue
          if (r.right <= pot.left || pot.right <= r.left || r.bottom <= pot.top || pot.bottom <= r.top) continue
          const w = Math.min(r.right, pot.right) - Math.max(r.left, pot.left)
          const h = Math.min(r.bottom, pot.bottom) - Math.max(r.top, pot.top)
          area = Math.max(area, Math.round(w * h))
        }
        return area
      }),
    )
    const covered = await page.evaluate(() => {
      const chips = [...document.querySelectorAll('[data-testid^="bet-"]')]
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter((c) => c.r.width > 0)
      // Every card on the table, face up or face down, by the attribute each one
      // carries rather than by how it happens to be drawn: this used to match face-up
      // cards by their CSS gradient, which silently stopped matching anything the
      // day cards became pixel art.
      const cards = [...document.querySelectorAll('[data-card]')]
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
  assert(worstPot === 0, `a bet was drawn across the pot readout (${worstPot}px of it)`)
  assert(page.__errors.length === 0, `console errors: ${page.__errors[0]}`)
  await page.close()
})

/**
 * Nothing on the table sits on the board.
 *
 * Your own plate used to be laid over the community-card slots at the start of a
 * hand ("You D 100" written across the flop), and at a showdown the board was
 * drawn over the top of your plate instead. Checked by asking the browser what is
 * actually on top at points inside every slot — a z-index comparison cannot see
 * that — and, for the things that let clicks through (a speech bubble, an
 * announcement), by their boxes, since a hit test looks straight through them.
 */
for (const [label, viewport, device] of [
  ['laptop', { width: 1100, height: 800 }, null],
  ['short laptop', { width: 1366, height: 500 }, null],
  ['phone', null, { ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, screen: { width: 390, height: 844 } }],
  ['phone in Safari', null, devices['iPhone 13']],
]) {
  await test(`nothing covers the board on a ${label}`, async () => {
    const page = await newPage(
      baseSave({ cityId: 'riverbend', cash: 50000, lessonIds: ['tells', 'pot-odds', 'position'] }),
      device,
    )
    if (viewport) await page.setViewportSize(viewport)
    await page.goto(BASE)
    await page.waitForSelector('canvas')
    await page.waitForTimeout(400)
    await enterDoor(page, 'Riverboat')
    await talkTo(page, 'Dealer')
    assert(await page.locator('[data-testid="pot-value"]').isVisible(), 'never reached the table')

    let worst = null
    let showdowns = 0
    // Sampled until the end of a hand has been seen twice: a showdown is half of
    // what this guards, and under load six players can take a while to get there.
    for (let i = 0; i < 140 && (i < 30 || showdowns < 2); i++) {
      const seen = await page.evaluate(() => {
        const board = document.querySelector('[data-testid="board"]')
        if (!board) return { problem: 'there is no board' }
        const name = (el) =>
          el ? el.closest('[data-testid]')?.dataset.testid ?? el.tagName.toLowerCase() : 'nothing'
        for (const slot of board.children) {
          const r = slot.getBoundingClientRect()
          for (const [fx, fy] of [[0.12, 0.1], [0.88, 0.1], [0.5, 0.5], [0.12, 0.9], [0.88, 0.9]]) {
            const x = r.left + r.width * fx
            const y = r.top + r.height * fy
            const top = document.elementFromPoint(x, y)
            if (!top || !board.contains(top)) {
              return { problem: `the board at (${Math.round(x)},${Math.round(y)}) is covered by ${name(top)}` }
            }
          }
        }
        const b = board.getBoundingClientRect()
        const others = document.querySelectorAll(
          '[data-testid^="seat-"], [data-testid="hero-cards"], [data-testid^="bet-"], [data-testid^="won-"], [data-testid^="speech-"], [data-testid="announcement"], [data-testid="pot-value"]',
        )
        for (const el of others) {
          const r = el.getBoundingClientRect()
          if (r.width === 0 || r.height === 0) continue
          if (r.left < b.right && b.left < r.right && r.top < b.bottom && b.top < r.bottom) {
            return {
              problem: `${el.dataset.testid} (${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}) overlaps the board (${Math.round(b.left)},${Math.round(b.top)} ${Math.round(b.width)}x${Math.round(b.height)})`,
            }
          }
        }
        return { problem: null, showdown: !!document.querySelector('[data-testid="showdown-summary"]') }
      })
      worst = worst ?? seen.problem
      if (seen.showdown) showdowns++
      for (const label of ['Check', /^Call/, 'Deal now', 'Next hand', 'Fold']) {
        const btn = page.locator('button', { hasText: label })
        if (await btn.first().isVisible().catch(() => false)) {
          await btn.first().click()
          break
        }
      }
      await page.waitForTimeout(220)
    }
    assert(worst === null, worst)
    assert(showdowns > 0, 'never saw the end of a hand, so the showdown layout went unchecked')
    assert(page.__errors.length === 0, `console errors: ${page.__errors[0]}`)
    await page.close()
  })
}

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
  const page = await newPage(openedSave())
  await page.setViewportSize({ width: 1024, height: 560 })
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(400)
  await enterDoor(page, 'Outside')
  // Walked until the depot is actually underfoot, not a fixed two crossings: a
  // crossing that takes longer than expected under load used to be retried from
  // inside the next map, which carried the player several towns past the stop.
  await walkUntil(page, 'east', 'Depot')
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

/**
 * The menu is a panel over the game, not a place you go.
 *
 * As a view of its own it replaced the scene, which unmounted the poker table —
 * and the table is where the hand, the chips in front of you and the buy-in
 * already taken out of your wallet all live. Opening the menu mid-session cost
 * the player everything they had won and put them back on the street.
 */
await test('opening the menu mid-hand does not cost you the table', async () => {
  const page = await newPage(baseSave())
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(400)
  await enterDoor(page, 'Casino')
  await talkTo(page, 'Pit Boss')
  assert(await page.locator('[data-testid="pot-value"]').isVisible(), 'never reached the table')

  // Play a little so the stack is no longer just the buy-in.
  for (let i = 0; i < 12; i++) {
    for (const label of ['Check', /^Call/, 'Deal now', 'Next hand']) {
      const btn = page.locator('button', { hasText: label })
      if (await btn.isVisible().catch(() => false)) {
        await btn.click()
        break
      }
    }
    await page.waitForTimeout(190)
  }

  const snapshot = () =>
    page.evaluate(() => ({
      stack: document.querySelector('[data-testid="stack-you"]')?.dataset.stack ?? null,
      atTable: !!document.querySelector('[data-testid="pot-value"]'),
      wallet: (document.body.innerText.match(/Wallet: \$([\d,]+)/) || [])[1] ?? null,
    }))

  const before = await snapshot()
  assert(before.atTable && before.stack !== null, 'lost the table before even opening the menu')

  await page.locator('[data-testid="settings-button"]').click()
  await page.waitForTimeout(400)
  assert((await page.locator('body').innerText()).includes('Settings'), 'the menu did not open')

  await page.locator('button', { hasText: 'Back to the game' }).click()
  await page.waitForTimeout(500)

  const after = await snapshot()
  assert(after.atTable, 'coming back from the menu dumped the player out of the game')
  assert(
    after.stack === before.stack,
    `the chips in front of the player changed over the menu (${before.stack} -> ${after.stack})`,
  )
  assert(
    after.wallet === before.wallet,
    `the wallet changed over the menu (${before.wallet} -> ${after.wallet})`,
  )
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

/** What has the keyboard's focus: its test id, or its text. */
const focusedOf = (page) =>
  page.evaluate(() => {
    const el = document.activeElement
    if (!el || el === document.body) return null
    const nth = [...document.querySelectorAll('button, input, a[href]')].indexOf(el)
    return el.getAttribute('data-testid') || `${el.textContent?.trim().slice(0, 40) || el.tagName}#${nth}`
  })

/**
 * The ☰ opens a panel down the side, not a page: the game stays where it was
 * beside it, the keys work it, and Escape, the X or a tap off it puts it away.
 */
for (const [label, device] of [
  ['laptop', null],
  ['phone', devices['iPhone 13']],
]) {
  await test(`the menu is a side panel the keys and a finger can work (${label})`, async () => {
    const page = await newPage(baseSave({ cash: 4242, ownedItemIds: [] }), device)
    await page.goto(BASE)
    await page.waitForSelector('canvas')
    await page.waitForTimeout(500)

    await page.locator('[data-testid="settings-button"]').click()
    await page.waitForTimeout(400)
    const nav = page.locator('[data-testid="side-nav"]')
    assert(await nav.isVisible(), 'the ☰ opened no menu')
    const box = await page.evaluate(() => {
      const r = document.querySelector('[data-testid="side-nav"] [role="dialog"]').getBoundingClientRect()
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, w: window.innerWidth, h: window.innerHeight, sw: document.documentElement.scrollWidth }
    })
    assert(box.right <= box.w && box.right > box.w - 24, `the panel is not against the right edge (${box.left}..${box.right} of ${box.w})`)
    assert(box.left > 8, 'the panel covers the whole width: a page, not a side panel')
    assert(box.top >= 0 && box.bottom <= box.h, 'the panel runs off the top or bottom')
    assert(box.sw <= box.w, 'the panel makes the page scroll sideways')
    assert((await page.locator('body').innerText()).includes('$4,242'), 'the menu does not say what you have')

    if (!device) {
      // The cursor starts at the top, and the keys move it and pick with it.
      assert((await focusedOf(page)) === 'nav-resume', `the cursor started on ${await focusedOf(page)}`)
      const before = await posOf(page)
      await page.keyboard.press('s')
      assert((await focusedOf(page)) === 'nav-bag', `S moved the cursor to ${await focusedOf(page)}`)
      await page.keyboard.press('ArrowDown')
      assert((await focusedOf(page)) === 'nav-jobs', `↓ moved the cursor to ${await focusedOf(page)}`)
      await page.keyboard.press('w')
      await page.keyboard.press('e')
      await page.waitForTimeout(200)
      assert(await page.locator('[data-testid="nav-back"]').isVisible(), 'E on Bag did not open the bag')
      assert((await page.locator('body').innerText()).includes('Things you carry'), 'the bag shows nothing')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)
      assert(await page.locator('[data-testid="nav-bag"]').isVisible(), 'Escape in the bag did not go back up')
      const after = await posOf(page)
      assert(before.col === after.col && before.row === after.row, 'working the menu walked the player underneath it')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(400)
      assert(!(await nav.isVisible().catch(() => false)), 'Escape did not close the menu')

      // Escape opens it from the street too, and Space on "Back to the game" closes it.
      await page.keyboard.press('Escape')
      await page.waitForTimeout(400)
      assert(await nav.isVisible(), 'Escape in the street did not open the menu')
      await page.keyboard.press(' ')
      await page.waitForTimeout(400)
      assert(!(await nav.isVisible().catch(() => false)), 'Space on "Back to the game" did not close the menu')
      const scrolled = await page.evaluate(() => window.scrollY)
      assert(scrolled === 0, 'Space scrolled the page')
      await page.locator('[data-testid="settings-button"]').click()
      await page.waitForTimeout(400)
    } else {
      const heights = await page.evaluate(() =>
        [...document.querySelectorAll('[data-testid="side-nav"] button')].map((b) => b.getBoundingClientRect().height),
      )
      assert(Math.min(...heights) >= 38, `a menu button is ${Math.min(...heights)}px tall: too small for a finger`)
    }

    // A tap off the panel puts it away.
    await page.mouse.click(4, Math.round(box.h / 2))
    await page.waitForTimeout(400)
    assert(!(await nav.isVisible().catch(() => false)), 'a tap off the panel did not close it')
    await page.locator('[data-testid="settings-button"]').click()
    await page.waitForTimeout(400)
    await page.locator('[data-testid="side-nav-close"]').click()
    await page.waitForTimeout(400)
    assert(!(await nav.isVisible().catch(() => false)), 'the X did not close the menu')
    assert(page.__errors.length === 0, `console errors: ${page.__errors[0]}`)
    await page.close()
  })
}

/**
 * Space and E both do the thing, wherever either does: talk to whoever you are
 * next to, turn the page, and pick in a menu — with the arrows or W A S D to
 * move the cursor, and Escape to leave.
 */
await test('Space and E both talk and turn the page, and a held key does not reopen it', async () => {
  const page = await newPage(baseSave())
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(500)
  await approach(page, 'Valet')
  const box = page.locator('[data-testid="dialogue-advance"]')
  const said = () => page.locator('[data-testid="overworld"]').innerText()

  await page.keyboard.press(' ')
  await page.waitForTimeout(250)
  assert(await box.isVisible(), 'Space did not talk to the Valet')
  const first = await said()
  await page.keyboard.press('e')
  await page.waitForTimeout(200)
  assert((await said()) !== first, 'E did not turn the page')
  await page.keyboard.press(' ')
  await page.waitForTimeout(250)
  assert(!(await box.isVisible().catch(() => false)), 'Space did not close the last page')
  // The auto-repeat of a key held through the last page is not a new press.
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', repeat: true })))
  await page.waitForTimeout(250)
  assert(!(await box.isVisible().catch(() => false)), 'a held E opened the conversation again')

  await page.keyboard.press('e')
  await page.waitForTimeout(250)
  assert(await box.isVisible(), 'E did not talk to the Valet')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(250)
  assert(!(await box.isVisible().catch(() => false)), 'Enter did not turn the pages')
  assert((await page.evaluate(() => window.scrollY)) === 0, 'Space scrolled the page')
  assert(page.__errors.length === 0, `console errors: ${page.__errors[0]}`)
  await page.close()
})

await test('a menu answers the arrows and W A S D, picks with E, and Escape leaves it', async () => {
  const page = await newPage(baseSave())
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(500)
  const menu = page.locator('[data-testid="menu-screen"]')
  const openBusStop = async () => {
    await approach(page, 'Bus Stop')
    for (let i = 0; i < 8 && !(await menu.isVisible().catch(() => false)); i++) {
      await page.keyboard.press(i % 2 ? 'e' : ' ')
      await page.waitForTimeout(300)
    }
    assert(await menu.isVisible(), 'Space and E at the bus stop never opened its menu')
  }
  await openBusStop()
  const first = await focusedOf(page)
  assert(first, 'the menu opened with no cursor')
  await page.keyboard.press('s')
  const second = await focusedOf(page)
  assert(second && second !== first, `S did not move the cursor (stayed on "${first}")`)
  await page.keyboard.press('ArrowUp')
  assert((await focusedOf(page)) === first, 'the up arrow did not move it back')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
  assert(!(await menu.isVisible().catch(() => false)), 'Escape did not leave the menu')
  assert(!(await page.locator('[data-testid="side-nav"]').isVisible().catch(() => false)), 'Escape in a menu opened the side panel as well')

  await openBusStop()
  await page.waitForTimeout(300)
  await page.keyboard.press('e')
  await page.waitForTimeout(500)
  assert(await page.locator('[data-testid="bus-ride"]').isVisible(), 'E on the first stop did not take the bus')
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

/**
 * A small desktop window is still a desktop.
 *
 * Touch used to be "coarse pointer or narrower than 820px", so dragging the
 * window small put a d-pad over the street and told a keyboard player to tap.
 * The device decides the controls; the window's size only decides how the
 * scene fits.
 */
await test('a small desktop window keeps the keyboard and still fits', async () => {
  const page = await newPage(baseSave())
  await page.setViewportSize({ width: 640, height: 420 })
  await page.goto(BASE)
  await page.waitForSelector('canvas')
  await page.waitForTimeout(600)
  const pointer = await page.evaluate(() => matchMedia('(pointer: fine)').matches)
  assert(pointer, 'this scenario needs a fine pointer')
  assert(!(await page.locator('[data-testid="touch-controls"]').isVisible()), 'a small desktop window got the touch d-pad')

  const before = await posOf(page)
  await step(page, 'ArrowLeft')
  const after = await posOf(page)
  assert(after.col !== before.col || after.row !== before.row, 'the arrow keys did not move the player in a small window')

  await approach(page, 'Valet')
  const prompt = await promptOf(page)
  assert(/^Press E/.test(prompt ?? ''), `the prompt in a small desktop window says "${prompt}"`)

  const fit = await page.evaluate(() => ({
    sideways: document.documentElement.scrollWidth - window.innerWidth,
    down: document.documentElement.scrollHeight - window.innerHeight,
  }))
  assert(fit.sideways <= 0 && fit.down <= 0, `the street does not fit a small window (${fit.sideways}px wide, ${fit.down}px tall)`)
  assert(page.__errors.length === 0, `console errors: ${page.__errors[0]}`)
  await page.close()
})

/**
 * The map editor.
 *
 * Maps are ASCII in source, which is the right format to keep them in and a bad
 * one to design in: you cannot see a street while counting commas, and a row one
 * character short is invisible by eye and fatal on load. This paints with the
 * game's own tile art and writes the sketch back out.
 */
await test('the map editor paints a map and writes the sketch back out', async () => {
  const page = await newPage(null)
  await page.goto(`${BASE}#editor`)
  await page.waitForSelector('[data-testid="editor-grid"]')
  await page.waitForTimeout(400)

  const sketch = () => page.inputValue('[data-testid="sketch"]')
  const before = await sketch()
  const grid = page.locator('[data-testid="editor-grid"]')
  const width = Number(await grid.getAttribute('data-width'))
  const height = Number(await grid.getAttribute('data-height'))
  assert(width > 0 && height > 0, 'the editor loaded no map')
  assert(before.split('\n').length === height, 'the sketch is a different height from the map')
  assert(
    before.split('\n').every((row) => row.length === width),
    'the sketch came out ragged, which would not parse',
  )

  // Paint one tile and watch it reach the sketch.
  await page.locator('[data-testid="brush-~"]').click()
  await page.locator('[data-cell="4,4"]').click()
  await page.waitForTimeout(150)
  const after = await sketch()
  assert(after !== before, 'painting changed nothing')
  assert(after.split('\n')[4][4] === '~', `tile (4,4) is "${after.split('\n')[4][4]}", not water`)
  assert(
    after.split('\n').every((row) => row.length === width),
    'painting made the sketch ragged',
  )

  // Problems are counted against the map as painted, not as saved.
  await page.locator('[data-testid="brush-#"]').click()
  const start = await page.locator('[data-testid="editor-grid"]').getAttribute('data-width')
  assert(start !== null, 'the grid vanished')

  // Reverting puts the map back exactly as it was.
  await page.locator('button:has-text("Revert")').click()
  await page.waitForTimeout(150)
  assert((await sketch()) === before, 'reverting did not restore the map')

  assert(page.__errors.length === 0, `console errors: ${page.__errors[0]}`)
  await page.close()
})

/** Walling in a doorway is the kind of mistake the editor should say out loud. */
await test('the map editor says when you have broken the map', async () => {
  const page = await newPage(null)
  await page.goto(`${BASE}#editor`)
  await page.waitForSelector('[data-testid="editor-grid"]')
  await page.waitForTimeout(400)

  const count = async () => (await page.locator('[data-testid="problem-count"]').textContent()).trim()
  assert((await count()) === '(0)', `a freshly loaded map already has problems: ${await count()}`)

  // Find a doorway from the markers and build a wall over it.
  const door = await page.evaluate(() => {
    const cells = [...document.querySelectorAll('[data-cell]')]
    const found = cells.find((c) => (c.getAttribute('title') ?? '').match(/^(Marcus's|Home|Outside)/))
    return found ? found.getAttribute('data-cell') : null
  })
  assert(door, 'no doorway on this map to test with')

  await page.locator('[data-testid="brush-#"]').click()
  await page.locator(`[data-cell="${door}"]`).click()
  await page.waitForTimeout(200)
  assert((await count()) !== '(0)', 'walling in a doorway raised no problem')
  const problems = await page.locator('[data-testid="problems"]').innerText()
  assert(/doorway|stand in front/i.test(problems), `unhelpful problem text: ${problems}`)

  assert(page.__errors.length === 0, `console errors: ${page.__errors[0]}`)
  await page.close()
})

/**
 * Dragging what stands on a map.
 *
 * Where a shop counter or a doorway sits used to mean hand-editing coordinates
 * in `cities.ts` and guessing what they looked like. These tests do not save —
 * saving writes to the real source file, and a test suite that edits the game
 * while checking the game is a bad trade.
 */
await test('the map editor drags a doorway to a new tile', async () => {
  const page = await newPage(null)
  await page.goto(`${BASE}#editor`)
  await page.waitForSelector('[data-testid="editor-grid"]')
  await page.waitForTimeout(500)

  const doorCell = await page.evaluate(
    () => document.querySelector('[data-marker="door"]')?.getAttribute('data-cell') ?? null,
  )
  assert(doorCell, 'no doorway on the first map to drag')

  // Somewhere empty to drop it, on the same map.
  const target = await page.evaluate(() => {
    const free = [...document.querySelectorAll('[data-cell]')].find((c) => !c.getAttribute('data-marker'))
    return free ? free.getAttribute('data-cell') : null
  })
  assert(target && target !== doorCell, 'nowhere free to drag the doorway to')

  const from = page.locator(`[data-cell="${doorCell}"]`)
  const to = page.locator(`[data-cell="${target}"]`)
  const sketchBefore = await page.inputValue('[data-testid="sketch"]')
  await from.hover()
  await page.mouse.down()
  await to.hover()
  await page.mouse.up()
  await page.waitForTimeout(250)

  const movedTo = await page.locator(`[data-cell="${target}"]`).getAttribute('data-marker')
  assert(movedTo === 'door', `the doorway did not move (target is "${movedTo}")`)
  assert(
    (await page.locator(`[data-cell="${doorCell}"]`).getAttribute('data-marker')) !== 'door',
    'the doorway is in both places at once',
  )

  // Dragging a marker must not paint the tiles it was dragged across.
  assert(
    (await page.inputValue('[data-testid="sketch"]')) === sketchBefore,
    'dragging a marker painted over the map',
  )

  // Moving a doorway onto a tile that is not a door is a problem worth saying.
  const problems = await page.locator('[data-testid="problems"]').innerText()
  assert(/doorway/i.test(problems), `moving a door raised nothing useful: ${problems}`)

  assert(page.__errors.length === 0, `console errors: ${page.__errors[0]}`)
  await page.close()
})

await test('the map editor offers to save, and warns about a shared map', async () => {
  const page = await newPage(null)
  await page.goto(`${BASE}#editor`)
  await page.waitForSelector('[data-testid="editor-grid"]')
  await page.waitForTimeout(500)

  // Nothing painted yet, so there is nothing to save.
  assert(await page.locator('[data-testid="save"]').isDisabled(), 'Save is offered before anything changed')

  await page.locator('[data-testid="brush-~"]').click()
  await page.locator('[data-cell="3,3"]').click()
  await page.waitForTimeout(200)
  assert(!(await page.locator('[data-testid="save"]').isDisabled()), 'Save is not offered after painting')

  // Every room and every stretch of road has a map of its own now, so a road
  // carries no warning...
  await page.selectOption('select', 'road-mesa')
  await page.waitForTimeout(600)
  const warning = page.locator('[data-testid="shared-warning"]')
  assert(!(await warning.isVisible()), 'a road with its own map is said to be shared')

  // ...but a map can still be shared (a room copied for a second shop is one
  // paste away), and when the source says it is, the editor has to say so.
  await page.route('**/__editor/area?id=road-riverbend', (route) =>
    route.fulfill({ json: { constant: 'ROAD_MESA', sharedWith: ['road-mesa'] } }),
  )
  await page.selectOption('select', 'road-riverbend')
  await page.waitForTimeout(600)
  assert(await warning.isVisible(), 'no warning that this road is another road too')
  assert(
    await page.locator('[data-testid="save-split"]').isVisible(),
    'no way to give this area a map of its own',
  )
  const text = await warning.innerText()
  assert(/shared with \d+/.test(text), `unclear warning: ${text}`)

  assert(page.__errors.length === 0, `console errors: ${page.__errors[0]}`)
  await page.close()
})

/**
 * Objects bigger than a tile.
 *
 * A poker table was four `FFFF` furniture tiles and a house was a block of `#`
 * with a `D` in it, so nothing in the world was an object — only patches of
 * texture that happened not to be walkable. These tests place objects but never
 * save, because saving writes to the real source file.
 */
await test('the map editor puts down an object with its own tiles', async () => {
  const page = await newPage(null)
  await page.goto(`${BASE}#editor`)
  await page.waitForSelector('[data-testid="editor-grid"]')
  await page.waitForTimeout(500)

  await page.locator('[data-testid="mode-stamps"]').click()
  await page.locator('[data-testid="stamp-poker-table"]').click()
  const before = await page.inputValue('[data-testid="sketch"]')
  await page.locator('[data-cell="8,8"]').click()
  await page.waitForTimeout(300)

  // The object is drawn as one picture over the tiles.
  assert(
    (await page.locator('[data-testid="placed-poker-table"]').count()) === 1,
    'the table was not put down',
  )

  // It writes its own felt, and leaves everything round it as it found it: an
  // object dropped on a road must not lay a square of indoor floor.
  const after = await page.inputValue('[data-testid="sketch"]')
  const rows = after.split('\n')
  assert(rows[9].slice(9, 11) === 'FF', `the felt is "${rows[9].slice(9, 11)}", not furniture`)
  const changed = rows.filter((row, i) => row !== before.split('\n')[i]).length
  assert(changed === 1, `putting a table down changed ${changed} rows, expected 1`)

  // A poker table brings a dealer, who has to be pointed at a table.
  assert(await page.locator('[data-testid="wiring"]').isVisible(), 'the table brought no dealer')
  await page.locator('[data-testid="save"]').click()
  await page.waitForTimeout(400)
  await page.waitForSelector('[data-testid="save-result"]')
  const message = await page.locator('[data-testid="save-result"]').innerText()
  assert(/points nowhere/.test(message), `saved a dealer that deals nothing: ${message}`)

  assert(page.__errors.length === 0, `console errors: ${page.__errors[0]}`)
  await page.close()
})

await test('a house brings its own front door, which has to lead somewhere', async () => {
  const page = await newPage(null)
  await page.goto(`${BASE}#editor`)
  await page.waitForSelector('[data-testid="editor-grid"]')
  await page.waitForTimeout(500)

  await page.locator('[data-testid="mode-stamps"]').click()
  await page.locator('[data-testid="stamp-townhouse"]').click()
  await page.locator('[data-cell="3,3"]').click()
  await page.waitForTimeout(300)

  const sketch = (await page.inputValue('[data-testid="sketch"]')).split('\n')
  assert(sketch[3].slice(3, 8) === '#####', `the walls are "${sketch[3].slice(3, 8)}"`)
  assert(sketch[6][5] === 'D', `the door is "${sketch[6][5]}", not a door`)

  // Saving is refused until the door leads somewhere, because a door that leads
  // nowhere compiles and strands whoever walks through it.
  await page.locator('[data-testid="save"]').click()
  await page.waitForSelector('[data-testid="save-result"]')
  const message = await page.locator('[data-testid="save-result"]').innerText()
  assert(/leads nowhere/.test(message), `expected a refusal, got: ${message}`)

  assert(page.__errors.length === 0, `console errors: ${page.__errors[0]}`)
  await page.close()
})

/**
 * The characters and events tabs.
 *
 * Saving writes to the real source files, so these never save. Belt and braces:
 * every page here has the save endpoints routed to a dead end, and each test
 * checks nothing tried to reach them.
 */
async function editorPage(hash, device) {
  const page = await newPage(null, device)
  page.__saveAttempts = []
  await page.route(/\/__editor\/(character|event|save)/, (route) => {
    page.__saveAttempts.push(route.request().url())
    return route.abort()
  })
  await page.goto(`${BASE}${hash}`)
  return page
}

/** The problems shown in whichever of the two tabs is open. */
const problemsOf = async (page) =>
  (await page.locator('[data-testid="character-problems"]:visible, [data-testid="event-problems"]:visible').innerText()).trim()
const problemCount = async (page) =>
  (
    await page
      .locator('[data-testid="character-problem-count"]:visible, [data-testid="event-problem-count"]:visible')
      .innerText()
  ).trim()

function assertNoSaving(page) {
  assert(page.__saveAttempts.length === 0, `a test tried to save: ${page.__saveAttempts[0]}`)
  assert(page.__errors.length === 0, `console errors: ${page.__errors[0]}`)
}

await test('the editor has tabs for maps, characters and events', async () => {
  const page = await editorPage('#editor')
  await page.waitForSelector('[data-testid="editor-grid"]')

  await page.locator('[data-testid="tab-characters"]:visible').click()
  await page.waitForSelector('[data-testid="character-editor"]')
  assert((await page.evaluate(() => location.hash)).startsWith('#editor/characters'), 'the tab is not in the hash')
  assert(
    (await page.locator('[data-testid="character-list"] .ed-item').count()) >= 30,
    'the characters tab does not list everybody',
  )

  await page.locator('[data-testid="tab-events"]:visible').click()
  await page.waitForSelector('[data-testid="event-editor"]')
  const events = await page.locator('[data-testid="event-list"] .ed-item').allInnerTexts()
  assert(events.some((text) => text.includes('poker-night') && text.includes('Friday')), 'events are listed without what they are for')

  await page.locator('[data-testid="tab-maps"]:visible').click()
  await page.waitForSelector('[data-testid="editor-grid"]')
  assertNoSaving(page)
  await page.close()
})

await test('switching tabs keeps unsaved edits and who was selected', async () => {
  const page = await editorPage('#editor/characters/deb')
  await page.waitForSelector('[data-testid="character-detail"][data-character="deb"]')
  await page.locator('[data-testid="character-style"]').fill('Has seen it all twice.')

  await page.locator('[data-testid="character-editor"] [data-testid="tab-events"]').click()
  await page.waitForSelector('[data-testid="event-editor"]')
  await page.locator('[data-testid="event-marcus-reminds-you"]').click()
  await page.waitForSelector('[data-testid="event-detail"][data-event="marcus-reminds-you"]')
  await page.locator('[data-testid="event-about"]').fill('Marcus, out on the street before the game.')

  await page.locator('[data-testid="event-editor"] [data-testid="tab-maps"]').click()
  await page.waitForSelector('[data-testid="editor-grid"]')
  await page.locator('[data-testid="tab-characters"]:visible').click()
  await page.waitForSelector('[data-testid="character-detail"][data-character="deb"]')
  assert(
    (await page.inputValue('[data-testid="character-style"]')) === 'Has seen it all twice.',
    'going to another tab threw away the edit to Deb',
  )
  await page.locator('[data-testid="tab-events"]:visible').click()
  await page.waitForSelector('[data-testid="event-detail"][data-event="marcus-reminds-you"]')
  assert(
    (await page.inputValue('[data-testid="event-about"]')) === 'Marcus, out on the street before the game.',
    'going to another tab threw away the edit to the event',
  )
  assertNoSaving(page)
  await page.close()
})

await test('the characters tab finds a person and edits what they say', async () => {
  const page = await editorPage('#editor/characters')
  await page.waitForSelector('[data-testid="character-editor"]')

  await page.locator('[data-testid="character-search"]').fill('deb')
  await page.waitForTimeout(100)
  const found = await page.locator('[data-testid="character-list"] .ed-item').allInnerTexts()
  assert(found.some((text) => text.includes('Deb')), `searching for deb found ${found.join(' / ')}`)
  assert(!found.some((text) => text.includes('Gus')), 'searching did not narrow the list')

  await page.locator('[data-testid="character-deb"]').click()
  await page.waitForSelector('[data-testid="character-detail"][data-character="deb"]')
  assert((await page.evaluate(() => location.hash)) === '#editor/characters/deb', 'selecting somebody is not in the hash')
  assert((await page.inputValue('[data-testid="character-name"]')) === 'Deb', 'the name field is not Deb')
  const face = await page.locator('[data-testid="character-avatar"]').getAttribute('src')
  assert(face?.startsWith('data:image/png'), 'no face drawn for Deb')

  // Nothing changed yet: nothing to save.
  assert(await page.locator('[data-testid="save-character"]').isDisabled(), 'Save is offered before anything changed')
  assert((await problemCount(page)) === 'no problems', `Deb already has problems: ${await problemCount(page)}`)

  // Change a line, add one, and see both take.
  await page.locator('[data-testid="lines-greeting-0"]').fill('Deb: You are new. Sit.')
  await page.locator('[data-testid="lines-call-add"]').click()
  assert(/empty/.test(await problemsOf(page)), 'a blank line is not called out')
  assert(await page.locator('[data-testid="save-character"]').isDisabled(), 'Save is offered with a blank line in it')
  await page.locator('[data-testid="lines-call-1"]').fill('Deb: Fine. Show me.')
  assert((await problemCount(page)) === 'no problems', `problems after filling the line: ${await problemsOf(page)}`)
  assert(!(await page.locator('[data-testid="save-character"]').isDisabled()), 'Save is not offered after an edit')
  assert(
    (await page.locator('[data-testid="character-deb"] .ed-dot').count()) === 1,
    'the list does not mark Deb as changed',
  )

  // Looking at somebody else keeps the edit; coming back finds it still there.
  await page.locator('[data-testid="character-search"]').fill('')
  await page.locator('[data-testid="character-gus"]').click()
  await page.waitForSelector('[data-testid="character-detail"][data-character="gus"]')
  await page.locator('[data-testid="character-deb"]').click()
  await page.waitForSelector('[data-testid="character-detail"][data-character="deb"]')
  assert(
    (await page.inputValue('[data-testid="lines-greeting-0"]')) === 'Deb: You are new. Sit.',
    'switching characters threw the edit away',
  )

  await page.locator('[data-testid="revert-character"]').click()
  assert(
    (await page.inputValue('[data-testid="lines-greeting-0"]')) === 'Deb: You are new. That is fine. Everyone is, once.',
    'revert did not restore the line',
  )
  assert(await page.locator('[data-testid="save-character"]').isDisabled(), 'Save is still offered after reverting')
  assertNoSaving(page)
  await page.close()
})

await test('the characters tab says when somebody is scheduled somewhere impossible', async () => {
  const page = await editorPage('#editor/characters/deb')
  await page.waitForSelector('[data-testid="character-detail"][data-character="deb"]')

  // (0,0) on Riverbend's street is a tree.
  await page.locator('[data-testid="schedule-0-col"]').fill('0')
  await page.locator('[data-testid="schedule-0-row"]').fill('0')
  assert(/Deb stands in a wall in Riverbend Landing \(0,0\) in the morning/.test(await problemsOf(page)), `no wall problem: ${await problemsOf(page)}`)
  assert(await page.locator('[data-testid="save-character"]').isDisabled(), 'Save is offered with Deb inside a tree')

  // Cass the sponsor stands at (4,7).
  await page.locator('[data-testid="schedule-0-col"]').fill('4')
  await page.locator('[data-testid="schedule-0-row"]').fill('7')
  assert(/Deb stands on Cass/.test(await problemsOf(page)), `no fixture problem: ${await problemsOf(page)}`)

  // Two entries for the same hour.
  await page.selectOption('[data-testid="schedule-1-period"]', 'morning')
  assert(/two places at once in the morning/.test(await problemsOf(page)), `no clash problem: ${await problemsOf(page)}`)
  assert(/^\d+ problems?$/.test(await problemCount(page)), `the count does not say: ${await problemCount(page)}`)

  // Adding an hour adds a card, and gives it somewhere to be.
  const before = await page.locator('[data-testid="schedule"] .ed-card').count()
  await page.locator('[data-testid="schedule-add"]').click()
  assert((await page.locator('[data-testid="schedule"] .ed-card').count()) === before + 1, 'no hour was added')
  await page.locator(`[data-testid="schedule-${before}-remove"]`).click()
  assert((await page.locator('[data-testid="schedule"] .ed-card').count()) === before, 'the hour was not removed')

  // Taking Marcus out of town strands an event that waits to talk to him.
  await page.goto(`${BASE}#editor/characters/marcus`)
  await page.waitForSelector('[data-testid="character-detail"][data-character="marcus"]')
  await page.locator('[data-testid="character-in-town"]').uncheck()
  assert(/"poker-night" waits to talk to Marcus/.test(await problemsOf(page)), `no stranded event: ${await problemsOf(page)}`)
  assertNoSaving(page)
  await page.close()
})

await test('the characters tab starts somebody new', async () => {
  const page = await editorPage('#editor/characters')
  await page.waitForSelector('[data-testid="character-editor"]')
  await page.locator('[data-testid="new-character"]').click()
  await page.locator('[data-testid="new-character-name"]').fill('Wren Abernathy')
  await page.locator('[data-testid="new-character-create"]').click()
  await page.waitForSelector('[data-testid="character-detail"][data-character="wrenAbernathy"]')
  assert((await page.inputValue('[data-testid="character-name"]')) === 'Wren Abernathy', 'the new person has no name')
  assert((await page.locator('[data-testid="save-character"]').innerText()) === 'Create', 'a new person is saved, not created')

  // Sitting at a table means having a style; going into town means being somewhere.
  await page.locator('[data-testid="character-plays"]').check()
  assert(/no line under their name/.test(await problemsOf(page)), `a player with no style passed: ${await problemsOf(page)}`)
  await page.locator('[data-testid="character-style"]').fill('Counts outs on her fingers.')
  await page.locator('[data-testid="character-in-town"]').check()
  assert((await page.locator('[data-testid="schedule"] .ed-card').count()) === 1, 'going into town gave her no hours')
  await page.locator('[data-testid="schedule-0-col"]').fill('0')
  await page.locator('[data-testid="schedule-0-row"]').fill('0')
  assert(/in a wall/.test(await problemsOf(page)), 'a new person in a wall passed')
  assertNoSaving(page)
  await page.close()
})

await test('the events tab reads an event as a script and reorders it', async () => {
  const page = await editorPage('#editor/events/poker-night')
  await page.waitForSelector('[data-testid="event-detail"][data-event="poker-night"]')

  const script = await page.locator('[data-testid="script"]').innerText()
  assert(/When you talk to Marcus/.test(script), `the script does not say when: ${script}`)
  assert(/Marcus says “You made it! Sit down, sit down\.”/.test(script), `the script does not say who says what: ${script}`)
  assert(/then the poker night starts/.test(script), `the script does not end at the table: ${script}`)
  assert((await problemCount(page)) === 'no problems', `poker-night already has problems: ${await problemsOf(page)}`)

  // Moving the table first leaves Marcus talking to nobody.
  await page.locator('[data-testid="action-0-down"]').click()
  const kinds = await page.locator('[data-testid^="action-"][data-testid$="-kind"]').evaluateAll((els) => els.map((el) => el.value))
  assert(kinds.join(',') === 'startPokerNight,dialogue', `the steps did not move: ${kinds}`)
  assert(/step 2 never happens/.test(await problemsOf(page)), `no warning about the dead step: ${await problemsOf(page)}`)
  assert(await page.locator('[data-testid="save-event"]').isDisabled(), 'Save is offered for a broken event')

  await page.locator('[data-testid="action-1-up"]').click()
  assert((await problemCount(page)) === 'no problems', 'moving it back did not put things right')

  // Dialogue with no lines is a problem; so is a table that does not exist.
  for (let i = 2; i >= 0; i--) await page.locator(`[data-testid="action-0-lines-remove-${i}"]`).click()
  assert(/has no lines/.test(await problemsOf(page)), `empty dialogue passed: ${await problemsOf(page)}`)
  await page.locator('[data-testid="revert-event"]').click()

  // The first poker night may not become repeatable.
  await page.locator('[data-testid="event-repeatable"]').check()
  assert(/cannot be played again/.test(await problemsOf(page)), 'a repeatable first night passed')
  assertNoSaving(page)
  await page.close()
})

await test('the events tab catches two events fighting over one moment', async () => {
  const page = await editorPage('#editor/events/marcus-reminds-you')
  await page.waitForSelector('[data-testid="event-detail"][data-event="marcus-reminds-you"]')
  assert((await problemCount(page)) === 'no problems', 'marcus-reminds-you already has problems')

  // Morning is what keeps it apart from the poker night; the afternoon overlaps.
  await page.locator('[data-testid="condition-1-afternoon"]').click()
  assert(/"poker-night" share a trigger/.test(await problemsOf(page)), `no clash reported: ${await problemsOf(page)}`)
  await page.locator('[data-testid="condition-1-afternoon"]').click()
  assert((await problemCount(page)) === 'no problems', 'taking the afternoon back out did not clear it')

  // Removing the conditions altogether is a clash too.
  await page.locator('[data-testid="condition-1-remove"]').click()
  await page.locator('[data-testid="condition-0-remove"]').click()
  assert(/share a trigger/.test(await problemsOf(page)), 'an unconditional rival passed')
  assertNoSaving(page)
  await page.close()
})

await test('the events tab edits a choice: its answers, what they need, and where they lead', async () => {
  const page = await editorPage('#editor/events/kit-after')
  await page.waitForSelector('[data-testid="event-detail"][data-event="kit-after"]')
  assert((await problemCount(page)) === 'no problems', `kit-after already has problems: ${await problemsOf(page)}`)
  // The choice is the second step; its answers are cards inside it.
  const script = await page.locator('[data-testid="script"]').innerText()
  assert(/answer “Stake him \$10,000”, open if you have at least \$10,000/.test(script), `the script does not read the answers (saw: ${script.slice(0, 400)})`)
  assert(await page.locator('[data-testid="action-1-option-0"]').isVisible(), 'the first answer is not shown')
  assert((await page.inputValue('[data-testid="action-1-option-1-label"]')) === 'Not this time', 'the second answer’s label is not editable')

  // Closing the only answer with no conditions leaves the player with no way on.
  await page.locator('[data-testid="action-1-option-1-condition-add"]').selectOption('cashAtLeast')
  assert(/no answer/.test(await problemsOf(page)), `a choice with no way on passed: ${await problemsOf(page)}`)
  await page.locator('[data-testid="action-1-option-1-condition-0-remove"]').click()
  assert((await problemCount(page)) === 'no problems', 'taking the condition back off did not clear it')

  // A line said on one answer is a step inside it, edited like any other.
  await page.locator('[data-testid="action-1-option-1-action-add"]').selectOption('setFlag')
  assert(await page.locator('[data-testid="action-1-option-1-action-1"]').isVisible(), 'the new step in the answer is not shown')
  // A fifth answer is one too many to offer.
  await page.locator('[data-testid="action-1-option-add"]').click()
  await page.locator('[data-testid="action-1-option-add"]').click()
  assert((await page.locator('[data-testid="action-1-option-add"]').count()) === 0, 'a choice can be given a fifth answer')
  // Two blank-named answers say the same thing.
  await page.fill('[data-testid="action-1-option-2-label"]', 'Not this time')
  assert(/says the same as another answer/.test(await problemsOf(page)), 'two answers saying the same passed')
  assertNoSaving(page)
  await page.close()
})

await test('the events tab builds a new event from ids that exist', async () => {
  const page = await editorPage('#editor/events')
  await page.waitForSelector('[data-testid="event-editor"]')
  await page.locator('[data-testid="new-event"]').click()
  await page.waitForSelector('[data-testid="event-detail"][data-event="new-event"]')
  assert(/say what this event is for/.test(await problemsOf(page)), 'an undescribed event passed')

  await page.locator('[data-testid="event-id"]').fill('dana-at-the-laundromat')
  await page.locator('[data-testid="event-about"]').fill('Walking into the laundromat finds Dana folding.')
  await page.selectOption('[data-testid="trigger-kind"]', 'enterArea')
  const areas = await page.locator('[data-testid="trigger-area"] option').evaluateAll((els) => els.map((el) => el.value))
  assert(areas.includes('laundromat') && areas.length > 20, `the area list is not the real areas: ${areas.length}`)
  await page.selectOption('[data-testid="trigger-area"]', 'laundromat')

  await page.selectOption('[data-testid="action-0-speaker"]', 'dana')
  await page.locator('[data-testid="action-0-lines-0"]').fill('Dana: Dryer four. Now you know.')

  // A table, picked from the tables there are.
  await page.selectOption('[data-testid="action-add"]', 'unlockTable')
  const tables = await page.locator('[data-testid="action-1-table"] option').evaluateAll((els) => els.map((el) => el.value))
  assert(tables.includes('riverbend-mid'), `the table list is not the real tables: ${tables}`)
  await page.selectOption('[data-testid="action-1-table"]', 'riverbend-mid')

  // Taking money away is a negative amount, typed a key at a time.
  await page.selectOption('[data-testid="action-add"]', 'giveCash')
  await page.locator('[data-testid="action-2-amount"]').fill('')
  await page.locator('[data-testid="action-2-amount"]').pressSequentially('-20')
  assert((await page.inputValue('[data-testid="action-2-amount"]')) === '-20', 'the minus sign was lost while typing')

  const script = await page.locator('[data-testid="script"]').innerText()
  assert(/^When you walk into Basin Street Laundromat \(once\):/.test(script), `the script does not read: ${script}`)
  assert(/then you hand over \$20/.test(script), `the script does not take the money: ${script}`)
  assert(/Dana says “Dryer four\. Now you know\.”/.test(script), `the script lost the dialogue: ${script}`)
  assert(/then Riverboat 2\/5 lets you sit down/.test(script), `the script lost the table: ${script}`)
  assert((await problemCount(page)) === 'no problems', `a good new event has problems: ${await problemsOf(page)}`)
  assert(!(await page.locator('[data-testid="save-event"]').isDisabled()), 'Create is not offered for a good event')
  assertNoSaving(page)
  await page.close()
})

await test('the characters and events tabs fit a phone', async () => {
  const offTheSide = (page) =>
    page.evaluate(() =>
      [...document.querySelectorAll('.ed-page *')]
        .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
        .map((el) => el.getAttribute('data-testid') ?? el.className)
        .slice(0, 3),
    )
  for (const hash of ['#editor/characters/vance', '#editor/events/poker-night']) {
    const page = await editorPage(hash, devices['iPhone 13'])
    await page.waitForSelector('.ed-detail')
    await page.waitForTimeout(300)
    let wide = await offTheSide(page)
    assert(wide.length === 0, `${hash} runs off the side of a phone: ${wide.join(', ')}`)
    if (hash.includes('events')) {
      // A long first line makes a long one-line summary of the step, which once
      // pushed the whole card past the edge of the screen.
      await page
        .locator('[data-testid="action-0-lines-0"]')
        .fill('Marcus: You made it! Sit down, sit down, there is a chair by the window and the coffee is still hot.')
      wide = await offTheSide(page)
      assert(wide.length === 0, `a long line pushes ${hash} off the side of a phone: ${wide.join(', ')}`)
    }
    // The selected entry is in view in the list, not somewhere below it.
    const inView = await page.evaluate(() => {
      const list = document.querySelector('.ed-list-items')
      const item = list?.querySelector('[aria-selected="true"]')
      if (!list || !item) return false
      const a = list.getBoundingClientRect()
      const b = item.getBoundingClientRect()
      return b.top >= a.top - 1 && b.bottom <= a.bottom + 1
    })
    assert(inView, `${hash}: the selected entry is scrolled out of the list`)
    assertNoSaving(page)
    await page.close()
  }
})

await browser.close()

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
if (failed.length > 0) process.exit(1)
