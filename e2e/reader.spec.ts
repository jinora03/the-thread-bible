import { expect, test } from '@playwright/test'

test('reads a chapter and moves to the next', async ({ page }) => {
  await page.goto('/bible/isaiah/53')
  await expect(page.getByRole('heading', { level: 1, name: 'Isaiah 53' })).toBeVisible()
  await expect(page.locator('#v5')).toContainText('wounded for our transgressions')
  await expect(page).toHaveTitle(/Isaiah 53/)

  await page.getByRole('link', { name: /Next.*Isaiah 54/ }).first().click()
  await expect(page).toHaveURL(/\/bible\/isaiah\/54$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Isaiah 54' })).toBeVisible()
})

test('switches translation and remembers it', async ({ page }) => {
  await page.goto('/bible/john/1')
  await expect(page.locator('#v1')).toContainText('In the beginning was the Word')
  await page.getByRole('button', { name: /^Translation: / }).click()
  await page.getByRole('menuitemradio', { name: /Berean Standard Bible/ }).click()
  await expect(page.locator('#v29')).toContainText('Look, the Lamb of God')

  await page.reload()
  await expect(page.locator('#v29')).toContainText('Look, the Lamb of God')
})

test('selects a verse range from the verse menu and the URL', async ({ page }) => {
  await page.goto('/bible/isaiah/53')
  await page.getByRole('button', { name: /^Verse 4 options/ }).click()
  await page.getByRole('menuitem', { name: 'Select verse' }).click()
  await expect(page).toHaveURL(/#v4$/)

  await page.getByRole('button', { name: /^Verse 6 options/ }).click()
  await page.getByRole('menuitem', { name: 'Extend selection to here' }).click()
  await expect(page).toHaveURL(/#v4-6$/)
  await expect(page.getByRole('region', { name: 'Selected: Isaiah 53:4–6' })).toBeVisible()
  for (const verse of [4, 5, 6]) await expect(page.locator(`#v${verse}`)).toHaveClass(/bg-highlight/)
  await expect(page.locator('#v7')).not.toHaveClass(/bg-highlight/)

  // Deep links restore the same selection.
  await page.goto('/bible/isaiah/53#v2-3')
  const bar = page.getByRole('region', { name: 'Selected: Isaiah 53:2–3' })
  await expect(bar).toBeVisible()
  await bar.getByRole('button', { name: 'Clear selection' }).click()
  await expect(bar).toBeHidden()
  await expect(page).toHaveURL(/\/bible\/isaiah\/53$/)
})

test('explains chapters that do not exist', async ({ page }) => {
  await page.goto('/bible/romans/17')
  await expect(page.getByText('Romans has 16 chapters')).toBeVisible()
})
