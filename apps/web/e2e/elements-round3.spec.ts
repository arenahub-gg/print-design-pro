import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import jsQR from 'jsqr'

// Round-3 acceptance: QR / barcode / image through the full pipeline
// (palette -> canvas -> properties -> exported PNG), with the QR DECODED
// from the export - the only assertion that actually proves scannability.

const QR_CONTENT = 'https://pro-print.dev/e2e?check=1'

// 1x1 red PNG fixture as a data-driven upload
const RED_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

test('qr, barcode, and image land in the exported PNG; QR decodes', async ({ page }) => {
  await page.goto('/templates')
  await expect(async () => {
    await page.getByRole('button', { name: 'New template' }).click()
    await page.waitForURL(/\/editor\//, { timeout: 3000 })
  }).toPass({ timeout: 30_000 })
  await expect(page.locator('[data-pp-viewport]')).toBeVisible()

  // Position helper: the just-added element is selected - place it via the
  // panel so the three elements never overlap (overlap would block clicks).
  async function placeSelected(xMm: number, yMm: number): Promise<void> {
    const xField = page.locator('input[type="number"]').first()
    await xField.fill(String(xMm))
    await xField.press('Enter')
    const yField = page.locator('input[type="number"]').nth(1)
    await yField.fill(String(yMm))
    await yField.press('Enter')
  }

  // --- QR: add + set content via properties, park at (10,10)
  await page.locator('[data-pp-palette-tile="qr"]').click()
  const qrContent = page.locator('[data-pp-qr-content]')
  await qrContent.fill(QR_CONTENT)
  await qrContent.blur()
  // regeneration is debounced 200ms
  await expect(page.locator('[data-pp-element-type="qr"] img')).toBeVisible()
  await placeSelected(10, 10)

  // --- barcode: add (default CODE128), then prove invalid EAN13 shows the placeholder
  await page.locator('[data-pp-palette-tile="barcode"]').click()
  await expect(page.locator('[data-pp-element-type="barcode"] img')).toBeVisible()
  await page.locator('[data-pp-barcode-section] select').selectOption('EAN13')
  const barcodeContent = page.locator('[data-pp-barcode-content]')
  await barcodeContent.fill('1234') // invalid EAN13
  await barcodeContent.blur()
  await expect(page.locator('[data-pp-barcode-error]')).toBeVisible()
  // back to a valid value
  await barcodeContent.fill('4006381333931')
  await barcodeContent.blur()
  await expect(page.locator('[data-pp-element-type="barcode"] img')).toBeVisible()
  await placeSelected(10, 60)

  // --- image: upload the red-pixel fixture through the palette tile
  const fileChooserPromise = page.waitForEvent('filechooser')
  await page.locator('[data-pp-palette-tile="image"]').click()
  const chooser = await fileChooserPromise
  await chooser.setFiles({ name: 'red.png', mimeType: 'image/png', buffer: RED_PIXEL_PNG })
  await expect(page.locator('[data-pp-element-type="image"] img')).toBeVisible()
  await placeSelected(120, 60)

  // --- export PNG (wait out emit debounce first)
  await page.waitForTimeout(700)
  const downloadPromise = page.waitForEvent('download')
  await page.locator('[data-test-export]').click()
  await page.getByRole('menuitem', { name: /PNG/ }).click()
  const download = await downloadPromise
  const bytes = readFileSync((await download.path())!)

  // --- decode: crop the QR region (10,10 + 30x30mm at 300dpi) and jsQR it
  const decoded = await page.evaluate(async (base64) => {
    const response = await fetch(`data:image/png;base64,${base64}`)
    const bitmap = await createImageBitmap(await response.blob())
    const scale = 300 / 25.4
    const x = Math.round(10 * scale)
    const y = Math.round(10 * scale)
    const side = Math.round(30 * scale)
    const canvas = document.createElement('canvas')
    canvas.width = side
    canvas.height = side
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(bitmap, x, y, side, side, 0, 0, side, side)
    const data = ctx.getImageData(0, 0, side, side)
    return { pixels: Array.from(data.data), width: side, height: side }
  }, bytes.toString('base64'))

  const result = jsQR(new Uint8ClampedArray(decoded.pixels), decoded.width, decoded.height)
  expect(result?.data).toBe(QR_CONTENT)
})
