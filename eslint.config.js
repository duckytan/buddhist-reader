import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import vueParser from 'vue-eslint-parser'

/**
 * ESLint 扁平配置（v4.0 · TypeScript 版）——**ESLint 实际加载的配置**。
 *
 * ⚠️ ESLint v10 已彻底移除 `.eslintrc.*` 支持（仅认 `eslint.config.*`），故旧
 * `.eslintrc.cjs` 已删除，本文件是唯一生效配置。拆弹第四件由护栏断言
 * `assertNoFile('.eslintrc.cjs')` + `assertNoMatch('eslint.config.js', /dictIndex\.js/)`
 * 守住（见 `scripts/guard-forbidden.mjs` A 类）。
 *
 * 规则要点（方案 §11 / §12.1）：
 * - `no-console` error（禁止 console.log）；
 * - `@typescript-eslint/no-explicit-any` error（禁止 any）；
 * - `vue/no-v-html` error（防 XSS）；
 * - `no-restricted-globals` 拦截 `document`/`window`，**唯一白名单** `src/utils/anchor.ts`；
 * - `no-restricted-syntax` 拦截 `createTreeWalker` / `getBoundingClientRect` 定位（方案 §6.1）。
 *
 * 纯排版类规则（max-attributes-per-line 等）放宽：本项目不引入 Prettier，
 * 保持手写禅意风格，避免把格式噪声当阻塞错误（方案 §12.2 减法原则）。
 */

/** 受限全局：DOM 访问集中到 utils/anchor.ts（方案 §11）。 */
const restrictedGlobals = [
  { name: 'document', message: 'DOM 访问请走 utils/anchor.ts 封装（方案 §11）。' },
  { name: 'window', message: 'DOM 访问请走 utils/anchor.ts 封装（方案 §11）。' }
]

/** 受限语法：禁止旧版手工定位病灶（方案 §6.1）。 */
const restrictedSyntax = [
  {
    selector: "CallExpression[callee.property.name='createTreeWalker']",
    message: '禁止手工 TreeWalker 定位（方案 §6.1），请使用语义锚点 data-off。'
  },
  {
    selector: "CallExpression[callee.property.name='getBoundingClientRect']",
    message: '禁止 getBoundingClientRect 定位（方案 §6.1），请使用 scroll-margin-top + scrollIntoView。'
  }
]

export default [
  {
    ignores: [
      'archive/**',
      'dist/**',
      'node_modules/**',
      'public/**',
      'temp-sutras/**',
      'coverage/**',
      'scripts/**'
    ]
  },
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  ...tseslint.configs['flat/recommended'],
  {
    // `.vue` 必须用 vue-eslint-parser 包裹 ts 解析器（覆盖 ts base 的全局 parser）
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        ecmaVersion: 'latest',
        sourceType: 'module',
        extraFileExtensions: ['.vue']
      }
    }
  },
  {
    // CommonJS 配置/脚本文件（如 .eslintrc.cjs）：声明 CJS 全局
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        module: 'writable',
        exports: 'writable',
        require: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        console: 'readonly'
      }
    }
  },
  {
    // 由 vite `define` 注入的编译期常量
    files: ['src/**/*.ts', 'src/**/*.vue'],
    languageOptions: {
      globals: {
        __APP_VERSION__: 'readonly'
      }
    }
  },
  {
    files: ['**/*.ts', '**/*.vue'],
    rules: {
      'no-console': 'error',
      'no-debugger': 'error',
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      'no-restricted-globals': ['error', ...restrictedGlobals],
      'no-restricted-syntax': ['error', ...restrictedSyntax],

      // 排版类规则放宽（无 Prettier 协作）
      'vue/max-attributes-per-line': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/multiline-html-element-content-newline': 'off',
      'vue/html-self-closing': 'off',
      'vue/html-indent': 'off',
      'vue/html-closing-bracket-newline': 'off',
      'vue/first-attribute-linebreak': 'off',
      'vue/attributes-order': 'off'
    }
  },
  {
    // DOM 访问唯一白名单（方案 §11）
    files: ['src/utils/anchor.ts'],
    rules: {
      'no-restricted-globals': 'off'
    }
  },
  {
    // 日志唯一出口（方案 §11：禁止 console，调试走 logger.debug）
    files: ['src/utils/logger.ts'],
    rules: {
      'no-console': 'off'
    }
  }
]
