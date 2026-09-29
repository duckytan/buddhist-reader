/**
 * 静态资源根路径解析。
 *
 * 由 `dictRepository` / `sutraRepository` 共享，避免重复实现。
 * 默认取 Vite 的 `import.meta.env.BASE_URL`（如 GitHub Pages 子路径 `/buddhist-reader/`），
 * 保证与 `vite.config.ts` 的 `base` 一致。
 */

/** 返回以 `/` 结尾的资源根路径。 */
export function resolveBaseUrl(): string {
  const base = import.meta.env.BASE_URL || '/'
  return base.endsWith('/') ? base : `${base}/`
}
