# 项目结构说明

## 📁 完整目录结构

```
AI-buddhist-reader/                    # 项目根目录
├── src/                              # 源代码目录
│   ├── assets/                       # 静态资源
│   │   └── styles/                   # 样式文件
│   │       ├── variables.scss        # SCSS 变量（色彩、字体、间距）
│   │       ├── reset.scss            # 全局重置
│   │       └── global.scss           # 全局样式
│   ├── components/                    # 可复用组件
│   │   ├── BookCard.vue              # 佛经卡片
│   │   ├── ReaderContent.vue         # 阅读内容 + 词典高亮
│   │   ├── DictionaryPopup.vue       # 多终端词典弹窗
│   │   ├── AudioPlayer.vue           # TTS 播放器
│   │   └── ThemeToggle.vue           # 主题切换
│   ├── pages/                         # 页面组件
│   │   ├── Bookshelf.vue             # 书架页
│   │   ├── Reader.vue                # 阅读页
│   │   └── Settings.vue              # 设置页
│   ├── stores/                        # Pinia 状态管理
│   │   ├── settings.js               # 用户设置（字体、TTS、拼音）
│   │   ├── progress.js               # 阅读进度
│   │   └── theme.js                  # 主题状态
│   ├── utils/                         # 工具函数
│   │   ├── trie.js                   # Trie 树算法
│   │   ├── tts.js                    # TTS 引擎
│   │   ├── pronunciation.js          # 拼音标注
│   │   └── storage.js                # localStorage 封装
│   ├── data/                          # 数据文件
│   │   ├── sutras.js                 # 5部经典佛经
│   │   ├── dictionary.js             # 50+ 佛教术语
│   │   └── pronunciation-map.js      # 多音字读音映射
│   ├── router/                        # 路由配置
│   │   └── index.js                  # 路由定义
│   ├── App.vue                        # 根组件
│   └── main.js                        # 应用入口
├── docs/                             # 项目文档
│   ├── README.md                     # 文档索引
│   ├── DEVELOPMENT_LOG.md            # 开发日志
│   ├── DEVELOPMENT_GUIDE.md          # 开发指南
│   ├── CHECKLIST.md                  # 检查清单
│   ├── ACCEPTANCE.md                 # 验收标准
│   ├── DESIGN.md                     # 设计系统
│   └── package.json                  # 依赖版本记录
├── reference/                        # 参考资料（不部署）
│   ├── README.md                     # 资料索引
│   ├── docs/                         # 设计文档
│   │   ├── DESIGN-BUDDHIST-READER.md  # 详细设计规范
│   │   ├── V5_DEVELOPMENT_PLAN.md    # V5 开发计划
│   │   ├── CODEBUDDY.md              # AI 助手指导
│   │   └── project-architecture.mdc  # 项目架构
│   ├── prototypes/                   # UI 原型
│   │   ├── mobile/                   # 手机端原型
│   │   ├── tablet/                   # 平板端原型
│   │   └── desktop/                  # PC端原型
│   ├── knowledge/                    # 研究资料
│   │   ├── 竞品分析/
│   │   ├── 调研笔记/
│   │   └── 唐密/
│   ├── data/                         # 原始数据
│   ├── skills/                       # 技能文件
│   ├── linear.app/                   # Linear 配置
│   ├── ollama/                       # Ollama 配置
│   └── reference/                    # 旧参考代码
├── dist-production/                  # 部署备份（不部署）
├── index.html                        # HTML 入口
├── package.json                      # 项目配置
├── package-lock.json                  # 依赖锁定
├── vite.config.js                    # Vite 配置
├── vercel.json                       # Vercel 配置
├── .gitignore                        # Git 忽略配置
├── README.md                         # 项目说明
├── DEPLOYMENT.md                     # 部署指南
└── PROJECT_STRUCTURE.md              # 本文档
```

## 🎯 上传到 GitHub 的文件

### 必须上传的文件

```
AI-buddhist-reader/
├── src/                              ✅ 源代码
├── docs/                             ✅ 项目文档
├── public/                           ✅ 静态资源（如有）
├── index.html                        ✅
├── package.json                      ✅
├── vite.config.js                    ✅
├── vercel.json                       ✅
├── .gitignore                        ✅
├── README.md                         ✅
└── DEPLOYMENT.md                     ✅
```

### 不需要上传的文件

```
AI-buddhist-reader/
├── reference/                        ❌ 参考资料（.gitignore）
├── dist-production/                  ❌ 部署备份（.gitignore）
├── node_modules/                     ❌ 依赖包（.gitignore）
├── dist/                             ❌ 构建输出（.gitignore）
├── package-lock.json                 ⚠️ 可选上传
└── *.log                             ❌ 日志文件（.gitignore）
```

## 📊 文件统计

### 生产代码
- Vue 组件：8 个
- JavaScript 文件：12 个（包括 stores、utils、data、router）
- SCSS 文件：3 个
- 总计：~2,000 行代码

### 文档
- Markdown 文件：8 个
- 总计：~3,000 行文档

### 参考资料（reference/）
- 文件总数：3,342 个
- TypeScript：1,148 个
- JavaScript：841 个
- CSS：205 个
- Markdown：208 个

## 🔄 文件依赖关系

```
index.html
    ↓
main.js
    ↓
App.vue
    ↓
Router (Bookshelf / Reader / Settings)
    ↓
Components (BookCard / ReaderContent / DictionaryPopup / AudioPlayer / ThemeToggle)
    ↓
Stores (Settings / Progress / Theme)
    ↓
Utils (Trie / TTS / Pronunciation / Storage)
    ↓
Data (Sutras / Dictionary / PronunciationMap)
```

## 📝 文件命名规范

### 组件
- **PascalCase**: `BookCard.vue`, `ReaderContent.vue`

### 工具函数
- **camelCase**: `trie.js`, `tts.js`, `pronunciation.js`

### 状态管理
- **camelCase**: `settings.js`, `progress.js`, `theme.js`

### 数据文件
- **kebab-case**: `sutras.js`, `dictionary.js`, `pronunciation-map.js`

### 样式文件
- **kebab-case**: `variables.scss`, `reset.scss`, `global.scss`

## 🎨 设计系统文件

- **variables.scss** - 定义所有 CSS 变量（色彩、字体、间距、阴影等）
- **reset.scss** - 浏览器样式重置
- **global.scss** - 全局样式和响应式断点

## 📚 文档文件说明

- **DEVELOPMENT_GUIDE.md** - 43个开发任务，分5个阶段
- **CHECKLIST.md** - 200+ 检查项，确保质量
- **ACCEPTANCE.md** - 验收标准和测试脚本
- **DEVELOPMENT_LOG.md** - 每日开发进度记录
- **DESIGN.md** - 完整的设计系统规范
- **DEPLOYMENT.md** - 部署到 Vercel 的完整指南

## 🔧 配置文件说明

- **package.json** - 项目依赖和脚本
- **vite.config.js** - Vite 构建工具配置
- **vercel.json** - Vercel 部署配置
- **.gitignore** - Git 忽略文件规则

## 🚀 部署流程

1. 本地测试构建：`npm run build`
2. 推送到 GitHub
3. Vercel 自动检测并部署
4. 部署产物在 `dist/` 目录（自动生成）

## 💡 提示

- `reference/` 目录包含大量参考资料，已通过 `.gitignore` 排除
- `dist-production/` 用于本地测试部署，不需要上传
- 所有文档都在 `docs/` 目录，便于查阅
- 源代码在 `src/` 目录，结构清晰，易于维护
