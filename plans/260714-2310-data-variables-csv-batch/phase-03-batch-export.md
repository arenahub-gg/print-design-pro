---
phase: 3
title: 'Batch export: PDF/print + dialog'
status: completed
effort: 0.5 day
priority: P1
dependencies: [2]
---

# Phase 3: Batch Export — PDF / Print + Dialog

## Requirements
- render pipeline: single exports run through resolveDocument(doc,
  doc.variables); new `exportPdfBatch(doc, rows, options)` renders one page
  per row into ONE pdf-lib document; `printDocumentBatch(doc, rows, options)`
  puts N page-break-separated images into the print iframe (guard: cap rows
  at a sane limit e.g. 500, reject 0 rows)
- ExportDialog: when the document uses variables, show a "Batch data (CSV)"
  section — file input, parsed row count, warning listing variables missing
  from the CSV header (they fall back to samples), CTA switches to
  "Download PDF (N pages)" / "Print N pages"; PNG stays single (uses samples)
- CSV errors surface in the existing errorText slot
- i18n en/vi/zh

## Files
- packages/editor/src/render/render-engine.ts or callers (resolve before render)
- packages/editor/src/render/export-pdf.ts (+exportPdfBatch)
- packages/editor/src/render/print-browser.ts (+printDocumentBatch)
- packages/editor/src/components/shell/ExportDialog.vue
- packages/editor/src/index.ts, locales

## Success Criteria
- [x] 3-row CSV → PDF parses as 3 pages, each with its row's values
- [x] Batch print iframe contains 3 imgs with page breaks
- [x] Dialog validates: bad CSV → readable error; no rows → CTA disabled
