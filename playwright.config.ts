import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config — the browser layer of the a11y/E2E strategy (ADR-0015).
 *
 * Serves a production build through `vite preview` with `E2E=1` (base '/', so no
 * GitHub-Pages subpath) and drives it in headless Chromium. This layer covers
 * what the jsdom axe layer (src/a11y/*.a11y.test.js) cannot: real layout, so
 * color-contrast is checked for real, and full-page landmark/structure rules.
 *
 * Local: `npm run seed-data` once (public/data is git-ignored), then `npm run test:e2e`.
 * CI: .github/workflows/e2e.yml seeds data, then runs this.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // Full-page axe scans traverse widget-heavy routes (many TradingView embeds);
  // give them headroom over the 30s default so a slow scan is not a false fail.
  timeout: 60_000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',

  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  // Build once with the E2E base, then preview. reuseExistingServer lets a local
  // `npm run preview` already running be reused instead of rebuilding each run.
  webServer: {
    command: 'npm run build:e2e && npm run preview',
    url: 'http://localhost:4173',
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
  },
})
