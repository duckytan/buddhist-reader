<template>
  <div class="bookshelf">
    <header class="bookshelf-header">
      <h1 class="title">般若佛经阅读器</h1>
    </header>

    <div class="bookshelf-content">
      <div class="sutra-grid">
        <BookCard
          v-for="sutra in sutras"
          :key="sutra.id"
          :sutra="sutra"
          @click="handleSutraClick(sutra)"
        />
      </div>
    </div>

    <nav class="bottom-nav">
      <router-link to="/" class="nav-item active">
        <span class="nav-icon">📚</span>
        <span class="nav-text">书架</span>
      </router-link>
      <router-link to="/settings" class="nav-item">
        <span class="nav-icon">⚙️</span>
        <span class="nav-text">设置</span>
      </router-link>
    </nav>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import BookCard from '@/components/BookCard.vue'
import { sutras } from '@/data/sutras'

const router = useRouter()

const handleSutraClick = (sutra) => {
  router.push(`/reader/${sutra.id}`)
}
</script>

<style scoped lang="scss">
.bookshelf {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.bookshelf-header {
  padding: var(--space-6);
  background-color: var(--bg-card);
  box-shadow: var(--shadow-sm);

  .title {
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
  }
}

.bookshelf-content {
  flex: 1;
  padding: var(--space-4);
}

.sutra-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);

  @media (max-width: 767px) {
    grid-template-columns: 1fr;
  }

  @media (min-width: 768px) and (max-width: 1023px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }
}

.bottom-nav {
  display: flex;
  justify-content: space-around;
  padding: var(--space-4) 0;
  background-color: var(--bg-card);
  border-top: 1px solid var(--border-color);
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;

  @media (min-width: 768px) and (max-width: 1023px) {
    position: static;
  }

  .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
    color: var(--text-secondary);
    text-decoration: none;
    padding: var(--space-2);
    border-radius: var(--radius-md);
    transition: color var(--transition-fast);

    &.active,
    &:hover {
      color: var(--primary-color);
    }

    .nav-icon {
      font-size: 24px;
    }

    .nav-text {
      font-size: var(--font-size-xs);
    }
  }
}
</style>
