import { expect, test } from '@playwright/test'

test('full results page with highlights, filters and facets', async ({ page }) => {
  await page.goto('/search?q=lamb%20of%20god')
  await expect(page.getByRole('heading', { level: 1, name: 'Search' })).toBeVisible()
  await expect(page.getByRole('main').getByRole('searchbox')).toHaveValue('lamb of god')

  const firstVerse = page.getByRole('link', { name: /John 1:36/ }).first()
  await expect(firstVerse).toBeVisible()
  await expect(page.locator('mark').first()).toHaveText(/lamb/i)
  // Function words are not highlighted.
  await expect(page.locator('mark', { hasText: /^of$/i })).toHaveCount(0)

  // Filters show match counts; groups with no matches are not offered.
  const filters = page.getByRole('navigation', { name: 'Filter results' })
  await expect(filters.getByRole('link', { name: /^Scripture, / })).toBeVisible()
  const counted = await filters.getByRole('link', { name: /, \d+ results?$/ }).allTextContents()
  expect(counted.length).toBeGreaterThan(0)
  await expect(filters.getByRole('link', { name: /, 0 results$/ })).toHaveCount(0)
  const scripture = filters.getByRole('link', { name: /^Scripture, \d+ results$/ })
  await scripture.click()
  await expect(page).toHaveURL(/type=scripture/)
  await expect(scripture).toHaveAttribute('aria-current', 'page')
  await page.getByRole('navigation', { name: 'Limit Scripture results' }).getByRole('link', { name: /Old Testament/ }).click()
  await expect(page).toHaveURL(/testament=old/)
})

test('command palette jumps straight to a reference', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.keyboard.press('ControlOrMeta+k')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('combobox').fill('rom 8:28')
  await expect(dialog.getByRole('option', { name: /Romans 8:28/ }).first()).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/bible\/romans\/8#v28$/)
  await expect(page.locator('#v28')).toHaveClass(/bg-highlight/)
})

test('home search form goes to results', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('searchbox').first().fill('resurrection')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/search\?q=resurrection/)
  await expect(page.getByRole('link', { name: 'The Resurrection' }).first()).toBeVisible()
})
