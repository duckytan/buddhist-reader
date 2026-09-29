/**
 * ESLint 配置（v4.0 · TypeScript 版）。
 *
 * 说明（方案 §12.1 / §11）：
 * - 统一使用 `vue-eslint-parser` + `@typescript-eslint/parser` 解析 `.vue` / `.ts`；
 * - `no-console` 为 error（方案 §11：禁止 console.log，调试用 logger.debug）；
 * - `no-restricted-globals` 拦截组件/composable 里的 `document` / `window`，
 *   **唯一白名单**：`src/utils/anchor.ts`（DOM 访问集中一处，见方案 §11）；
 * - `no-restricted-syntax` 拦截 `createTreeWalker` / `getBoundingClientRect` 定位
 *   （旧版手工数字符定位的病灶，见方案 §6.1）；
 * - `ignorePatterns` 保留，但**不得**包含 `src/data/dictIndex.js`
 *   （拆弹第四件：该条目即「复活链路」的一环，见方案 §4.6）。
 */
module.exports = {
  root: true,
  ignorePatterns: [
    'archive/',
    'dist/',
    'node_modules/',
    'public/',
    'temp-sutras/',
    'coverage/',
    'scripts/'
  ],
  env: {
    browser: true,
    es2022: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 'latest',
    sourceType: 'module',
    extraFileExtensions: ['.vue']
  },
  plugins: ['@typescript-eslint'],
  rules: {
    'no-console': 'error',
    'no-debugger': 'error',
    'vue/multi-word-component-names': 'off',
    '@typescript-eslint/no-explicit-any': 'error',
    'vue/no-v-html': 'error',
    'no-restricted-globals': [
      'error',
      { name: 'document', message: 'DOM 访问请走 utils/anchor.ts 封装（方案 §11）。' },
      { name: 'window', message: 'DOM 访问请走 utils/anchor.ts 封装（方案 §11）。' }
    ],
    'no-restricted-syntax': [
      'error',
      {
        selector: "CallExpression[callee.property.name='createTreeWalker']",
        message: '禁止手工 TreeWalker 定位（方案 §6.1），请使用语义锚点 data-off。'
      },
      {
        selector: "CallExpression[callee.property.name='getBoundingClientRect']",
        message: '禁止 getBoundingClientRect 定位（方案 §6.1），请使用 scroll-margin-top + scrollIntoView。'
      }
    ]
  },
  overrides: [
    {
      files: ['src/utils/anchor.ts'],
      rules: {
        'no-restricted-globals': 'off'
      }
    }
  ]
}
