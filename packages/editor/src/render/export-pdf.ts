import type { TemplateDocument } from '../core/schema/template'
import { resolveDocument } from '../core/variables'
import { canvasToPngBlob, exportPng } from './export-image'
import { renderToCanvas, type RenderOptions } from './render-engine'

/** 1mm in PDF points (1pt = 1/72 inch). */
const PT_PER_MM = 72 / 25.4

/** Hard cap on batch size - beyond this the raster PDF gets unwieldy. */
export const MAX_BATCH_ROWS = 500

/**
 * Single-page PDF sized in mm with the rendered page embedded as a raster
 * image (default 300 DPI). Raster sidesteps font embedding, so Vietnamese
 * and any other script print correctly; vector text is a later round.
 * pdf-lib loads lazily - consumers that never export pay nothing for it.
 */
export async function exportPdf(doc: TemplateDocument, options: RenderOptions = {}): Promise<Blob> {
  const [{ PDFDocument }, png] = await Promise.all([
    import('pdf-lib'),
    exportPng(doc, options),
  ])

  const pdf = await PDFDocument.create()
  pdf.setTitle(doc.name)
  pdf.setCreator('Pro Print Designer')

  const widthPt = doc.page.widthMm * PT_PER_MM
  const heightPt = doc.page.heightMm * PT_PER_MM
  const page = pdf.addPage([widthPt, heightPt])

  const image = await pdf.embedPng(await png.arrayBuffer())
  page.drawImage(image, { x: 0, y: 0, width: widthPt, height: heightPt })

  const bytes = await pdf.save()
  return new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' })
}

/**
 * Batch export: one PDF page per data row (CSV batch printing). Each row is
 * substituted into the document before rendering, so QR/barcode/table
 * content vary per page. Rows are rendered SEQUENTIALLY - N parallel
 * 300 DPI canvases would exhaust memory on big batches.
 */
export async function exportPdfBatch(
  doc: TemplateDocument,
  rows: Array<Record<string, string>>,
  options: RenderOptions = {},
): Promise<Blob> {
  if (rows.length === 0)
    throw new Error('Batch export needs at least one data row')
  if (rows.length > MAX_BATCH_ROWS)
    throw new Error(`Batch export supports at most ${MAX_BATCH_ROWS} rows`)

  const { PDFDocument } = await import('pdf-lib')
  const pdf = await PDFDocument.create()
  pdf.setTitle(doc.name)
  pdf.setCreator('Pro Print Designer')

  const widthPt = doc.page.widthMm * PT_PER_MM
  const heightPt = doc.page.heightMm * PT_PER_MM

  for (const row of rows) {
    const canvas = await renderToCanvas(resolveDocument(doc, row), options)
    const png = await canvasToPngBlob(canvas)
    const image = await pdf.embedPng(await png.arrayBuffer())
    const page = pdf.addPage([widthPt, heightPt])
    page.drawImage(image, { x: 0, y: 0, width: widthPt, height: heightPt })
  }

  const bytes = await pdf.save()
  return new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' })
}
