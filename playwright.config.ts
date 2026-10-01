import { defineConfig, devices } from '@playwright/test'

// Runs its own API and Vite server on separate ports, so it never touches a
// running `npm run dev` or its database.
const WEB_PORT = 5174
const API_PORT = 8788
const baseURL = `http://localhost:${WEB_PORT}`

// Uses the installed Microsoft Edge, so no browser download is needed.
// Elsewhere (e.g. Linux CI): `npx playwright install chromium` and PLAYWRIGHT_CHANNEL=chromium.
const channel = process.env.PLAYWRIGHT_CHANNEL ?? 'msedge'

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  // Generous: a fresh browser context alone can take seconds on managed machines.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel } },
    { name: 'mobile', use: { ...devices['Pixel 7'], channel }, testMatch: ['a11y.spec.ts', 'mobile.spec.ts'] },
  ],
  webServer: [
    {
      command: 'node --import tsx e2e/serve-api.ts',
      url: `http://localhost:${API_PORT}/api/health`,
      env: {
        NODE_ENV: 'development',
        API_PORT: String(API_PORT),
        DATABASE_PATH: 'data/e2e/thread-bible.db',
        PUBLIC_URL: baseURL,
        CONTENT_STAGE: 'preview',
        API_BIBLE_KEY: '',
      },
      reuseExistingServer: false,
      // Copying the database and compiling the server takes ~20s idle, longer under load.
      timeout: 120_000,
    },
    {
      // A production build: far faster under parallel tests than the dev server, and what ships.
      command: `npx vite build --outDir dist-e2e --emptyOutDir && npx vite preview --outDir dist-e2e --port ${WEB_PORT} --strictPort`,
      url: baseURL,
      env: { API_PORT: String(API_PORT) },
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
})
