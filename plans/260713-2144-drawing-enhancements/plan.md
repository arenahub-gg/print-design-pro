---
title: 'Pro Print Designer - Round 6: Drawing Enhancements'
description: >-
  Stroke styles (solid/dashed/dotted), line arrowheads, new polygon shape
  element (triangle/diamond/star/arrow/pentagon/hexagon), stroke width +
  corner radius panel controls.
status: completed
priority: P2
branch: main
tags:
  - editor
  - drawing
  - shapes
created: '2026-07-13T14:45:00.000Z'
createdBy: 'claude'
source: user-request
---

# Round 6: Drawing Enhancements

## Overview

User request: lines/borders need more styles (dashed, arrows, ...), shapes
likewise, and more shapes should be addable.

**Scope:**
- `strokeStyle: solid | dashed | dotted` on rect, line, circle, shape
  (zod `.default('solid')` — old documents keep parsing)
- Line `startCap`/`endCap: none | arrow` (filled triangle heads, line
  shortened under the head so dashes don't poke through)
- NEW `shape` element: `kind: triangle | diamond | star | arrow | pentagon |
  hexagon` + fill/stroke/strokeWidth/strokeStyle. ONE polygon-point module
  (`core/shape-paths.ts`) feeds both the SVG view and the engine painter —
  same parity rule as computeTableLayout.
- Panel: "Nét vẽ" section (style segmented control + stroke width mm;
  corner radius for rect), "Mũi tên" toggles for line, shape colors join the
  existing colorProps map. Tool strip gets a "Hình" tile with a kind popover.

**Out of scope (YAGNI):** table border styles, freehand/pen tool, gradient
fills, dash pattern editor, connectors/snapping between shapes.

**Parity invariant:** dash patterns and polygon points are computed in mm by
shared core modules; the SVG view converts to px, the engine consumes mm
directly. Shape strokes straddle the path in BOTH renderers (no inset) —
identical output, may overflow the box by strokeWidth/2 (overflow-visible).

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Schema + geometry + renderers](./phase-01-schema-geometry-renderers.md) | Completed |
| 2 | [Panel + tool strip UI](./phase-02-panel-toolstrip-ui.md) | Completed |
| 3 | [Tests + verification](./phase-03-tests-verification.md) | Completed |

## Acceptance Criteria

- Dashed/dotted render identically in editor and exported PNG/PDF/print
- Line arrowheads at either/both ends, undoable, dash-safe
- 6 shape kinds addable from the tool strip, fill/stroke editable, colors in panel
- Old saved templates (no new fields) still open
- All gates green + full E2E suite passes
