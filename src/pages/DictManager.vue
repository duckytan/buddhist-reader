<template>
  <div class="dict-manager">
    <header class="dict-manager__header">
      <button
        class="dict-manager__back"
        @click="$router.push('/')"
      >
        <span class="dict-manager__icon">&#8592;</span>
      </button>
      <h1 class="dict-manager__title">
        词典管理
      </h1>
    </header>

    <div
      v-if="loading"
      class="dict-manager__loading"
    >
      加载中...
    </div>
    <div
      v-else-if="error"
      class="dict-manager__error"
    >
      <p>加载失败: {{ error }}</p>
      <button
        class="dict-manager__retry"
        @click="loadManifest"
      >
        重试
      </button>
    </div>

    <ul
      v-else
      class="dict-manager__list"
    >
      <li
        v-for="dict in manifest"
        :key="dict.id"
        class="dict-manager__item"
      >
        <div class="dict-manager__info">
          <h3 class="dict-manager__name">
            {{ dict.name }}
          </h3>
          <p class="dict-manager__desc">
            {{ dict.description }}
          </p>
          <div class="dict-manager__meta">
            <span class="dict-manager__author">{{ dict.author }}</span>
            <span class="dict-manager__count">{{ dict.entryCount }} 条</span>
          </div>
        </div>
        <label class="dict-manager__toggle">
          <input
            type="checkbox"
            :checked="dictStore.isDictEnabled(dict.id)"
            @change="dictStore.toggleDict(dict.id)"
          >
          <span class="dict-manager__switch" />
        </label>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useDictStore } from '../stores/dict'

const dictStore = useDictStore()
const manifest = ref([])
const loading = ref(false)
const error = ref(null)

async function loadManifest() {
  loading.value = true
  error.value = null
  try {
    const resp = await fetch(`${import.meta.env.BASE_URL}dicts/manifest.json`)
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    manifest.value = await resp.json()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

onMounted(loadManifest)
</script>

<style scoped>
.dict-manager {
  max-width: var(--max-content-width);
  margin: 0 auto; padding: var(--spacing-lg);
  min-height: 100vh; background: var(--color-canvas);
}
.dict-manager__header {
  display: flex; align-items: center;
  padding: var(--spacing-md) 0; border-bottom: 1px solid var(--color-hairline);
}
.dict-manager__back {
  min-width: var(--touch-target); min-height: var(--touch-target);
  display: flex; align-items: center; justify-content: center;
}
.dict-manager__icon { font-size: var(--text-body-lg); color: var(--color-ink-muted); }
.dict-manager__title {
  flex: 1; font-family: var(--font-serif); font-size: var(--text-h2);
  text-align: center;
}
.dict-manager__loading, .dict-manager__error {
  text-align: center; padding: var(--spacing-xxl); color: var(--color-ink-muted);
}
.dict-manager__error { color: var(--color-error); }
.dict-manager__retry {
  padding: var(--spacing-xs) var(--spacing-lg);
  background: var(--color-accent); color: var(--color-canvas);
  border-radius: var(--radius-pill);
}
.dict-manager__list { padding: var(--spacing-md) 0; }
.dict-manager__item {
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-md);
  background: var(--card-bg); border: var(--card-border);
  border-radius: var(--card-radius);
}
.dict-manager__info { flex: 1; }
.dict-manager__name {
  font-family: var(--font-serif); font-size: var(--text-h3);
  margin-bottom: var(--spacing-xs);
}
.dict-manager__desc {
  font-size: var(--text-body-sm); color: var(--color-ink-muted);
  margin-bottom: var(--spacing-xs);
}
.dict-manager__meta {
  display: flex; gap: var(--spacing-sm);
  font-size: var(--text-caption); color: var(--color-ink-subtle);
}
.dict-manager__toggle {
  position: relative; display: inline-block;
  min-width: var(--touch-target); min-height: var(--touch-target);
  cursor: pointer;
}
.dict-manager__toggle input { opacity: 0; width: 0; height: 0; }
.dict-manager__switch {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: 48px; height: 26px; background: var(--color-hairline);
  border-radius: var(--radius-pill); transition: background 0.3s;
}
.dict-manager__switch::after {
  content: ''; position: absolute; top: 3px; left: 3px;
  width: 20px; height: 20px; background: var(--color-canvas);
  border-radius: 50%; transition: transform 0.3s;
}
.dict-manager__toggle input:checked + .dict-manager__switch {
  background: var(--color-accent);
}
.dict-manager__toggle input:checked + .dict-manager__switch::after {
  transform: translateX(22px);
}
@media (max-width: 480px) {
  .dict-manager { padding: var(--spacing-sm); }
  .dict-manager__item { padding: var(--spacing-md); }
}
</style>