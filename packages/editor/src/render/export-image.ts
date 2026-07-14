import type { TemplateDocument } from '../core/schema/template'
import { resolveDocument } from '../core/variables'
import { renderToCanvas, type RenderOptions } from './render-engine'

/** Encode a rendered canvas as a PNG blob. */
export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob)
        resolve(blob)
      else
        reject(new Error('PNG encoding failed (canvas returned no data)'))
    }, 'image/png')
  })
}

/**
 * Render the document and encode it as a PNG blob (default 300 DPI).
 * `{{variable}}` tokens resolve against the document's sample values -
 * batch exports resolve per data row BEFORE calling the render layer.
 */
export async function exportPng(doc: TemplateDocument, options: RenderOptions = {}): Promise<Blob> {
  const canvas = await renderToCanvas(resolveDocument(doc), options)
  return canvasToPngBlob(canvas)
}
