import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

// App is a static SPA, no backend.
// `base` must match the repo name for GitHub Pages project sites
// (served at https://<user>.github.io/dutch-learning/). Only applied to the
// production build so local `npm run dev` stays at "/".
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/dutch-learning/' : '/',
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
}))
