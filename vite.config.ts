import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Minimal Vite config: React plugin only. App is a static SPA, no backend.
export default defineConfig({
  plugins: [react()],
})
