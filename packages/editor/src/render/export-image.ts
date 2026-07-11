import type { TemplateDocument } from '../core/schema/template'
import { renderToCanvas, type RenderOptions } from './render-engine'

/** Render the document and encode it as a PNG blob (default 300 DPI). */
export async function exportPng(doc: TemplateDocument, options: RenderOptions = {}): Promise<Blob> {
  const canvas = await renderToCanvas(doc, options)
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob)
        resolve(blob)
      else
        reject(new Error('PNG encoding failed (canvas returned no data)'))
    }, 'image/png')
  })
}
