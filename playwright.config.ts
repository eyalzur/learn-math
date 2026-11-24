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
    // CI already runs `npm run build` right before this (tests.yml) — serving that build
    // via `preview` instead of `dev` drops React StrictMode's intentional double-render,
    // a real (if secondary) cost on every adaptive/random-state test. Locally stays on
    // `dev` for reuseExistingServer + fast edit-reload while iterating.
    command: process.env.CI
      ? 'npm run preview -- --port 5173 --strictPort'
      : 'npm run dev -- --port 5173 --strictPort',
    url: 'http://localhost:5173/learn-math/',
    reuseExistingServer: !process.env.CI,
    env: {
      // A fixed, never-resolvable host (RFC 2606) so the "send to teacher" button always
      // attempts a request tests can intercept with page.route — see
      // tests/e2e/notebook-server-relay.spec.ts. No real notebook server is deployed yet,
      // and even if this ever escaped mocking, .invalid can never resolve to a real host.
      VITE_NOTEBOOK_SERVER_URL: 'https://notebook-server.invalid',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { launchOptions },
    },
  ],
});
