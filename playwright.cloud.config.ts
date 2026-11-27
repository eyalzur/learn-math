import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

/**
 * Cloud mode end to end: the real api (DEV_AUTH, in-memory store) + the app built in cloud mode.
 * Separate from the main suite on purpose — the live site still runs the old app.
 * Serial: one server, one shared clock (the tests move it to expire subscriptions).
 */
const launchOptions = existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {};

export default defineConfig({
  testDir: './tests/cloud',
  workers: 1,
  fullyParallel: false,
  use: { baseURL: 'http://localhost:5174', viewport: { width: 390, height: 664 } },
  webServer: [
    {
      command: 'cd api && DEV_AUTH=1 PORT=8788 node --import tsx src/index.ts',
      url: 'http://localhost:8788/health',
      reuseExistingServer: false,
    },
    {
      command: 'npx vite --port 5174 --strictPort',
      url: 'http://localhost:5174/learn-math/',
      reuseExistingServer: false,
      env: { VITE_CLOUD: '1', VITE_API_URL: 'http://localhost:8788' },
    },
  ],
  projects: [{ name: 'chromium', use: { launchOptions } }],
});
