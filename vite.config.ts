// From vitest/config rather than vite, which is what types the `test` block.
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { editorServer } from './src/editor/editorServerPlugin.js'

// GitHub Pages serves a project site from /<repo>/, so assets need that prefix.
// Capacitor and local dev serve from the root, hence the env switch.
export default defineConfig({
  base: process.env.GITHUB_PAGES === '1' ? '/poker-legend/' : '/',
  // The map editor's save endpoint. `apply: 'serve'` inside it means it exists
  // in dev and never in a build, so nothing shipped can reach it.
  plugins: [react(), editorServer()],
  test: {
    /*
     * Several of these tests are simulations: thousands of hands, each running a
     * Monte Carlo equity estimate per decision. They are what verifies that a
     * table plays like poker rather than merely that a function returns, so they
     * are worth their cost — but vitest runs files in parallel, and under that
     * contention a legitimately slow simulation would blow the 5s default and
     * report as a failure with no assertion message, which is a confusing way to
     * find out the machine was simply busy.
     */
    testTimeout: 180_000,
  },
})
