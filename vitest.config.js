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
        // Global floor. Raised by WS-H PR 4 (TechnicalIndicators): 34.6 -> 38.2 stmts,
        // 28.7 -> 34.4 branch, 37.1 -> 40.4 funcs.
        statements: 38,
        branches: 34,
        functions: 40,
        lines: 38,

        // Per-file floors for the components in the ADR-0013 coverage workstream.
        'src/components/MFIVolumeProfilePanel.vue': { statements: 83, branches: 75, functions: 52 },
        'src/components/FundamentalAnalysis.vue': { statements: 79, branches: 71, functions: 80 },
        'src/components/StockOverview.vue': { statements: 71, branches: 70, functions: 64 },
        // WS-H PR 3: 16.8 -> 78.8 stmts / 75.0 branch / 75.0 funcs.
        'src/components/StockCard.vue': { statements: 78, branches: 74, functions: 74 },
        // WS-H PR 2: 14.8 -> 96.3 stmts / 100 branch / 91.7 funcs.
        'src/components/NavigationPanel.vue': { statements: 95, branches: 95, functions: 90 },
        // WS-H PR 4: 7.1 -> 78.2 stmts / 65.6 branch / 89.3 funcs.
        'src/components/TechnicalIndicators.vue': { statements: 77, branches: 64, functions: 88 }
      }
    }
  }
})
