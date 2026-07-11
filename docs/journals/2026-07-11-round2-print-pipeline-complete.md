# Round 2: Print Pipeline V1 Complete — Unified Canvas2D Engine Shipped

**Date**: 2026-07-11 16:45
**Severity**: High
**Component**: Print Export (PNG 300dpi, PDF, Browser Print, Preview Modal)
**Status**: DONE_WITH_CONCERNS

## What Happened

Completed all 4 phases of Print Pipeline V1 same-day after Round 1. Consolidated all output formats (PNG export, raster PDF via pdf-lib, browser @page print, preview modal) into a single Canvas2D render engine backed by one schema. Pushed commit fbbb9e9 with 79 unit tests + 4 E2E tests (up from 65/0).

## The Brutal Truth

This was a compressed sprint. The time pressure exposed real gaps: TEXT_FONT_STACK contract drift (pinned only in DOM, not engine), which would have silently broken print line breaks in production. Review caught 7 warnings, all fixed, but the architecture decision to centralize WYSIWYG in one engine was right *and* risky — if that module breaks, all export paths fail together instead of gracefully degrading.

E2E testing in Chromium caught a real regression (Export button became dropdown, broke test flow) that smoke tests missed. The 400ms v-model debounce created a flaky edge case: exporting an empty document fails because the model doesn't sync before export fire. Known, documented, not blocking, but embarrassing.

## Technical Details

**Core Architecture**: Canvas2D render engine hydrated from schema → PNG (300dpi bitmap), PDF (595.28×841.89pt via pdf-lib), browser print (iframe @page rule), preview modal (same render, live). Zero DOM screenshot fallback — WYSIWYG consolidation reduces failure modes.

**Text Wrapping**: `wrapText()` logic mirrors `pre-wrap + word-break: break-word` CSS. TEXT_FONT_STACK pinned in both host DOM renderer AND Canvas2D engine after review caught one-sided contract. **Critical lesson**: public API contracts must be validated both directions.

**Review Fixes** (7 → 0):
- SVG `rx`/`ry` independent clamp parity
- Zero-extent rect stroke skip (no noise)
- Print dialog timer leak + 60s close timeout removed (raised to 10min, now cleared)
- Unguarded `printNow()` → guarded
- Dead Escape handler (fixed focus trap)
- pdf-lib falsely lazy-loaded (multi-format build inlined it) → externalized; editor.js stays 165KB

**Test Coverage**: PNG pixel-sampled corner (2480×3508, white validation), PDF parse-back via pdf-lib (595.28×841.89pt structural check), preview modal DOM. E2E regression catch (Export dropdown) proved the suite has teeth.

## Lessons Learned

1. **Centralized WYSIWYG pays off if the engine is solid.** Contract testing both directions (host→engine) is non-negotiable.
2. **E2E regression detection works.** Round 1's smoke suite caught a real UI regression Round 2 introduced. That's exactly the ROI we needed.
3. **Debounce lag is UX debt.** 400ms v-model sync means "Export empty doc" is briefly broken. Not critical, but low-hanging fix.
4. **Multi-format library inlining hides cost.** pdf-lib was falsely marked lazy because the bundler inlined the full library into editor.js for multi-format support. Externalizing it kept the bundle size honest.

## Next Steps

1. **Printer hardware verification** (owner: QA/user): margins = None, scale = 100%, real paper output. Hint in preview modal. Blocker: need user hardware.
2. **Debounce edge case** (optional, low priority): Consider < 100ms debounce or immediate export on keystroke for fast hardware. Document as known UX lag.
3. **Contract test suite expansion**: Add TEXT_FONT_STACK divergence test as regression suite baseline.

---

**Status**: DONE_WITH_CONCERNS

**Summary**: Print Pipeline V1 unified all export formats under a single Canvas2D engine (commit fbbb9e9). Architecture decision reduced WYSIWYG risk to one tested module, review found and fixed 7 issues, E2E caught a real regression. Pending: real printer verification and optional debounce lag fix for empty-doc edge case.
