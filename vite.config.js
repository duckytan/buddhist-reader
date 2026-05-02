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
    allowedHosts: ['.monkeycode-ai.online']
  },
  define: {
    global: 'globalThis'
  },
  optimizeDeps: {
    include: ['mdict-js']
  },
  build: {
    sourcemap: true,
    commonjsOptions: {
      transformMixedEsModules: true
    }
  }
}))
