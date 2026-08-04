import { defineConfig } from 'vitest/config';

// Firestore security-rules tests. These talk to the emulator over the network and
// have no DOM, so they get their own config instead of the jsdom setup used by the
// component tests. Launch via `npm run test:rules`, which starts the emulator.
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/firestore.rules.test.ts'],
    // Rules tests share one emulator instance and clear the database between
    // cases, so they must not run concurrently.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
