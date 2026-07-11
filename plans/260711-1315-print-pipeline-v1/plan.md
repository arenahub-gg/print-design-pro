---
title: 'Pro Print Designer - Round 2: Print Pipeline v1'
description: >-
  Schema-driven Canvas2D render engine powering PNG export, raster PDF export,
  browser print, and print preview - single-page documents, WYSIWYG fidelity
  consolidated in one testable module.
status: completed
priority: P2
branch: main
tags:
  - print
  - export
  - pdf
  - render-engine
blockedBy: []
blocks: []
created: '2026-07-11T06:16:19.168Z'
createdBy: 'ck:plan'
source: skill
---

# Pro Print Designer - Round 2: Print Pipeline v1

## Overview

Roadmap phase "Print pipeline v1" from the round-1 brainstorm. Deliver: export PNG (300 DPI), export PDF, browser print, print-preview modal — for single-page documents (multi-page/table pagination is a later round).

**Central decision:** render from the SCHEMA, not from DOM screenshots. One `renderToCanvas(doc, {dpi})` engine draws rect/line/circle/text onto Canvas2D at arbitrary DPI. PNG = `canvas.toBlob`; PDF = raster page embedded via pdf-lib (vector PDF deferred — Vietnamese text needs font embedding); browser print = engine output in an `@page`-sized iframe. WYSIWYG risk is consolidated into one module instead of scattered across four code paths.

**#1 fidelity risk:** canvas has no text auto-wrap — the engine's line-breaking must mirror the DOM renderer's CSS (`pre-wrap` + `break-words`, line-height 1.25). Mitigation: shared wrap util + comparison tests + preview modal showing the ACTUAL print output before paper is wasted.

**Context:** [Round-1 plan](../260710-1728-monorepo-scaffold-canvas-foundation/plan.md) · [Brainstorm report](../reports/brainstorm-260710-1728-nuxt4-print-designer-rewrite-report.md)

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Render Engine Core](./phase-01-render-engine-core.md) | Completed |
| 2 | [Image + PDF Export](./phase-02-image-pdf-export.md) | Completed |
| 3 | [Browser Print + Preview](./phase-03-browser-print-preview.md) | Completed |
| 4 | [Testing + Verification](./phase-04-testing-verification.md) | Completed |

Sequential; each depends on the previous.

## Acceptance Criteria (round 2)

- Editor topbar offers Print, Preview, Export PNG, Export PDF for the open template
- PNG downloads at 300 DPI with exact page dimensions (A4 = 2480x3508 px)
- PDF downloads as a single page sized in mm, opens in any viewer, Vietnamese text intact
- Browser print dialog shows the page at true size (@page mm) — margins/scale correct
- Preview modal shows the render-engine output (what will actually print)
- Text wrapping in print output visually matches the canvas editor within tolerance
- All existing gates stay green (lint, typecheck, build, 65+ unit, E2E)

## Out of Scope (round 2)

Multi-page/pagination, vector-text PDF (font embedding), silent/cloud print, print copies/duplex/DPI parameter UI, barcode/QR (next round).

## Dependencies

- Round-1 plan completed (6/6). New runtime dep: `pdf-lib` (editor package).
- Real-printer verification requires the user's hardware — flagged at finalize.
