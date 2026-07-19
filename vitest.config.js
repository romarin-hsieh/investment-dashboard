import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '**/*.config.js', '**/*.config.ts'],

      /*
       * Coverage floors — RATCHET policy, see ADR-0013.
       *
       * Every number below is set at (or 1 point under) the coverage actually
       * measured when the gate was introduced. The gate therefore passes today
       * and its only job is to stop coverage SILENTLY REGRESSING — the same
       * contract the bundle-size budgets provide for bundle weight (ADR-0007).
       *
       * When a component's tests are expanded, RAISE its floor in the same PR.
       * Never lower a floor to make a build pass; fix the test instead.
       */
      thresholds: {
        // Global floor (measured 2026-06: 32.7 stmts / 25.1 branch / 34.0 funcs / 33.4 lines).
        statements: 32,
        branches: 24,
        functions: 33,
        lines: 32,

        // Per-file floors for the components in the ADR-0013 coverage workstream.
        'src/components/MFIVolumeProfilePanel.vue': { statements: 83, branches: 75, functions: 52 },
        'src/components/FundamentalAnalysis.vue': { statements: 79, branches: 71, functions: 80 },
        'src/components/StockOverview.vue': { statements: 71, branches: 70, functions: 64 },
        'src/components/StockCard.vue': { statements: 16 },
        'src/components/NavigationPanel.vue': { statements: 14 },
        'src/components/TechnicalIndicators.vue': { statements: 7 }
      }
    }
  }
})
