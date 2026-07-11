---
phase: 3
title: Browser Print + Preview
status: completed
effort: 1-2 days
priority: P1
dependencies:
  - 2
---

# Phase 3: Browser Print + Preview

## Overview
Browser print through a hidden iframe carrying the render-engine output at exact `@page` mm size, plus a preview modal in the shell showing the same output — the user sees the ACTUAL print rendering before committing paper.

## Requirements
- Functional: `printDocument(doc): Promise<void>` — hidden iframe, `@page { size: <w>mm <h>mm; margin: 0 }`, full-page `<img>` from the engine canvas, `contentWindow.print()`, cleanup after afterprint/timeout. Shell preview modal (`PrintPreviewDialog.vue`): engine render scaled to fit, DPI note, Print + Export buttons
- Non-functional: iframe removed even when the user cancels the dialog; no popup blockers (iframe, not window.open)

## Architecture
```
packages/editor/src/render/print-browser.ts   # printDocument(doc, { dpi = 300 })
packages/editor/src/components/shell/PrintPreviewDialog.vue
                                              # teleported overlay, renders engine canvas
EditorTopBar.vue                              # Preview + Print buttons (left of #actions)
```
Print flow: render canvas → dataURL → iframe srcdoc (img onload → print) → remove iframe on afterprint or 60s fallback.

## Related Code Files
- Create: print-browser.ts, PrintPreviewDialog.vue
- Modify: EditorTopBar.vue (buttons + i18n keys), locales/messages.ts, index.ts exports

## Implementation Steps
1. print-browser.ts: build srcdoc (html/body margin 0, img width:100% display:block, @page rule), append iframe, await img load via onload message or iframe onload + rAF, call print, cleanup listener
2. PrintPreviewDialog.vue: prop `open`, renders on open (async), canvas → img fit-contain in modal, footer: Print / Export PNG / Export PDF / Close; Escape closes; pp-prefixed styling
3. Topbar: printer + eye buttons with i18n (`topbar.print`, `topbar.preview`); wire through PrintDesigner (dialog lives in shell root)
4. Manual verification in real browser: print dialog paper size matches page preset, scale 100%, margins none

## Success Criteria
- [ ] Print dialog shows A4 page at 100% scale, no browser-added margins (verified manually)
- [ ] Label preset (50x30mm) produces 50x30 `@page` — dialog offers matching paper handling
- [ ] Preview modal output pixel-identical to exported PNG (same engine call)
- [ ] Iframe cleaned up after print AND after cancel
- [ ] Editor page keyboard/undo state untouched by preview open/close

## Risk Assessment
- Browser print dialogs override @page unpredictably per driver — v1 documents "set margins to None, scale 100%" in the preview modal hint; real-printer test flagged to user at finalize
- Large dataURL (A4@300dpi ≈ 2-4MB) in srcdoc — acceptable; blob URL fallback if a browser chokes
