# Brainstorm & Plan Validation: Pro Print Designer Architecture Round 1

**Date**: 2026-07-10 14:00-18:00
**Severity**: High (architectural foundation locked)
**Component**: Project initiation, licensing, tech stack, phased roadmap
**Status**: Complete

## What Happened

Conducted full brainstorm and validation session for Pro Print Designer greenfield rebuild (Vue 2/TS → Nuxt 4/Pinia). Established licensing posture, architecture, tech stack, storage model, phased delivery plan (6 phases across ~2 months), and validation feedback loop. Caught and corrected pre-implementation tech drift. Generated 6 Claude task cards ready for sequential execution.

## The Brutal Truth

This session narrowly avoided a common trap: **starting development on outdated documentation**. The brainstorm documents specified Nuxt UI v3 and Vite 7 because those were the latest when the project spec was drafted weeks ago. A 15-minute registry check during validation caught that v4 and v8 have shipped. Had we not validated tech versions before writing Phase 1 code, we would have scaffolded on a superseded major version and either spent days retroactively upgrading dependencies or shipped with outdated security/performance characteristics.

The licensing decision was the hardest truth to swallow: **zero code copying from the reference repo despite 51k LOC of free reference material**. The original vue-print-designer carries AGPL-3.0 + proprietary commercial license (personal non-commercial only; must retain logo). Reusing even small utility functions creates derivative work liability and kills commercial viability. Clean-room rewrite is the only safe path, but it means rebuilding features from UX screenshots and behavioral observation, not from working code. This adds risk and timeline variance that cannot be front-loaded.

## Technical Details

**Licensing Posture:**
- Reference: vue-print-designer (Gitee, v1.7.33), AGPL-3.0 + proprietary commercial terms
- Decision: MIT license, clean-room rewrite, behavior/UX reference only, ZERO code copying
- Rationale: Commercial viability + legal clarity trumps speed of copying

**Architecture (User-Approved):**
- Monorepo (pnpm) with library-first design
  - `packages/editor`: Vue 3 component library (npm-installable)
  - `apps/web`: Nuxt 4 full application (landing, template manager, editor page with ssr:false)
- Render tech: DOM absolute-positioned divs + SVG-in-div per canvas element (not single canvas 2D, not single SVG scene)
  - Rationale: Future-proofs text selection, table rendering, print fidelity
- UI framework: Nuxt UI for app shell + custom Tailwind/Reka UI for editor
- Aesthetic: Canva-like (clean, minimal, product-grade)
- Storage Phase 1: Local-first IndexedDB + JSON import/export (no backend auth/sync in round 1)

**Tech Stack (Post-Validation Corrections):**
- Previously documented: Nuxt UI v3, Vite 7
- Actually latest: @nuxt/ui 4.9.0, Vite 8.1.4, Pinia 3
- Decision: Adopt latest majors (v4 UI, Vite 8, Pinia 3) — no benefit to lagging

**Phased Delivery (6 phases):**
1. Monorepo scaffold + docs setup
2. Core data model + undo/redo history
3. Canvas rendering (DOM absolute + SVG-per-element)
4. Interactions (selection, drag, resize, transform)
5. Nuxt app shell + landing + template manager
6. Testing + GitHub Actions CI + docs completion

**Round 1 Scope Decisions:**
- ✓ Static TextElement with properties-panel editing (no inline/rich editing yet)
- ✗ Table rendering deferred to Phase 5 (round 2+)
- ✓ Minimal GitHub Actions (lint + build + unit tests on PR)

## What We Tried

1. **Licensing options explored:**
   - Reuse small utils from reference repo (rejected: derivative work risk)
   - Fork + relicense (rejected: AGPL fork trap)
   - Clean-room reference implementation (accepted: safe, viable, honest)

2. **Architecture patterns:**
   - Single canvas 2D approach (rejected: conflicts with text/table rendering, print fidelity)
   - Single SVG scene (rejected: interactive element selection becomes complex)
   - DOM absolute + SVG-per-element (accepted: flexibility for future, known trade-off on perf at scale)

3. **Tech stack validation:**
   - Checked npm registry for latest @nuxt/ui, Vite, Pinia (corrected from v3→v4 drift)

4. **Storage model:**
   - Deferred backend auth/sync to Phase 5+ (accepted: MVP works offline)

## Root Cause Analysis

**Why the Nuxt UI v3 error happened:**
The brainstorm spec was drafted from an earlier project phase; npm registries had shipped v4 in the interim. No automated check compared documented versions against current releases. The lesson is not to blame the writer—it's that **assumptions about tech versions require explicit verification before code commit**, not after. The validation step caught this because it included a "What's the latest major of each dependency?" lookup.

**Why clean-room was chosen:**
Reference code is legally encumbered (AGPL + proprietary), and Gitee's terms aren't as clear as GitHub's regarding forks. Copying constitutes derivative work. The decision reflects that **commercial open-source viability outweighs development speed** for this project. This is a human trade-off, not a technical one.

## Lessons Learned

1. **Document version assumptions explicitly, then verify them.** "Nuxt UI" is not enough; "Nuxt UI 4.9.0" is testable. If docs say v3 and registry shows v4+, stop and validate before scaffolding.

2. **Licensing decisions happen before the first commit.** Spending 51k LOC worth of time copying is unacceptable if it ends in legal liability or license conflict. A 30-minute licensing audit at brainstorm time saves months of rework.

3. **Clean-room rewrites are slower but cheaper than derivative work litigation.** We cannot copy, so we reference and rebuild. This adds 10-20% to the timeline but removes licensing risk entirely.

4. **Render tech choices cascade.** Picking "DOM absolute + SVG per element" locks out certain optimizations (single large canvas) but enables others (text editing, table rendering, print preview). Document the trade-off explicitly. Changing it in Phase 3 is expensive.

5. **Phase validation is worth the time.** A 1-hour validation session (4 questions, acceptance/rejection) caught tech drift, scope creep, and architectural inconsistencies before any code was written.

## Next Steps

1. **Create docs/journals/ directory structure** (this file is first)
2. **Hydrate Phase 1 Claude task card** — monorepo scaffold, README, dev environment setup, initial pnpm config, editor + web package stubs
3. **Lock Phase 1 outputs** — must produce: `pnpm install` works, `pnpm run dev` starts Nuxt app, editor package builds independently
4. **Schedule Phase 1 → Phase 2 handoff validation** (same 4-question model)
5. **Print fidelity testing** — Phase 3 deliverable must include test print to real printer; "looks good on screen" is not acceptance criteria
6. **Table rendering deferral** — log as Phase 5 (round 2) scope; update roadmap doc

---

**Status:** DONE
**Summary:** Brainstorm locked architecture (Nuxt 4 monorepo, DOM+SVG render, MIT clean-room), validation corrected tech drift (UI v3→v4, Vite 7→8), and generated sequenced 6-phase plan ready for Phase 1 execution.
