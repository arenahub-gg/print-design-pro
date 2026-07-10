import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { mmToPx, pxToMm } from '../core/units'

export const MIN_ZOOM = 0.1
export const MAX_ZOOM = 4

export interface ScreenPoint {
  x: number
  y: number
}

/** Point in page coordinates, millimetres. */
export interface PagePointMm {
  xMm: number
  yMm: number
}

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
}

/**
 * New offset that keeps `point` (viewport-local px) anchored to the same
 * page position across a zoom change: the page coordinate under the cursor
 * before and after must be equal.
 */
export function anchoredOffset(
  point: ScreenPoint,
  offset: ScreenPoint,
  oldZoom: number,
  newZoom: number,
): ScreenPoint {
  const scale = newZoom / oldZoom
  return {
    x: point.x - (point.x - offset.x) * scale,
    y: point.y - (point.y - offset.y) * scale,
  }
}

/**
 * Viewport state: zoom + pan offset mapping page space (mm at zoom 1) into
 * viewport-local screen px. UI state only - never persisted, never undoable.
 */
export const useViewportStore = defineStore('pp-viewport', () => {
  const zoom = ref(1)
  const offsetX = ref(0)
  const offsetY = ref(0)
  const showGrid = ref(false)
  const isPanning = ref(false)

  const zoomPercent = computed(() => Math.round(zoom.value * 100))

  function setZoom(next: number): void {
    zoom.value = clampZoom(next)
  }

  /** Zoom keeping the given viewport-local point visually stationary. */
  function zoomAt(point: ScreenPoint, next: number): void {
    const target = clampZoom(next)
    const anchored = anchoredOffset(point, { x: offsetX.value, y: offsetY.value }, zoom.value, target)
    zoom.value = target
    offsetX.value = anchored.x
    offsetY.value = anchored.y
  }

  function panBy(dx: number, dy: number): void {
    offsetX.value += dx
    offsetY.value += dy
  }

  /** Center the page in the container at a zoom that fits it with padding. */
  function fitToPage(
    container: { width: number, height: number },
    page: { widthMm: number, heightMm: number },
    paddingPx = 48,
  ): void {
    const pageWpx = mmToPx(page.widthMm)
    const pageHpx = mmToPx(page.heightMm)
    const usableW = Math.max(1, container.width - paddingPx * 2)
    const usableH = Math.max(1, container.height - paddingPx * 2)
    const fit = clampZoom(Math.min(usableW / pageWpx, usableH / pageHpx))
    zoom.value = fit
    offsetX.value = (container.width - pageWpx * fit) / 2
    offsetY.value = (container.height - pageHpx * fit) / 2
  }

  /** Viewport-local px -> page mm. */
  function screenToPageMm(point: ScreenPoint): PagePointMm {
    return {
      xMm: pxToMm((point.x - offsetX.value) / zoom.value),
      yMm: pxToMm((point.y - offsetY.value) / zoom.value),
    }
  }

  /** Page mm -> viewport-local px. */
  function pageMmToScreen(point: PagePointMm): ScreenPoint {
    return {
      x: mmToPx(point.xMm) * zoom.value + offsetX.value,
      y: mmToPx(point.yMm) * zoom.value + offsetY.value,
    }
  }

  return {
    zoom,
    offsetX,
    offsetY,
    showGrid,
    isPanning,
    zoomPercent,
    setZoom,
    zoomAt,
    panBy,
    fitToPage,
    screenToPageMm,
    pageMmToScreen,
  }
})

export type ViewportStore = ReturnType<typeof useViewportStore>
