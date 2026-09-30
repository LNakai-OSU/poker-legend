import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves a project site from /<repo>/, so assets need that prefix.
// Capacitor and local dev serve from the root, hence the env switch.
export default defineConfig({
  base: process.env.GITHUB_PAGES === '1' ? '/poker-legend/' : '/',
  plugins: [react()],
})
