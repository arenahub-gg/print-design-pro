import type { TemplateDocument } from '../core/schema/template'
import { renderToCanvas, type RenderOptions } from './render-engine'

// Browser print via a hidden iframe: the render-engine output fills an
// @page-sized sheet, so what prints is byte-identical to PNG/PDF export.
// An iframe (not window.open) avoids popup blockers; cleanup runs on
// afterprint AND a fallback timer because some browsers skip the event.

/** Safety net only - print dialogs can stay open a long time (printer setup). */
const CLEANUP_FALLBACK_MS = 10 * 60_000
/** If the iframe never loads (host CSP blocking srcdoc), fail instead of hanging. */
const LOAD_TIMEOUT_MS = 10_000

export async function printDocument(doc: TemplateDocument, options: RenderOptions = {}): Promise<void> {
  const canvas = renderToCanvas(doc, options)
  const dataUrl = canvas.toDataURL('image/png')

  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  iframe.setAttribute('aria-hidden', 'true')

  iframe.srcdoc = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(doc.name)}</title>
<style>
  @page { size: ${doc.page.widthMm}mm ${doc.page.heightMm}mm; margin: 0; }
  html, body { margin: 0; padding: 0; }
  img { display: block; width: ${doc.page.widthMm}mm; height: ${doc.page.heightMm}mm; }
</style>
</head>
<body><img src="${dataUrl}"></body>
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
