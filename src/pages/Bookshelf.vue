<template>
  <div class="bookshelf">
    <header class="bookshelf-header">
      <h1 class="title">般若佛经阅读器</h1>
      <div class="header-actions">
        <button class="add-btn" @click="handleAddSutra">
          <span>+</span>
          <span>添加经文</span>
        </button>
      </div>
    </header>

    <div class="bookshelf-content">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-container">
        <div class="loading-spinner">📖</div>
        <p>加载中...</p>
      </div>

      <!-- 经文列表 -->
      <div v-else class="sutra-grid">
        <BookCard
          v-for="sutra in allSutras"
          :key="sutra.id"
          :sutra="sutra"
          @click="handleSutraClick(sutra)"
        />
      </div>

      <!-- 空状态 -->
      <div v-if="!loading && allSutras.length === 0" class="empty-state">
        <p>暂无经文，点击"添加经文"按钮添加</p>
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
import { dynamicSutras } from '@/data/sutras-config'
import { createDynamicSutra } from '@/utils/sutra-loader'

const router = useRouter()
const loading = ref(false)

// 混合静态和动态经文
const allSutras = ref([])

// 动态加载所有配置的经文
const loadAllDynamicSutras = async () => {
  try {
    loading.value = true
    const loadedSutras = []

    // 先添加静态经文
    loadedSutras.push(...sutras)

    // 再加载动态经文
    for (const config of dynamicSutras) {
      try {
        const sutra = await createDynamicSutra(config)
        loadedSutras.push(sutra)
      } catch (error) {
        console.error(`Failed to load sutra ${config.id}:`, error)
      }
    }

    allSutras.value = loadedSutras
  } catch (error) {
    console.error('Failed to load sutras:', error)
  } finally {
    loading.value = false
  }
}

const handleSutraClick = (sutra) => {
  router.push(`/reader/${sutra.id}`)
}

const handleAddSutra = () => {
  // 这里可以添加一个简单的提示
  alert('添加经文功能：\n\n1. 将 TXT 文件放到 public/sutras/ 目录\n2. 在 src/pages/Reader.vue 的 dynamicSutraConfigs 中配置\n3. 刷新页面即可看到新经文\n\n详细说明请查看 docs/DYNAMIC_SUTRA_LOADING.md')
}

onMounted(() => {
  loadAllDynamicSutras()
})
</script>

<style scoped lang="scss">
.bookshelf {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.bookshelf-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-6);
  background-color: var(--bg-card);
  box-shadow: var(--shadow-sm);

  .title {
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
    margin: 0;
  }

  .header-actions {
    display: flex;
    gap: var(--space-3);
  }

  .add-btn {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    background-color: var(--primary-color);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: background-color var(--transition-fast);

    &:hover {
      background-color: #e55a2b;
    }

    span:first-child {
      font-size: 20px;
      font-weight: bold;
    }
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

.loading-container,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  text-align: center;
  color: var(--text-hint);
}

.loading-spinner {
  font-size: 48px;
  animation: spin 1s linear infinite;
  margin-bottom: var(--space-4);
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
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
