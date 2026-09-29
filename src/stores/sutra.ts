/**
 * 经书 store（方案 §6.8）。
 *
 * 职责边界（§6.8）：**经书列表、当前经书、分类筛选**。
 * ❌ 禁止：UI 状态（面板开关等）、词典数据。
 *
 * 说明：大对象 `current`（含全部章节段落）用 `shallowRef`——避免深层响应式代理
 * 大嵌套对象（方案 §6.⑤）；`loading`/`error` 等**异步 UI 态不落在 store**，
 * 由 composable（`useSutraLoader`，T06）持有（§6.8「❌ UI 状态」）。
 */

import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'

import { sutraService } from '@/services/sutraService'
import type { Sutra, SutraCategory, SutraMeta } from '@/types/sutra'

/** 分类筛选项：`all` 或具体分类 */
export type CategoryFilter = SutraCategory | 'all'

export const useSutraStore = defineStore('sutra', () => {
  /** 书架清单 */
  const manifest = ref<SutraMeta[]>([])
  /** 当前打开的经书（shallowRef：大对象不深代理） */
  const current = shallowRef<Sutra | null>(null)
  /** 分类筛选 */
  const category = ref<CategoryFilter>('all')

  /** 按分类过滤后的清单 */
  const filtered = computed<SutraMeta[]>(() => {
    if (category.value === 'all') return manifest.value
    return manifest.value.filter((meta) => meta.category === category.value)
  })

  /** 加载书架清单 */
  async function loadManifest(force = false): Promise<SutraMeta[]> {
    const list = await sutraService.loadManifest(force)
    manifest.value = list
    return list
  }

  /** 打开某经（`sutraId` = 文件名），成功则设为当前经书 */
  async function openSutra(sutraId: string): Promise<Sutra> {
    const sutra = await sutraService.loadSutra(sutraId)
    current.value = sutra
    return sutra
  }

  /** 设置分类筛选 */
  function setCategory(next: CategoryFilter): void {
    category.value = next
  }

  /** 关闭当前经书 */
  function closeSutra(): void {
    current.value = null
  }

  return { manifest, current, category, filtered, loadManifest, openSutra, setCategory, closeSutra }
})
