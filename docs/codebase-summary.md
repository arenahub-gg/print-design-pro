# Codebase Summary

Round-1 state (2026-07-11). Monorepo map + data flow for contributors.

## Layout

```
pro-print-designer/          pnpm workspace (pnpm 11, node >= 20)
├── packages/editor/         @pro-print/editor — embeddable Vue 3 editor library
│   ├── src/render/          print pipeline: schema→Canvas2D engine, text-layout
│   │                        wrap, exportPng/exportPdf (pdf-lib lazy), print-browser
│   ├── src/core/            headless logic (NO Vue components)
│   │   ├── schema/          zod v4 template schema; TS types via z.infer
│   │   ├── commands/        command pattern + HistoryManager (undo/redo)
│   │   ├── units.ts         mm <-> CSS px (96dpi); roundMm(0.1mm)
│   │   ├── geometry.ts      rotated AABB, intersection, marquee math
│   │   ├── snapping.ts      pure candidate collection + axis snapping
│   │   ├── resize-math.ts   anchor-fixed rotated resize
│   │   ├── element-factories.ts  createRect/Line/Circle/Text defaults
│   │   └── open-template.ts the ONE supported way to open a document
│   ├── src/stores/          pinia: document, history, selection, viewport, interaction
│   ├── src/components/
│   │   ├── canvas/          CanvasViewport/Stage/Page, rulers, grid, guides,
│   │   │                    element renderers, selection/marquee/snap overlays
│   │   └── shell/           PrintDesigner (public root), topbar, palette,
│   │                        properties panel, panel-controls
│   ├── src/composables/     pointer-drag lifecycle, gestures, interactions,
│   │                        keyboard map, editor i18n (en/vi)
│   ├── src/styles/index.css Tailwind 4, `pp` prefix, @theme static tokens, @source "../"
│   └── playground/          bare Vue 3 bench (`pnpm --filter @pro-print/editor play`)
└── apps/web/                Nuxt 4 + Nuxt UI 4 app
    ├── app/pages/           landing, /templates (CRUD grid), /editor/[id] (ssr: false)
    ├── app/composables/     use-template-repository (IndexedDB via idb)
    └── e2e/                 Playwright acceptance smoke
```

## Core invariants

1. **mm is the only stored unit.** Pixels exist only at render/gesture time. `roundMm` applies at command boundaries.
2. **Every document mutation goes through a Command** dispatched via the history store. Document-store `_` mutators assert this in dev. `loadTemplate` is the single bypass — always use `openTemplate()` (clears history + selection, clones input).
3. **Element array order = paint/z-order.** No zIndex field.
4. **Gestures never touch the document until release.** Previews live in the interaction store; commit = one `updateElementsCommand`.
5. **The library owns zero persistence.** `PrintDesigner` v-model emits debounced snapshots; hosts store them (web app: IndexedDB).
6. **The store must never hold caller references** — commands clone payloads at execute time (redo corruption otherwise).
7. **Single editor instance per page** (module-level execution flag, global pinia store ids) — documented limitation.

## Data flow

```
UI event -> composable gesture -> interaction store preview -> renderers
        -> (on release) command -> HistoryManager -> document store mutation
        -> editVersion bump -> PrintDesigner debounced v-model emit
        -> host autosave (IndexedDB, validated via parseTemplate)
```

## v-model contract (PrintDesigner)

- Host passes `TemplateDocument`; editor `openTemplate`s it on mount.
- Editor emits debounced (400ms) cloned snapshots; remembers the emitted object.
- A modelValue that is NOT the last emitted snapshot object = replacement → reopen (covers same-id JSON import).
- Open never emits (baseline editVersion suppression) — no phantom saves.

## Testing

- `pnpm test` — vitest: 65 tests (units, history, schema round-trip, snapping,
  geometry, resize math incl. rotated edge handles, viewport math, shell
  component tests under happy-dom).
- `pnpm test:e2e` — Playwright (chromium): full acceptance flow — create →
  palette add → drag → undo → panel edit → reload persistence → export →
  same-id import → reload. Passed 3 consecutive runs.
- CI (GitHub Actions): install → lint → build → typecheck → unit tests.

## Bundle (round-1 measurement)

- `dist/editor.js` (ES) 152KB raw; `dist/editor.umd.cjs` 123.6KB raw / 34.2KB gz;
  `dist/editor.css` 13.3KB. zod v4 is the dominant dependency (~15-18KB gz) —
  at the recorded threshold; evaluate `zod/mini` or valibot before npm publish.

## Print pipeline (round 2)

ONE engine (`render/render-engine.ts`) produces every print artifact: PNG
export, raster PDF (pdf-lib, lazy chunk), browser print (@page-sized iframe),
and the preview modal — WYSIWYG fidelity is tested in one place. Canvas is
mm-scaled once (`ctx.scale(dpi/25.4)`); element painters mirror
ElementRenderer's math (center-rotate transform, stroke inset, pt→mm text).
Text wrapping (`text-layout.ts`) mirrors CSS pre-wrap + break-words; line
height 1.25 shared via TEXT_LINE_HEIGHT. E2E samples real pixels (rect fill
at expected mm position) and parses exported PDFs.

Known: host export buttons read the v-model snapshot, which lags the editor
by the 400ms emit debounce. Raster PDF ≈ 300KB-1MB/page; vector text needs
font embedding (later round). Print dialog: users must set margins None,
scale 100% (hinted in preview modal).

## Elements (round 3 complete)

rect · line · circle · text (static) · image (data-URL, ≤2MB upload) ·
qr (qrcode lib, EC level, square-enforced) · barcode (jsbarcode: CODE128/
EAN13/EAN8/CODE39/ITF14/UPC, showText, invalid content → editor placeholder,
print paints nothing). All lazy deps (qrcode/jsbarcode/pdf-lib) are
externalized — editor.js carries none of them. NOTE: dynamic imports are NOT
rewritten in the UMD build — script-tag consumers lose QR/barcode/PDF
features; those require ESM/bundler consumption (the supported path). Element
checklist for new
types: zod schema → factory → ElementRenderer branch (or elements/*View.vue)
→ engine painter (element-painters/) → palette tile → properties section →
i18n → round-trip test.

## Known limitations / backlog

- Table+pagination, page-number element, web component wrapper, server sync,
  vector-text PDF, image crop/fit modes, data binding: later rounds.
- Dev-guard (`import.meta.env.DEV`) compiles out of dist.
- Guides' hit bands sit above elements (z-order product call pending).
- Rotate snap is delta-relative; shift-toggle selection on pointerdown.
- E2E excluded from CI round 1 (local only).
