import type { QrElement } from '../../core/schema/elements'

// QR painter. The code is drawn as a SQUARE filling min(w,h), centered in
// the element box - stretching a QR distorts modules and kills scans.
// `qrcode` is lazy-imported (externalized like pdf-lib).

export async function paintQr(
  ctx: CanvasRenderingContext2D,
  element: QrElement,
  pxPerMm: number,
): Promise<void> {
  if (!element.content)
    return

  const sideMm = Math.min(element.widthMm, element.heightMm)
  const sidePx = Math.max(32, Math.round(sideMm * pxPerMm))

  let raster: HTMLCanvasElement
  try {
    const { default: QRCode } = await import('qrcode')
    raster = document.createElement('canvas')
    await QRCode.toCanvas(raster, element.content, {
      errorCorrectionLevel: element.ecLevel,
      width: sidePx,
      margin: 0,
      color: { dark: element.color, light: element.backgroundColor },
    })
  }
  catch {
    // Content too long for the EC level, etc. - print nothing rather than garbage.
    return
  }

  const x = (element.widthMm - sideMm) / 2
  const y = (element.heightMm - sideMm) / 2
  ctx.drawImage(raster, x, y, sideMm, sideMm)
}
