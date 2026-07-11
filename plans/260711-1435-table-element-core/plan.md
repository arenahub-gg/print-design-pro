---
title: 'Pro Print Designer - Round 4: Table Element Core'
description: >-
  Table element with shared layout math: proportional columns, auto row heights
  via the same text-wrap used in print, DOM + engine renderers driven by ONE
  computeTableLayout, properties-panel data editing. Pagination deferred to
  round 5.
status: completed
priority: P2
branch: main
tags:
  - table
  - elements
  - layout
blockedBy: []
blocks: []
created: '2026-07-11T07:37:04.390Z'
createdBy: 'ck:plan'
source: skill
---

# Pro Print Designer - Round 4: Table Element Core

## Overview

The roadmap's hardest chunk, split in two: THIS round ships the table element
itself (schema, layout, rendering, editing); round 5 ships smart pagination
(multi-page overflow with repeated headers - it drags multi-page into
PDF/print/preview and deserves its own plan).

**Central decision - one layout function:** WYSIWYG for tables dies when the
editor uses HTML auto-layout and print re-implements it. So `computeTableLayout`
(pure, in core) computes column x-positions, per-row heights (via the SAME
wrapText used by the print engine), and total height; the DOM view renders
absolutely-positioned cells FROM the layout, and the engine painter draws FROM
the layout. Editor and paper agree by construction.

**Geometry model:** column `widthMm` values are treated as WEIGHTS normalized
to the element's `widthMm` (resize just works - no per-type gesture logic).
`heightMm` is a viewport: content taller than the box clips with a visible
editor-only overflow indicator (round-5 pagination consumes the overflow).

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Table Schema + Layout Core](./phase-01-table-schema-layout-core.md) | Completed |
| 2 | [Table Renderers (DOM + Engine)](./phase-02-table-renderers-dom-engine.md) | Completed |
| 3 | [Table Editing UX](./phase-03-table-editing-ux.md) | Completed |
| 4 | [Testing + Verification](./phase-04-testing-verification.md) | Completed |

Sequential; each depends on the previous.

## Acceptance Criteria (round 4)

- Palette Table tile inserts a 3-column starter table; drag/resize/rotate/undo work like any element
- Properties panel edits: column titles/weights/add/remove, row add/remove, cell text (grid editor); every edit is one undoable command
- Multiline cell content wraps inside its column; row height grows to fit
- Editor pixels match exported PNG pixels for the same table (one layout source)
- Content taller than the element box: clipped in BOTH editor and print, indicator in editor only
- All existing suites stay green; new E2E covers add→edit cells→export PNG with painted table

## Out of Scope (round 4)

Pagination/multi-page (round 5), per-cell styling/spans/merges, column drag-resize on canvas, inline cell editing on canvas (properties grid is v1), data binding, sort/formulas.

## Dependencies

Rounds 1-3 complete. No new runtime deps.
