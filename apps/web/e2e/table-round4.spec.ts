import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

// Round-4 acceptance: table element through the full pipeline, plus the
// v-model proxy-identity regression (selection/undo must survive the 400ms
// snapshot emit - the round-4 toRaw fix).

test('table: edit cells, undo survives debounce, exported PNG paints it', async ({ page }) => {
  await page.goto('/templates')
  await expect(async () => {
    await page.getByRole('button', { name: 'New template' }).click()
    await page.waitForURL(/\/editor\//, { timeout: 3000 })
  }).toPass({ timeout: 30_000 })
  await expect(page.locator('[data-pp-viewport]')).toBeVisible()

  // --- add table; TableSection appears for the auto-selected element
  await page.locator('[data-pp-palette-tile="table"]').click()
  await expect(page.locator('[data-pp-table-section]')).toBeVisible()

  // --- REGRESSION (toRaw identity): selection must still exist after the
  // 400ms snapshot emit round-trips through the host's ref()
  await page.waitForTimeout(700)
  await expect(page.locator('[data-pp-table-section]')).toBeVisible()

  // --- edit a cell via the grid editor
  const cell = page.locator('[data-pp-cell="0-0"]')
  await cell.fill('Cà phê sữa đá')
  await cell.press('Enter')
  await expect(page.locator('[data-pp-element-type="table"]')).toContainText('Cà phê sữa đá')

  // --- undo AFTER the debounce window (the old bug cleared history here)
  await page.waitForTimeout(700)
  await page.locator('[data-pp-undo]').click()
  await expect(page.locator('[data-pp-element-type="table"]')).not.toContainText('Cà phê sữa đá')
  await page.locator('[data-pp-redo]').click()
  await expect(page.locator('[data-pp-element-type="table"]')).toContainText('Cà phê sữa đá')

  // --- add a column (atomic: header + a cell in every row)
  await page.locator('[data-pp-add-column]').click()
  await expect(page.locator('[data-pp-column-title="3"]')).toHaveValue('Col 4')

  // --- park the table at a known position for pixel sampling
  const xField = page.locator('input[type="number"]').first()
  await xField.fill('10')
  await xField.press('Enter')
  const yField = page.locator('input[type="number"]').nth(1)
  await yField.fill('10')
  await yField.press('Enter')

  // --- export PNG and sample the header background at a known point
  await page.waitForTimeout(1500)
  const downloadPromise = page.waitForEvent('download')
  await page.locator('[data-test-export]').click()
  await page.getByRole('menuitem', { name: /PNG/ }).click()
  const bytes = readFileSync((await (await downloadPromise).path())!)

  const sample = await page.evaluate(async (base64) => {
    const response = await fetch(`data:image/png;base64,${base64}`)
    const bitmap = await createImageBitmap(await response.blob())
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(bitmap, 0, 0)
    const scale = 300 / 25.4
    // Header band: ~2.5mm into the table (inside header fill, off borders/text)
    const header = ctx.getImageData(Math.round(30 * scale), Math.round(12.5 * scale), 1, 1).data
    // Page corner: plain paper
    const corner = ctx.getImageData(20, 20, 1, 1).data
    return { header: [...header.slice(0, 3)], corner: [...corner.slice(0, 3)] }
  }, bytes.toString('base64'))

  expect(sample.corner).toEqual([255, 255, 255])
  // Factory header background #f1f5f9 = (241, 245, 249)
  expect(sample.header[0]).toBeGreaterThan(230)
  expect(sample.header).not.toEqual([255, 255, 255])

  // --- persistence
  await page.reload()
  await expect(page.locator('[data-pp-element-type="table"]')).toContainText('Cà phê sữa đá')
})
