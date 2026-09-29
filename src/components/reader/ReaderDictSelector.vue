<template>
  <BaseSheet
    :open="open"
    title="词典"
    @close="emit('close')"
  >
    <div class="dict-selector">
      <ul
        v-if="dicts.length > 0"
        class="dict-selector__list"
      >
        <li
          v-for="dict in dicts"
          :key="dict.id"
          class="dict-selector__item"
        >
          <label class="dict-selector__row">
            <input
              type="checkbox"
              class="dict-selector__toggle"
              :checked="isEnabled(dict.id)"
              :aria-label="`启用《${dict.name}》`"
              @change="onToggle(dict.id, $event)"
            >
            <span class="dict-selector__name">{{ dict.name }}</span>
            <span class="dict-selector__count">{{ dict.entryCount }} 条</span>
          </label>
        </li>
      </ul>
      <p
        v-else
        class="dict-selector__hint"
      >
        词典索引尚未加载
      </p>
    </div>
  </BaseSheet>
</template>

<script setup lang="ts">
/* global Event, HTMLInputElement */
/**
 * 词典开关（方案 §5 M8）。
 *
 * 开关状态经 `dict` store 持久化；**关闭后该词典不再参与高亮与查询且即时生效**——
 * `ReaderView` 监听 `dict` store 的 `enabledIds`，变化即重算术语词表 → Trie 重建 →
 * 高亮与查词即时更新（无需重挂载）。
 */

import { computed } from 'vue'

import BaseSheet from '@/components/common/BaseSheet.vue'
import { useDictStore } from '@/stores/dict'

interface Props {
  /** 是否展开 */
  open: boolean
}

defineProps<Props>()

const emit = defineEmits<{ close: [] }>()

const store = useDictStore()
const dicts = computed(() => store.dicts)

function isEnabled(dictId: string): boolean {
  return store.isEnabled(dictId)
}

function onToggle(dictId: string, event: Event): void {
  const target = event.target as HTMLInputElement | null
  store.setEnabled(dictId, target?.checked ?? false)
}
</script>

<style scoped>
.dict-selector__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.dict-selector__item {
  border-bottom: 1px solid var(--color-hairline);
}

.dict-selector__item:last-child {
  border-bottom: none;
}

.dict-selector__row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  min-height: var(--touch-target);
  padding: var(--spacing-sm) var(--spacing-xs);
  cursor: pointer;
}

.dict-selector__toggle {
  width: 20px;
  height: 20px;
  accent-color: var(--color-accent);
}

.dict-selector__name {
  flex: 1;
  color: var(--color-ink);
  font-size: var(--text-body-sm);
}

.dict-selector__count {
  color: var(--color-ink-subtle);
  font-size: var(--text-caption);
}

.dict-selector__hint {
  color: var(--color-ink-subtle);
  font-size: var(--text-body-sm);
  text-align: center;
}
</style>
