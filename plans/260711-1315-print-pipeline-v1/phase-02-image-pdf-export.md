---
phase: 2
title: Image + PDF Export
status: completed
effort: 1-2 days
priority: P1
dependencies:
  - 1
---

# Phase 2: Image + PDF Export

## Overview
Export functions built on the render engine: PNG at 300 DPI and single-page PDF (raster page embedded via pdf-lib, page box sized in mm). Library exposes pure async functions; the app wires download buttons.

## Requirements
- Functional: `exportPng(doc, { dpi = 300 }): Promise<Blob>`; `exportPdf(doc, { dpi = 300 }): Promise<Blob>` — PDF page = widthMm x heightMm (pt = mm * 72/25.4), image fills page exactly; Vietnamese text renders (raster sidesteps font embedding)
- Non-functional: pdf-lib lazily imported (dynamic import) so the editor bundle doesn't pay for it until export is used

## Architecture
```
packages/editor/src/render/
├── export-image.ts    # renderToCanvas → canvas.toBlob('image/png')
└── export-pdf.ts      # renderToCanvas → toBlob PNG → pdf-lib embedPng → page.drawImage
apps/web/app/pages/editor/[id].vue   # topbar #actions: Export PNG / Export PDF buttons
```

## Related Code Files
- Create: export-image.ts, export-pdf.ts (+ tests)
- Modify: editor package.json (+pdf-lib), src/index.ts exports, apps/web editor page (download helpers reuse existing blob-download pattern)

## Implementation Steps
1. `pnpm --filter @pro-print/editor add pdf-lib`
2. export-image.ts: promisified toBlob, reject on null blob
3. export-pdf.ts: `const { PDFDocument } = await import('pdf-lib')`; page size in pt from mm; embedPng; metadata (title = doc.name)
4. App: dropdown or two buttons in #actions → blob → existing download flow; filename `${name}.png|.pdf`
5. Unit tests: PDF page dimensions in pt (A4 = 595.28 x 841.89), PNG blob type; pdf-lib parse-back check via PDFDocument.load

## Success Criteria
- [ ] A4 PNG = 2480x3508; label 50x30 = 591x354 (300 DPI)
- [ ] PDF loads back with pdf-lib: 1 page, mediaBox 595.28x841.89pt for A4
- [ ] pdf-lib absent from editor.js initial chunk (dynamic import verified in dist)
- [ ] Buttons download files named after the template

## Risk Assessment
- Raster PDF file size (~300KB-1MB per page at 300 DPI) — acceptable v1; vector text later
- toBlob may return null on tainted canvas — impossible here (no external images yet); still rejected explicitly for the future image element
