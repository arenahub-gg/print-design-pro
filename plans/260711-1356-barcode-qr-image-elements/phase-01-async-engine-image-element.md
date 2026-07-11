---
phase: 1
title: Async Engine + Image Element
status: completed
effort: 1-2 days
priority: P1
dependencies: []
---

# Phase 1: Async Engine + Image Element

## Overview
Make the render engine async (prerequisite for every raster-producing element), then ship the image element end to end: data-URL storage, DOM renderer, engine painter, palette upload flow, properties section.

## Requirements
- Functional: `renderToCanvas` returns `Promise<HTMLCanvasElement>`; image element renders in editor + all print artifacts; palette Image tile opens a file picker (png/jpeg/webp, ≤2MB), inserts at page center sized to the image's aspect (max 80mm wide); properties panel offers Replace image; empty/broken src shows a placeholder in editor but paints NOTHING in print (no broken-image glyphs on paper)
- Non-functional: data-URL guard at upload; engine loads each unique src once per render (cache map)

## Architecture
```
packages/editor/src/render/render-engine.ts   # async; drawElement dispatches to async painters
packages/editor/src/render/element-painters/  # NEW dir as painters multiply
│   ├── paint-image.ts    # loadImage(src) → ctx.drawImage stretched to bbox
│   └── (qr/barcode land here in phases 2-3)
packages/editor/src/components/canvas/ElementRenderer.vue  # <img> branch, draggable=false
packages/editor/src/components/shell/ElementPalette.vue    # Image tile enabled → hidden file input
packages/editor/src/components/shell/PropertiesPanel.vue   # ImageSection: Replace button
packages/editor/src/core/element-factories.ts              # createImage(place, src, aspect)
```
Schema: `imageElementSchema` already exists (src string) — no schema change.

## Implementation Steps
1. Engine async refactor: `renderToCanvas` + `drawElement` async; consumers (export-image, export-pdf, print-browser, PrintPreviewDialog) await — signatures already Promise-based outward
2. paint-image.ts: `loadImage` via `new Image()` promise, per-render cache `Map<string, HTMLImageElement>`; skip paint on load failure (print never shows broken glyphs)
3. ElementRenderer: image branch — `<img :src>` w-full h-full object-fill, draggable=false, pointer-events none (wrapper handles gestures); broken/empty src → dashed placeholder box (editor only)
4. Palette: enable Image tile → hidden `<input type=file accept>`; read as data URL (FileReader), reject >2MB with inline hint; compute natural aspect via Image load; `createImage` factory + addElementCommand
5. PropertiesPanel ImageSection: Replace image button (same picker, updateElementsCommand patch src — undoable)
6. i18n keys (en/vi); unit tests: engine async path, image cache, factory aspect math; update existing engine tests to await

## Success Criteria
- [ ] All round-2 engine/export tests pass with async engine
- [ ] Upload → insert at center with correct aspect; resize/rotate/undo work
- [ ] Exported PNG contains the image pixels at the right mm position
- [ ] Broken src: editor placeholder visible, print output clean
- [ ] 2MB guard rejects oversized files with a user-visible message

## Risk Assessment
- Data-URL bloat in IndexedDB/exports → 2MB guard + documented; autosave payloads grow but stay local
- Image CORS: data URLs are same-origin — no canvas tainting possible
