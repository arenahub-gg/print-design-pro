---
phase: 1
title: 'Core: variables + CSV + schema'
status: completed
effort: 0.5 day
priority: P1
dependencies: []
---

# Phase 1: Core — Variables + CSV + Schema

## Requirements
- `core/variables.ts`:
  - `VARIABLE_PATTERN` — `{{ name }}` (trimmed inner, `[\w.-]+`)
  - `substituteVariables(text, data)` — unknown vars keep the raw token
  - `collectVariables(doc)` — unique names across text/qr/barcode content and
    table cells + column titles, in first-appearance order
  - `resolveDocument(doc, data)` — deep clone with substitutions applied
    (merges doc.variables sample values under the given data)
- `core/csv.ts`: `parseCsv(text)` → `{ headers: string[], rows: Record<string,string>[] }`;
  RFC4180 (quoted fields, "" escapes, CRLF/LF, trailing newline); throws a
  readable error on unbalanced quotes; empty cells = ''
- schema: `templateDocumentSchema` gains `variables: z.record(z.string()).default({})`
- index.ts exports

## Files
- packages/editor/src/core/variables.ts (NEW)
- packages/editor/src/core/csv.ts (NEW)
- packages/editor/src/core/schema/template.ts
- packages/editor/src/index.ts

## Success Criteria
- [x] Unit tests: substitution edge cases, collect order/dedupe, resolve
      merges samples, CSV quotes/commas/newlines/CRLF/unbalanced errors
- [x] Legacy documents parse (variables defaults to {})
