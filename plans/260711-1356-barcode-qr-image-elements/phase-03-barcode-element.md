---
phase: 3
title: Barcode Element
status: completed
effort: 1 day
priority: P1
dependencies:
  - 2
---

# Phase 3: Barcode Element

## Overview
Barcode element via `jsbarcode` (lazy, externalized): schema with format enum, DOM renderer, engine painter, palette, properties. Invalid content (e.g. bad EAN13 checksum) must degrade to a visible error placeholder - jsbarcode THROWS on invalid input.

## Requirements
- Functional: schema `{type:'barcode', content, format CODE128|EAN13|EAN8|CODE39|ITF14|UPC, showText, lineColor}`; barcode stretches to bbox (bars scale, standard practice); showText renders human-readable line under bars; invalid content → editor shows red dashed placeholder with message, print paints nothing
- Non-functional: jsbarcode lazy-imported both sides; regeneration debounced

## Architecture
```
core/schema/elements.ts             # + barcodeElementSchema (format enum), union member
core/element-factories.ts           # createBarcode(place, content='123456789012', format CODE128)
render/element-painters/paint-barcode.ts
    # jsbarcode onto offscreen canvas at target px, try/catch → skip paint on invalid
components/canvas/elements/BarcodeView.vue
    # jsbarcode → offscreen canvas → dataURL <img>; catch → error placeholder
ElementRenderer.vue / ElementPalette.vue / PropertiesPanel.vue  # branch + tile + BarcodeSection
```
jsbarcode options: `{ format, displayValue: showText, lineColor, margin: 0, background: 'transparent' }` then stretch-draw to bbox.

## Implementation Steps
1. `pnpm --filter @pro-print/editor add jsbarcode @types/jsbarcode`; vite external + globals entry
2. Schema + factory (60x20mm default, CODE128 '123456789012', showText true)
3. BarcodeView.vue: watch props → regenerate (debounced 200ms), try/catch invalid → placeholder div with error text
4. paint-barcode.ts: offscreen canvas raster at element px size, try/catch skip; stretch drawImage to bbox
5. Palette tile + BarcodeSection (content input, format select, showText checkbox), i18n en/vi
6. Tests: schema round-trip, factory, painter invalid-content skip, format enum rejection in zod

## Success Criteria
- [ ] CODE128 renders and scans from exported PNG (phase-4 E2E)
- [ ] EAN13 with invalid checksum: editor placeholder, no crash, print clean
- [ ] showText toggle reflects in both editor and print
- [ ] Format switch regenerates live; all props undoable

## Risk Assessment
- jsbarcode throws synchronously on invalid content → try/catch at BOTH render sites (view + painter)
- Bar-width fidelity when stretching to bbox: scanners tolerate proportional scaling; documented
