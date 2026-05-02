# AGENTS.md — ai-buddhist-reader

## Project State

- **v1.0**: Archived under `archive/v1.0/`. Do not modify archived files.
- **v2.0**: Design finalized (see `docs/v2.0-detailed-design.md`). Ready for implementation.
- **Current branch**: `main` — on first file write, create a feature branch per `auto-create-branch-on-master.md` rule (format: `YYMMDD-{feat|fix|chore|refactor}-<summary>`).

## Quick Commands

```bash
npm run dev       # Start Vite dev server (port 5173)
npm run build     # Production build → dist/
npm run preview   # Preview production build
npm run lint      # ESLint with auto-fix (.vue/.js/.ts)
```

## Tech Stack (v2.0 Target)

| Layer | Technology |
|-------|-----------|
| Framework | Vue 3 (Composition API) |
| Build | Vite 5 |
| UI | Vant 4 (mobile-first) |
| State | Pinia |
| Router | Vue Router 4 |
| Storage | IndexedDB via `idb` (v2.0) |
| MDX | `mdict-js` + `lzo-wasm` |
| Deploy | Vercel (SPA rewrites to index.html) |

## Key Vite Config Notes (from v1.0, carry forward to v2.0)

- Path alias: `@` → `src/`
- `allowedHosts: ['.monkeycode-ai.online']` required for preview
- `optimizeDeps.include: ['mdict-js']` — mdict-js must be pre-bundled
- `define: { global: 'globalThis' }` — needed for mdict-js browser compatibility
- `commonjsOptions.transformMixedEsModules: true` — required for mdict-js
- Build outputs to `dist/` with sourcemaps

## Architecture (v2.0 Plan)

```
src/
├── services/       # Data access abstraction (Sutra/Dict/TTS/Settings/Stats)
├── storage/        # IndexedDB layer (db.js, *Store.js, fileCache.js)
├── engine/         # Core: dynamic Trie, highlighter, pinyin, mdxParser
├── stores/         # Pinia stores (sutra, dict, reader, setting, stats)
├── components/     # bookshelf/, reader/, dict/, common/
├── pages/          # Bookshelf, Reader, DictManager, Settings, Stats
└── data/           # Static data only (builtin dict, sutra manifest, pronunciation)
```

**Design principles**: Pure frontend first, service layer abstracted for future backend API switch, lazy-load all data, IndexedDB for structured storage.

## Iron Rules

1. **Discuss first, code only when asked**: When the user is discussing a plan, feature, or design — stay in discussion mode. Analyze, compare options, ask clarifying questions. Do NOT write project code, modify files, or create implementations until the user explicitly says to start developing (e.g., "开始开发", "开始实现", "implement this", "start coding").
2. **Push to GitHub immediately after every change**: After every file edit, code commit, configuration change, or any project modification — push to GitHub right away. The user deploys via Vercel and relies on the remote repo to preview changes. Do not wait for the next conversation turn to push.

## Workflow Rules (from MEMORY.md)

1. **After every code change**: Restart dev server (`npm run dev`) to verify changes take effect.
2. **Before pushing**: Ensure no compilation errors.
3. **Commit messages**: Must clearly describe the change.

## Project Docs

- `docs/v2.0-detailed-design.md` — Master design document: architecture, data models, modules, core flows, Zen design system, CI/CD
- `docs/plans/PROJECT_V2_PLAN.md` — Original v2.0 architecture and phase plan (reference)
- `docs/plans/archive/DICTIONARY_OPTIMIZATION_DISCUSSION.md` — Dictionary optimization decisions D1-D22 (historical reference)
- `.monkeycode/MEMORY.md` — User preferences and project knowledge

## Testing

- No test framework configured yet in v1.0 or v2.0 plan.
- When adding tests, follow Vue 3 conventions (Vitest recommended for Vite projects).

## Gotchas

- **mdict-js / mdict-ts compatibility**: These are the trickiest dependencies. Require `global` → `globalThis` polyfill, CommonJS transform, and explicit optimizeDeps inclusion.
- **IndexedDB `idb` package**: Chosen over Dexie.js for smaller bundle (~1KB gzip). Simple table structures, no ORM.
- **MDX dictionaries**: .mdx files are binary format. Small files (<5MB) should be pre-parsed to JSON in IndexedDB; large files kept as-is and queried via mdict-js.
