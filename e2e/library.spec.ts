import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'

test('a signed-out bookmark and note move into a new account', async ({ page }) => {
  // Signed out: saved in this browser.
  await page.goto('/bible/romans/8')
  await page.getByRole('button', { name: /^Verse 28 options/ }).click()
  await page.getByRole('menuitem', { name: 'Bookmark' }).click()
  await expect(page.getByText('Romans 8:28 saved to your Library')).toBeVisible()
  await expect(page.getByRole('button', { name: /^Verse 28 options, bookmarked/ })).toBeVisible()

  await page.getByRole('button', { name: /^Verse 1 options/ }).click()
  await page.getByRole('menuitem', { name: 'Add note…' }).click()
  const dialog = page.getByRole('dialog', { name: 'Note on Romans 8:1' })
  await dialog.getByLabel('Your note').fill('No condemnation. Compare John 3:18.')
  await dialog.getByRole('button', { name: 'Save note' }).click()
  await expect(dialog).toBeHidden()

  await page.goto('/library')
  await expect(page.getByText('Saved in this browser', { exact: false }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: 'Romans 8:28' }).first()).toBeVisible()

  // Create an account with generated test credentials; the local library is imported.
  await page.goto('/sign-up?next=/library')
  await page.getByLabel('Name').fill('E2E Reader')
  await page.getByLabel('Email').fill(`e2e-${randomUUID()}@example.test`)
  await page.getByLabel('Password').fill(randomUUID())
  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(page).toHaveURL(/\/library$/)
  await expect(page.getByText('Synced to your account')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Romans 8:28' }).first()).toBeVisible()
  await expect(page.getByText('No condemnation. Compare John 3:18.')).toBeVisible()

  // The account copy survives a fresh browser storage.
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await expect(page.getByText('No condemnation. Compare John 3:18.')).toBeVisible()
})

test('sign-up validates before submitting', async ({ page }) => {
  await page.goto('/sign-up')
  await page.getByLabel('Name').fill('E2E Reader')
  await page.getByLabel('Email').fill('not-an-email')
  await page.getByLabel('Password').fill('short')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByLabel('Email')).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByLabel('Password')).toHaveAttribute('aria-invalid', 'true')
  await expect(page).toHaveURL(/\/sign-up$/)
})
