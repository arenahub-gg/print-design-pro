# System Architecture

Pro Print Designer — clean-room, MIT-licensed visual print designer.
Reference project (vue-print-designer, AGPL) informs behavior/UX only; zero code copied.

## Product shape

Two deliverables with a hard boundary:

| Unit | What | Distribution |
|------|------|--------------|
| `@pro-print/editor` | Embeddable Vue 3 editor (canvas, gestures, shell UI, schema, undo/redo) | npm library (ES + UMD + CSS + d.ts); Nuxt-free by contract |
| `apps/web` | Nuxt 4 application: landing (SSR), template manager, editor host | self-hosted app / showcase |

The library must mount in any Vue 3 app with only `vue` + `pinia` peers —
proven continuously by the playground (bare `createApp` + `createPinia`).

## Library layering

```
components/shell   PrintDesigner + topbar/palette/properties (public surface)
components/canvas  viewport, stage transform, page, rulers, overlays, renderers
composables        pointer-drag lifecycle -> gestures -> element interactions -> keyboard
stores (pinia)     document | history | selection | viewport | interaction
core               schema (zod) | commands | geometry/snapping/resize math | units
```

Rules: `core/` has zero Vue-component imports (headless, unit-testable);
components depend on stores + core; the ONLY document mutation path is
`history.dispatch(command)`.

## Key decisions (validated)

1. **Render tech:** each element = absolutely-positioned div carrying the
   rotate transform; shapes are SVG inside the div, text is styled DOM.
   Chosen for later text editing, tables, and DOM-based print rendering.
   Pan/zoom is ONE CSS transform on the stage — no re-layout while navigating.
2. **Document model:** versioned JSON (`schemaVersion: 1`), mm units,
   discriminated element union, id-uniqueness enforced at import.
   Stable-key export → byte-identical serialization for dirty checks.
3. **Undo/redo:** command pattern, 100-entry cap, gesture transactions
   (one entry per drag), nudge coalescing.
4. **Host persistence contract:** v-model snapshots out, documents in;
   snapshot-object identity distinguishes echo from replacement.
   Web app persists to IndexedDB (validated writes via `parseTemplate`).
5. **Styling isolation:** Tailwind 4 with `pp` prefix + `@theme static`
   tokens; compiled CSS ships in dist — no scanning of host code, no
   collisions with host Tailwind/Nuxt UI.

## Editor page SSR

Only `/editor/**` is `ssr: false` (canvas app; hydration adds only risk).
Landing and template manager render on the server; all storage access is
client-side (lifecycle hooks / lazy `openDB`).

## Security / trust boundaries

- JSON import is the trust boundary: full zod validation + id-uniqueness
  before anything reaches stores or IndexedDB.
- No server, no auth in round 1 (local-first by design decision).

## Roadmap anchors (rounds 2+)

Barcode/QR elements → table + smart pagination → print/PDF pipeline
(DOM-based, mm-exact) → web component wrapper + npm publish → optional
Nitro/SQLite sync. See `plans/` and the brainstorm report for details.
