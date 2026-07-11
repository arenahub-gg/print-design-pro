---
phase: 1
title: Table Schema + Layout Core
status: completed
effort: 1-2 days
priority: P1
dependencies: []
---

# Phase 1: Table Schema + Layout Core

## Overview
Table schema (zod) + `computeTableLayout` — the single pure layout function both renderers will consume. Fully unit-tested with a stub measurer before any pixel exists.

## Requirements
- Functional: schema `{type:'table', columns[{id,title,widthMm}], rows[][], fontSizePt, showHeader, headerBackground, borderColor, borderWidthMm, cellPaddingMm}`; layout returns normalized column x/width (weights → element width), per-row heights (max wrapped-line count per cell), header height, cumulative row y positions, total content height, and per-cell wrapped lines
- Non-functional: pure core (no Vue/DOM imports beyond the TextMeasurer interface already used by text-layout); zod guards: ≥1 column, rows' cell count may be ragged (missing cells = ''), id uniqueness within columns

## Architecture
```
packages/editor/src/core/schema/elements.ts   # + tableElementSchema, union member
packages/editor/src/core/element-factories.ts # createTable: 3 cols (Item/Qty/Price), 3 sample rows, 80mm
packages/editor/src/core/table-layout.ts      # computeTableLayout(table, measurer): TableLayout
    # weights -> px-free mm columns; per cell: wrapText(content, colWidth - 2*padding)
    # rowHeight = max(cell line counts) * lineHeight + 2*padding
    # header row uses same math, bold measurer variant not needed (weight ~ same width in system-ui? NO -
    #   measurer receives a setFont callback: measurer per font weight)
```
Layout contract: all outputs in mm relative to the element's local (0,0). Fonts: reuse TEXT_LINE_HEIGHT and TEXT_FONT_STACK.

## Implementation Steps
1. Schema + types + union member + factory (weights 3:1:2, padding 1.5mm, border 0.2mm, header on)
2. table-layout.ts with `TableMeasurer { measure(text, bold): number }` (bold header widths differ)
3. Unit tests: weight normalization (element 80mm, weights 30/10/20 → 40/13.33/26.67), ragged rows padded, multiline wrap grows row height, empty table (0 rows, header only), header off, total height sum
4. Round-trip test with table element

## Success Criteria
- [ ] Layout outputs stable and exact for the fixture matrix above
- [ ] Ragged row access never throws; missing cells render as ''
- [ ] Round-trip export/import preserves the table byte-identically

## Risk Assessment
- Bold header metrics differ from body → measurer takes a bold flag; both renderers honor it
- Weight normalization float drift → layout works in float mm; only commands round (existing rule)
