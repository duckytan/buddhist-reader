import { describe, expect, it } from 'vitest'

import router from '../index'

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
})
