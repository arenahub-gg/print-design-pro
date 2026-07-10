---
phase: 2
title: Core Document Model + History
status: completed
effort: 3-4 days
priority: P1
dependencies:
  - 1
---

# Phase 2: Core Document Model + History

## Overview
Headless core of the editor: versioned template JSON schema (mm units), Pinia stores, command-pattern undo/redo with gesture transactions, JSON import/export with validation. No UI yet — fully unit-testable.

## Requirements
- Functional: element CRUD, z-order, lock/visibility; undo/redo ≥50 steps; export→import→identical state
- Non-functional: all mutations go through commands (no direct store writes from UI); tree-shakable; schema versioned for future migration

## Architecture
```
packages/editor/src/core/
├── schema/
│   ├── template.ts        # TemplateDocument {schemaVersion, id, name, page, elements[], guides}
│   ├── page.ts            # PageSettings {widthMm, heightMm, orientation, margins, presets: A4/A5/label}
│   ├── elements.ts        # BaseElement {id,type,xMm,yMm,widthMm,heightMm,rotation,zIndex,locked,visible,name}
│   │                      #   + RectElement/LineElement/CircleElement
│   │                      #   + TextElement {content, fontSizePt, fontWeight, align} (+Image typed stub, no UI)
│   │                      # <!-- Updated: Validation Session 1 - TextElement full schema, static text in round 1 -->
│   └── validate.ts        # zod schemas; parseTemplate(json) → typed | throws issues
├── commands/
│   ├── command.ts         # Command {execute(), undo(), label}; CompositeCommand
│   ├── history-manager.ts # undo/redo stacks, max 100, transaction batching (begin/commit for gestures)
│   └── element-commands.ts# Add/Remove/Update/Reorder/Transform commands
├── units.ts               # mmToPx/pxToMm (CSS 96dpi), round to 0.1mm
└── stores/
    ├── document-store.ts  # template state; exposes command dispatch only
    ├── selection-store.ts # selectedIds Set, marquee rect, select/toggle/clear/selectAll
    └── history-store.ts   # canUndo/canRedo/labels; wraps HistoryManager
```
Data flow: UI → dispatch(command) → HistoryManager.execute → store mutation → reactive render.

## Related Code Files
- Create: files above + `src/index.ts` exports (types, stores factory `createEditorStores(pinia)`, parse/serialize)
- Create: `src/core/__tests__/*.spec.ts`

## Implementation Steps
1. Define schema types + zod validators; `schemaVersion: 1`; serialize/deserialize helpers (stable key order for round-trip diffing)
2. Implement units.ts with tests (A4 = 210×297mm ↔ 793.7×1122.5px @96dpi)
3. HistoryManager: execute/undo/redo, transaction API (`transact(label, fn)` collapses gesture into one entry), stack cap 100
4. Element commands: add/remove (restores index), update-props (stores before/after patch), reorder z, transform (x/y/w/h/rotation)
5. Pinia stores; document-store guards: reject mutations outside command execution (dev-mode assertion)
6. Export/import JSON: `exportTemplate(doc): string`, `importTemplate(json): TemplateDocument` with zod error surfacing
7. Vitest: history (50+ undo, transaction collapse, redo invalidation on new command), CRUD, round-trip

## Implementation Notes (post-review)
- Deviation: no zIndex field — element array order IS paint/z-order (single source of truth); reorder command covers z changes
- Added beyond plan (code-review driven): `openTemplate()` helper (load + clear history/selection — prevents stale-command corruption), `renameTemplateCommand` (rename undoable + ticks editVersion), id-uniqueness superRefine on import, clone-at-execute in add commands (fixes shared-reference redo corruption), cross-variant patch key filtering
- zod bundle impact recorded: UMD total 21.1kB gz (measure ES + decide zod/mini vs valibot in phase 6)
- Known: dev-guard (`import.meta.env.DEV`) compiles out of dist — active in tests/dev source, not in published bundle (acceptable)

## Success Criteria
- [ ] Round-trip test: export → import → deepEqual passes
- [ ] 50 sequential commands undo/redo to exact initial state
- [ ] Drag gesture (transaction) = single undo entry
- [ ] zod rejects malformed template with readable issue paths
- [ ] Zero Vue-component imports in core/ (headless)

## Risk Assessment
- Command/store coupling drift → dev-mode assertion + tests enforce commands-only mutation
- zod bundle weight → zod v4 mini import path; measure in phase 6, swap to valibot only if >15kb gz impact (record actual number)
- Float drift mm↔px across zoom → round mm to 0.1 at command boundary, never store px
