---
phase: 4
title: Element Interactions
status: completed
effort: 5-6 days
priority: P1
dependencies:
  - 3
---

# Phase 4: Element Interactions

## Overview
Make the canvas an editor: selection (click/shift/marquee), drag/resize/rotate with handles, snapping with visual snap lines, keyboard operations. Every gesture = one undoable transaction.

## Requirements
- Functional: single/multi-select, marquee rubber band; 8 resize handles + rotate handle; snap to page edges/center, element edges/centers, guides; arrows nudge 1mm (shift=10mm); Delete, Ctrl+D duplicate, Ctrl+A, Ctrl+Z/Y; Esc clears selection; locked elements unselectable by marquee, click shows lock hint; text element participates in all gestures — resize scales bbox only, font size unchanged <!-- Updated: Validation Session 1 - static text in scope -->
- Non-functional: gestures work in mm domain at any zoom; snap threshold in screen px (6px) independent of zoom

## Architecture
```
packages/editor/src/components/canvas/
├── SelectionOverlay.vue      # outline + handles for selection bbox (multi = group bbox)
├── MarqueeOverlay.vue        # rubber-band rect during drag-on-empty
└── SnapLineOverlay.vue       # transient alignment lines during gesture
packages/editor/src/composables/
├── use-element-drag.ts       # pointer gesture → transact(TransformCommand)
├── use-element-resize.ts     # 8 directions; shift=aspect lock; alt=resize from center
├── use-element-rotate.ts     # angle from bbox center; shift=15° steps
└── use-marquee-select.ts
packages/editor/src/core/snapping.ts   # pure functions: candidate lines from page/elements/guides,
                                       # nearest-snap within thresholdMm(zoom), returns snapped pos + lines
```
Gesture lifecycle: pointerdown → history.begin → pointermove (preview via local reactive delta, snap applied) → pointerup → commit single command. Rotation stored in degrees; group operations transform each member relative to group bbox.

## Related Code Files
- Create: files above + `src/core/__tests__/snapping.spec.ts`
- Modify: ElementRenderer (hit-testing, cursor styles), selection-store (marquee integration), element-commands (TransformCommand multi-element support)

## Implementation Steps
1. Selection: click (topmost by zIndex), shift-click toggle, empty-click clears, marquee (intersection mode), Ctrl+A; SelectionOverlay bbox math incl. rotated elements (axis-aligned bbox of rotated corners)
2. Drag: pointer capture, mm delta = px delta / (zoom·pxPerMm); live preview offset; commit TransformCommand on release
3. snapping.ts pure module: collect candidates (page edges/centers, other elements' edges/centers, guides), snap X/Y independently, return active lines for overlay; unit-test exhaustively
4. Resize: 8 handles, min size 1mm, shift=aspect, alt=center-out; multi-select resize scales group proportionally
5. Rotate: handle above bbox, shift=15° snap, display angle badge
6. Keyboard map composable (scoped to canvas focus): nudge/delete/duplicate/select-all/undo/redo/escape
7. Locked/hidden behavior + cursor affordances (move/resize/rotate cursors)
8. Wire everything through transactions; verify one gesture = one undo entry

## Implementation Notes (post-review)
- Rotated single-element resize implemented FULLY correct (anchor-fixed in world space, local-frame math incl. edge handles, shift-aspect, alt-center) — the plan's allowed degrade wasn't needed; reviewer verified algebraically
- Multi-select resize = axis-aligned bbox proportional scale (per plan); group rotate repositions members around combined center
- Preview architecture: gestures write patches to interaction-store; document untouched until ONE updateElementsCommand commits on release (roundMm at boundary)
- Code-review driven fixes: keyboard gated during live gestures (Delete/undo mid-drag would commit against dead ids), unmount/cancelActive now aborts with onCancel (preview leak), nudge coalescing (key auto-repeat flooded 100-entry history cap), selection.prune wired to editVersion watcher (dangling ids after structural undo), overlay frame uses unlocked-only set (mixed-lock handle/math mismatch), dead marquee state removed from selection-store
- Deferred (review S1-S4): shift-toggle on pointerup, absolute vs delta rotate snap (product call), handle right-click swallow, rotated-edge-handle test coverage
- Verified live in browser via synthetic pointer sequences (CDP input broken in this environment — main-thread/JS verification instead): select→handles, drag+snap+undo exact, resize 16→32.7mm, rotate 7→100.7°, marquee 13 elements, Ctrl+D one transaction
- Environment note: CDP mouse input stopped dispatching entirely mid-session (fresh tab included) — same environment family as phase-3 screenshot timeouts; Playwright in phase 6 uses its own input pipeline

## Success Criteria
- [ ] Drag 3 selected elements → single undo restores all three
- [ ] Snap lines appear within 6 screen px at 50% and 200% zoom equally
- [ ] Resize with shift preserves aspect ratio exactly; alt resizes from center
- [ ] Rotated element's selection bbox and handles remain accurate
- [ ] Marquee ignores locked elements; snapping unit tests green

## Risk Assessment
- Rotated-element resize math (hardest of phase) → implement axis-aligned first, rotated-resize may degrade to bbox-scale; document limitation if deferred
- Pointer capture edge cases (leave window mid-drag) → `setPointerCapture` + pointercancel commit/abort handling
- Perf during drag with many snap candidates → precompute candidate lines at gesture start, not per move
