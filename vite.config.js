import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig(({ mode }) => ({
  plugins: [
    vue(),
    mode === 'analyze' ? visualizer({ open: true, filename: 'dist/stats.html' }) : null
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    host: true,
    port: 5173,
    allowedHosts: ['.monkeycode-ai.online']
  },
  define: {
    global: 'globalThis'
  },
  optimizeDeps: {
    include: ['mdict-js', 'lzo-wasm']
  },
  build: {
    sourcemap: true,
    commonjsOptions: {
      transformMixedEsModules: true
    },
    minify: 'esbuild',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('vue') || id.includes('pinia') || id.includes('vue-router')) {
              return 'vue'
            }
            if (id.includes('vant')) {
              return 'vant'
            }
            if (id.includes('markdown-it') || id.includes('turndown')) {
              return 'markdown'
            }
          }
        }
      }
    }
  },
  ssr: {
    noExternal: ['lzo-wasm']
  },
  worker: {
    format: 'es'
  }
}))
