# ✅ 般若佛经阅读器 - 详细检查清单

> **文档版本**: v1.0  
> **创建日期**: 2026-04-25  
> **最后更新**: 2026-04-25  
> **适用阶段**: MVP 开发（基于 v2 架构）

---

## 📋 目录

- [1. 项目初始化检查](#1-项目初始化检查)
- [2. 核心算法检查](#2-核心算法检查)
- [3. 页面组件检查](#3-页面组件检查)
- [4. 数据文件检查](#4-数据文件检查)
- [5. 测试检查](#5-测试检查)
- [6. 部署检查](#6-部署检查)
- [7. 性能检查](#7-性能检查)
- [8. 兼容性检查](#8-兼容性检查)

---

## 1. 项目初始化检查

### 1.1 目录结构

- [ ] `src/assets/styles/` 目录已创建
  - [ ] `variables.scss` 文件存在
  - [ ] `reset.scss` 文件存在
  - [ ] `global.scss` 文件存在

- [ ] `src/components/` 目录已创建
  - [ ] `BookCard.vue` 文件存在
  - [ ] `ReaderContent.vue` 文件存在
  - [ ] `DictionaryPopup.vue` 文件存在
  - [ ] `AudioPlayer.vue` 文件存在
  - [ ] `ThemeToggle.vue` 文件存在

- [ ] `src/pages/` 目录已创建
  - [ ] `Bookshelf.vue` 文件存在
  - [ ] `Reader.vue` 文件存在
  - [ ] `Settings.vue` 文件存在

- [ ] `src/stores/` 目录已创建
  - [ ] `settings.js` 文件存在
  - [ ] `progress.js` 文件存在
  - [ ] `theme.js` 文件存在

- [ ] `src/router/` 目录已创建
  - [ ] `index.js` 文件存在

- [ ] `src/utils/` 目录已创建
  - [ ] `trie.js` 文件存在
  - [ ] `tts.js` 文件存在
  - [ ] `pronunciation.js` 文件存在
  - [ ] `storage.js` 文件存在

- [ ] `src/data/` 目录已创建
  - [ ] `sutras.js` 文件存在
  - [ ] `dictionary.js` 文件存在
  - [ ] `pronunciation-map.js` 文件存在

### 1.2 依赖安装

- [ ] `package.json` 文件存在
- [ ] `node_modules` 目录已安装
- [ ] 核心依赖已安装：
  - [ ] `vue@^3.4.0`
  - [ ] `vue-router@^4.2.0`
  - [ ] `pinia@^2.1.0`
  - [ ] `vant@^4.8.0`
  - [ ] `@vueuse/core@^10.7.0`
  - [ ] `sass@^1.69.0`

### 1.3 配置文件

- [ ] `vite.config.js` 文件存在
  - [ ] Vue 插件已配置
  - [ ] 路径别名 `@` 已配置
  - [ ] SCSS 预处理器已配置

- [ ] `.eslintrc.js` 文件存在
  - [ ] Vue 插件已配置
  - [ ] 规则已设置

- [ ] `.gitignore` 文件存在
  - [ ] `node_modules/` 已忽略
  - [ ] `dist/` 已忽略
  - [ ] `.env.local` 已忽略

### 1.4 样式文件

#### variables.scss

- [ ] 颜色变量已定义：
  - [ ] `$primary-color: #FF6B35`
  - [ ] `$secondary-color: #F7C59F`
  - [ ] `$accent-color: #FFF3CD`
  - [ ] `$text-primary: #333333`
  - [ ] `$text-secondary: #666666`
  - [ ] `$bg-page: #F5F5F5`
  - [ ] `$bg-card: #FFFFFF`

- [ ] 字体变量已定义：
  - [ ] `$font-serif`
  - [ ] `$font-sans`

- [ ] 间距变量已定义：
  - [ ] `$spacing-xs: 4px`
  - [ ] `$spacing-sm: 8px`
  - [ ] `$spacing-md: 16px`
  - [ ] `$spacing-lg: 24px`
  - [ ] `$spacing-xl: 32px`

- [ ] 圆角变量已定义：
  - [ ] `$radius-sm: 8px`
  - [ ] `$radius-md: 12px`
  - [ ] `$radius-lg: 16px`

- [ ] 阴影变量已定义：
  - [ ] `$shadow-sm`
  - [ ] `$shadow-md`
  - [ ] `$shadow-lg`

#### reset.scss

- [ ] 全局重置已应用：
  - [ ] `* { margin: 0; padding: 0; box-sizing: border-box; }`
  - [ ] `html, body { width: 100%; height: 100%; }`
  - [ ] `a { text-decoration: none; color: inherit; }`
  - [ ] `button { border: none; background: none; cursor: pointer; }`

#### global.scss

- [ ] 响应式断点已定义：
  - [ ] `$breakpoint-mobile: 768px`
  - [ ] `$breakpoint-tablet: 1024px`

- [ ] Mixins 已定义：
  - [ ] `@mixin mobile`
  - [ ] `@mixin tablet`
  - [ ] `@mixin desktop`

- [ ] 工具类已定义：
  - [ ] `.container`
  - [ ] `.flex-center`

### 1.5 路由配置

#### router/index.js

- [ ] 路由已定义：
  - [ ] `/` → Bookshelf 页面
  - [ ] `/reader/:id` → Reader 页面
  - [ ] `/settings` → Settings 页面

- [ ] 路由懒加载已实现：
  - [ ] Bookshelf 组件懒加载
  - [ ] Reader 组件懒加载
  - [ ] Settings 组件懒加载

### 1.6 状态管理

#### stores/settings.js

- [ ] 状态已定义：
  - [ ] `fontSize` (ref)
  - [ ] `ttsSpeed` (ref)
  - [ ] `showPronunciation` (ref)

- [ ] 本地存储已实现：
  - [ ] `loadFromStorage()` 方法
  - [ ] `watch` 自动保存

- [ ] 方法已定义：
  - [ ] `setFontSize(size)`
  - [ ] `setTtsSpeed(speed)`
  - [ ] `togglePronunciation()`

#### stores/progress.js

- [ ] 状态已定义：
  - [ ] `currentSutra` (ref)
  - [ ] `scrollPosition` (ref)
  - [ ] `readingTime` (ref)

- [ ] 方法已定义：
  - [ ] `setSutra(sutra)`
  - [ ] `setScrollPosition(position)`
  - [ ] `addReadingTime(seconds)`

#### stores/theme.js

- [ ] 状态已定义：
  - [ ] `isDark` (ref)

- [ ] 本地存储已实现：
  - [ ] `loadFromStorage()` 方法
  - [ ] `watch` 自动保存 + 切换 class

- [ ] 方法已定义：
  - [ ] `toggleTheme()`

### 1.7 主入口配置

#### main.js

- [ ] Pinia 已注册
- [ ] Vue Router 已注册
- [ ] 全局样式已导入
- [ ] App 已挂载

---

## 2. 核心算法检查

### 2.1 Trie 树实现

#### utils/trie.js

- [ ] `TrieNode` 类已定义：
  - [ ] `children` 属性
  - [ ] `isEnd` 属性
  - [ ] `data` 属性

- [ ] `buildTrie(dictionary)` 函数已实现：
  - [ ] 遍历词典数据
  - [ ] 构建 Trie 树结构
  - [ ] 保存词条数据

- [ ] `findMatches(trie, text)` 函数已实现：
  - [ ] 遍历文本每个字符
  - [ ] 查找所有匹配的词条
  - [ ] 返回匹配结果数组（含位置）

- [ ] `removeOverlaps(matches)` 函数已实现：
  - [ ] 按最长匹配优先排序
  - [ ] 移除重叠的匹配
  - [ ] 返回去重结果

### 2.2 TTS 引擎实现

#### utils/tts.js

- [ ] `TTSEngine` 类已定义：
  - [ ] `synth` 属性（SpeechSynthesis 实例）
  - [ ] `currentUtterance` 属性
  - [ ] `isSpeaking` 属性
  - [ ] `isPaused` 属性

- [ ] `getVoices()` 方法已实现：
  - [ ] 返回可用语音列表

- [ ] `speak(text, options)` 方法已实现：
  - [ ] 创建 `SpeechSynthesisUtterance`
  - [ ] 设置语音参数（rate, pitch, voice）
  - [ ] 事件监听（onstart, onend, onpause, onresume）
  - [ ] 句子分割回调（onboundary）

- [ ] `pause()` 方法已实现
- [ ] `resume()` 方法已实现
- [ ] `stop()` 方法已实现
- [ ] `getStatus()` 方法已实现

### 2.3 读音映射实现

#### utils/pronunciation.js

- [ ] `pronunciationMap` 对象已定义：
  - [ ] 包含佛经常用多音字
  - [ ] 包含上下文映射
  - [ ] 包含默认读音

- [ ] `getPronunciation(word)` 函数已实现：
  - [ ] 根据上下文返回拼音
  - [ ] 返回默认读音

- [ ] `addPinyinAnnotation(text)` 函数已实现：
  - [ ] 遍历文本字符
  - [ ] 查找多音字映射
  - [ ] 生成 Ruby 标注 HTML

---

## 3. 页面组件检查

### 3.1 书架页面

#### pages/Bookshelf.vue

- [ ] 搜索栏已实现：
  - [ ] 搜索框输入
  - [ ] 搜索过滤逻辑
  - [ ] 清空搜索功能

- [ ] 书架网格已实现：
  - [ ] 响应式布局：
    - [ ] 手机端：1 列
    - [ ] 平板端：2-3 列
    - [ ] PC端：4 列
  - [ ] 经书卡片展示
  - [ ] 点击跳转阅读页

- [ ] 底部导航已实现：
  - [ ] 书架标签页
  - [ ] 设置标签页
  - [ ] 图标显示

### 3.2 阅读页面

#### pages/Reader.vue

- [ ] 顶部导航栏已实现：
  - [ ] 返回按钮
  - [ ] 经书标题显示
  - [ ] 菜单按钮

- [ ] 阅读内容区已实现：
  - [ ] 文本内容展示
  - [ ] 滚动功能
  - [ ] 词典高亮显示
  - [ ] 拼音标注（可切换）

- [ ] 底部工具栏已实现：
  - [ ] TTS 播放/暂停按钮
  - [ ] 字号调整按钮
  - [ ] 拼音切换按钮
  - [ ] 主题切换按钮

- [ ] 字号设置弹窗已实现：
  - [ ] 滑块选择字号
  - [ ] 预览文字显示
  - [ ] 实时调整

- [ ] 功能集成已实现：
  - [ ] Trie 树高亮集成
  - [ ] TTS 播放集成
  - [ ] 滚动位置保存
  - [ ] 读音标注集成

### 3.3 词典弹窗组件

#### components/DictionaryPopup.vue

- [ ] 多终端适配已实现：
  - [ ] 手机端：底部抽屉
  - [ ] 平板端：智能气泡
  - [ ] PC端：侧边面板

- [ ] 词典信息展示：
  - [ ] 词条标题
  - [ ] 拼音显示
  - [ ] 梵文显示（如有）
  - [ ] 释义说明
  - [ ] 分类标签（如有）

- [ ] 动作按钮已实现：
  - [ ] 播放读音按钮
  - [ ] 添加笔记按钮
  - [ ] 搜索相关按钮（平板/PC）
  - [ ] 分享按钮（PC）

- [ ] 动画效果已实现：
  - [ ] 抽屉滑入动画
  - [ ] 气泡淡入动画
  - [ ] 侧边栏滑入动画

### 3.4 设置页面

#### pages/Settings.vue

- [ ] 字号设置已实现：
  - [ ] 滑块选择
  - [ ] 预览显示
  - [ ] 保存到设置 store

- [ ] TTS 速度设置已实现：
  - [ ] 速度选择（0.5x - 2.0x）
  - [ ] 保存到设置 store

- [ ] 读音标注开关已实现：
  - [ ] 切换开关
  - [ ] 保存到设置 store

- [ ] 主题切换已实现：
  - [ ] 日间/夜间模式
  - [ ] 保存到主题 store
  - [ ] 实时切换效果

- [ ] 缓存清理已实现：
  - [ ] 清除按钮
  - [ ] 确认提示
  - [ ] 清理逻辑

---

## 4. 数据文件检查

### 4.1 经书数据

#### data/sutras.js

- [ ] 数据结构正确：
  ```javascript
  {
    id: String,
    title: String,
    fullName: String,
    translator: String,
    cover: String,
    description: String,
    chapters: [{ title, content }],
    wordCount: Number
  }
  ```

- [ ] 至少包含 3-5 部经典经书：
  - [ ] 心经
  - [ ] 金刚经
  - [ ] 楞严经
  - [ ] [ ] 妙法莲华经
  - [ ] [ ] 维摩诘经

- [ ] 每部经书包含完整内容
- [ ] 字数统计准确

### 4.2 词典数据

#### data/dictionary.js

- [ ] 数据结构正确：
  ```javascript
  {
    term: String,
    pinyin: String,
    sanskrit: String,
    definition: String,
    category: String
  }
  ```

- [ ] 至少包含 100 个佛经术语
- [ ] 拼音标注准确
- [ ] 梵文标注准确（如有）
- [ ] 释义清晰完整

### 4.3 读音映射表

#### data/pronunciation-map.js

- [ ] 数据结构正确：
  ```javascript
  {
    '般': {
      '般若': 'bō',
      '一般': 'bān',
      'default': 'bān'
    }
  }
  ```

- [ ] 包含常用多音字：
  - [ ] 般、若、菩、萨
  - [ ] 陀、摩、南、无
  - [ ] 其他佛经专用多音字

- [ ] 上下文映射完整
- [ ] 默认读音设置合理

---

## 5. 测试检查

### 5.1 单元测试

#### tests/trie.test.js

- [ ] Trie 树构建测试通过
- [ ] 词条匹配测试通过
- [ ] 重叠移除测试通过
- [ ] 边界情况测试通过

#### tests/tts.test.js

- [ ] TTS 引擎初始化测试通过
- [ ] 播放功能测试通过
- [ ] 暂停/恢复测试通过
- [ ] 停止功能测试通过

#### tests/pronunciation.test.js

- [ ] 读音映射测试通过
- [ ] 拼音标注测试通过
- [ ] 上下文判断测试通过

### 5.2 组件测试

#### tests/components/BookCard.spec.js

- [ ] 组件渲染测试通过
- [ ] Props 传递测试通过
- [ ] 点击事件触发测试通过
- [ ] 响应式样式测试通过

#### tests/components/DictionaryPopup.spec.js

- [ ] 多终端适配测试通过
- [ ] 数据展示测试通过
- [ ] 动作按钮测试通过
- [ ] 动画效果测试通过

### 5.3 E2E 测试

#### tests/e2e/bookshelf.spec.js

- [ ] 书架页加载测试通过
- [ ] 搜索功能测试通过
- [ ] 经书点击跳转测试通过
- [ ] 底部导航测试通过

#### tests/e2e/reader.spec.js

- [ ] 阅读页加载测试通过
- [ ] 词典高亮显示测试通过
- [ ] TTS 播放测试通过
- [ ] 字号调整测试通过

#### tests/e2e/settings.spec.js

- [ ] 设置页加载测试通过
- [ ] 字号设置测试通过
- [ ] 主题切换测试通过
- [ ] 缓存清理测试通过

---

## 6. 部署检查

### 6.1 构建检查

- [ ] `npm run build` 执行成功
- [ ] 无构建错误
- [ ] 无构建警告
- [ ] `dist/` 目录生成
- [ ] 资源文件完整

### 6.2 预览检查

- [ ] `npm run preview` 执行成功
- [ ] 生产版本可访问
- [ ] 功能正常工作
- [ ] 样式正确显示

### 6.3 部署准备

- [ ] 环境变量已配置：
  - [ ] `VITE_APP_TITLE`
  - [ ] `VITE_APP_VERSION`

- [ ] Vercel CLI 已安装
- [ ] 已登录 Vercel 账户

### 6.4 生产部署

- [ ] 部署到 Vercel 成功
- [ ] 生产 URL 可访问
- [ ] HTTPS 证书正常
- [ ] CDN 加速生效

---

## 7. 性能检查

### 7.1 加载性能

- [ ] 首屏加载时间 < 2s
- [ ] 资源大小优化：
  - [ ] JS 文件 < 500KB
  - [ ] CSS 文件 < 100KB
  - [ ] 图片资源已优化

- [ ] 懒加载已实现：
  - [ ] 路由懒加载
  - [ ] 图片懒加载
  - [ ] 组件懒加载

### 7.2 运行性能

- [ ] Trie 树构建不阻塞主线程
- [ ] 滚动流畅（60fps）
- [ ] 动画流畅（60fps）
- [ ] 内存使用合理（< 100MB）

### 7.3 优化措施

- [ ] Web Worker 已使用（Trie 树构建）
- [ ] 虚拟滚动已实现（超长文本）
- [ ] 资源缓存已配置
- [ ] Gzip 压缩已启用

---

## 8. 兼容性检查

### 8.1 响应式适配

#### 📱 手机端（< 768px）

- [ ] 布局适配：
  - [ ] 单列卡片布局
  - [ ] 底部抽屉词典
  - [ ] 底部导航栏
  - [ ] 触摸目标 ≥ 44px

- [ ] 功能测试：
  - [ ] 点击响应正常
  - [ ] 滑动流畅
  - [ ] 弹窗显示正常

#### 💻 平板端（768px - 1024px）

- [ ] 布局适配：
  - [ ] 2-3 列网格布局
  - [ ] 气泡词典弹窗
  - [ ] 侧边工具栏

- [ ] 功能测试：
  - [ ] 触摸和鼠标交互
  - [ ] 智能定位
  - [ ] 快捷操作

#### 🖥️ PC端（> 1024px）

- [ ] 布局适配：
  - [ ] 4 列网格布局
  - [ ] 侧边面板词典
  - [ ] 三栏布局（书架）

- [ ] 功能测试：
  - [ ] 鼠标交互
  - [ ] 拖拽支持
  - [ ] 快捷键支持

### 8.2 浏览器兼容性

#### Chrome（最新）

- [ ] 所有功能正常
- [ ] 样式显示正确
- [ ] TTS 播放正常

#### Safari（最新）

- [ ] 所有功能正常
- [ ] 样式显示正确
- [ ] TTS 播放正常
- [ ] iOS Safari 特殊处理已应用

#### Firefox（最新）

- [ ] 所有功能正常
- [ ] 样式显示正确
- [ ] TTS 播放正常

#### Edge（最新）

- [ ] 所有功能正常
- [ ] 样式显示正确
- [ ] TTS 播放正常

### 8.3 特殊场景

- [ ] 离线场景：
  - [ ] 本地存储正常
  - [ ] 缓存数据可读取
  - [ ] 提示用户网络状态

- [ ] 弱网场景：
  - [ ] 加载提示正常
  - [ ] 超时处理已实现
  - [ ] 错误提示友好

- [ ] 深色模式：
  - [ ] 所有组件适配
  - [ ] 文字对比度足够
  - [ ] 无视觉问题

---

## 9. 最终验收检查

### 9.1 功能完整性

- [ ] 书架页面：
  - [ ] 搜索功能
  - [ ] 经书展示
  - [ ] 进度显示
  - [ ] 底部导航

- [ ] 阅读页面：
  - [ ] 文本展示
  - [ ] 词典高亮
  - [ ] TTS 播放
  - [ ] 字号调整
  - [ ] 拼音标注
  - [ ] 主题切换
  - [ ] 进度保存

- [ ] 词典弹窗：
  - [ ] 多终端适配
  - [ ] 信息展示
  - [ ] 动作按钮
  - [ ] 动画效果

- [ ] 设置页面：
  - [ ] 字号设置
  - [ ] TTS 速度设置
  - [ ] 拼音标注开关
  - [ ] 主题切换
  - [ ] 缓存清理

### 9.2 代码质量

- [ ] ESLint 检查通过
- [ ] 无 console.log 调试代码
- [ ] 代码注释完整
- [ ] 命名规范一致
- [ ] 无重复代码

### 9.3 文档完整性

- [ ] README 文档完整
- [ ] API 文档完整
- [ ] 部署文档完整
- [ ] 开发日志更新

### 9.4 用户体验

- [ ] 界面美观（符合禅意设计）
- [ ] 交互流畅
- [ ] 无 Bug
- [ ] 提示友好
- [ ] 性能优秀

---

## 10. 签字确认

### 开发人员确认

- [ ] 所有检查项已完成
- [ ] 测试全部通过
- [ ] 代码已审查
- [ ] 文档已更新

**签字**：____________________  
**日期**：____________________

### 测试人员确认

- [ ] 功能测试通过
- [ ] 兼容性测试通过
- [ ] 性能测试通过
- [ ] 已签署验收报告

**签字**：____________________  
**日期**：____________________

### 产品负责人确认

- [ ] 需求已全部满足
- [ ] 用户体验良好
- [ ] 同意发布上线

**签字**：____________________  
**日期**：____________________

---

**检查清单使用说明**：

1. 每完成一项，在 `[]` 中打勾 `[x]`
2. 部分完成的项，可填写 `[x] 80%` 表示进度
3. 遇到问题需在对应项后备注问题说明
4. 定期更新检查清单，记录进展
5. 最终验收时需 100% 完成所有检查项
