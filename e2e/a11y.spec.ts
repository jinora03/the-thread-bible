import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const pages = [
  ['home', '/'],
  ['Bible index', '/bible'],
  ['reader', '/bible/isaiah/53'],
  ['reader, study mode with selection', '/bible/romans/8#v28-30', { mode: 'study' }],
  ['explore', '/explore'],
  ['doctrine', '/explore/doctrines/resurrection'],
  ['prophecy', '/explore/prophecies/suffering-servant'],
  ['study', '/studies/from-promise-to-fulfillment'],
  ['theme', '/explore/themes/covenant'],
  ['search', '/search?q=lamb%20of%20god'],
  ['library', '/library'],
  ['sign in', '/sign-in'],
  ['not found', '/explore/doctrines/predestination'],
] as const

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`${colorScheme} theme`, () => {
    test.use({ colorScheme })

    for (const [name, path, options] of pages) {
      test(`${name} has no detectable accessibility violations`, async ({ page }) => {
        test.slow() // axe on a long chapter is CPU-heavy, especially with parallel workers
        if (options?.mode) {
          await page.addInitScript((mode) => {
            localStorage.setItem('ttb-reader', JSON.stringify({ translationId: 'kjv', mode, textSize: 'md', contextPanelOpen: true }))
          }, options.mode)
        }
        await page.goto(path)
        await expect(page.locator('h1').first()).toBeVisible()
        await page.waitForLoadState('networkidle')

        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
          .analyze()
        const violations = results.violations.map(
          (violation) => `${violation.id} (${violation.impact}): ${violation.nodes.map((node) => node.target.join(' ')).slice(0, 4).join(' | ')}`,
        )
        expect(violations).toEqual([])
      })
    }
  })
}
