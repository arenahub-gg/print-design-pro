---
phase: 1
title: Design Tokens + Theme System
status: completed
effort: 0.5-1 day
priority: P1
dependencies: []
---

# Phase 1: Design Tokens + Theme System

## Overview
Port the design's token sets (light + dark) into the editor package's Tailwind theme and wire a `[data-theme]`-driven dark mode with a persisted toggle. Chrome font becomes IBM Plex Sans/Mono (loaded by the HOST app, stack-with-fallback in the lib).

## Requirements
- Functional: `@theme static` tokens for both palettes; dark values override via `[data-theme="dark"]` CSS variable redefinition; `useEditorTheme()` composable (app-side) persisting to localStorage and stamping `data-theme` on `<html>`
- Non-functional: DOCUMENT rendering fonts unchanged (system-ui - print parity); lib ships no font binaries

## Token map (from PrintDesignPro.dc.html)
```
--color-app-bg      #f4f6f9 / #13161b     --color-app-panel  #ffffff / #1b2027
--color-app-inset   #eef1f5 / #232932     --color-app-border #e3e7ee / #2a313c
--color-app-border2 #cfd6e0 / #3a4350     --color-app-desk   #e7eaf0 / #0e1116
--color-app-text    #18202e / #e9edf3     --color-app-text2  #5b6575 / #9aa5b4
--color-app-text3   #96a0b0 / #67717f     --color-app-ok     #1f8a5b / #3dbd85
--color-brand-500 -> #2A6FDB  --color-brand-600 -> #1f5cc0 (hover)
--color-brand-soft  #e8f0fd / #1d2c45     --color-app-ok-soft #e5f3ec / #12291f
--font-ui  'IBM Plex Sans', system-ui, sans-serif
--font-uimono 'IBM Plex Mono', ui-monospace, monospace
```

## Implementation Steps
1. Rewrite `packages/editor/src/styles/index.css` @theme with the map above (replace ad-hoc brand/surface tokens); dark overrides under `[data-theme="dark"]` re-assigning the SAME variables (utilities stay theme-agnostic)
2. Sweep chrome components off hardcoded slate-* classes onto token utilities (done incrementally in phase 2 while restyling - phase 1 covers the css + a few shared classes)
3. App: add IBM Plex Google Fonts link (nuxt.config app.head), `use-app-theme.ts` composable (localStorage `pp-theme`, stamps documentElement), same for playground
4. Update existing chrome font: shell components inherit `--font-ui` via a root class on PrintDesigner

## Success Criteria
- [ ] Toggling data-theme repaints editor chrome + app pages without reload
- [ ] Document canvas page stays white in dark mode (paper is paper)
- [ ] Print output byte-identical before/after (engine untouched)

## Risk Assessment
- Tailwind emits only USED utilities; `@theme static` keeps vars present for dark override - already in place since round 1
- Google Fonts offline fallback: stacks degrade to system-ui
