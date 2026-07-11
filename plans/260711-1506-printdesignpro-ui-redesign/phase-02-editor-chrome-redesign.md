---
phase: 2
title: Editor Chrome Redesign
status: completed
effort: 1-2 days
priority: P1
dependencies:
  - 1
---

# Phase 2: Editor Chrome Redesign

## Overview
Restyle the editor to the design's layout: topbar with center tool strip, left paper-preset panel, right layers+properties panel, status bar, compact rulers, dot-grid desk.

## Requirements (from design, lines 318-564)
- Topbar 52px: logo tile "P" (emits `home` - host decides nav), doc name (13px/600, inline rename kept) + autosave dot (ok green, host-driven via `saving` prop), center tool strip in inset rounded container (46x42 tiles: glyph 15px IBM Plex Mono + 9px label, hover accent-soft) for rect/line/circle/text/qr/barcode/table/image, undo/redo 28px squares, zoom cluster (−/mono %/+), theme toggle 32px bordered square, primary CTA "Xuất / In" 34px accent
- Left panel 248px: tabs "Mẫu" (active, accent 2px underline) | "Biến dữ liệu" (disabled + "Sắp có"); Mẫu = paper presets (A4/A5/Tem 100x150/Tem 50x30/K80 80x120/A6) as design's mini-preview list rows (40px thumb, name + mono size, hover accent border); click = setPageSettingsCommand (undoable)
- Right panel 264px: "Lớp" section (max-height 220 scroll): rows 30px with type glyph (mono), name, badge; click selects; TOP of array renders LAST = topmost → list shows reversed; "Thuộc tính" below: selected name + type chip (accent-soft), 2-col dims grid (inset boxes: mono label X/Y/W/H + input + mm), existing per-type sections restyled, footer "Nhân bản"/"Xóa" buttons
- Status bar 28px: ok dot "Sẵn sàng", paper select (mono 10px), flex, zoom %, "mm"
- Canvas: rulers 22px, desk `--color-app-desk` with radial dot grid 20px

## Architecture
```
EditorTopBar.vue        # full redesign; emits home; props saving?: boolean
ElementToolStrip.vue    # NEW (was ElementPalette tiles) - lives in topbar
PaperPresetPanel.vue    # NEW left panel (paper presets via command)
LayersPanel.vue         # NEW right-panel section
PropertiesPanel.vue     # restyle: chip, dims grid, duplicate/delete footer
PrintDesigner.vue       # new grid: rows [52px 1fr 28px], cols [248 1fr 264]
StatusBar.vue           # NEW
CanvasViewport/Ruler    # 22px thickness, token colors, desk dot grid
ElementPalette.vue      # DELETED (superseded by tool strip + preset panel)
```
i18n: +keys (tab labels, layers, duplicate, statusReady, paper names, comingSoon).

## Success Criteria
- [ ] Editor visually matches design screens (side-by-side in browser)
- [ ] All element tools work from the strip incl. image upload flow
- [ ] Layers list selects + shows selection sync; duplicate/delete work
- [ ] Paper preset switch is undoable and re-fits the viewport
- [ ] E2E selectors updated (`data-pp-palette-tile` moves to strip) - suite green

## Risk Assessment
- E2E churn: keep `data-pp-palette-tile` attribute names on strip tiles to minimize spec edits
- Topbar overflow at narrow widths: strip scrolls horizontally (design does the same)
