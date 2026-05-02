<template>
  <div class="jump-control">
    <div class="jump-input">
      <span class="label">跳转到</span>
      <input
        v-model="inputValue"
        type="number"
        min="0"
        max="100"
        class="percentage-input"
        @keyup.enter="handleJump"
      />
      <span class="unit">%</span>
    </div>
    
    <div class="quick-jumps">
      <button
        v-for="percent in quickJumps"
        :key="percent"
        class="quick-jump-btn"
        :class="{ active: currentPercent >= percent }"
        @click="handleQuickJump(percent)"
      >
        {{ percent }}%
      </button>
    </div>
    
    <div class="progress-bar">
      <div class="progress-fill" :style="{ width: `${currentPercent}%` }"></div>
      <div
        class="progress-indicator"
        :style="{ left: `${currentPercent}%` }"
        @mousedown="startDragging"
        @touchstart="startDragging"
      ></div>
    </div>
    
    <button class="jump-btn" @click="handleJump">确定</button>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['update:modelValue', 'jump'])

const inputValue = ref(Math.round(props.modelValue))
const isDragging = ref(false)

const currentPercent = computed(() => {
  return Math.max(0, Math.min(100, props.modelValue))
})

const quickJumps = [25, 50, 75]

watch(() => props.modelValue, (newVal) => {
  inputValue.value = Math.round(newVal)
})

const handleJump = () => {
  let percent = parseInt(inputValue.value)
  if (isNaN(percent)) percent = 0
  percent = Math.max(0, Math.min(100, percent))
  
  inputValue.value = percent
  emit('update:modelValue', percent)
  emit('jump', percent)
}

const handleQuickJump = (percent) => {
  inputValue.value = percent
  emit('update:modelValue', percent)
  emit('jump', percent)
}

const startDragging = (e) => {
  isDragging.value = true
  handleDrag(e)
  
  document.addEventListener('mousemove', handleDrag)
  document.addEventListener('mouseup', stopDragging)
  document.addEventListener('touchmove', handleDrag)
  document.addEventListener('touchend', stopDragging)
}

const handleDrag = (e) => {
  if (!isDragging.value) return
  
  const progressBar = e.currentTarget.parentElement.querySelector('.progress-bar')
  if (!progressBar) return
  
  const rect = progressBar.getBoundingClientRect()
  const clientX = e.touches ? e.touches[0].clientX : e.clientX
  const percent = ((clientX - rect.left) / rect.width) * 100
  
  const clampedPercent = Math.max(0, Math.min(100, Math.round(percent)))
  inputValue.value = clampedPercent
  emit('update:modelValue', clampedPercent)
}

const stopDragging = () => {
  if (isDragging.value) {
    isDragging.value = false
    emit('jump', inputValue.value)
  }
  
  document.removeEventListener('mousemove', handleDrag)
  document.removeEventListener('mouseup', stopDragging)
  document.removeEventListener('touchmove', handleDrag)
  document.removeEventListener('touchend', stopDragging)
}
</script>

<style scoped lang="scss">
.jump-control {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-4);
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
}

.jump-input {
  display: flex;
  align-items: center;
  gap: var(--space-2);

  .label {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }

  .percentage-input {
    width: 80px;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-base);
    text-align: center;
    background-color: var(--bg-page);
    color: var(--text-primary);

    &:focus {
      outline: none;
      border-color: var(--primary-color);
    }
  }

  .unit {
    font-size: var(--font-size-sm);
    color: var(--text-secondary);
  }
}

.quick-jumps {
  display: flex;
  justify-content: space-between;
  gap: var(--space-2);
}

.quick-jump-btn {
  flex: 1;
  padding: var(--space-2);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  background-color: var(--bg-page);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);

  &:hover {
    border-color: var(--primary-color);
    color: var(--primary-color);
  }

  &.active {
    background-color: var(--primary-color);
    border-color: var(--primary-color);
    color: white;
  }
}

.progress-bar {
  position: relative;
  height: 6px;
  background-color: var(--divider-color);
  border-radius: var(--radius-full);
  margin: var(--space-2) 0;
}

.progress-fill {
  height: 100%;
  background-color: var(--primary-color);
  border-radius: var(--radius-full);
  transition: width var(--transition-base);
}

.progress-indicator {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 20px;
  height: 20px;
  background-color: var(--primary-color);
  border: 3px solid var(--bg-card);
  border-radius: 50%;
  cursor: pointer;
  transition: transform var(--transition-fast);
  box-shadow: var(--shadow-sm);

  &:hover {
    transform: translate(-50%, -50%) scale(1.2);
  }

  &:active {
    transform: translate(-50%, -50%) scale(1.1);
  }
}

.jump-btn {
  padding: var(--space-3);
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  cursor: pointer;
  transition: background-color var(--transition-fast);

  &:hover {
    background-color: #e55a2b;
  }
}
</style>
