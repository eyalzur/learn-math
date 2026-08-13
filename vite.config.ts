import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// package.json is the single source of truth for the version. Reading it here and
// substituting it at build time keeps the site fully static — no runtime fetch, no second
// place where the number is written down and can drift.
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

// https://vite.dev/config/
export default defineConfig({
  base: '/learn-math/',
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
})
