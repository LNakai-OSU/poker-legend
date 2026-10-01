// From vitest/config rather than vite, which is what types the `test` block.
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// GitHub Pages serves a project site from /<repo>/, so assets need that prefix.
// Capacitor and local dev serve from the root, hence the env switch.
export default defineConfig({
  base: process.env.GITHUB_PAGES === '1' ? '/poker-legend/' : '/',
  plugins: [react()],
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
