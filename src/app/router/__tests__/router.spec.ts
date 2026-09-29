import { describe, expect, it } from 'vitest'

import router from '../index'
// 源码级断言（§6.②）：确认采用 hash 历史（旧版约定：中文文件名 + hash 路由）
import routerSource from '@/app/router/index.ts?raw'

/**
 * 路由冒烟测试（T01）：验证 Vue Router 5 下 5 条路由注册正确、`:id` 参数解析正常。
 */
describe('router', () => {
  it('注册 5 条命名路由', () => {
    const names = router.getRoutes().map((route) => route.name)
    expect(names).toEqual(
      expect.arrayContaining(['bookshelf', 'dict', 'notes', 'settings', 'reader'])
    )
  })

  it('解析阅读路由的 :id 参数', () => {
    const resolved = router.resolve('/read/heart-sutra')
    expect(resolved.name).toBe('reader')
    expect(resolved.params.id).toBe('heart-sutra')
  })

  it('Tab 路由路径符合约定', () => {
    expect(router.resolve('/').name).toBe('bookshelf')
    expect(router.resolve('/dict').name).toBe('dict')
    expect(router.resolve('/notes').name).toBe('notes')
    expect(router.resolve('/settings').name).toBe('settings')
  })

  it('§6.② 中文文件名 + hash 路由：可解析且 href 带 # 前缀', () => {
    expect(routerSource).toContain('createWebHashHistory')

    const resolved = router.resolve({ name: 'reader', params: { id: '《心经》.json' } })
    // 中文文件名（含书名号与 .json）原样作为 :id 参数
    expect(resolved.params.id).toBe('《心经》.json')
    // hash 历史 → href 以 `#/` 开头（红条件：改回 createWebHistory → 无 `#` → 红）
    expect(resolved.href.startsWith('#/')).toBe(true)
  })
})
