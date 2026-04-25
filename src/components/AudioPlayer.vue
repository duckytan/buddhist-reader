<template>
  <div class="audio-player">
    <div class="player-controls">
      <button
        class="control-btn"
        :class="{ playing: isPlaying }"
        @click="togglePlay"
      >
        <span class="btn-icon">{{ isPlaying ? '⏸️' : '▶️' }}</span>
      </button>

      <button class="control-btn" @click="handleStop">
        <span class="btn-icon">⏹️</span>
      </button>
    </div>

    <div class="player-info">
      <span class="status-text">{{ statusText }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { TTSEngine } from '@/utils/tts'
import { useSettingsStore } from '@/stores/settings'

const props = defineProps({
  text: {
    type: String,
    default: ''
  }
})

const settingsStore = useSettingsStore()

const ttsEngine = ref(null)
const isPlaying = ref(false)
const statusText = ref('准备就绪')

const initTTSEngine = () => {
  ttsEngine.value = new TTSEngine({
    rate: settingsStore.ttsSpeed,
    lang: 'zh-CN'
  })

  // 监听 TTS 状态变化
  ttsEngine.value.onStatusChange = (status) => {
    updateStatus(status)
  }
}

const updateStatus = (status) => {
  const statusMap = {
    idle: '准备就绪',
    playing: '正在朗读...',
    paused: '已暂停',
    error: '朗读失败'
  }
  statusText.value = statusMap[status] || '未知状态'
  isPlaying.value = status === 'playing'
}

const togglePlay = () => {
  if (!ttsEngine.value) return

  if (isPlaying.value) {
    ttsEngine.value.pause()
  } else {
    if (ttsEngine.value.getStatus() === 'idle' && props.text) {
      ttsEngine.value.speak(props.text)
    } else {
      ttsEngine.value.resume()
    }
  }
}

const handleStop = () => {
  if (ttsEngine.value) {
    ttsEngine.value.stop()
  }
}

// 监听朗读速度变化
watch(() => settingsStore.ttsSpeed, (newSpeed) => {
  if (ttsEngine.value) {
    ttsEngine.value.setRate(newSpeed)
  }
})

onMounted(() => {
  initTTSEngine()
})

onBeforeUnmount(() => {
  if (ttsEngine.value) {
    ttsEngine.value.stop()
  }
})
</script>

<style scoped lang="scss">
.audio-player {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4);
  background-color: var(--bg-card);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}

.player-controls {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.control-btn {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  background-color: var(--highlight-bg);
  transition: all var(--transition-fast);

  &:hover {
    background-color: var(--primary-color);
    color: white;
  }

  &.playing {
    background-color: var(--primary-color);
    color: white;
  }

  .btn-icon {
    font-size: 24px;
  }
}

.player-info {
  flex: 1;

  .status-text {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }
}
</style>
