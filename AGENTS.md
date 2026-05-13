# AGENTS.md — ai-buddhist-reader

## Project State

- **v1.0**: Archived under `archive/v1.0/`. Low credibility — abandoned due to poor design. Reference only for historical context.
- **v2.0**: Archived under `archive/v2.0/`. Had working UI but poor module boundaries and fragile data layer. Design style (Zen CSS tokens) and data assets (sutras/dicts JSON) are reusable.
- **v3.0**: Ready for development. Starting fresh with clearer module boundaries, keeping v2.0's design style and data.
- **Current branch**: `main` — on first file write, create a feature branch per `auto-create-branch-on-master.md` rule (format: `YYMMDD-{feat|fix|chore|refactor}-<summary>`).

## Reusable Assets from v2.0

- **Design system**: `archive/v2.0/src/styles/tokens.css`, `base.css`, `vant-override.css` — Zen design tokens
- **Sutra data**: `public/sutras/*.json` + `public/sutras/manifest.json` — 30 sutras
- **Dict data**: `public/dicts/*.json` + `public/dicts/manifest.json` — 3 dictionaries, 35781 entries
- **Conversion scripts**: `scripts/convert-sutras.cjs`, `scripts/convert-dictionary.cjs`

## Iron Rules

1. **Discuss first, code only when asked**: When the user is discussing a plan, feature, or design — stay in discussion mode. Analyze, compare options, ask clarifying questions. Do NOT write project code, modify files, or create implementations until the user explicitly says to start developing (e.g., "开始开发", "开始实现", "implement this", "start coding").
2. **Push to GitHub immediately after every change**: After every file edit, code commit, configuration change, or any project modification — push to GitHub right away. The user deploys via Vercel and relies on the remote repo to preview changes. Do not wait for the next conversation turn to push.

## Workflow Rules (from MEMORY.md)

1. **After every code change**: Restart dev server (`npm run dev`) to verify changes take effect.
2. **Before pushing**: Ensure no compilation errors.
3. **Commit messages**: Must clearly describe the change.

## Project Docs

- `docs/v2.0-detailed-design.md` — v2.0 design document (reference only, v3.0 will have new design)
- `archive/v2.0/` — Full v2.0 source code, for reference
- `.monkeycode/MEMORY.md` — User preferences and project knowledge