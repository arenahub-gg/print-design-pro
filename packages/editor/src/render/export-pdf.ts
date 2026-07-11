import type { TemplateDocument } from '../core/schema/template'
import { exportPng } from './export-image'
import type { RenderOptions } from './render-engine'

/** 1mm in PDF points (1pt = 1/72 inch). */
const PT_PER_MM = 72 / 25.4

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
