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
        <button class="dict-trigger" @click="handleTriggerClick">
          <span class="dict-icon">📖</span>
          <span v-if="enabledCount > 0" class="dict-badge">{{ enabledCount }}</span>
        </button>
      </template>

      <!-- 下拉内容 -->
      <div class="dict-panel">
        <!-- Header -->
        <div class="panel-header">
          <span class="panel-title">词典</span>
          <van-switch
            v-model="dictEnabled"
            size="16px"
            @change="handleToggleAll"
          />
        </div>

        <!-- 当前启用的词典 -->
        <div v-if="enabledDicts.length > 0" class="dict-section active-section">
          <div class="section-title active">
            <span class="section-label">已启用 ({{ enabledDicts.length }})</span>
          </div>
          <div class="active-dict-list">
            <div
              v-for="dict in enabledDicts"
              :key="dict.id"
              class="active-dict-item"
            >
              <span class="dict-icon">✓</span>
              <span class="dict-name">{{ dict.name }}</span>
            </div>
          </div>
        </div>

        <!-- 预置词典列表 -->
        <div class="dict-section">
          <div class="section-title">预置词典</div>
          <div class="dict-list">
            <van-checkbox
              v-for="dict in presetDicts"
              :key="dict.id"
              :model-value="isDictEnabled(dict.id)"
              shape="square"
              @change="() => toggleDict(dict.id)"
            >
              <div class="dict-item">
                <span class="dict-name">{{ dict.name }}</span>
                <span class="dict-info">{{ formatWordCount(dict.wordCount) }}</span>
              </div>
            </van-checkbox>
          </div>
          <div v-if="presetDicts.length === 0 && !isLoading" class="empty-hint">
            暂无比丘词典
          </div>
        </div>

        <!-- 已加载的用户词典 -->
        <div v-if="userDicts.length > 0" class="dict-section">
          <div class="section-title">已添加</div>
          <div class="dict-list">
            <div
              v-for="dict in userDicts"
              :key="dict.id"
              class="user-dict-item"
            >
              <van-checkbox
                :model-value="isDictEnabled(dict.id)"
                shape="square"
                @change="() => toggleDict(dict.id)"
              >
                <div class="dict-item">
                  <span class="dict-name">{{ dict.name }}</span>
                  <span class="dict-info">{{ formatWordCount(dict.wordCount) }}</span>
                </div>
              </van-checkbox>
              <van-icon
                name="cross"
                class="remove-btn"
                @click.stop="handleRemoveUserDict(dict.id)"
              />
            </div>
          </div>
        </div>

        <!-- 上传按钮 -->
        <div class="upload-section">
          <van-uploader
            :after-read="handleFileUpload"
            :max-size="100 * 1024 * 1024"
            accept=".mdx"
            @oversize="handleOversize"
          >
            <van-button
              icon="plus"
              type="primary"
              plain
              size="small"
              :loading="isUploading"
            >
              添加 MDX 词典
            </van-button>
          </van-uploader>
          <div class="upload-hint">支持 .mdx 文件，最大 100MB</div>
        </div>

        <!-- 加载状态 -->
        <div v-if="isLoading" class="loading-state">
          <van-loading type="spinner" size="20px" />
          <span>正在加载词典...</span>
        </div>

        <!-- 错误提示 -->
        <div v-if="loadError" class="error-state">
          <van-icon name="warning-o" />
          <span>{{ loadError }}</span>
        </div>
      </div>
    </van-popover>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import { useDictionariesStore } from '@/stores/dictionaries'

const dictionariesStore = useDictionariesStore()

// 本地状态
const showPopover = ref(false)
const dictEnabled = ref(true)
const isUploading = ref(false)

// 从 store 获取数据
const presetDicts = computed(() => dictionariesStore.presetDicts)
const userDicts = computed(() => dictionariesStore.userDicts)
const enabledDicts = computed(() => dictionariesStore.enabledDicts)
const enabledCount = computed(() => dictionariesStore.enabledCount)
const isLoading = computed(() => dictionariesStore.isLoading)
const loadError = computed(() => dictionariesStore.loadError)

// 方法
function isDictEnabled(id) {
  return dictionariesStore.isDictEnabled(id)
}

function toggleDict(id) {
  dictionariesStore.toggleDict(id)
}

function formatWordCount(count) {
  if (!count) return ''
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}万词`
  }
  return `${count}词`
}

function handleTriggerClick() {
  // 首次点击时初始化预置词典
  if (!dictionariesStore.isInitialized) {
    dictionariesStore.initPresetDicts()
  }
}

function handleToggleAll(enabled) {
  dictionariesStore.toggleAllPresetDicts(enabled)
}

async function handleFileUpload(file) {
  isUploading.value = true

  try {
    // 尝试在同一目录查找同名 .mdd 文件
    const mddFileName = file.file.name.replace(/\.mdx$/i, '.mdd')
    let mddFile = null

    // 注意：由于浏览器安全限制，无法自动读取同名文件
    // 用户需要手动选择 MDD 文件（如果需要）

    await dictionariesStore.loadUserDict(file.file, mddFile)
    showToast('词典加载成功')
  } catch (e) {
    showToast(e.message || '加载失败')
  } finally {
    isUploading.value = false
  }
}

function handleOversize() {
  showToast('文件大小不能超过 100MB')
}

async function handleRemoveUserDict(id) {
  try {
    await showConfirmDialog({
      title: '移除词典',
      message: '确定要移除这个词典吗？'
    })
    dictionariesStore.removeUserDict(id)
  } catch (e) {
    // 用户取消
  }
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
