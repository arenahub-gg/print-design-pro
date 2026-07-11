import { expect, test } from '@playwright/test'

// Round-1 acceptance flow, end to end against the real Nuxt app + IndexedDB:
// create -> add elements -> drag with undo -> properties edit -> reload
// persistence -> export/import round-trip (incl. the same-id import path).

test.describe.configure({ mode: 'serial' })

test('full editor acceptance flow', async ({ page }) => {
  // --- create a template from the manager
  await page.goto('/templates')
  // Dev-server hydration can lag behind first paint - retry the click until
  // the handler is live and navigation actually happens.
  await expect(async () => {
    await page.getByRole('button', { name: 'New template' }).click()
    await page.waitForURL(/\/editor\//, { timeout: 3000 })
  }).toPass({ timeout: 30_000 })
  const editorUrl = page.url()

  const viewport = page.locator('[data-pp-viewport]')
  await expect(viewport).toBeVisible()

  // --- add elements from the palette
  await page.locator('[data-pp-palette-tile="rect"]').click()
  await page.locator('[data-pp-palette-tile="circle"]').click()
  await expect(page.locator('[data-pp-element-id]')).toHaveCount(2)

  // circle was selected on add - selection chrome with handles is up
  await expect(page.locator('[data-pp-selection]')).toBeVisible()
  await expect(page.locator('[data-pp-handle]')).toHaveCount(8)

  // --- drag the selected circle and assert via the properties panel
  const circle = page.locator('[data-pp-element-type="circle"]')
  const before = await circle.boundingBox()
  await circle.hover()
  await page.mouse.down()
  await page.mouse.move(before!.x + before!.width / 2 + 120, before!.y + before!.height / 2 + 80, { steps: 8 })
  await page.mouse.up()
  const after = await circle.boundingBox()
  expect(Math.abs(after!.x - before!.x)).toBeGreaterThan(50)

  // properties panel X reflects the move
  const xField = page.locator('input[type="number"]').first()
  const movedX = Number.parseFloat(await xField.inputValue())

  // --- undo restores the position
  await page.locator('[data-pp-undo]').click()
  const undoneX = Number.parseFloat(await xField.inputValue())
  expect(undoneX).not.toBe(movedX)

  // redo for a deterministic final state
  await page.locator('[data-pp-redo]').click()

  // --- edit geometry through the panel (undoable command path)
  await xField.fill('25')
  await xField.press('Enter')

  // --- wait out both debounces (400ms emit + 800ms autosave), then reload
  await page.waitForTimeout(1800)
  await page.reload()
  await expect(page.locator('[data-pp-element-id]')).toHaveCount(2)
  await page.locator('[data-pp-element-type="circle"]').click()
  await expect(page.locator('input[type="number"]').first()).toHaveValue('25')

  // --- export JSON (Export is a dropdown since round 2)
  const downloadPromise = page.waitForEvent('download')
  await page.locator('[data-test-export]').click()
  await page.getByRole('menuitem', { name: /JSON/ }).click()
  const download = await downloadPromise
  const exportPath = await download.path()
  expect(exportPath).toBeTruthy()

  // --- mutate, then import the exported file back (same-id import path)
  await page.locator('[data-pp-palette-tile="text"]').click()
  await expect(page.locator('[data-pp-element-id]')).toHaveCount(3)

  const fileChooserPromise = page.waitForEvent('filechooser')
  await page.getByText('Import', { exact: true }).click()
  const fileChooser = await fileChooserPromise
  await fileChooser.setFiles(exportPath!)

  // Import must actually reach the canvas: back to 2 elements.
  await expect(page.locator('[data-pp-element-id]')).toHaveCount(2)

  // --- and the imported state survives another reload
  await page.waitForTimeout(1200)
  await page.goto(editorUrl)
  await expect(page.locator('[data-pp-element-id]')).toHaveCount(2)

  // --- template manager lists it (same context - IndexedDB is per-context)
  await page.goto('/templates')
  await expect(page.getByText('Untitled template').first()).toBeVisible()
})
