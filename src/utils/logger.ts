/**
 * 极简调试日志出口（方案 §11）。
 *
 * §11 规定「禁止 `console.log`（ESLint error）；调试用 `logger.debug()`（仅 dev）」，
 * 故 `console` 的唯一出口收敛到本文件——`eslint.config.js` 对本文件豁免 `no-console`。
 * 生产构建中 `import.meta.env.DEV` 为常量 `false`，调用会被 tree-shaking 移除。
 */

const isDev: boolean = import.meta.env.DEV

export const logger = {
  /** 开发态调试输出；生产构建下为空操作。 */
  debug(...args: unknown[]): void {
    if (isDev) console.debug('[br]', ...args)
  },
  /** 开发态警告输出；生产构建下为空操作。 */
  warn(...args: unknown[]): void {
    if (isDev) console.warn('[br]', ...args)
  }
}

export type Logger = typeof logger
