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

// 注意：v4.0 起词典数据改由 public/ 下的静态分片按需提供，
// 构建期不再生成内联的 20.8MB 索引产物（禁止复活，见 scripts/guard-forbidden.mjs）。
export default defineConfig(({ mode }) => {
  const base = mode === 'ghpages' ? '/buddhist-reader/' : '/'
  return {
    base,
    define: {
      __APP_VERSION__: JSON.stringify(version),
      __COMMIT_HASH__: JSON.stringify(commitHash)
    },
    plugins: [vue()],
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