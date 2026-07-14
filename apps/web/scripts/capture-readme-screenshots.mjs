/* eslint-disable no-undef -- node CLI script; the eslint project config only
 * carries browser/vue globals. `localStorage`/`document` appear inside
 * page.evaluate() where they ARE browser globals. */
// Captures the README demo screenshots against a running dev server.
// Usage (from apps/web, with `pnpm dev` or the preview server on :3000):
//   node scripts/capture-readme-screenshots.mjs
// Output: <repo>/docs/images/*.png - referenced by the root README.

import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { chromium } from '@playwright/test'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(here, '../../../docs/images')
mkdirSync(outDir, { recursive: true })

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
const VIEWPORT = { width: 1440, height: 860 }

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 2 })

/** Place the just-added (auto-selected) element via the panel X/Y fields. */
async function placeSelected(xMm, yMm) {
  const xField = page.locator('input[type="number"]').first()
  await xField.fill(String(xMm))
  await xField.press('Enter')
  const yField = page.locator('input[type="number"]').nth(1)
  await yField.fill(String(yMm))
  await yField.press('Enter')
}

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

// --- 2. Editor with content (light) ------------------------------------
await page.goto(`${BASE}/templates`)
// Dev-server hydration race: the first click can land before listeners
// attach - retry the click+navigation pair (same pattern as the e2e suite).
for (let attempt = 0; attempt < 10; attempt++) {
  await page.getByRole('button', { name: 'New template' }).click()
  const navigated = await page
    .waitForURL(/\/editor\//, { timeout: 3000 })
    .then(() => true, () => false)
  if (navigated)
    break
}
await page.waitForSelector('[data-pp-viewport]')

// Compose a believable shipping-label style document on the A4 page.
await page.locator('[data-pp-palette-tile="rect"]').click()
await placeSelected(15, 15)
await page.locator('[data-pp-palette-tile="text"]').click()
await page.locator('[data-pp-text-section] textarea').fill('CÔNG TY PRO PRINT\n123 Nguyễn Trãi, Hà Nội')
await placeSelected(20, 20)
await page.locator('[data-pp-palette-tile="qr"]').click()
await placeSelected(150, 15)
await page.locator('[data-pp-palette-tile="barcode"]').click()
await placeSelected(15, 60)
await page.locator('[data-pp-palette-tile="shape"]').click()
await page.locator('[data-pp-shape-kind="star"]').click()
await placeSelected(150, 60)
await page.locator('[data-pp-palette-tile="table"]').click()
await placeSelected(15, 100)
await page.waitForTimeout(700)

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
