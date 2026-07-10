---
title: "Pro Print Designer - Round 1: Monorepo Scaffold + Canvas Foundation"
description: "Greenfield monorepo (packages/editor Vue 3 lib + apps/web Nuxt 4) with canvas editor foundation: document model, command-pattern undo/redo, zoom/pan, rulers/guides, drag/resize/rotate, selection."
status: pending
priority: P2
branch: "main"
tags: [greenfield, monorepo, nuxt4, editor, clean-room]
blockedBy: []
blocks: []
created: "2026-07-10T10:50:14.504Z"
createdBy: "ck:plan"
source: skill
---

# Pro Print Designer - Round 1: Monorepo Scaffold + Canvas Foundation

## Overview

Round 1 of clean-room rewrite of vue-print-designer (reference: AGPL, behavior-only reference — **zero code copying**). Deliver: pnpm monorepo with `packages/editor` (npm-installable Vue 3 lib, MIT) + `apps/web` (Nuxt 4 + Nuxt UI v4, Canva-like UX), canvas foundation with page model, zoom/pan, rulers/grid/guides, element drag/resize/rotate, multi-selection, command-pattern undo/redo, IndexedDB template persistence.

Design decisions locked in brainstorm report — do not re-litigate: clean-room, MIT, monorepo library-first, Nuxt UI (latest v4, updated from v3 by Validation Session 1) + custom editor UI, Canva-like aesthetic, local-first storage.

**Context:** [Brainstorm report](../reports/brainstorm-260710-1728-nuxt4-print-designer-rewrite-report.md)

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Monorepo Scaffold](./phase-01-monorepo-scaffold.md) | Pending |
| 2 | [Core Document Model + History](./phase-02-core-document-model-history.md) | Pending |
| 3 | [Canvas Foundation](./phase-03-canvas-foundation.md) | Pending |
| 4 | [Element Interactions](./phase-04-element-interactions.md) | Pending |
| 5 | [Editor Shell + Nuxt Integration](./phase-05-editor-shell-nuxt-integration.md) | Pending |
| 6 | [Testing + Verification](./phase-06-testing-verification.md) | Pending |

Phases strictly sequential: each depends on previous.

## Acceptance Criteria (round 1)

- `pnpm install && pnpm build` green at root; `pnpm dev` serves Nuxt app
- Editor page: create/open template, add rect/line/circle/text elements, drag/resize/rotate with snapping, multi-select, undo/redo ≥50 steps, zoom 10–400%, rulers in mm
- Template persists to IndexedDB, survives reload; JSON export/import round-trips losslessly
- Editor consumable as `@pro-print/editor` from a plain Vue 3 app (verified via lib build + demo mount)
- MIT license, no AGPL-derived code, typecheck + lint + unit tests pass

## Out of Scope (round 1)

Inline/rich text editing (simple static text IS in scope per Validation Session 1), image element, barcode/QR, table + pagination, print/PDF pipeline, web component wrapper, server sync, auth, i18n beyond en/vi scaffold. See roadmap phases 2–7 in brainstorm report.

## Dependencies

- No existing plans (greenfield). External: Node ≥20, pnpm ≥9.
- Naming risk: `@pro-print` npm scope unverified — placeholder until publish phase.

## Validation Log

### Session 1 — 2026-07-10
**Trigger:** Post-plan `/ck:plan validate` after plan creation from brainstorm handoff
**Questions asked:** 4

#### Verification Results
- Claims checked: 7 (external package versions via npm registry; codebase empty — greenfield, no repo claims to verify)
- Verified: 5 | Failed: 2 | Unverified: 0
- Tier: Full (6 phases), adapted to external-fact verification
- Failures: `@nuxt/ui` plan said v3, registry latest 4.9.0; `vite` plan said 7, registry latest 8.1.4

#### Questions & Answers

1. **[Risks]** Plan ghi Nuxt UI v3 và Vite 7; registry hiện tại Nuxt UI 4.9.0, Vite 8.1.4. Cập nhật toolchain thế nào?
   - Options: Lên bản mới nhất (Recommended) | Giữ như plan (Nuxt UI v3, Vite 7)
   - **Answer:** Lên bản mới nhất
   - **Rationale:** Greenfield — start on latest majors (Nuxt UI 4, Vite 8, pinia 3), avoid early forced migration

2. **[Architecture]** Công nghệ render element trên canvas (phase 3 mơ hồ "SVG-or-div")?
   - Options: DOM absolute div + SVG bên trong (Recommended) | Một SVG scene duy nhất | Canvas 2D
   - **Answer:** DOM absolute div + SVG bên trong
   - **Rationale:** Each element = absolutely-positioned div with rotate transform; shapes as SVG inside; text as DOM. Easiest path for text editing, tables, and DOM-based print rendering in later rounds

3. **[Scope]** Thêm text tĩnh đơn giản vào round 1?
   - Options: Thêm text tĩnh đơn giản (Recommended) | Giữ nguyên scope đã duyệt
   - **Answer:** Thêm text tĩnh đơn giản
   - **Rationale:** TextElement with content edited via properties panel (no inline/rich editing), basic fontSize/weight/align. ~1-2 days added to phases 4-5; demo becomes meaningful

4. **[Scope]** Thêm GitHub Actions CI tối thiểu ở phase 6?
   - Options: Thêm CI tối thiểu ở phase 6 (Recommended) | Chưa cần, local là đủ
   - **Answer:** Thêm CI tối thiểu
   - **Rationale:** Open-source project needs green CI from first commits; minimal workflow install→lint→typecheck→unit→build

#### Confirmed Decisions
- Toolchain: Nuxt UI v4 + Vite 8 + pinia 3 — latest majors for greenfield
- Render tech: DOM div + SVG-in-div — validated, no longer ambiguous
- TextElement (static) in round 1 scope — properties-panel editing only
- Minimal GitHub Actions CI in phase 6

#### Action Items
- [x] Propagate version updates to phase 1
- [x] Propagate render decision to phase 3
- [x] Propagate TextElement to phases 2, 4, 5
- [x] Propagate CI to phase 6

#### Impact on Phases
- Phase 1: Nuxt UI v3→v4, Vite 7→8, pinia peer ^3
- Phase 2: TextElement full schema (not stub)
- Phase 3: render tech decision fixed
- Phase 4: text participates in gestures; resize = bbox only
- Phase 5: Text tile enabled in palette; TextSection in properties panel
- Phase 6: CI workflow added

### Whole-Plan Consistency Sweep
- Swept all plan files for: "v3", "Vite 7", "stub", "disabled", stale text-exclusion wording — reconciled (see per-file markers)
- No unresolved contradictions remain

