<template>
  <div class="stats">
    <header class="stats-header">
      <button class="back-btn" @click="router.push('/')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 12H5" />
          <path d="M12 19l-7-7 7-7" />
        </svg>
      </button>
      <h1 class="stats-title">功德</h1>
      <div class="stats-spacer" />
    </header>

    <div class="stats-merit">
      <div class="merit-badge">{{ statsStore.meritTitle }}</div>
      <p class="merit-streak">连续诵读 {{ statsStore.streakDays }} 天</p>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <span class="stat-value">{{ statsStore.totalReadCount }}</span>
        <span class="stat-label">诵读次数</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ statsStore.totalReadChars }}</span>
        <span class="stat-label">诵读字数</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ statsStore.formatDuration(statsStore.totalReadMinutes * 60) }}</span>
        <span class="stat-label">诵读时长</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ statsStore.summary.totalSutras }}</span>
        <span class="stat-label">经书数量</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStatsStore } from '@/stores/stats'

const router = useRouter()
const statsStore = useStatsStore()

onMounted(() => {
  statsStore.loadStats()
})
</script>

<style scoped>
.stats {
  max-width: 680px;
  margin: 0 auto;
  padding: var(--spacing-xl) var(--spacing-lg);
}

.stats-header {
  display: flex;
  align-items: center;
  margin-bottom: var(--spacing-xl);
}

.back-btn {
  width: var(--touch-target);
  height: var(--touch-target);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-pill);
  color: var(--color-ink);
  background: transparent;
  cursor: pointer;
}

.back-btn:hover {
  background: var(--color-surface);
}

.stats-title {
  font-family: var(--font-serif);
  font-size: var(--text-h1);
  font-weight: var(--weight-semibold);
  color: var(--color-ink);
  flex: 1;
  text-align: center;
}

.stats-spacer {
  width: var(--touch-target);
}

.stats-merit {
  text-align: center;
  padding: var(--spacing-xxl);
  background: var(--color-surface);
  border-radius: var(--radius-container);
  margin-bottom: var(--spacing-xl);
}

.merit-badge {
  display: inline-block;
  padding: var(--spacing-sm) var(--spacing-xl);
  background: var(--color-accent);
  color: var(--color-canvas);
  border-radius: var(--radius-pill);
  font-family: var(--font-serif);
  font-size: var(--text-h2);
  font-weight: var(--weight-semibold);
}

.merit-streak {
  margin-top: var(--spacing-md);
  font-size: var(--text-body);
  color: var(--color-ink-muted);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-md);
}

.stat-card {
  padding: var(--spacing-lg);
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-container);
  text-align: center;
}

.stat-value {
  display: block;
  font-size: var(--text-h2);
  font-weight: var(--weight-semibold);
  color: var(--color-accent);
  margin-bottom: var(--spacing-xs);
}

.stat-label {
  font-size: var(--text-body-sm);
  color: var(--color-ink-subtle);
}
</style>
