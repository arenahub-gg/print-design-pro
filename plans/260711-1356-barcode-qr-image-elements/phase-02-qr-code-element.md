---
phase: 2
title: QR Code Element
status: completed
effort: 1 day
priority: P1
dependencies:
  - 1
---

# Phase 2: QR Code Element

## Overview
QR element end to end using the `qrcode` library (lazy-imported, externalized like pdf-lib): schema, DOM renderer (data-URL img regenerated on prop change), engine painter, palette tile, properties section.

## Requirements
- Functional: schema `{type:'qr', content, ecLevel L|M|Q|H, color, backgroundColor}`; square-ish rendering (QR fills the min(w,h) square, centered); properties: content textarea, EC level select, colors later (keep defaults #000/#fff v1 — colors in schema for forward-compat)
- Non-functional: `qrcode` lazy-imported in both DOM renderer and painter; empty content → editor placeholder, print paints nothing

## Architecture
```
packages/editor/src/core/schema/elements.ts        # + qrElementSchema, union member
packages/editor/src/core/element-factories.ts      # createQr(place, content='https://...')
packages/editor/src/render/element-painters/paint-qr.ts
    # qrcode.toCanvas offscreen at raster size ≥ px target, drawImage centered square
packages/editor/src/components/canvas/elements/QrView.vue
    # watches content/ecLevel → qrcode.toDataURL → <img>; async, placeholder while generating
ElementRenderer.vue                                # qr branch → QrView
ElementPalette.vue / PropertiesPanel.vue           # tile + QrSection
```

## Implementation Steps
1. `pnpm --filter @pro-print/editor add qrcode @types/qrcode`; add to vite externals + optional import note (qrcode has no UMD global concern — document)
2. Schema + type + factory (default 30x30mm, content 'https://example.com', ecLevel M)
3. QrView.vue: debounced regeneration (200ms) on content/ecLevel change; error → placeholder
4. paint-qr.ts: `toCanvas` with width = square px target (element min-dimension * pxPerMm), margin 0; drawImage centered in bbox
5. Palette tile (QR icon), properties QrSection (content textarea, ecLevel select), i18n en/vi
6. Tests: schema round-trip with QR, factory defaults, painter mock assertions (drawImage args square+centered)

## Success Criteria
- [ ] QR renders in editor, updates live when content edits
- [ ] Exported 300dpi PNG QR is scannable (manual/E2E decode check in phase 4)
- [ ] Non-square bbox keeps QR square and centered (no distortion - scannability)
- [ ] Round-trip export/import preserves QR props

## Risk Assessment
- Distorted QR unscannable → enforced square draw within bbox
- qrcode lib ESM/CJS interop under vite external → verify import shape in app build
