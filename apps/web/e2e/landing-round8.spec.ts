import { expect, test } from '@playwright/test'

// Round-8 acceptance: '/' is the public landing page; its CTA leads into the
// workspace dashboard which moved to /app.

test('landing page renders and the hero CTA opens the workspace', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Thiết kế tem nhãn')
  await expect(page.locator('#features')).toBeVisible()
  await expect(page.locator('#opensource')).toBeVisible()
  // GitHub link points at the repository
  await expect(
    page.locator('a[href="https://github.com/arenahub-gg/print-design-pro"]').first(),
  ).toBeVisible()

  await page.locator('[data-test-hero-cta]').click()
  await page.waitForURL(/\/app$/)
  // Workspace dashboard: greeting + quick-size tiles + sidebar shell
  await expect(page.getByRole('heading', { name: 'Chào mừng trở lại' })).toBeVisible()
  await expect(page.locator('[data-test-new-design]')).toBeVisible()
})
