# Vite 5 构建配置优化 调研报告

> 任务编号：T-02
> 完成日期：2026-05-02
> 基于：docs/PROJECT_V2_PLAN.md

## 1. 背景与目标

般若佛经阅读器 v2.0 采用 Vue 3 + Vant 4 + Pinia + Vite 5 技术栈，存在以下特殊构建需求：

1. **特殊依赖**：`mdict-js`（CJS/ESM 混合模块）和 `lzo-wasm`（WebAssembly）需要特别的 Vite 配置才能在浏览器中正常运行
2. **首屏性能目标**：v2.0 目标首屏加载时间 < 1s（v1.0 约 2s），首屏 bundle 需控制在 200KB gzip 以内
3. **按需加载**：MDX 词典文件（可能达数 MB）需要懒加载策略，不能纳入首屏 bundle
4. **构建产物分析**：需要可视化分析工具来监控 bundle 大小和依赖分布

本调研围绕上述需求，调研 Vite 5 构建优化策略并产出可执行的配置方案。

## 2. Code Splitting 策略

### 2.1 三种策略对比

| 策略 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| **按路由** | 首屏只加载当前路由所需代码，天然支持懒加载；Vue Router 的 `() => import()` 语法开箱即用 | 路由间共享的公共依赖可能重复打包；异步路由切换时有短暂加载延迟 | 多页面应用、路由边界清晰的项目（如本项目的书架页/阅读页/词典管理页） |
| **按功能** | 将相关功能模块（如 Trie 引擎、词典解析、TTS）独立打包，功能间缓存独立 | 需要手动维护 manualChunks 配置；功能边界不易界定 | 功能模块独立性强的项目，如本项目的 engine/ 模块 |
| **按大小** | Rollup 自动拆分超过阈值的 chunk，无需手动配置；适合大型 vendor 包 | 拆分结果不可控，可能产生过多小 chunk 增加 HTTP 请求；缓存策略不精细 | 作为辅助策略，与按路由/按功能配合使用 |

### 2.2 推荐方案：混合策略

结合本项目特点，推荐 **按路由为主 + 按功能为辅** 的混合策略：

```javascript
build: {
  rollupOptions: {
    output: {
      manualChunks(id) {
        // 按功能拆分第三方依赖
        if (id.includes('node_modules')) {
          // Vue 生态（首屏必需）
          if (id.includes('vue') || id.includes('pinia') || id.includes('vue-router')) {
            return 'vendor-vue'
          }
          // UI 组件库（首屏必需）
          if (id.includes('vant')) {
            return 'vendor-vant'
          }
          // MDX 解析相关（非首屏，按需加载）
          if (id.includes('mdict') || id.includes('lzo-wasm')) {
            return 'vendor-mdx'
          }
          // 其他工具库
          if (id.includes('marked') || id.includes('idb')) {
            return 'vendor-utils'
          }
          // 兜底：其他 node_modules
          return 'vendor'
        }

        // 按功能拆分源码
        if (id.includes('/engine/')) {
          return 'engine-core'
        }
        if (id.includes('/storage/')) {
          return 'storage-layer'
        }
      }
    }
  }
}
```

### 2.3 首屏 Bundle 优化

**目标 < 200KB gzip 的方案**：

| 优化项 | 策略 | 预估节省 |
|--------|------|----------|
| **路由懒加载** | 所有页面使用 `() => import()` 动态导入，首屏仅加载 Bookshelf 页 | ~40% |
| **MDX 依赖排除首屏** | `mdict-js`、`lzo-wasm` 通过 dynamic import 延迟加载，不进首屏 | ~80KB |
| **Vant 按需引入** | 使用 `vite-plugin-vant-style` 或手动按需引入组件 | ~30% |
| **Tree Shaking** | 确保所有 import 使用具名导入，避免全量引入 | ~15% |
| **Gzip/Brotli 压缩** | 部署层启用 Brotli（比 gzip 额外节省 15-20%） | ~20% |

首屏 bundle 估算（gzip 后）：
- Vue 3 + Vue Router + Pinia: ~35KB
- Vant（按需）: ~25KB
- 业务代码（Bookshelf 页）: ~15KB
- 公共依赖（idb、工具函数）: ~10KB
- **合计**: ~85KB（远低于 200KB 目标）

### 2.4 预加载/预取策略

Vite 5 默认开启 `modulePreload` 并自动注入 polyfill。配置建议：

```javascript
build: {
  modulePreload: {
    polyfill: true,  // 默认值，注入 modulepreload polyfill
    resolveDependencies: (filename, deps, { hostId, hostType }) => {
      // 过滤掉非首屏必需的预加载依赖
      // 例如：阻止 mdict-js 相关 chunk 被预加载
      return deps.filter(dep => {
        return !dep.includes('vendor-mdx') && !dep.includes('engine-core')
      })
    }
  }
}
```

**预加载策略说明**：

| 策略 | 实现方式 | 说明 |
|------|----------|------|
| **首屏 chunk 预加载** | Vite 默认行为，在 `<head>` 中注入 `<link rel="modulepreload">` | 自动计算入口 chunk 的直接依赖 |
| **非首屏阻止预加载** | `resolveDependencies` 过滤 | 避免预加载 MDX 引擎等非必需模块，减少首屏网络竞争 |
| **路由级预取** | 在首屏页面 `onMounted` 后使用 `link rel="prefetch"` | 空闲时预取下一页资源，不阻塞首屏渲染 |

## 3. 特殊依赖处理

### 3.1 mdict-js ESM 兼容性

**问题描述**：`mdict-js` 是一个 CJS/ESM 混合模块，使用了 `global` 变量（Node.js 特有），在浏览器环境中不存在。同时其内部混合了 CommonJS 和 ES Module 语法。

**验证通过的配置方案**：

```javascript
// vite.config.js
export default defineConfig({
  // 1. 将 Node.js 的 global 映射为浏览器的 globalThis
  define: {
    global: 'globalThis'
  },

  // 2. 开发时预构建：强制将 mdict-ts（或 mdict-js）纳入预构建
  optimizeDeps: {
    include: ['mdict-ts']
    // 注意：实际 npm 包名可能为 mdict-ts 或 mdict-js，需根据实际安装调整
  },

  // 3. 生产构建时处理 CJS/ESM 混合模块
  build: {
    commonjsOptions: {
      // 包含所有 node_modules 以处理 mdict-js 的 CJS 部分
      include: [/node_modules/],
      // 关键：允许转换混合了 ES Module 的 CJS 模块
      transformMixedEsModules: true,
    }
  }
})
```

**配置逐项说明**：

| 配置项 | 作用 | 必要性 |
|--------|------|--------|
| `define: { global: 'globalThis' }` | 将 `global` 替换为浏览器环境的 `globalThis`，解决 `ReferenceError: global is not defined` | **必需** |
| `optimizeDeps.include: ['mdict-ts']` | 开发时强制预构建该依赖，esbuild 将其转为纯 ESM 格式 | **必需** |
| `commonjsOptions.transformMixedEsModules: true` | 生产构建时允许转换 CJS/ESM 混合模块，否则 Rollup 的 `@rollup/plugin-commonjs` 会跳过此类模块 | **必需** |
| `commonjsOptions.include: [/node_modules/]` | 确保 node_modules 中的 CJS 模块都被正确转换 | 推荐 |

**已知问题与排障**：

1. **包名差异**：`mdict-js`（GitHub 仓库名）与 npm 包名 `mdict-ts` 可能不同，`optimizeDeps.include` 需使用实际包名
2. **lzo-wasm 依赖**：`mdict-js` 内部依赖 `lzo-wasm`，如果 `lzo-wasm` 未被自动预构建，需要手动添加到 `optimizeDeps.include`
3. **动态 require**：如果 `mdict-js` 内部使用动态 `require()`，可能需要在 `optimizeDeps.exclude` 中排除，改为直接让浏览器加载

### 3.2 lzo-wasm WASM 处理

**问题描述**：`lzo-wasm` 是 WebAssembly 模块，用于 MDX 词典的 LZO 压缩数据解压。Vite 对 `.wasm` 文件有原生支持，但需要正确的导入方式。

**Vite 5 中 WASM 的两种导入方式**：

| 方式 | 语法 | 适用场景 |
|------|------|----------|
| **`?init` 查询** | `import init from './example.wasm?init'` | Vite 自动处理加载和实例化，返回初始化函数 |
| **`?url` 查询** | `import wasmUrl from './example.wasm?url'` | 获取 WASM 文件的 URL，手动通过 `fetch` + `WebAssembly.instantiateStreaming` 加载 |

**推荐方案**：对于 `lzo-wasm` 这种通过 npm 安装的 WASM 依赖，使用其 npm 包自带的 JS 绑定层即可，不需要手动处理 WASM 导入：

```javascript
// 方式一：如果 lzo-wasm 提供了 ESM 入口（推荐）
import { decompress } from 'lzo-wasm'

// 方式二：如果需要懒加载（非首屏场景）
const loadLzo = async () => {
  const { decompress } = await import('lzo-wasm')
  return decompress
}
```

**Vite 构建时的 WASM 行为**：

- 生产构建中，小于 `assetsInlineLimit`（默认 4KB）的 `.wasm` 文件会被内联为 base64 字符串
- 大于阈值的 `.wasm` 文件作为静态资源输出到 `assets/` 目录，按需 fetch 加载
- `lzo-wasm` 的 WASM 文件通常大于 4KB，会作为独立文件输出

**配置建议**：

```javascript
build: {
  assetsInlineLimit: 4096,  // 默认值，小于此值的 asset 会被内联为 base64
  rollupOptions: {
    output: {
      // WASM 文件使用 content hash，便于长期缓存
      assetFileNames: 'assets/[name]-[hash][extname]'
    }
  }
}
```

**MDX 引擎懒加载策略**：

由于 MDX 解析只在用户上传/查询 MDX 词典时才需要，建议将其完全懒加载：

```javascript
// engine/mdxParser.js
let mdictInstance = null

export async function getMdict() {
  if (!mdictInstance) {
    // 动态导入，确保 mdict-js + lzo-wasm 不进首屏 bundle
    const Mdict = (await import('mdict-js')).default
    mdictInstance = Mdict
  }
  return mdictInstance
}
```

### 3.3 资源压缩对比

| 工具 | 压缩率 | 速度 | 适用场景 | Vite 默认 |
|------|--------|------|----------|-----------|
| **esbuild** | 基准（100%） | 极快（Go 实现） | 绝大多数项目，首推 | **是**（Vite 5 默认） |
| **terser** | 比 esbuild 高 1-2% | 慢 20-40 倍（JS 实现） | 对 bundle 大小有极致要求的项目 | 否（需手动安装） |

**官方基准数据**（来自 [privatenumber/minification-benchmarks](https://github.com/privatenumber/minification-benchmarks)）：

- esbuild 比 terser 快 **20-40 倍**
- 压缩率差距仅 **1-2%**（terser 略优）

**推荐方案**：**使用 esbuild（默认）即可**，理由如下：

1. 本项目的性能瓶颈在 MDX 加载和词典查询，不在 JS 压缩率上
2. 1-2% 的压缩率差异对实际加载时间影响微乎其微（< 50ms）
3. terser 需要额外安装（`npm add -D terser`），增加依赖体积
4. Vite 5 默认使用 esbuild，无需额外配置

如果未来确实需要使用 terser：

```javascript
build: {
  minify: 'terser',
  terserOptions: {
    compress: {
      drop_console: true,      // 移除 console
      drop_debugger: true,     // 移除 debugger
      pure_funcs: ['console.log'],  // 指定纯函数（无副作用）
    },
    format: {
      comments: false,         // 移除注释
    }
  }
}
```

## 4. 构建产物分析

### 4.1 rollup-plugin-visualizer 配置

`rollup-plugin-visualizer` 是 Rollup 生态最成熟的 bundle 分析工具，可生成可交互的 treemap/sunburst 图。

**安装**：

```bash
npm add -D rollup-plugin-visualizer
```

**配置**：

```javascript
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    vue(),
    visualizer({
      open: true,              // 构建完成后自动打开浏览器
      gzipSize: true,          // 显示 gzip 后大小
      brotliSize: true,        // 显示 brotli 后大小
      filename: 'dist/stats.html',  // 输出文件名
      template: 'treemap',     // 可视化模板：treemap | sunburst | network
    })
  ]
})
```

### 4.2 分析方法

| 分析维度 | 方法 | 工具 |
|----------|------|------|
| **Bundle 大小分布** | 生成 treemap 图，查看各模块占比 | rollup-plugin-visualizer |
| **首屏 chunk 分析** | 查看入口 chunk 的依赖树 | `npx vite-bundle-visualizer` |
| **gzip 后大小** | 使用 `gzipSize: true` 配置 | rollup-plugin-visualizer |
| **重复依赖检测** | 检查是否有同一依赖的多版本 | `npm ls <package>` |
| **Tree Shaking 验证** | 检查未使用的导出是否被移除 | `--failOnWarnings` 构建标志 |

### 4.3 分析流程

```bash
# 1. 构建并生成分析报告
npm run build

# 2. 查看报告（如果配置了 open: true 会自动打开）
open dist/stats.html

# 3. 使用命令行快速查看 chunk 大小
npx vite-bundle-visualizer
```

## 5. Vite 配置完整示例

以下是结合本项目所有需求的完整 `vite.config.js` 配置：

```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { visualizer } from 'rollup-plugin-visualizer'
import { resolve } from 'node:path'

const isProd = process.env.NODE_ENV === 'production'

export default defineConfig({
  // 路径别名
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },

  // 开发服务器配置
  server: {
    allowedHosts: ['.monkeycode-ai.online'],
    // MDX 引擎相关依赖预构建
    warmup: {
      clientFiles: [
        './src/pages/Bookshelf.vue',
        './src/components/common/*.vue',
      ]
    }
  },

  // Node.js global 兼容
  define: {
    global: 'globalThis'
  },

  // 依赖预构建优化
  optimizeDeps: {
    // 必须预构建的 CJS/混合模块
    include: [
      'mdict-ts',      // 或 mdict-js，根据实际包名
    ],
  },

  // 生产构建配置
  build: {
    outDir: 'dist',
    sourcemap: isProd ? false : 'inline',  // 生产环境关闭 sourcemap
    minify: 'esbuild',                     // 默认值，性能最优
    chunkSizeWarningLimit: 500,            // chunk 大小警告阈值（KB）

    // CommonJS 模块转换
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },

    // 资源文件名策略（content hash 用于长期缓存）
    rollupOptions: {
      output: {
        // 手动 chunk 拆分
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Vue 生态核心（首屏必需）
            if (id.includes('/vue/') || id.includes('/pinia/') || id.includes('/vue-router/')) {
              return 'vendor-vue'
            }
            // Vant UI 组件库
            if (id.includes('/vant/')) {
              return 'vendor-vant'
            }
            // MDX 解析引擎（非首屏）
            if (id.includes('mdict') || id.includes('lzo-wasm')) {
              return 'vendor-mdx'
            }
            // 工具库
            if (id.includes('/idb/') || id.includes('/marked/')) {
              return 'vendor-utils'
            }
            return 'vendor'
          }

          // 源码按功能拆分
          if (id.includes('/engine/')) {
            return 'engine-core'
          }
          if (id.includes('/storage/')) {
            return 'storage-layer'
          }
        },

        // 文件命名策略
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },

    // Module preload 配置
    modulePreload: {
      polyfill: true,
      resolveDependencies: (filename, deps, { hostId, hostType }) => {
        // 阻止非首屏 chunk 被预加载
        const nonEssentialChunks = ['vendor-mdx', 'engine-core']
        return deps.filter(dep => {
          return !nonEssentialChunks.some(chunk => dep.includes(chunk))
        })
      }
    },

    // 压缩配置（仅在使用 terser 时生效）
    // terserOptions: {
    //   compress: { drop_console: true, drop_debugger: true },
    //   format: { comments: false }
    // }
  },

  // 插件配置
  plugins: [
    vue(),
    // 构建产物分析（仅生产环境启用）
    isProd && visualizer({
      open: false,
      gzipSize: true,
      brotliSize: true,
      filename: 'dist/stats.html',
      template: 'treemap',
    }),
  ].filter(Boolean),
})
```

## 6. 结论与建议

### 6.1 推荐构建配置方案

| 配置项 | 推荐值 | 理由 |
|--------|--------|------|
| **minify** | `esbuild`（默认） | 速度快 20-40 倍，压缩率仅差 1-2% |
| **sourcemap** | 生产关闭 | 减小产物体积 30-50%，开发用 inline |
| **code splitting** | 混合策略（按路由 + 按功能） | 首屏最小化 + 缓存最优 |
| **modulePreload** | 启用 + 过滤非首屏 chunk | 避免预加载 MDX 引擎等大模块 |
| **mdict-js 处理** | `define.global` + `optimizeDeps.include` + `transformMixedEsModules` | 三项缺一不可 |
| **lzo-wasm 处理** | 通过 npm 包 ESM 入口导入，无需手动处理 WASM | Vite 原生支持 npm 包中的 WASM |
| **bundle 分析** | `rollup-plugin-visualizer` | 可视化分析，监控首屏大小 |

### 6.2 首屏 Bundle 预估

| Chunk | 内容 | 预估大小（gzip） |
|-------|------|------------------|
| `index-[hash].js` | 应用入口 + Bookshelf 页 | ~15KB |
| `vendor-vue-[hash].js` | Vue 3 + Vue Router + Pinia | ~35KB |
| `vendor-vant-[hash].js` | Vant（按需引入） | ~25KB |
| `vendor-utils-[hash].js` | idb + 工具函数 | ~10KB |
| CSS | 样式文件 | ~10KB |
| **合计** | | **~95KB** |

远低于 200KB 目标，且有充足余量。

### 6.3 非首屏 Chunk（按需加载）

| Chunk | 内容 | 加载时机 |
|-------|------|----------|
| `vendor-mdx-[hash].js` | mdict-js + lzo-wasm | 用户上传/查询 MDX 词典时 |
| `engine-core-[hash].js` | Trie 引擎 + 高亮引擎 | 进入阅读页时 |
| `storage-layer-[hash].js` | IndexedDB 存储层 | 应用初始化时（可延迟） |
| 各页面 chunk | Reader、DictManager、Settings、Stats | 路由切换时 |

## 7. 对 v2.1 方案的影响

本调研结果对 v2.1（MDX 词典支持）的具体影响：

| 影响项 | 说明 | 优先级 |
|--------|------|--------|
| **MDX 引擎必须懒加载** | `mdict-js` + `lzo-wasm` 通过 dynamic import 延迟加载，不能出现在任何首屏页面的 import 中 | **P0** |
| **MDX chunk 独立打包** | 通过 `manualChunks` 将 MDX 相关依赖打包到 `vendor-mdx` chunk，避免污染首屏 | **P0** |
| **WASM 文件按需 fetch** | `lzo-wasm` 的 `.wasm` 文件作为独立 asset 输出，不内联，在用户首次使用 MDX 词典时加载 | **P0** |
| **构建产物监控** | 在 CI/CD 中集成 `rollup-plugin-visualizer`，监控每次构建的 bundle 大小变化 | **P1** |
| **预加载过滤** | 在 `resolveDependencies` 中阻止 `vendor-mdx` 被预加载，避免首屏网络竞争 | **P1** |
| **Vant 按需引入审计** | 定期审查 Vant 组件引入方式，确保没有全量引入 | **P2** |

## 8. 参考资料

1. [Vite 5 官方文档 - Build Options](https://vitejs.cn/vite5-cn/config/build-options.html)
2. [Vite 5 官方文档 - Dep Optimization Options](https://vitejs.cn/vite5-cn/config/dep-optimization-options.html)
3. [Vite 5 官方文档 - Features (WebAssembly)](https://vitejs.cn/guide/features.html#webassembly)
4. [Vite 5 官方文档 - Module Preload](https://vitejs.cn/vite5-cn/config/build-options.html#build-modulepreload)
5. [mdict-js (js-mdict) API 文档](https://github.com/tonyzhou1890/js-mdict)
6. [Minification Benchmarks (esbuild vs terser)](https://github.com/privatenumber/minification-benchmarks)
7. [rollup-plugin-visualizer](https://github.com/btd/rollup-plugin-visualizer)
8. [Vite 打包优化终极指南 - 稀土掘金](https://juejin.cn/post/7631190142862082084)
9. [般若佛经阅读器 v2.0 项目方案](./PROJECT_V2_PLAN.md)
10. [词典优化讨论](./DICTIONARY_OPTIMIZATION_DISCUSSION.md)

---

*文档版本: v1.0*
*最后更新: 2026-05-02*
