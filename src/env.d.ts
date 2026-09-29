/// <reference types="vite/client" />

/** 单文件组件（SFC）模块声明，供 TS 识别 `.vue` 导入。 */
declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

/** 由 `vite.config.ts` 的 `define` 注入的应用版本号。 */
declare const __APP_VERSION__: string
