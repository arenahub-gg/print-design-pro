---
phase: 5
title: "Editor Shell + Nuxt Integration"
status: pending
effort: "4-5 days"
priority: P1
dependencies: [4]
---

# Phase 5: Editor Shell + Nuxt Integration

## Overview
Canva-like editor shell in the lib (top bar, left element tiles, right properties panel) + Nuxt app pages: template manager backed by IndexedDB, editor page hosting the lib, autosave.

## Requirements
- Functional: `<PrintDesigner v-model="template" :locale="'vi'|'en'">` public component; add element from left panel tiles (click or drag-in); properties panel edits x/y/w/h/rotation/z/lock for selection and text content/fontSize/weight/align for text elements (no inline editing); template list CRUD (create/rename/duplicate/delete) in app; autosave (800ms debounce) + dirty indicator; JSON export/import buttons
- Non-functional: editor lib stays Nuxt-free; Canva-like look (friendly labels, large tiles, warm accents, light default + `.dark` support); app pages responsive

## Architecture
```
packages/editor/src/components/shell/
├── PrintDesigner.vue        # root: provides pinia stores, layout grid, emits update:modelValue
├── EditorTopBar.vue         # doc name (inline edit), undo/redo, zoom controls, slot #actions (app injects Save/Export)
├── ElementPalette.vue       # left: large labeled tiles (Rect/Line/Circle/Text now; Image tile disabled "soon")
├── PropertiesPanel.vue      # right: contextual; PositionSizeSection, TextSection (content textarea,
│                            #   fontSize, weight, align), AppearanceSection stub, empty-state
│                            # <!-- Updated: Validation Session 1 - Text tile enabled + TextSection -->
└── panel-controls/          # NumberFieldMm.vue, AngleDial.vue, LockToggle.vue (Reka UI primitives + pp- Tailwind)
packages/editor/src/locales/en.json, vi.json + use-editor-i18n.ts (provide/inject, no vue-i18n dep)

apps/web/app/
├── pages/index.vue              # landing: hero + CTA to /templates (Nuxt UI)
├── pages/templates/index.vue    # grid of template cards, create/duplicate/rename/delete
├── pages/editor/[id].vue        # <ClientOnly><PrintDesigner/></ClientOnly>, load/save via composable
├── composables/use-template-repository.ts  # idb wrapper: templates objectStore {id, name, updatedAt, doc}
└── composables/use-autosave.ts  # watch dirty → debounce 800ms → repo.save
```
v-model contract: PrintDesigner emits debounced document snapshots; app owns persistence (lib has zero storage code).

## Related Code Files
- Create: files above
- Modify: `packages/editor/src/index.ts` (export PrintDesigner + types as public API), `nuxt.config.ts` (css import of editor style.css)

## Implementation Steps
1. Layout grid PrintDesigner.vue: topbar 56px / left 240px / canvas flex / right 280px; collapse side panels < 1024px
2. Design tokens pass: Canva-like palette (primary + warm accents), radius, spacing in TW4 `@theme`; `.dark` variant tokens
3. ElementPalette: tile click adds element at page center via command; HTML5 drag-in positions at drop point
4. PropertiesPanel: bind selection → NumberFieldMm (commit on blur/enter as command, live-preview on arrow keys), multi-select shows mixed-value state
5. Editor i18n: provide/inject `t()`, en/vi messages, locale prop
6. Nuxt pages: templates grid (Nuxt UI cards/modals for create/rename/delete confirm), editor page ClientOnly + loading state
7. use-template-repository (idb lib): schema v1, migration hook stub; use-autosave with dirty flag from history stack index
8. Export/Import buttons in topbar #actions slot (app side): download .json / file-picker import with zod error toast

## Success Criteria
- [ ] Create template → edit → reload browser → state intact (IndexedDB)
- [ ] PrintDesigner mounts in a bare Vue 3 sandbox (vite playground in packages/editor) — proves Nuxt-free
- [ ] Properties panel ↔ canvas stay in sync both directions; edits undoable
- [ ] Locale switch en/vi updates all shell strings without reload
- [ ] No horizontal scroll at 1280px; panels collapse gracefully at tablet width

## Risk Assessment
- SSR leakage (window/idb access) → all storage in app composables behind ClientOnly; lint import boundary
- v-model snapshot spam on rapid edits → emit debounced + document version counter
- Tailwind class collision lib vs Nuxt UI → `pp-` prefix verified here (phase 1 decision); visual regression eyeball pass
