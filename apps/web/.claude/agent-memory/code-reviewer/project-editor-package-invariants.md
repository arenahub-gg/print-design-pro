---
name: project-editor-package-invariants
description: Review invariants for @pro-print/editor - parity contract, load-path zod gap, patch key filter, Tailwind pp: prefix
metadata:
  type: project
---

Invariants to check when reviewing @pro-print/editor changes:

- Editor/print parity: SVG view (ElementRenderer.vue, mmToPx per coordinate) and Canvas2D engine (render-engine.ts, ctx.scale(pxPerMm) once) must share one mm geometry source (core/shape-paths.ts, core/table-layout.ts). Check linejoin/linecap, stroke inset conventions (rect/circle inset by strokeWidth/2; line/shape straddle), dash patterns, path start/direction (dash phase).
- Canvas state: drawElement wraps paintByType in save()/restore() (try/finally), so setLineDash/lineJoin/clip cannot bleed between elements. Explicit resets inside painters are redundant.
- **Load-path zod gap (found round 6)**: zod `.default()` on new schema fields is NOT a runtime migration. Live path IndexedDB -> repo.get() (raw) -> [id].vue template prop -> openTemplate (cloneJson only) -> loadTemplate never runs parseTemplate. Only `save()` and `importTemplate` parse. Combined with the next invariant this makes new-field UI silently no-op on legacy docs.
- updateElementsCommand filters patch keys via `key in element` (element-commands.ts ~line 69). Patching a field the in-memory element lacks is SILENTLY DROPPED. Any new schema field must be guaranteed present at load, or its panel controls dead on legacy docs.
- Tailwind: variant order must be `pp:hover:` never `hover:pp:` (silent failure). Grep diffs for `hover:pp:|focus:pp:|disabled:pp:`.
- Record<ElementType, ...> maps (e.g., LayersPanel GLYPHS) are exhaustiveness-checked by vue-tsc, so new element types are caught at typecheck; runtime switches (paintByType, colorProps) need manual verification.
- Dynamic i18n keys use the established `t(key as never)` escape hatch; verify both en and vi blocks in locales/messages.ts.
- Host app (apps/web) constructs no element literals; additive required-with-default schema fields are compile-breaking only for external consumers.

**Why:** Round-6 review found the load-path gap made all new stroke controls no-op on pre-existing IndexedDB documents despite passing unit tests (tests only exercised parseTemplate).
**How to apply:** For any round adding schema fields, trace the actual document load path end-to-end, not just the parse function tests.
