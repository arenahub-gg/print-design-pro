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
Lock round-3 behavior: E2E for the three new elements through the full pipeline (palette → canvas → export PNG), QR scannability decode check, regression suites green, docs refresh.

## Requirements
- Functional: E2E adds image (upload fixture), QR, barcode via palette; exports PNG; decodes the QR from the exported PNG (BarcodeDetector in Chromium or jsQR devDep) and asserts content matches
- Non-functional: rounds 1-2 E2E untouched and green; jsbarcode/qrcode absent from editor.js initial bundle

## Implementation Steps
1. Unit coverage audit for phases 1-3; fill gaps
2. E2E `elements-round3.spec.ts`: create template → add image (setInputFiles with a small PNG fixture) → add QR (set content via properties) → add barcode → export PNG → in-page decode: BarcodeDetector if available else jsQR (add as web devDep) → assert QR content; assert barcode/image pixels painted (non-white samples at expected positions)
3. Verify bundle: editor.js contains neither jsbarcode nor qrcode (externalized); record sizes
4. Full gates: lint, typecheck, build, unit, E2E all specs 2x
5. Docs: codebase-summary element list + painter dir; README element list
6. Sync plan, commit, push

## Implementation Notes (post-completion)
- 86 unit tests; new: paint-image (cache/failure/stretch via stubbed Image), createImage aspect, schema round-trips for qr/barcode/image, format enum rejection
- E2E `elements-round3`: palette add QR/barcode/image, invalid EAN13 → placeholder visible, image upload via filechooser buffer fixture, positions set via panel (overlap blocks clicks — placeSelected helper), export PNG → in-page crop of QR region → **jsQR decode equals typed content** (scannability proven)
- Full suite 5/5 ×2 green; bundle: qrcode/jsbarcode/pdf-lib externalized (only import specifiers in editor.js)
- Env note: reused Nuxt dev server corrupts vite cache when pnpm install churns node_modules mid-session (`#app-manifest` resolve error) — fixed by killing server + clearing node_modules/.cache/nuxt; recorded for future rounds
- Phases 2+3 implemented together (parallel structure); QrView/BarcodeView share the debounced-regeneration pattern with generation tickets against stale async writes

## Success Criteria
- [ ] QR decoded from exported PNG equals the content typed in properties
- [ ] All E2E specs (rounds 1-3) green twice consecutively
- [ ] Bundle: no eager jsbarcode/qrcode/pdf-lib in editor.js
- [ ] Docs current

## Risk Assessment
- BarcodeDetector availability varies → jsQR fallback pinned as devDep makes decode deterministic
- Image fixture pathing on Windows → use path.join relative to spec dir
