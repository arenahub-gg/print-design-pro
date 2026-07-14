---
phase: 2
title: 'Editor: variables tab + live preview'
status: completed
effort: 0.5 day
priority: P1
dependencies: [1]
---

# Phase 2: Editor — Variables Tab + Live Preview

## Requirements
- Left panel: "Data variables" tab becomes real (tab switch state in
  PaperPresetPanel or split into LeftPanel with two tabs). Lists
  collectVariables(doc); each row = mono `{{name}}` label + sample-value
  input committing via a new `setVariableCommand` (undoable, roundtrip-safe).
  Empty state explains the `{{name}}` syntax. Vars no longer present keep
  their samples (harmless, still listed only if used — show unused stored
  samples greyed with a clear affordance? NO — YAGNI: list only used vars).
- Live preview: TextView/ElementRenderer text branch, QrView, BarcodeView and
  TableView substitute through `substituteVariables(content, doc.variables)`
  so the canvas shows sample data. Properties panel textareas keep RAW
  content (editing the source).
- Single export path: PrintDesigner's export dialog + host exports feed
  `resolveDocument(doc, doc.variables)`-equivalent (engine substitutes via
  resolveDocument before render).
- i18n keys en/vi/zh (tab title drops "Soon", empty-state hint, sample
  placeholder).

## Files
- packages/editor/src/components/shell/PaperPresetPanel.vue (tabs real)
- packages/editor/src/components/shell/VariablesPanel.vue (NEW)
- packages/editor/src/core/commands/element-commands.ts (setVariableCommand)
- packages/editor/src/components/canvas/ElementRenderer.vue + elements/*View.vue
- packages/editor/src/locales/messages.ts

## Success Criteria
- [x] `{{name}}` typed into text shows in tab; sample renders on canvas
- [x] Sample edits are undoable; locked docs unaffected
- [x] QR/barcode regenerate when sample changes
