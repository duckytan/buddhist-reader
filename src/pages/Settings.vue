<template>
  <div class="settings">
    <header class="settings-header">
      <h1 class="title">设置</h1>
    </header>

    <div class="settings-content">
      <section class="settings-section">
        <h2 class="section-title">阅读设置</h2>

        <div class="setting-item">
          <label class="setting-label">字体大小</label>
          <div class="font-size-control">
            <button @click="decreaseFontSize" class="font-btn">-</button>
            <span class="font-size-display">{{ fontSize }}px</span>
            <button @click="increaseFontSize" class="font-btn">+</button>
          </div>
        </div>

        <div class="setting-item">
          <label class="setting-label">显示拼音</label>
          <button
            class="toggle-btn"
            :class="{ active: showPinyin }"
            @click="showPinyin = !showPinyin"
          >
            <span class="toggle-slider"></span>
          </button>
        </div>
      </section>

      <section class="settings-section">
        <h2 class="section-title">语音设置</h2>

        <div class="setting-item">
          <label class="setting-label">朗读速度</label>
          <div class="speed-control">
            <input
              type="range"
              v-model.number="ttsSpeed"
              min="0.5"
              max="2.0"
              step="0.1"
              class="speed-slider"
            />
            <span class="speed-display">{{ ttsSpeed }}x</span>
          </div>
        </div>
      </section>

      <section class="settings-section">
        <h2 class="section-title">主题</h2>

        <div class="setting-item">
          <label class="setting-label">深色模式</label>
          <button
            class="toggle-btn"
            :class="{ active: isDarkMode }"
            @click="isDarkMode = !isDarkMode"
          >
            <span class="toggle-slider"></span>
          </button>
        </div>
      </section>

      <section class="settings-section">
        <h2 class="section-title">数据</h2>

        <button class="clear-btn" @click="handleClearCache">
          清除缓存
        </button>
      </section>

      <section class="settings-section" v-if="ignoredTermsStore.getAll().length > 0">
        <h2 class="section-title">忽略的词条</h2>
        <p class="section-hint">点击 × 移除忽略，恢复高亮</p>
        <div class="ignored-list">
          <span
            v-for="term in ignoredTermsStore.getAll()"
            :key="term"
            class="ignored-tag"
          >
            {{ term }}
            <button @click="removeIgnored(term)" class="remove-btn">×</button>
          </span>
        </div>
        <button class="clear-btn" @click="handleClearIgnored">
          清除全部忽略
        </button>
      </section>

      <section class="settings-section">
        <h2 class="section-title">词典管理</h2>
        <p class="section-hint">上传 JSON 格式的自定义词典文件</p>
        
        <div class="upload-area" @click="triggerFileUpload" @dragover.prevent @drop.prevent="handleFileDrop">
          <input
            ref="fileInput"
            type="file"
            accept=".json"
            class="hidden-input"
            @change="handleFileSelect"
          />
          <span class="upload-icon">📚</span>
          <span class="upload-text">点击或拖拽上传词典 JSON 文件</span>
        </div>

        <div v-if="dictionariesStore.userDictList.length > 0" class="user-dict-list">
          <div
            v-for="dict in dictionariesStore.userDictList"
            :key="dict.id"
            class="user-dict-item"
          >
            <div class="user-dict-info">
              <span class="user-dict-name">{{ dict.name }}</span>
              <span class="user-dict-count">{{ dict.entries.length }} 条</span>
            </div>
            <button @click="removeUserDict(dict.id)" class="user-dict-remove">×</button>
          </div>
        </div>

        <div class="dict-help">
          <p>💡 提示：MDX 词典需先转换为 JSON 格式</p>
          <p class="dict-help-code">python scripts/convert-mdx-to-json.py dict.mdx</p>
        </div>
      </section>
    </div>

    <nav class="bottom-nav">
      <router-link to="/" class="nav-item">
        <span class="nav-icon">📚</span>
        <span class="nav-text">书架</span>
      </router-link>
      <router-link to="/settings" class="nav-item active">
        <span class="nav-icon">⚙️</span>
        <span class="nav-text">设置</span>
      </router-link>
    </nav>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { showToast } from 'vant'
import { useSettingsStore } from '@/stores/settings'
import { useThemeStore } from '@/stores/theme'
import { useIgnoredTermsStore } from '@/stores/ignoredTerms'
import { useDictionariesStore } from '@/stores/dictionaries'
import { clearStorage } from '@/utils/storage'

const settingsStore = useSettingsStore()
const themeStore = useThemeStore()
const ignoredTermsStore = useIgnoredTermsStore()
const dictionariesStore = useDictionariesStore()
const fileInput = ref(null)

const fontSize = computed({
  get: () => settingsStore.fontSize,
  set: (val) => settingsStore.setFontSize(val)
})

const showPinyin = computed({
  get: () => settingsStore.showPinyin,
  set: (val) => settingsStore.setShowPinyin(val)
})

const ttsSpeed = computed({
  get: () => settingsStore.ttsSpeed,
  set: (val) => settingsStore.setTtsSpeed(val)
})

const isDarkMode = computed({
  get: () => themeStore.isDarkMode,
  set: (val) => themeStore.setDarkMode(val)
})

const increaseFontSize = () => {
  if (fontSize.value < 28) {
    fontSize.value += 2
  }
}

const decreaseFontSize = () => {
  if (fontSize.value > 14) {
    fontSize.value -= 2
  }
}

const handleClearCache = () => {
  clearStorage()
  showToast('缓存已清除')
}

const removeIgnored = (term) => {
  ignoredTermsStore.removeIgnoredTerm(term)
  showToast('已恢复高亮')
}

const handleClearIgnored = () => {
  ignoredTermsStore.clearAll()
  showToast('已清除全部忽略')
}

const triggerFileUpload = () => {
  fileInput.value?.click()
}

const handleFileSelect = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  await uploadDictionary(file)
  // Reset input so same file can be selected again
  event.target.value = ''
}

const handleFileDrop = async (event) => {
  const file = event.dataTransfer?.files?.[0]
  if (!file) return
  await uploadDictionary(file)
}

const uploadDictionary = async (file) => {
  if (!file.name.endsWith('.json')) {
    showToast('请上传 JSON 格式的词典文件')
    return
  }

  try {
    showToast({ type: 'loading', message: '正在导入词典...', duration: 0 })
    const result = await dictionariesStore.uploadUserDictionary(file)
    showToast({ type: 'success', message: `已导入 ${result.entryCount.toLocaleString()} 条词条` })
  } catch (e) {
    showToast({ type: 'fail', message: `导入失败：${e.message}` })
  }
}

const removeUserDict = async (id) => {
  try {
    await dictionariesStore.removeUserDictionary(id)
    showToast('已删除词典')
  } catch (e) {
    showToast({ type: 'fail', message: '删除失败' })
  }
}
</script>

<style scoped lang="scss">
.settings {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-page);
}

.settings-header {
  padding: var(--space-6);
  background-color: var(--bg-card);
  box-shadow: var(--shadow-sm);

  .title {
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-semibold);
    color: var(--text-primary);
  }
}

.settings-content {
  flex: 1;
  padding: var(--space-4);
}

.settings-section {
  background-color: var(--bg-card);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  margin-bottom: var(--space-4);

  .section-title {
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-medium);
    color: var(--text-primary);
    margin-bottom: var(--space-4);
    padding-bottom: var(--space-2);
    border-bottom: 1px solid var(--divider-color);
  }
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) 0;

  .setting-label {
    font-size: var(--font-size-base);
    color: var(--text-primary);
  }
}

.font-size-control,
.speed-control {
  display: flex;
  align-items: center;
  gap: var(--space-3);

  .font-btn {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-md);
    background-color: var(--bg-page);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    font-size: var(--font-size-xl);
    transition: all var(--transition-fast);
    cursor: pointer;

    &:hover {
      background-color: var(--highlight-bg);
      border-color: var(--primary-color);
    }
  }

  .font-size-display,
  .speed-display {
    min-width: 50px;
    text-align: center;
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  .speed-slider {
    width: 150px;
    height: 4px;
    appearance: none;
    background: var(--divider-color);
    border-radius: 2px;
    outline: none;

    &::-webkit-slider-thumb {
      appearance: none;
      width: 20px;
      height: 20px;
      background: var(--primary-color);
      border-radius: 50%;
      cursor: pointer;
      transition: transform var(--transition-fast);

      &:hover {
        transform: scale(1.1);
      }
    }

    &::-moz-range-thumb {
      width: 20px;
      height: 20px;
      background: var(--primary-color);
      border-radius: 50%;
      cursor: pointer;
      border: none;
    }
  }
}

.toggle-btn {
  position: relative;
  width: 44px;
  height: 24px;
  background-color: var(--divider-color);
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: background-color var(--transition-fast);
  border: none;
  padding: 0;

  &.active {
    background-color: var(--primary-color);
  }

  .toggle-slider {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 20px;
    height: 20px;
    background-color: white;
    border-radius: 50%;
    transition: transform var(--transition-fast);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  &.active .toggle-slider {
    transform: translateX(20px);
  }
}

.clear-btn {
  width: 100%;
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background-color: #ffebee;
  color: #c62828;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  transition: background-color var(--transition-fast);
  border: none;
  cursor: pointer;

  &:hover {
    background-color: #ffcdd2;
  }
}

.section-hint {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-bottom: var(--space-3);
}

.ignored-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.ignored-tag {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  background-color: var(--highlight-bg);
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  color: var(--text-primary);

  .remove-btn {
    background: none;
    border: none;
    color: var(--text-hint);
    cursor: pointer;
    padding: 0 2px;
    font-size: var(--font-size-lg);
    line-height: 1;

    &:hover {
      color: #c62828;
    }
  }
}

.upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-6);
  border: 2px dashed var(--border-color);
  border-radius: var(--radius-md);
  background-color: var(--bg-page);
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover {
    border-color: var(--primary-color);
    background-color: rgba(255, 107, 53, 0.05);
  }

  .upload-icon {
    font-size: 32px;
  }

  .upload-text {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }
}

.hidden-input {
  display: none;
}

.user-dict-list {
  margin-top: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.user-dict-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3);
  background-color: var(--bg-page);
  border-radius: var(--radius-md);

  .user-dict-info {
    display: flex;
    align-items: center;
    gap: var(--space-2);

    .user-dict-name {
      font-size: var(--font-size-base);
      color: var(--text-primary);
    }

    .user-dict-count {
      font-size: var(--font-size-xs);
      color: var(--text-tertiary);
      background-color: var(--highlight-bg);
      padding: 2px 8px;
      border-radius: var(--radius-full);
    }
  }

  .user-dict-remove {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    color: var(--text-hint);
    font-size: var(--font-size-lg);
    cursor: pointer;
    border-radius: var(--radius-full);
    transition: all var(--transition-fast);

    &:hover {
      background-color: #ffebee;
      color: #c62828;
    }
  }
}

.dict-help {
  margin-top: var(--space-3);
  padding: var(--space-3);
  background-color: rgba(8, 145, 178, 0.08);
  border-radius: var(--radius-md);
  font-size: var(--font-size-xs);
  color: var(--text-secondary);

  p {
    margin: 0;
    line-height: 1.5;
  }

  .dict-help-code {
    font-family: monospace;
    color: var(--primary-color);
    margin-top: var(--space-1);
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
