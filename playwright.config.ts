import { defineConfig, devices } from '@playwright/test';

// E2E runs against the Firebase emulators, never the live project — see
// `npm run test:e2e`, which wraps this in `firebase emulators:exec`. The dev
// server is started with VITE_USE_FIREBASE_EMULATORS so src/lib/firebase.ts
// points the SDK at localhost.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'html',
  globalSetup: './e2e/seed.ts',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      VITE_USE_FIREBASE_EMULATORS: 'true',
    },
  },
});
