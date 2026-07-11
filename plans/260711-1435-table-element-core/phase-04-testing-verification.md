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
Lock round-4 behavior: layout unit matrix, E2E through export, WYSIWYG spot verification, full gates, review, docs.

## Implementation Steps
1. Unit audit: table-layout matrix (from phase 1) + TableSection component test (column remove strips cells, undo)
2. E2E `table-round4.spec.ts`: add table → edit a cell via grid editor → add column → export PNG → pixel-sample header background at expected mm position + assert cell region non-white; reload → table persists
3. Full gates + all E2E specs 2x
4. Code review (whole round), fix findings
5. Docs: element list + one-layout-function decision; sync plan; commit + push

## Implementation Notes (post-completion)
- 95 unit tests (table-layout matrix: weight normalization, wrap-driven row heights, ragged rows, header stacking, empty states; round-trip + duplicate-column-id rejection)
- E2E table-round4: add → grid-edit cell (Vietnamese) → undo AFTER debounce (toRaw regression) → add column atomic → export PNG header-bg pixel sample → reload persists; full suite 6/6 ×2
- CRITICAL bug found during live verification (not by tests): host ref() proxies the echoed snapshot → identity guard failed → openTemplate every 400ms emit → selection + undo history silently cleared in the real app. Masked previously because E2E undid within the window. Fixed with toRaw comparison; E2E now asserts undo works AFTER the debounce
- Review fixes: border→inset box-shadow (border-box shifted DOM text origin vs engine), borderWidthMm 0 = no grid, open() clears pending emit timer (phantom-save), object-valued undo snapshots cloned (table arrays), empty-table stray border line, stale-blur editCell guard, overflow tooltip localized
- Deferred: wrapText memoization for very large tables, paint-table raster unit test, positional E2E selectors

## Success Criteria
- [ ] All suites green 2x; table E2E passes
- [ ] Review findings fixed or documented
- [ ] Docs current

## Risk Assessment
- Pixel sampling on header bg → sample inside the fill, off borders/text
