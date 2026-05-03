<template>
  <div class="search-bar">
    <input
      v-model="query"
      type="text"
      class="search-input"
      :placeholder="placeholder"
      @input="handleInput"
      @focus="isFocused = true"
      @blur="isFocused = false"
    />
    <button v-if="query" class="search-clear" @click="clearSearch">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
    <button v-else class="search-icon-btn">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
    </button>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: '搜索...'
  }
})

const emit = defineEmits(['update:modelValue', 'search'])

const query = ref(props.modelValue)
const isFocused = ref(false)

watch(() => props.modelValue, (val) => {
  query.value = val
})

let debounceTimer = null

function handleInput() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    emit('update:modelValue', query.value)
    emit('search', query.value)
  }, 300)
}

function clearSearch() {
  query.value = ''
  emit('update:modelValue', '')
  emit('search', '')
}
</script>

<style scoped>
.search-bar {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  height: var(--input-height);
  background: var(--color-surface);
  border-radius: var(--radius-pill);
  border: 1px solid var(--color-hairline);
  transition: border-color 0.2s ease;
}

.search-bar:focus-within {
  border-color: var(--color-accent);
}

.search-input {
  flex: 1;
  height: 100%;
  padding: 0 var(--spacing-md);
  padding-left: var(--spacing-lg);
  border: none;
  background: transparent;
  font-size: var(--text-body);
  color: var(--color-ink);
}

.search-input:focus {
  outline: none;
}

.search-input::placeholder {
  color: var(--color-ink-subtle);
}

.search-clear,
.search-icon-btn {
  width: var(--touch-target);
  height: var(--touch-target);
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--color-ink-muted);
  cursor: pointer;
  border-radius: var(--radius-pill);
}

.search-clear:hover,
.search-icon-btn:hover {
  background: var(--color-surface-soft);
  color: var(--color-accent);
}
</style>
