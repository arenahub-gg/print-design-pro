---
phase: 4
title: Export Modal + Verification
status: completed
effort: 1 day
priority: P1
dependencies:
  - 3
---

# Phase 4: Export Modal + Verification

## Overview
Replace the plain print-preview dialog with the design's export modal (two-pane: options left, live page preview right), then verify the whole redesign: gates, full E2E (selectors updated), visual pass, review, docs, commit.

## Requirements (design lines 566-647)
- Modal 660px, radius 14, fadeUp animation: title "Xuất / In" + paper label; "Định dạng" cards (PNG / PDF / In trực tiếp - mono labels, accent border on selection); CSV batch section OMITTED (future); footer "Hủy" + primary CTA (label follows format: "Tải PNG"/"Tải PDF"/"In")
- Right pane 220px inset: live render-engine preview (150dpi, reuse existing render) on white sheet with shadow
- Topbar "Xuất / In" opens this modal; old PrintPreviewDialog superseded (print + export all in one)
- Host wiring: PrintDesigner emits nothing new - modal lives in the lib and calls exportPng/exportPdf/printDocument directly; downloads handled in-lib via the blob-download helper MOVED into the lib (host slot #actions keeps JSON export/import only)

## Implementation Steps
1. ExportDialog.vue (lib): format state, preview render on open, CTA dispatch (exportPng/exportPdf → download; print → printDocument); esc/backdrop close; i18n keys
2. Move `downloadBlob` into lib util (`render/download.ts`); host keeps its own copy for JSON (or imports the lib util - preferred)
3. Replace PrintPreviewDialog usage in PrintDesigner topbar (Preview button → opens ExportDialog too; keep old component deleted)
4. E2E updates: export PNG/PDF flows now go through the modal (update print-export.spec.ts + others touching Export dropdown - the app dropdown for PNG/PDF replaced by modal CTA; JSON stays in #actions)
5. Full gates + entire E2E suite 2x; visual side-by-side vs design; code review; docs (codebase-summary UI section, journal); commit + push

## Success Criteria
- [x] Export modal matches design; PNG/PDF download and Print work from it
- [x] Old preview dialog removed; no dead exports
- [x] Full suite green 2x with updated selectors
- [x] Review findings fixed; docs current; pushed

## Risk Assessment
- E2E churn is the real cost: three specs touch export - update carefully, keep data-test hooks stable (`data-pp-export-*`)
- Modal downloads in-lib: blob-download util must be SSR-safe (guarded by usage inside client-only editor page anyway)
