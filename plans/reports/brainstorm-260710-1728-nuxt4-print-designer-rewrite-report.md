# Brainstorm Report: Pro Print Designer — Clean-Room Rewrite (Nuxt 4)

- **Date:** 2026-07-10 17:28 (Asia/Bangkok)
- **Project:** `E:\development\pro-print-designer` (empty repo, greenfield)
- **Reference:** https://gitee.com/theGreatOldFive/vue-print-designer.git (v1.7.33)
- **Modes:** `--html` (editorial HTML report alongside this file)
- **Status:** Design approved by user

## Problem Statement

User wants a visual print designer (labels / receipts / forms) like vue-print-designer, rebuilt on Nuxt 4 with redesigned UI. Underlying problem: reference project is AGPL-3.0 + proprietary commercial terms (open-source version = personal non-commercial only, must keep logo/copyright). No freely licensable, embeddable, modern print designer exists in the Vue ecosystem.

## Reference Codebase Facts (scout)

- ~51,000 LOC Vue/TS, 117 files. Not a small project.
- Stack: Vue 3 + Vite + Pinia + Tailwind 3 + Monaco. Zero UI library (deliberately removed heavy deps, −65% bundle).
- 11 element types: text, image, table, barcode, QR, line, rect, circle, page-number, multi-label, wrapper.
- Custom render engine: DOM measure → pagination → iframe/image/PDF renderers.
- Pinia stores modularized: element / selection / history / layer / page / table / guide.
- 6 locales. Ships as npm lib + web component (cross-framework embedding = core value prop).
- Silent print & cloud print depend on closed PrintDot desktop client.

## Key Decisions (user-confirmed)

| Decision | Choice | Rationale |
|---|---|---|
| Source relationship | **Clean-room rewrite** | Reference behavior/UX only; own the code; legal freedom |
| Purpose | **Open-source alternative (permissive license, MIT)** | Fill the gap left by AGPL+commercial restrictions |
| Scope | **Full editor parity (phased)** | Long-haul project; MUST be decomposed into phases |
| Nuxt role | **Full app: editor + template management** | The only justification for Nuxt vs plain Vite |
| Architecture | **Monorepo library-first** | `packages/editor` (npm-installable Vue 3 lib) + `apps/web` (Nuxt 4) |
| UI stack | **Nuxt UI v3 (app shell) + custom Tailwind/Reka UI (editor)** | Speed for shell; lean bundle for lib |
| Aesthetic | **Canva-like: friendly, approachable** | Colorful accents, labeled controls, easy onboarding |
| Storage round 1 | **Local-first: IndexedDB + JSON import/export** | No server dependency; Nitro sync deferred |

## Evaluated Approaches

### Architecture
- **A. Monorepo library-first (CHOSEN):** `packages/editor` + `apps/web`. Pros: matches open-source-alternative model, npm-installable, clean boundaries, web-component wrapper easy later. Cons: ~1 week extra setup.
- **B. App-first single Nuxt project:** fastest demo, but "extract later" realistically = second rewrite; editor code roots into Nuxt auto-imports. Rejected as pre-installed tech debt.
- **C. Nuxt Layer distribution:** locks consumers into Nuxt, loses cross-framework story. Rejected.

### UI stack
- **Nuxt UI v3 + custom editor UI (CHOSEN):** shell fast/pretty/dark-mode-ready; editor canvas/panels custom anyway; editor package keeps deps minimal (Tailwind + Reka UI primitives).
- shadcn-vue: max control, more maintenance. Rejected.
- Full custom like original: best bundle, weeks wasted on dropdowns/dialogs. Rejected.

### Storage
- **Local-first (CHOSEN):** IndexedDB in app, import/export JSON in editor package.
- Nitro + SQLite/Drizzle: deferred to later round (add sync without breaking local-first).

## Final Architecture

```
pro-print-designer/            (pnpm workspace)
├── packages/editor/           # @pro-print/editor — Vue 3 lib (Vite lib mode)
│   ├── core/                  # template JSON schema (versioned), command pattern undo/redo
│   ├── components/            # canvas, elements, toolbar, properties panel
│   ├── render/                # measure → paginate → output (print iframe / image / PDF)
│   └── styles/                # Tailwind preset + design tokens
└── apps/web/                  # Nuxt 4 + Nuxt UI v3
    ├── landing                # SSR
    ├── template manager       # IndexedDB CRUD, import/export
    └── editor page            # ssr: false, hosts @pro-print/editor
```

State: Pinia modular stores (element / selection / history / page / guides) — same proven decomposition as reference, own implementation.

## Roadmap (7 phases)

1. **Canvas foundation:** page model, zoom/pan, rulers/guides, drag/resize/rotate, selection, undo/redo (command pattern)
2. **Basic elements + properties panel:** text, image, line, rect, circle; IndexedDB persistence
3. **Print pipeline v1:** browser print, image/PDF export, preview. *Validate mm↔px/DPI fidelity on real printers HERE, not later*
4. **Barcode (jsbarcode) + QR (qrcode) + page-number element**
5. **Table + smart pagination** — hardest ~30% of the work; its own sub-project
6. **Multi-label, keyboard shortcuts, dark mode, i18n (VN/EN first)**
7. **Web component wrapper + npm publish**

Out of scope: silent print / cloud print (requires desktop client; leave open via future WebSocket agent protocol). Server template sync (round 2).

## UI Direction (Canva-like)

- Top bar: file name, undo/redo, zoom, prominent Preview/Print CTA
- Left panel: large labeled element tiles + templates tab
- Center: canvas with rulers/guides
- Right: contextual properties panel, friendly labeled controls (not raw number grids)
- Light default + dark mode; rounded, colorful accents via Nuxt UI tokens

## Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| WYSIWYG print fidelity (mm↔px, DPI, browser differences) | HIGH | Test on real printers at phase 3, not project end |
| Table smart pagination complexity | HIGH | Isolated phase 5; study reference *behavior* (not code); iterate |
| Scope = months of work | MED | Phased roadmap; demoable after phases 1–3 |
| Clean-room discipline breach (AGPL contamination) | HIGH | **Never copy code verbatim from reference clone; behavior/UX reference only**; delete clone after feature spec extraction |
| Nuxt SSR/hydration issues with canvas editor | LOW | Editor page `ssr: false`; editor lib Nuxt-agnostic |

## Success Metrics

- `npm install @pro-print/editor` works in a plain Vue 3 app
- Template JSON round-trips (export → import → identical render)
- Print output matches canvas within visual tolerance on A4 + label paper
- Phases 1–3 produce a publicly demoable editor
- License: MIT, zero AGPL-derived code

## Next Steps

1. Hand off to `/ck:plan` with this report → plan Phase 1 (monorepo scaffold + canvas foundation)
2. Extract behavioral feature spec from reference (element property lists, shortcut map, print param surface) before deleting clone
3. Design tokens + UI mockup pass for Canva-like direction during Phase 1

## Unresolved Questions

- Package name availability on npm (`@pro-print/editor` — verify or pick org name)
- PDF export approach: browser print-to-PDF vs pdf-lib vs image-based — decide in phase 3 plan
- Monaco editor (template variable scripting) — needed at parity? Defer decision to phase 4+
