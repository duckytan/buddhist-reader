# AGENTS.md — ai-buddhist-reader

## Project State

- **v1.0**: `archive/v1.0/` — low credibility, abandoned. Do not follow its patterns.
- **v2.0**: `archive/v2.0/` — had working UI but poor module boundaries. Its **Zen CSS tokens** and **data assets** are reusable; its architecture is not.
- **v3.0**: Ready for development. `src/` is empty; `package.json`, `index.html`, `vite.config.js` need to be created from scratch.
- **Current branch**: `main`

## Iron Rules

1. **Discuss first, code only when asked**: Stay in discussion mode until the user explicitly says to start coding ("开始开发", "implement this", etc).
2. **Push to GitHub after every change**: User deploys via Vercel and relies on the remote repo. Push immediately, do not wait.
3. **On first file write from `main`**: Create a feature branch with format `YYMMDD-{feat|fix|chore|refactor}-<summary>`.

## Reusable Assets (do NOT recreate these)

| Asset | Location | What it has |
|-------|----------|-------------|
| Sutra JSON | `public/sutras/*.json` + `manifest.json` | 30 sutras, 578K chars |
| Dict JSON | `public/dicts/*.json` + `manifest.json` | 3 dictionaries, 35781 entries |
| Zen CSS | `archive/v2.0/src/styles/tokens.css`, `base.css`, `vant-override.css` | Design tokens (colors, spacing, typography) |
| TXT sources | `temp-sutras/*.txt` | Raw text of all 30 sutras (for re-processing) |
| MDX sources | `archive/v1.0/mdict/*.mdx` | 3 original .mdx dictionary files |
| Conversion scripts | `scripts/convert-sutras.cjs`, `scripts/convert-dictionary.cjs` | TXT→JSON, dict→JSON |

## Vercel Deploy

`vercel.json` is configured — SPA rewrites all routes to `index.html`. Push to `main` triggers auto-deploy.

## Vite Gotchas (from v2.0, carry to v3.0)

- `host: true` required for preview; without it the dev server refuses external connections
- `allowedHosts: ['.monkeycode-ai.online']` required for preview platform
- `define: { global: 'globalThis' }` — needed for mdict-js/lzo-wasm
- `optimizeDeps.include: ['mdict-js', 'lzo-wasm']` — these must be pre-bundled
- `commonjsOptions.transformMixedEsModules: true` — mdict-js is CommonJS
- `ssr.noExternal: ['lzo-wasm']` — WASM module must not be externalized
- `lzo-wasm.wasm` must live in `public/` (Vite cannot import .wasm as a module)

## ESLint

Config at `.eslintrc.cjs` — Vue 3 + eslint:recommended. Run `npm run lint` before pushing. Rule `vue/multi-word-component-names` is off.

## Data Format Reference

**Sutra JSON** (`public/sutras/*.json`):
```json
{ "title": "...", "filename": "...", "author": "冯达庵", "category": "yogacara",
  "chapterCount": 1, "totalChars": 23444, "description": "...",
  "chapters": [{ "title": "全文", "content": "..." }] }
```

**Dict JSON** (`public/dicts/*.json`):
```json
{ "name": "中国当代佛教网辞典", "version": "1.0",
  "entries": [{ "term": "般若", "definition": "...", "pinyin": "", "category": "term" }] }
```

**Manifest files** (`public/sutras/manifest.json`, `public/dicts/manifest.json`): Arrays of metadata summaries matching the above structure.

## What NOT to do

- Do not follow v1.0 patterns (it was abandoned for good reason)
- Do not follow v2.0's Service/Store architecture (it had poor module boundaries — that's why v3.0 exists)
- Do not re-parse .mdx files — the JSON data in `public/dicts/` already has all 35781 entries
- Do not add emoji to code or responses
- Do not commit without pushing immediately