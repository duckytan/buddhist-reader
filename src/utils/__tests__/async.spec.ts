import { describe, expect, it, vi } from 'vitest'

import {
  HttpError,
  TimeoutError,
  fetchJson,
  isAbortError,
  sleep,
  withRetry,
  withTimeout
} from '@/utils/async'
import type { FetchLike } from '@/utils/async'

/** 构造一个最小的 Response 替身（避免依赖真实网络/Response 实现） */
function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  } as unknown as Response
}

/** 「永不 resolve，除非被 abort」的 fetch，用于超时 / 取消测试 */
const hangingFetch: FetchLike = (_input, init) =>
  new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () =>
      reject(new DOMException('Aborted', 'AbortError'))
    )
  })

describe('fetchJson', () => {
  it('成功时解析并返回 JSON（仅请求一次）', async () => {
    const fetchImpl: FetchLike = vi.fn(async () => jsonResponse({ a: 1 }))
    await expect(fetchJson<{ a: number }>('/x', { fetchImpl })).resolves.toEqual({ a: 1 })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('4xx 不重试，抛 HttpError', async () => {
    const fetchImpl: FetchLike = vi.fn(async () => jsonResponse({}, 404))
    await expect(
      fetchJson('/x', { fetchImpl, retries: 3, retryDelayMs: 0 })
    ).rejects.toBeInstanceOf(HttpError)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('5xx 重试 retries+1 次后抛 HttpError', async () => {
    const fetchImpl: FetchLike = vi.fn(async () => jsonResponse({}, 503))
    await expect(
      fetchJson('/x', { fetchImpl, retries: 2, retryDelayMs: 0 })
    ).rejects.toBeInstanceOf(HttpError)
    expect(fetchImpl).toHaveBeenCalledTimes(3)
  })

  it('超时抛 TimeoutError', async () => {
    await expect(
      fetchJson('/x', { fetchImpl: hangingFetch, timeoutMs: 20, retries: 0 })
    ).rejects.toBeInstanceOf(TimeoutError)
  })

  it('外部 abort 不重试，抛 AbortError', async () => {
    const controller = new AbortController()
    const fetchImpl = vi.fn(hangingFetch)
    const promise = fetchJson('/x', {
      fetchImpl,
      timeoutMs: 1000,
      retries: 3,
      signal: controller.signal
    })
    controller.abort()
    let caught: unknown
    try {
      await promise
    } catch (err) {
      caught = err
    }
    expect(isAbortError(caught)).toBe(true)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })
})

describe('withRetry / withTimeout / sleep', () => {
  it('withRetry 在成功前重试', async () => {
    let attempts = 0
    const fn = vi.fn(async () => {
      attempts += 1
      if (attempts < 3) throw new Error('boom')
      return 'ok'
    })
    await expect(withRetry(fn, { retries: 5, retryDelayMs: 0 })).resolves.toBe('ok')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('withRetry 达到上限后抛出最后一次错误', async () => {
    const fn = vi.fn(async () => {
      throw new Error('always')
    })
    await expect(withRetry(fn, { retries: 1, retryDelayMs: 0 })).rejects.toThrow('always')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('withTimeout 超时抛 TimeoutError', async () => {
    const never = new Promise<string>(() => {})
    await expect(withTimeout(never, 10)).rejects.toBeInstanceOf(TimeoutError)
  })

  it('sleep 可被 signal 取消', async () => {
    const controller = new AbortController()
    const promise = sleep(1000, controller.signal)
    controller.abort()
    let caught: unknown
    try {
      await promise
    } catch (err) {
      caught = err
    }
    expect(isAbortError(caught)).toBe(true)
  })
})
