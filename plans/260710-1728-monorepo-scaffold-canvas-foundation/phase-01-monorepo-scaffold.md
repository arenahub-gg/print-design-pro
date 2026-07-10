---
phase: 1
title: Monorepo Scaffold
status: completed
effort: 1-2 days
priority: P1
dependencies: []
---

# Phase 1: Monorepo Scaffold

## Overview
Stand up pnpm workspace with `packages/editor` (Vue 3 lib, Vite lib mode) + `apps/web` (Nuxt 4 + Nuxt UI v4), shared tooling, MIT license, git init. Everything builds empty but green.
<!-- Updated: Validation Session 1 - Nuxt UI v3→v4, Vite 7→8, pinia peer ^3 -->
Pinned toolchain (verified against npm registry 2026-07-10): nuxt ^4.4, @nuxt/ui ^4.9, vite ^8.1, tailwindcss ^4.3, pinia ^3.0, zod ^4.4.

## Requirements
- Functional: `pnpm install`, `pnpm build`, `pnpm dev` (Nuxt), `pnpm test` all work from root
- Non-functional: editor package has zero Nuxt dependency; strict TS; Windows-compatible scripts

## Architecture
```
pro-print-designer/
├── pnpm-workspace.yaml          # packages/*, apps/*
├── package.json                 # root: scripts fan-out (-r), vitest, eslint
├── tsconfig.base.json           # strict, shared compilerOptions
├── LICENSE                      # MIT
├── .gitignore, README.md
├── packages/editor/
│   ├── package.json             # name @pro-print/editor; peerDeps: vue ^3.5, pinia ^3
│   ├── vite.config.ts           # lib mode: es+umd, externalize vue/pinia; vue-tsc dts
│   ├── src/index.ts             # public API barrel (empty exports for now)
│   ├── src/styles/index.css     # Tailwind 4 entry, `pp-` class prefix strategy
│   └── tailwind.config / @theme # design tokens (Canva-like palette) via CSS-first TW4
└── apps/web/
    ├── package.json             # nuxt ^4, @nuxt/ui ^4, workspace:* editor dep
    ├── nuxt.config.ts           # modules: @nuxt/ui; routeRules /editor/**: {ssr:false}
    └── app/pages/index.vue      # placeholder landing
```

## Related Code Files
- Create: all files above + `.editorconfig`, `eslint.config.mjs` (flat config, @nuxt/eslint for app, antfu-style base for lib)

## Implementation Steps
1. `git init`, root `package.json` (private), `pnpm-workspace.yaml`, `tsconfig.base.json` (strict, moduleResolution bundler), MIT LICENSE, .gitignore
2. Scaffold `packages/editor`: Vite 8 + @vitejs/plugin-vue, lib mode (`build.lib` entry src/index.ts, formats es/umd, external vue+pinia), `vue-tsc` for .d.ts, Tailwind 4 via `@tailwindcss/vite`; export compiled `dist/style.css`
3. Scaffold `apps/web`: `nuxi init` equivalent manual setup, Nuxt 4 + @nuxt/ui v4, add `@pro-print/editor: workspace:*`, routeRules `/editor/**` ssr:false
4. Root scripts: `build` (pnpm -r build), `dev` (--filter web), `dev:lib` (--filter editor), `test` (vitest), `lint`, `typecheck`
5. Vitest workspace config at root (projects: editor unit tests)
6. Smoke check: import editor barrel in a web page, both build
7. First commit `feat: scaffold pnpm monorepo with editor lib and nuxt app`

## Success Criteria
- [ ] `pnpm install` clean on Windows
- [ ] `pnpm build` produces `packages/editor/dist/*.js + .d.ts + style.css` and `.output` for web
- [ ] `pnpm dev` serves Nuxt landing with Nuxt UI v4 component rendering
- [ ] `pnpm typecheck` + `pnpm lint` green
- [ ] Editor package.json has NO nuxt/@nuxt/* deps

## Risk Assessment
- Nuxt 4 + Nuxt UI v4 version churn → pin minor versions in package.json
- Tailwind 4 in lib + Tailwind 4 in Nuxt UI app double-processing → editor ships compiled CSS with `pp-` prefixed classes; app imports it as plain CSS (no cross-scanning). Validate no class collisions in phase 5.
- `@pro-print` scope may be taken on npm → build/publish name is placeholder; rename is a find-replace before phase 7 (roadmap) publish
