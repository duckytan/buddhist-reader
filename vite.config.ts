import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

/**
 * 读取 package.json 版本号，供运行时展示（`__APP_VERSION__`）。
 * 使用 `import.meta.url` 定位，避免依赖 CJS 的 `__dirname`。
 */
const pkg = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf-8')
) as { version: string }

/**
 * Vite 构建配置（v4.0 重写版）。
 *
 * ⚠️ 红线（方案 §4.6 / P0-1）：本文件**绝不可**引入 `buildDictIndexPlugin`
 * 或任何 `build-dict-index` 相关构建钩子。旧版正是靠该钩子在 `buildStart()`
 * 里执行 `scripts/build-dict-index.cjs`，自动生成 20.8MB 内联词典产物
 * （`src/data/dictIndex.js`）——一旦复制进来，P0 病灶立即复活。
 * 该断言由 `scripts/guard-forbidden.mjs` 在 CI 中机器校验。
 *
 * 只保留：vue 插件 + `@`→`src` 别名 + 构建输出配置。
 */
export default defineConfig(({ mode }) => {
  const base = mode === 'ghpages' ? '/buddhist-reader/' : '/'

  return {
    base,
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version)
    },
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    server: {
      host: true,
      allowedHosts: ['.monkeycode-ai.online']
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
