import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { rulerScaleForZoom } from '../ruler-scale'
import { mmToPx } from '../units'
import {
  anchoredOffset,
  clampZoom,
  MAX_ZOOM,
  MIN_ZOOM,
  useViewportStore,
} from '../../stores/viewport-store'

describe('viewport math', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('clamps zoom to [MIN_ZOOM, MAX_ZOOM]', () => {
    expect(clampZoom(0.01)).toBe(MIN_ZOOM)
    expect(clampZoom(99)).toBe(MAX_ZOOM)
    expect(clampZoom(1.5)).toBe(1.5)
  })

  it('zoomAt keeps the anchor point over the same page position', () => {
    const viewport = useViewportStore()
    viewport.offsetX = 40
    viewport.offsetY = 60
    const anchor = { x: 300, y: 200 }

    for (const targetZoom of [0.1, 0.25, 1, 2.5, 4]) {
      const before = viewport.screenToPageMm(anchor)
      viewport.zoomAt(anchor, targetZoom)
      const after = viewport.screenToPageMm(anchor)
      expect(after.xMm).toBeCloseTo(before.xMm, 6)
      expect(after.yMm).toBeCloseTo(before.yMm, 6)
    }
  })

  it('anchoredOffset is identity when zoom is unchanged', () => {
    const offset = { x: 12, y: -34 }
    expect(anchoredOffset({ x: 100, y: 100 }, offset, 2, 2)).toEqual(offset)
  })

  it('fitToPage centers the page with padding at any container size', () => {
    const viewport = useViewportStore()
    const page = { widthMm: 210, heightMm: 297 }

    for (const container of [
      { width: 1200, height: 800 },
      { width: 500, height: 900 },
      { width: 320, height: 240 },
    ]) {
      viewport.fitToPage(container, page, 48)
      const pageW = mmToPx(page.widthMm) * viewport.zoom
      const pageH = mmToPx(page.heightMm) * viewport.zoom
      // Centered
      expect(viewport.offsetX).toBeCloseTo((container.width - pageW) / 2, 6)
      expect(viewport.offsetY).toBeCloseTo((container.height - pageH) / 2, 6)
      // Fits inside padding (unless clamped at MIN_ZOOM)
      if (viewport.zoom > MIN_ZOOM) {
        expect(pageW).toBeLessThanOrEqual(container.width - 95)
        expect(pageH).toBeLessThanOrEqual(container.height - 95)
      }
    }
  })

  it('screenToPageMm and pageMmToScreen are inverses', () => {
    const viewport = useViewportStore()
    viewport.zoom = 1.7
    viewport.offsetX = -25
    viewport.offsetY = 300
    const screen = { x: 123, y: 456 }
    const roundTripped = viewport.pageMmToScreen(viewport.screenToPageMm(screen))
    expect(roundTripped.x).toBeCloseTo(screen.x, 6)
    expect(roundTripped.y).toBeCloseTo(screen.y, 6)
  })
})

describe('rulerScaleForZoom', () => {
  it('never returns minor ticks closer than the minimum pixel gap', () => {
    for (const zoom of [0.1, 0.25, 0.5, 1, 2, 4]) {
      const { minorStepMm } = rulerScaleForZoom(zoom, 5)
      expect(mmToPx(minorStepMm, zoom)).toBeGreaterThanOrEqual(5)
    }
  })

  it('gets finer as zoom increases', () => {
    const coarse = rulerScaleForZoom(0.1).minorStepMm
    const fine = rulerScaleForZoom(4).minorStepMm
    expect(fine).toBeLessThan(coarse)
  })

  it('majors are multiples of minors', () => {
    for (const zoom of [0.1, 1, 4]) {
      const { minorStepMm, majorStepMm } = rulerScaleForZoom(zoom)
      expect(majorStepMm % minorStepMm).toBe(0)
    }
  })
})
