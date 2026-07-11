---
phase: 2
title: Table Renderers (DOM + Engine)
status: completed
effort: 1-2 days
priority: P1
dependencies:
  - 1
---

# Phase 2: Table Renderers (DOM + Engine)

## Overview
Both renderers consume `computeTableLayout`: the DOM view positions cells absolutely from the layout (NOT HTML table auto-layout), the engine painter strokes/fills/draws text from the same layout. A shared canvas-2d measurer keeps them metric-identical.

## Requirements
- Functional: header row (bold, background fill), body rows, grid borders (single color/width), per-cell wrapped text left-aligned with padding, clip at element heightMm; editor-only overflow indicator (small badge) when contentHeight > heightMm
- Non-functional: DOM view re-lays-out only when table props change (computed); measuring canvas shared/memoized

## Architecture
```
packages/editor/src/core/table-measurer.ts    # canvas-2d TableMeasurer factory (font stack + pt size + bold)
packages/editor/src/components/canvas/elements/TableView.vue
    # computed layout -> absolutely positioned cell divs + border box divs; overflow badge
packages/editor/src/render/element-painters/paint-table.ts
    # same layout -> ctx: header bg fill, row lines, column lines, outer border, fillText per wrapped line
ElementRenderer.vue    # table branch -> TableView
```

## Implementation Steps
1. table-measurer.ts: singleton offscreen canvas, `createTableMeasurer(fontSizePt)` returning measure(text, bold)
2. TableView.vue: computed layout; render cells (header + body) as positioned divs with overflow hidden; borders as one absolutely-positioned grid of hairline divs (or single SVG); clip wrapper at heightMm; overflow badge bottom-right (editor chrome, `data-pp-table-overflow`)
3. paint-table.ts: clip to box, header background, text lines at same x/y math as TableView (padding + baseline), borders via strokeRect/lines
4. Wire ElementRenderer branch; verify visually in playground: editor vs preview modal pixel-agreement

## Success Criteria
- [ ] Same table renders with identical geometry in editor and preview modal (spot-check line breaks + row heights)
- [ ] Header bg + bold render in both; borders align on both
- [ ] Overflow: both clip; indicator only in editor
- [ ] 100-row table doesn't hitch the canvas (layout memoized per prop change)

## Risk Assessment
- Baseline math divergence DOM vs canvas → reuse the same firstBaseline formula from render-engine text
- Hairline borders at zoom → same counter-scale approach used by selection chrome not needed (borders are document content, scaling with zoom is CORRECT here)
