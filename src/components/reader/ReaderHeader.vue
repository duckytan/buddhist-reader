<template>
  <header class="reader-header">
    <button
      type="button"
      class="reader-header__icon"
      aria-label="返回书架"
      @click="emit('back')"
    >
      ←
    </button>

    <h1 class="reader-header__title">
      {{ title }}
    </h1>

    <nav
      class="reader-header__actions"
      aria-label="阅读器工具"
    >
      <button
        type="button"
        class="reader-header__action"
        aria-label="目录"
        @click="emit('toc')"
      >
        目录
      </button>
      <button
        type="button"
        class="reader-header__action"
        aria-label="搜索"
        @click="emit('search')"
      >
        搜索
      </button>
      <button
        type="button"
        class="reader-header__action"
        aria-label="笔记"
        @click="emit('notes')"
      >
        笔记
      </button>
      <button
        type="button"
        class="reader-header__action"
        aria-label="词典"
        @click="emit('dicts')"
      >
        词典
      </button>
      <button
        type="button"
        class="reader-header__action"
        aria-label="设置"
        @click="emit('settings')"
      >
        设置
      </button>
    </nav>
  </header>
</template>

<script setup lang="ts">
/**
 * 阅读器顶栏（方案 §6.1 ③ 的「header」来源）。
 *
 * **高度由 `--reader-header-height` 驱动**（`height: var(--reader-header-height)`），
 * 与 `ParagraphBlock` 的 `scroll-margin-top` **同源**——二者恒等，杜绝系统性偏移
 * （即「不把旧版 −40/−20 魔法偏移换个地方藏」）。标题超长省略，**高度恒定**。
 */

interface Props {
  /** 经书标题 */
  title: string
}

defineProps<Props>()

const emit = defineEmits<{
  back: []
  toc: []
  search: []
  notes: []
  dicts: []
  settings: []
}>()
</script>

<style scoped>
.reader-header {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  height: var(--reader-header-height);
  padding: 0 var(--spacing-sm);
  background: var(--color-canvas);
  border-bottom: 1px solid var(--color-hairline);
}

.reader-header__icon,
.reader-header__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: var(--touch-target);
  min-height: var(--touch-target);
  padding: 0 var(--spacing-xs);
  color: var(--color-ink-muted);
  font-size: var(--text-body-sm);
  white-space: nowrap;
}

.reader-header__icon {
  font-size: var(--text-body-lg);
}

.reader-header__title {
  flex: 1;
  overflow: hidden;
  color: var(--color-ink);
  font-family: var(--font-serif);
  font-size: var(--text-body);
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reader-header__actions {
  display: flex;
  align-items: center;
}
</style>
