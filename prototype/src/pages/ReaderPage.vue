<template>
  <div class="reader-page" :class="{ 'sidebar-open': showDict }">
    <!-- Reading Toolbar -->
    <header class="reader-toolbar">
      <div class="toolbar-left">
        <button class="toolbar-btn back-btn" @click="goBack">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <div class="sutra-title-wrap">
          <h1 class="sutra-title">金刚经</h1>
          <span class="chapter-title">第一品 · 法会因由分</span>
        </div>
      </div>
      <div class="toolbar-right">
        <button class="toolbar-btn" :class="{ active: ttsPlaying }" @click="toggleTTS">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
            <path v-if="ttsPlaying" d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
            <path v-else d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
          </svg>
        </button>
        <button class="toolbar-btn" @click="showTOC = !showTOC">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="8" y1="6" x2="21" y2="6"/>
            <line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/>
            <line x1="3" y1="12" x2="3.01" y2="12"/>
            <line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
        </button>
        <button class="toolbar-btn" @click="showSettings = !showSettings">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </div>
    </header>

    <!-- Main Reading Area -->
    <div class="reader-body">
      <!-- Content Area -->
      <article class="reader-content" :style="contentStyle">
        <p class="sutra-paragraph" v-for="(p, idx) in paragraphs" :key="idx">
          <template v-for="(seg, sIdx) in parseSegments(p)" :key="sIdx">
            <mark v-if="seg.type === 'highlight'" class="highlight" :data-term="seg.text">{{ seg.text }}</mark>
            <span v-else>{{ seg.text }}</span>
          </template>
        </p>

        <!-- Navigation -->
        <nav class="chapter-nav">
          <button class="nav-btn prev" :disabled="!hasPrev">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
            上一品
          </button>
          <button class="nav-btn next" :disabled="!hasNext">
            下一品
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </nav>
      </article>

      <!-- Dictionary Panel (Desktop) -->
      <aside class="dict-panel" v-if="showDict">
        <div class="dict-header">
          <h3>词义</h3>
          <button class="close-btn" @click="showDict = false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="dict-content">
          <h4 class="term-title">般若波罗蜜多</h4>
          <p class="term-pinyin">bō rě bō luó mì duō</p>
          <div class="definition">
            <p>「般若」义为智慧，「波罗蜜多」义为到彼岸。合言之，即「透过智慧到达彼岸」之意。</p>
            <p>为佛教用语，指如实认知一切事物和万物本源的终极智慧，区别于世间智慧。</p>
          </div>
          <div class="dict-source">
            <span class="source-tag">佛学词典</span>
          </div>
        </div>
      </aside>
    </div>

    <!-- Mobile Dict Popup -->
    <div class="dict-popup" v-if="showDict && isMobile" @click.self="showDict = false">
      <div class="dict-popup-content">
        <div class="dict-header">
          <h3>词义</h3>
          <button class="close-btn" @click="showDict = false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="dict-content">
          <h4 class="term-title">般若波罗蜜多</h4>
          <p class="term-pinyin">bō rě bō luó mì duō</p>
          <div class="definition">
            <p>「般若」义为智慧，「波罗蜜多」义为到彼岸。合言之，即「透过智慧到达彼岸」之意。</p>
          </div>
        </div>
      </div>
    </div>

    <!-- TOC Sidebar -->
    <div class="toc-overlay" v-if="showTOC" @click.self="showTOC = false">
      <aside class="toc-sidebar">
        <div class="toc-header">
          <h3>目录</h3>
          <button class="close-btn" @click="showTOC = false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <nav class="toc-list">
          <a
            v-for="(ch, idx) in chapters"
            :key="idx"
            class="toc-item"
            :class="{ active: idx === 0, done: idx < 3 }"
          >
            <span class="toc-num">{{ idx + 1 }}</span>
            <span class="toc-name">{{ ch.title }}</span>
          </a>
        </nav>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const showDict = ref(false)
const showTOC = ref(false)
const showSettings = ref(false)
const ttsPlaying = ref(false)
const isMobile = ref(false)

const fontSize = ref(18)
const lineHeight = ref(1.8)

const contentStyle = computed(() => ({
  fontSize: fontSize.value + 'px',
  lineHeight: lineHeight.value
}))

const paragraphs = ref([
  '如是我闻：一时，佛在舍卫国祇树给孤独园，与大比丘众千二百五十人俱。',
  '尔时，世尊食时，著衣持钵，入舍卫大城乞食。',
  '于其城中次第乞已，还至本处。饭食讫，收衣钵，洗足已，敷座而坐。',
  '时，长老须菩提在大众中，即从座起，偏袒右肩，右膝著地，合掌恭敬，而白佛言：',
  '"希有！世尊！如来善护念诸菩萨，善付嘱诸菩萨。"',
  '"世尊！善男子、善女人，发阿耨多罗三藐三菩提心，云何应住？云何降伏其心？"',
  '佛言："善哉！善哉！须菩提！如汝所说，如来善护念诸菩萨，善付嘱诸菩萨。"',
  '"汝今谛听，当为汝说。善男子、善女人，发阿耨多罗三藐三菩提心，应如是住，如是降伏其心。"',
  '"唯然，世尊！愿乐欲闻。"'
])

const chapters = [
  { title: '法会因由分' },
  { title: '善现启请分' },
  { title: '大乘正宗分' },
  { title: '妙行无住分' },
  { title: '如理实见分' },
  { title: '正信希有分' },
  { title: '无得无说分' },
  { title: '依法出生分' },
  { title: '一相无相分' },
  { title: '庄严净土分' }
]

const hasPrev = computed(() => false)
const hasNext = computed(() => true)

const parseSegments = (text) => {
  const highlights = ['般若', '波罗蜜多', '如来', '善男子', '善女人', '阿耨多罗', '三藐三菩提']
  const result = []
  let remaining = text

  for (const term of highlights) {
    if (remaining.includes(term)) {
      const idx = remaining.indexOf(term)
      if (idx > 0) {
        result.push({ type: 'text', text: remaining.slice(0, idx) })
      }
      result.push({ type: 'highlight', text: term })
      remaining = remaining.slice(idx + term.length)
    }
  }

  if (remaining) {
    result.push({ type: 'text', text: remaining })
  }

  return result.length > 0 ? result : [{ type: 'text', text }]
}

const toggleTTS = () => {
  ttsPlaying.value = !ttsPlaying.value
}

const goBack = () => {
  window.location.href = '/bookshelf'
}

const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)

  document.querySelectorAll('.highlight').forEach(el => {
    el.addEventListener('click', () => {
      showDict.value = true
    })
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<style scoped>
.reader-page {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 48px);
  margin: calc(-1 * var(--zen-space-xl));
}

/* ===== Toolbar ===== */
.reader-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--zen-space-sm) var(--zen-space-lg);
  background: var(--zen-surface);
  border-bottom: 1px solid var(--zen-hairline);
  position: sticky;
  top: 0;
  z-index: 40;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: var(--zen-space-md);
}

.toolbar-right {
  display: flex;
  gap: var(--zen-space-xs);
}

.toolbar-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: var(--zen-radius-interactive);
  color: var(--zen-ink-muted);
  cursor: pointer;
  transition: all 0.2s;
}

.toolbar-btn:hover {
  background: var(--zen-surface-soft);
  color: var(--zen-ink);
}

.toolbar-btn.active {
  color: var(--zen-accent);
}

.sutra-title-wrap {
  display: flex;
  flex-direction: column;
}

.sutra-title {
  font-family: var(--zen-font-serif);
  font-size: 18px;
  font-weight: 600;
  color: var(--zen-ink);
}

.chapter-title {
  font-size: 13px;
  color: var(--zen-ink-muted);
}

/* ===== Reader Body ===== */
.reader-body {
  flex: 1;
  display: flex;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

/* ===== Reader Content ===== */
.reader-content {
  flex: 1;
  padding: var(--zen-space-xl) var(--zen-space-2xl);
  max-width: 720px;
  margin: 0 auto;
  font-family: var(--zen-font-serif);
  color: var(--zen-ink);
}

.sutra-paragraph {
  margin-bottom: 1.5em;
  text-align: justify;
  text-indent: 2em;
}

.highlight {
  background: var(--zen-highlight-mind);
  color: var(--zen-highlight-text-mind);
  padding: 2px 4px;
  border-radius: 3px;
  cursor: pointer;
  transition: background 0.2s;
}

.highlight:hover {
  background: var(--zen-accent-light);
  color: var(--zen-on-accent);
}

/* ===== Chapter Navigation ===== */
.chapter-nav {
  display: flex;
  justify-content: space-between;
  margin-top: var(--zen-space-2xl);
  padding-top: var(--zen-space-xl);
  border-top: 1px solid var(--zen-hairline);
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 20px;
  background: var(--zen-surface);
  border: 1px solid var(--zen-hairline);
  border-radius: var(--zen-radius-interactive);
  font-size: 14px;
  color: var(--zen-ink-muted);
  cursor: pointer;
  transition: all 0.2s;
}

.nav-btn:hover:not(:disabled) {
  border-color: var(--zen-accent);
  color: var(--zen-accent);
}

.nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ===== Dictionary Panel (Desktop) ===== */
.dict-panel {
  width: 320px;
  border-left: 1px solid var(--zen-hairline);
  background: var(--zen-surface);
  display: flex;
  flex-direction: column;
}

.dict-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--zen-space-md) var(--zen-space-lg);
  border-bottom: 1px solid var(--zen-hairline);
}

.dict-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--zen-ink);
}

.close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: var(--zen-radius-interactive);
  color: var(--zen-ink-muted);
  cursor: pointer;
}

.close-btn:hover {
  background: var(--zen-surface-soft);
  color: var(--zen-ink);
}

.dict-content {
  padding: var(--zen-space-lg);
  overflow-y: auto;
}

.term-title {
  font-family: var(--zen-font-serif);
  font-size: 24px;
  font-weight: 600;
  color: var(--zen-ink);
  margin-bottom: var(--zen-space-xs);
}

.term-pinyin {
  font-size: 14px;
  color: var(--zen-ink-muted);
  margin-bottom: var(--zen-space-md);
}

.definition p {
  font-size: 15px;
  line-height: 1.7;
  color: var(--zen-ink);
  margin-bottom: var(--zen-space-sm);
  text-indent: 2em;
}

.dict-source {
  margin-top: var(--zen-space-lg);
  padding-top: var(--zen-space-md);
  border-top: 1px solid var(--zen-hairline);
}

.source-tag {
  display: inline-block;
  padding: 4px 12px;
  background: var(--zen-highlight-commentary);
  color: var(--zen-highlight-text-commentary);
  border-radius: var(--zen-radius-interactive);
  font-size: 12px;
}

/* ===== TOC Sidebar ===== */
.toc-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 200;
}

.toc-sidebar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 280px;
  background: var(--zen-canvas);
  display: flex;
  flex-direction: column;
}

.toc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--zen-space-md) var(--zen-space-lg);
  border-bottom: 1px solid var(--zen-hairline);
}

.toc-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--zen-ink);
}

.toc-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--zen-space-sm);
}

.toc-item {
  display: flex;
  align-items: center;
  gap: var(--zen-space-sm);
  padding: var(--zen-space-sm) var(--zen-space-md);
  border-radius: var(--zen-radius-container);
  color: var(--zen-ink-muted);
  text-decoration: none;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.toc-item:hover {
  background: var(--zen-surface);
}

.toc-item.active {
  background: var(--zen-accent);
  color: var(--zen-on-accent);
}

.toc-item.done .toc-num::after {
  content: '✓';
  margin-left: 4px;
  font-size: 11px;
}

.toc-num {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--zen-surface);
  border-radius: 50%;
  font-size: 12px;
  font-weight: 500;
}

.toc-item.active .toc-num {
  background: rgba(255,255,255,0.2);
}

/* ===== Mobile Dict Popup ===== */
.dict-popup {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 300;
  display: flex;
  align-items: flex-end;
}

.dict-popup-content {
  width: 100%;
  max-height: 60vh;
  background: var(--zen-canvas);
  border-radius: var(--zen-radius-container) var(--zen-radius-container) 0 0;
  overflow: hidden;
}

.dict-popup-content .dict-content {
  max-height: calc(60vh - 60px);
  overflow-y: auto;
}

/* ===== Responsive: Tablet ===== */
@media (max-width: 1023px) {
  .reader-body {
    flex-direction: column;
  }

  .dict-panel {
    display: none;
  }

  .reader-content {
    padding: var(--zen-space-lg);
  }
}

/* ===== Responsive: Mobile ===== */
@media (max-width: 767px) {
  .reader-page {
    margin: calc(-1 * var(--zen-space-md));
  }

  .sutra-title {
    font-size: 16px;
  }

  .back-btn {
    display: flex;
  }

  .reader-toolbar {
    padding: var(--zen-space-xs) var(--zen-space-sm);
  }

  .reader-content {
    padding: var(--zen-space-md);
    font-size: 17px;
  }

  .sutra-paragraph {
    margin-bottom: 1.2em;
    text-indent: 1.5em;
  }

  .chapter-nav {
    flex-direction: column;
    gap: var(--zen-space-sm);
  }

  .nav-btn {
    justify-content: center;
  }

  .toc-sidebar {
    width: 100%;
  }
}
</style>
