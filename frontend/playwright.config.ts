import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Run tests serially since they share database state
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to avoid race conditions with shared database
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'ui-tests',
      testMatch: /pushup-tracker\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'data-accuracy',
      testMatch: /data-accuracy\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['ui-tests'], // Run after ui-tests complete
    },
    {
      name: 'stat-card-updates',
      testMatch: /stat-card-updates\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['data-accuracy'], // Run after data-accuracy complete
    },
    {
      name: 'comprehensive',
      testMatch: /comprehensive\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['stat-card-updates'], // Run after stat-card-updates complete
    },
  ],

  // Run local dev server before starting tests
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
    {
      command: 'cd ../backend && npm start',
      url: 'http://localhost:3001/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
  ],
});
