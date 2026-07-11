// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { createImage } from '../../core/element-factories'
import { paintImage, type ImageCache } from '../element-painters/paint-image'

function mockCtx() {
  return { drawImage: vi.fn() } as unknown as CanvasRenderingContext2D
}

describe('createImage', () => {
  it('sizes from aspect ratio capped at max width', () => {
    const el = createImage({ centerXMm: 50, centerYMm: 50 }, 'data:x', 2, 80)
    expect(el.widthMm).toBe(80)
    expect(el.heightMm).toBe(40)
    // centered on the given point
    expect(el.xMm + el.widthMm / 2).toBeCloseTo(50, 6)
  })

  it('guards against zero aspect', () => {
    const el = createImage({ centerXMm: 50, centerYMm: 50 }, 'data:x', 0, 60)
    expect(el.heightMm).toBe(60)
  })
})

describe('paintImage', () => {
  it('skips empty src without touching the cache', async () => {
    const ctx = mockCtx()
    const cache: ImageCache = new Map()
    const el = createImage({ centerXMm: 10, centerYMm: 10 }, '', 1)
    await paintImage(ctx, el, cache)
    expect(ctx.drawImage).not.toHaveBeenCalled()
    expect(cache.size).toBe(0)
  })

  it('skips failed loads and memoizes the failure', async () => {
    // happy-dom does not decode images - stub Image to control the outcome.
    class FailingImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_: string) {
        queueMicrotask(() => this.onerror?.())
      }
    }
    vi.stubGlobal('Image', FailingImage)
    try {
      const ctx = mockCtx()
      const cache: ImageCache = new Map()
      const el = createImage({ centerXMm: 10, centerYMm: 10 }, 'data:image/png;base64,broken', 1)
      await paintImage(ctx, el, cache)
      await paintImage(ctx, el, cache)
      expect(ctx.drawImage).not.toHaveBeenCalled()
      expect(cache.size).toBe(1)
      await expect(cache.get(el.src)).resolves.toBeNull()
    }
    finally {
      vi.unstubAllGlobals()
    }
  })

  it('draws loaded images stretched to the element box', async () => {
    class LoadingImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_: string) {
        queueMicrotask(() => this.onload?.())
      }
    }
    vi.stubGlobal('Image', LoadingImage)
    try {
      const ctx = mockCtx()
      const cache: ImageCache = new Map()
      const el = createImage({ centerXMm: 50, centerYMm: 50 }, 'data:image/png;base64,ok', 2, 80)
      await paintImage(ctx, el, cache)
      expect(ctx.drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 80, 40)
    }
    finally {
      vi.unstubAllGlobals()
    }
  })
})
