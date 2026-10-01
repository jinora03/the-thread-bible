import { expect, test } from '@playwright/test'

test('mobile reader keeps Scripture first, with chapter controls at the bottom', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile layout only')
  await page.goto('/bible/john/1')
  await expect(page.locator('#v1')).toBeInViewport()

  const bar = page.getByRole('navigation', { name: /chapter/i }).last()
  await expect(bar).toBeVisible()
  await bar.getByRole('link', { name: /Next/ }).click()
  await expect(page).toHaveURL(/\/bible\/john\/2$/)
})

test('mobile menu opens and closes', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile layout only')
  await page.goto('/')
  await page.getByRole('button', { name: /menu/i }).click()
  const menu = page.getByRole('dialog')
  await expect(menu.getByRole('link', { name: 'Explore' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
})
