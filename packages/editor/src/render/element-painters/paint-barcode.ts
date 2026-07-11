import type { BarcodeElement } from '../../core/schema/elements'

// Barcode painter. jsbarcode THROWS on invalid content (e.g. a bad EAN13
// checksum) - the catch turns that into "paint nothing": errors belong in
// the editor placeholder, never on paper. Bars stretch to the element box
// (proportional scaling; scanners tolerate it). Lazy-imported.

export async function paintBarcode(
  ctx: CanvasRenderingContext2D,
  element: BarcodeElement,
  pxPerMm: number,
): Promise<void> {
  if (!element.content)
    return

  let raster: HTMLCanvasElement
  try {
    const { default: JsBarcode } = await import('jsbarcode')
    raster = document.createElement('canvas')
    JsBarcode(raster, element.content, {
      format: element.format,
      displayValue: element.showText,
      lineColor: element.lineColor,
      background: 'transparent',
      margin: 0,
      width: Math.max(1, Math.round((element.widthMm * pxPerMm) / 100)),
      height: Math.round(element.heightMm * pxPerMm * (element.showText ? 0.7 : 1)),
    })
  }
  catch {
    return
  }

  ctx.drawImage(raster, 0, 0, element.widthMm, element.heightMm)
}
