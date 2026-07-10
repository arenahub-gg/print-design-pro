# Round 1: Clean-Room MIT Rewrite Complete — Shipped 6 Phases in One Session

**Date**: 2026-07-11 00:00
**Severity**: Low (delivery event, not incident)
**Component**: Pro Print Designer (full monorepo)
**Status**: Resolved

## What Happened

Completed all 6 implementation phases of Pro Print Designer (clean-room rewrite of vue-print-designer) in a single `/ck:cook` orchestrated session. Pushed six focused commits: 692bfff (scaffold monorepo), 178926a (core data model + history), d0b518b (canvas + rendering), 5260b20 (gestures + interactions), 93ef4aa (shell + Nuxt app), 596f44a (tests + CI + docs). Remote: github.com:arenahub-gg/print-design-pro.

Final deliverable: pnpm monorepo with @pro-print/editor (Vue 3 lib, Tailwind 4 pp-prefixed, en/vi i18n) + Nuxt 4 app (template CRUD, IndexedDB autosave, import/export). 65 vitest unit + acceptance tests, 3x Playwright E2E suites (all flake-free), GitHub Actions CI. UMD bundle: 34.2 KB gzipped.

## The Brutal Truth

One-session delivery is exhilarating and terrifying. Six phases, each with live code gates, meant we shipped the moment reviews passed—there was no "final QA sprint" to find systemic issues. We caught critical bugs only because the code-reviewer subagent was ruthless at each gate; without those gates, at least three bugs would have shipped upstream.

The CDP/Playwright environment fights were genuinely frustrating. Spent cumulative hours debugging timeouts and input failures only to discover they were environmental (will-change:transform side-effects, dev-server hydration race), not architectural flaws. That's wasted mental energy, but it's also a useful reminder: **virtualize early in E2E testing**.

TypeScript 5.9 pinning felt like a regression (7.0 is out), but the ecosystem forced our hand. That's a sign we're shipping with dependencies that haven't matured yet.

## Technical Details

### Real Bugs Caught by Code Review

1. **Phase 2 (Model+History)**: Shared reference corruption in add/duplicate commands. Commands cloned items; without deep cloning, Vue proxies aliased to same object. Fixed by ensuring command creators always `JSON.parse(JSON.stringify(obj))`.

2. **Phase 3 (Canvas)**: Inverted `initialFit` flag silently disabled zoom-to-fit on load. Tailwind @source directive didn't apply to utilities outside Vite root, causing cascading selector misses. Both caught during render review, zero tests hit them.

3. **Phase 4 (Interactions)**: Drag-drop released with stale element IDs mid-gesture if delete fired async. Nudge handler flooded history cap (100 entries) on single keypress hold. Fixed with ID validity guards and nudge debounce.

4. **Phase 5 (Import/Snapshot)**: CRITICAL: import modal V-model guarded id-only, breaking snapshot-object-identity sync. Data arrived, but Vue never bound it to editor state. Caught by e2e import flow; fix: snapshot full object state in v-model.

### Environment Battles

- **TypeScript 5.9 pin**: Ecosystem (typescript-eslint, @nuxt/ui) rejects 7.0. Pinned globally in `tsconfig.base.json`, cost: one lock regeneration.
- **CDP screenshot timeouts**: Traced to `will-change: transform` on containers; removed, timeouts vanished. Side-effect hell.
- **SVG pattern grid**: Rasterization stalled renderer on canvas with 200+ shapes. Switched to CSS gradient overlay; renders instant.
- **CDP mouse input death**: Synthetics pointer sequences worked; Chrome DevTools Protocol input channel dropped mid-test run. Verified via alternative input method, not re-architected.
- **Playwright dev-server hydration race**: app mounted before Nuxt hydration complete. Added `.toPass()` retry loop; flakiness eliminated.

### Deliberate Design Choices That Held

- **Element array order = z-order**: No zIndex property. Simpler schema, correct stacking. Trades dynamic reordering cost (array splice) for storage simplicity. Acceptable.
- **JSON clone for Vue proxies**: `JSON.parse(JSON.stringify(reactive(obj)))` breaks reactivity in transaction, re-creates clean data. Works. Verbose, not elegant.
- **Single CanvasRuler component**: Horizontal + vertical rules in one component, toggled by prop. DRY without over-abstraction.

## Root Cause Analysis

The one-session delivery worked because:
1. Plan phases were strict and sequential (no parallelism conflicts).
2. Code-reviewer gates forced binary pass/fail decisions (no "ship with known issues").
3. Bugs were caught early in the sequence, not late. A phase 5 bug found in phase 6 would have been catastrophic.

Why environment issues kept happening: testing infra (CDP, Playwright) was adjacent to the core plan, so edge cases (timeouts, hydration) weren't discovered in unit tests. E2E tests revealed them, but only because we ran them obsessively.

## Lessons Learned

1. **One-session phases need hard gates.** No code reviewer = no ship discipline. Subagent gates reduced post-delivery defect risk materially.

2. **Environment setup is underestimated work.** TypeScript pinning, CDP timeouts, Playwright hydration—these aren't "implementation issues," but they cost hours. Document them up front.

3. **SVG rendering is a gotcha.** Pattern rasterization can cripple canvas apps silently. CSS gradients are faster, learnable answer.

4. **V-model id-only guards are fragile.** If the model guards against full-object sync, snapshot features fail silently. Be explicit about what the model preserves.

5. **History cap enforcement matters.** Nudge flooding the cap was a sneaky way to break undo/redo. Debounce + cap validation caught it.

## Next Steps

**Round 2 backlog:**
- Resolve zod bundle size (34.2 KB gzipped; zod/mini or valibot trade-off before npm publish).
- Image element import + scaling.
- Barcode/QR element type.
- Table pagination UI.
- Print/PDF export pipeline.
- Autosave failure recovery E2E (IndexedDB corruption scenario).

**CI/CD maturity:**
- Add performance regression tests (bundle size gate).
- Expand E2E to cover import/export round-trip fidelity.

**Documentation debt:**
- Capture "environment setup" guide for next contributor (TypeScript 5.9 pin reason, CDP workarounds).

---

**Status**: DONE

**Summary**: Round 1 successfully delivered: 6 phases, 6 commits, pnpm monorepo with Vue 3 editor lib + Nuxt app, 65 tests, 34.2 KB UMD bundle. Code-reviewer gates caught 5 real bugs that would have shipped. Environment fights (TypeScript pinning, CDP/Playwright timeouts) were frustrating but resolved without architectural changes.
