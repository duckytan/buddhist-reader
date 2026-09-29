import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import ReaderDictSelector from '@/components/reader/ReaderDictSelector.vue'
import { dictService } from '@/services/dictService'
import { useDictStore } from '@/stores/dict'
import type { DictMeta } from '@/types/dict'

const DICTS: DictMeta[] = [
  { id: 'dict-1', name: '甲典', totalChunks: 1, entryCount: 10 },
  { id: 'dict-2', name: '乙典', totalChunks: 1, entryCount: 5 }
]

describe('ReaderDictSelector（§5 M8 即时生效）', () => {
  beforeEach(() => {
    localStorage.clear()
    dictService.clear()
    setActivePinia(createPinia())
  })

  it('列出词典并反映启用状态', () => {
    const store = useDictStore()
    store.dicts = DICTS
    store.enabledIds = ['dict-1', 'dict-2']

    const wrapper = mount(ReaderDictSelector, { props: { open: true } })

    expect(wrapper.findAll('.dict-selector__item')).toHaveLength(2)
    expect(wrapper.text()).toContain('甲典')
    const toggles = wrapper.findAll('input[type="checkbox"]')
    expect((toggles[0]?.element as HTMLInputElement).checked).toBe(true)
  })

  it('关闭词典即时生效（store 启用列表更新）并持久化', async () => {
    const store = useDictStore()
    store.dicts = DICTS
    store.enabledIds = ['dict-1', 'dict-2']

    const wrapper = mount(ReaderDictSelector, { props: { open: true } })
    await wrapper.findAll('input[type="checkbox"]')[0]?.setValue(false)

    expect(store.isEnabled('dict-1')).toBe(false)
    expect(store.enabledIds).not.toContain('dict-1')
    expect(localStorage.getItem('br-enabled-dicts')).not.toBeNull()
  })

  it('索引未加载时提示', () => {
    const wrapper = mount(ReaderDictSelector, { props: { open: true } })
    expect(wrapper.text()).toContain('词典索引尚未加载')
  })
})
