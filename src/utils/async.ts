/**
 * 异步工具：超时 + 重试 + AbortController（方案 §11）。
 *
 * 约定：**所有网络请求必须经本模块**（禁止裸 `fetch`）。
 * 默认口径（§4.4 弱网降级）：单次超时 8s + 额外重试 1 次。
 */

/** 单次请求超时错误 */
export class TimeoutError extends Error {
  readonly timeoutMs: number

  constructor(timeoutMs: number) {
    super(`请求超时（${timeoutMs}ms）`)
    this.name = 'TimeoutError'
    this.timeoutMs = timeoutMs
  }
}

/** HTTP 非 2xx 错误 */
export class HttpError extends Error {
  readonly status: number
  readonly url: string

  constructor(status: number, url: string) {
    super(`HTTP ${status}: ${url}`)
    this.name = 'HttpError'
    this.status = status
    this.url = url
  }
}

/** 可注入的 fetch 签名（便于单测替换） */
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

/** 统一的请求函数签名（`fetchJson` 满足之；仓库层可注入替身） */
export type RequestFn = <T>(url: string, options?: FetchJsonOptions) => Promise<T>

/** 是否为「主动取消」（AbortError） */
export function isAbortError(err: unknown): boolean {
  if (err instanceof DOMException) return err.name === 'AbortError'
  return err instanceof Error && err.name === 'AbortError'
}

/** 延时（可被 signal 取消） */
export function sleep(ms: number, signal?: AbortSignal | undefined): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const onAbort = (): void => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

/**
 * 给任意 Promise 加超时（超时抛 `TimeoutError`）。
 * 注意：不会中断底层操作（仅取消等待）；网络请求请用 `fetchJson`（内部会 abort）。
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(timeoutMs)), timeoutMs)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err: unknown) => {
        clearTimeout(timer)
        reject(err)
      }
    )
  })
}

/** 重试配置 */
export interface RetryOptions {
  /** 额外重试次数（总尝试 = retries + 1）。默认 1。 */
  retries?: number
  /** 重试间隔（ms）。默认 300。 */
  retryDelayMs?: number
  /** 判定是否重试；默认：非 AbortError 均重试。 */
  shouldRetry?: (err: unknown, attempt: number) => boolean
  /** 外部取消信号 */
  signal?: AbortSignal | undefined
}

/** 带重试地执行异步函数；外部取消（AbortError）不重试。 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const retries = options.retries ?? 1
  const retryDelayMs = options.retryDelayMs ?? 300
  const shouldRetry = options.shouldRetry ?? ((): boolean => true)

  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (isAbortError(err)) throw err
      if (attempt >= retries || !shouldRetry(err, attempt)) throw err
      await sleep(retryDelayMs, options.signal)
    }
  }
  throw lastError
}

/** `fetchJson` 配置 */
export interface FetchJsonOptions {
  /** 单次请求超时（ms）。默认 8000（§4.4）。 */
  timeoutMs?: number
  /** 额外重试次数。默认 1（§4.4「8s 超时 + 1 次重试」）。 */
  retries?: number
  /** 重试间隔（ms）。默认 300。 */
  retryDelayMs?: number
  /** 外部取消信号（组件卸载时 abort）。 */
  signal?: AbortSignal | undefined
  /** 可注入的 fetch（测试用）。 */
  fetchImpl?: FetchLike | undefined
}

/** 单次带超时的 fetch + JSON 解析（内部使用）。 */
async function fetchJsonOnce<T>(
  url: string,
  timeoutMs: number,
  externalSignal: AbortSignal | undefined,
  fetchImpl: FetchLike
): Promise<T> {
  if (externalSignal?.aborted) throw new DOMException('Aborted', 'AbortError')

  const controller = new AbortController()
  let timedOut = false
  const onExternalAbort = (): void => controller.abort()
  externalSignal?.addEventListener('abort', onExternalAbort, { once: true })

  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)

  try {
    const response = await fetchImpl(url, { signal: controller.signal })
    if (!response.ok) throw new HttpError(response.status, url)
    return (await response.json()) as T
  } catch (err) {
    if (timedOut) throw new TimeoutError(timeoutMs)
    throw err
  } finally {
    clearTimeout(timer)
    externalSignal?.removeEventListener('abort', onExternalAbort)
  }
}

/**
 * 拉取 JSON：超时 + 重试 + AbortController。
 * - 4xx 不重试（客户端错误重试无意义）；5xx / 网络错误 / 超时可重试；
 * - 外部 signal 主动取消不重试。
 */
export function fetchJson<T>(url: string, options: FetchJsonOptions = {}): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 8000
  const retries = options.retries ?? 1
  const retryDelayMs = options.retryDelayMs ?? 300
  const fetchImpl: FetchLike = options.fetchImpl ?? ((input, init) => globalThis.fetch(input, init))

  return withRetry<T>(() => fetchJsonOnce<T>(url, timeoutMs, options.signal, fetchImpl), {
    retries,
    retryDelayMs,
    signal: options.signal,
    shouldRetry: (err: unknown): boolean => {
      if (err instanceof HttpError) return err.status >= 500
      return true
    }
  })
}
