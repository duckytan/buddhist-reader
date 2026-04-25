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
          <van-switch v-model="showPinyin" size="20px" />
        </div>
      </section>

      <section class="settings-section">
        <h2 class="section-title">语音设置</h2>

        <div class="setting-item">
          <label class="setting-label">朗读速度</label>
          <div class="speed-control">
            <van-slider
              v-model="ttsSpeed"
              :min="0.5"
              :max="2.0"
              :step="0.1"
              active-color="#FF6B35"
            />
            <span class="speed-display">{{ ttsSpeed }}x</span>
          </div>
        </div>
      </section>

      <section class="settings-section">
        <h2 class="section-title">主题</h2>

        <div class="setting-item">
          <label class="setting-label">深色模式</label>
          <van-switch v-model="isDarkMode" size="20px" />
        </div>
      </section>

      <section class="settings-section">
        <h2 class="section-title">数据</h2>

        <button class="clear-btn" @click="handleClearCache">
          清除缓存
        </button>
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
import { computed } from 'vue'
import { Switch as VanSwitch, Slider as VanSlider, showToast } from 'vant'
import { useSettingsStore } from '@/stores/settings'
import { useThemeStore } from '@/stores/theme'
import { clearStorage } from '@/utils/storage'

const settingsStore = useSettingsStore()
const themeStore = useThemeStore()

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

  .van-slider {
    width: 150px;
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

  &:hover {
    background-color: #ffcdd2;
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
