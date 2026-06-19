import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import { visualizer } from 'rollup-plugin-visualizer'
import { resolve } from 'path'

const ANALYZE = process.env.ANALYZE === '1'

export default defineConfig({
  plugins: [
    vue(),
    // Precompile locale JSON to message functions at build time and DROP the
    // runtime message compiler. vue-i18n's compiler uses `new Function`, which the
    // app's Content-Security-Policy (no 'unsafe-eval') blocks — that crashed the
    // whole SPA in production. Precompiling removes any runtime eval. See ADR-0009.
    VueI18nPlugin({
      runtimeOnly: true,
      compositionOnly: true,
      jitCompilation: false,
      dropMessageCompiler: true,
      include: [resolve(__dirname, './src/locales/**')]
    }),
    ...(ANALYZE
      ? [
          visualizer({
            filename: 'stats.html',
            template: 'treemap',
            gzipSize: true,
            brotliSize: true,
            open: process.env.CI !== 'true'
          }),
          visualizer({
            filename: 'stats.json',
            template: 'raw-data',
            gzipSize: true,
            brotliSize: true
          })
        ]
      : [])
  ],
  base: process.env.NODE_ENV === 'production' ? '/investment-dashboard/' : '/',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // vue-i18n is framework infra (like vue-router); keep it in the
          // long-cached vendor chunk so it stays out of the entry chunk.
          vendor: ['vue', 'vue-router', 'vue-i18n'],
          utils: ['zod'],
          // WS-C PR-C1: split Plotly (~1.2 MB uncompressed) into its own chunk.
          // Combined with dynamic `await import('plotly.js-dist-min')` inside
          // ReviewCometChart.vue and ThreeDKineticChart.vue, Plotly only loads
          // when a user actually navigates to a page that renders a 3D chart.
          plotly: ['plotly.js-dist-min']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  esbuild: {
    // Drop console.log in production, but keep warn and error for debugging
    pure: process.env.NODE_ENV === 'production' ? ['console.log'] : [],
    drop: process.env.NODE_ENV === 'production' ? ['debugger'] : []
  },
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    }
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api/yahoo': {
        target: 'https://query1.finance.yahoo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/yahoo/, ''),
        secure: false,
        headers: {
          'Origin': 'https://finance.yahoo.com',
          'Referer': 'https://finance.yahoo.com',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      }
    }
  }
})
