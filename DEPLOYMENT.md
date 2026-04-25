# 部署指南

本指南说明如何将般若佛经阅读器部署到 Vercel。

## 📦 部署到 Vercel

### 方法 1: 通过 Git 部署（推荐）

1. **将代码推送到 GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/buddhist-reader.git
   git push -u origin main
   ```

2. **在 Vercel 导入项目**
   - 访问 [vercel.com](https://vercel.com)
   - 点击 "Add New Project"
   - 选择刚才创建的 GitHub 仓库
   - Vercel 会自动检测项目配置

3. **配置项目**
   - Framework Preset: Vite
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `dist`

4. **点击 Deploy**
   - 等待部署完成（约 1-2 分钟）
   - 部署完成后会获得一个 `.vercel.app` 域名

### 方法 2: 通过 Vercel CLI 部署

1. **安装 Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **登录 Vercel**
   ```bash
   vercel login
   ```

3. **部署项目**
   ```bash
   vercel
   ```

4. **生产环境部署**
   ```bash
   vercel --prod
   ```

## 🛠️ 本地构建测试

在部署前，建议先在本地测试构建：

```bash
# 安装依赖
npm install

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

访问 `http://localhost:4173` 预览构建结果。

## 📁 项目文件说明

### GitHub 上传所需的文件

项目根目录应包含以下文件：

```
AI-buddhist-reader/
├── src/                  # 源代码
├── docs/                 # 开发文档
├── public/              # 静态资源（如有）
├── index.html           # HTML 入口
├── package.json         # 项目配置
├── vite.config.js       # Vite 配置
├── vercel.json          # Vercel 配置
├── .gitignore           # Git 忽略配置
├── README.md            # 项目说明
└── DEPLOYMENT.md        # 部署指南
```

### 不需要上传的文件

以下文件已在 `.gitignore` 中排除，不会上传到 GitHub：

- `node_modules/` - 依赖包
- `dist/` - 构建输出
- `.DS_Store` - macOS 系统文件
- `*.log` - 日志文件
- `reference/` - 参考资料和旧代码
- `dist-production/` - 部署备份目录

## ⚙️ 环境变量

本项目不需要配置环境变量，所有功能都在客户端运行。

## 🚀 部署后检查清单

部署完成后，请检查以下功能：

- [ ] 页面能正常加载
- [ ] 书架页显示 5 部佛经
- [ ] 点击佛经能进入阅读页
- [ ] 点击高亮术语能显示词典弹窗
- [ ] TTS 朗读功能正常
- [ ] 拼音标注能正常显示
- [ ] 主题切换功能正常
- [ ] 设置页功能正常
- [ ] 移动端、平板端、PC端都能正常显示

## 📝 自定义域名

### 添加自定义域名

1. 在 Vercel 项目设置中，点击 "Domains"
2. 添加你的域名（例如：`buddhist.yourdomain.com`）
3. 按照提示配置 DNS 记录

### DNS 配置

如果是 A 记录：
```
Type: A
Name: @
Value: 76.76.21.21
```

如果是 CNAME 记录：
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

## 🔄 自动部署

Vercel 支持自动部署：

- 每次推送到 `main` 分支会自动部署到生产环境
- 每次推送到其他分支会自动创建预览部署
- 可以通过 Pull Request 请求合并时预览部署

## 📊 监控和日志

- 在 Vercel 控制台可以查看部署日志
- 可以设置错误监控（如 Sentry）
- 可以设置性能分析

## 🐛 常见问题

### 构建失败

1. 检查 `package.json` 中的依赖版本
2. 确保 Node.js 版本兼容（建议 18+）
3. 查看构建日志找出具体错误

### 页面无法访问

1. 检查 `vercel.json` 中的重写规则
2. 确保所有路由都被正确处理
3. 检查是否有 404 错误

### TTS 功能不工作

- TTS 依赖浏览器 API，需要用户交互才能初始化
- 在移动设备上可能需要用户手动点击播放按钮
- 部分浏览器可能不支持（检查浏览器兼容性）

## 📚 相关资源

- [Vercel 文档](https://vercel.com/docs)
- [Vite 部署指南](https://vitejs.dev/guide/static-deploy.html)
- [Vue 3 部署指南](https://vuejs.org/guide/best-practices/production-deployment.html)

## 💡 提示

- 首次部署可能需要 2-3 分钟
- Vercel 提供免费额度，足够个人项目使用
- 建议绑定自定义域名以获得更好的 SEO
- 可以设置 GitHub Actions 自动运行测试

---

**部署完成后，你的佛经阅读器就可以在线访问了！** 🎉
