import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

// The dev container ships a browser at a fixed path and blocks `playwright install`.
// GitHub's runner is the other way round: nothing at that path, and the browser installed
// where Playwright expects it. Pointing at a path that doesn't exist fails the whole run
// before a single test starts, so the path is used only where it is actually there.
const CONTAINER_CHROMIUM = '/opt/pw-browsers/chromium';
const launchOptions = existsSync(CONTAINER_CHROMIUM)
  ? { executablePath: CONTAINER_CHROMIUM }
  : {};

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:5173',
  },
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://localhost:5173/learn-math/',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'chromium',
      use: { launchOptions },
    },
  ],
});
