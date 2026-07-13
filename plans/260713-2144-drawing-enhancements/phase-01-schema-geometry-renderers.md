---
phase: 1
title: Schema + geometry + renderers
status: completed
effort: 0.5 day
priority: P1
dependencies: []
---

# Phase 1: Schema + Geometry + Renderers

## Requirements
- `strokeStyle` enum (solid/dashed/dotted, default solid) on rect, line, circle
- Line `startCap`/`endCap` (none/arrow, default none)
- `shape` element schema: kind (triangle/diamond/star/arrow/pentagon/hexagon),
  fill/stroke/strokeWidthMm/strokeStyle; added to discriminated union
- `core/shape-paths.ts`: shapePoints(kind, w, h) mm point lists;
  lineArrowGeometry(w, h, strokeW, startCap, endCap) -> shortened line span +
  arrowhead polygons; dashPattern(style, strokeW) -> number[]
- `createShape(place, kind)` factory
- ElementRenderer.vue: polygon branch for shape; stroke-dasharray on
  rect/line/circle/shape; arrowhead polygons on line
- render-engine.ts: drawShape; setLineDash in rect/line/circle/shape;
  arrowheads in drawLine (reset dash before filling heads)

## Files
- packages/editor/src/core/schema/elements.ts
- packages/editor/src/core/shape-paths.ts (NEW)
- packages/editor/src/core/element-factories.ts
- packages/editor/src/components/canvas/ElementRenderer.vue
- packages/editor/src/render/render-engine.ts
- packages/editor/src/index.ts (export createShape, shape types)

## Success Criteria
- [x] Old template JSON without new fields parses (defaults applied)
- [x] Editor SVG and engine canvas draw the same geometry (shared mm points)

