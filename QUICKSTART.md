# 快速开始指南

## 🎉 项目已完成！

般若佛经阅读器 MVP 已完成开发，可以直接部署到 Vercel。

## 📦 项目结构已整理

### ✅ 生产代码（将上传到 GitHub）
```
AI-buddhist-reader/
├── src/                    # 源代码
├── docs/                   # 项目文档
├── .gitignore             # Git 配置
├── index.html             # HTML 入口
├── package.json           # 项目配置
├── vite.config.js        # Vite 配置
├── vercel.json           # Vercel 配置
├── README.md            # 项目说明
├── DEPLOYMENT.md        # 部署指南
└── PROJECT_STRUCTURE.md  # 项目结构
```

### 📚 参考资料（已移至 reference/，不上传）
```
AI-buddhist-reader/reference/
├── docs/                # 设计文档
├── prototypes/          # UI 原型
├── knowledge/           # 研究资料
├── data/                # 原始数据
├── skills/              # 技能文件
└── ...                  # 其他参考资料
```

## 🚀 部署到 Vercel（3步完成）

### 步骤 1：推送到 GitHub

```bash
# 1. 创建 GitHub 仓库后，添加远程仓库
git remote add origin https://github.com/你的用户名/buddhist-reader.git

# 2. 推送代码到 GitHub
git push -u origin main
```

### 步骤 2：在 Vercel 导入项目

1. 访问 [vercel.com](https://vercel.com) 并登录
2. 点击 **"Add New"** → **"Project"**
3. 选择刚才的 GitHub 仓库
4. 点击 **"Deploy"**

### 步骤 3：等待部署完成

- 部署时间：约 1-2 分钟
- 完成后会获得一个 `.vercel.app` 域名
- 例如：`buddhist-reader.vercel.app`

## 📱 本地运行

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```

访问：http://localhost:3000

### 构建生产版本
```bash
npm run build
```

### 预览构建结果
```bash
npm run preview
```

## ✨ 核心功能

- ✅ 5 部经典佛经（心经、地藏经、阿弥陀经、金刚经、观音经）
- ✅ 50+ 佛教术语词典
- ✅ Trie 树词典高亮（O(n) 时间复杂度）
- ✅ TTS 语音朗读（可调速度 0.5x-2.0x）
- ✅ 拼音标注（佛教术语专属读音）
- ✅ 多终端适配（手机/平板/PC）
- ✅ 日间/夜间主题切换
- ✅ 阅读进度自动保存

## 🎨 设计特点

- 🧘 **禅意美学** - 宣纸白、墨黑、金黄配色
- 📖 **极简设计** - 无干扰动画，纯净阅读
- 🌓 **护眼模式** - 柔和的夜间主题
- 📱 **完美适配** - 移动优先，三端适配

## 📊 项目统计

- **代码行数**：~2,000 行
- **组件数量**：8 个
- **文档数量**：8 个
- **参考资料**：3,300+ 文件

## 🔧 技术栈

- **Vue 3** - 前端框架
- **Vite 5** - 构建工具
- **Vant 4** - UI 组件库
- **Pinia** - 状态管理
- **SCSS** - 样式预处理器

## 📝 文档说明

- **README.md** - 项目概述和快速开始
- **DEPLOYMENT.md** - 详细部署指南
- **PROJECT_STRUCTURE.md** - 项目结构说明
- **docs/DEVELOPMENT_LOG.md** - 开发日志
- **docs/DEVELOPMENT_GUIDE.md** - 开发指南
- **docs/DESIGN.md** - 设计系统规范

## 🐛 常见问题

### 1. 如何修改佛经内容？
编辑 `src/data/sutras.js` 文件

### 2. 如何添加新术语？
编辑 `src/data/dictionary.js` 文件

### 3. 如何调整配色？
编辑 `src/assets/styles/variables.scss` 文件

### 4. TTS 不工作怎么办？
- 检查浏览器是否支持 Web Speech API
- 点击页面任意位置初始化音频上下文
- 确保没有静音

### 5. 如何添加自定义域名？
参考 `DEPLOYMENT.md` 中的"自定义域名"章节

## 🎯 下一步

- [ ] 推送到 GitHub
- [ ] 在 Vercel 导入并部署
- [ ] 绑定自定义域名
- [ ] 测试所有功能
- [ ] 分享给朋友使用

## 💡 提示

- `reference/` 目录包含大量参考资料，不影响应用运行
- 所有配置文件都已准备好，直接部署即可
- Vercel 提供免费额度，足够个人使用
- 可以设置自动部署，每次推送都会更新

## 🎊 恭喜！

你的般若佛经阅读器已经准备就绪！

现在就可以部署到 Vercel，让更多人体验禅意阅读了！🙏

---

**需要帮助？**
- 查看 [DEPLOYMENT.md](DEPLOYMENT.md) 获取详细部署指南
- 查看 [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) 了解项目结构
- 查看代码注释了解实现细节

**祝部署顺利！** 🚀
