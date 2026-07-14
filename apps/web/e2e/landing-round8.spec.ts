import { expect, test } from '@playwright/test'

// Round-8/10 acceptance: '/' is the public landing page (English default,
// switchable to Vietnamese); its CTA leads into the /app workspace.

test('landing page renders in English, switches to Vietnamese, CTA opens the workspace', async ({ page }) => {
  await page.goto('/')

  // English is the default locale
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Design labels')
  await expect(page.locator('#features')).toBeVisible()
  await expect(page.locator('#opensource')).toBeVisible()
  await expect(
    page.locator('a[href="https://github.com/arenahub-gg/print-design-pro"]').first(),
  ).toBeVisible()

  // Locale switcher flips the page to Vietnamese and persists.
  // Retry the click: the first one can land before hydration attaches
  // listeners (same dev-server race the other specs guard against).
  await expect(async () => {
    await page.locator('[data-test-locale-toggle]').click()
    await expect(page.getByRole('heading', { level: 1 }))
      .toContainText('Thiết kế tem nhãn', { timeout: 1500 })
  }).toPass({ timeout: 20_000 })
  expect(await page.evaluate(() => localStorage.getItem('pp-locale'))).toBe('vi')
  await page.locator('[data-test-locale-toggle]').click()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Design labels')

  await page.locator('[data-test-hero-cta]').click()
  await page.waitForURL(/\/app$/)
  // Workspace dashboard: greeting + quick-size tiles + sidebar shell
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
  await expect(page.locator('[data-test-new-design]')).toBeVisible()
  // First run seeds five demo templates into the recents grid.
  // ('Shipping label' also names a quick-start tile - assert on the two
  // demo names that are unique to the seeded records.)
  await expect(page.getByText('Event badge', { exact: true })).toBeVisible()
  await expect(page.getByText('Warehouse bin label', { exact: true })).toBeVisible()
})
