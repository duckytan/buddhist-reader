import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { execSync } from 'child_process'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'))
const version = pkg.version

let commitHash = 'unknown'
try {
  commitHash = execSync('git rev-parse --short HEAD').toString().trim()
} catch (e) { /* ignore */ }

function buildDictIndexPlugin() {
  return {
    name: 'build-dict-index',
    buildStart() {
      console.log('[build-dict-index] Generating dict index...')
      execSync('node scripts/build-dict-index.cjs', { stdio: 'inherit' })
    }
  }
}

export default defineConfig(({ mode }) => {
  const base = mode === 'ghpages' ? '/buddhist-reader/' : '/'
  return {
    base,
    define: {
      __APP_VERSION__: JSON.stringify(version),
      __COMMIT_HASH__: JSON.stringify(commitHash)
    },
    plugins: [vue(), buildDictIndexPlugin()],
    server: {
      host: true,
      allowedHosts: ['.monkeycode-ai.online']
    },
    test: {
      environment: 'jsdom',
      globals: true
    },
    build: {
      assetsDir: 'assets',
      rollupOptions: {
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]'
        }
      }
    }
  }
})