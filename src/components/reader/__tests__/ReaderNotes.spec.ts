import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import ReaderNotes from '@/components/reader/ReaderNotes.vue'
import type { Note } from '@/types/note'

const NOTE: Note = {
  id: 'n1',
  sutraId: 'x.json',
  quote: '般若',
  text: '我的理解',
  anchor: { chapterIdx: 0, paraId: 'p1', offset: 3 },
  createdAt: 1,
  updatedAt: 1
}

describe('ReaderNotes（§6.3）', () => {
  it('列出当前经书笔记并 emit jump', async () => {
    const wrapper = mount(ReaderNotes, { props: { open: true, notes: [NOTE], selection: null } })

    expect(wrapper.text()).toContain('般若')
    await wrapper.find('.notes__entry').trigger('click')
    expect(wrapper.emitted('jump')?.[0]).toEqual([NOTE])
  })

  it('无选区时提示划选；有选区时可保存笔记 → emit add', async () => {
    const noSelection = mount(ReaderNotes, { props: { open: true, notes: [], selection: null } })
    expect(noSelection.text()).toContain('划选正文中的文字')

    const selection = { text: '般若', globalId: 'x.json:0:0', offset: 3 }
    const wrapper = mount(ReaderNotes, { props: { open: true, notes: [], selection } })
    await wrapper.find('textarea').setValue('我的理解')

    const save = wrapper.findAll('button').find((node) => node.text().includes('保存笔记'))
    await save?.trigger('click')

    expect(wrapper.emitted('add')?.[0]).toEqual([
      { quote: '般若', text: '我的理解', globalId: 'x.json:0:0', offset: 3 }
    ])
  })

  it('取消选区 emit clearSelection', async () => {
    const selection = { text: '般若', globalId: 'x.json:0:0', offset: 3 }
    const wrapper = mount(ReaderNotes, { props: { open: true, notes: [], selection } })

    const cancel = wrapper.findAll('button').find((node) => node.text().includes('取消'))
    await cancel?.trigger('click')
    expect(wrapper.emitted('clearSelection')).toHaveLength(1)
  })
})
