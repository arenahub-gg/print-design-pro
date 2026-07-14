import type { TemplateDocument } from '../core/schema/template'
import { substituteVariables } from '../core/variables'

// Batch pre-flight (round 15). jsbarcode THROWS on invalid content (bad
// checksums, wrong length) and the print painter deliberately paints
// nothing - fine when the editor placeholder is visible, silent on batch
// pages nobody previews. This validates every row BEFORE a batch job so a
// bad EAN13 digit is caught on screen, not on 300 printed labels.

export interface BatchBarcodeFailure {
  /** 1-based data row number (matches what the user sees in their CSV). */
  row: number
  elementName: string
  content: string
}

/**
 * Try to generate every barcode for every row. Returns failures (empty =
 * safe to print). QR never fails this way (any string encodes) and other
 * element types have no validity constraint.
 */
export async function validateBatchBarcodes(
  doc: TemplateDocument,
  rows: Array<Record<string, string>>,
): Promise<BatchBarcodeFailure[]> {
  const barcodes = doc.elements.filter(element => element.type === 'barcode')
  if (barcodes.length === 0 || rows.length === 0)
    return []

  const { default: JsBarcode } = await import('jsbarcode')
  const canvas = document.createElement('canvas')
  const failures: BatchBarcodeFailure[] = []

  rows.forEach((row, index) => {
    const merged = { ...doc.variables, ...row }
    for (const barcode of barcodes) {
      const content = substituteVariables(barcode.content, merged)
      try {
        JsBarcode(canvas, content, { format: barcode.format })
      }
      catch {
        failures.push({ row: index + 1, elementName: barcode.name, content })
      }
    }
  })
  return failures
}
