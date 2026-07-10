import type { Ref } from 'vue'
import { updateElementsCommand } from '../core/commands/element-commands'
import { combinedAabb, elementAabb, aabbsIntersect, normalizedRect, rotatedRectAabb, type PointMm } from '../core/geometry'
import { pointerAngleDeg, normalizeAngle, resizeRect, type HandleId } from '../core/resize-math'
import type { ElementPatch } from '../core/schema/elements'
import { collectSnapCandidates, snapAabb, type SnapCandidates } from '../core/snapping'
import { pxToMm, roundMm } from '../core/units'
import type { DocumentStore } from '../stores/document-store'
import type { HistoryStore } from '../stores/history-store'
import type { InteractionStore } from '../stores/interaction-store'
import type { SelectionStore } from '../stores/selection-store'
import type { ViewportStore } from '../stores/viewport-store'
import { usePointerDrag } from './use-pointer-drag'

/** Screen-px snap threshold, converted to mm at gesture time (zoom-aware). */
const SNAP_THRESHOLD_PX = 6
/** Screen-px movement before a press becomes a drag instead of a click. */
const DRAG_THRESHOLD_PX = 3
const MIN_SIZE_MM = 1

interface Stores {
  doc: DocumentStore
  history: HistoryStore
  selection: SelectionStore
  viewport: ViewportStore
  interaction: InteractionStore
}

interface GeometrySnapshot {
  xMm: number
  yMm: number
  widthMm: number
  heightMm: number
  rotation: number
}

/**
 * All element gestures: click/shift selection, drag-move with snapping,
 * marquee, handle resize, rotate. Each gesture previews through the
 * interaction store and commits exactly one undoable command on release.
 */
export function useElementInteractions(containerRef: Ref<HTMLElement | null>, stores: Stores) {
  const { doc, history, selection, viewport, interaction } = stores
  const drag = usePointerDrag()

  function pagePoint(event: PointerEvent): PointMm {
    const rect = containerRef.value!.getBoundingClientRect()
    const point = viewport.screenToPageMm({ x: event.clientX - rect.left, y: event.clientY - rect.top })
    return { xMm: point.xMm, yMm: point.yMm }
  }

  function snapshotSelected(): Map<string, GeometrySnapshot> {
    const snapshots = new Map<string, GeometrySnapshot>()
    for (const id of selection.selectedIds) {
      const element = doc.getElementById(id)
      if (element && !element.locked) {
        const { xMm, yMm, widthMm, heightMm, rotation } = element
        snapshots.set(id, { xMm, yMm, widthMm, heightMm, rotation })
      }
    }
    return snapshots
  }

  /** Round geometry values in a patch at the commit boundary. */
  function roundedPatch(patch: ElementPatch): ElementPatch {
    const result: Record<string, number> = {}
    for (const [key, value] of Object.entries(patch)) {
      if (typeof value === 'number')
        result[key] = key === 'rotation' ? Math.round(value * 10) / 10 : roundMm(value)
    }
    return result as ElementPatch
  }

  function commitGesture(label: string): void {
    const patches = [...interaction.previewPatches.entries()]
      .map(([id, patch]) => ({ id, patch: roundedPatch(patch) }))
    interaction.clearGesture()
    if (patches.length > 0)
      history.dispatch(updateElementsCommand(doc, patches, label))
  }

  // ---- move ---------------------------------------------------------------

  function startMove(event: PointerEvent): void {
    const container = containerRef.value!
    const startPage = pagePoint(event)
    const startScreen = { x: event.clientX, y: event.clientY }
    const snapshots = snapshotSelected()
    if (snapshots.size === 0)
      return

    let candidates: SnapCandidates | null = null
    const startBox = combinedAabb(
      [...snapshots.entries()].map(([, snap]) =>
        rotatedRectAabb(snap, snap.rotation),
      ),
    )
    let dragging = false

    drag.startDrag(container, event, {
      onMove: (move) => {
        if (!dragging) {
          const moved = Math.hypot(move.clientX - startScreen.x, move.clientY - startScreen.y)
          if (moved < DRAG_THRESHOLD_PX)
            return
          dragging = true
          candidates = collectSnapCandidates(doc.page, doc.elements, doc.guides, new Set(snapshots.keys()))
        }
        if (!startBox || !candidates)
          return
        const now = pagePoint(move)
        let dx = now.xMm - startPage.xMm
        let dy = now.yMm - startPage.yMm
        const toleranceMm = pxToMm(SNAP_THRESHOLD_PX / viewport.zoom)
        const moved = {
          ...startBox,
          left: startBox.left + dx,
          right: startBox.right + dx,
          top: startBox.top + dy,
          bottom: startBox.bottom + dy,
          centerX: startBox.centerX + dx,
          centerY: startBox.centerY + dy,
        }
        const snap = snapAabb(moved, candidates, toleranceMm)
        dx += snap.dxMm
        dy += snap.dyMm
        interaction.setSnapLines(snap.activeVertical, snap.activeHorizontal)
        const patches = new Map<string, ElementPatch>()
        for (const [id, snapEntry] of snapshots)
          patches.set(id, { xMm: snapEntry.xMm + dx, yMm: snapEntry.yMm + dy })
        interaction.setPreview(patches)
      },
      onEnd: () => {
        if (dragging)
          commitGesture(snapshots.size === 1 ? 'Move element' : `Move ${snapshots.size} elements`)
        else
          interaction.clearGesture()
      },
      onCancel: () => interaction.clearGesture(),
    })
  }

  // ---- marquee ------------------------------------------------------------

  function startMarquee(event: PointerEvent): void {
    const container = containerRef.value!
    const startPage = pagePoint(event)
    const additive = event.shiftKey
    const baseSelection = additive ? new Set(selection.selectedIds) : new Set<string>()

    drag.startDrag(container, event, {
      onMove: (move) => {
        const rect = normalizedRect(startPage, pagePoint(move))
        interaction.marquee = rect
        const marqueeBox = rotatedRectAabb(rect, 0)
        const hit = doc.elements
          .filter(el => el.visible && !el.locked && aabbsIntersect(elementAabb(el), marqueeBox))
          .map(el => el.id)
        selection.setSelection([...baseSelection, ...hit])
      },
      onEnd: () => {
        interaction.marquee = null
      },
      onCancel: () => {
        interaction.marquee = null
        selection.setSelection(baseSelection)
      },
    })
    if (!additive)
      selection.clear()
  }

  // ---- stage pointerdown (dispatch move / marquee / selection) -------------

  function onStagePointerDown(event: PointerEvent, isSpaceDown: boolean): void {
    if (event.button !== 0 || isSpaceDown || !event.isPrimary)
      return
    const target = event.target as HTMLElement
    const elementHost = target.closest<HTMLElement>('[data-pp-element-id]')

    if (!elementHost) {
      startMarquee(event)
      return
    }

    const id = elementHost.dataset.ppElementId!
    const element = doc.getElementById(id)
    if (!element)
      return

    if (event.shiftKey) {
      selection.toggle(id)
      return
    }
    if (!selection.isSelected(id))
      selection.select(id)
    if (!element.locked)
      startMove(event)
  }

  // ---- resize ---------------------------------------------------------------

  function startResize(handle: HandleId, event: PointerEvent): void {
    const container = containerRef.value!
    const snapshots = snapshotSelected()
    if (snapshots.size === 0)
      return

    if (snapshots.size === 1) {
      const [id, start] = [...snapshots.entries()][0]!
      drag.startDrag(container, event, {
        onMove: (move) => {
          const next = resizeRect({
            rect: start,
            rotationDeg: start.rotation,
            handle,
            pointer: pagePoint(move),
            lockAspect: move.shiftKey,
            fromCenter: move.altKey,
            minSizeMm: MIN_SIZE_MM,
          })
          interaction.setPreview(new Map([[id, next as ElementPatch]]))
        },
        onEnd: () => commitGesture('Resize element'),
        onCancel: () => interaction.clearGesture(),
      })
      return
    }

    // Multi-selection: scale every member proportionally to the group box.
    const startGroup = combinedAabb([...snapshots.values()].map(s => rotatedRectAabb(s, s.rotation)))!
    drag.startDrag(container, event, {
      onMove: (move) => {
        const next = resizeRect({
          rect: {
            xMm: startGroup.left,
            yMm: startGroup.top,
            widthMm: startGroup.right - startGroup.left,
            heightMm: startGroup.bottom - startGroup.top,
          },
          rotationDeg: 0,
          handle,
          pointer: pagePoint(move),
          lockAspect: move.shiftKey,
          fromCenter: move.altKey,
          minSizeMm: MIN_SIZE_MM,
        })
        const sx = next.widthMm / (startGroup.right - startGroup.left)
        const sy = next.heightMm / (startGroup.bottom - startGroup.top)
        const patches = new Map<string, ElementPatch>()
        for (const [id, s] of snapshots) {
          patches.set(id, {
            xMm: next.xMm + (s.xMm - startGroup.left) * sx,
            yMm: next.yMm + (s.yMm - startGroup.top) * sy,
            widthMm: Math.max(MIN_SIZE_MM, s.widthMm * sx),
            heightMm: Math.max(MIN_SIZE_MM, s.heightMm * sy),
          })
        }
        interaction.setPreview(patches)
      },
      onEnd: () => commitGesture(`Resize ${snapshots.size} elements`),
      onCancel: () => interaction.clearGesture(),
    })
  }

  // ---- rotate ---------------------------------------------------------------

  function startRotate(event: PointerEvent): void {
    const container = containerRef.value!
    const snapshots = snapshotSelected()
    if (snapshots.size === 0)
      return
    const group = combinedAabb([...snapshots.values()].map(s => rotatedRectAabb(s, s.rotation)))!
    const groupCenter: PointMm = { xMm: group.centerX, yMm: group.centerY }
    const startAngle = pointerAngleDeg(groupCenter, pagePoint(event))

    drag.startDrag(container, event, {
      onMove: (move) => {
        let delta = pointerAngleDeg(groupCenter, pagePoint(move)) - startAngle
        if (move.shiftKey)
          delta = Math.round(delta / 15) * 15
        const rad = (delta * Math.PI) / 180
        const cos = Math.cos(rad)
        const sin = Math.sin(rad)
        const patches = new Map<string, ElementPatch>()
        for (const [id, s] of snapshots) {
          const cx = s.xMm + s.widthMm / 2
          const cy = s.yMm + s.heightMm / 2
          const relX = cx - groupCenter.xMm
          const relY = cy - groupCenter.yMm
          const newCx = groupCenter.xMm + relX * cos - relY * sin
          const newCy = groupCenter.yMm + relX * sin + relY * cos
          patches.set(id, {
            xMm: newCx - s.widthMm / 2,
            yMm: newCy - s.heightMm / 2,
            rotation: normalizeAngle(s.rotation + delta),
          })
        }
        interaction.setPreview(patches)
      },
      onEnd: () => commitGesture(snapshots.size === 1 ? 'Rotate element' : `Rotate ${snapshots.size} elements`),
      onCancel: () => interaction.clearGesture(),
    })
  }

  return { onStagePointerDown, startResize, startRotate }
}
