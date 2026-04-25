# 📖 般若佛经阅读器 - 详细开发指南

> **文档版本**: v1.0  
> **创建日期**: 2026-04-25  
> **最后更新**: 2026-04-25  
> **适用阶段**: MVP 开发（基于 v2 架构）

---

## 📋 目录

- [1. 项目概述](#1-项目概述)
- [2. 技术栈与依赖](#2-技术栈与依赖)
- [3. 文件结构规范](#3-文件结构规范)
- [4. 开发流程](#4-开发流程)
- [5. 详细任务拆解](#5-详细任务拆解)
- [6. 代码规范](#6-代码规范)
- [7. 测试策略](#7-测试策略)
- [8. 部署流程](#8-部署流程)

---

## 1. 项目概述

### 1.1 项目目标

开发一款禅意风格的佛经阅读器 MVP，支持多终端适配（手机/平板/PC），具备核心阅读功能：
- 词典高亮与释义
- TTS 语音朗读
- 读音标注
- 主题切换（日间/夜间）

### 1.2 技术架构

```
┌─────────────────────────────────────────┐
│         前端展示层 (Vue 3 + Vite)         │
│  ┌───────────────────────────────────┐  │
│  │  ┌─────────┐  ┌─────────┐         │  │
│  │  │ 书架页  │  │ 阅读页  │  设置页  │  │
│  │  └─────────┘  └─────────┘         │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│       状态管理层 (Pinia Stores)           │
│  ┌───────────────────────────────────┐  │
│  │ settings | progress | theme      │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│       核心算法层 (Utilities)              │
│  ┌───────────────────────────────────┐  │
│  │ Trie树匹配 | TTS引擎 | 读音映射    │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│       数据层 (Data + LocalStorage)        │
│  ┌───────────────────────────────────┐  │
│  │ sutras.js | dictionary.js | map.js │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### 1.3 多终端适配策略

| 终端 | 屏幕宽度 | 核心特性 | 主要适配点 |
|------|---------|---------|-----------|
| 📱 手机端 | < 768px | 极简操作 | 底部抽屉、大按钮、单列布局 |
| 💻 平板端 | 768px - 1024px | 功能展开 | 侧边栏、气泡弹窗、2-3 列 |
| 🖥️ PC端 | > 1024px | 管理强化 | 三栏布局、侧边面板、4 列 |

---

## 2. 技术栈与依赖

### 2.1 核心依赖

```json
{
  "dependencies": {
    "vue": "^3.4.0",
    "vue-router": "^4.2.0",
    "pinia": "^2.1.0",
    "vant": "^4.8.0",
    "@vueuse/core": "^10.7.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "vite": "^5.0.0",
    "eslint": "^8.56.0",
    "eslint-plugin-vue": "^9.19.0",
    "sass": "^1.69.0"
  }
}
```

### 2.2 依赖说明

| 依赖 | 版本 | 用途 |
|------|------|------|
| Vue 3 | ^3.4.0 | 前端框架，Composition API |
| Vue Router | ^4.2.0 | 路由管理 |
| Pinia | ^2.1.0 | 状态管理 |
| Vant 4 | ^4.8.0 | UI 组件库（移动端） |
| @vueuse/core | ^10.7.0 | 组合式工具集 |
| Vite | ^5.0.0 | 构建工具 |
| Sass | ^1.69.0 | CSS 预处理器 |

---

## 3. 文件结构规范

### 3.1 标准目录结构

```
src/
├── assets/                 # 静态资源
│   ├── images/            # 图片资源
│   ├── styles/            # 全局样式
│   │   ├── variables.scss # SCSS 变量（颜色、字体、间距）
│   │   ├── reset.scss     # 样式重置
│   │   └── global.scss    # 全局样式
│   └── fonts/             # 字体文件（如需自定义）
├── components/            # 通用组件
│   ├── BookCard.vue       # 经书卡片组件
│   ├── ReaderContent.vue  # 阅读内容组件
│   ├── DictionaryPopup.vue # 词典弹窗组件（多终端适配）
│   ├── AudioPlayer.vue    # 音频播放器
│   └── ThemeToggle.vue    # 主题切换按钮
├── pages/                 # 页面组件
│   ├── Bookshelf.vue      # 书架页
│   ├── Reader.vue         # 阅读页
│   └── Settings.vue       # 设置页
├── stores/                # Pinia 状态管理
│   ├── settings.js        # 设置状态
│   ├── progress.js        # 阅读进度
│   └── theme.js           # 主题状态
├── router/                # 路由配置
│   └── index.js           # 路由定义
├── utils/                 # 工具函数
│   ├── trie.js            # Trie 树算法
│   ├── tts.js             # TTS 引擎封装
│   ├── pronunciation.js  # 读音映射
│   └── storage.js         # 本地存储封装
├── data/                  # 数据文件
│   ├── sutras.js          # 经书数据
│   ├── dictionary.js      # 词典数据
│   └── pronunciation-map.js # 读音映射
├── App.vue                # 根组件
└── main.js                # 入口文件
```

### 3.2 文件命名规范

| 类型 | 命名规范 | 示例 |
|------|---------|------|
| 组件文件 | PascalCase | `BookCard.vue` |
| 页面文件 | PascalCase | `Bookshelf.vue` |
| 工具文件 | camelCase | `trie.js` |
| 状态文件 | camelCase | `settings.js` |
| 样式文件 | kebab-case | `variables.scss` |

### 3.3 代码注释规范

```javascript
/**
 * 构建 Trie 树用于词典匹配
 * @param {Array} dictionaryData - 词典数据数组
 * @returns {Object} 构建好的 Trie 树结构
 * 
 * @example
 * const trie = buildTrie(dictionaryData);
 * const matches = findMatches(trie, '般若波罗蜜多心经');
 */
function buildTrie(dictionaryData) {
  // 实现代码...
}
```

---

## 4. 开发流程

### 4.1 开发前置准备

#### 步骤 1：环境检查
```bash
# 检查 Node.js 版本（建议 >= 18.0.0）
node -v

# 检查 npm 版本
npm -v
```

#### 步骤 2：初始化项目
```bash
# 创建项目目录（如果不存在）
cd d:/AI-Project/AI-buddhist-reader

# 初始化 Vite 项目
npm create vite@latest . -- --template vue

# 安装依赖
npm install

# 安装额外依赖
npm install vue-router pinia vant @vueuse/core sass
```

#### 步骤 3：配置 Vite
```javascript
// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/assets/styles/variables.scss";`
      }
    }
  }
})
```

### 4.2 开发步骤

#### 阶段一：基础架构搭建

##### 任务 1.1：创建目录结构
- [ ] 创建 `src/assets/styles/` 目录
- [ ] 创建 `src/components/` 目录
- [ ] 创建 `src/pages/` 目录
- [ ] 创建 `src/stores/` 目录
- [ ] 创建 `src/router/` 目录
- [ ] 创建 `src/utils/` 目录
- [ ] 创建 `src/data/` 目录

##### 任务 1.2：创建全局样式文件

**文件：** `src/assets/styles/variables.scss`
```scss
// 颜色变量
$primary-color: #FF6B35;
$secondary-color: #F7C59F;
$accent-color: #FFF3CD;
$text-primary: #333333;
$text-secondary: #666666;
$bg-page: #F5F5F5;
$bg-card: #FFFFFF;

// 字体变量
$font-serif: 'Source Han Serif CN', 'Noto Serif SC', serif;
$font-sans: 'Source Han Sans CN', 'Noto Sans SC', sans-serif;

// 间距变量
$spacing-xs: 4px;
$spacing-sm: 8px;
$spacing-md: 16px;
$spacing-lg: 24px;
$spacing-xl: 32px;

// 圆角变量
$radius-sm: 8px;
$radius-md: 12px;
$radius-lg: 16px;

// 阴影变量
$shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.05);
$shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
$shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
```

**文件：** `src/assets/styles/reset.scss`
```scss
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  width: 100%;
  height: 100%;
  font-family: $font-sans;
  background-color: $bg-page;
  color: $text-primary;
}

a {
  text-decoration: none;
  color: inherit;
}

button {
  border: none;
  background: none;
  cursor: pointer;
}
```

**文件：** `src/assets/styles/global.scss`
```scss
@import './variables.scss';
@import './reset.scss';

// 响应式断点
$breakpoint-mobile: 768px;
$breakpoint-tablet: 1024px;

// 混入
@mixin mobile {
  @media (max-width: $breakpoint-mobile) {
    @content;
  }
}

@mixin tablet {
  @media (min-width: $breakpoint-mobile) and (max-width: $breakpoint-tablet) {
    @content;
  }
}

@mixin desktop {
  @media (min-width: $breakpoint-tablet) {
    @content;
  }
}

// 工具类
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 $spacing-md;
}

.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}
```

##### 任务 1.3：配置路由

**文件：** `src/router/index.js`
```javascript
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'bookshelf',
    component: () => import('@/pages/Bookshelf.vue')
  },
  {
    path: '/reader/:id',
    name: 'reader',
    component: () => import('@/pages/Reader.vue')
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/pages/Settings.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
```

##### 任务 1.4：配置 Pinia

**文件：** `src/stores/settings.js`
```javascript
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  // 状态
  const fontSize = ref(18)
  const ttsSpeed = ref(1.0)
  const showPronunciation = ref(true)
  
  // 从本地存储加载
  const loadFromStorage = () => {
    const saved = localStorage.getItem('settings')
    if (saved) {
      const data = JSON.parse(saved)
      fontSize.value = data.fontSize || 18
      ttsSpeed.value = data.ttsSpeed || 1.0
      showPronunciation.value = data.showPronunciation ?? true
    }
  }
  
  // 持久化到本地存储
  watch([fontSize, ttsSpeed, showPronunciation], () => {
    localStorage.setItem('settings', JSON.stringify({
      fontSize: fontSize.value,
      ttsSpeed: ttsSpeed.value,
      showPronunciation: showPronunciation.value
    }))
  })
  
  // 方法
  const setFontSize = (size) => {
    fontSize.value = size
  }
  
  const setTtsSpeed = (speed) => {
    ttsSpeed.value = speed
  }
  
  const togglePronunciation = () => {
    showPronunciation.value = !showPronunciation.value
  }
  
  // 初始化
  loadFromStorage()
  
  return {
    fontSize,
    ttsSpeed,
    showPronunciation,
    setFontSize,
    setTtsSpeed,
    togglePronunciation
  }
})
```

**文件：** `src/stores/progress.js`
```javascript
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useProgressStore = defineStore('progress', () => {
  const currentSutra = ref(null)
  const scrollPosition = ref(0)
  const readingTime = ref(0)
  
  const setSutra = (sutra) => {
    currentSutra.value = sutra
  }
  
  const setScrollPosition = (position) => {
    scrollPosition.value = position
  }
  
  const addReadingTime = (seconds) => {
    readingTime.value += seconds
  }
  
  return {
    currentSutra,
    scrollPosition,
    readingTime,
    setSutra,
    setScrollPosition,
    addReadingTime
  }
})
```

**文件：** `src/stores/theme.js`
```javascript
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  const isDark = ref(false)
  
  const loadFromStorage = () => {
    const saved = localStorage.getItem('theme')
    isDark.value = saved === 'dark'
  }
  
  watch(isDark, () => {
    localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', isDark.value)
  })
  
  const toggleTheme = () => {
    isDark.value = !isDark.value
  }
  
  loadFromStorage()
  
  return {
    isDark,
    toggleTheme
  }
})
```

##### 任务 1.5：配置主入口

**文件：** `src/main.js`
```javascript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import '@/assets/styles/global.scss'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.mount('#app')
```

---

#### 阶段二：核心功能开发

##### 任务 2.1：实现 Trie 树词典匹配

**文件：** `src/utils/trie.js`
```javascript
/**
 * Trie 树节点类
 */
class TrieNode {
  constructor() {
    this.children = {}      // 子节点映射
    this.isEnd = false      // 是否是词尾
    this.data = null        // 词典数据
  }
}

/**
 * 构建 Trie 树
 * @param {Array} dictionary - 词典数组 [{term, pinyin, definition, ...}]
 * @returns {TrieNode} 根节点
 */
function buildTrie(dictionary) {
  const root = new TrieNode()
  
  dictionary.forEach(item => {
    let node = root
    const term = item.term
    
    for (const char of term) {
      if (!node.children[char]) {
        node.children[char] = new TrieNode()
      }
      node = node.children[char]
    }
    
    node.isEnd = true
    node.data = item
  })
  
  return root
}

/**
 * 在文本中查找所有匹配的词典词条
 * @param {TrieNode} trie - Trie 树根节点
 * @param {String} text - 待匹配文本
 * @returns {Array} 匹配结果数组 [{start, end, term, data}, ...]
 */
function findMatches(trie, text) {
  const matches = []
  
  for (let i = 0; i < text.length; i++) {
    let node = trie
    let j = i
    
    while (j < text.length && node.children[text[j]]) {
      node = node.children[text[j]]
      j++
      
      if (node.isEnd) {
        matches.push({
          start: i,
          end: j,
          term: text.slice(i, j),
          data: node.data
        })
      }
    }
  }
  
  // 按最长匹配优先排序
  return matches.sort((a, b) => b.end - b.start - (a.end - a.start))
}

/**
 * 移除重叠的匹配结果（保留最长匹配）
 * @param {Array} matches - 原始匹配结果
 * @returns {Array} 去重后的匹配结果
 */
function removeOverlaps(matches) {
  if (matches.length === 0) return []
  
  const result = [matches[0]]
  
  for (let i = 1; i < matches.length; i++) {
    const last = result[result.length - 1]
    const current = matches[i]
    
    if (current.start >= last.end) {
      result.push(current)
    }
  }
  
  return result
}

export {
  TrieNode,
  buildTrie,
  findMatches,
  removeOverlaps
}
```

##### 任务 2.2：实现 TTS 引擎

**文件：** `src/utils/tts.js`
```javascript
/**
 * TTS 引擎类 - 封装 Web Speech API
 */
class TTSEngine {
  constructor() {
    this.synth = window.speechSynthesis
    this.currentUtterance = null
    this.isSpeaking = false
    this.isPaused = false
    this.onSentenceCallback = null
  }
  
  /**
   * 获取可用语音列表
   * @returns {Array} 语音列表
   */
  getVoices() {
    return this.synth.getVoices()
  }
  
  /**
   * 播放文本
   * @param {String} text - 待朗读文本
   * @param {Object} options - 配置选项 {rate, pitch, voice, onSentence}
   */
  speak(text, options = {}) {
    // 停止当前播放
    this.stop()
    
    // 创建语音实例
    const utterance = new SpeechSynthesisUtterance(text)
    
    // 设置语音参数
    utterance.rate = options.rate || 1.0
    utterance.pitch = options.pitch || 1.0
    utterance.lang = 'zh-CN'
    
    // 选择语音
    const voices = this.getVoices()
    const voice = options.voice || voices.find(v => v.lang === 'zh-CN')
    if (voice) {
      utterance.voice = voice
    }
    
    // 事件监听
    utterance.onstart = () => {
      this.isSpeaking = true
      this.isPaused = false
    }
    
    utterance.onend = () => {
      this.isSpeaking = false
      this.isPaused = false
    }
    
    utterance.onpause = () => {
      this.isPaused = true
    }
    
    utterance.onresume = () => {
      this.isPaused = false
    }
    
    // 按句子分割并回调
    if (options.onSentence) {
      const sentences = text.match(/[^.!?。！？]+[.!?。！？]?/g) || []
      let currentIndex = 0
      utterance.onboundary = (event) => {
        if (event.name === 'sentence' && currentIndex < sentences.length) {
          options.onSentence({
            index: currentIndex,
            text: sentences[currentIndex],
            charIndex: event.charIndex
          })
          currentIndex++
        }
      }
    }
    
    this.currentUtterance = utterance
    this.synth.speak(utterance)
  }
  
  /**
   * 暂停播放
   */
  pause() {
    if (this.isSpeaking && !this.isPaused) {
      this.synth.pause()
    }
  }
  
  /**
   * 恢复播放
   */
  resume() {
    if (this.isSpeaking && this.isPaused) {
      this.synth.resume()
    }
  }
  
  /**
   * 停止播放
   */
  stop() {
    this.synth.cancel()
    this.isSpeaking = false
    this.isPaused = false
  }
  
  /**
   * 获取播放状态
   * @returns {Object} {isSpeaking, isPaused}
   */
  getStatus() {
    return {
      isSpeaking: this.isSpeaking,
      isPaused: this.isPaused
    }
  }
}

// 创建单例实例
const ttsEngine = new TTSEngine()

export default ttsEngine
```

##### 任务 2.3：实现读音映射

**文件：** `src/utils/pronunciation.js`
```javascript
/**
 * 佛经多音字映射表
 */
const pronunciationMap = {
  '般': {
    '般若': 'bō',
    '一般': 'bān',
    'default': 'bān'
  },
  '若': {
    '般若': 'rě',
    '如果': 'ruò',
    'default': 'ruò'
  },
  '菩': {
    '菩萨': 'pú',
    'default': 'pú'
  },
  '萨': {
    '菩萨': 'sà',
    'default': 'sà'
  },
  '陀': {
    '罗睺陀': 'duò',
    '南无': 'tuó',
    'default': 'tuó'
  },
  '摩': {
    '般若': 'mó',
    '摩诃': 'mó',
    'default': 'mó'
  },
  '南': {
    '南无': 'ná',
    'default': 'nán'
  },
  '无': {
    '南无': 'mó',
    '无明': 'wú',
    'default': 'wú'
  }
}

/**
 * 获取词语的读音
 * @param {String} word - 词语
 * @returns {String} 拼音
 */
function getPronunciation(word) {
  for (const [char, map] of Object.entries(pronunciationMap)) {
    for (const [context, pinyin] of Object.entries(map)) {
      if (context !== 'default' && word.includes(context)) {
        return pinyin
      }
    }
  }
  return null
}

/**
 * 为文本添加读音标注
 * @param {String} text - 原始文本
 * @returns {String} 带拼音标注的文本（HTML）
 */
function addPinyinAnnotation(text) {
  let result = ''
  let i = 0
  
  while (i < text.length) {
    const char = text[i]
    const map = pronunciationMap[char]
    
    if (map) {
      // 检查前后文
      const context = text.slice(Math.max(0, i - 2), i + 3)
      let pinyin = map.default
      
      for (const [key, value] of Object.entries(map)) {
        if (key !== 'default' && context.includes(key)) {
          pinyin = value
          break
        }
      }
      
      result += `<ruby class="pinyin"><rt>${pinyin}</rt>${char}</ruby>`
    } else {
      result += char
    }
    
    i++
  }
  
  return result
}

export {
  pronunciationMap,
  getPronunciation,
  addPinyinAnnotation
}
```

---

#### 阶段三：页面组件开发

##### 任务 3.1：创建书架页面

**文件：** `src/pages/Bookshelf.vue`
```vue
<template>
  <div class="bookshelf">
    <!-- 搜索栏 -->
    <div class="search-bar">
      <van-search
        v-model="searchQuery"
        placeholder="搜索经书"
        @input="handleSearch"
      />
    </div>
    
    <!-- 书架网格 -->
    <div class="book-grid">
      <div
        v-for="sutra in filteredSutras"
        :key="sutra.id"
        class="book-card"
        @click="openSutra(sutra)"
      >
        <div class="book-cover">{{ sutra.cover }}</div>
        <div class="book-info">
          <h3 class="book-title">{{ sutra.title }}</h3>
          <p class="book-author">{{ sutra.translator }}</p>
          <div class="book-progress" v-if="sutra.progress">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: sutra.progress + '%' }"></div>
            </div>
            <span class="progress-text">{{ sutra.progress }}%</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 底部导航（移动端） -->
    <div class="bottom-nav">
      <van-tabbar v-model="activeTab">
        <van-tabbar-item icon="apps-o">书架</van-tabbar-item>
        <van-tabbar-item icon="setting-o">设置</van-tabbar-item>
      </van-tabbar>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import sutras from '@/data/sutras.js'

const router = useRouter()
const searchQuery = ref('')
const activeTab = ref(0)

const filteredSutras = computed(() => {
  if (!searchQuery.value) return sutras
  return sutras.filter(s => 
    s.title.includes(searchQuery.value) || 
    s.fullName.includes(searchQuery.value)
  )
})

const openSutra = (sutra) => {
  router.push(`/reader/${sutra.id}`)
}

const handleSearch = () => {
  // 搜索逻辑已在 computed 中实现
}
</script>

<style scoped lang="scss">
.bookshelf {
  min-height: 100vh;
  padding: $spacing-lg;
  background-color: $bg-page;
}

.search-bar {
  margin-bottom: $spacing-lg;
}

.book-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: $spacing-lg;
  margin-bottom: $spacing-xl;
}

.book-card {
  background: $bg-card;
  border-radius: $radius-md;
  padding: $spacing-lg;
  box-shadow: $shadow-sm;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    box-shadow: $shadow-md;
    transform: translateY(-4px);
  }
}

.book-cover {
  font-size: 48px;
  text-align: center;
  margin-bottom: $spacing-md;
}

.book-title {
  font-size: $font-size-lg;
  font-weight: 600;
  color: $text-primary;
  margin-bottom: $spacing-sm;
}

.book-author {
  font-size: $font-size-sm;
  color: $text-secondary;
  margin-bottom: $spacing-md;
}

.book-progress {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.progress-bar {
  flex: 1;
  height: 4px;
  background: $bg-page;
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: $primary-color;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: $font-size-xs;
  color: $text-secondary;
}

@include mobile {
  .book-grid {
    grid-template-columns: 1fr;
  }
}

@include tablet {
  .book-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@include desktop {
  .book-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>
```

##### 任务 3.2：创建阅读页面

**文件：** `src/pages/Reader.vue`
```vue
<template>
  <div class="reader">
    <!-- 顶部导航栏 -->
    <div class="reader-header">
      <button class="back-btn" @click="goBack">
        <van-icon name="arrow-left" />
      </button>
      <h2 class="sutra-title">{{ currentSutra.title }}</h2>
      <button class="menu-btn" @click="showMenu = true">
        <van-icon name="ellipsis" />
      </button>
    </div>
    
    <!-- 阅读内容区 -->
    <div 
      class="reader-content"
      ref="contentRef"
      @scroll="handleScroll"
    >
      <div class="chapter-content">
        <div
          v-for="(segment, index) in contentSegments"
          :key="index"
          class="content-segment"
          v-html="segment"
        ></div>
      </div>
    </div>
    
    <!-- 底部工具栏 -->
    <div class="reader-footer">
      <div class="toolbar">
        <button class="tool-btn" @click="toggleTTS">
          <van-icon :name="isPlaying ? 'pause-circle-o' : 'play-circle-o'" />
          <span>{{ isPlaying ? '暂停' : '播放' }}</span>
        </button>
        <button class="tool-btn" @click="showFontSettings = true">
          <van-icon name="font-o" />
          <span>字号</span>
        </button>
        <button class="tool-btn" @click="togglePinyin">
          <van-icon :name="showPinyin ? 'eye-o' : 'closed-eye']" />
          <span>拼音</span>
        </button>
        <button class="tool-btn" @click="showThemeToggle = true">
          <van-icon :name="isDark ? 'sun' : 'moon']" />
          <span>主题</span>
        </button>
      </div>
    </div>
    
    <!-- 词典弹窗 -->
    <DictionaryPopup
      v-if="selectedTerm"
      :term="selectedTerm"
      :position="popupPosition"
      @close="closePopup"
    />
    
    <!-- 字号设置弹窗 -->
    <van-popup v-model:show="showFontSettings" position="bottom">
      <div class="font-settings">
        <van-slider
          v-model="fontSize"
          :min="14"
          :max="28"
          :step="2"
          @change="handleFontSizeChange"
        />
        <div class="font-size-preview" :style="{ fontSize: fontSize + 'px' }">
          预览文字
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSettingsStore } from '@/stores/settings'
import { useProgressStore } from '@/stores/progress'
import { useThemeStore } from '@/stores/theme'
import DictionaryPopup from '@/components/DictionaryPopup.vue'
import ttsEngine from '@/utils/tts'
import { buildTrie, findMatches, removeOverlaps } from '@/utils/trie'
import { addPinyinAnnotation } from '@/utils/pronunciation'
import dictionary from '@/data/dictionary.js'
import sutras from '@/data/sutras.js'

const route = useRoute()
const router = useRouter()
const settings = useSettingsStore()
const progress = useProgressStore()
const theme = useThemeStore()

const contentRef = ref(null)
const selectedTerm = ref(null)
const popupPosition = ref({ top: 0, left: 0 })
const showFontSettings = ref(false)
const showMenu = ref(false)
const isPlaying = ref(false)
const trie = ref(null)

const sutraId = computed(() => route.params.id)
const currentSutra = computed(() => sutras.find(s => s.id === sutraId.value))
const fontSize = computed(() => settings.fontSize)
const showPinyin = computed(() => settings.showPronunciation)
const isDark = computed(() => theme.isDark)

const contentSegments = computed(() => {
  const sutra = currentSutra.value
  if (!sutra) return []
  
  const content = sutra.chapters[0].content
  
  // 构建内容片段
  const segments = []
  const matches = findMatches(trie.value, content)
  const filteredMatches = removeOverlaps(matches)
  
  let lastIndex = 0
  filteredMatches.forEach(match => {
    // 添加非匹配部分
    if (match.start > lastIndex) {
      const text = content.slice(lastIndex, match.start)
      segments.add(showPinyin.value ? addPinyinAnnotation(text) : text)
    }
    
    // 添加匹配部分（词典高亮）
    const highlighted = `<span class="dictionary-term" data-term="${match.term}">${match.term}</span>`
    segments.add(showPinyin.value ? addPinyinAnnotation(highlighted) : highlighted)
    
    lastIndex = match.end
  })
  
  // 添加剩余部分
  if (lastIndex < content.length) {
    const text = content.slice(lastIndex)
    segments.add(showPinyin.value ? addPinyinAnnotation(text) : text)
  }
  
  return segments
})

// 点击词典词条
const handleTermClick = (e) => {
  const target = e.target.closest('.dictionary-term')
  if (target) {
    const term = target.dataset.term
    const data = dictionary.find(d => d.term === term)
    
    selectedTerm.value = data
    popupPosition.value = {
      top: e.target.offsetTop,
      left: e.target.offsetLeft
    }
  }
}

// TTS 控制
const toggleTTS = () => {
  if (isPlaying.value) {
    ttsEngine.pause()
  } else {
    const text = currentSutra.value.chapters[0].content
    ttsEngine.speak(text, {
      rate: settings.ttsSpeed,
      onSentence: (data) => {
        // 句子高亮逻辑
      }
    })
  }
  isPlaying.value = !isPlaying.value
}

// 滚动处理
const handleScroll = () => {
  if (contentRef.value) {
    const position = contentRef.value.scrollTop
    progress.setScrollPosition(position)
  }
}

const goBack = () => {
  router.back()
}

const closePopup = () => {
  selectedTerm.value = null
}

const handleFontSizeChange = (value) => {
  settings.setFontSize(value)
}

// 初始化
onMounted(() => {
  // 构建 Trie 树
  trie.value = buildTrie(dictionary)
  
  // 加载进度
  if (contentRef.value) {
    contentRef.value.scrollTop = progress.scrollPosition
  }
  
  // 监听点击事件
  contentRef.value?.addEventListener('click', handleTermClick)
})

onUnmounted(() => {
  ttsEngine.stop()
  contentRef.value?.removeEventListener('click', handleTermClick)
})
</script>

<style scoped lang="scss">
.reader {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: $bg-page;
}

.reader-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-md;
  background: $bg-card;
  box-shadow: $shadow-sm;
}

.sutra-title {
  font-size: $font-size-lg;
  font-weight: 600;
}

.reader-content {
  flex: 1;
  overflow-y: auto;
  padding: $spacing-lg;
  scroll-behavior: smooth;
}

.chapter-content {
  max-width: 800px;
  margin: 0 auto;
}

.content-segment {
  font-size: v-bind(fontSize + 'px');
  line-height: 1.8;
  margin-bottom: $spacing-md;
  color: $text-primary;
}

.dictionary-term {
  background: $accent-color;
  cursor: pointer;
  padding: 0 4px;
  border-radius: 4px;
  transition: background 0.2s;
  
  &:hover {
    background: $secondary-color;
  }
}

.reader-footer {
  padding: $spacing-md;
  background: $bg-card;
  box-shadow: $shadow-sm;
}

.toolbar {
  display: flex;
  justify-content: space-around;
}

.tool-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-xs;
  color: $text-secondary;
  
  &:hover {
    color: $primary-color;
  }
}

.font-settings {
  padding: $spacing-lg;
}

.font-size-preview {
  text-align: center;
  margin-top: $spacing-lg;
}

// 深色模式
:global(.dark) {
  .reader {
    background: #1A1A1A;
  }
  
  .reader-header,
  .reader-footer {
    background: #2A2A2A;
  }
  
  .content-segment {
    color: #E0E0E0;
  }
  
  .dictionary-term {
    background: #4A4A4A;
  }
}
</style>
```

##### 任务 3.3：创建词典弹窗组件

**文件：** `src/components/DictionaryPopup.vue`
```vue
<template>
  <Teleport to="body">
    <!-- 手机端：底部抽屉 -->
    <van-popup
      v-if="isMobile"
      v-model:show="show"
      position="bottom"
      :style="{ height: '60%' }"
      round
    >
      <div class="dict-drawer">
        <div class="drawer-header">
          <h3 class="term-title">{{ term.term }}</h3>
          <button class="close-btn" @click="close">
            <van-icon name="cross" />
          </button>
        </div>
        <div class="drawer-content">
          <div class="pronunciation">
            <span class="pinyin">{{ term.pinyin }}</span>
            <span class="sanskrit" v-if="term.sanskrit">{{ term.sanskrit }}</span>
          </div>
          <div class="definition">
            <h4>释义</h4>
            <p>{{ term.definition }}</p>
          </div>
          <div class="actions">
            <van-button size="small" @click="playAudio">
              <van-icon name="volume-o" /> 播放读音
            </van-button>
            <van-button size="small" @click="addToNotes">
              <van-icon name="bookmark-o" /> 添加笔记
            </van-button>
          </div>
        </div>
      </div>
    </van-popup>
    
    <!-- 平板端：气泡弹窗 -->
    <div
      v-else-if="isTablet"
      v-show="show"
      class="dict-bubble"
      :style="{ top: position.top + 'px', left: position.left + 'px' }"
    >
      <div class="bubble-content">
        <h4 class="term-title">{{ term.term }}</h4>
        <p class="pinyin">{{ term.pinyin }}</p>
        <p class="definition">{{ term.definition }}</p>
        <div class="bubble-actions">
          <button @click="playAudio">播放</button>
          <button @click="addToNotes">笔记</button>
          <button @click="searchRelated">搜索</button>
        </div>
      </div>
    </div>
    
    <!-- PC端：侧边面板 -->
    <div
      v-else
      v-show="show"
      class="dict-sidebar"
    >
      <div class="sidebar-header">
        <h3>{{ term.term }}</h3>
        <button class="close-btn" @click="close">×</button>
      </div>
      <div class="sidebar-content">
        <div class="info-section">
          <label>拼音</label>
          <p>{{ term.pinyin }}</p>
        </div>
        <div class="info-section" v-if="term.sanskrit">
          <label>梵文</label>
          <p>{{ term.sanskrit }}</p>
        </div>
        <div class="info-section">
          <label>释义</label>
          <p>{{ term.definition }}</p>
        </div>
        <div class="info-section" v-if="term.category">
          <label>分类</label>
          <p>{{ term.category }}</p>
        </div>
        <div class="sidebar-actions">
          <button @click="playAudio">播放读音</button>
          <button @click="addToNotes">添加笔记</button>
          <button @click="searchRelated">搜索相关</button>
          <button @click="share">分享</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useWindowSize } from '@vueuse/core'

const props = defineProps({
  term: Object,
  position: Object
})

const emit = defineEmits(['close'])

const { width } = useWindowSize()
const show = computed(() => !!props.term)

const isMobile = computed(() => width.value < 768)
const isTablet = computed(() => width.value >= 768 && width.value < 1024)

const close = () => {
  emit('close')
}

const playAudio = () => {
  // 使用 Web Speech API 播放读音
}

const addToNotes = () => {
  // 添加笔记逻辑
}

const searchRelated = () => {
  // 搜索相关词条
}

const share = () => {
  // 分享逻辑
}
</script>

<style scoped lang="scss">
// 手机端抽屉样式
.dict-drawer {
  padding: $spacing-lg;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $spacing-lg;
}

.term-title {
  font-size: $font-size-xl;
  font-weight: 600;
}

.pronunciation {
  display: flex;
  gap: $spacing-md;
  margin-bottom: $spacing-md;
}

.pinyin {
  font-size: $font-size-lg;
  color: $primary-color;
  font-weight: 500;
}

.sanskrit {
  color: $text-secondary;
  font-style: italic;
}

.definition {
  margin-bottom: $spacing-lg;
  
  h4 {
    font-size: $font-size-sm;
    color: $text-secondary;
    margin-bottom: $spacing-sm;
  }
  
  p {
    line-height: 1.8;
  }
}

.actions {
  display: flex;
  gap: $spacing-md;
}

// 平板端气泡样式
.dict-bubble {
  position: absolute;
  width: 300px;
  background: $bg-card;
  border-radius: $radius-md;
  box-shadow: $shadow-lg;
  padding: $spacing-lg;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.bubble-content {
  text-align: center;
}

.bubble-actions {
  display: flex;
  justify-content: center;
  gap: $spacing-sm;
  margin-top: $spacing-md;
}

// PC端侧边栏样式
.dict-sidebar {
  position: fixed;
  right: 0;
  top: 0;
  width: 400px;
  height: 100vh;
  background: $bg-card;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.1);
  padding: $spacing-lg;
  z-index: 1000;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: $spacing-md;
  border-bottom: 1px solid $bg-page;
  margin-bottom: $spacing-lg;
}

.close-btn {
  font-size: 24px;
  color: $text-secondary;
  cursor: pointer;
  
  &:hover {
    color: $primary-color;
  }
}

.info-section {
  margin-bottom: $spacing-lg;
  
  label {
    display: block;
    font-size: $font-size-sm;
    color: $text-secondary;
    margin-bottom: $spacing-xs;
  }
  
  p {
    font-size: $font-size-md;
    line-height: 1.6;
  }
}

.sidebar-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: $spacing-md;
  margin-top: $spacing-xl;
}
</style>
```

---

## 5. 详细任务拆解

### 5.1 项目初始化（1-2 天）

| 任务 ID | 任务名称 | 预估时间 | 依赖 | 输出 |
|---------|---------|---------|------|------|
| 1.1.1 | 创建项目目录结构 | 0.5h | - | 完整目录树 |
| 1.1.2 | 安装依赖包 | 0.5h | 1.1.1 | package.json |
| 1.1.3 | 配置 Vite | 0.5h | 1.1.2 | vite.config.js |
| 1.1.4 | 配置 ESLint | 0.5h | 1.1.2 | .eslintrc.js |
| 1.1.5 | 配置 SCSS | 0.5h | 1.1.3 | vite.config.js |
| 1.2.1 | 创建 variables.scss | 0.5h | 1.1.5 | 变量文件 |
| 1.2.2 | 创建 reset.scss | 0.5h | 1.1.5 | 重置样式 |
| 1.2.3 | 创建 global.scss | 0.5h | 1.2.1 | 全局样式 |
| 1.3.1 | 配置 Vue Router | 1h | 1.1.2 | router/index.js |
| 1.3.2 | 创建路由页面占位符 | 0.5h | 1.3.1 | 3 个页面文件 |
| 1.4.1 | 创建 settings store | 1h | 1.1.2 | stores/settings.js |
| 1.4.2 | 创建 progress store | 0.5h | 1.1.2 | stores/progress.js |
| 1.4.3 | 创建 theme store | 0.5h | 1.1.2 | stores/theme.js |
| 1.5.1 | 配置 main.js | 0.5h | 1.3.1, 1.4.1 | main.js |
| 1.5.2 | 创建 App.vue | 0.5h | 1.5.1 | App.vue |

### 5.2 核心算法开发（2-3 天）

| 任务 ID | 任务名称 | 预估时间 | 依赖 | 输出 |
|---------|---------|---------|------|------|
| 2.1.1 | 实现 TrieNode 类 | 0.5h | - | utils/trie.js |
| 2.1.2 | 实现 buildTrie 函数 | 1h | 2.1.1 | utils/trie.js |
| 2.1.3 | 实现 findMatches 函数 | 1h | 2.1.2 | utils/trie.js |
| 2.1.4 | 实现 removeOverlaps 函数 | 0.5h | 2.1.3 | utils/trie.js |
| 2.1.5 | 编写 Trie 树单元测试 | 1h | 2.1.4 | tests/trie.test.js |
| 2.2.1 | 实现 TTSEngine 类 | 1h | - | utils/tts.js |
| 2.2.2 | 实现 speak 方法 | 1h | 2.2.1 | utils/tts.js |
| 2.2.3 | 实现播放控制方法 | 0.5h | 2.2.2 | utils/tts.js |
| 2.2.4 | 添加句子回调功能 | 0.5h | 2.2.3 | utils/tts.js |
| 2.3.1 | 定义 pronunciationMap | 1h | - | utils/pronunciation.js |
| 2.3.2 | 实现 getPronunciation 函数 | 0.5h | 2.3.1 | utils/pronunciation.js |
| 2.3.3 | 实现 addPinyinAnnotation 函数 | 1h | 2.3.2 | utils/pronunciation.js |

### 5.3 页面组件开发（3-4 天）

| 任务 ID | 任务名称 | 预估时间 | 依赖 | 输出 |
|---------|---------|---------|------|------|
| 3.1.1 | 创建 BookCard 组件 | 1h | 1.2.3 | components/BookCard.vue |
| 3.1.2 | 创建书架页面结构 | 1h | 3.1.1, 1.3.1 | pages/Bookshelf.vue |
| 3.1.3 | 实现搜索功能 | 0.5h | 3.1.2 | pages/Bookshelf.vue |
| 3.1.4 | 实现响应式网格布局 | 1h | 3.1.2 | pages/Bookshelf.vue |
| 3.1.5 | 添加进度显示 | 0.5h | 3.1.4 | pages/Bookshelf.vue |
| 3.2.1 | 创建 ReaderContent 组件 | 1h | 1.2.3 | components/ReaderContent.vue |
| 3.2.2 | 创建阅读页面结构 | 1h | 3.2.1, 1.3.1 | pages/Reader.vue |
| 3.2.3 | 集成 Trie 树高亮 | 1h | 2.1.4, 3.2.2 | pages/Reader.vue |
| 3.2.4 | 集成 TTS 播放 | 1h | 2.2.4, 3.2.3 | pages/Reader.vue |
| 3.2.5 | 实现字号调整 | 0.5h | 3.2.4, 1.4.1 | pages/Reader.vue |
| 3.2.6 | 实现拼音标注切换 | 0.5h | 3.2.5, 2.3.3 | pages/Reader.vue |
| 3.2.7 | 实现滚动位置保存 | 0.5h | 3.2.6, 1.4.2 | pages/Reader.vue |
| 3.3.1 | 创建手机端抽屉样式 | 1h | 1.2.3 | components/DictionaryPopup.vue |
| 3.3.2 | 创建平板端气泡样式 | 1h | 3.3.1 | components/DictionaryPopup.vue |
| 3.3.3 | 创建 PC 端侧边栏样式 | 1h | 3.3.2 | components/DictionaryPopup.vue |
| 3.3.4 | 添加动作按钮功能 | 1h | 3.3.3 | components/DictionaryPopup.vue |

### 5.4 数据文件准备（0.5 天）

| 任务 ID | 任务名称 | 预估时间 | 依赖 | 输出 |
|---------|---------|---------|------|------|
| 4.1.1 | 准备经书数据 | 1h | - | data/sutras.js |
| 4.1.2 | 准备词典数据 | 2h | - | data/dictionary.js |
| 4.1.3 | 准备读音映射表 | 1h | - | data/pronunciation-map.js |

### 5.5 测试与优化（1-2 天）

| 任务 ID | 任务名称 | 预估时间 | 依赖 | 输出 |
|---------|---------|---------|------|------|
| 5.1.1 | 单元测试编写 | 2h | 2.1.5, 2.2.4 | tests/ |
| 5.1.2 | 组件测试编写 | 1h | 3.3.4 | tests/components/ |
| 5.2.1 | 响应式适配测试 | 2h | 3.3.4 | 测试报告 |
| 5.2.2 | 跨浏览器测试 | 2h | 3.3.4 | 测试报告 |
| 5.2.3 | 性能优化 | 2h | 5.2.2 | 优化报告 |
| 5.3.1 | 构建生产版本 | 0.5h | 5.2.3 | dist/ |
| 5.3.2 | 部署到 Vercel | 0.5h | 5.3.1 | 生产 URL |

---

## 6. 代码规范

### 6.1 Vue 组件规范

```vue
<script setup>
// 1. 导入语句（按类型排序）
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import ComponentA from '@/components/ComponentA.vue'
import { useStore } from '@/stores/store'

// 2. Props 和 Emits 定义
const props = defineProps({
  title: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['update', 'close'])

// 3. 响应式变量声明
const count = ref(0)
const isVisible = ref(false)

// 4. 计算属性
const doubleCount = computed(() => count.value * 2)

// 5. 方法定义
const increment = () => {
  count.value++
}

const handleClose = () => {
  emit('close')
}

// 6. 生命周期钩子
onMounted(() => {
  console.log('Component mounted')
})

onUnmounted(() => {
  console.log('Component unmounted')
})
</script>

<template>
  <div class="component">
    <h1>{{ title }}</h1>
    <p>Count: {{ count }}</p>
    <button @click="increment">Increment</button>
  </div>
</template>

<style scoped lang="scss">
.component {
  padding: 16px;
  
  h1 {
    color: $primary-color;
  }
}
</style>
```

### 6.2 JavaScript 规范

```javascript
// 1. 使用 const/let，避免 var
const MAX_SIZE = 100
let currentIndex = 0

// 2. 使用模板字符串
const message = `Hello, ${name}!`

// 3. 使用箭头函数
const calculate = (a, b) => a + b

// 4. 解构赋值
const { firstName, lastName } = user
const [first, second] = array

// 5. 数组方法
const filtered = array.filter(item => item.active)
const mapped = array.map(item => item.value)
const reduced = array.reduce((acc, curr) => acc + curr, 0)

// 6. 可选链和空值合并
const value = obj?.prop?.nested
const result = value ?? defaultValue
```

### 6.3 CSS/SCSS 规范

```scss
// 1. 使用 SCSS 变量
.container {
  width: $container-width;
  padding: $spacing-md;
}

// 2. 使用嵌套（避免过深）
.card {
  &__header {
    font-size: $font-size-lg;
    
    &--active {
      color: $primary-color;
    }
  }
}

// 3. 使用 mixin
@include mobile {
  .grid {
    grid-template-columns: 1fr;
  }
}

// 4. 避免使用 !important
// 错误：
// .element {
//   color: red !important;
// }

// 正确：
// .element {
//   &.important {
//     color: red;
//   }
// }
```

### 6.4 Git 提交规范

```bash
# 格式：<type>(<scope>): <subject>

# type 类型：
# feat: 新功能
# fix: 修复 bug
# docs: 文档更新
# style: 代码格式调整
# refactor: 重构
# perf: 性能优化
# test: 测试相关
# chore: 构建/工具相关

# 示例：
git commit -m "feat(reader): add TTS playback feature"
git commit -m "fix(trie): resolve overlap removal bug"
git commit -m "docs(readme): update installation guide"
```

---

## 7. 测试策略

### 7.1 单元测试

使用 Vitest 进行单元测试：

```javascript
// tests/trie.test.js
import { describe, it, expect } from 'vitest'
import { buildTrie, findMatches, removeOverlaps } from '@/utils/trie'

describe('Trie Tree', () => {
  it('should build trie from dictionary', () => {
    const dictionary = [
      { term: '般若', definition: '智慧' },
      { term: '般若波罗蜜多', definition: '圆满智慧' }
    ]
    const trie = buildTrie(dictionary)
    expect(trie).toBeDefined()
  })
  
  it('should find matches in text', () => {
    const dictionary = [{ term: '般若', definition: '智慧' }]
    const trie = buildTrie(dictionary)
    const matches = findMatches(trie, '般若波罗蜜多心经')
    expect(matches).toHaveLength(1)
    expect(matches[0].term).toBe('般若')
  })
  
  it('should remove overlapping matches', () => {
    const matches = [
      { start: 0, end: 2, term: '般若' },
      { start: 0, end: 6, term: '般若波罗蜜多' }
    ]
    const result = removeOverlaps(matches)
    expect(result).toHaveLength(1)
    expect(result[0].term).toBe('般若波罗蜜多')
  })
})
```

### 7.2 组件测试

```javascript
// tests/components/BookCard.spec.js
import { mount } from '@vue/test-utils'
import BookCard from '@/components/BookCard.vue'

describe('BookCard', () => {
  it('renders sutra title', () => {
    const wrapper = mount(BookCard, {
      props: {
        sutra: {
          title: '心经',
          translator: '唐三藏法师玄奘译'
        }
      }
    })
    expect(wrapper.text()).toContain('心经')
  })
  
  it('emits click event', async () => {
    const wrapper = mount(BookCard, {
      props: {
        sutra: { title: '心经' }
      }
    })
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
  })
})
```

### 7.3 E2E 测试

使用 Playwright 进行 E2E 测试：

```javascript
// tests/e2e/reader.spec.js
import { test, expect } from '@playwright/test'

test('reader page navigation', async ({ page }) => {
  await page.goto('/')
  await page.click('.book-card:first-child')
  await expect(page).toHaveURL(/\/reader\/.+/)
})

test('dictionary popup display', async ({ page }) => {
  await page.goto('/reader/xin-jing')
  await page.click('.dictionary-term')
  await expect(page.locator('.dict-drawer')).toBeVisible()
})
```

### 7.4 响应式测试清单

| 设备类型 | 分辨率 | 测试项 |
|---------|-------|-------|
| 📱 手机竖屏 | 375 × 812 | 布局、触摸、抽屉 |
| 📱 手机横屏 | 667 × 375 | 布局、导航 |
| 💻 平板竖屏 | 768 × 1024 | 2 列布局、气泡 |
| 💻 平板横屏 | 1024 × 768 | 3 列布局 |
| 🖥️ PC | 1920 × 1080 | 4 列布局、侧边栏 |

### 7.5 跨浏览器测试

| 浏览器 | 版本 | 测试优先级 |
|-------|------|-----------|
| Chrome | 最新 | P0 |
| Safari | 最新 | P0 |
| Firefox | 最新 | P1 |
| Edge | 最新 | P1 |

---

## 8. 部署流程

### 8.1 本地构建

```bash
# 安装依赖
npm install

# 本地开发
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

### 8.2 部署到 Vercel

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录 Vercel
vercel login

# 部署
vercel --prod
```

### 8.3 环境变量配置

```bash
# .env.production
VITE_APP_TITLE=般若佛经阅读器
VITE_APP_VERSION=1.0.0
```

### 8.4 部署检查清单

- [ ] 代码 Lint 通过
- [ ] 单元测试通过
- [ ] E2E 测试通过
- [ ] 响应式适配测试通过
- [ ] 跨浏览器测试通过
- [ ] 构建成功（无错误）
- [ ] 生产版本预览正常
- [ ] 环境变量配置正确
- [ ] CDN 资源加载正常
- [ ] SEO 元标签完整

---

## 9. 附录

### 9.1 快捷命令参考

```bash
# 开发
npm run dev              # 启动开发服务器
npm run build            # 构建生产版本
npm run preview          # 预览生产构建
npm run lint             # 运行 ESLint
npm run test             # 运行测试

# Git
git add .
git commit -m "feat: add feature"
git push origin main

# Vercel
vercel                  # 部署预览
vercel --prod           # 部署生产
```

### 9.2 常见问题

**Q: Trie 树匹配性能如何优化？**
A: 使用 Web Worker 构建词典，避免阻塞主线程；缓存构建结果到 IndexedDB。

**Q: TTS 在 iOS Safari 上不工作？**
A: 需要用户交互后才能播放音频；在点击事件中初始化 TTS 引擎。

**Q: 如何处理超长文本的虚拟滚动？**
A: 使用 `vue-virtual-scroller` 插件，仅渲染可见区域的 DOM 节点。

**Q: 夜间模式字体颜色不明显？**
A: 确保使用 CSS 变量，在深色模式下覆盖变量值：
```scss
:global(.dark) {
  --text-primary: #E0E0E0;
  --bg-page: #1A1A1A;
}
```

### 9.3 参考资源

- [Vue 3 官方文档](https://vuejs.org/)
- [Vite 官方文档](https://vitejs.dev/)
- [Pinia 官方文档](https://pinia.vuejs.org/)
- [Vant 4 官方文档](https://vant-ui.github.io/vant/)
- [Web Speech API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [SCSS 文档](https://sass-lang.com/)

---

**文档维护说明**：
- 本文档随项目进展持续更新
- 重大变更需记录变更日志
- 每完成一个阶段需更新任务状态
- 发现问题及时反馈并修正文档
