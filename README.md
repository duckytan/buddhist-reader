# 般若佛经阅读器 🧘

> 禅意留白 · 专注诵读 · 温暖极简

一款禅意风格的佛经阅读器，支持多终端适配（手机/平板/PC），提供沉浸式的阅读体验。

## ✨ 核心功能

- 📚 **书架管理** - 5部经典佛经（心经、地藏经、阿弥陀经、金刚经、观音经）
- 🔍 **词典高亮** - 点击高亮术语查看释义，支持50+佛教术语
- 🎧 **TTS朗读** - 基于 Web Speech API 的语音朗读，可调速度
- 📝 **拼音标注** - 佛教术语专属读音标注（般若、菩萨、南无等）
- 🌓 **主题切换** - 日间/夜间模式，护眼阅读
- 📖 **阅读进度** - 自动保存阅读进度
- 📱 **多终端适配** - 完美适配手机、平板、PC

## 🎨 设计理念

- **禅意留白** - 极简设计，专注内容
- **温暖色调** - 宣纸白、墨黑、金黄，营造宁静氛围
- **流畅体验** - 无干扰动画，纯净阅读环境

## 🛠️ 技术栈

- **前端框架**: Vue 3 + Composition API
- **构建工具**: Vite 5
- **UI 组件**: Vant 4
- **状态管理**: Pinia
- **路由**: Vue Router 4
- **样式**: SCSS + CSS 变量
- **TTS**: Web Speech API

## 📁 项目结构

```
src/
├── assets/
│   └── styles/
│       ├── variables.scss    # 设计系统变量
│       ├── reset.scss        # 全局重置
│       └── global.scss       # 全局样式
├── components/              # 可复用组件
│   ├── BookCard.vue         # 佛经卡片
│   ├── ReaderContent.vue    # 阅读内容
│   ├── DictionaryPopup.vue   # 词典弹窗（多终端）
│   ├── AudioPlayer.vue      # TTS播放器
│   └── ThemeToggle.vue      # 主题切换
├── pages/                   # 页面组件
│   ├── Bookshelf.vue        # 书架页
│   ├── Reader.vue           # 阅读页
│   └── Settings.vue         # 设置页
├── stores/                  # Pinia 状态管理
│   ├── settings.js          # 用户设置
│   ├── progress.js          # 阅读进度
│   └── theme.js             # 主题状态
├── utils/                   # 工具函数
│   ├── trie.js             # Trie树算法
│   ├── tts.js              # TTS引擎
│   ├── pronunciation.js    # 拼音标注
│   └── storage.js          # localStorage封装
└── data/                    # 数据文件
    ├── sutras.js           # 佛经数据（5部）
    ├── dictionary.js       # 词典（50+术语）
    └── pronunciation-map.js # 读音映射
```

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 构建生产版本

```bash
npm run build
```

### 预览生产构建

```bash
npm run preview
```

## 📖 功能使用

### 书架页
- 浏览5部经典佛经
- 查看阅读进度
- 点击进入阅读

### 阅读页
- 点击高亮术语查看释义
- 使用底部播放器 TTS 朗读
- 调整字体大小（14-28px）
- 切换拼音标注
- 切换日间/夜间主题

### 设置页
- 调整字体大小
- 开关拼音标注
- 调整 TTS 速度（0.5x-2.0x）
- 切换深色模式
- 清除缓存

## 🎯 核心算法

### Trie树匹配
- O(n) 时间复杂度的词典匹配
- 长词优先策略
- 自动处理重叠匹配

### 多终端弹窗
- **手机** (< 768px): 底部抽屉（60%高度）
- **平板** (768-1024px): 智能气泡定位
- **PC** (> 1024px): 右侧侧边栏（400px宽度）

### TTS引擎
- 基于 Web Speech API
- 支持速度调节（0.5x-2.0x）
- 自动选择中文语音

## 📝 开发日志

### 2026-04-26
- ✅ 完成项目初始化
- ✅ 创建完整的项目结构
- ✅ 实现所有核心组件
- ✅ 实现 Pinia 状态管理
- ✅ 实现 Trie 树词典匹配
- ✅ 实现 TTS 语音朗读
- ✅ 实现拼音标注功能
- ✅ 实现多终端适配
- ✅ 实现主题切换

## 🎨 设计系统

参考 [docs/DESIGN.md](docs/DESIGN.md) 获取完整设计规范

### 色彩
```scss
--primary-color: #FF6B35    // 赤褐色
--highlight-bg: #FFF3CD     // 金黄
--bg-page: #F5F5F5          // 宣纸白
--bg-card: #FFFFFF           // 纯白
--text-primary: #333333      // 墨黑
```

### 排版
```scss
--font-heading: 'Source Han Serif CN', serif
--font-body: 'Source Han Sans CN', sans-serif
--line-height-loose: 1.8     // 经文行高
```

## 📄 License

MIT

## 🙏 致谢

- 佛教经典数据来源：CBETA
- 设计灵感：Notion、Linear、Ollama
- 技术栈：Vue.js、Vite、Vant

---

**般若佛经阅读器** - 让阅读回归本真，让心灵归于宁静 🙏
