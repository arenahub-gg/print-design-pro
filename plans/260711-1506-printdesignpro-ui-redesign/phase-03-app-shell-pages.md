---
phase: 3
title: App Shell + Pages
status: completed
effort: 1 day
priority: P1
dependencies:
  - 2
---

# Phase 3: App Shell + Pages

## Overview
Sidebar app shell + Home/Templates/Settings pages per design (lines 143-316), replacing the Nuxt UI default look with the PrintDesignPro token styling. Editor route stays full-screen (no sidebar).

## Requirements
- Sidebar 220px: logo "P" + "PrintDesignPro" wordmark, primary "+ Thiết kế mới" (creates template → editor), nav (Trang chủ / Thư viện mẫu / Cài đặt) with glyph + active state (accent-soft bg), spacer, theme toggle row
- Home: greeting header + search input (filters recents client-side), "Bắt đầu nhanh" grid of paper-size cards (A6/Tem 50x30/K80/A4 → create with that preset), "Thiết kế gần đây" cards (real IndexedDB recents; page-shaped thumb placeholder, name + mono size · relative time)
- Templates: existing manager restyled to design cards (preview area, name, mono size, actions menu kept)
- Settings: "Giao diện" light/dark swatch cards (drives useAppTheme); shop-profile/printer/units sections OMITTED (no backing feature) - note under panel: coming later
- Layout: default layout with sidebar; editor page uses layout:false (already)

## Architecture
```
apps/web/app/layouts/default.vue        # sidebar shell (NEW)
apps/web/app/composables/use-app-theme.ts  # from phase 1
apps/web/app/pages/index.vue            # Home per design (replaces landing)
apps/web/app/pages/templates/index.vue  # restyle
apps/web/app/pages/settings.vue         # NEW
nuxt.config.ts                          # fonts head links, ui colors accent
```
Keep Nuxt UI components where convenient (dropdown, toast) but skin with token classes; sidebar/nav/cards are plain markup + Tailwind (app side uses the app's own Tailwind via Nuxt UI - reuse editor tokens by duplicating the small token block in main.css, single source noted).

## Success Criteria
- [ ] /  = Home with working quick-start + recents (click opens editor)
- [ ] Sidebar nav + active states + theme toggle work and persist
- [ ] /templates keeps full CRUD; /settings theme cards switch instantly
- [ ] Editor unaffected (full-screen)

## Risk Assessment
- Token duplication app vs lib: acceptable now (two Tailwind roots); note consolidation option (shared css import) in docs
- E2E: templates-page selectors preserved (New template button text stays)
