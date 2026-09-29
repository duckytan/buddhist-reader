/**
 * 唯一 id 生成（T05 领域服务共用）。
 *
 * 说明：本文件不在方案 §5 的文件清单中，但为 **noteService / reader store** 共用
 * 的「生成唯一 id」提供单一实现（避免两处重复）。优先用 `crypto.randomUUID()`
 * （现代浏览器 / Node 19+），不可用时退回「时间戳 + 随机数」组合，仍满足本地
 * 场景的唯一性要求（非密码学用途）。
 */

/**
 * 生成唯一 id。
 * @param prefix 可选前缀（如 `note` / `bm`），便于调试辨识。
 */
export function createId(prefix = ''): string {
  const cryptoObj = globalThis.crypto
  const raw =
    typeof cryptoObj?.randomUUID === 'function'
      ? cryptoObj.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  return prefix ? `${prefix}-${raw}` : raw
}
