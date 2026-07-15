import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { PDFDocument } from 'pdf-lib'

// Round-13 acceptance: {{variable}} data binding end to end - token typed
// into a text element appears in the variables tab, the sample value renders
// on canvas, and a 3-row CSV in the export dialog produces a 3-page PDF.

test('variables render sample values and a CSV batch exports one PDF page per row', async ({ page }) => {
  await page.goto('/templates')
  await expect(async () => {
    await page.getByRole('button', { name: 'New template' }).click()
    await page.waitForURL(/\/editor\//, { timeout: 3000 })
  }).toPass({ timeout: 30_000 })
  await expect(page.locator('[data-pp-viewport]')).toBeVisible()

  // Text element with a variable token
  await page.locator('[data-pp-palette-tile="text"]').click()
  const textarea = page.locator('[data-pp-text-section] textarea')
  await textarea.fill('To: {{name}}')
  await textarea.blur()

  // The token registers in the variables tab; set a sample value
  await page.locator('[data-pp-tab-variables]').click()
  const sampleInput = page.locator('[data-pp-variable="name"]')
  await expect(sampleInput).toBeVisible()
  await sampleInput.fill('SAMPLE PERSON')
  await sampleInput.press('Enter')

  // Canvas preview shows the substituted sample, not the raw token
  await expect(page.locator('[data-pp-element-type="text"]')).toContainText('To: SAMPLE PERSON')

  // Round 18: upload the 3-row CSV directly in the Variables tab
  const csv = 'name\n"Nguyen, An"\nBinh\nChau\n'
  await page.locator('[data-pp-panel-batch-input]').setInputFiles({
    name: 'people.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv, 'utf8'),
  })
  await expect(page.locator('[data-pp-panel-batch-count]')).toContainText('3')

  // Row navigator previews each row live on the canvas
  const textEl = page.locator('[data-pp-element-type="text"]')
  await expect(textEl).toContainText('To: Nguyen, An')
  await page.locator('[data-pp-row-next]').click()
  await expect(textEl).toContainText('To: Binh')
  await page.locator('[data-pp-row-prev]').click()
  await expect(textEl).toContainText('To: Nguyen, An')

  // Round 19 CRUD: edit the active row inline - canvas follows live
  await page.locator('[data-pp-row-cell="name"]').fill('Edited Person')
  await expect(textEl).toContainText('To: Edited Person')

  // Add a row (clones the active one, preview jumps to it), then delete it
  await page.locator('[data-pp-row-editor] [data-pp-row-add]').click()
  await expect(page.locator('[data-pp-panel-batch-count]')).toContainText('4')
  await expect(page.locator('[data-pp-row-navigator]')).toContainText('4/4')
  await page.locator('[data-pp-row-delete]').click()
  await expect(page.locator('[data-pp-panel-batch-count]')).toContainText('3')

  // Round 20: the data table dialog is a roomy view of the SAME rows
  await page.locator('[data-pp-datatable-open]').click()
  await expect(page.locator('[data-pp-datatable-dialog]')).toBeVisible()
  await expect(page.locator('[data-pp-datatable-row]')).toHaveCount(3)
  // edit a cell in the grid - canvas behind the dialog follows
  await page.locator('[data-pp-datatable-row="0"]').click()
  await page.locator('[data-pp-cell="0-name"]').fill('Grid Person')
  await expect(textEl).toContainText('To: Grid Person')
  // add + delete keep counts in sync
  await page.locator('[data-pp-datatable-add]').click()
  await expect(page.locator('[data-pp-datatable-row]')).toHaveCount(4)
  await page.locator('[data-pp-datatable-delete="3"]').click()
  await expect(page.locator('[data-pp-datatable-row]')).toHaveCount(3)
  await page.locator('[data-pp-datatable-close]').click()
  await expect(page.locator('[data-pp-panel-batch-count]')).toContainText('3')

  // Export dialog shares the same data - rows are pre-loaded
  await page.locator('[data-pp-export-open]').click()
  await expect(page.locator('[data-pp-batch-section]')).toBeVisible()
  await expect(page.locator('[data-pp-batch-count]')).toContainText('3')

  // PDF card is preselected; CTA now downloads the batch
  const downloadPromise = page.waitForEvent('download')
  await page.locator('[data-pp-export-run]').click()
  const download = await downloadPromise
  const bytes = readFileSync((await download.path())!)
  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-')
  const pdf = await PDFDocument.load(new Uint8Array(bytes))
  expect(pdf.getPageCount()).toBe(3)
})

test('seeded dynamic-data demo offers a ready-to-fill sample CSV', async ({ page }) => {
  await page.goto('/templates')
  // Round-17 seeded demo (fresh browser context = fresh IndexedDB + seed)
  const card = page.getByText('Batch COD label (dynamic data)', { exact: true })
  await expect(async () => {
    await card.click()
    await page.waitForURL(/\/editor\//, { timeout: 3000 })
  }).toPass({ timeout: 30_000 })
  await expect(page.locator('[data-pp-viewport]')).toBeVisible()

  // Tokens render their sample values on canvas
  await expect(page.locator('[data-pp-element-type="text"]').first()).not.toContainText('{{')

  // Batch section is offered (the demo uses variables); sample CSV downloads
  await page.locator('[data-pp-export-open]').click()
  await expect(page.locator('[data-pp-batch-section]')).toBeVisible()
  const downloadPromise = page.waitForEvent('download')
  await page.locator('[data-pp-batch-sample]').click()
  const download = await downloadPromise
  const csv = readFileSync((await download.path())!, 'utf8')
  expect(csv).toContain('name,address,phone,tracking,cod')
  expect(csv).toContain('Nguyen Van A')
})
