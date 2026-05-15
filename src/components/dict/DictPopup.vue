<template>
  <Transition name="slide-up">
    <div
      v-if="visible"
      class="dict-popup"
    >
      <div
        class="dict-popup__overlay"
        @click="$emit('close')"
      />
      <div class="dict-popup__panel">
        <header class="dict-popup__header">
          <h3 class="dict-popup__term">
            {{ term }}
          </h3>
          <button
            class="dict-popup__close"
            @click="$emit('close')"
          >
            &#10005;
          </button>
        </header>
        <div
          v-if="loading"
          class="dict-popup__loading"
        >
          查询中...
        </div>
        <div
          v-else-if="results.length === 0"
          class="dict-popup__empty"
        >
          暂无释义
        </div>
        <div
          v-else
          class="dict-popup__results"
        >
          <div
            v-for="r in results"
            :key="r.dictId"
            class="dict-popup__result"
          >
            <span class="dict-popup__dict-name">{{ dictName(r.dictId) }}</span>
            <p class="dict-popup__definition">
              {{ r.definition }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
defineProps({
  visible: { type: Boolean, default: false },
  term: { type: String, default: '' },
  results: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false }
})

defineEmits(['close'])

const dictNames = {
  'dict-1': '中国当代佛教网辞典',
  'dict-2': '新编佛教辞典',
  'dict-3': '中华佛教百科全书'
}

function dictName(id) { return dictNames[id] || id }
</script>

<style scoped>
.dict-popup { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 30; }
.dict-popup__overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.2); }
.dict-popup__panel {
  position: absolute; bottom: 0; left: 0; width: 100%;
  background: var(--color-canvas);
  border-top: 1px solid var(--color-hairline);
  border-radius: var(--radius-container) var(--radius-container) 0 0;
  max-height: 60vh; overflow-y: auto;
}
.dict-popup__header {
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--spacing-md);
  border-bottom: 1px solid var(--color-hairline);
}
.dict-popup__term {
  font-family: var(--font-serif);
  font-size: var(--text-h2);
  color: var(--color-accent);
}
.dict-popup__close {
  min-width: var(--touch-target); min-height: var(--touch-target);
  display: flex; align-items: center; justify-content: center;
  color: var(--color-ink-muted);
}
.dict-popup__loading, .dict-popup__empty {
  text-align: center; padding: var(--spacing-xxl); color: var(--color-ink-muted);
}
.dict-popup__results { padding: var(--spacing-md); }
.dict-popup__result {
  margin-bottom: var(--spacing-lg);
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid var(--color-hairline);
}
.dict-popup__dict-name {
  font-size: var(--text-body-sm);
  color: var(--color-ink-muted);
  display: block;
  margin-bottom: var(--spacing-xs);
}
.dict-popup__definition {
  font-size: var(--text-body-sm);
  line-height: var(--leading-sm);
  color: var(--color-ink);
  white-space: pre-wrap;
}
.slide-up-enter-active, .slide-up-leave-active { transition: opacity 0.3s, transform 0.3s; }
.slide-up-enter-from { opacity: 0; transform: translateY(100%); }
.slide-up-leave-to { opacity: 0; transform: translateY(100%); }
</style>