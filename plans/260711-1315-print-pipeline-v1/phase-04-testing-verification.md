---
phase: 4
title: Testing + Verification
status: completed
effort: 1 day
priority: P2
dependencies:
  - 3
---

# Phase 4: Testing + Verification

## Overview
Lock round-2 behavior: engine/export unit coverage, E2E for export downloads + preview, pixel sanity check in real Chromium, docs refresh, all gates green.

## Requirements
- Functional: E2E covers Export PNG (file downloads, correct dimensions when decoded), Export PDF (downloads, parses), preview modal opens with rendered content
- Non-functional: no regression in the round-1 acceptance E2E; bundle: pdf-lib stays out of the initial chunk

## Related Code Files
- Modify: apps/web/e2e/editor-smoke.spec.ts (extend or add print-export spec), docs/codebase-summary.md, docs/system-architecture.md (render pipeline section), README quickstart

## Implementation Steps
1. Unit coverage audit of phases 1-2 suites; fill flagged gaps
2. E2E (real Chromium = real canvas): create template with text incl. Vietnamese → Export PNG → decode via page (Image + createImageBitmap) assert 2480x3508 → Export PDF download non-empty → open preview modal, assert canvas/img present
3. Pixel sanity in E2E: engine-rendered PNG of a rect at known mm position → sample pixel colors at expected coordinates (fill vs page white)
4. Gates: lint, typecheck, build, unit, E2E 3x flake check
5. Docs: render pipeline section (one-engine decision, raster-PDF trade-off, printer-driver caveat), bundle re-measure
6. Flag to user: real-printer verification checklist (A4 + label paper, margins None, scale 100%)

## Implementation Notes (post-review)
- 79 vitest (14 new render/text-layout tests, mock 2D context), E2E 4 tests: PNG 2480x3508 pixel-sampled (corner white, rect center painted), PDF parsed via pdf-lib (1 page, 595.28x841.89pt), preview modal aspect, round-1 smoke (updated for Export dropdown — caught real regression)
- Review fixes applied (7 warnings): SVG-parity cornerRadius (independent rx/ry clamp), zero-extent rect skip, TEXT_FONT_STACK pinned in BOTH DOM renderer and engine (host font can no longer diverge print), print fallback timer cleared + raised to 10min (dialog-open safety), load timeout 10s, printNow guarded + caught, Escape focus fix (tabindex+focus), pdf-lib EXTERNALIZED (editor.js stays 165KB; consumers' bundlers code-split the dynamic import), canvas 16384px dimension guard, deferred revokeObjectURL
- Known/documented: host export reads v-model snapshot (400ms lag; E2E waits 700ms), raster PDF size, grapheme clusters may split in char-level break (Intl.Segmenter later), real-printer verification pending user hardware
- Deferred smalls: E2E rect-center exact-color sample, Uint8Array Blob cast cleanup

## Success Criteria
- [ ] All gates green; E2E 3 consecutive passes
- [ ] Exported PNG decodes to exact expected dimensions in E2E
- [ ] PDF blob parses (pdf-lib load in page context) with correct page size
- [ ] Pixel sample test proves geometry lands where the schema says
- [ ] Docs updated; pdf-lib chunk-split verified

## Risk Assessment
- Download assertions on Windows CI-less runs: Playwright handles downloads natively; use download.path()
- Font antialiasing variance in pixel sampling → sample well inside filled regions, not at edges
