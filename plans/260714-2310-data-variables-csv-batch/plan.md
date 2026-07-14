---
title: 'Round 13: Data Variables + CSV Batch Printing'
description: >-
  {{variable}} placeholders in text/QR/barcode/table content, sample values
  editable in the reserved "Data variables" panel tab, CSV upload in the
  export dialog producing multi-page batch PDF / batch print.
status: completed
priority: P1
branch: feat/round-13-data-variables
tags: [editor, data-binding, batch-printing]
created: '2026-07-14T23:10:00.000Z'
createdBy: 'claude'
source: user-request
---

# Round 13: Data Variables + CSV Batch Printing

## Overview

The label-printing killer feature: design once, print hundreds with data.

**Model (KISS — no new element type):**
- Any TEXT content, QR content, BARCODE content, or TABLE cell may contain
  `{{variable}}` placeholders (pattern `{{name}}`, word chars/dots/dashes).
- Variables are INFERRED by scanning the document — no separate definition
  step. The document stores `variables: Record<string, string>` (zod
  `.default({})`, migrated by the openTemplate choke point) holding SAMPLE
  values used for editor preview and single exports.
- Batch: the export dialog accepts a CSV (header row = variable names); each
  data row renders one page → multi-page PDF or batch browser print.

**Single sources:**
- `core/variables.ts`: VARIABLE_PATTERN, substitute(), collectVariables(),
  resolveDocument(doc, data) → substituted clone consumed by BOTH the DOM
  preview and the render engine (parity rule as always).
- `core/csv.ts`: minimal RFC4180 parser (quotes, escaped quotes, CRLF) —
  no dependency.

**Out of scope (YAGNI):** formulas/expressions, per-element data sources,
images-from-URL columns, conditional visibility, Excel files (.xlsx).

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Core: variables + CSV + schema](./phase-01-core-variables-csv.md) | Completed |
| 2 | [Editor: variables tab + live preview](./phase-02-editor-variables-tab.md) | Completed |
| 3 | [Batch export: PDF/print + dialog](./phase-03-batch-export.md) | Completed |
| 4 | [Tests + verification + ship](./phase-04-tests-ship.md) | Completed |

## Acceptance Criteria

- Typing `{{name}}` in a text/QR/barcode/table cell registers "name" in the
  variables tab; setting a sample value renders it live on canvas AND in
  single PNG/PDF/print output
- Old documents (no variables field) still open
- CSV with quoted fields/commas/newlines parses correctly; header maps to
  variables; missing columns fall back to sample values
- Batch PDF has one correctly-rendered page per data row; batch print sends
  N pages in one job
- All gates green, full E2E suite passes, review findings fixed
