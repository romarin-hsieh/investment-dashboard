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
    setupFiles: ['./src/test-setup.ts'],
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
        // Global floor. Raised through WS-H PRs 4-7: 32.7 -> 38.8 stmts,
        // 25.1 -> 35.4 branch, 34.0 -> 41.5 funcs.
        statements: 38,
        branches: 35,
        functions: 41,
        lines: 38,

        // Per-file floors for the components in the ADR-0013 coverage workstream.
        // WS-H PR 5: 84.6 -> 89.3 stmts / 76.1 -> 82.3 branch / 53.1 -> 63.6 funcs.
        'src/components/MFIVolumeProfilePanel.vue': { statements: 88, branches: 81, functions: 62 },
        // WS-H PR 6: 80.5 -> 81.9 stmts / 72.8 -> 76.9 branch / 81.6 -> 82.5 funcs.
        'src/components/FundamentalAnalysis.vue': { statements: 81, branches: 76, functions: 82 },
        // WS-H PR 7: 72.3 -> 75.5 stmts / 71.2 -> 73.1 branch / 65.3 -> 69.4 funcs.
        'src/components/StockOverview.vue': { statements: 75, branches: 72, functions: 69 },
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
