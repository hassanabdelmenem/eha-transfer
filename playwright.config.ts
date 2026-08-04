import { defineConfig, devices } from '@playwright/test';

// E2E runs against the Firebase emulators, never the live project — see
// `npm run test:e2e`, which wraps this in `firebase emulators:exec`. The dev
// server is started with VITE_USE_FIREBASE_EMULATORS so src/lib/firebase.ts
// points the SDK at localhost.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  timeout: 60000,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'html',
  globalSetup: './e2e/global-setup',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    navigationTimeout: 45000,
    actionTimeout: 20000,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
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
    reuseExistingServer: false,
    timeout: 180000,
    env: {
      VITE_USE_FIREBASE_EMULATORS: 'true',
    },
  },
});
