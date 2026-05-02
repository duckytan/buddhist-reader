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
        <p class="section-hint">点击开关控制每个词典的启用状态</p>

        <!-- 词典列表 -->
        <div class="dict-management">
          <!-- 操作按钮 -->
          <div class="dict-actions">
            <button class="dict-action-btn" @click="enableAllDicts">全部启用</button>
            <button class="dict-action-btn" @click="disableAllDicts">全部禁用</button>
          </div>

          <!-- 备份按钮 -->
          <div class="dict-backup-actions">
            <button class="dict-backup-btn" @click="handleExportDicts">
              <span class="btn-icon">📤</span>
              <span>导出备份</span>
            </button>
            <button class="dict-backup-btn" @click="triggerImportFile">
              <span class="btn-icon">📥</span>
              <span>导入恢复</span>
            </button>
            <input
              ref="importFileInput"
              type="file"
              accept=".json"
              class="hidden-input"
              @change="handleImportFile"
            />
          </div>

          <!-- 内置词典 -->
          <div v-if="builtinDict" class="dict-item">
            <div class="dict-item-info">
              <span class="dict-type-badge builtin">内置</span>
              <span class="dict-item-name">{{ builtinDict.name }}</span>
              <span class="dict-item-count">{{ builtinDict.entryCount }} 条</span>
            </div>
            <div class="dict-item-actions">
              <input
                type="color"
                :value="builtinDict.color"
                @input="setDictColor(builtinDict.id, $event.target.value)"
                class="dict-color-picker"
                title="选择高亮颜色"
              />
              <button
                class="dict-toggle"
                :class="{ active: builtinDict.enabled }"
                @click="toggleDict(builtinDict.id, !builtinDict.enabled)"
              >
                <span class="toggle-slider"></span>
              </button>
            </div>
          </div>

          <!-- 外部词典 -->
          <div v-if="dictionariesStore.externalDictLoaded">
            <div class="dict-group-title">外部词典</div>
            <div
              v-for="dict in externalDicts"
              :key="dict.id"
              class="dict-item"
            >
              <div class="dict-item-info">
                <span class="dict-type-badge external">外部</span>
                <span class="dict-item-name">{{ dict.name }}</span>
                <span class="dict-item-count">{{ dict.entryCount.toLocaleString() }} 条</span>
              </div>
              <div class="dict-item-actions">
                <input
                  type="color"
                  :value="dict.color"
                  @input="setDictColor(dict.id, $event.target.value)"
                  class="dict-color-picker"
                  title="选择高亮颜色"
                />
                <button
                  class="dict-toggle"
                  :class="{ active: dict.enabled }"
                  @click="toggleDict(dict.id, !dict.enabled)"
                >
                  <span class="toggle-slider"></span>
                </button>
              </div>
            </div>
          </div>
          <div v-else class="dict-loading">
            <span>正在加载外部词典...</span>
          </div>

          <!-- 用户自定义词典 -->
          <div v-if="userDicts.length > 0">
            <div class="dict-group-title">我的词典</div>
            <div
              v-for="dict in userDicts"
              :key="dict.id"
              class="dict-item"
            >
              <div class="dict-item-info">
                <span class="dict-type-badge user">用户</span>
                <span class="dict-item-name">{{ dict.name }}</span>
                <span class="dict-item-count">{{ dict.entryCount.toLocaleString() }} 条</span>
              </div>
              <div class="dict-item-actions">
                <input
                  type="color"
                  :value="dict.color"
                  @input="setDictColor(dict.id, $event.target.value)"
                  class="dict-color-picker"
                  title="选择高亮颜色"
                />
                <button
                  class="dict-toggle"
                  :class="{ active: dict.enabled }"
                  @click="toggleDict(dict.id, !dict.enabled)"
                >
                  <span class="toggle-slider"></span>
                </button>
                <button class="dict-remove" @click="removeUserDict(dict.userId)">×</button>
              </div>
            </div>
          </div>

          <!-- 上传区域 -->
          <div class="upload-area" @click="triggerFileUpload" @dragover.prevent @drop.prevent="handleFileDrop">
            <input
              ref="fileInput"
              type="file"
              accept=".json,.mdx"
              class="hidden-input"
              @change="handleFileSelect"
            />
            <span class="upload-icon">📚</span>
            <span class="upload-text">点击或拖拽上传 .mdx 或 .json 词典文件</span>
          </div>

          <div class="dict-help">
            <p>支持格式：.mdx（直接解析）或 .json（需转换）</p>
            <p>词典数据保存在浏览器本地，下次访问自动加载</p>
          </div>
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
const importFileInput = ref(null)

// 词典导入导出
const handleExportDicts = async () => {
  try {
    const count = await dictionariesStore.exportDictionaries()
    if (count > 0) {
      showToast({ type: 'success', message: `已导出 ${count} 个词典` })
    } else {
      showToast({ type: 'fail', message: '没有可导出的词典' })
    }
  } catch (e) {
    showToast({ type: 'fail', message: `导出失败：${e.message}` })
  }
}

const triggerImportFile = () => {
  importFileInput.value?.click()
}

const handleImportFile = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  try {
    showToast({ type: 'loading', message: '正在导入...', duration: 0 })
    const count = await dictionariesStore.importDictionaries(file)
    showToast({ type: 'success', message: `已导入 ${count} 个词典` })
  } catch (e) {
    showToast({ type: 'fail', message: `导入失败：${e.message}` })
  }

  event.target.value = ''
}

// 词典列表分类
const builtinDict = computed(() => 
  dictionariesStore.dictList.find(d => d.type === 'builtin')
)
const externalDicts = computed(() => 
  dictionariesStore.dictList.filter(d => d.type === 'external')
)
const userDicts = computed(() => 
  dictionariesStore.dictList.filter(d => d.type === 'user')
)

// 词典操作
const toggleDict = (dictId, enabled) => {
  dictionariesStore.toggleDict(dictId, enabled)
}

const setDictColor = (dictId, color) => {
  dictionariesStore.setDictColor(dictId, color)
}

const enableAllDicts = () => {
  dictionariesStore.enableAllDicts()
}

const disableAllDicts = () => {
  dictionariesStore.disableAllDicts()
}

const removeUserDict = async (userId) => {
  try {
    await dictionariesStore.removeUserDictionary(userId)
    showToast('已删除词典')
  } catch (e) {
    showToast({ type: 'fail', message: '删除失败' })
  }
}

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
  const isMDX = file.name.toLowerCase().endsWith('.mdx')
  const isJSON = file.name.toLowerCase().endsWith('.json')

  if (!isMDX && !isJSON) {
    showToast('请上传 .mdx 或 .json 格式的词典文件')
    return
  }

  try {
    showToast({ type: 'loading', message: '正在导入词典...', duration: 0 })

    let result

    if (isMDX) {
      // 直接解析 MDX 文件
      const { parseMDX } = await import('@/utils/mdxParser')
      const entries = await parseMDX(file)
      result = await dictionariesStore.uploadUserDictionary(
        new File([JSON.stringify(entries)], file.name.replace('.mdx', '.json'), { type: 'application/json' }),
        () => {},
        file.name.replace(/\.mdx$/i, '')
      )
    } else {
      // 上传 JSON 文件
      result = await dictionariesStore.uploadUserDictionary(file)
    }

    showToast({ type: 'success', message: `已导入 ${result.entryCount.toLocaleString()} 条词条` })
  } catch (e) {
    if (e.message.includes('无法解析')) {
      showToast({
        type: 'fail',
        message: 'MDX 格式不支持，请先转换为 JSON',
        duration: 5000
      })
    } else {
      showToast({ type: 'fail', message: `导入失败：${e.message}` })
    }
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

.dict-management {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.dict-actions {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-2);

  .dict-action-btn {
    flex: 1;
    padding: var(--space-2);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background-color: var(--bg-page);
    color: var(--text-primary);
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: all var(--transition-fast);

    &:hover {
      border-color: var(--primary-color);
      color: var(--primary-color);
    }
  }
}

.dict-backup-actions {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-3);

  .dict-backup-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-1);
    padding: var(--space-2);
    border: 1px dashed var(--border-color);
    border-radius: var(--radius-md);
    background-color: var(--bg-page);
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: all var(--transition-fast);

    &:hover {
      border-color: var(--primary-color);
      color: var(--primary-color);
      background-color: rgba(255, 107, 53, 0.05);

      .btn-icon {
        transform: scale(1.1);
      }
    }

    .btn-icon {
      font-size: 16px;
      transition: transform var(--transition-fast);
    }
  }
}

.dict-group-title {
  font-size: var(--font-size-xs);
  color: var(--text-tertiary);
  margin-top: var(--space-3);
  margin-bottom: var(--space-2);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.dict-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3);
  background-color: var(--bg-page);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-2);

  .dict-item-info {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex: 1;
    min-width: 0;

    .dict-type-badge {
      padding: 2px 8px;
      border-radius: var(--radius-full);
      font-size: var(--font-size-xs);
      font-weight: 500;

      &.builtin {
        background-color: rgba(255, 107, 53, 0.15);
        color: var(--primary-color);
      }

      &.external {
        background-color: rgba(8, 145, 178, 0.15);
        color: #0891b2;
      }

      &.user {
        background-color: rgba(139, 92, 246, 0.15);
        color: #8b5cf6;
      }
    }

    .dict-item-name {
      font-size: var(--font-size-base);
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .dict-item-count {
      font-size: var(--font-size-xs);
      color: var(--text-tertiary);
      margin-left: auto;
      white-space: nowrap;
    }
  }

  .dict-item-actions {
    display: flex;
    align-items: center;
    gap: var(--space-2);

    .dict-color-picker {
      width: 28px;
      height: 28px;
      padding: 0;
      border: 2px solid var(--border-color);
      border-radius: var(--radius-full);
      cursor: pointer;
      background: none;
      overflow: hidden;

      &::-webkit-color-swatch-wrapper {
        padding: 0;
      }

      &::-webkit-color-swatch {
        border: none;
        border-radius: 50%;
      }

      &::-moz-color-swatch {
        border: none;
        border-radius: 50%;
      }

      &:hover {
        border-color: var(--primary-color);
      }
    }

    .dict-remove {
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
}

.dict-loading {
  text-align: center;
  padding: var(--space-4);
  color: var(--text-tertiary);
  font-size: var(--font-size-sm);
}

.dict-toggle {
  position: relative;
  width: 44px;
  height: 24px;
  background-color: var(--divider-color);
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: background-color var(--transition-fast);
  border: none;
  padding: 0;
  flex-shrink: 0;

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
