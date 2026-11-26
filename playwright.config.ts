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
    // Stays on `dev`, in CI too — tried switching CI to `vite preview` (serving the
    // already-built dist/) to drop StrictMode's double-render, but
    // students-and-syllabus.spec.ts deliberately `import()`s a raw .ts source file at
    // its Vite dev-server path to read the app's own data (see that test's own
    // comment) — `preview` serves only the built bundle, with no route for that file at
    // all, so it broke under CI. Not worth rewriting a passing test for a secondary
    // speed gain; the real one is the fake-clock fix in the individual spec files plus
    // sharding below (tests.yml).
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://localhost:5173/learn-math/',
    reuseExistingServer: !process.env.CI,
    env: {
      // A fixed, never-resolvable host (RFC 2606) so the "send to teacher" button always
      // attempts a request tests can intercept with page.route — see
      // tests/e2e/notebook-server-relay.spec.ts. No real notebook server is deployed yet,
      // and even if this ever escaped mocking, .invalid can never resolve to a real host.
      VITE_NOTEBOOK_SERVER_URL: 'https://notebook-server.invalid',
      // The real weekly lesson cap (docs/features/weekly-lesson-cap/) would stop specs that
      // run many practices in a row. Raised here only; weekly-lesson-cap.spec.ts seeds the
      // real default back through the localStorage override key.
      VITE_FREE_LESSONS_PER_WEEK: '9999',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { launchOptions },
    },
  ],
});
