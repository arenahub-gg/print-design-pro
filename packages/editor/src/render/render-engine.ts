import { degToRad } from '../core/geometry'
import type {
  CircleElement,
  LineElement,
  RectElement,
  TemplateElement,
  TextElement,
} from '../core/schema/elements'
import type { TemplateDocument } from '../core/schema/template'
import { MM_PER_INCH } from '../core/units'
import { paintBarcode } from './element-painters/paint-barcode'
import { paintImage, type ImageCache } from './element-painters/paint-image'
import { paintQr } from './element-painters/paint-qr'
import { TEXT_FONT_STACK, TEXT_LINE_HEIGHT, wrapText } from './text-layout'

// Schema -> Canvas2D print renderer. THE single source of print output: PNG
// export, PDF export, browser print, and the preview modal all call this, so
// WYSIWYG fidelity lives (and is tested) in exactly one place.
//
// Coordinate strategy: the canvas is sized in device pixels for the target
// DPI, then ctx.scale(pxPerMm) once - every draw call below works in mm,
// mirroring the editor's math 1:1. Rotation matches ElementRenderer.vue:
// rotate around the element's center.

export interface RenderOptions {
  /** Output resolution. 300 is print quality; 96 mirrors the screen. */
  dpi?: number
  /** Page background. Print paper is white; transparent for compositing. */
  background?: string | null
}

/** Chromium's per-dimension canvas limit; beyond it rasterization fails silently. */
const MAX_CANVAS_PX = 16384

// Async: raster-producing elements (image now; QR/barcode next) load or
// generate their bitmaps during the render pass.
export async function renderToCanvas(doc: TemplateDocument, options: RenderOptions = {}): Promise<HTMLCanvasElement> {
  const dpi = options.dpi ?? 300
  const background = options.background === undefined ? '#ffffff' : options.background
  const pxPerMm = dpi / MM_PER_INCH

  const widthPx = Math.round(doc.page.widthMm * pxPerMm)
  const heightPx = Math.round(doc.page.heightMm * pxPerMm)
  if (widthPx > MAX_CANVAS_PX || heightPx > MAX_CANVAS_PX) {
    throw new Error(
      `Page too large to render at ${dpi} DPI (${widthPx}x${heightPx}px exceeds the ${MAX_CANVAS_PX}px canvas limit) - lower the DPI`,
    )
  }

  const canvas = document.createElement('canvas')
  canvas.width = widthPx
  canvas.height = heightPx

  const ctx = canvas.getContext('2d')
  if (!ctx)
    throw new Error('Canvas 2D context unavailable')

  ctx.scale(pxPerMm, pxPerMm)

  if (background !== null) {
    ctx.fillStyle = background
    ctx.fillRect(0, 0, doc.page.widthMm, doc.page.heightMm)
  }

  // Per-render bitmap cache: each unique image src loads once.
  const imageCache: ImageCache = new Map()

  // Array order = paint order (identical to ElementLayer's v-for).
  for (const element of doc.elements) {
    if (!element.visible)
      continue
    await drawElement(ctx, element, imageCache, pxPerMm)
  }

  return canvas
}

async function drawElement(
  ctx: CanvasRenderingContext2D,
  element: TemplateElement,
  imageCache: ImageCache,
  pxPerMm: number,
): Promise<void> {
  ctx.save()
  // Same transform as ElementRenderer: rotate around the center, then draw
  // the local box with its top-left at (-w/2, -h/2).
  ctx.translate(element.xMm + element.widthMm / 2, element.yMm + element.heightMm / 2)
  ctx.rotate(degToRad(element.rotation))
  ctx.translate(-element.widthMm / 2, -element.heightMm / 2)

  try {
    await paintByType(ctx, element, imageCache, pxPerMm)
  }
  finally {
    // Restore even if a painter throws - transform/clip state must never
    // bleed into the next element.
    ctx.restore()
  }
}

async function paintByType(
  ctx: CanvasRenderingContext2D,
  element: TemplateElement,
  imageCache: ImageCache,
  pxPerMm: number,
): Promise<void> {
  switch (element.type) {
    case 'rect':
      drawRect(ctx, element)
      break
    case 'line':
      drawLine(ctx, element)
      break
    case 'circle':
      drawCircle(ctx, element)
      break
    case 'text':
      drawText(ctx, element)
      break
    case 'image':
      await paintImage(ctx, element, imageCache)
      break
    case 'qr':
      await paintQr(ctx, element, pxPerMm)
      break
    case 'barcode':
      await paintBarcode(ctx, element, pxPerMm)
      break
  }
}

/** Stroke inset by half its width - matches the SVG renderer's geometry. */
function drawRect(ctx: CanvasRenderingContext2D, element: RectElement): void {
  const inset = element.strokeWidthMm / 2
  const width = element.widthMm - element.strokeWidthMm
  const height = element.heightMm - element.strokeWidthMm
  // SVG paints nothing for a zero-extent rect - so must print.
  if (width <= 0 || height <= 0)
    return
  // SVG clamps rx and ry INDEPENDENTLY (elliptical corners on squat rects).
  const radius = {
    x: Math.min(element.cornerRadiusMm, width / 2),
    y: Math.min(element.cornerRadiusMm, height / 2),
  }

  ctx.beginPath()
  ctx.roundRect(inset, inset, width, height, [radius])
  ctx.fillStyle = element.fillColor
  ctx.fill()
  if (element.strokeWidthMm > 0) {
    ctx.strokeStyle = element.strokeColor
    ctx.lineWidth = element.strokeWidthMm
    ctx.stroke()
  }
}

function drawLine(ctx: CanvasRenderingContext2D, element: LineElement): void {
  ctx.beginPath()
  ctx.moveTo(0, element.heightMm / 2)
  ctx.lineTo(element.widthMm, element.heightMm / 2)
  ctx.strokeStyle = element.strokeColor
  ctx.lineWidth = element.strokeWidthMm
  ctx.stroke()
}

function drawCircle(ctx: CanvasRenderingContext2D, element: CircleElement): void {
  const rx = Math.max(0, (element.widthMm - element.strokeWidthMm) / 2)
  const ry = Math.max(0, (element.heightMm - element.strokeWidthMm) / 2)
  ctx.beginPath()
  ctx.ellipse(element.widthMm / 2, element.heightMm / 2, rx, ry, 0, 0, Math.PI * 2)
  ctx.fillStyle = element.fillColor
  ctx.fill()
  if (element.strokeWidthMm > 0) {
    ctx.strokeStyle = element.strokeColor
    ctx.lineWidth = element.strokeWidthMm
    ctx.stroke()
  }
}

/** 1pt = 1/72 inch expressed in mm (ctx is mm-scaled). */
function ptToMm(pt: number): number {
  return (pt * MM_PER_INCH) / 72
}

function drawText(ctx: CanvasRenderingContext2D, element: TextElement): void {
  const fontSizeMm = ptToMm(element.fontSizePt)
  const lineHeightMm = fontSizeMm * TEXT_LINE_HEIGHT

  // Clip to the element box - mirrors the DOM renderer's overflow:hidden.
  ctx.beginPath()
  ctx.rect(0, 0, element.widthMm, element.heightMm)
  ctx.clip()

  ctx.font = `${element.fontWeight} ${fontSizeMm}px ${TEXT_FONT_STACK}`
  ctx.fillStyle = element.color
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = element.align

  const lines = wrapText(element.content, element.widthMm, {
    measure: text => ctx.measureText(text).width,
  })

  const x = element.align === 'left' ? 0 : element.align === 'center' ? element.widthMm / 2 : element.widthMm
  // First baseline: approximate the browser's half-leading distribution -
  // baseline sits at ~0.8em within a 1.25em line box.
  const firstBaseline = lineHeightMm * 0.5 + fontSizeMm * 0.3
  lines.forEach((line, index) => {
    ctx.fillText(line, x, firstBaseline + index * lineHeightMm)
  })
}
