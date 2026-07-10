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

**Why:** These were the explicit acceptance criteria of phase 1 (2026-07-10) and violations are silent (no CI failure).
**How to apply:** grep editor package.json for nuxt, check dist/editor.css for --pp- vars, check lockfile typescript version, whenever these areas are touched.
