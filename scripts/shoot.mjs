/**
 * Screenshots of the game, for critics and creators — and a contact sheet.
 *
 *   node scripts/shoot.mjs --areas basin,sc-floor --periods morning,night \
 *     --out /some/dir [--port 5173] [--size 960x640] [--editor] \
 *     [--sheet overview] [--cols 3] [--walk ArrowDown,ArrowDown]
 *
 * Every image an agent looks at stays in its context and is paid for again on
 * every later call, so look at ONE contact sheet of many shots rather than
 * many shots, and open an individual file only to inspect detail. Shots are
 * named <area>-<period>.png; --editor adds editor-<area>.png, the whole map as
 * the map editor draws it. Prints one line per shot, with any page errors.
 */
import { chromium } from 'playwright'
import { mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, arg, i, all) => {
    if (arg.startsWith('--')) pairs.push([arg.slice(2), all[i + 1]?.startsWith('--') ? true : (all[i + 1] ?? true)])
    return pairs
  }, []),
)
const port = args.port ?? '5173'
const base = `http://localhost:${port}/`
const areas = String(args.areas ?? 'basin').split(',')
const periods = String(args.periods ?? 'morning').split(',')
const [width, height] = String(args.size ?? '960x640').split('x').map(Number)
const out = args.out ?? '.'
const walk = args.walk ? String(args.walk).split(',') : []
mkdirSync(out, { recursive: true })

const save = (areaId, period) =>
  JSON.stringify({
    day: 2, period, cash: 50000, cityId: 'apartment', areaId,
    unlockedCityIds: ['apartment', 'silverCreek', 'riverbend', 'crescentHarbor', 'palmCay', 'neonMesa', 'portoLumina'],
    ownedItemIds: [], completedMissionIds: [], acceptedMissionIds: [], lessonIds: [], unlockedTableIds: [],
    debts: [], huntedInCityId: null, huntGraceUntilDay: 0, restedUntilDay: 0, finaleRematchDay: 0,
    completedEventIds: [], flags: { wonPokerNight: true, beatFinalRival: false, hasPenthouse: false },
    stats: { handsWon: 0, biggestPot: 0, tablesPlayed: 0 },
  })

const browser = await chromium.launch()
const shots = []

async function shoot(name, setup) {
  const page = await browser.newPage({ viewport: { width, height } })
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 160)))
  try {
    await setup(page)
    const file = join(out, `${name}.png`)
    await page.screenshot({ path: file })
    shots.push({ name, file })
    console.log(`${name}: ${errors.length ? 'ERRORS ' + errors[0] : 'ok'}`)
  } catch (error) {
    console.log(`${name}: FAILED ${String(error).split('\n')[0]}`)
  }
  await page.close()
}

for (const area of areas) {
  for (const period of periods) {
    await shoot(`${area}-${period}`, async (page) => {
      await page.addInitScript(([k, v]) => localStorage.setItem(k, v), ['poker-legend-save-v2', save(area, period)])
      await page.goto(base)
      await page.waitForSelector('canvas', { timeout: 20000 })
      await page.waitForTimeout(1500)
      for (const key of walk) {
        await page.keyboard.press(key)
        await page.waitForTimeout(220)
      }
      if (walk.length) await page.waitForTimeout(400)
    })
  }
  if (args.editor) {
    await shoot(`editor-${area}`, async (page) => {
      await page.goto(`${base}#editor`)
      await page.waitForSelector('[data-testid="editor-grid"]', { timeout: 20000 })
      await page.selectOption('select', area)
      await page.waitForTimeout(800)
    })
  }
}

// One image of everything, captioned, so it costs one image to look at.
if (args.sheet && shots.length) {
  const cols = Number(args.cols ?? 3)
  const cell = Math.min(480, Math.floor(1560 / cols))
  const tiles = shots
    .map(({ name, file }) => {
      const src = `data:image/png;base64,${readFileSync(file).toString('base64')}`
      return `<figure><img src="${src}"><figcaption>${name}</figcaption></figure>`
    })
    .join('')
  const page = await browser.newPage({ viewport: { width: cols * cell + 16, height: 400 } })
  await page.setContent(`<style>
    body{margin:0;padding:8px;background:#111;display:grid;grid-template-columns:repeat(${cols},${cell}px);gap:0}
    figure{margin:0;position:relative} img{width:${cell}px;display:block;image-rendering:pixelated}
    figcaption{position:absolute;left:0;top:0;background:#000c;color:#fff;font:11px monospace;padding:1px 4px}
  </style>${tiles}`)
  const file = join(out, `${args.sheet}.png`)
  await page.screenshot({ path: file, fullPage: true })
  console.log(`sheet: ${file} (${shots.length} shots, ${cols} across)`)
}

await browser.close()
