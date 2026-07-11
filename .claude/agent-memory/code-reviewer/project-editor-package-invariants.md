---
name: project-editor-package-invariants
description: Standing review invariants for @pro-print/editor package boundary and toolchain pins
metadata:
  type: project
---

Standing invariants to re-check in every phase review of pro-print-designer:

- `packages/editor` must have ZERO nuxt/@nuxt/* dependencies (main/dev/peer). It is an embeddable Vue 3 lib; only `apps/web` may depend on Nuxt.
- Editor Tailwind 4 uses `prefix(pp)` (CSS-first config in `src/styles/index.css`) so utilities/vars are `pp:*` / `--pp-*` — prevents collision with host app Tailwind/Nuxt UI.
- TypeScript intentionally pinned `^5.9` (NOT TS 7) for typescript-eslint + @nuxt/ui peer compat — do not flag as outdated.
- Repo uses pnpm 11 `allowBuilds` map in pnpm-workspace.yaml (replaces v10 `onlyBuiltDependencies`); approved builds: @parcel/watcher, esbuild, vue-demi. Phase-1 review flagged engines `pnpm: ">=9"` as too loose (pnpm 10 ignores `allowBuilds` and silently blocks native builds).
- MIT clean-room constraint: never compare with or fetch vue-print-designer source during reviews.

Phase 2 (core doc model + history, reviewed 2026-07-11) settled decisions — do NOT re-litigate:

- Array order = z-order; deliberately NO zIndex field (single source of truth).
- JSON clone (`cloneJson`) instead of structuredClone — Vue reactive proxies reject structuredClone.
- Module-level `executionDepth` flag in history-manager.ts — editor is single-instance per page (documented limitation).
- zod bundle-size concern deferred to phase 6 measurement.
- Dev-guard on `_`-prefixed store mutators uses `import.meta.env.DEV` — compiled OUT of published dist at lib build time; only protects in-repo dev/tests.

Phase 2 review found: add-element/add-guide commands share mutable object refs across execute() calls; `insertAt` captured at factory time. VERIFIED FIXED in phase-3 review (2026-07-11): addElementCommand/addGuideCommand clone payload at execute time, index read inside execute. Closed.

Phase 3 (canvas foundation, reviewed 2026-07-11) settled decisions — do NOT re-flag: SVG-pattern grid replaced with CSS gradients (raster stall); will-change:transform removed from CanvasStage (froze CDP screenshot capture); div+SVG-in-div per-element rendering is a validated decision. Open items to re-check in phase 4: CanvasViewport didInitialFit flag inverted (ResizeObserver refit is dead code — breaks fit when mounted in zero-size container); isSpaceDown not reset on blur; ruler guideStart has no button filter and bubbles into container pan handler; three duplicated per-drag listener/capture patterns (gestures, guide-from-ruler, guide move) that phase-4 element drag would make four — extract shared drag helper.

Round 2 print pipeline (reviewed 2026-07-11) accepted trade-offs — do NOT re-flag: raster PDF (no vector text/font embedding until later round); host export reads v-model snapshot lagging 400ms (E2E waits it out); print dialog margins/scale are user responsibility (hint string); text first-baseline approximation (0.5lh + 0.3em) vs browser half-leading; CDP env quirks. Open items for next round: cornerRadius rx/ry clamp divergence (SVG elliptical vs canvas roundRect min-clamp), stroke painted on degenerate zero-size rect in canvas only, font-family not pinned in ElementRenderer text div (inherits host font, engine hardcodes system-ui), print-browser 60s fallback timer not cleared on afterprint (iframe removed under open dialog), Escape-close on non-focusable preview overlay, pdf-lib not externalized in lib build (lazy-import claim false for UMD dist).

Round 3 QR/barcode/image (reviewed 2026-07-11): ALL round-2 open items verified fixed (rx/ry independent clamp, zero-extent rect skip, fontFamily pinned in ElementRenderer, print-browser timer cleanup on afterprint, focusable preview overlay, pdf-lib externalized). Accepted trade-offs — do NOT re-flag: image stretch-to-bbox, data-URL storage + 2MB guard, barcode proportional scaling, raster QR/barcode in print, renderToCanvas sync→async break (pre-1.0, all callers updated). Open items for round 4: (1) QrView/BarcodeView debounce timer not cleared on unmount (no onUnmounted); (2) UMD dist renders `await import("qrcode")` verbatim — output.globals for qrcode/jsbarcode/pdf-lib never applies to dynamic imports, script-tag UMD consumers broken for QR/barcode/PDF (ESM+Node fine); (3) locked-element checkbox desync (showText/bold toggle DOM flips, commitSingle no-ops, :checked never re-syncs — controls not disabled when locked); (4) paint-image cache memoizes value not promise (safe only while engine awaits sequentially); (5) drawElement lacks try/finally around painter dispatch (restore skipped if painter ever throws).

Round 5 UI redesign (reviewed 2026-07-11) — two SYSTEMIC gotchas verified empirically:

- Tailwind 4 prefix gotcha #2: with `prefix(pp)`, the prefix MUST be the first variant (`pp:hover:bg-x`). Variant-first forms (`hover:pp:bg-x`, `disabled:pp:opacity-40`, `focus:pp:*`, `max-lg:pp:*`) are SILENTLY DROPPED — no CSS emitted, no build error. Verified with @tailwindcss/cli 4.3.2 + `source(none)` minimal compile. Round-5 codebase had 51 such dead classes across 9 shell files. Re-check every new `pp:` class for prefix-first ordering until an eslint/stylelint guard exists.
- Windows encoding corruption: round-5 edits introduced UTF-8-read-as-cp1252 mojibake into previously-clean files: `°`→`Â°` (PropertiesPanel), `✕`→`âœ•`, `−`→`âˆ’`, plus a UTF-8 BOM prepended to TableSection.vue. Sweep every review with `git diff | grep -n 'â\|Â\|ï»¿'` (expect false positives on legit Vietnamese; verify hits byte-level).

Round 5 accepted trade-offs — do NOT re-flag: app/lib token duplication (two Tailwind roots), document fonts stay system-ui (print parity), variables/CSV/auth screens omitted, Templates page keeps Nuxt UI cards. Open items for round 6: dark-mode `--pp-color-brand-700` never overridden (align-active button unreadable in dark); CanvasRuler canvas colors hardcoded light (rulers don't theme); lib/app theme composables hold independent module refs synced only at init (stale toggle labels after cross-surface toggle); no pre-paint theme script (FOUC + hydration mismatch on SSR pages); StatusBar PRESET_LABELS hardcoded Vietnamese in en locale; rename input never autofocused; duplicate/delete logic duplicated panel vs keyboard (panel copy skips the live-gesture guard); ExportDialog preview render unhandled rejection + silent export failures; host [id].vue re-implements downloadBlob the lib now exports.

**Why:** Phase-1 items were explicit acceptance criteria (2026-07-10) with silent violations (no CI failure); phase-2 decisions were user-ratified and re-flagging them wastes review cycles.
**How to apply:** grep editor package.json for nuxt, check dist/editor.css for --pp- vars, check lockfile typescript version, whenever these areas are touched. In phase 3+ reviews, verify command factories clone element/guide payloads at execute time.
