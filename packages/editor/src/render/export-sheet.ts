import { computeSheetLayout, type SheetLayout } from '../core/sheet-layout'
import type { TemplateDocument } from '../core/schema/template'
import { resolveDocument } from '../core/variables'
import { MM_PER_INCH } from '../core/units'
import { canvasToPngBlob } from './export-image'
import { MAX_BATCH_ROWS } from './export-pdf'
import { renderToCanvas, type RenderOptions } from './render-engine'

// N-up batch output (round 21): labels tiled onto carrier sheets. Each
// label still renders through the ONE engine (per data row), then gets
// composited onto a white sheet canvas - WYSIWYG parity is untouched.

/** 1mm in PDF points (1pt = 1/72 inch). */
const PT_PER_MM = 72 / 25.4

function guardRows(rows: Array<Record<string, string>>): void {
  if (rows.length === 0)
    throw new Error('Batch export needs at least one data row')
  if (rows.length > MAX_BATCH_ROWS)
    throw new Error(`Batch export supports at most ${MAX_BATCH_ROWS} rows`)
}

/**
 * Render every data row and compose the tiled sheets, SEQUENTIALLY (one
 * label canvas + one sheet canvas alive at a time). Returns PNG blobs.
 */
export async function renderSheetBlobs(
  doc: TemplateDocument,
  rows: Array<Record<string, string>>,
  layout: SheetLayout,
  options: RenderOptions = {},
): Promise<Blob[]> {
  guardRows(rows)
  if (layout.perSheet === 0)
    throw new Error('Label does not fit on the selected sheet')

  const dpi = options.dpi ?? 300
  const pxPerMm = dpi / MM_PER_INCH
  const blobs: Blob[] = []
  let sheet: HTMLCanvasElement | null = null
  let ctx: CanvasRenderingContext2D | null = null

  for (let index = 0; index < rows.length; index++) {
    const cell = index % layout.perSheet
    if (cell === 0) {
      // flush the finished sheet, start a fresh one
      if (sheet)
        blobs.push(await canvasToPngBlob(sheet))
      sheet = document.createElement('canvas')
      sheet.width = Math.round(layout.sheet.widthMm * pxPerMm)
      sheet.height = Math.round(layout.sheet.heightMm * pxPerMm)
      ctx = sheet.getContext('2d')
      if (!ctx)
        throw new Error('Canvas 2D context unavailable')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, sheet.width, sheet.height)
    }

    const label = await renderToCanvas(resolveDocument(doc, rows[index]!), options)
    const position = layout.positions[cell]!
    ctx!.drawImage(label, Math.round(position.xMm * pxPerMm), Math.round(position.yMm * pxPerMm))
  }
  if (sheet)
    blobs.push(await canvasToPngBlob(sheet))
  return blobs
}

/** Multi-label sheets as one PDF - page size = the carrier sheet. */
export async function exportPdfBatchSheet(
  doc: TemplateDocument,
  rows: Array<Record<string, string>>,
  options: RenderOptions = {},
): Promise<Blob> {
  const layout = computeSheetLayout(doc.page.widthMm, doc.page.heightMm)
  const [{ PDFDocument }, blobs] = await Promise.all([
    import('pdf-lib'),
    renderSheetBlobs(doc, rows, layout, options),
  ])

  const pdf = await PDFDocument.create()
  pdf.setTitle(doc.name)
  pdf.setCreator('Pro Print Designer')

  const widthPt = layout.sheet.widthMm * PT_PER_MM
  const heightPt = layout.sheet.heightMm * PT_PER_MM
  for (const blob of blobs) {
    const image = await pdf.embedPng(await blob.arrayBuffer())
    const page = pdf.addPage([widthPt, heightPt])
    page.drawImage(image, { x: 0, y: 0, width: widthPt, height: heightPt })
  }

  const bytes = await pdf.save()
  return new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' })
}
