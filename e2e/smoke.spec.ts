import { test, expect } from '@playwright/test'

/**
 * Smoke — the app boots, the default route renders real content, and nothing
 * throws. Deliberately data-agnostic: it asserts the shell, not any specific
 * symbol, so it stays green whether or not the remote data repo responds.
 */
test.describe('smoke', () => {
  test('boots at the default route with no uncaught errors', async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (e) => pageErrors.push(e.message))

    await page.goto('/')

    // '/' hash-redirects to '#/market-overview'; the SPA lazy-loads the view.
    // A visible heading is the "rendered real content" signal (#app is not a
    // unique anchor — App.vue's root reuses the mount-point id; see ADR-0015).
    await expect(page).toHaveTitle(/Investment Dashboard/)
    await expect(page.locator('h1, h2, h3').first()).toBeVisible({ timeout: 15_000 })

    // <html lang> is an a11y baseline the jsdom component layer cannot assert.
    await expect(page.locator('html')).toHaveAttribute('lang', /.+/)

    expect(pageErrors, `uncaught page errors:\n${pageErrors.join('\n')}`).toEqual([])
  })

  test('navigates to the stock overview route', async ({ page }) => {
    await page.goto('/#/stock-overview')
    await expect(page.locator('h1, h2, h3').first()).toBeVisible({ timeout: 15_000 })
  })
})
