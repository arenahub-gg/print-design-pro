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

Phase 2 review found: add-element/add-guide commands share mutable object refs across execute() calls (redo divergence after add→update→remove→undo×3→redo); `insertAt` captured at factory time violates file's own capture-in-execute invariant. Re-check these got fixed before phase 3 canvas work builds on them.

**Why:** Phase-1 items were explicit acceptance criteria (2026-07-10) with silent violations (no CI failure); phase-2 decisions were user-ratified and re-flagging them wastes review cycles.
**How to apply:** grep editor package.json for nuxt, check dist/editor.css for --pp- vars, check lockfile typescript version, whenever these areas are touched. In phase 3+ reviews, verify command factories clone element/guide payloads at execute time.
