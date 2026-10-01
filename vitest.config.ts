import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

// Two projects: pure logic and the API run in Node; components run in jsdom.
// Browser flows live in e2e/ and run with Playwright (npm run test:e2e).
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      projects: [
        {
          extends: true,
          test: {
            name: 'node',
            environment: 'node',
            include: ['shared/**/*.test.ts', 'server/**/*.test.ts', 'test/**/*.test.ts'],
          },
        },
        {
          extends: true,
          test: {
            name: 'dom',
            environment: 'jsdom',
            include: ['src/**/*.test.{ts,tsx}'],
            setupFiles: ['./test/setup-dom.ts'],
          },
        },
      ],
    },
  }),
)
