---
phase: 6
title: "Testing + Verification"
status: pending
effort: "2-3 days"
priority: P2
dependencies: [5]
---

# Phase 6: Testing + Verification

## Overview
Lock round-1 behavior: unit coverage for core math/logic, component tests for critical interactions, Playwright E2E smoke for the full user flow, quality gates green, docs updated.

## Requirements
- Functional: E2E covers acceptance flow (create → add elements → transform → undo → reload persists → export/import)
- Non-functional: CI-runnable via `pnpm test` + `pnpm test:e2e`; bundle size measured and recorded; minimal GitHub Actions workflow green <!-- Updated: Validation Session 1 - CI added -->

## Architecture
```
packages/editor/
├── src/core/__tests__/           # (grown through phases 2-4) units, history, snapping, schema
└── src/components/__tests__/     # @vue/test-utils: viewport zoomAt, selection-store integration
apps/web/
├── playwright.config.ts
└── e2e/editor-smoke.spec.ts      # the acceptance flow against pnpm dev server
docs/
├── codebase-summary.md           # monorepo map, data flow, command pattern explanation
└── system-architecture.md        # lib/app boundary, v-model persistence contract
```

## Related Code Files
- Create: playwright config + spec, missing unit specs, docs above
- Modify: root package.json (`test:e2e`), README.md (quickstart, dev commands, roadmap link)

## Implementation Steps
1. Coverage audit of phases 2–4 test suites; fill gaps: units conversion table, history edge cases (redo invalidation, transaction abort), snapping thresholds, zod rejection cases
2. Component tests: viewport-store zoomAt anchoring math, selection bbox for rotated element, NumberFieldMm commit-as-command
3. Playwright E2E: templates page create → editor → palette add rect+circle → drag with assertion on properties x/y → Ctrl+Z restores → reload → IndexedDB state intact → export JSON → import into new template → canvas matches
4. Quality gates: `pnpm lint`, `pnpm typecheck`, `pnpm build`, vitest, playwright all green on Windows
5. Create `.github/workflows/ci.yml`: ubuntu-latest, pnpm cache, install → lint → typecheck → unit test → build (E2E excluded from CI round 1) <!-- Updated: Validation Session 1 -->
6. Measure editor dist size (es build gz); record in README badge-style note; flag if zod exceeds phase-2 threshold
7. Write docs/codebase-summary.md + docs/system-architecture.md (≤800 lines each per docs rule)
8. Manual verification pass on real browser: keyboard map, dark mode, tablet-width panel collapse

## Success Criteria
- [ ] `pnpm test` + `pnpm test:e2e` green from clean clone
- [ ] E2E smoke passes 3 consecutive runs (no flake)
- [ ] All round-1 acceptance criteria in plan.md checked off with evidence
- [ ] docs/ created and consistent with implemented code
- [ ] Bundle size recorded; no unexpected heavy dependency in dist

## Risk Assessment
- E2E flake from canvas pointer events → use Playwright mouse API with explicit steps, disable animations in test mode
- IndexedDB in Playwright → runs in real Chromium, fine; isolate per-test with unique DB name or storageState reset
- Windows path/script issues in CI-style run → scripts already cross-platform from phase 1; verify here
