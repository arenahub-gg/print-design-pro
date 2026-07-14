---
phase: 4
title: 'Tests + verification + ship'
status: completed
effort: 0.5 day
priority: P1
dependencies: [3]
---

# Phase 4: Tests + Verification + Ship

## Requirements
- Unit: variables/CSV suites (phase 1), engine substitution test (mock ctx
  fillText receives substituted string)
- E2E (apps/web/e2e/data-batch-round13.spec.ts): add text `{{name}}` → set
  sample in variables tab → canvas shows sample; upload 3-row CSV in export
  dialog → download PDF → parse: 3 pages; single PNG still exports
- Full gates lib+app, entire E2E suite, code-reviewer subagent, fix findings
- docs/codebase-summary.md section; README feature bullet + roadmap update
- PR + CI + squash merge

## Success Criteria
- [x] All gates green 2x, review findings fixed, PR merged
