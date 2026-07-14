/* eslint-disable no-undef -- node CLI script; the eslint project config only
 * carries browser/vue globals. `localStorage`/`document` appear inside
 * page.evaluate() where they ARE browser globals. */
// Captures the README demo screenshots against a running dev server.
// Usage (from apps/web, with `pnpm dev` or the preview server on :3000):
//   node scripts/capture-readme-screenshots.mjs
// Output: <repo>/.github/assets/*.png - referenced by the root README.

import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { chromium } from '@playwright/test'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(here, '../../../.github/assets')
mkdirSync(outDir, { recursive: true })

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
const VIEWPORT = { width: 1440, height: 860 }

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 2 })

async function setTheme(theme) {
  await page.evaluate((value) => {
    localStorage.setItem('pp-theme', value)
    document.documentElement.dataset.theme = value
    document.documentElement.classList.toggle('dark', value === 'dark')
  }, theme)
}

// --- 1. Landing (light) ------------------------------------------------
await page.goto(BASE)
await setTheme('light')
await page.waitForSelector('[data-test-hero-cta]')
await page.waitForTimeout(500) // fonts
await page.screenshot({ path: resolve(outDir, 'landing.png') })
console.log('captured landing.png')

// --- 2. Editor with content (light): open the seeded demo template -----
await page.goto(`${BASE}/templates`)
// Dev-server hydration race: retry the click+navigation pair (same pattern
// as the e2e suite). The demo seed runs inside the first list() call.
for (let attempt = 0; attempt < 10; attempt++) {
  await page.getByText('Shipping label', { exact: true }).first().click()
  const navigated = await page
    .waitForURL(/\/editor\//, { timeout: 3000 })
    .then(() => true, () => false)
  if (navigated)
    break
}
await page.waitForSelector('[data-pp-viewport]')
// QR + barcode render async; give them a beat
await page.waitForSelector('[data-pp-element-type="qr"] img')
await page.waitForSelector('[data-pp-element-type="barcode"] img')
await page.waitForTimeout(500)

await page.screenshot({ path: resolve(outDir, 'editor-light.png') })
console.log('captured editor-light.png')

// --- 3. Editor (dark) ---------------------------------------------------
await setTheme('dark')
await page.waitForTimeout(400) // ruler MutationObserver redraw
await page.screenshot({ path: resolve(outDir, 'editor-dark.png') })
console.log('captured editor-dark.png')

// --- 4. Export dialog (dark) --------------------------------------------
await page.locator('[data-pp-export-open]').click()
await page.waitForSelector('[data-pp-preview-image]')
await page.waitForTimeout(300)
await page.screenshot({ path: resolve(outDir, 'export-dialog.png') })
console.log('captured export-dialog.png')

await setTheme('light')
await browser.close()
console.log(`done -> ${outDir}`)
