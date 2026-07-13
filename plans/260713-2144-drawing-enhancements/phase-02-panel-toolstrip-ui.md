---
phase: 2
title: Panel + tool strip UI
status: completed
effort: 0.5 day
priority: P1
dependencies: [1]
---

# Phase 2: Panel + Tool Strip UI

## Requirements
- PropertiesPanel "Nét vẽ" section for rect/circle/line/shape: segmented
  solid/dashed/dotted buttons, strokeWidthMm NumberField (mm), rect-only
  cornerRadiusMm NumberField
- Line "Mũi tên" row: start/end arrow checkboxes
- colorProps: shape case (fill + stroke)
- ElementToolStrip: "Hình" tile opens a small popover with 6 shape kinds
  (data-pp-shape-kind hooks); closes on pick/outside/Escape
- LayersPanel glyph for shape
- i18n keys en/vi (panel.strokeSection, stroke.solid/dashed/dotted,
  panel.strokeWidth, panel.cornerRadius, panel.arrows, panel.arrowStart,
  panel.arrowEnd, palette.shape, shape.triangle...hexagon)

## Files
- packages/editor/src/components/shell/PropertiesPanel.vue
- packages/editor/src/components/shell/ElementToolStrip.vue
- packages/editor/src/components/shell/LayersPanel.vue
- packages/editor/src/locales/messages.ts

## Success Criteria
- [x] All stroke/arrow edits are undoable commands, locked elements blocked
- [x] Shape popover keyboard/outside-click behavior sane

