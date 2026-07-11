import type { ImageElement } from '../../core/schema/elements'

// Image painter for the print engine. Sources are data URLs (same-origin by
// construction - canvas tainting is impossible). A src that fails to load
// paints NOTHING: broken-image glyphs must never reach paper.

export type ImageCache = Map<string, Promise<HTMLImageElement | null>>

/**
 * Load (and memoize) an image; null marks a failed source. The PROMISE is
 * cached (not the value) so concurrent paints of the same src share one load
 * even if the engine ever parallelizes elements.
 */
function loadImage(src: string, cache: ImageCache): Promise<HTMLImageElement | null> {
  const cached = cache.get(src)
  if (cached)
    return cached
  const loading = new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
  cache.set(src, loading)
  return loading
}

export async function paintImage(
  ctx: CanvasRenderingContext2D,
  element: ImageElement,
  cache: ImageCache,
): Promise<void> {
  if (!element.src)
    return
  const image = await loadImage(element.src, cache)
  if (!image)
    return
  // Stretch to the element box - fit modes are a later round.
  ctx.drawImage(image, 0, 0, element.widthMm, element.heightMm)
}
