import { defineConfig, devices } from '@playwright/test'
import type { TestOptions } from './fixtures/test'
import { accountByAlias } from './data/accounts'
import { reportDirectory } from './utils/runtime'

// The runner enforces phase order even when product tests fail.
if (!process.env.E2E_PHASE) {
  throw new Error('Use npm test (or npm run test:list) to preserve account isolation.')
}

const workers = Number(process.env.WORKERS ?? 2)
if (!Number.isInteger(workers) || workers < 1 || workers > 4) {
  throw new Error('WORKERS must be an integer from 1 to 4.')
}

export default defineConfig<TestOptions>({
  testDir: './tests',
  outputDir: `${reportDirectory}/test-results/${process.env.E2E_PHASE}`,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: process.env.E2E_PHASE === 'report'
    ? [
        ['html', { outputFolder: `${reportDirectory}/html`, open: 'never' }],
        ['junit', { outputFile: `${reportDirectory}/junit.xml` }],
        ['list'],
      ]
    : [
        ['list'],
        ['blob', { outputFile: `${reportDirectory}/blob/${process.env.E2E_PHASE}.zip` }],
        // Allure appends phase results; merging blobs does not configure its projects.
        ['allure-playwright', { resultsDir: `${reportDirectory}/allure-results` }],
      ],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: process.env.BASE_URL ?? 'https://13.54.25.80',
    locale: 'en-NZ',
    timezoneId: 'Pacific/Auckland',
    viewport: { width: 1280, height: 720 },
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testMatch: '**/setup/*.setup.ts',
      workers: 2,
      retries: 0,
      // Authentication requests carry credentials. Do not retain setup evidence.
      use: { trace: 'off', screenshot: 'off', video: 'off' },
    },
    {
      name: 'chromium',
      testMatch: '**/*.spec.ts',
      testIgnore: ['**/settings/**', '**/*.stateful.spec.ts', '**/*.live.spec.ts'],
    },
    {
      name: 'settings',
      testMatch: ['**/settings/**/*.spec.ts', '**/*.stateful.spec.ts'],
      workers: 1,
      fullyParallel: false,
      retries: 0,
      use: { account: accountByAlias('rangi'), resetAlerts: true },
    },
    {
      name: 'ai',
      testMatch: '**/*.live.spec.ts',
      workers: 1,
      fullyParallel: false,
      retries: 0,
      timeout: 90_000,
    },
  ],
  metadata: { environment: process.env.BASE_URL ?? 'https://13.54.25.80' },
})
