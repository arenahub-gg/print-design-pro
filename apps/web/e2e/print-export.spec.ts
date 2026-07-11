import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { PDFDocument } from 'pdf-lib'

// Round-2 acceptance: export PNG/PDF and print preview against real Chromium
// (real canvas raster - this is where pixel truth lives).

async function createTemplateWithContent(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/templates')
  await expect(async () => {
    await page.getByRole('button', { name: 'New template' }).click()
    await page.waitForURL(/\/editor\//, { timeout: 3000 })
  }).toPass({ timeout: 30_000 })
  await expect(page.locator('[data-pp-viewport]')).toBeVisible()
  await page.locator('[data-pp-palette-tile="rect"]').click()
  await page.locator('[data-pp-palette-tile="text"]').click()
  await expect(page.locator('[data-pp-element-id]')).toHaveCount(2)
  // Vietnamese content through the properties panel (text is selected).
  const textarea = page.locator('[data-pp-text-section] textarea')
  await textarea.fill('Xin chào thế giới in ấn')
  await textarea.blur()
  // Exports read the host's v-model snapshot, which lags the editor by the
  // 400ms emit debounce - wait it out like a human would.
  await page.waitForTimeout(700)
}

test('export PNG has exact 300dpi A4 dimensions and painted content', async ({ page }) => {
  await createTemplateWithContent(page)

  const downloadPromise = page.waitForEvent('download')
  await page.locator('[data-test-export]').click()
  await page.getByRole('menuitem', { name: /PNG/ }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/\.png$/)

  const path = await download.path()
  const bytes = readFileSync(path!)
  // Decode in the page (real Chromium decoder) and sample pixels.
  const result = await page.evaluate(async (base64) => {
    const response = await fetch(`data:image/png;base64,${base64}`)
    const bitmap = await createImageBitmap(await response.blob())
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(bitmap, 0, 0)
    // Default rect: 40x25mm centered on A4 (105,148.5) -> center px at 300dpi
    const centerX = Math.round((105 * 300) / 25.4)
    const centerY = Math.round((148.5 * 300) / 25.4)
    const rectPixel = ctx.getImageData(centerX, centerY, 1, 1).data
    const cornerPixel = ctx.getImageData(50, 50, 1, 1).data
    return {
      width: bitmap.width,
      height: bitmap.height,
      rect: [...rectPixel],
      corner: [...cornerPixel],
    }
  }, bytes.toString('base64'))

  expect(result.width).toBe(2480)
  expect(result.height).toBe(3508)
  // Page corner is white paper.
  expect(result.corner.slice(0, 3)).toEqual([255, 255, 255])
  // Rect center carries the default fill #dbeafe (219,234,254) - text may
  // overlay it, so just assert it is NOT plain white (something painted).
  expect(result.rect.slice(0, 3)).not.toEqual([255, 255, 255])
})

test('export PDF downloads a parseable single page sized in mm', async ({ page }) => {
  await createTemplateWithContent(page)

  const downloadPromise = page.waitForEvent('download')
  await page.locator('[data-test-export]').click()
  await page.getByRole('menuitem', { name: 'PDF' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/\.pdf$/)

  const bytes = readFileSync((await download.path())!)
  expect(bytes.length).toBeGreaterThan(10_000)
  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-')
  // Parse properly (MediaBox may live inside compressed object streams).
  const pdf = await PDFDocument.load(new Uint8Array(bytes))
  expect(pdf.getPageCount()).toBe(1)
  const { width, height } = pdf.getPage(0).getSize()
  expect(width).toBeCloseTo(595.28, 1) // A4 in pt
  expect(height).toBeCloseTo(841.89, 1)
})

test('export dialog shows the render engine preview and format cards', async ({ page }) => {
  await createTemplateWithContent(page)

  await page.locator('[data-pp-export-open]').click()
  await expect(page.locator('[data-pp-export-dialog]')).toBeVisible()
  const img = page.locator('[data-pp-preview-image]')
  await expect(img).toBeVisible()
  // A4 aspect ratio within tolerance
  const box = await img.boundingBox()
  expect(box!.width / box!.height).toBeCloseTo(210 / 297, 1)

  // format cards present and selectable
  await page.locator('[data-pp-export-format="png"]').click()
  await expect(page.locator('[data-pp-export-run]')).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(page.locator('[data-pp-export-dialog]')).toHaveCount(0)
})
