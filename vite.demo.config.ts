import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The preview build (scripts/build-demo.mjs): one entry, one JS file, so it can be inlined into a
// single HTML page and published as an artifact. Not used for the real site.
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

export default defineConfig({
  base: './',
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(version) },
  build: {
    outDir: 'dist-demo',
    emptyOutDir: true,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
})
