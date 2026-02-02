import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
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
          vendor: ['vue', 'vue-router'],
          utils: ['zod']
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
          'Referer': 'https://finance.yahoo.com'
        }
      }
    }
  }
})
