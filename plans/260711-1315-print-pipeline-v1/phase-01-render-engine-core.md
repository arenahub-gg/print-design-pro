---
phase: 1
title: Render Engine Core
status: completed
effort: 2-3 days
priority: P1
dependencies: []
---

# Phase 1: Render Engine Core

## Overview
Pure schema→Canvas2D renderer at arbitrary DPI + a text line-breaking util shared conceptually with the DOM renderer's CSS behavior. Headless, fully unit-testable (happy-dom provides canvas API surface; geometry assertions run against a mock 2D context).

## Requirements
- Functional: `renderToCanvas(doc, { dpi })` draws page background, rect (fill/stroke/corner radius), line, circle/ellipse, text (font size pt→px at DPI, weight, align, color, wrapping) honoring rotation, visibility, and element array paint order
- Non-functional: no DOM dependency beyond `document.createElement('canvas')`; identical geometry math to editor renderers (reuse `units.ts`, `geometry.ts`)

## Architecture
```
packages/editor/src/render/
├── render-engine.ts   # renderToCanvas(doc, opts): HTMLCanvasElement
│                      #   scale = dpi/25.4 px per mm; ctx.scale once, draw in mm
│                      #   per element: save → translate(center) → rotate → draw local → restore
├── text-layout.ts     # wrapText(ctx, content, maxWidthMm, font): lines[]
│                      #   mirrors CSS pre-wrap (explicit \n) + word wrap + break-words
│                      #   (char-level fallback for overlong words); lineHeight = 1.25 * fontSize
└── __tests__/         # render-engine.spec.ts, text-layout.spec.ts
```
Key: draw in mm coordinates with a single `ctx.scale(pxPerMm, pxPerMm)` — all element math stays in mm, DPI is one number.

## Related Code Files
- Create: files above
- Modify: `src/index.ts` (export renderToCanvas + types)

## Implementation Steps
1. `text-layout.ts`: split on `\n`, greedy word wrap via `ctx.measureText`, char-level break for words wider than maxWidth; unit tests with a stub measureText (monospace width model)
2. `render-engine.ts`: canvas sized `mm * dpi/25.4` (rounded), white page fill, per-element transform (translate to center, rotate, draw at [-w/2,-h/2] local box) — mirrors ElementRenderer's CSS transform exactly
3. Element painters: rect (roundRect path, fill then stroke, stroke inset half like SVG renderer), line (horizontal at mid-height), ellipse, text (font string `${weight} ${sizePx}px system-ui, sans-serif`, textBaseline alphabetic, per-line y advance, align via x offset)
4. Unit tests: canvas dimensions per preset/DPI; mock-context call assertions for transform order, paint order, skip invisible; text-layout wrap cases (empty, \n, long word, exact fit)

## Success Criteria
- [ ] A4 at 300 DPI → 2480x3508 canvas (±1px rounding)
- [ ] Rotated rect's transform sequence matches editor math (unit-asserted)
- [ ] wrapText: explicit newlines preserved, greedy wrap correct, overlong words broken
- [ ] Zero imports from components/ or stores/ (pure core)

## Risk Assessment
- Canvas text metrics differ from DOM: same font stack + size math keeps drift small; comparison happens visually in phase 3 preview and E2E pixel checks in phase 4
- happy-dom lacks real 2D context: tests assert against a recorded mock context, not pixels (pixel checks land in Playwright, phase 4)
