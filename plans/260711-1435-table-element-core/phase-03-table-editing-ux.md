---
phase: 3
title: Table Editing UX
status: completed
effort: 1-2 days
priority: P1
dependencies:
  - 2
---

# Phase 3: Table Editing UX

## Overview
Palette tile + properties-panel TableSection: column management, row management, and a compact grid editor for cell text. Every edit = one undoable command (patches of `columns`/`rows` arrays through the existing key-filtered update command).

## Requirements
- Functional: add table from palette; TableSection offers: header toggle, font size, column list (title input, weight input, remove, add), row count with add/remove-last, and a scrollable grid of cell inputs (rows x columns) committing on change; all disabled when locked
- Non-functional: panel stays usable at 280px width (grid scrolls horizontally); commits clone arrays (never mutate store refs in place)

## Architecture
```
packages/editor/src/components/shell/panel-sections/TableSection.vue  # extracted (PropertiesPanel is growing - modularize)
PropertiesPanel.vue    # renders <TableSection v-if="singleTable">
ElementPalette.vue     # table tile (grid icon)
messages.ts            # +table keys en/vi
```
Patch helpers: `patchColumns(next)`, `patchRows(next)` build cloned arrays and dispatch one updateElementsCommand with label ('Edit table', 'Add column', ...).

## Implementation Steps
1. Extract TableSection.vue (keep PropertiesPanel lean; existing sections stay put this round - note refactor for later)
2. Column editor: per-column row [title input | weight NumberField | ✕], add button (new column gets weight = average, id = newId())
3. Rows: add row (empty cells), remove last row, count display; grid editor: `<input>` matrix bound by (rowIndex, colIndex), commit-on-change patches a cloned rows array
4. Palette tile + i18n; removing a column also strips that cell index from every row (single command)
5. Guard: last column cannot be removed (min 1); locked disables everything

## Success Criteria
- [ ] Column add/remove/rename/weight and row add/remove each undo in ONE step
- [ ] Cell edits commit on change and undo restores the exact previous string
- [ ] Removing column N removes cell N from all rows atomically
- [ ] Locked table: every table control disabled

## Risk Assessment
- rows array cloning cost on big tables → fine at v1 scale (<500 cells typical); note for pagination round
- Grid editor focus loss on re-render → inputs keyed by row/col index, commit on change (not input)
