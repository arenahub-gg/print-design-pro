---
phase: 3
title: "Canvas Foundation"
status: pending
effort: "4-5 days"
priority: P1
dependencies: [2]
---

# Phase 3: Canvas Foundation

## Overview
Visual stage: page rendered at true mm scale, smooth zoom/pan, mm rulers, toggleable grid, draggable guides. Elements render read-only (interaction is phase 4).

## Requirements
- Functional: zoom 10–400% (ctrl+wheel around cursor, buttons, fit-to-screen, 100%); pan (space+drag, middle-mouse, trackpad); rulers track zoom/pan; guides created by dragging from rulers, removable
- Non-functional: 60fps pan/zoom with 100 elements (CSS transform only, no reflow); crisp rulers on HiDPI

## Architecture
```
packages/editor/src/components/canvas/
├── CanvasViewport.vue    # scroll/gesture capture; owns viewport-store binding
├── CanvasStage.vue       # transformed container: translate(offset) scale(zoom)
├── PageView.vue          # white page widthMm→px, print-margin outline, drop shadow
├── ElementLayer.vue      # v-for elements → ElementRenderer (read-only this phase)
├── ElementRenderer.vue   # each element = absolutely-positioned div + rotate transform;
│                         # shapes drawn as SVG inside the div, text as styled DOM
│                         # <!-- Updated: Validation Session 1 - render tech fixed: DOM div + SVG-in-div -->
├── RulerHorizontal.vue / RulerVertical.vue  # <canvas> 2d, devicePixelRatio-aware
├── GridOverlay.vue       # SVG pattern, 1mm minor / 10mm major, toggle
└── GuideLayer.vue        # guides from store; drag-from-ruler creation
packages/editor/src/stores/viewport-store.ts  # zoom, offsetX/Y, fitToPage(), zoomAt(point)
packages/editor/src/composables/use-canvas-gestures.ts  # wheel/pointer/space-pan logic
```
Rendering: single CSS transform on CanvasStage; rulers/grid re-draw from viewport store watch (rAF-throttled).

## Related Code Files
- Create: files above
- Modify: `src/index.ts` (export components), `document-store` (guides array already in schema from phase 2)

## Implementation Steps
1. viewport-store: zoom clamp [0.1, 4], `zoomAt(screenPoint, delta)` keeps cursor-anchored point stable, `fitToPage(containerSize)`
2. CanvasViewport + CanvasStage: pointer capture, space-key pan mode (cursor: grab), ctrl+wheel zoom, plain wheel = scroll/pan
3. PageView: mm→px via units.ts, margin outline from PageSettings, page presets render correctly (A4 portrait/landscape, 100×150mm label)
4. ElementRenderer read-only: absolute div per element; rect/line/circle as SVG-in-div, text as styled DOM span from schema props <!-- Updated: Validation Session 1 - render decision + text element -->
5. Rulers: canvas 2d, tick density adapts to zoom (1/5/10mm steps), highlight cursor position, DPR scaling
6. GridOverlay SVG pattern + toggle in viewport-store; GuideLayer: dragging from ruler spawns guide (command → undoable), double-click removes
7. Perf pass: rAF-throttle ruler redraws; verify no layout thrash via DevTools with 100 seeded elements

## Success Criteria
- [ ] Zoom at cursor keeps point under cursor stationary (10%↔400%)
- [ ] Fit-to-screen centers page with padding at any container size
- [ ] Rulers show correct mm values at every zoom level (spot-check 25/100/300%)
- [ ] Guides: create by ruler drag, undoable, persist in template JSON
- [ ] 100-element page pans at ~60fps (no per-frame layout in performance trace)

## Risk Assessment
- Blurry rendering at fractional zoom → integer-round stage offset; test text later phases
- Wheel/gesture conflicts (browser zoom, trackpad pinch) → preventDefault only inside viewport; ctrl+wheel = zoom convention
- HiDPI ruler blur → canvas sized ×DPR, drawn scaled
