---
title: 'Pro Print Designer - Round 5: PrintDesignPro UI Redesign'
description: >-
  Reskin the editor and app to the PrintDesignPro design (claude.ai/design
  project e81d4bc8): IBM Plex type, #2A6FDB accent, dark theme, topbar tool
  strip, layers panel, sidebar app shell, export modal.
status: completed
priority: P2
branch: main
tags:
  - ui
  - redesign
  - theme
  - design-sync
blockedBy: []
blocks: []
created: '2026-07-11T08:10:05.943Z'
createdBy: 'ck:plan'
source: skill
---

# Pro Print Designer - Round 5: PrintDesignPro UI Redesign

## Overview

Implement the user's Claude Design project **PrintDesignPro.dc.html**
(claude.ai/design p/e81d4bc8-9872-4d8b-ac96-67d6933d8c7a; extracted copy in
scratchpad). Design system: IBM Plex Sans/Mono, accent #2A6FDB, full
light/dark token sets via `[data-theme]`, Vietnamese-first UI.

**Structural changes from the design:**
- Editor topbar (52px): logo→home, doc name + autosave dot, CENTER element
  tool strip (46px glyph tiles - replaces the left palette), undo/redo, zoom
  cluster, theme toggle, primary "Xuất / In" CTA
- Left panel (248px): paper-size presets styled as the design's template list
  ("Mẫu" tab); "Biến dữ liệu" tab shown disabled (data binding = future round)
- Right panel (264px): "Lớp" layers list (real: select/reorder from element
  array) above "Thuộc tính" (restyled dims grid, mono font + mm suffix,
  Nhân bản/Xóa buttons)
- Status bar (28px): ready dot, paper preset select, zoom, mm
- Canvas chrome: 22px rulers, dot-grid desk background
- App shell: 220px sidebar (logo, "+ Thiết kế mới", nav, theme toggle),
  Home/Templates/Settings pages
- Export modal replaces the plain preview dialog (formats PNG/PDF/Print +
  preview pane)

**Explicitly NOT in scope (no backing feature yet - documented, not faked):**
Login/Onboarding (no auth), variables/data binding, CSV batch data panel,
template gallery content, default-printer setting. UI affordances for these
appear only where the design degrades gracefully (disabled tab).

**Constraint:** DOCUMENT rendering fonts stay system-ui (print engine parity
pinned in round 2) - IBM Plex applies to CHROME only. Changing document fonts
is a separate feature (font support with engine + PDF embedding).

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Design Tokens + Theme System](./phase-01-design-tokens-theme-system.md) | Completed |
| 2 | [Editor Chrome Redesign](./phase-02-editor-chrome-redesign.md) | Completed |
| 3 | [App Shell + Pages](./phase-03-app-shell-pages.md) | Completed |
| 4 | [Export Modal + Verification](./phase-04-export-modal-verification.md) | Completed |

## Acceptance Criteria (round 5)

- Editor chrome matches the design: topbar layout, tool strip, layers panel, status bar, compact rulers, dot desk (visual diff vs design screens)
- Dark theme toggles instantly (persisted) and covers editor chrome + app pages
- App: sidebar nav with Home (quick sizes + recents), Templates, Settings (theme choice)
- Export modal: PNG/PDF/Print selection with page preview; replaces old preview dialog flow
- Paper preset select in status bar switches page size (undoable command)
- ALL existing behavior intact: gates green, full E2E suite passes (selectors updated where chrome moved)

## Dependencies

Rounds 1-4 complete. Fonts: Google Fonts link in app + playground (lib itself ships no font files).
