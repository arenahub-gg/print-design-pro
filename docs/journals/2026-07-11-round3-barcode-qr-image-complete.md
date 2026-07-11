# Round 3: Barcode/QR/Image Elements Complete

**Date**: 2026-07-11
**Severity**: Medium
**Component**: Render engine, element system, E2E coverage
**Status**: Resolved

## What Happened

Round 3 (barcode, QR, image elements) shipped: all 4 phases completed, commit `04bc6a6` pushed. Third major round closed in ~24 hours of project life. Every new element type now follows a documented full-stack checklist: zod schema → factory → DOM view → async painter → palette tile → properties panel → i18n → round-trip test. Render engine went async to handle image loads and generative content (QR/barcode codes). Test coverage: 86 unit tests, 5/5 E2E scenarios passing.

## The Brutal Truth

Three review warnings forced mid-cycle fixes, which is annoying when you thought the code was clean. The bigger frustration: environment gremlins. Reused Nuxt dev server corrupts its own vite cache when pnpm install churns node_modules mid-session, producing cryptic `#app-manifest resolve` errors that waste 20 minutes debugging. Also discovered E2E element placement traps: newly added elements STACK at the center, so click tests hit the topmost element first—obvious in retrospect, infuriating during test authoring because the test passes silently while checking the wrong element.

The hardest truth: jsbarcode throws on bad EAN13 checksums. We handle it cleanly now (error placeholder in editor, nothing in print), but this is a signal for what's coming with tables: validation will need to be LOUD and EARLY, not a silent failure at render time.

## Technical Details

**Async render architecture**: Image `<picture>` elements cache memoized promises, not values—parallelization-safe. QR and barcode generators return promises. Per-element try/finally restores state even if generation fails. No dangling timeouts or leaked generation tickets.

**jsbarcode specifics**: Invalid EAN13 content throws. Caught at two sites: editor render shows `<span class="error">Invalid barcode</span>`, print painter paints nothing (skips SVG injection). Both protect downstream pipeline.

**E2E proof point**: QR code exported at 300dpi PNG is decoded client-side with jsQR library, content equality asserted. Scannability is proven by the test, not assumed.

**Review fixes**:
- Debounce timers were leaking on unmount (generation tickets not cleared, UI toggles held stale timeouts)
- UMD dynamic-import gap documented: script-tag consumers lose QR/barcode/PDF—ESM is the supported consumption path
- Locked-element checkboxes desynced from state—all controls now `:disabled` when element is locked

## What We Tried

Attempted to skip promise caching and cache values instead; realized it breaks parallelization (second load waits for first to complete). Reverted to promise caching.

Tried ignoring the Nuxt cache corruption for one session; lost 20 minutes to phantom build errors. Now kill dev server + `rm -r node_modules/.cache/nuxt` is the reflex.

E2E tests initially clicked at element center without positioning; tests passed but tested wrong element. Forced a discipline: position every element via properties panel immediately after adding.

## Root Cause Analysis

**Why environment issues?**: Nuxt dev server holds file watchers and vite plugin state. When `pnpm install` recreates node_modules, manifest hash changes but dev server doesn't rebuild—old references to deleted files linger. Clean restart is the only safe recovery.

**Why E2E placement trap?**: Elements initialize at canvas center in a stack (last added = top z-index). Test harness doesn't auto-position, so click events hit the topmost element. This is correct behavior; test authorship just needs discipline.

**Why review warnings?**: Code patterns (debounce, dynamic import, disabled state) don't fail loudly—they fail silently or defer failure. No static analysis caught them. Manual review found all three. Lesson: async patterns and state synchronization need higher scrutiny.

## Lessons Learned

1. **Promise caching for async resources is not optional for parallelization**—memoize the promise, not the result.

2. **Environment state corruption is real**: kill dev server + purge cache whenever `pnpm install` happens mid-session. Add this to onboarding docs.

3. **Validation errors must surface at edit time, not print time**—jsbarcode's throw is good; plan for validation in tables to be equally visible (toast, inline error, not silent failure).

4. **Silent failures in state synchronization are killers**: disabled state, debounce cleanup, locked checkboxes. Add integration tests for locked-element UI coherence.

5. **E2E element placement requires discipline**—position each new element right after adding, don't rely on hardcoded canvas center.

6. **Full-stack checklists work**: every element that follows the checklist lands correctly. Elements that skip steps invite rework.

## Next Steps

- **Backlog**: Table + pagination (the boss fight). Web component wrapper. Vector PDF export. zod/mini decision before npm publish.
- **Tooling**: Document Nuxt cache-wipe procedure in setup guide.
- **Testing**: Add integration test for locked-element UI coherence (checkbox state matches disabled attribute).
- **Code quality**: Review all debounce patterns in codebase for cleanup leaks; same for dynamic imports (list consumption paths).

---

**Status**: DONE

**Summary**: Round 3 shipped with full-stack checklist discipline, async render engine handling image/QR/barcode generation, and E2E proof of scannability. Three review warnings fixed (debounce leaks, UMD gap, locked-element desyncs); environment and test-authorship lessons extracted.
