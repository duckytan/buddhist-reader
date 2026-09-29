import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'

import AppShell from '@/app/AppShell.vue'
import { useSettingsStore } from '@/stores/settings'
// 源码级断言：4 个 Tab 页须由 <KeepAlive> 保留状态
import appShellSource from '@/app/AppShell.vue?raw'

/** 最小测试路由：4 个 Tab 名与 AppTabBar 一致（用于验证导航对齐） */
function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'bookshelf', component: { template: '<div class="stub">书架</div>' } },
      { path: '/dict', name: 'dict', component: { template: '<div class="stub">词典</div>' } },
      { path: '/notes', name: 'notes', component: { template: '<div class="stub">笔记</div>' } },
      {
        path: '/settings',
        name: 'settings',
        component: { template: '<div class="stub">设置</div>' }
      }
    ]
  })
}

async function mountShell(): Promise<{ wrapper: ReturnType<typeof mount>; router: Router }> {
  const router = makeRouter()
  await router.push('/')
  await router.isReady()
  const wrapper = mount(AppShell, { global: { plugins: [router] } })
  await nextTick()
  return { wrapper, router }
}

describe('AppShell（§5 M15 导航 / §6.7 主题）', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('4 个 Tab 链接与路由表对齐（href 可解析）', async () => {
    const { wrapper } = await mountShell()

    const items = wrapper.findAll('a.tab-bar__item')
    expect(items).toHaveLength(4)
    expect(items.map((node) => node.attributes('href'))).toEqual(['/', '/dict', '/notes', '/settings'])
  })

  it('主题以 data-theme 声明式绑定到外壳根，随 store 即时变化（§6.7）', async () => {
    const { wrapper } = await mountShell()
    const store = useSettingsStore()

    expect(wrapper.find('.app-shell').attributes('data-theme')).toBe('paper')

    store.setTheme('eye-care')
    await nextTick()
    expect(wrapper.find('.app-shell').attributes('data-theme')).toBe('eye-care')
  })

  it('Tab 页由 <KeepAlive> 包裹（状态保持）', () => {
    expect(appShellSource).toContain('<KeepAlive>')
    expect(appShellSource).toContain('<component :is="Component" />')
  })
})
