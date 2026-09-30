import { chromium } from 'playwright'

const src = process.argv[2]
const out = process.argv[3]

const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(`file://${src}`, { waitUntil: 'load' })
await page.pdf({
  path: out,
  format: 'Letter',
  printBackground: true,
})
await browser.close()
console.log(`wrote ${out}`)
