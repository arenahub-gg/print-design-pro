import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'
import type { ViewportStore } from '../stores/viewport-store'
import { usePointerDrag } from './use-pointer-drag'

const ZOOM_STEP = 1.1

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement))
    return false
  return target.isContentEditable
    || target.tagName === 'INPUT'
    || target.tagName === 'TEXTAREA'
    || target.tagName === 'SELECT'
}

/**
 * Wires pan/zoom gestures onto the viewport container:
 * - ctrl/cmd + wheel: zoom anchored at the cursor
 * - plain wheel / trackpad: pan
 * - middle-mouse drag, or space + left drag: pan
 * Space state is exposed for cursor styling; it resets on focus loss so a
 * space released outside the window cannot leave the next click hijacked
 * into a pan. Drags run through usePointerDrag (capture/teardown/cancel).
 */
export function useCanvasGestures(
  containerRef: Ref<HTMLElement | null>,
  viewport: ViewportStore,
): { isSpaceDown: Ref<boolean> } {
  const isSpaceDown = ref(false)
  const drag = usePointerDrag()

  function localPoint(event: { clientX: number, clientY: number }): { x: number, y: number } {
    const rect = containerRef.value!.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  function onWheel(event: WheelEvent): void {
    event.preventDefault()
    if (event.ctrlKey || event.metaKey) {
      const factor = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP
      viewport.zoomAt(localPoint(event), viewport.zoom * factor)
    }
    else {
      viewport.panBy(-event.deltaX, -event.deltaY)
    }
  }

  function onPointerDown(event: PointerEvent): void {
    const panButton = event.button === 1 || (event.button === 0 && isSpaceDown.value)
    if (!panButton)
      return
    event.preventDefault()
    const container = containerRef.value!
    let last = { x: event.clientX, y: event.clientY }

    const started = drag.startDrag(container, event, {
      onMove: (move) => {
        viewport.panBy(move.clientX - last.x, move.clientY - last.y)
        last = { x: move.clientX, y: move.clientY }
      },
      onEnd: () => {
        viewport.isPanning = false
      },
      onCancel: () => {
        viewport.isPanning = false
      },
    })
    if (started)
      viewport.isPanning = true
  }

  function onKeyDown(event: KeyboardEvent): void {
    // Never steal Space from editable children (phase-5 text inputs).
    if (event.code === 'Space' && !event.repeat && !isEditableTarget(event.target)) {
      isSpaceDown.value = true
      event.preventDefault()
    }
  }

  function onKeyUp(event: KeyboardEvent): void {
    if (event.code === 'Space')
      isSpaceDown.value = false
  }

  function onFocusOut(): void {
    isSpaceDown.value = false
  }

  onMounted(() => {
    const container = containerRef.value
    if (!container)
      return
    container.addEventListener('wheel', onWheel, { passive: false })
    container.addEventListener('pointerdown', onPointerDown)
    container.addEventListener('keydown', onKeyDown)
    container.addEventListener('keyup', onKeyUp)
    container.addEventListener('focusout', onFocusOut)
  })

  onBeforeUnmount(() => {
    const container = containerRef.value
    if (!container)
      return
    container.removeEventListener('wheel', onWheel)
    container.removeEventListener('pointerdown', onPointerDown)
    container.removeEventListener('keydown', onKeyDown)
    container.removeEventListener('keyup', onKeyUp)
    container.removeEventListener('focusout', onFocusOut)
  })

  return { isSpaceDown }
}
