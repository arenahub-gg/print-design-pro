import { onBeforeUnmount } from 'vue'

export interface PointerDragHandlers {
  onMove: (event: PointerEvent) => void
  /** Pointer released normally. */
  onEnd?: (event: PointerEvent) => void
  /** Drag aborted: pointercancel, Escape, or component unmount. */
  onCancel?: () => void
}

/**
 * Shared drag lifecycle for every pointer gesture in the editor (pan, guide
 * drag, element drag/resize/rotate in phase 4). Centralizes the bug-prone
 * parts: pointer capture, listener teardown, pointercancel, Escape-to-cancel,
 * ignoring non-primary/multi-touch pointers, one-drag-at-a-time, and
 * cancelling a live drag when the owning component unmounts (otherwise stale
 * closures keep mutating stores that outlive the component).
 */
export function usePointerDrag() {
  let activeTeardown: (() => void) | null = null
  /** Teardown + the gesture's onCancel - used for abort paths (unmount, cancelActive). */
  let activeAbort: (() => void) | null = null

  const isDragging = (): boolean => activeTeardown !== null

  function startDrag(target: HTMLElement, event: PointerEvent, handlers: PointerDragHandlers): boolean {
    if (activeTeardown || !event.isPrimary)
      return false

    target.setPointerCapture(event.pointerId)

    const teardown = (): void => {
      target.removeEventListener('pointermove', onMove)
      target.removeEventListener('pointerup', onUp)
      target.removeEventListener('pointercancel', onCancel)
      window.removeEventListener('keydown', onKeyDown, true)
      if (target.hasPointerCapture(event.pointerId))
        target.releasePointerCapture(event.pointerId)
      activeTeardown = null
      activeAbort = null
    }

    const onMove = (move: PointerEvent): void => {
      if (move.pointerId === event.pointerId)
        handlers.onMove(move)
    }
    const onUp = (up: PointerEvent): void => {
      if (up.pointerId !== event.pointerId)
        return
      teardown()
      handlers.onEnd?.(up)
    }
    const onCancel = (cancel: PointerEvent): void => {
      if (cancel.pointerId !== event.pointerId)
        return
      teardown()
      handlers.onCancel?.()
    }
    const onKeyDown = (key: KeyboardEvent): void => {
      if (key.key === 'Escape') {
        key.stopPropagation()
        teardown()
        handlers.onCancel?.()
      }
    }

    target.addEventListener('pointermove', onMove)
    target.addEventListener('pointerup', onUp)
    target.addEventListener('pointercancel', onCancel)
    window.addEventListener('keydown', onKeyDown, true)
    activeTeardown = teardown
    activeAbort = () => {
      teardown()
      handlers.onCancel?.()
    }

    return true
  }

  /** Abort the live drag as if cancelled - gesture state gets cleaned up. */
  function cancelActive(): void {
    activeAbort?.()
  }

  onBeforeUnmount(() => {
    // Abort (not just teardown): gesture preview lives in app-scoped Pinia
    // stores that outlive this component - onCancel must run to clear it.
    activeAbort?.()
  })

  return { startDrag, cancelActive, isDragging }
}
