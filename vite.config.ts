/// <reference types="vitest" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';

const TEST_EXCLUDE_PATTERNS = [
  'e2e/**',
  'node_modules/**',
  'functions/node_modules/**',
  '.stryker-tmp/**',
  '.claude/**',
  '.copilot/**',
  'tests/firestore.rules.test.ts',
];

// One id per build: the deployed commit in CI, a timestamp elsewhere. The app
// compares it with /version.json to notice a newer release (src/lib/appVersion.ts).
const BUILD_ID = process.env.GITHUB_SHA || String(Date.now());
const versionFile = (): Plugin => ({
  name: 'version-file',
  apply: 'build',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: BUILD_ID }) });
  },
});

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), versionFile()],
    define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: {
            // The Firebase SDK is ~200 KB gzipped and changes only on an SDK
            // bump. In its own chunk its hash survives app deploys, so returning
            // users on slow hospital links keep it cached instead of
            // re-downloading it with every merge.
            groups: [{ name: 'firebase', test: /node_modules[\\/](@firebase|firebase|re2js|idb)[\\/]/ }],
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify — file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./tests/setup.ts'],
      globals: true,
      // Rules tests need the Firestore emulator, so they run separately via
      // `npm run test:rules` rather than in the default unit-test sweep.
      exclude: TEST_EXCLUDE_PATTERNS,
    },
  };
});
