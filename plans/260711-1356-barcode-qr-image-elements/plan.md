---
title: 'Pro Print Designer - Round 3: Barcode, QR, Image Elements'
description: >-
  Complete the label/receipt element set: image (data-URL local-first), QR
  (qrcode lib), barcode (jsbarcode) - across schema, DOM renderer, print engine
  (now async), palette, and properties panel.
status: completed
priority: P2
branch: main
tags:
  - elements
  - barcode
  - qr
  - image
blockedBy: []
blocks: []
created: '2026-07-11T06:56:41.356Z'
createdBy: 'ck:plan'
source: skill
---

# Pro Print Designer - Round 3: Barcode, QR, Image Elements

## Overview

Roadmap phase "Barcode/QR" plus the image element (labels need logos). Every
new element type lands across the FULL stack: zod schema → DOM renderer →
print-engine painter → palette tile → properties section → tests. Uses the
two lightweight deps the reference project validated: `jsbarcode`, `qrcode`.

**Structural change:** `renderToCanvas` becomes async — image loading and QR
generation are async; barcode/QR/image painters await their rasters. All four
consumers (PNG, PDF, print, preview) already live behind async flows.

**Image storage decision:** images embed as data URLs inside the template
JSON — self-contained documents that round-trip through export/import and
IndexedDB with zero infrastructure (local-first). Size guard at upload (2MB
raw) keeps documents sane; object storage is a server-sync-round concern.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Async Engine + Image Element](./phase-01-async-engine-image-element.md) | Completed |
| 2 | [QR Code Element](./phase-02-qr-code-element.md) | Completed |
| 3 | [Barcode Element](./phase-03-barcode-element.md) | Completed |
| 4 | [Testing + Verification](./phase-04-testing-verification.md) | Completed |

Sequential; each depends on the previous.

## Acceptance Criteria (round 3)

- Palette offers Image (upload → data URL), QR, Barcode tiles; all participate in drag/resize/rotate/undo like existing elements
- QR: content + error-correction level editable; scannable in exported PNG at 300 DPI
- Barcode: CODE128 default + EAN13/EAN8/CODE39/ITF14/UPC formats, show-text toggle; invalid content shows a visible error placeholder (never crashes, never prints garbage silently)
- Image: upload replaces/sets src, aspect preserved at insert, stretches to bbox after; renders identically in editor and all print artifacts
- Existing gates + round-1/2 E2E stay green; new E2E covers QR/barcode/image in exported PNG

## Out of Scope (round 3)

Data binding/variables in QR/barcode content, image crop/fit modes, image
object storage, barcode value validation UI beyond the error placeholder,
page-number element (needs multi-page), table (next round).

## Dependencies

- Rounds 1-2 complete. New deps (editor): `jsbarcode` (+@types), `qrcode` (+@types) — lazily imported like pdf-lib (externalized).
