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

  // Export dialog: upload a 3-row CSV (quoted comma exercises the parser)
  await page.locator('[data-pp-export-open]').click()
  await expect(page.locator('[data-pp-batch-section]')).toBeVisible()
  const csv = 'name\n"Nguyen, An"\nBinh\nChau\n'
  await page.locator('[data-pp-batch-input]').setInputFiles({
    name: 'people.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv, 'utf8'),
  })
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
