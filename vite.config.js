import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { execSync } from 'child_process'

function buildDictIndexPlugin() {
  return {
    name: 'build-dict-index',
    buildStart() {
      console.log('[build-dict-index] Generating dict index...')
      execSync('node scripts/build-dict-index.cjs', { stdio: 'inherit' })
    }
  }
}

export default defineConfig({
  plugins: [vue(), buildDictIndexPlugin()],
  server: {
    host: true,
    allowedHosts: ['.monkeycode-ai.online']
  },
  test: {
    environment: 'jsdom',
    globals: true
  }
})