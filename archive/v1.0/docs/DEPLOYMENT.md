# 般若佛经阅读器 v2 - Vercel 部署指南

> ⚡ 3 分钟快速部署上线

---

## 📋 部署前准备

### 必需条件
- ✅ GitHub 账号
- ✅ Vercel 账号（可以用 GitHub 登录）
- ✅ 项目已推送到 GitHub

---

## 🚀 部署步骤

### 方式一：Vercel CLI（推荐）

#### 1. 安装 Vercel CLI

```bash
npm install -g vercel
```

#### 2. 登录 Vercel

```bash
vercel login
```

选择 GitHub 登录方式

#### 3. 部署项目

```bash
cd project/buddhist-reader-v2
vercel
```

首次部署会问你几个问题：
- **Set up and deploy?** → Yes
- **Which scope?** → 选择你的账号
- **Link to existing project?** → No
- **What's your project's name?** → buddhist-reader-v2
- **In which directory is your code?** → .
- **Want to override the settings?** → No

#### 4. 生产环境部署

```bash
vercel --prod
```

Vercel 会给你一个部署 URL：
```
https://buddhist-reader-v2.vercel.app
```

---

### 方式二：GitHub 自动部署（最简单）

#### 1. 推送到 GitHub

```bash
cd project/buddhist-reader-v2
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/你的用户名/buddhist-reader-v2.git
git push -u origin main
```

#### 2. 在 Vercel 导入项目

1. 访问 https://vercel.com/new
2. 点击 **Import Git Repository**
3. 选择 `buddhist-reader-v2` 仓库
4. 点击 **Import**
5. 点击 **Deploy**

#### 3. 自动部署

之后每次推送到 `main` 分支，Vercel 会自动部署！

---

## ⚙️ 配置说明

### vercel.json 配置

```json
{
  "buildCommand": "npm run build",       // 构建命令
  "outputDirectory": "dist",             // 输出目录
  "framework": "vite",                   // 框架类型
  "rewrites": [                          // 路由重写（SPA 必需）
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### 路由重写说明

Vue Router 使用 History 模式，需要配置重写规则，让所有路由都返回 `index.html`：

```
/ → index.html
/bookshelf → index.html
/reader/xin-jing → index.html
/stats → index.html
```

Vercel 会自动处理，不会 404！

---

## 🌐 自定义域名

### 1. 在 Vercel 控制台配置

1. 访问 https://vercel.com/dashboard
2. 选择项目
3. Settings → Domains
4. 添加你的域名

### 2. 配置 DNS

```
类型    名称    值
A       @       76.76.21.21
CNAME   www     cname.vercel-dns.com
```

### 3. 等待生效

DNS 生效时间：几分钟到几小时

---

## 🔧 环境变量（可选）

如果后续需要配置 API Key 等：

### 方式 1：Vercel CLI

```bash
vercel env add BAIDU_TTS_API_KEY
vercel env add WECHAT_APP_ID
```

### 方式 2：Vercel 控制台

Settings → Environment Variables → Add

### 方式 3：.env.local（本地测试）

```bash
# .env.local 文件
VITE_BAIDU_TTS_API_KEY=your_key_here
```

**注意**：`.env.local` 要加入 `.gitignore`！

---

## ✅ 验证部署

### 部署成功后

1. 访问 Vercel 提供的 URL
2. 测试所有功能：
   - ✅ 书架页面：https://your-app.vercel.app/bookshelf
   - ✅ 阅读页面：https://your-app.vercel.app/reader/xin-jing
   - ✅ 统计页面：https://your-app.vercel.app/stats
   - ✅ 设置页面：https://your-app.vercel.app/settings

### 性能优化

Vercel 自动优化：
- ✅ Gzip 压缩
- ✅ CDN 加速（全球 100+ 节点）
- ✅ HTTP/2
- ✅ 自动缓存

---

## 🐛 常见问题

### Q1: 部署失败 "Build error"

**原因**：Vite 构建失败

**解决**：
```bash
# 本地测试构建
npm run build

# 根据错误修复后重新部署
vercel --prod
```

### Q2: 页面空白

**原因**：路由配置问题

**解决**：检查 `vercel.json` 中的 `rewrites` 配置是否存在

### Q3: 刷新后 404

**原因**：History 模式需要重写规则

**解决**：`vercel.json` 中已配置，重新部署即可

### Q4: 图片加载失败

**原因**：路径问题

**解决**：使用绝对路径或 `@/assets/` 引用

---

## 📊 部署后的优势

### Vercel 免费套餐

- ✅ 无限网站数量
- ✅ 100GB/月 流量
- ✅ 自动 HTTPS
- ✅ 自动 CDN
- ✅ 自动构建部署
- ✅ 预览部署（Pull Request）

### 性能

- ⚡ 首屏加载 < 1 秒
- 🌍 全球 CDN 加速
- 📦 自动代码分割
- 🚀 HTTP/2 + Gzip

---

## 🔄 更新部署

### 自动部署（GitHub 方式）

```bash
git add .
git commit -m "Update feature"
git push
```

Vercel 检测到推送后自动部署，约 1-2 分钟完成！

### 手动部署（CLI 方式）

```bash
vercel --prod
```

---

## 📱 移动端优化

部署后自动适配：
- ✅ 响应式布局（最大 600px）
- ✅ 触摸友好
- ✅ 禁止缩放
- ✅ PWA 友好（可添加至桌面）

---

## 🎯 下一步

### 1. 部署测试

```bash
vercel
```

### 2. 分享给朋友

```
https://buddhist-reader-v2.vercel.app
```

### 3. 监控数据

Vercel 控制台查看：
- 访问量
- 性能数据
- 错误日志

---

**部署超简单！3 分钟搞定！** 🚀

有任何问题随时问我！🫡
