import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// package.json is the single source of truth for the version. Reading it here and
// substituting it at build time keeps the site fully static — no runtime fetch, no second
// place where the number is written down and can drift.
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

// https://vite.dev/config/
export default defineConfig({
  // The live site is /learn-math/. The new two-app version is built a second time under
  // /learn-math/next/ (see .github/workflows/deploy.yml) so it can be installed and tried on phones
  // without touching the live site.
  base: process.env.VITE_BASE ?? '/learn-math/',
  plugins: [react()],
  // Two apps from one codebase: the kids' app at the root, the parents' app under /parents/.
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        parents: fileURLToPath(new URL('./parents/index.html', import.meta.url)),
      },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
})
