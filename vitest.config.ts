import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

/**
 * Vitest 配置（v4.0）。
 * - `environment: 'jsdom'`：主链路组件测试需要 DOM；
 * - `globals: true`：允许 `describe/it/expect` 免导入（类型见 tsconfig `types: ["vitest/globals"]`）；
 * - 别名 `@`→`src` 与 `vite.config.ts` 保持一致。
 */
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'tests/**/*.{test,spec}.{ts,tsx}']
  }
})
