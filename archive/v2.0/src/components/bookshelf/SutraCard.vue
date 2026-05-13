<template>
  <div class="sutra-card" @click="$emit('click')">
    <div class="sutra-card-body">
      <h3 class="sutra-card-title">{{ sutra.title }}</h3>
      <p class="sutra-card-translator" v-if="sutra.translator">
        {{ sutra.translator }}译
      </p>
      <p class="sutra-card-desc" v-if="sutra.description">
        {{ sutra.description }}
      </p>
      <div class="sutra-card-meta">
        <span class="sutra-card-chapters">{{ sutra.chapterCount }}章</span>
        <span class="sutra-card-chars">{{ sutra.totalChars }}字</span>
      </div>
      <div class="sutra-card-progress" v-if="progress">
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: `${progress.readPercentage || 0}%` }"
          />
        </div>
        <span class="progress-text">{{ Math.round(progress.readPercentage || 0) }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getServices } from '@/services/factory.js'

const props = defineProps({
  sutra: {
    type: Object,
    required: true
  }
})

defineEmits(['click'])

const progress = ref(null)

onMounted(async () => {
  const services = getServices()
  const result = await services.progress.getProgress(props.sutra.id)
  if (result.success && result.data && result.data.readPercentage > 0) {
    progress.value = result.data
  }
})
</script>

<style scoped>
.sutra-card {
  background: var(--card-bg);
  border-radius: var(--card-radius);
  border: var(--card-border);
  padding: var(--card-sutra-padding);
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
}

.sutra-card:hover {
  background: var(--card-hover-bg);
  border-color: var(--card-hover-border);
}

.sutra-card-body {
  flex: 1;
}

.sutra-card-title {
  font-family: var(--font-serif);
  font-size: var(--text-h2);
  font-weight: var(--weight-semibold);
  color: var(--color-ink);
  margin-bottom: var(--spacing-xs);
}

.sutra-card-translator {
  font-size: var(--text-body-sm);
  color: var(--color-ink-muted);
  margin-bottom: var(--spacing-sm);
}

.sutra-card-desc {
  font-size: var(--text-body-sm);
  color: var(--color-ink-subtle);
  line-height: 1.5;
  margin-bottom: var(--spacing-md);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.sutra-card-meta {
  display: flex;
  gap: var(--spacing-md);
  font-size: var(--text-caption);
  color: var(--color-ink-subtle);
}

.sutra-card-progress {
  margin-top: var(--spacing-md);
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.progress-bar {
  flex: 1;
  height: 4px;
  background: var(--color-surface);
  border-radius: var(--radius-pill);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-accent);
  border-radius: var(--radius-pill);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: var(--text-caption);
  color: var(--color-ink-muted);
  min-width: 36px;
  text-align: right;
}
</style>
