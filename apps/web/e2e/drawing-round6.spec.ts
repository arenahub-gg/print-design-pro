import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

// Round-6 acceptance: shape flyout -> star on canvas -> fill color swatch ->
// exported PNG paints the star's fill at its center. Proves the shared
// shape-paths geometry drives the print engine, not just the SVG view.

test('star shape from the flyout paints its fill into the exported PNG', async ({ page }) => {
  await page.goto('/templates')
  await expect(async () => {
    await page.getByRole('button', { name: 'New template' }).click()
    await page.waitForURL(/\/editor\//, { timeout: 3000 })
  }).toPass({ timeout: 30_000 })
  await expect(page.locator('[data-pp-viewport]')).toBeVisible()

  // Add a star via the shapes flyout
  await page.locator('[data-pp-palette-tile="shape"]').click()
  await page.locator('[data-pp-shape-kind="star"]').click()
  await expect(page.locator('[data-pp-element-type="shape"] polygon')).toBeVisible()

  // Park it at (20,20) via the panel (selected right after add)
  const xField = page.locator('input[type="number"]').first()
  await xField.fill('20')
  await xField.press('Enter')
  const yField = page.locator('input[type="number"]').nth(1)
  await yField.fill('20')
  await yField.press('Enter')

  // Dashed stroke + green fill from the new panel controls
  await page.locator('[data-pp-stroke-style="dashed"]').click()
  await page.locator('[data-pp-color-section] [data-pp-color-swatch="#16a34a"]').first().click()

  // Export PNG through the host dropdown (waits out the emit debounce)
  await page.waitForTimeout(700)
  const downloadPromise = page.waitForEvent('download')
  await page.locator('[data-test-export]').click()
  await page.getByRole('menuitem', { name: /PNG/ }).click()
  const download = await downloadPromise
  const bytes = readFileSync((await download.path())!)

  // Star box: (20,20)+30x30mm -> center (35,35)mm is inside the fill.
  const centerPixel = await page.evaluate(async (base64) => {
    const response = await fetch(`data:image/png;base64,${base64}`)
    const bitmap = await createImageBitmap(await response.blob())
    const scale = 300 / 25.4
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(bitmap, Math.round(35 * scale), Math.round(35 * scale), 1, 1, 0, 0, 1, 1)
    return Array.from(ctx.getImageData(0, 0, 1, 1).data)
  }, bytes.toString('base64'))

  // #16a34a = rgb(22, 163, 74)
  expect(centerPixel[0]).toBe(22)
  expect(centerPixel[1]).toBe(163)
  expect(centerPixel[2]).toBe(74)
})
