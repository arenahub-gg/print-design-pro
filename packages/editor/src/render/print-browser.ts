import type { TemplateDocument } from '../core/schema/template'
import { computeSheetLayout } from '../core/sheet-layout'
import { resolveDocument } from '../core/variables'
import { canvasToPngBlob } from './export-image'
import { MAX_BATCH_ROWS } from './export-pdf'
import { renderSheetBlobs } from './export-sheet'
import { renderToCanvas, type RenderOptions } from './render-engine'

// Browser print via a hidden iframe: the render-engine output fills an
// @page-sized sheet, so what prints is byte-identical to PNG/PDF export.
// An iframe (not window.open) avoids popup blockers; cleanup runs on
// afterprint AND a fallback timer because some browsers skip the event.

/** Safety net only - print dialogs can stay open a long time (printer setup). */
const CLEANUP_FALLBACK_MS = 10 * 60_000
/** If the iframe never loads (host CSP blocking srcdoc), fail instead of hanging. */
const LOAD_TIMEOUT_MS = 10_000

/** Printed page description - the template page, or an N-up carrier sheet. */
interface PrintPage {
  name: string
  widthMm: number
  heightMm: number
}

export async function printDocument(doc: TemplateDocument, options: RenderOptions = {}): Promise<void> {
  const canvas = await renderToCanvas(resolveDocument(doc), options)
  await printBlobs([await canvasToPngBlob(canvas)], pageOf(doc))
}

function pageOf(doc: TemplateDocument): PrintPage {
  return { name: doc.name, widthMm: doc.page.widthMm, heightMm: doc.page.heightMm }
}

/**
 * Batch print: one page per data row in a single print job. Pages render
 * sequentially (memory) before the dialog opens.
 */
export async function printDocumentBatch(
  doc: TemplateDocument,
  rows: Array<Record<string, string>>,
  options: RenderOptions = {},
): Promise<void> {
  if (rows.length === 0)
    throw new Error('Batch print needs at least one data row')
  if (rows.length > MAX_BATCH_ROWS)
    throw new Error(`Batch print supports at most ${MAX_BATCH_ROWS} rows`)

  const blobs: Blob[] = []
  for (const row of rows) {
    const canvas = await renderToCanvas(resolveDocument(doc, row), options)
    blobs.push(await canvasToPngBlob(canvas))
  }
  await printBlobs(blobs, pageOf(doc))
}

/** N-up batch print: labels tiled onto A4 carrier sheets (round 21). */
export async function printDocumentBatchSheet(
  doc: TemplateDocument,
  rows: Array<Record<string, string>>,
  options: RenderOptions = {},
): Promise<void> {
  const layout = computeSheetLayout(doc.page.widthMm, doc.page.heightMm)
  const blobs = await renderSheetBlobs(doc, rows, layout, options)
  await printBlobs(blobs, {
    name: doc.name,
    widthMm: layout.sheet.widthMm,
    heightMm: layout.sheet.heightMm,
  })
}

/**
 * Object URLs, NOT data URLs: base64 would inflate every page by ~33% and
 * the srcdoc string would DUPLICATE the whole payload again - at the 500-row
 * cap that difference is hundreds of MB. URLs are revoked on cleanup.
 */
async function printBlobs(blobs: Blob[], page: PrintPage): Promise<void> {
  const urls = blobs.map(blob => URL.createObjectURL(blob))
  try {
    await printImages(urls, page)
  }
  finally {
    for (const url of urls)
      URL.revokeObjectURL(url)
  }
}

async function printImages(dataUrls: string[], page: PrintPage): Promise<void> {
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  iframe.setAttribute('aria-hidden', 'true')

  // page-break-after on every sheet but the last: one printed page per image.
  iframe.srcdoc = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(page.name)}</title>
<style>
  @page { size: ${page.widthMm}mm ${page.heightMm}mm; margin: 0; }
  html, body { margin: 0; padding: 0; }
  img { display: block; width: ${page.widthMm}mm; height: ${page.heightMm}mm; }
  img:not(:last-child) { break-after: page; }
</style>
</head>
<body>${dataUrls.map(url => `<img src="${url}">`).join('')}</body>
</html>`

  await new Promise<void>((resolve, reject) => {
    let settled = false
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null
    let loadTimer: ReturnType<typeof setTimeout> | null = null

    // Every exit path clears both timers - a pending fallback would retain
    // the iframe + multi-MB data URL closure for its whole duration.
    const cleanup = (): void => {
      if (settled)
        return
      settled = true
      if (fallbackTimer)
        clearTimeout(fallbackTimer)
      if (loadTimer)
        clearTimeout(loadTimer)
      iframe.remove()
    }

    loadTimer = setTimeout(() => {
      cleanup()
      reject(new Error('Print frame failed to load'))
    }, LOAD_TIMEOUT_MS)

    iframe.onload = () => {
      if (loadTimer) {
        clearTimeout(loadTimer)
        loadTimer = null
      }
      const win = iframe.contentWindow
      if (!win) {
        cleanup()
        reject(new Error('Print frame did not initialize'))
        return
      }
      win.addEventListener('afterprint', () => {
        cleanup()
        resolve()
      })
      // Fallback: some engines never fire afterprint for cancelled dialogs.
      fallbackTimer = setTimeout(() => {
        cleanup()
        resolve()
      }, CLEANUP_FALLBACK_MS)
      // Let layout settle before opening the dialog.
      requestAnimationFrame(() => {
        win.focus()
        win.print()
      })
    }

    document.body.appendChild(iframe)
  })
}

function escapeHtml(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}
