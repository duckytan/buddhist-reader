<template>
  <div class="dictionary-selector">
    <!-- 触发按钮 -->
    <van-popover
      v-model:show="showPopover"
      placement="bottom-end"
      :overlay="true"
      :show-arrow="false"
      theme="light"
    >
      <template #reference>
        <button class="dict-trigger">
          <span class="dict-icon">📖</span>
          <span v-if="dictLoaded" class="dict-badge">35k</span>
        </button>
      </template>

      <!-- 下拉内容 -->
      <div class="dict-panel">
        <div class="panel-header">
          <span class="panel-title">词典</span>
          <van-switch
            v-model="externalEnabled"
            size="16px"
            @change="handleToggleExternal"
          />
        </div>

        <!-- 内置词典 -->
        <div class="dict-section">
          <div class="section-title">内置词典</div>
          <div class="dict-item-simple">
            <span class="dict-name">佛教术语词典</span>
            <span class="dict-info">10 条</span>
          </div>
        </div>

        <!-- 外部词典 -->
        <div class="dict-section">
          <div class="section-title">佛教词典合集</div>
          <div v-if="isLoading" class="loading-state">
            <van-loading type="spinner" size="20px" />
            <span>正在加载...</span>
          </div>
          <div v-else-if="dictLoaded" class="dict-item-simple">
            <span class="dict-name">多词典合并版</span>
            <span class="dict-info">35,781 条</span>
          </div>
          <div v-else-if="loadError" class="error-state">
            <span>{{ loadError }}</span>
          </div>
        </div>
      </div>
    </van-popover>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useDictionariesStore } from '@/stores/dictionaries'

const dictionariesStore = useDictionariesStore()

const showPopover = ref(false)

const externalEnabled = ref(dictionariesStore.externalDictEnabled)
const isLoading = computed(() => dictionariesStore.isLoading)
const dictLoaded = computed(() => dictionariesStore.externalDictLoaded)
const loadError = computed(() => dictionariesStore.loadError)

function handleToggleExternal(enabled) {
  dictionariesStore.toggleExternalDict(enabled)
}
</script>

<style scoped lang="scss">
.dictionary-selector {
  display: inline-block;
}

.dict-trigger {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;

  .dict-icon {
    font-size: 20px;
  }

  .dict-badge {
    position: absolute;
    top: -2px;
    right: -2px;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    background-color: var(--primary-color);
    color: white;
    font-size: 10px;
    line-height: 16px;
    text-align: center;
    border-radius: 8px;
  }
}

.dict-panel {
  width: 280px;
  max-height: 70vh;
  overflow-y: auto;
  padding: var(--space-3);

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-3);
    padding-bottom: var(--space-2);
    border-bottom: 1px solid var(--border-color);

    .panel-title {
      font-size: var(--font-size-base);
      font-weight: 600;
      color: var(--text-primary);
    }
  }

  .dict-section {
    margin-bottom: var(--space-3);

    .section-title {
      font-size: var(--font-size-xs);
      color: var(--text-secondary);
      margin-bottom: var(--space-2);

      &.active {
        color: var(--primary-color);
        font-weight: 500;
      }
    }
  }

  .active-section {
    padding: var(--space-2);
    background-color: rgba(255, 107, 53, 0.08);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-3);

    .section-title {
      margin-bottom: var(--space-1);
    }
  }

  .active-dict-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .active-dict-item {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-1) 0;

    .dict-icon {
      color: var(--primary-color);
      font-weight: bold;
    }

    .dict-name {
      font-size: var(--font-size-sm);
      color: var(--text-primary);
    }
  }

  .empty-hint {
    font-size: var(--font-size-xs);
    color: var(--text-tertiary);
    text-align: center;
    padding: var(--space-2);
  }

  .dict-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);

    :deep(.van-checkbox) {
      margin-right: 0;
    }

    :deep(.van-checkbox__label) {
      flex: 1;
    }
  }

  .dict-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex: 1;

    .dict-name {
      font-size: var(--font-size-sm);
      color: var(--text-primary);
    }

    .dict-info {
      font-size: var(--font-size-xs);
      color: var(--text-tertiary);
    }
  }

  .user-dict-item {
    display: flex;
    align-items: center;

    &:hover {
      .remove-btn {
        opacity: 1;
      }
    }

    .remove-btn {
      opacity: 0;
      margin-left: var(--space-2);
      color: var(--text-tertiary);
      cursor: pointer;
      transition: opacity 0.2s;

      &:hover {
        color: var(--danger-color);
      }
    }
  }

  .upload-section {
    margin-top: var(--space-3);
    padding-top: var(--space-3);
    border-top: 1px solid var(--border-color);

    .upload-hint {
      margin-top: var(--space-2);
      font-size: var(--font-size-xs);
      color: var(--text-tertiary);
      text-align: center;
    }
  }

  .loading-state,
  .error-state {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    margin-top: var(--space-3);
    padding: var(--space-2);
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  .error-state {
    color: var(--danger-color);
  }
}
</style>
