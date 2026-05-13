# 常见问题排查

> 般若佛经阅读器 v3.0

## 开发环境

### Q: `npm install` 失败

**现象**: 安装依赖时报错

**排查**:
1. 检查 Node.js 版本：`node -v`（需要 >= 18）
2. 检查 npm 版本：`npm -v`（需要 >= 9）
3. 清除缓存重试：`npm cache clean --force && npm install`

### Q: `npm run dev` 启动后无法访问

**现象**: 浏览器打开 `http://localhost:5173` 显示空白或无法连接

**排查**:
1. 检查端口是否被占用：`lsof -i :5173`
2. 检查 `vite.config.js` 是否有 `host: true`
3. 检查控制台是否有编译错误
4. 尝试 `npm run preview` 预览生产构建

### Q: 预览平台无法访问

**现象**: `https://5173-xxx.monkeycode-ai.online` 无法打开

**排查**:
1. 检查 `vite.config.js` 中 `allowedHosts: ['.monkeycode-ai.online']`
2. 检查防火墙是否阻止端口 5173
3. 检查 Vite 是否监听 `0.0.0.0`（`host: true`）

---

## 数据加载

### Q: 经书列表为空

**现象**: 书架页面没有显示任何经书

**排查**:
1. 检查 `public/sutras/manifest.json` 是否存在
2. 检查网络请求是否成功（DevTools Network 面板）
3. 检查 `manifest.json` 格式是否为数组

### Q: 词典释义加载失败

**现象**: 点击术语后显示"暂无释义"

**排查**:
1. 检查 `public/dicts/` 目录是否存在
2. 检查 `public/dicts/manifest.json` 格式
3. 检查词典 JSON 文件是否完整（可能转换中断）
4. 检查词条是否在词典中存在（大小写敏感）

### Q: 中文文件名 404

**现象**: 加载 `《心经》.json` 时报 404

**解决**:
```javascript
// 错误
fetch(`/sutras/${filename}`)

// 正确
fetch(`/sutras/${encodeURIComponent(filename)}`)
```

---

## 构建问题

### Q: `npm run build` 失败

**现象**: 构建报错，无 `dist/` 目录

**排查**:
1. 检查是否有语法错误：`npm run lint`
2. 检查 `vite.config.js` 配置
3. 检查 `public/` 目录下的文件是否过大（词典 JSON 共 50MB+）

### Q: 构建后页面空白

**现象**: `dist/` 生成成功，但打开 `index.html` 空白

**排查**:
1. 检查是否是直接打开 `file://` 路径（需要用 HTTP 服务器）
2. 检查路由是否为 history 模式（需要服务器配置 rewrite）
3. 检查 `vercel.json` 配置

---

## 样式问题

### Q: 主题切换无效

**现象**: 点击主题切换按钮，颜色没变

**排查**:
1. 检查 `data-theme` 属性是否正确设置到 `html` 元素
2. 检查 CSS 变量是否正确引用：`var(--bg-color)`
3. 检查 `themes.css` 是否被正确导入

### Q: 移动端显示异常

**现象**: 手机上文字太小或布局错乱

**排查**:
1. 检查 viewport meta 标签：`<meta name="viewport" content="width=device-width, initial-scale=1.0">`
2. 检查是否使用响应式单位（rem/vw）
3. 检查媒体查询断点

---

## 性能问题

### Q: 页面加载慢

**现象**: 首次打开需要几秒

**优化**:
1. 启用 gzip 压缩（Vercel 自动处理）
2. 代码分割：路由懒加载
3. 图片懒加载
4. 词典索引预生成，避免运行时扫描

### Q: 滚动卡顿

**现象**: 阅读时滚动不流畅

**优化**:
1. 滚动事件节流：`throttle(scrollHandler, 100)`
2. 使用 `transform` 代替 `top/left`
3. 减少 DOM 操作
4. 虚拟滚动（长文本）

---

## Git 问题

### Q: 推送失败

**现象**: `git push` 报错

**排查**:
1. 检查远程仓库：`git remote -v`
2. 检查权限：是否有写权限
3. 检查分支：`git branch -vv`
4. 先拉取再推送：`git pull origin main && git push`

### Q: 提交信息规范

**格式**:
```
<type>(<scope>): <subject>

<body>
```

**类型**:
- `feat`: 新功能
- `fix`: 修复
- `docs`: 文档
- `style`: 格式（不影响代码运行）
- `refactor`: 重构
- `chore`: 构建/工具

---

## 其他

### Q: 如何回滚到 v2.0？

```bash
git checkout 260503-feat-add-pagination-and-fix-dict-lookup
# 或
git checkout archive/v2.0  # 查看归档代码
```

### Q: 如何添加新的经书？

1. 将 TXT 放入 `temp-sutras/`
2. 运行 `node scripts/convert-sutras.cjs`
3. 提交并推送

### Q: 如何更新词典？

1. 修改 `archive/v1.0/public/dictionary.json`
2. 运行 `node scripts/convert-dictionary.cjs`
3. 提交并推送
