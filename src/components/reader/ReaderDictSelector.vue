<template>
  <Transition name="slide">
    <div
      v-if="visible"
      class="reader-dict-selector"
    >
      <div
        class="reader-dict-selector__overlay"
        @click="$emit('close')"
      />
      <div class="reader-dict-selector__panel">
        <header class="reader-dict-selector__header">
          <h3 class="reader-dict-selector__title">
            词典选择
          </h3>
          <button
            class="reader-dict-selector__close"
            @click="$emit('close')"
          >
            &#10005;
          </button>
        </header>
        <ul class="reader-dict-selector__list">
          <li
            v-for="dict in manifest"
            :key="dict.id"
            class="reader-dict-selector__item"
          >
            <div class="reader-dict-selector__info">
              <h4 class="reader-dict-selector__name">
                {{ dict.name }}
              </h4>
              <p class="reader-dict-selector__meta">
                {{ dict.author }} · {{ dict.entryCount }} 条
              </p>
            </div>
            <label class="reader-dict-selector__toggle">
              <input
                type="checkbox"
                :checked="dictStore.isDictEnabled(dict.id)"
                @change="dictStore.toggleDict(dict.id)"
              >
              <span class="reader-dict-selector__switch" />
            </label>
          </li>
        </ul>
        <button
          class="reader-dict-selector__refresh"
          @click="dictStore.triggerRefresh()"
        >
          🔄 强制刷新
        </button>
        <div class="reader-dict-selector__stats">
          已启用 {{ enabledCount }} 部词典，{{ enabledTermCount }} 个词条
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed } from 'vue'
import { useDictStore } from '../../stores/dict'

defineProps({
  visible: { type: Boolean, default: false },
  manifest: { type: Array, default: () => [] }
})

defineEmits(['close'])

const dictStore = useDictStore()

const enabledCount = computed(() => {
  return Object.values(dictStore.enabledDicts).filter(v => v).length
})

const enabledTermCount = computed(() => dictStore.enabledTerms.length)
</script>

<style scoped>
.reader-dict-selector { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 20; }
.reader-dict-selector__overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.2); }
.reader-dict-selector__panel {
  position: absolute; top: 0; right: 0; width: 300px; height: 100%;
  background: var(--color-canvas);
  border-left: 1px solid var(--color-hairline);
  overflow-y: auto;
}
.reader-dict-selector__header {
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--spacing-md); border-bottom: 1px solid var(--color-hairline);
}
.reader-dict-selector__title { font-family: var(--font-serif); font-size: var(--text-h3); }
.reader-dict-selector__close {
  min-width: var(--touch-target); min-height: var(--touch-target);
  display: flex; align-items: center; justify-content: center; color: var(--color-ink-muted);
}
.reader-dict-selector__list { padding: var(--spacing-md); }
.reader-dict-selector__item {
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--spacing-md); margin-bottom: var(--spacing-md);
  background: var(--color-surface); border-radius: var(--radius-container);
}
.reader-dict-selector__name { font-size: var(--text-body); font-weight: var(--weight-medium); }
.reader-dict-selector__meta { font-size: var(--text-caption); color: var(--color-ink-muted); }
.reader-dict-selector__toggle {
  position: relative; display: inline-block;
  min-width: var(--touch-target); min-height: var(--touch-target);
  cursor: pointer;
}
.reader-dict-selector__toggle input { opacity: 0; width: 0; height: 0; }
.reader-dict-selector__switch {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: 48px; height: 26px; background: var(--color-hairline);
  border-radius: var(--radius-pill); transition: background 0.3s;
}
.reader-dict-selector__switch::after {
  content: ''; position: absolute; top: 3px; left: 3px;
  width: 20px; height: 20px; background: var(--color-canvas);
  border-radius: 50%; transition: transform 0.3s;
}
.reader-dict-selector__toggle input:checked + .reader-dict-selector__switch {
  background: var(--color-accent);
}
.reader-dict-selector__toggle input:checked + .reader-dict-selector__switch::after {
  transform: translateX(22px);
}
.reader-dict-selector__refresh {
  display: block; width: 100%; padding: var(--spacing-md);
  background: var(--color-accent); color: var(--color-canvas);
  border: none; font-size: var(--text-body); cursor: pointer;
}
.reader-dict-selector__stats {
  padding: var(--spacing-md); text-align: center;
  font-size: var(--text-caption); color: var(--color-ink-muted);
  border-top: 1px solid var(--color-hairline);
}
.slide-enter-active, .slide-leave-active { transition: opacity 0.3s; }
.slide-enter-from, .slide-leave-to { opacity: 0; }
</style>